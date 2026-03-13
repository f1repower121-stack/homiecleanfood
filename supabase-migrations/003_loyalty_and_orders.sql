-- Loyalty program + orders updates
-- Run in Supabase SQL Editor (handles both old and new schema)

-- 0. Fix profiles: ensure "points" column exists (some schemas use loyalty_points)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'points') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'loyalty_points') then
      alter table public.profiles add column points integer not null default 0;
      update public.profiles set points = coalesce(loyalty_points, 0);
    else
      alter table public.profiles add column points integer not null default 0;
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at') then
    alter table public.profiles add column created_at timestamptz default now();
  end if;
end $$;

-- 0b. Fix orders: ensure correct column names (some schemas use phone/address)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'customer_phone') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'phone') then
      alter table public.orders rename column phone to customer_phone;
    else
      alter table public.orders add column customer_phone text;
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'delivery_address') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'address') then
      alter table public.orders rename column address to delivery_address;
    else
      alter table public.orders add column delivery_address text;
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'user_id') then
    alter table public.orders add column user_id uuid references auth.users(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'delivery_date') then
    alter table public.orders add column delivery_date date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'delivery_time') then
    alter table public.orders add column delivery_time text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'notes') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'note') then
      alter table public.orders rename column note to notes;
    end if;
  end if;
end $$;

-- 1. loyalty_config (singleton)
create table if not exists public.loyalty_config (
  id text primary key default 'singleton',
  points_per_baht numeric default 0.1,
  first_order_bonus integer default 50,
  birthday_bonus integer default 50,
  referral_bonus integer default 100,
  tier_clean_eater integer default 200,
  tier_protein_king integer default 500,
  multiplier_homie numeric default 1.0,
  multiplier_clean_eater numeric default 1.5,
  multiplier_protein_king numeric default 2.0,
  min_redeem_points integer default 100,
  points_to_baht numeric default 1.0,
  max_redeem_pct integer default 30,
  updated_at timestamptz default now()
);
alter table public.loyalty_config enable row level security;
drop policy if exists "Anyone can read loyalty_config" on public.loyalty_config;
create policy "Anyone can read loyalty_config" on public.loyalty_config for select using (true);
drop policy if exists "Service role can manage loyalty_config" on public.loyalty_config;
create policy "Service role can manage loyalty_config" on public.loyalty_config for all using (true) with check (true);
insert into public.loyalty_config (id) values ('singleton') on conflict (id) do nothing;

-- 2. loyalty_rewards
create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  points_cost integer not null,
  reward_type text default 'discount',
  reward_value numeric default 0,
  emoji text default '🎁',
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.loyalty_rewards enable row level security;
drop policy if exists "Anyone can read loyalty_rewards" on public.loyalty_rewards;
create policy "Anyone can read loyalty_rewards" on public.loyalty_rewards for select using (true);
drop policy if exists "Service can manage loyalty_rewards" on public.loyalty_rewards;
create policy "Service can manage loyalty_rewards" on public.loyalty_rewards for all using (true) with check (true);

-- 3. loyalty_redemptions
create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reward_name text not null,
  points_spent integer not null,
  discount_applied numeric default 0,
  status text default 'applied',
  created_at timestamptz default now()
);
alter table public.loyalty_redemptions enable row level security;
drop policy if exists "Users can view own redemptions" on public.loyalty_redemptions;
create policy "Users can view own redemptions" on public.loyalty_redemptions for select using (auth.uid() = user_id);
drop policy if exists "Anyone can insert redemptions" on public.loyalty_redemptions;
create policy "Anyone can insert redemptions" on public.loyalty_redemptions for insert with check (true);

-- 4. add_points RPC (updates profiles.points)
create or replace function public.add_points(user_id uuid, points_to_add integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set points = greatest(0, coalesce(points, 0) + add_points.points_to_add)
  where id = add_points.user_id;
end;
$$;

-- Grant execute to anon and authenticated (needed for client calls)
grant execute on function public.add_points(uuid, integer) to anon;
grant execute on function public.add_points(uuid, integer) to authenticated;
grant execute on function public.add_points(uuid, integer) to service_role;

-- 5. Referral system
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade not null,
  referral_code text unique not null,
  referred_user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table public.referrals enable row level security;
drop policy if exists "Users can view own referrals" on public.referrals;
create policy "Users can view own referrals" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);
drop policy if exists "Anyone can insert referrals" on public.referrals;
create policy "Anyone can insert referrals" on public.referrals for insert with check (true);

-- Add referral_code to profiles
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'referral_code') then
    alter table public.profiles add column referral_code text unique;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'referred_by') then
    alter table public.profiles add column referred_by uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- Generate referral code function
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  code text;
begin
  loop
    code := upper(substring(md5(random()::text) from 1 for 8));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- Trigger to auto-generate referral code on profile creation
create or replace function public.handle_referral_code()
returns trigger as $$
begin
  if NEW.referral_code is null then
    NEW.referral_code := generate_referral_code();
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists generate_referral_code_trigger on public.profiles;
create trigger generate_referral_code_trigger
  before insert on public.profiles
  for each row execute function public.handle_referral_code();

-- Function to process referral when first order is made
create or replace function public.process_referral_bonus(order_user_id uuid)
returns void language plpgsql security definer as $$
declare
  referrer_id uuid;
  referral_record record;
begin
  -- Check if this is the user's first order
  if (select count(*) from public.orders where user_id = order_user_id) = 1 then
    -- Get the referrer from profiles
    select referred_by into referrer_id from public.profiles where id = order_user_id;

    if referrer_id is not null then
      -- Update referral record
      update public.referrals
      set status = 'completed', completed_at = now()
      where referrer_id = referrer_id and referred_user_id = order_user_id and status = 'pending';

      -- Award referral bonus to referrer
      perform public.add_points(referrer_id, (select referral_bonus from public.loyalty_config where id = 'singleton'));
    end if;
  end if;
end;
$$;
