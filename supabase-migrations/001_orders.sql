-- Run this in Supabase SQL Editor to create the orders table
-- Dashboard: SQL Editor > New Query > Paste & Run

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  notes text,
  items jsonb not null default '[]',
  total integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('card', 'cod')),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.orders enable row level security;

-- Allow all operations for anon (adjust for production)
create policy "Allow all" on public.orders for all using (true) with check (true);
