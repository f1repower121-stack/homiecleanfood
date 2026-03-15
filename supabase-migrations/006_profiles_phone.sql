-- Add phone column to profiles for admin customer management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
