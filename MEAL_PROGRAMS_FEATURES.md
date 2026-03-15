# 🍱 Meal Programs Feature - Complete Feature List

## 📍 Navigation Structure

```
User Dashboard / Admin Dashboard
├─ Tab 1: Home/Orders
├─ Tab 2: Loyalty (existing)
└─ Tab 3: 🍱 Meal Programs (NEW)
```

---

## 👨‍💼 ADMIN DASHBOARD - Meal Programs Tab

### **Feature 1: Overview Cards (Top Section)**
```
┌─────────────────────────────────────────────────────────┐
│                   QUICK STATS                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  📦          │  │  👥          │  │  💰          │ │
│  │ Active Plans │  │ Total        │  │ Revenue This │ │
│  │     12       │  │ Customers    │  │ Month        │ │
│  │              │  │     45       │  │  ฿245,000    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  🎯          │  │  ⏸️           │  │  📊          │ │
│  │ Meals This   │  │ Paused Plans │  │ Avg Days     │ │
│  │ Week         │  │      8       │  │ Remaining    │ │
│  │    120       │  │              │  │     16 days  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Total active meal plans
- ✅ Total customers with programs
- ✅ Monthly revenue from programs
- ✅ Meals scheduled for this week
- ✅ Paused programs count
- ✅ Average days remaining across all customers
- ✅ Click to drill down into details

---

### **Feature 2: Meal Programs Management**
```
┌─────────────────────────────────────────────────────────┐
│                  MEAL PROGRAMS LIBRARY                 │
├─────────────────────────────────────────────────────────┤
│  [+ Create New Program]  [Search...] [Filter] [Export] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ 30-Day Standard Plan                           │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 📅 Days: 30 | 🍱 Meals/Day: 2 | 📦 Total: 60  │    │
│  │ ⏱️ Valid: 30 days | 💰 ฿9,000 total           │    │
│  │                                                │    │
│  │ 👥 Assigned: 12 customers                      │    │
│  │ Status: ✓ Active                               │    │
│  │                                                │    │
│  │ [View Meals] [Edit] [Duplicate] [Deactivate]  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ 60-Day Premium Plan                            │    │
│  ├────────────────────────────────────────────────┤    │
│  │ 📅 Days: 60 | 🍱 Meals/Day: 3 | 📦 Total: 180 │    │
│  │ ⏱️ Valid: 60 days | 💰 ฿25,200 total          │    │
│  │                                                │    │
│  │ 👥 Assigned: 8 customers                       │    │
│  │ Status: ✓ Active                               │    │
│  │                                                │    │
│  │ [View Meals] [Edit] [Duplicate] [Deactivate]  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Display all meal programs
- ✅ Show program stats (days, meals/day, total, price)
- ✅ Show customer count assigned
- ✅ Active/inactive status
- ✅ Edit program details
- ✅ Duplicate program (copy to create new)
- ✅ View meal schedule for program
- ✅ Deactivate program
- ✅ Search/filter programs
- ✅ Export programs list

---

### **Feature 3: Active Customer Programs**
```
┌─────────────────────────────────────────────────────────┐
│             ACTIVE CUSTOMER MEAL PROGRAMS              │
├─────────────────────────────────────────────────────────┤
│ [All Statuses ▼] [Sort: Name ▼] [Filter by Location ▼]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Andras Donauer (Sathorn)                         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Program: 30-Day Standard Plan                    │  │
│  │ Status: ✓ ACTIVE | Location: BKK | Time: 5-6pm  │  │
│  │                                                  │  │
│  │ Progress: 30/60 meals (50%)                      │  │
│  │ [████████░░]                                     │  │
│  │                                                  │  │
│  │ Started: 2026-02-15 | Expires: 2026-03-15       │  │
│  │ Meals Left: 30 | Est. 15 days remaining         │  │
│  │                                                  │  │
│  │ [View Details] [Pause] [Edit] [Send Msg]        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Bo Mirasena (Ploenchit)                          │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Program: 60-Day Premium Plan                     │  │
│  │ Status: ⏸️ PAUSED | Location: BKK | Time: 11am   │  │
│  │                                                  │  │
│  │ Progress: 85/180 meals (47%)                     │  │
│  │ [██████░░░░░░░░░░░░]                            │  │
│  │                                                  │  │
│  │ Started: 2026-01-15 | Expires: 2026-03-15       │  │
│  │ Meals Left: 95 | Paused until: 2026-03-20       │  │
│  │                                                  │  │
│  │ [View Details] [Resume] [Edit] [Send Msg]       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ List all customer meal programs
- ✅ Show customer name & location
- ✅ Show program name & delivery time
- ✅ Status badge (Active/Paused/Completed)
- ✅ Progress bar with percentage
- ✅ Meals consumed vs total
- ✅ Start date & expiration date
- ✅ Days remaining estimate
- ✅ Pause program button
- ✅ Resume paused program
- ✅ Edit customer's program
- ✅ Send LINE message to customer
- ✅ View full customer details
- ✅ Filter by status (active/paused)
- ✅ Sort by name/date/progress
- ✅ Search by customer name

---

### **Feature 4: Meal Selection for Programs**
```
┌─────────────────────────────────────────────────────────┐
│     SELECT MEALS FOR: 30-Day Standard Plan             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  This program has 30 days × 2 meals/day = 60 meals    │
│                                                         │
│  DAY 1                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Meal 1: [▼ Select Meal]                         │   │
│  │ Currently: Grilled Chicken with Rice (420 cal)  │   │
│  │ Allergens: None | Meat: Chicken                 │   │
│  │ [✓] Confirm | [Change]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Meal 2: [▼ Select Meal]                         │   │
│  │ Currently: Tuna Salad (380 cal)                 │   │
│  │ Allergens: Fish | Meat: Seafood                 │   │
│  │ [✓] Confirm | [Change]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  DAY 2                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Meal 1: [▼ Select Meal]                         │   │
│  │ (No meal selected yet)                          │   │
│  └─────────────────────────────────────────────────┘   │
│  ... more days                                         │
│                                                         │
│  [Save All Meals] [Auto-Fill (Repeat Pattern)]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Show day-by-day meal assignment
- ✅ Show meal number (1st, 2nd, 3rd meal of day)
- ✅ Select from preset meal library
- ✅ Show selected meal details (calories, allergens, meat type)
- ✅ Quick change meal without saving
- ✅ Confirm each meal slot
- ✅ Auto-fill feature (repeat pattern for entire program)
- ✅ Bulk assign same meals (all days)
- ✅ Save all selections
- ✅ Preview full meal schedule
- ✅ Meal conflict warnings (allergens vs customer)

---

### **Feature 5: Assign Program to Customer**
```
┌─────────────────────────────────────────────────────────┐
│          ASSIGN PROGRAM TO CUSTOMER                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Select Program:                                        │
│  [▼ 30-Day Standard Plan]                              │
│                                                         │
│  Select Customer:                                       │
│  [Search... type name or phone]                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Andras Donauer                                │   │
│  │   📞 555-1234 | 📍 Sathorn, BKK                 │   │
│  │   Allergies: None | Preferences: Lean meats     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Delivery Settings:                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Delivery Time: [5-6 PM ▼]                       │   │
│  │ Address: [Sathorn, Bangkok ▼]                   │   │
│  │ Phone: [555-1234]                               │   │
│  │ Channel: [Messenger ▼]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Program Details:                                       │
│  • 30 days, 2 meals/day, 60 total meals               │
│  • ฿150/meal = ฿9,000 total                           │
│  • Valid for 30 days after start                       │
│                                                         │
│  [Assign Program] [Cancel]                             │
│                                                         │
│  ✓ Customer will be notified via LINE                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Select program to assign
- ✅ Search customer by name/phone
- ✅ Show customer info & preferences
- ✅ Confirm delivery details
- ✅ Edit delivery time/address if needed
- ✅ Show program pricing breakdown
- ✅ Display assignment confirmation
- ✅ Auto-send LINE notification
- ✅ Set program start date
- ✅ Validation (check customer allergies vs meals)

---

### **Feature 6: Create New Program**
```
┌─────────────────────────────────────────────────────────┐
│            CREATE NEW MEAL PROGRAM                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Program Name: [_____________________________]          │
│  Description: [_____________________________]           │
│                                                         │
│  ┌────────────────┐  ┌──────────────────┐             │
│  │ 📅 Days        │  │ 🍱 Meals/Day     │             │
│  │ [30]           │  │ [2]              │             │
│  │ How many days  │  │ How many meals   │             │
│  │ the program    │  │ to deliver daily │             │
│  │ runs for       │  │                  │             │
│  └────────────────┘  └──────────────────┘             │
│                                                         │
│  ┌────────────────┐  ┌──────────────────┐             │
│  │ 📦 Duration    │  │ 💰 Price/Meal    │             │
│  │ [30] days      │  │ [150] ฿          │             │
│  │ Before package │  │ Price per meal   │             │
│  │ expires        │  │                  │             │
│  └────────────────┘  └──────────────────┘             │
│                                                         │
│  ─────────────────────────────────────────────────     │
│  📊 PROGRAM SUMMARY                                    │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  Total Meals:        60 (30 days × 2 meals/day)       │
│  Total Price:        ฿9,000 (60 meals × ฿150)        │
│  Package Valid For:  30 days from start date          │
│                                                         │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  [Create Program] [Cancel]                             │
│                                                         │
│  💡 Next: You'll select meals for each day            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Program name input
- ✅ Program description
- ✅ Number of days
- ✅ Meals per day
- ✅ Package duration (expires in X days)
- ✅ Price per meal
- ✅ Auto-calculate total meals
- ✅ Auto-calculate total price
- ✅ Real-time summary update
- ✅ Validation (all fields required)
- ✅ Create & proceed to meal selection

---

### **Feature 7: Daily Delivery Schedule**
```
┌─────────────────────────────────────────────────────────┐
│          TOMORROW'S MEAL DELIVERIES                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Date: March 16, 2026                                  │
│  Total Meals: 12 | Customers: 6 | Locations: 2        │
│                                                         │
│  📍 BANGKOK (8 meals)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 5:00 PM - Andras Donauer (Sathorn)              │   │
│  │ 🍱 2 meals:                                     │   │
│  │   • Grilled Chicken with Rice (420 cal)         │   │
│  │   • Tuna Salad (380 cal)                        │   │
│  │ 📞 555-1234 | 📍 123 Sathorn Rd                 │   │
│  │ [Ready to Pack] [Mark Delivered] [Issue?]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 6:00 PM - Bo Mirasena (Ploenchit)               │   │
│  │ 🍱 2 meals:                                     │   │
│  │   • Beef Stir Fry (450 cal)                     │   │
│  │   • Salmon with Asparagus (400 cal)             │   │
│  │ 📞 555-5678 | 📍 456 Ploenchit Rd               │   │
│  │ [Ready to Pack] [Mark Delivered] [Issue?]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📍 PATTAYA (4 meals)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 11:00 AM - Eunice M. (Jomtien)                  │   │
│  │ 🍱 2 meals:                                     │   │
│  │   • Tofu Bowl (320 cal)                         │   │
│  │   • Chicken Breast with Brown Rice (400 cal)    │   │
│  │ 📞 555-9999 | 📍 789 Jomtien Beach              │   │
│  │ [Ready to Pack] [Mark Delivered] [Issue?]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Print Delivery Tickets] [Send Reminders] [Report]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Show tomorrow's scheduled deliveries
- ✅ Group by location (BKK, PT)
- ✅ Group by delivery time
- ✅ Show meal details with calories
- ✅ Show customer contact & address
- ✅ Mark as ready to pack
- ✅ Mark as delivered
- ✅ Report issues
- ✅ Print delivery tickets
- ✅ Send customer reminders
- ✅ Daily report generation
- ✅ Meal count summary

---

## 👥 CUSTOMER DASHBOARD - Meal Programs Tab

### **Feature 1: Active Program Card**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🍱 30-Day Standard Plan              ✓ Active          │
│  Your customized meal delivery program                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📅 30 DAYS | 🍱 2 MEALS/DAY | 📦 60 TOTAL | ⏱️ 30 DAYS│
│                                                         │
│  📊 YOUR PROGRESS                                       │
│  [████████░░░░░░░░░░░░░░░░░░] 30 / 60 meals (50%)     │
│                                                         │
│  🟢 30 MEALS REMAINING                                 │
│  About 15 days left                                     │
│                                                         │
│  📅 Started: 2026-02-15                                │
│  ⏰ Expires: 2026-03-15                                │
│  📍 Delivery Time: 5-6 PM                              │
│                                                         │
│  [⏸️ PAUSE PROGRAM]  [💬 GET HELP]                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📦 NEXT DELIVERY                                │   │
│  │ Tomorrow at 5:00 PM                             │   │
│  │ • Grilled Chicken with Rice - 420 cal           │   │
│  │ • Tuna Salad - 380 cal                          │   │
│  │ 📍 123 Sathorn Rd, Sathorn, Bangkok              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Program name with status (Active/Paused)
- ✅ 4 key metrics (days, meals/day, total, duration)
- ✅ Progress bar with percentage
- ✅ Meals remaining count
- ✅ Days remaining estimate
- ✅ Start & expiration dates
- ✅ Delivery time display
- ✅ Pause button
- ✅ Help/support button
- ✅ Next delivery preview
- ✅ Next meal details & delivery address
- ✅ Click to expand full schedule

---

### **Feature 2: Program Details Expandable**
```
┌─────────────────────────────────────────────────────────┐
│  [▼ EXPAND] Full Program Details                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📋 PROGRAM SUMMARY                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Program: 30-Day Standard Plan                   │   │
│  │ Duration: 30 days (Feb 15 - Mar 15)             │   │
│  │ Meals: 60 total (2 per day)                     │   │
│  │ Price: ฿150/meal = ฿9,000 total                 │   │
│  │ Status: Active (30 days remaining)              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  🍽️ MEAL SCHEDULE (Days 1-5 shown)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ DAY 1 (Mar 16)                                   │   │
│  │ Meal 1: Grilled Chicken with Rice - 420 cal     │   │
│  │ Meal 2: Tuna Salad - 380 cal                    │   │
│  │ Total: 800 cal                                  │   │
│  │                                                  │   │
│  │ DAY 2 (Mar 17)                                   │   │
│  │ Meal 1: Beef Stir Fry - 450 cal                 │   │
│  │ Meal 2: Salmon with Asparagus - 400 cal         │   │
│  │ Total: 850 cal                                  │   │
│  │ ...                                              │   │
│  │ [Load More Days] [Print Schedule] [Download PDF] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  👤 DELIVERY INFO                                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Time: 5:00 - 6:00 PM                            │   │
│  │ Address: 123 Sathorn Rd, Sathorn, Bangkok       │   │
│  │ Phone: 0812345678                               │   │
│  │ Contact: Andras Donauer                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  📊 NUTRITION TRACKING                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Average Calories/Day: 1,650 cal                 │   │
│  │ Protein: 120g/day | Carbs: 180g/day             │   │
│  │ Fat: 45g/day                                    │   │
│  │                                                  │   │
│  │ [View Detailed Nutrition] [Export Macros]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Full program summary
- ✅ Complete meal schedule (all days)
- ✅ Individual meal calories
- ✅ Daily nutrition total
- ✅ Print schedule
- ✅ Download as PDF
- ✅ Delivery time & address
- ✅ Nutrition summary
- ✅ Average daily calories
- ✅ Macro breakdown
- ✅ Download macro data

---

### **Feature 3: Pause Program Modal**
```
┌──────────────────────────────────────────────────────┐
│  ⏸️ PAUSE YOUR MEAL PROGRAM                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  When will you return?                               │
│                                                      │
│  📅 Select Return Date:                              │
│  [Pick a date from calendar]                         │
│  or type: 2026-04-15                                 │
│                                                      │
│  📝 Why are you pausing? (optional)                  │
│  [Traveling] [On vacation] [Personal] [Other]       │
│  ☑ Traveling                                         │
│                                                      │
│  📌 What happens:                                    │
│  ✓ No meals will be delivered                       │
│  ✓ Your 30 remaining meals are safe                 │
│  ✓ Meals will resume: April 15                      │
│  ✓ Program expires: March 15 (may extend)           │
│                                                      │
│  [CONFIRM PAUSE] [CANCEL]                            │
│                                                      │
│  💡 Need longer pause? [Contact Support]             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Date picker for return date
- ✅ Reason for pause (optional)
- ✅ Clear explanation of what happens
- ✅ Show pause date & resume date
- ✅ Show meals preserved
- ✅ Show expiration extension
- ✅ Confirmation button
- ✅ Support link for longer pauses

---

### **Feature 4: Active Programs List (if multiple)**
```
┌─────────────────────────────────────────────────────────┐
│  YOUR MEAL PROGRAMS                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [✓ Active] [Paused] [Completed]                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🟢 30-Day Standard Plan         ✓ ACTIVE       │   │
│  │ Started: Feb 15 | Expires: Mar 15              │   │
│  │ 30/60 meals (50% done)                         │   │
│  │ [View Details] [Pause] [Help]                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⏸️ 60-Day Premium Plan         ⏸️ PAUSED        │   │
│  │ Started: Jan 15 | Expires: Mar 15              │   │
│  │ 85/180 meals (47% done)                        │   │
│  │ Paused until: Mar 20                           │   │
│  │ [View Details] [Resume] [Help]                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✅ 30-Day Starter Plan         ✅ COMPLETED    │   │
│  │ Started: Jan 1 | Ended: Jan 31                 │   │
│  │ 30/30 meals (100% done)                        │   │
│  │ [Reorder Same Program] [View Details]          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ List all programs (active, paused, completed)
- ✅ Tab filter (active/paused/completed)
- ✅ Status badge for each
- ✅ Program dates (start, end, expiration)
- ✅ Progress for active/paused
- ✅ Quick actions (pause/resume/reorder)
- ✅ Click to view full details
- ✅ Reorder completed programs

---

### **Feature 5: Program History**
```
┌─────────────────────────────────────────────────────────┐
│  PROGRAM HISTORY                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ 30-Day Starter Plan (Completed)                    │
│     Jan 1 - Jan 31, 2026 | 30 meals consumed          │
│     ★★★★★ 5/5 - "Loved it, very balanced!"           │
│     [View] [Reorder] [View Feedback]                  │
│                                                         │
│  ✅ 14-Day Trial (Completed)                           │
│     Dec 1 - Dec 14, 2025 | 28 meals consumed          │
│     ★★★★☆ 4/5 - "Great quality, would increase qty"  │
│     [View] [Reorder] [View Feedback]                  │
│                                                         │
│  ✅ Weekend Meals (Completed)                          │
│     Nov 20 - Nov 27, 2025 | 8 meals consumed          │
│     ★★★★★ 5/5 - "Perfect for my busy lifestyle"      │
│     [View] [Reorder] [View Feedback]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Show all past programs
- ✅ Program dates & meals consumed
- ✅ Customer rating (1-5 stars)
- ✅ Customer review/feedback
- ✅ Reorder same program
- ✅ View full details
- ✅ Archive/hide old programs

---

### **Feature 6: Quick Stats Dashboard**
```
┌─────────────────────────────────────────────────────────┐
│  YOUR MEAL STATS                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 📊            │  │ ⏰            │  │ 💰           │ │
│  │ MEALS SO FAR  │  │ TIME SAVED    │  │ MONEY SAVED  │ │
│  │     120       │  │   45 hours    │  │  ฿3,500      │ │
│  │ this month    │  │ (no shopping) │  │ (vs. eating  │ │
│  │              │  │              │  │  out)        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 🔥            │  │ 👥            │  │ 🌟           │ │
│  │ CALORIES      │  │ MEALS WITH    │  │ RATING       │ │
│  │ 49,500        │  │ PROTEIN: 80%  │  │ 4.8 / 5 ⭐  │ │
│  │ this month    │  │ of meals have │  │ average      │ │
│  │              │  │ 25g+ protein  │  │             │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  [View Detailed Analytics] [Download Report]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Total meals consumed this month
- ✅ Time saved from meal prep
- ✅ Money saved vs eating out
- ✅ Total calories consumed
- ✅ Percentage of high-protein meals
- ✅ Overall rating of programs
- ✅ Download monthly report
- ✅ Export nutrition data

---

## 🎨 MENU NAVIGATION - 3 Tabs Structure

### **Current Menu Structure**
```
┌──────────────────────────────────────────────────────┐
│  USER DASHBOARD                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [ 1️⃣ Home ]  [ 2️⃣ Loyalty ]  [ 3️⃣ Meal Programs ]  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### **Tab 1: Home (Existing)**
- Orders
- Pending orders
- Recent activity
- Quick links

### **Tab 2: Loyalty (Existing)**
- Points balance
- Transaction history
- Redeem rewards
- Referrals

### **Tab 3: Meal Programs (NEW)**
- Active program card
- Program details
- Meal schedule
- Pause/resume
- Program history
- Stats & analytics

---

## 📋 ADMIN MENU - Meal Programs Tab

```
┌──────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [ 1️⃣ Orders ] [ 2️⃣ Customers ] [ 3️⃣ Meal Programs ]│
│                                                      │
│  (OR alternative structure)                         │
│                                                      │
│  [ Home ] [ Orders ] [ Customers ] [ Loyalty ]      │
│           [ Settings ▼ ]                            │
│              ├─ Meal Programs                       │
│              ├─ Meal Library                        │
│              └─ Pricing                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## ✅ COMPLETE FEATURE SUMMARY

### **Admin Features (15 total)**
1. ✅ Overview stats (active plans, revenue, meals this week)
2. ✅ Meal programs library (view, edit, delete, duplicate)
3. ✅ Active customer programs (list, pause, resume, track)
4. ✅ Meal selection tool (assign meals to program days)
5. ✅ Assign program to customer
6. ✅ Create new programs
7. ✅ Daily delivery schedule
8. ✅ Send LINE notifications
9. ✅ Edit customer program details
10. ✅ Program performance analytics
11. ✅ Export programs/customers
12. ✅ Meal library management
13. ✅ Price adjustments
14. ✅ Bulk operations (pause multiple)
15. ✅ Reports & dashboards

### **Customer Features (10 total)**
1. ✅ Active program card (status, progress)
2. ✅ Program details (expandable)
3. ✅ Complete meal schedule
4. ✅ Pause program (with return date)
5. ✅ Resume paused program
6. ✅ Next delivery preview
7. ✅ Multiple programs list
8. ✅ Program history (completed programs)
9. ✅ Stats & analytics dashboard
10. ✅ Help/support button

---

## 🎯 Ready to implement?
