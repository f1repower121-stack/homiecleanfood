-- Run in Supabase SQL Editor
-- Backfills profiles for auth.users that don't have one (fixes "0 customers" in admin)
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

-- Create profiles for any auth.users without one
INSERT INTO public.profiles (id, full_name, points, tier)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Customer'),
  0,
  'Homie'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
