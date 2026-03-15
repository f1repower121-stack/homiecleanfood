# 🍱 Custom Meal Program - Implementation Guide

## 📋 Overview

**NEW SIMPLIFIED APPROACH:**
- ✅ Admin **manually creates** meal programs (no AI)
- ✅ Admin **selects preset meals** from library for each program
- ✅ Customer **preferences stored as reference only** (for admin info)
- ✅ Customers **see program details** in their dashboard
- ✅ Admin controls **pause/resume** feature

---

## 🗄️ Database Schema (7 Tables)

### 1. `meal_library` - Your Preset Meals
```sql
Fields:
- id (UUID)
- meal_name (VARCHAR) → "Grilled Chicken with Rice"
- description (TEXT)
- calories (INTEGER) → 420
- protein_grams, carbs_grams, fat_grams (DECIMAL)
- contains_meat (VARCHAR) → "chicken", "beef", "seafood", "none"
- ingredients (TEXT[]) → ["chicken", "rice", "broccoli"]
- contains_allergens (TEXT[]) → ["nuts", "dairy", "shellfish"]
- is_available (BOOLEAN)

Example:
{
  "meal_name": "Grilled Chicken with Brown Rice",
  "calories": 420,
  "protein_grams": 35,
  "carbs_grams": 50,
  "fat_grams": 8,
  "contains_meat": "chicken",
  "ingredients": ["chicken breast", "brown rice", "broccoli"],
  "contains_allergens": []
}
```

### 2. `meal_programs` - Admin Creates These
```sql
Fields:
- id (UUID)
- program_name (VARCHAR) → "30-Day Standard Plan"
- description (TEXT)
- total_days (INTEGER) → How many days the program runs
- meals_per_day (INTEGER) → How many meals daily
- total_meals (INTEGER) → Calculated: total_days × meals_per_day
- package_duration_days (INTEGER) → Days before expiring
- price_per_meal (DECIMAL) → ฿150
- total_price (DECIMAL) → Calculated
- is_available (BOOLEAN)

Example:
{
  "program_name": "30-Day Standard Plan",
  "total_days": 30,
  "meals_per_day": 2,
  "total_meals": 60,
  "package_duration_days": 30,
  "price_per_meal": 150,
  "total_price": 9000
}
```

### 3. `meal_program_items` - Which Meals in Program
```sql
Fields:
- id (UUID)
- meal_program_id (FK → meal_programs)
- meal_library_id (FK → meal_library)
- day_number (INTEGER) → Day 1, 2, 3...
- meal_number (INTEGER) → 1st meal, 2nd meal of day

Example:
{
  "meal_program_id": "prog-123",
  "meal_library_id": "meal-456",
  "day_number": 1,
  "meal_number": 1 → Day 1, Meal 1
}
```

### 4. `customer_meal_profiles` - Customer Info
```sql
Fields:
- id (UUID)
- user_id (FK → auth.users)
- customer_name (VARCHAR)
- phone (VARCHAR)
- location (VARCHAR) → "BKK", "PT"
- address (TEXT)
- delivery_time (VARCHAR) → "5-6 pm"
- order_channel (VARCHAR) → "Messenger", "Whatsapp", etc

This is imported from your Slack data!
```

### 5. `customer_dietary_preferences` - Reference Info Only
```sql
Fields:
- id (UUID)
- customer_meal_profile_id (FK)
- allergies (TEXT[]) → ["peanuts", "shrimp", "egg"]
- meat_preferences (TEXT[]) → ["chicken", "seafood"]
- spicy_level (INTEGER) → 0-3
- target_calories_per_day (INTEGER)
- special_notes (TEXT)

PURPOSE: Admin uses this when creating meal plans
ADMIN THINKS: "This customer is allergic to nuts, so skip [meal-abc]"
```

### 6. `customer_packages` - Active Program Assignment
```sql
Fields:
- id (UUID)
- customer_meal_profile_id (FK)
- meal_program_id (FK)
- status (VARCHAR) → "active", "paused", "completed", "cancelled"
- total_meals (INTEGER) → From meal_program
- meals_consumed (INTEGER) → Tracking
- created_at, started_at
- paused_at, paused_until_date → Auto-resume on this date
- resumed_at, ended_at
- expires_at → When package expires

Example:
{
  "customer_name": "Andras Donauer",
  "program_name": "30-Day Standard Plan",
  "status": "active",
  "meals_consumed": 30,
  "total_meals": 60,
  "meals_remaining": 30,
  "started_at": "2026-02-15",
  "expires_at": "2026-03-15"
}
```

### 7. `meal_deliveries` - Track Daily Deliveries
```sql
Fields:
- id (UUID)
- customer_package_id (FK)
- meal_library_id (FK)
- scheduled_date (DATE) → When to deliver
- delivered_date (DATE) → When actually delivered
- delivery_time (VARCHAR) → From customer profile
- status (VARCHAR) → "pending", "delivered", "skipped", "cancelled"

This updates daily as meals are delivered
```

### 8. `package_pause_history` - Pause/Resume Log
```sql
Fields:
- id (UUID)
- customer_package_id (FK)
- paused_at (TIMESTAMP)
- resume_date (DATE) → Auto-resume on this date
- reason (VARCHAR) → "Travel", "Vacation", etc
```

---

## 🔄 Workflow

### Step 1: Admin Creates Meal Program
```
ADMIN DASHBOARD:
┌─────────────────────────────────────┐
│  Meal Programs Tab → Create Program │
├─────────────────────────────────────┤
│                                     │
│  Program Name: 30-Day Standard      │
│  Days: 30                           │
│  Meals/Day: 2                       │
│  Package Duration: 30 days          │
│  Price/Meal: ฿150                  │
│                                     │
│  [CREATE]                           │
└─────────────────────────────────────┘

Result: New meal_programs record
{
  "id": "prog-001",
  "program_name": "30-Day Standard",
  "total_days": 30,
  "meals_per_day": 2,
  "total_meals": 60,
  "total_price": 9000
}
```

### Step 2: Admin Selects Preset Meals
```
ADMIN: Click "Select Meals" on the program

┌─────────────────────────────────────┐
│  Select Meals for Program           │
├─────────────────────────────────────┤
│                                     │
│  Day 1:                             │
│    Meal 1: [Grilled Chicken] ✓      │
│    Meal 2: [Tuna Salad] ✓           │
│                                     │
│  Day 2:                             │
│    Meal 1: [Beef Stir Fry] ✓        │
│    Meal 2: [Tofu Bowl] ✓            │
│                                     │
│  ... repeats for 30 days            │
│                                     │
│  [SAVE]                             │
└─────────────────────────────────────┘

Result: meal_program_items records
{
  "meal_program_id": "prog-001",
  "meal_library_id": "meal-123",
  "day_number": 1,
  "meal_number": 1
}
```

### Step 3: Admin Assigns Program to Customer
```
ADMIN DASHBOARD:
Meal Programs Tab → 30-Day Standard Plan
[ASSIGN TO CUSTOMER]

┌─────────────────────────────────────┐
│  Assign Program to Customer         │
├─────────────────────────────────────┤
│                                     │
│  Select Customer:                   │
│  [Search...] Andras Donauer ✓       │
│                                     │
│  Location: BKK                      │
│  Delivery Time: 5-6 pm              │
│  Phone: 555-867-5309                │
│                                     │
│  [ASSIGN]                           │
└─────────────────────────────────────┘

Result: customer_packages record
{
  "customer_meal_profile_id": "cust-001",
  "meal_program_id": "prog-001",
  "status": "active",
  "total_meals": 60,
  "meals_consumed": 0,
  "started_at": "2026-03-16",
  "expires_at": "2026-04-15"
}
```

### Step 4: Customer Sees Program in Dashboard
```
CUSTOMER DASHBOARD:

┌───────────────────────────────────────┐
│  🍱 30-Day Standard Plan              │
├───────────────────────────────────────┤
│                                       │
│  Status: ✓ Active                     │
│  📅 Days: 30  | 🍱 Meals/Day: 2      │
│  📦 Total: 60 meals                   │
│  ⏱️  Valid: 30 days                   │
│                                       │
│  ─── YOUR PROGRESS ───                │
│  [████░░░░] 30/60 meals               │
│  🟢 30 meals remaining                │
│                                       │
│  📅 Started: 2026-03-16               │
│  ⏰ Expires: 2026-04-15               │
│  📍 Delivery: 5-6 PM                  │
│                                       │
│  [⏸️ Pause] [💬 Get Help]             │
│                                       │
│  📦 NEXT DELIVERY                     │
│  Tomorrow at 5:00 PM                  │
│  • Grilled Chicken - 420 cal          │
│  • Tuna Salad - 380 cal               │
│                                       │
└───────────────────────────────────────┘
```

### Step 5: Pause/Resume Feature
```
CUSTOMER CLICKS "PAUSE":
┌─────────────────────────────────────┐
│  When will you return?               │
│  [2026-04-15] (Date picker)          │
│  [PAUSE]                             │
└─────────────────────────────────────┘

Result: customer_packages updated
{
  "status": "paused",
  "paused_at": "2026-03-16 10:00:00",
  "paused_until_date": "2026-04-15"
}

SEND LINE NOTIFICATION:
┌─────────────────────────────────────┐
│  ⏸️ Package Paused                  │
│                                     │
│  Andras Donauer                     │
│  30 meals remaining                 │
│                                     │
│  📅 Paused: March 16                │
│  📅 Resumes: April 15               │
│                                     │
│  Have a great trip! 🌍              │
└─────────────────────────────────────┘

AUTO-RESUME ON April 15:
- status changes to "active"
- resumed_at timestamp set
- Meals start delivering again
```

---

## 📊 Admin Dashboard - Meal Programs Tab

### Tab 1: Meal Programs
```
┌────────────────────────────────────────┐
│  Meal Programs                         │
├────────────────────────────────────────┤
│  [➕ NEW PROGRAM]                      │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 30-Day Standard Plan             │  │
│  │                                  │  │
│  │ 📅 30 days | 🍱 2 meals/day      │  │
│  │ 📦 60 total | ⏱️ 30 days valid   │  │
│  │                                  │  │
│  │ ฿150/meal → ฿9,000 total        │  │
│  │                                  │  │
│  │ [Edit] [Copy] [Delete]           │  │
│  │ [➕ Assign to Customer]           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 60-Day Premium Plan              │  │
│  │                                  │  │
│  │ 📅 60 days | 🍱 3 meals/day      │  │
│  │ 📦 180 total | ⏱️ 60 days valid  │  │
│  │                                  │  │
│  │ ฿140/meal → ฿25,200 total       │  │
│  │                                  │  │
│  │ [Edit] [Copy] [Delete]           │  │
│  │ [➕ Assign to Customer]           │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Tab 2: Customer Packages
```
┌─────────────────────────────────────────────────────────┐
│  Active Customer Packages                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Customer | Program | Progress | Status | Expires | 📍 │
│  ─────────────────────────────────────────────────────  │
│  Andras   | 30-Day  | 30/60 ██░░ | Active | 2026-03-15 │
│  Donauer  | Standard│         50% |        | BKK        │
│           |         |            | [⏸]  [✏️]          │
│  ─────────────────────────────────────────────────────  │
│  Bo       | 60-Day  | 85/180 ███░ | Paused | 2026-05-15 │
│  Mirasena | Premium │         47% | Resume:| BKK        │
│           |         |            | Apr 15 | [▶]  [✏️]   │
│  ─────────────────────────────────────────────────────  │
│  Eunice   | 30-Day  | 62/180 █░░░ | Active | 2026-04-15 │
│           | Standard│         34% |        | BKK        │
│           |         |            | [⏸]  [✏️]          │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Export] [Filter] [Print]                              │
└─────────────────────────────────────────────────────────┘
```

### Tab 3: Create Program
```
┌─────────────────────────────────────┐
│  Create New Meal Program            │
├─────────────────────────────────────┤
│                                     │
│  Program Name: [____________]       │
│                                     │
│  📅 How Many Days? [30]             │
│     Program runs for this many days │
│                                     │
│  🍱 How Many Meals/Day? [2]         │
│     Meals to deliver each day       │
│                                     │
│  📦 Package Duration [30]           │
│     Days before it expires          │
│                                     │
│  💰 Price Per Meal [150]            │
│     Price per meal (฿)              │
│                                     │
│  ─────────────────────────────────  │
│  📊 Program Summary                 │
│  Total Meals: 60                    │
│  Total Price: ฿9,000                │
│  ─────────────────────────────────  │
│                                     │
│  [CREATE] [CANCEL]                  │
│                                     │
│  💡 After creating, you'll select   │
│     which preset meals to include   │
│                                     │
└─────────────────────────────────────┘
```

---

## 👥 Customer Dashboard

```
┌─────────────────────────────────────────────────────┐
│  🍱 My Meal Program                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  30-Day Standard Plan              ✓ Active         │
│  Your customized meal delivery program              │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📅 30 DAYS | 🍱 2 MEALS/DAY | 📦 60 TOTAL  │   │
│  │ ⏱️ VALID: 30 DAYS                          │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  📊 YOUR PROGRESS                                  │
│  [████████░░] 30 / 60 meals (50%)                  │
│                                                     │
│  🟢 30 MEALS REMAINING                             │
│  About 15 days left                                │
│                                                     │
│  📅 Started: 2026-02-15                            │
│  ⏰ Expires: 2026-03-15                            │
│  📍 Delivery Time: 5-6 PM                          │
│                                                     │
│  [⏸️ PAUSE PROGRAM] [💬 GET HELP]                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📦 NEXT DELIVERY                            │   │
│  │ Tomorrow at 5:00 PM                         │   │
│  │                                             │   │
│  │ • Grilled Chicken with Rice - 420 cal       │   │
│  │ • Tuna Salad - 380 cal                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📱 LINE Notifications

### Notification 1: Program Assigned
```
📱 Website Order
━━━━━━━━━━━━━━━━━
Your meal program is ready!

30-Day Standard Plan
├─ 60 meals total
├─ 2 meals per day
├─ ฿150 each
└─ ฿9,000 total

📅 Valid Until: 2026-03-15
📍 Delivery Time: 5-6 PM

Your meals start tomorrow! 🎉
```

### Notification 2: Daily Delivery
```
📱 Website Order
━━━━━━━━━━━━━━━━━
Andras Donauer
30-Day Standard Plan
Meals Remaining: 30/60

⏰ DELIVERY
Tomorrow 2026-03-16 at 5:00 PM

📦 ITEMS (2 meals)

1x Grilled Chicken with Rice
   🍗 CHICKEN | 420 cal

1x Tuna Salad
   🐟 SEAFOOD | 380 cal

📍 Follow up in 6 months
☎️  555-867-5309
```

### Notification 3: Pause Confirmation
```
⏸️ Package Paused
━━━━━━━━━━━━━━━━━

Andras Donauer
30-Day Standard Plan
30 meals remaining

📅 Paused: March 16
📅 Resumes: April 15

Have a great trip! 🌍
```

---

## 🚀 Implementation Steps

### Step 1: Create Database Tables
```bash
# Go to Supabase → SQL Editor
# Copy & run: supabase-migrations/010_meal_programs_simplified.sql
```

### Step 2: Import Customer Data
```bash
npm run import:customers
# Populates customer_meal_profiles and customer_dietary_preferences
```

### Step 3: Add Preset Meals
Admin goes to: Admin Dashboard → Settings → Meal Library
- Add all your meals with nutrition info
- Mark which meats they contain
- List allergens

### Step 4: Create Meal Programs
Admin goes to: Admin Dashboard → Meal Programs → Create Program
- Set: Days, Meals/Day, Duration, Price
- Select meals for each day
- Activate program

### Step 5: Assign to Customers
Admin: Click "Assign to Customer" on program
- Select customer
- Program starts immediately
- Customer sees in dashboard
- LINE notification sent

---

## ✨ Key Differences from Previous Approach

| Feature | Old Way | New Way |
|---------|---------|---------|
| Meal Selection | AI auto-generates | Admin manually selects |
| Preferences Used | To customize meals | Reference info only |
| Admin Control | Limited | Full control |
| Customization | Automatic | Manual per customer |
| Complexity | High (AI/algorithms) | Simple (manual selection) |
| Flexibility | Constrained | Complete |

---

## 📋 Checklist

- [ ] Create database tables (010_meal_programs_simplified.sql)
- [ ] Import 161 customers
- [ ] Add preset meals to meal_library
- [ ] Create 2-3 base meal programs
- [ ] Add MealProgramsTab to admin dashboard
- [ ] Add MealProgramCard to customer dashboard
- [ ] Update LINE notification templates
- [ ] Test pause/resume feature
- [ ] Train admin on workflow

---

## 🎯 You're in Full Control

**Key Points:**
- ✅ No AI recommendations - you choose meals
- ✅ Preferences are just reference data
- ✅ You create programs once, assign to many customers
- ✅ Customers see clean dashboard
- ✅ Pause/resume works automatically
- ✅ All tracked in database for analytics

**Questions answered by the system:**
- "How many meals does Andras have left?" → 30
- "When do I need to prepare meals?" → From daily scheduled_date
- "Which customers are paused?" → Filter customer_packages.status = 'paused'
- "What meals should I deliver today?" → Join meal_deliveries with meal_library for today's date
