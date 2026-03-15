-- Saved addresses for checkout - users can add multiple and choose at checkout
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS saved_addresses jsonb DEFAULT '[]';

-- stored as: [{"address": "...", "label": "Home"}, ...]
COMMENT ON COLUMN public.profiles.saved_addresses IS 'Array of {address, label} for quick checkout';
