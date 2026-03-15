-- Add payment_confirmed, payment_slip_url, reference_id to orders if missing
-- Required for admin payment confirmation to persist

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_confirmed') THEN
    ALTER TABLE public.orders ADD COLUMN payment_confirmed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_slip_url') THEN
    ALTER TABLE public.orders ADD COLUMN payment_slip_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'reference_id') THEN
    ALTER TABLE public.orders ADD COLUMN reference_id text;
  END IF;
END $$;
