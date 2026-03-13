# Deploy SQL to Supabase

Run the loyalty migration in your Supabase project:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor** → **New Query**
3. Copy and paste the contents of `supabase-migrations/003_loyalty_and_orders.sql`
4. Click **Run**

This creates:
- `loyalty_config` — loyalty program settings
- `loyalty_rewards` — reward definitions
- `loyalty_redemptions` — redemption history
- `add_points` RPC — updates user points
- Adds `user_id`, `delivery_date`, `delivery_time` to `orders` if missing

**Prerequisites:** Run `001_orders.sql` and `002_profiles.sql` first if you haven't already.
