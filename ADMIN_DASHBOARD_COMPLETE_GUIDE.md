# HomieClean: Complete Admin Dashboard Guide
## Full Control Over Meal Prep + Loyalty System

---

## 📊 Admin Dashboard Structure

```
┌─ MAIN NAVIGATION ────────────────────────────────────────┐
│ 🏠 Dashboard | 🍜 Meal Programs | 💰 Loyalty | 📊 Analytics │
└──────────────────────────────────────────────────────────┘

┌─ DASHBOARD (Home) ───────────────────────────────────────┐
│                                                           │
│ Quick Stats (4 cards):                                    │
│ ┌─────────┬──────────┬────────────┬──────────┐           │
│ │ Revenue │ Programs │ Customers  │ Avg Rate │           │
│ │ ฿145K   │ 8        │ 1,247      │ 4.8★     │           │
│ └─────────┴──────────┴────────────┴──────────┘           │
│                                                           │
│ This Month (Chart):                                       │
│ Revenue Trend [Line Chart]                               │
│ Program Completion [Bar Chart]                           │
│                                                           │
│ Recent Activity (Table):                                  │
│ 3 recent enrollments, 2 referrals, 1 review             │
│                                                           │
└──────────────────────────────────────────────────────────┘

┌─ MEAL PROGRAMS ──────────────────────────────────────────┐
│                                                           │
│ [+ NEW PROGRAM] [📊 ANALYTICS] [⚙️ SETTINGS]            │
│                                                           │
│ Filters: [Category ▼] [Status ▼] [Availability ▼]       │
│ Search: [______________] [🔍 Search]                    │
│                                                           │
│ Programs Table:                                           │
│ ┌──────────┬──────────┬────────┬────────┬──────────────┐ │
│ │ Program  │ Category │ Status │ Enroll │ Rating │     │ │
│ ├──────────┼──────────┼────────┼────────┼──────────────┤ │
│ │ 30-Day H │ General  │ Active │ 287    │ 4.8★   │ ✎ ❌ │ │
│ │ 45-Day A │ Muscle   │ Active │ 156    │ 4.9★   │ ✎ ❌ │ │
│ │ 60-Day W │ Weight   │ Active │ 234    │ 4.7★   │ ✎ ❌ │ │
│ │ 90-Day E │ General  │ Draft  │ 0      │ N/A    │ ✎ ❌ │ │
│ └──────────┴──────────┴────────┴────────┴──────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘

┌─ LOYALTY MANAGEMENT ─────────────────────────────────────┐
│                                                           │
│ [⚙️ TIER SETTINGS] [🎁 REWARDS] [📋 RULES]              │
│                                                           │
│ Tier Management:                                          │
│ ┌─────────┬─────────┬───────────┬──────────┐            │
│ │ Tier    │ Members │ Min Pts   │ Benefits │            │
│ ├─────────┼─────────┼───────────┼──────────┤            │
│ │ Bronze  │ 340     │ 0         │ 0%       │            │
│ │ Silver  │ 280     │ 301       │ 5% off   │            │
│ │ Gold    │ 250     │ 1,201     │ 10% off  │            │
│ │ Platin  │ 185     │ 3,001     │ 15% off  │            │
│ └─────────┴─────────┴───────────┴──────────┘            │
│                                                           │
│ Reward Management:                                        │
│ ┌──────────────────┬──────────┬─────────────┐           │
│ │ Reward           │ Points   │ Redemptions │           │
│ ├──────────────────┼──────────┼─────────────┤           │
│ │ ฿50 Off          │ 300      │ 245         │           │
│ │ 1 Free Meal      │ 500      │ 189         │           │
│ │ Free Delivery    │ 500      │ 156         │           │
│ │ ฿200 Off         │ 1,000    │ 78          │           │
│ │ [+ ADD REWARD]   │          │             │           │
│ └──────────────────┴──────────┴─────────────┘           │
│                                                           │
└──────────────────────────────────────────────────────────┘

┌─ ANALYTICS ──────────────────────────────────────────────┐
│                                                           │
│ [📅 DATE RANGE] [📊 EXPORT]                             │
│                                                           │
│ Revenue Analytics:                                        │
│ Total Revenue: ฿2,450,000 | This Month: ฿180,000       │
│ [Revenue Trend Chart] [Breakdown by Program]             │
│                                                           │
│ Customer Analytics:                                       │
│ Total Customers: 1,247 | New This Month: 145             │
│ [Customer Growth] [Tier Distribution]                    │
│                                                           │
│ Program Performance:                                      │
│ [Program Comparison Table with all metrics]              │
│                                                           │
│ Loyalty Performance:                                      │
│ Points Issued: 127,450 | Redeemed: ฿42,000             │
│ Loyalty ROI: 4.2x | Referral Revenue: ฿420,000          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ SECTION 1: MEAL PROGRAMS TAB

### **1.1 Program List View**

**Features:**
- Table with all programs (Active, Draft, Archived)
- Filters: Category, Status, Availability
- Search: By program name
- Sorting: By enrollment, rating, date created
- Quick actions: Edit, Duplicate, Archive, View Analytics

**Admin Actions:**
```
[+ NEW PROGRAM] - Creates blank program
[EDIT] - Opens program editor
[DUPLICATE] - Copy program with new name
[VIEW ANALYTICS] - Shows program performance
[ARCHIVE] - Hide from customer view
```

### **1.2 Create/Edit Program Form**

**Sections:**

#### **A. Basic Info**
```
Program Name: [_________________]
Slug (URL): [_________________] (auto-generated)
Category: [Dropdown] General Health
Description: [________________]
Detailed Description: [Rich Text Editor]

Featured Image: [Upload Image]
Gallery Images: [Upload Multiple]
```

#### **B. Duration & Meals**
```
Duration (days): [30____]
Meals Per Day: [2____]
Total Meals: [Auto calculated: 60]

Target Difficulty: [Beginner] [Intermediate] [Advanced]
Target Demographic: [Athletes / Weight Loss / General / etc]
```

#### **C. Nutrition Targets**
```
┌─────────────────────────────────┐
│ Daily Nutrition Target:         │
├─────────────────────────────────┤
│ Protein: [30]g per day          │
│ Carbs: [150]g per day           │
│ Fat: [50]g per day              │
│ Calories: [1800] per day        │
│ Fiber: [25]g per day            │
└─────────────────────────────────┘

Dietary Restrictions:
☐ Gluten Free  ☐ Dairy Free  ☐ Vegan
☐ Keto  ☐ Low Carb  ☐ High Protein
```

#### **D. Meal Assignment**
```
Day 1 of 30:
┌──────────────────────────────────────┐
│ Breakfast (8:00 AM)                  │
│ [Select Meal ▼] Thai Herb Chicken   │
│ Protein: 28g | Cal: 380              │
│                                       │
│ Lunch (12:00 PM)                     │
│ [Select Meal ▼] Green Curry Tofu    │
│ Protein: 18g | Cal: 340              │
│                                       │
│ Dinner (6:00 PM)                     │
│ [Select Meal ▼] Grilled Fish        │
│ Protein: 35g | Cal: 420              │
└──────────────────────────────────────┘

[< Previous Day] [Next Day >]
[Auto-Rotate Meals] [Copy Day to All] [Suggest Variation]
```

#### **E. Pricing & Promotions**
```
Price Per Meal: [฿_____]
Total Duration Price: [Auto-calculated: ฿60,000]

Discounts:
☐ Enable Early Bird (Off: [20]% | Expires: [2026-03-30])
☐ Enable New Customer (Off: [20]%)
☐ Enable Bundle (2+ Programs: Off: [15]%)

Loyalty Points:
Points Per Meal: [10]
Bonus for Completion: [500]
```

#### **F. Availability**
```
Status: [Draft] [Active] [Archived]
Is Featured: [☑ Yes] [○ No]
Display Order: [1] (1 = top)

Start Date: [2026-03-20]
End Date: [2026-05-20] (optional)

Max Capacity: [50] (optional, NULL = unlimited)
Current Enrollments: [0] (read-only)

Alerts:
⚠️ Only 2 spots remaining
⚠️ Program starts in 5 days
```

#### **G. Save & Publish**
```
[Save as Draft] [Publish] [Preview] [Cancel]
```

---

## 💰 SECTION 2: LOYALTY MANAGEMENT TAB

### **2.1 Tier Settings**

**Editable Tiers:**
```
Tier: BRONZE
├─ Min Points: 0 (disabled)
├─ Discount: 0% (disabled)
├─ Free Delivery: ☐
├─ Priority Support: ☐
├─ Early Access Days: 0 (disabled)
├─ Tier Color: #6b7280 [Change]
├─ Tier Emoji: ⭕ [Change]
└─ [Members: 340]

Tier: SILVER
├─ Min Points: [301______]
├─ Discount: [5_]%
├─ Free Delivery: ☑
├─ Priority Support: ☑
├─ Early Access Days: [24]
├─ Tier Color: #c0c0c0 [Change]
├─ Tier Emoji: ⭐ [Change]
└─ [Members: 280]

Tier: GOLD
├─ Min Points: [1201______]
├─ Discount: [10_]%
├─ Free Delivery: ☑
├─ Priority Support: ☑
├─ Early Access Days: [7]
├─ Tier Color: #d4af37 [Change]
├─ Tier Emoji: 👑 [Change]
└─ [Members: 250]

Tier: PLATINUM
├─ Min Points: [3001______]
├─ Discount: [15_]%
├─ Free Delivery: ☑ Forever
├─ Priority Support: ☑ 24/7
├─ Early Access Days: [unlimited]
├─ Tier Color: #10b981 [Change]
├─ Tier Emoji: 💎 [Change]
└─ [Members: 185]

[SAVE TIER CHANGES]
```

### **2.2 Reward Management**

**Reward Table:**
```
┌─────────────────┬────────┬──────────┬──────────────┐
│ Reward          │ Points │ Max Used │ Redemptions  │
├─────────────────┼────────┼──────────┼──────────────┤
│ ฿50 Off Program │ 300    │ [∞]      │ 245 / ∞      │
│ 1 Free Meal     │ 500    │ [∞]      │ 189 / ∞      │
│ Free Delivery   │ 500    │ [∞]      │ 156 / ∞      │
│ ฿200 Off        │ 1000   │ [∞]      │ 78 / ∞       │
│ Free 30-Day Pro │ 1200   │ [50]     │ 34 / 50      │
│ Free 60-Day Pro │ 3000   │ [∞]      │ 12 / ∞       │
└─────────────────┴────────┴──────────┴──────────────┘
[+ ADD NEW REWARD]
```

**Add/Edit Reward Modal:**
```
┌────────────────────────────────────┐
│ NEW REWARD                         │
├────────────────────────────────────┤
│ Reward Name: [________________]    │
│ Reward Type: [Discount ▼]         │
│                                    │
│ Points Required: [300____]        │
│                                    │
│ ☐ Discount Amount: [฿__]         │
│ ☐ Discount Percent: [0__]%       │
│ ☐ Free Meals: [1__]               │
│ ☐ Free Program Days: [30__]       │
│                                    │
│ Max Redemptions: [∞▼] or [50_]   │
│ Valid From: [2026-03-20]          │
│ Valid Until: [2026-12-31]         │
│                                    │
│ Applicable Programs: [All ▼]      │
│ Min Order Value: [฿____]          │
│                                    │
│ Reward Emoji: 🎁 [Change]        │
│ Display Order: [1____]            │
│                                    │
│ [SAVE REWARD]  [CANCEL]           │
└────────────────────────────────────┘
```

### **2.3 Points Rules Configuration**

**Points Earning Rules:**
```
┌──────────────────────────────────┐
│ HOW CUSTOMERS EARN POINTS        │
├──────────────────────────────────┤
│ Per Meal Consumed: [10] pts      │
│ Program Completion: [500] pts    │
│ Program Review (4★+): [50] pts   │
│ Social Share: [100] pts          │
│                                  │
│ Referral - Friend Signup: [500]  │
│ Referral - Friend Completes: [500] │
│                                  │
│ Birthday Month Bonus: [200] pts  │
│ Work Anniversary (1-year): [100] │
└──────────────────────────────────┘
[SAVE RULES]
```

**Points Redemption Rules:**
```
┌──────────────────────────────────┐
│ REDEMPTION SETTINGS              │
├──────────────────────────────────┤
│ Min Points to Redeem: [100]      │
│ Max Points per Month: [5000]     │
│ Expiration: Points expire after  │
│ [24] months of inactivity        │
│                                  │
│ Partial Redemption: ☑ Allowed    │
│ Auto-Apply on Eligible Reward:   │
│ ○ Yes  ☑ No (user chooses)       │
└──────────────────────────────────┘
[SAVE RULES]
```

---

## 📊 SECTION 3: ANALYTICS TAB

### **3.1 Revenue Dashboard**
```
Period: [This Month ▼] [📅 Custom Range]

┌─────────────────┬────────────────┐
│ Total Revenue   │ ฿2,450,000     │
│ This Month      │ ฿180,000       │
│ Growth (YoY)    │ +45%            │
│ Avg per Program │ ฿306,250       │
└─────────────────┴────────────────┘

[Revenue Trend Line Chart]
[Revenue by Program Bar Chart]
[Revenue by Tier Pie Chart]
```

### **3.2 Customer Analytics**
```
┌──────────────────┬────────────────┐
│ Total Customers  │ 1,247          │
│ This Month       │ +145           │
│ Active Programs  │ 847            │
│ Completed       │ 523            │
└──────────────────┴────────────────┘

[Customer Growth Line Chart]
[Tier Distribution Pie Chart]
[Customer Retention Trend]
[New vs Repeat Customers]
```

### **3.3 Program Performance**
```
Program Performance Table:
┌──────────────┬─────────┬──────────┬──────────────┐
│ Program      │ Enrolled│ Complete │ Avg Rating   │
├──────────────┼─────────┼──────────┼──────────────┤
│ 30-Day Health│ 287     │ 230 (80%)│ 4.8★ (89)    │
│ 45-Day Athlet│ 156     │ 142 (91%)│ 4.9★ (156)   │
│ 60-Day Weight│ 234     │ 168 (72%)│ 4.7★ (234)   │
│ 90-Day Elite │ 45      │ 38 (84%) │ 4.8★ (45)    │
└──────────────┴─────────┴──────────┴──────────────┘

[Completion Rate Comparison]
[Average Rating by Program]
[Revenue per Program]
```

### **3.4 Loyalty Analytics**
```
┌──────────────────┬───────────────┐
│ Total Points Issued │ 127,450     │
│ Points Redeemed (฿) │ ฿42,000     │
│ Loyalty ROI      │ 4.2x          │
│ Referral Revenue │ ฿420,000      │
│ Avg Customer LTV │ ฿4,350        │
└──────────────────┴───────────────┘

[Points Earned vs Redeemed]
[Tier Distribution]
[Referral Performance]
[Top Rewards Redeemed]
```

---

## 🎨 SECTION 4: DESIGN & CUSTOMIZATION

### **4.1 Brand Settings**
```
Brand Colors:
├─ Primary Green: [#10b981] [Color Picker]
├─ Secondary Navy: [#1e293b] [Color Picker]
├─ Accent Gold: [#d4af37] [Color Picker]
├─ Success Green: [#059669] [Color Picker]
├─ Warning Orange: [#d97706] [Color Picker]
└─ Neutral Gray: [#6b7280] [Color Picker]

Typography:
├─ Headline Font: [Sora ▼]
├─ Body Font: [Inter ▼]
├─ Accent Font: [Space Mono ▼]
└─ [PREVIEW TYPOGRAPHY]

Logo & Media:
├─ Logo Upload: [Upload] [Current logo]
├─ Favicon: [Upload] [Current favicon]
├─ Hero Image: [Upload] [Current]
└─ [SAVE BRAND SETTINGS]
```

### **4.2 Email Templates**

**Template List:**
```
┌────────────────────┬──────────────┐
│ Template           │ Status       │
├────────────────────┼──────────────┤
│ Order Confirmation │ ✓ Active     │
│ Delivery Reminder  │ ✓ Active     │
│ Program Complete   │ ✓ Active     │
│ Tier Upgrade       │ ○ Inactive   │
│ Referral Invite    │ ✓ Active     │
│ Loyalty Reminder   │ ✓ Active     │
└────────────────────┴──────────────┘
```

**Edit Template Modal:**
```
Subject: [________________________________]
Send From: [noreply@homieclean.com]

Body: [Rich Text Editor]

Available Variables:
{customer_name} {order_id} {delivery_date}
{program_name} {points_earned} {tier_name}

[SAVE TEMPLATE] [PREVIEW] [TEST SEND]
```

---

## 🔐 SECTION 5: SETTINGS & SECURITY

### **5.1 Account Settings**
```
Admin Email: [admin@homieclean.com]
Two-Factor Auth: [✓ Enabled]
Session Timeout: [30] minutes
```

### **5.2 Notification Settings**
```
☑ Low Stock Alert (threshold: 10 items)
☑ New Review Notification
☑ Program Enrollment Notification
☑ Referral Completion Notification
☑ Milestone Achievement Notification
☑ Daily Summary Email (time: 9:00 AM)
```

### **5.3 Audit Log**
```
┌────────────┬──────────────┬────────────────┐
│ Admin      │ Action       │ Timestamp      │
├────────────┼──────────────┼────────────────┤
│ Admin 1    │ Edit Program │ 2026-03-16 10:30│
│ Admin 2    │ Add Reward   │ 2026-03-16 09:15│
│ Admin 1    │ Delete User  │ 2026-03-16 08:45│
└────────────┴──────────────┴────────────────┘

[Filter] [Export] [View Details]
```

---

## 🚀 ADMIN IMPLEMENTATION PRIORITY

### **Phase 1: Core Management** (Week 1-2)
- [ ] Program CRUD (create, read, update, delete)
- [ ] Meal assignment interface
- [ ] Basic analytics dashboard
- [ ] Loyalty tier configuration

### **Phase 2: Advanced Controls** (Week 3-4)
- [ ] Reward management
- [ ] Email template editor
- [ ] Design customization
- [ ] Detailed analytics

### **Phase 3: Automation** (Week 5-6)
- [ ] Email automation
- [ ] Loyalty rule automation
- [ ] Notification system
- [ ] Audit logging

### **Phase 4: Mobile Admin** (Week 7-8)
- [ ] Mobile admin app
- [ ] Quick stat widgets
- [ ] On-the-go program management
- [ ] Push notifications for alerts

---

**This admin dashboard gives you complete control over your meal prep business.**
**Everything is adjustable, manageable, and data-driven.**

**Ready to build it?**
