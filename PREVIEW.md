# 🍱 Custom Meal Program - Complete Preview

---

## 📊 **CUSTOMER DATA SAMPLE**

### Customer 1: Andras Donauer (Sathorn)
```json
{
  "name": "Andras Donauer (Sathorn)",
  "phone": "555-867-5309",
  "location": "BKK",
  "address": "Follow up in 6 months",
  "deliveryTime": "5-6 pm",
  "orderChannel": "Messanger",
  "mealsConsumed": 346,
  "mealsTotal": 360,
  "mealsRemaining": 14,
  "targetCalories": 400,
  "spicyLevel": 1,
  "preferences": [
    "• Seafood and Chicken",
    "• Less Beef meals"
  ],
  "allergies": [],
  "status": "active"
}
```

### Customer 2: Bo Mirasena
```json
{
  "name": "Bo Mirasena",
  "phone": "",
  "location": "BKK",
  "address": "",
  "deliveryTime": "5-6 pm",
  "orderChannel": "Messanger",
  "mealsConsumed": 426,
  "mealsTotal": 540,
  "mealsRemaining": 114,
  "targetCalories": 400,
  "spicyLevel": 3,
  "preferences": [
    "• Eat Everything"
  ],
  "allergies": [],
  "status": "active"
}
```

### Customer 3: Eunice (with allergies)
```json
{
  "name": "Eunice",
  "phone": "",
  "location": "BKK",
  "address": "",
  "deliveryTime": "",
  "orderChannel": "Messanger",
  "mealsConsumed": 62,
  "mealsTotal": 180,
  "mealsRemaining": 118,
  "targetCalories": 650,
  "spicyLevel": 1,
  "preferences": [],
  "allergies": [
    "No nut",
    "No shrimp",
    "No pork",
    "No egg",
    "No shrimp paste"
  ],
  "status": "active"
}
```

---

## 📊 **CUSTOMER STATISTICS**

```
TOTAL CUSTOMERS: 161

📍 Location Distribution:
   BKK (Bangkok):    124 customers (77%)
   PT (Pattaya):      35 customers (22%)
   Other:              2 customers  (1%)

📈 Package Status:
   Active:     138 customers (86%)
   Completed:   23 customers (14%)

📦 Meals Summary:
   Total Packages:    161
   Avg Meals/Package: ~300
   Total Remaining:   ~12,000+ meals across all customers

📱 Order Channels:
   Instagram:  ~40 customers
   Messenger:  ~35 customers
   Whatsapp:   ~25 customers
   Line:       ~10 customers
   Other:      ~51 customers

⏰ Delivery Times:
   10-12 AM:   Most popular
   5-6 PM:     Evening deliveries
   9 AM:       Early morning
   12-1 PM:    Lunch time
   Custom:     Individual preferences

🌶️ Spice Levels:
   Level 0 (Mild):    ~30 customers
   Level 1 (Medium):  ~80 customers
   Level 2 (Hot):     ~35 customers
   Level 3 (Very Hot):~16 customers

🍗 Meat Preferences:
   Eat Everything:    ~50 customers
   Chicken Only:      ~20 customers
   No Pork:           ~25 customers
   No Beef:           ~15 customers
   Seafood Focus:     ~10 customers
   No Meat/Vegan:     ~5 customers
   Custom Mix:        ~36 customers

💪 Calorie Targets:
   400-500 cal:  ~90 customers
   650-700 cal:  ~40 customers
   Custom:       ~31 customers
```

---

## 🗄️ **DATABASE SCHEMA**

### Table 1: `customer_meal_profiles`
```sql
Fields:
  ├── id (UUID) - Primary Key
  ├── user_id (UUID) - Link to auth.users
  ├── customer_name (TEXT)
  ├── phone (VARCHAR)
  ├── location (VARCHAR) - BKK, PT, etc
  ├── address (TEXT)
  ├── delivery_time (VARCHAR) - "5-6 pm", "10-12 am"
  ├── order_channel (VARCHAR) - Messenger, Whatsapp, etc
  ├── created_at (TIMESTAMP)
  └── updated_at (TIMESTAMP)

Sample Record:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "Andras Donauer (Sathorn)",
  "phone": "555-867-5309",
  "location": "BKK",
  "address": "Follow up in 6 months",
  "delivery_time": "5-6 pm",
  "order_channel": "Messenger"
}
```

### Table 2: `customer_dietary_preferences`
```sql
Fields:
  ├── id (UUID)
  ├── customer_meal_profile_id (UUID FK)
  ├── allergies (TEXT[]) - Array of allergens
  ├── meat_preferences (TEXT[]) - Array of meat types
  ├── spicy_level (INTEGER) - 0-3
  ├── target_calories_per_day (INTEGER)
  ├── meals_per_day (INTEGER)
  ├── special_notes (TEXT)
  ├── created_at
  └── updated_at

Sample Record:
{
  "customer_meal_profile_id": "550e8400-...",
  "allergies": ["peanuts", "shrimp", "egg"],
  "meat_preferences": ["chicken", "fish"],
  "spicy_level": 1,
  "target_calories_per_day": 400,
  "meals_per_day": 2,
  "special_notes": "Less beef meals, prefer seafood"
}
```

### Table 3: `meal_packages`
```sql
Fields:
  ├── id (UUID)
  ├── customer_meal_profile_id (UUID FK)
  ├── meal_count (INTEGER) - Total meals in package
  ├── meals_consumed (INTEGER) - Already delivered
  ├── price_per_meal (DECIMAL)
  ├── total_package_price (DECIMAL)
  ├── status (VARCHAR) - active, paused, completed, expired
  ├── created_at
  ├── started_at
  ├── paused_at
  ├── resumed_at
  ├── ended_at
  └── notes (TEXT)

Sample Record:
{
  "id": "660e8400-e29b-...",
  "customer_meal_profile_id": "550e8400-...",
  "meal_count": 360,
  "meals_consumed": 346,
  "price_per_meal": 150.00,
  "total_package_price": 54000.00,
  "status": "active",
  "started_at": "2026-01-15",
  "remaining_meals": 14
}
```

### Table 4: `meal_plans`
```sql
Fields:
  ├── id (UUID)
  ├── customer_meal_profile_id (UUID FK)
  ├── meal_package_id (UUID FK)
  ├── meal_name (VARCHAR)
  ├── meal_description (TEXT)
  ├── calories (INTEGER)
  ├── protein_grams (DECIMAL)
  ├── carbs_grams (DECIMAL)
  ├── fat_grams (DECIMAL)
  ├── scheduled_date (DATE)
  ├── delivered_date (DATE)
  ├── status (VARCHAR) - pending, delivered, skipped
  ├── created_at
  └── updated_at

Sample Record:
{
  "id": "770e8400-...",
  "customer_meal_profile_id": "550e8400-...",
  "meal_package_id": "660e8400-...",
  "meal_name": "Grilled Chicken with Rice & Vegetables",
  "meal_description": "Tender grilled chicken, jasmine rice, steamed broccoli",
  "calories": 420,
  "protein_grams": 35.5,
  "carbs_grams": 48.0,
  "fat_grams": 8.5,
  "scheduled_date": "2026-03-16",
  "status": "pending"
}
```

### Table 5: `meal_library`
```sql
Fields:
  ├── id (UUID)
  ├── meal_name (VARCHAR)
  ├── description (TEXT)
  ├── calories (INTEGER)
  ├── protein_grams (DECIMAL)
  ├── carbs_grams (DECIMAL)
  ├── fat_grams (DECIMAL)
  ├── ingredients (TEXT[]) - Array of ingredients
  ├── contains_meat (VARCHAR) - chicken, beef, pork, seafood, none
  ├── is_vegetarian (BOOLEAN)
  ├── is_vegan (BOOLEAN)
  ├── contains_allergens (TEXT[]) - nuts, dairy, shellfish
  ├── prep_time_minutes (INTEGER)
  ├── is_available (BOOLEAN)
  ├── created_at
  └── updated_at

Sample Records:
[
  {
    "meal_name": "Grilled Chicken Breast with Brown Rice",
    "calories": 420,
    "protein_grams": 35,
    "carbs_grams": 50,
    "fat_grams": 8,
    "ingredients": ["chicken breast", "brown rice", "broccoli", "garlic"],
    "contains_meat": "chicken",
    "is_vegetarian": false,
    "contains_allergens": []
  },
  {
    "meal_name": "Tuna Salad with Olive Oil Dressing",
    "calories": 380,
    "protein_grams": 40,
    "carbs_grams": 15,
    "fat_grams": 16,
    "ingredients": ["tuna", "lettuce", "tomato", "cucumber", "olive oil"],
    "contains_meat": "seafood",
    "is_vegetarian": false,
    "contains_allergens": ["fish"]
  },
  {
    "meal_name": "Tofu Stir Fry with Vegetables",
    "calories": 340,
    "protein_grams": 18,
    "carbs_grams": 38,
    "fat_grams": 12,
    "ingredients": ["tofu", "bell pepper", "broccoli", "snap peas", "soy sauce"],
    "contains_meat": "none",
    "is_vegetarian": true,
    "is_vegan": true,
    "contains_allergens": ["soy"]
  }
]
```

### Table 6: `meal_deliveries`
```sql
Fields:
  ├── id (UUID)
  ├── meal_plan_id (UUID FK)
  ├── meal_package_id (UUID FK)
  ├── delivered_at (TIMESTAMP)
  ├── delivery_address (TEXT)
  ├── delivery_time (VARCHAR)
  ├── status (VARCHAR) - pending, delivered, received, cancelled
  ├── created_at
  └── updated_at

Sample Record:
{
  "id": "880e8400-...",
  "meal_plan_id": "770e8400-...",
  "meal_package_id": "660e8400-...",
  "delivery_address": "Follow up in 6 months",
  "delivery_time": "5-6 pm",
  "status": "pending"
}
```

---

## 📱 **LINE NOTIFICATION PREVIEW**

### Notification when meal is scheduled

```
┌─────────────────────────────────────┐
│    📱 Website Order                 │
├─────────────────────────────────────┤
│                                     │
│  Andras Donauer (Sathorn)           │
│  Package: 346/360 meals remaining   │
│                                     │
├─────────────────────────────────────┤
│  ⏰ DELIVERY                        │
│  📅 2026-03-16 at 5:00 PM          │
├─────────────────────────────────────┤
│  📦 ITEMS (2 meals)                │
│                                     │
│  1x Grilled Chicken with Rice      │
│    🍗 CHICKEN | 420 cal            │
│    🌶️ Level 1 (Medium)            │
│                                     │
│  1x Tuna Salad                     │
│    🐟 SEAFOOD | 380 cal            │
│    🌶️ Level 1 (Medium)            │
│                                     │
├─────────────────────────────────────┤
│  📍 Follow up in 6 months           │
│  ☎️  555-867-5309                  │
│                                     │
│  ✅ Meals Remaining: 14            │
│  📦 New Package Available           │
└─────────────────────────────────────┘
```

### Notification for Pause/Resume

```
┌─────────────────────────────────────┐
│    ⏸️  Package Paused              │
├─────────────────────────────────────┤
│                                     │
│  Bo Mirasena                        │
│  Meals Remaining: 114               │
│                                     │
│  📅 Paused: 2026-03-15              │
│  📅 Resumes: 2026-04-15             │
│                                     │
│  Have a great trip! 🌍             │
│                                     │
└─────────────────────────────────────┘
```

### Notification for Package Renewal

```
┌─────────────────────────────────────┐
│    🎉 New Package Added             │
├─────────────────────────────────────┤
│                                     │
│  Eunice                             │
│                                     │
│  📦 New: 90 meals                  │
│  📊 Total Remaining: 208 meals     │
│                                     │
│  💰 Price: 13,500 THB              │
│  📅 Valid Until: 2026-06-15        │
│                                     │
│  Delivery resumes tomorrow!         │
└─────────────────────────────────────┘
```

---

## 🎯 **FEATURES TO IMPLEMENT**

### Phase 1: Basic Dashboard (Week 1)
```
Customer View:
├── My Meals Remaining (14/360)
├── Next Delivery (Tomorrow at 5 PM)
├── My Preferences (view only)
├── Order History
└── Pause/Resume Button

Admin View:
├── All Customers List
├── Deliveries Today (grouped by location)
├── Tomorrow's Schedule
├── Meals to Prepare
├── Low Stock Alerts
└── Pause/Resume Management
```

### Phase 2: Meal Customization (Week 2-3)
```
Automatic Meal Plan Generation:
├── Check allergies → exclude meals
├── Check meat preferences → filter meals
├── Match calorie target (±10%)
├── Add variety (no repeats)
├── Consider seasonal items
└── Create delivery order

Meal Customization Features:
├── View today's meals
├── Manual meal swap
├── Special request notes
├── Portion size adjustment
└── Delivery time change
```

### Phase 3: Advanced Features (Week 4+)
```
Pause/Resume:
├── Click "Pause" in dashboard
├── Select return date
├── Auto-pause deliveries
├── Auto-resume on date
└── LINE notification

Package Renewal:
├── Show when running low
├── One-click renewal
├── Add to existing package
├── Choose delivery start date
└── AUTO-adjust meals remaining
```

---

## 💡 **HOW IT WORKS - CUSTOMER JOURNEY**

### Day 1: New Customer Signup
```
1. Customer fills intake form:
   - Name, Phone, Address
   - Allergies (checkboxes)
   - Meat preferences
   - Spicy level (1-3)
   - Target calories
   - Meals per day
   - Preferred delivery time

2. System creates:
   - customer_meal_profiles record
   - customer_dietary_preferences record
   - Initial meal_package record

3. Send LINE message:
   "Welcome! Your profile is set up.
    You have [days] until first meal.
    We'll customize your meals soon!"
```

### Day 2-7: Meal Plan Generation
```
1. Admin reviews customer preferences
2. System recommends meal plan:
   - Filters meals by allergies
   - Matches meat preferences
   - Targets daily calories
   - Adds variety
3. Admin can adjust
4. System creates meal_plans records
5. Send LINE: "Your meal plan is ready!
   Starting [date]. See your meals..."
```

### Day 8: First Delivery
```
1. Meal_plans.scheduled_date = today
2. Create meal_deliveries record
3. Send LINE: "📱 Website Order -
   Tomorrow 11:00 AM -
   2 meals, 800 cal total"
4. Prepare meals
5. Update meal_deliveries.status = delivered
6. Deduct from meals_consumed
```

### Week 2-4: Regular Deliveries
```
Each morning:
├── Check customer preferences
├── Select meals matching their allergies/preferences
├── Calculate daily calories
├── Schedule delivery
├── Send LINE notification
└── Track delivery status

Every week:
├── Show meals remaining (14 meals left!)
├── Suggest new package if low
└── Ask for feedback
```

### Month 2: Customer Travels
```
1. Customer clicks "Pause" in app
2. Selects return date (April 15)
3. System:
   ├── Updates package.status = paused
   ├── Creates pause_history record
   ├── Stops meal generation
   ├── Cancels pending deliveries
   └── Sends LINE: "Paused until April 15"

4. On April 15:
   ├── Auto-resumes (resume_at trigger)
   ├── Generates meal plan again
   └── Sends LINE: "Welcome back!
       Deliveries resume tomorrow"
```

### Month 3: New Package
```
1. Customer has 10 meals left
2. Dashboard shows "Buy More"
3. Customer clicks "Add 30 Meals"
4. System:
   ├── Creates new meal_package
   ├── Sets meals_remaining = 40
   ├── Plans next 40 meals
   └── Sends LINE: "New package!
       You now have 40 meals"
```

---

## 📈 **ANALYTICS TO TRACK**

```
Customer Level:
├── Meals delivered: 346/360
├── Compliance rate: 96%
├── Favorite meals: [list]
├── Least liked: [list]
├── Pause frequency
├── Package renewal rate
└── Monthly spending: 54,000 THB

Business Level:
├── Active customers: 138
├── Total remaining meals: 12,000+
├── Revenue: 1.8M THB
├── Popular meals
├── Most common allergies
├── Delivery efficiency (on-time %)
├── Customer retention
└── Churn rate
```

---

## 🔐 **SECURITY FEATURES**

```
Row Level Security (RLS):
├── Customers see only their data
├── Admins can see all
├── No cross-customer data leaks

Data Protection:
├── Phone numbers encrypted
├── Addresses encrypted
├── Allergy info confidential
└── Delivery history private

Audit Trail:
├── Track all updates
├── Log pause/resume
├── Monitor package changes
└── Record customizations
```

---

## 🚀 **READY TO DEPLOY**

All files created:
- ✅ `customers-data.json` - 161 customers formatted
- ✅ `supabase-migrations/009_custom_meal_programs.sql` - Database schema
- ✅ `CUSTOM_MEAL_SETUP.md` - Implementation guide
- ✅ Committed to GitHub

**Next: Share your Supabase credentials and we'll import the data!**
