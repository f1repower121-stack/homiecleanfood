-- Track manual loyalty point adjustments for audit trail
-- Order/referral points are derived from orders & referrals tables
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
CREATE POLICY "Service role full access" ON public.loyalty_point_transactions FOR ALL USING (true) WITH CHECK (true);
