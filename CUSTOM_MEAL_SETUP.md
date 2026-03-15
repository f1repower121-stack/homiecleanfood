# Custom Meal Program Setup Guide

## ✅ Completed Steps

1. **Customer data exported** from Slack CSV: `CUSTOMER_DATABASE.csv`
2. **Parsed 161 customers** → `customers-data.json`
3. **Database schema created** → `supabase-migrations/009_custom_meal_programs.sql`

## 📋 What We Have

### Customer Data (161 customers)
- **Bangkok**: 124 customers
- **Pattaya**: 35 customers
- **Other**: 2 customers
- **Status**: 138 active, 23 completed

### Data Fields Captured
- ✅ Name, Phone, Location, Address
- ✅ Delivery Time, Order Channel
- ✅ Current Package (meals consumed/total)
- ✅ Dietary Preferences (meat, allergies, spicy level)
- ✅ Target Calories per day
- ✅ Special Notes

---

## 🚀 Next Steps

### Step 1: Create Supabase Tables

1. **Go to Supabase** → Your project → SQL Editor
2. **Copy entire contents** of: `supabase-migrations/009_custom_meal_programs.sql`
3. **Paste and run** the migration
4. **Verify tables created:**
   - `customer_meal_profiles`
   - `customer_dietary_preferences`
   - `meal_packages`
   - `meal_plans`
   - `meal_library`
   - `meal_deliveries`
   - `package_pauses`

### Step 2: Import Customer Data

After creating tables, run:
```bash
npm run import:customers
```

This will:
- Create customer profiles for each person
- Store their dietary preferences
- Initialize their meal packages with correct consumed/total counts

### Step 3: Create Base Meal Library

Add your standard meals to `meal_library` table:
- Menu items you already serve
- Nutrition info (calories, macros)
- Ingredients & allergens
- Meat type & dietary info

Example:
```json
{
  "meal_name": "Grilled Chicken with Rice",
  "calories": 450,
  "protein_grams": 35,
  "carbs_grams": 45,
  "fat_grams": 12,
  "contains_meat": "chicken",
  "ingredients": ["chicken breast", "rice", "broccoli"],
  "contains_allergens": []
}
```

### Step 4: Implement Meal Customization Logic

**What happens when customer orders:**
1. Check their dietary preferences (allergies, meat prefs, calories)
2. Generate personalized meal plan for them
3. Calculate nutrition per meal
4. Create meal assignments in `meal_plans` table
5. Schedule delivery with LINE notification showing:
   - 📱 Which meals coming
   - 🍗 Meat/protein type
   - 🔥 Spicy level
   - 💪 Calories
   - ⏰ Delivery time

### Step 5: Pause/Resume Feature

When customer travels:
1. Call API to pause package
2. Set `resume_date` in package
3. On resume date, auto-resume package
4. Continue delivery with remaining meals

### Step 6: Package Renewal

When customer buys new package:
1. Create new `meal_package` record
2. Add `meals_count` to their remaining meals
3. Update delivery schedule
4. Send LINE notification of new package

---

## 🗄️ Database Schema Overview

```
CUSTOMER MEAL PROFILES
├── Name, Phone, Location, Address
├── Delivery Time, Order Channel
└── Has Many:
    ├── DIETARY PREFERENCES (allergies, meat type, calories)
    ├── MEAL PACKAGES (active, paused, completed)
    │   ├── MEAL PLANS (daily meal assignments)
    │   │   └── MEAL DELIVERIES (tracking)
    │   └── PAUSE HISTORY (travel dates)
    └── SPECIAL NOTES
```

---

## 💡 Architecture for Custom Meal Generation

### Meal Customization Algorithm:

```
FOR EACH CUSTOMER:
  1. Get dietary preferences (allergies, meats, spicy level)
  2. Get target calories per day
  3. FOR EACH DAY in package:
    a. Generate list of eligible meals:
       - No allergens they're allergic to
       - Only preferred meat types
       - Match spicy level preference
    b. Select meals that:
       - Total target calories (±10%)
       - Provide variety (no meal twice in a row)
       - Consider seasonal items available
    c. Create meal_plan record with:
       - Meal name
       - Scheduled date
       - Calories
       - Prep notes
```

---

## 📱 LINE Notification Example

After import, order notifications will show:

```
📱 Website Order
━━━━━━━━━━━━━━━━━
Customer: Andras Donauer
Package: 346/360 meals

⏰ DELIVERY
Tomorrow 2026-03-16 at 5:00 PM

📦 ITEMS
1x Grilled Chicken with Rice (450 cal)
   • 🍗 CHICKEN
   • 🔥 Spicy Level 1

1x Tuna Salad (380 cal)
   • 🐟 SEAFOOD
   • 🔥 Mild

📍 Follow up in 6 months
```

---

## 📊 Admin Dashboard Features Needed

1. **Customer Overview**
   - All customers with active packages
   - Meals remaining per customer
   - Next delivery date

2. **Delivery Schedule**
   - Today's deliveries by location
   - Tomorrow's meals to prepare
   - Grouped by location (BKK/PT)

3. **Package Management**
   - Create new packages
   - Pause/resume customer
   - Add meals to existing package
   - View pause history

4. **Meal Customization**
   - View customer preferences
   - See generated meal plan
   - Manual adjustments
   - Meal substitutions

---

## 🔧 Configuration

### Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Feature Flags (Optional)
```
ENABLE_MEAL_CUSTOMIZATION=true
ENABLE_PAUSE_RESUME=true
ENABLE_AI_MEAL_SUGGESTIONS=false (future)
```

---

## 📈 Rollout Plan

### Phase 1: Data Import
- [ ] Create Supabase tables
- [ ] Import 161 customers
- [ ] Verify data integrity

### Phase 2: Basic Features
- [ ] Customer dashboard showing remaining meals
- [ ] Admin dashboard for deliveries
- [ ] Manual meal plan creation

### Phase 3: Automation
- [ ] Auto meal plan generation
- [ ] Pause/resume logic
- [ ] Enhanced LINE notifications

### Phase 4: Intelligence
- [ ] AI meal suggestions
- [ ] Nutrition tracking
- [ ] Customer satisfaction scoring

---

## 🆘 Support

If you need help with any step:
1. Check the customers-data.json to verify imported structure
2. View the generated meal_plans table
3. Test pause/resume feature with a test customer
