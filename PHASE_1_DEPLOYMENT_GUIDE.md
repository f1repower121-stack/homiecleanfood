# Phase 1: Database Deployment Guide

## ✅ Current Status
- ✅ Migration file created: `014_complete_meal_prep_system.sql`
- ✅ Supabase project configured
- ✅ Environment variables set up
- ⏳ Ready to deploy database schema

---

## 📋 PHASE 1 DEPLOYMENT STEPS

### Step 1: Access Supabase Console

1. Go to: [https://app.supabase.com](https://app.supabase.com)
2. Log in with your account
3. Select your project: **homiecleanfood**

### Step 2: Open SQL Editor

1. In the left sidebar, click **SQL Editor**
2. Click **New Query** button (top right)
3. You'll see a blank SQL editor

### Step 3: Copy Migration File

1. Open the file: `/DEPLOY_MIGRATION.sql` in your project root
2. Copy **ALL** the content (Cmd+A, Cmd+C)
3. Paste into the Supabase SQL editor (Cmd+V)

### Step 4: Execute Migration

1. Click the **▶ Run** button (or press Cmd+Enter)
2. Wait for execution to complete (2-5 minutes)
3. You should see a success message like: `Query executed successfully`

### Step 5: Verify Tables Created

In the left sidebar under **Database**, you should now see these new tables:

#### 📦 Meal Program Tables
- `meal_programs` - Program definitions
- `program_meals` - Daily meal assignments
- `program_reviews` - Customer reviews
- `customer_meal_programs` - Customer enrollments

#### 🏆 Loyalty System Tables
- `loyalty_accounts` - Points balance & tier
- `loyalty_transactions` - Points history
- `loyalty_tier_benefits` - Tier definitions
- `loyalty_rewards` - Reward definitions
- `referrals` - Referral tracking

#### 📊 Health & Analytics
- `health_metrics` - Weight, energy, sleep
- `program_analytics` (view)
- `loyalty_analytics` (view)

#### ⚙️ Admin & Configuration
- `system_config` - Brand settings
- `admin_dashboard_config` - Widget settings
- `email_templates` - Email customization
- `admin_audit_log` - Action tracking

**Total: 25+ tables**

---

## 🔍 Verification Queries

After deployment, run these queries in SQL Editor to verify:

### Count All Tables
```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```
Expected result: ~25 tables

### Check Loyalty Tiers
```sql
SELECT * FROM loyalty_tier_benefits;
```
Should show 4 tiers:
- Bronze (0-300 points)
- Silver (301-1,200 points)
- Gold (1,201-3,000 points)
- Platinum (3,001+ points)

### Check Default Rewards
```sql
SELECT reward_name, points_required FROM loyalty_rewards;
```
Should show 6 rewards configured

### Check System Config
```sql
SELECT config_key, config_value FROM system_config;
```
Should show brand colors, fonts, delivery areas, etc.

---

## ✅ Success Criteria

Your Phase 1 deployment is **complete** when:

- [ ] All 25+ tables appear in Supabase Database tab
- [ ] No SQL errors during execution
- [ ] Verification queries return expected results
- [ ] You can see loyalty tiers (4 tiers)
- [ ] You can see rewards (6 rewards)

---

## 🚨 Troubleshooting

### Issue: "Table already exists" error
**Solution:** This migration is idempotent (uses `IF NOT EXISTS`). You can safely run it again.

### Issue: "Permission denied" error
**Solution:** Make sure you're using a role with `admin` or `service_role` permissions in the SQL Editor.

### Issue: Some tables created but not all
**Solution:** Check the browser console for errors and run the query again.

### Issue: Can't see tables in sidebar
**Solution:** Click the refresh button (🔄) in the Database left panel.

---

## 📝 What Gets Created

### Default Data Inserted:
1. **System Configuration** (5 rows)
   - Brand colors (Emerald green primary)
   - Typography (Sora, Inter, Space Mono)
   - Delivery areas
   - Currency (THB)
   - Timezone (Asia/Bangkok)

2. **Loyalty Tiers** (4 rows)
   - Bronze: 0-300 points
   - Silver: 301-1,200 points (5% discount)
   - Gold: 1,201-3,000 points (10% discount)
   - Platinum: 3,001+ points (15% discount)

3. **Loyalty Rewards** (6 rows)
   - ฿50 discount
   - 1 free meal
   - Free delivery
   - ฿200 discount
   - Free 30-day program
   - Free 60-day program

---

## 🎯 Next Steps (Phase 2)

Once Phase 1 is complete, you'll move to **Phase 2: API Endpoints** where you'll:

1. Create API routes in `/app/api/`
2. Implement endpoints for:
   - Meal programs (GET, POST, PATCH, DELETE)
   - Customer programs (subscribe, pause, resume)
   - Loyalty transactions
   - Health metrics
   - Admin operations

Each endpoint will integrate with these newly created database tables.

---

## 💬 Need Help?

If you run into issues:
1. Take a screenshot of the error
2. Check the browser console for error messages
3. Verify all SQL executed without errors
4. Try running verification queries above
5. Let me know the exact error message

---

**Status: Ready for Deployment** ✅

You're all set to deploy the database schema. Go to Supabase Console and execute the migration!
