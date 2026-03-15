-- Add address column to profiles for customer management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
