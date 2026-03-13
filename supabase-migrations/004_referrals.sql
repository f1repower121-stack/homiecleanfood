-- Run this in Supabase SQL Editor
-- Fixes: handle_new_user trigger to link referrer on signup
-- Fixes: process_referral_bonus variable name collision bug
-- Adds: grant execute to authenticated users

-- 1. Update handle_new_user: generate referral code + handle ref_code from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id uuid;
  new_code text;
BEGIN
  -- Generate unique referral code for new user
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
  END LOOP;

  -- Insert profile with referral code
  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_code
  );

  -- Handle referral: look up referrer by code passed in signup metadata
  IF NEW.raw_user_meta_data->>'ref_code' IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'ref_code'
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      -- Link referred_by on new user's profile
      UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = NEW.id;

      -- Create pending referral record
      INSERT INTO public.referrals (referrer_id, referral_code, referred_user_id, status)
      VALUES (v_referrer_id, NEW.raw_user_meta_data->>'ref_code', NEW.id, 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix process_referral_bonus: rename variable to avoid column name collision
CREATE OR REPLACE FUNCTION public.process_referral_bonus(order_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Only process on user's first order
  IF (SELECT COUNT(*) FROM public.orders WHERE user_id = order_user_id) = 1 THEN
    SELECT referred_by INTO v_referrer_id FROM public.profiles WHERE id = order_user_id;

    IF v_referrer_id IS NOT NULL THEN
      -- Award 100 points to referrer
      PERFORM public.add_points(v_referrer_id, 100);

      -- Mark referral as completed
      UPDATE public.referrals
      SET status = 'completed', completed_at = now()
      WHERE referrer_id = v_referrer_id
        AND referred_user_id = order_user_id
        AND status = 'pending';
    END IF;
  END IF;
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_referral_bonus(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_bonus(uuid) TO anon;
