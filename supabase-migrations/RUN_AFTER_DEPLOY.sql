ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS public.loyalty_point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  points_delta integer NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','order','referral','redemption','first_order')),
  reference_id text,
  reference_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_trans_user ON public.loyalty_point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_trans_created ON public.loyalty_point_transactions(created_at DESC);

ALTER TABLE public.loyalty_point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.loyalty_point_transactions;
CREATE POLICY "Service role full access" ON public.loyalty_point_transactions FOR ALL USING (true) WITH CHECK (true);

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
