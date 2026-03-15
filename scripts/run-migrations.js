#!/usr/bin/env node
/**
 * Run Supabase SQL migrations automatically.
 * Requires: SUPABASE_DB_URL in .env.local (from Supabase Dashboard → Database → Connection string)
 *
 * Usage: npm run db:migrate
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { Client } = require('pg');

const MIGRATIONS = [
  {
    id: '007',
    name: 'profiles_address',
    sql: `
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
    `,
  },
  {
    id: '008',
    name: 'loyalty_point_transactions',
    sql: `
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
    `,
  },
  {
    id: '009',
    name: 'backfill_profile_address',
    sql: `
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
    `,
  },
  {
    id: '011',
    name: 'orders_payment_columns',
    sql: `
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
    `,
  },
];

async function run() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Missing SUPABASE_DB_URL or DATABASE_URL in .env.local');
    console.error('');
    console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)');
    console.error('Add to .env.local: SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@..."');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('Running migrations...\n');

    for (const m of MIGRATIONS) {
      try {
        await client.query(m.sql);
        console.log(`  ✓ ${m.id}_${m.name}`);
      } catch (err) {
        console.error(`  ✗ ${m.id}_${m.name}: ${err.message}`);
        throw err;
      }
    }

    console.log('\n✅ All migrations completed');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
