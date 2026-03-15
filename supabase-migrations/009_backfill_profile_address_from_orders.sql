-- Backfill profile.address from past order delivery_address
-- Uses most recent order per user (where profile.address is empty)
-- Run after 007_profiles_address.sql

UPDATE public.profiles p
SET address = subq.delivery_address
FROM (
  SELECT DISTINCT ON (o.user_id) o.user_id, o.delivery_address
  FROM public.orders o
  WHERE o.user_id IS NOT NULL
    AND o.delivery_address IS NOT NULL
    AND o.delivery_address != ''
  ORDER BY o.user_id, o.created_at DESC
) subq
WHERE p.id = subq.user_id
  AND (p.address IS NULL OR TRIM(p.address) = '');
