# Phase 2: API Endpoints Implementation Guide

## 📋 Overview

This phase creates 20+ API endpoints that connect your frontend to the new database tables. All endpoints are production-ready TypeScript.

**Timeline:** 1-2 weeks
**Estimated effort:** 10-15 hours
**Dependencies:** Phase 1 (database) must be complete

---

## 🗂️ API Routes Structure

```
/app/api/
├── meals/
│   ├── route.ts                 # GET all programs, POST new program
│   ├── [id]/
│   │   ├── route.ts             # GET, PATCH, DELETE single program
│   │   └── meals/
│   │       └── route.ts         # GET meals for a program
│   └── reviews/
│       └── route.ts             # POST review for program
├── customer-programs/
│   ├── route.ts                 # GET my programs, POST subscribe
│   └── [id]/
│       ├── route.ts             # PATCH update progress
│       ├── pause/
│       │   └── route.ts         # POST pause program
│       └── resume/
│           └── route.ts         # POST resume program
├── loyalty/
│   ├── account/
│   │   └── route.ts             # GET my loyalty account
│   ├── transactions/
│   │   └── route.ts             # GET my points transactions
│   ├── rewards/
│   │   └── route.ts             # GET available rewards
│   └── redeem/
│       └── route.ts             # POST redeem reward
├── health/
│   ├── metrics/
│   │   └── route.ts             # POST/GET health metrics
│   └── progress/
│       └── route.ts             # GET health progress
├── referrals/
│   ├── route.ts                 # GET my referrals
│   └── generate/
│       └── route.ts             # POST generate referral code
└── admin/
    ├── programs/
    │   ├── route.ts             # Admin CRUD operations
    │   └── [id]/route.ts        # Admin GET/PATCH/DELETE
    ├── loyalty/
    │   ├── tiers/route.ts       # Admin tier management
    │   └── rewards/route.ts     # Admin reward management
    ├── analytics/
    │   ├── revenue/route.ts     # Revenue analytics
    │   ├── customers/route.ts   # Customer analytics
    │   └── loyalty/route.ts     # Loyalty analytics
    ├── config/
    │   └── route.ts             # System configuration
    └── audit/
        └── route.ts             # Admin action audit log
```

---

## 📝 API Endpoints (Detailed)

### 1️⃣ MEAL PROGRAMS

#### GET /api/meals
**Purpose:** List all available meal programs
**Authentication:** Public (optional user context)
**Query params:** `category?`, `difficulty?`, `page?`, `limit?`

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "program_name": "30-Day Weight Loss Plan",
      "slug": "weight-loss-30",
      "category": "weight_loss",
      "description": "...",
      "duration_days": 30,
      "meals_per_day": 2,
      "total_meals": 60,
      "nutrition_targets": {
        "calories": 1800,
        "protein": 150,
        "carbs": 180,
        "fat": 60
      },
      "price_per_meal": 75,
      "total_price": 4500,
      "points_earned": 10,
      "points_bonus": 500,
      "rating": 4.8,
      "review_count": 45,
      "is_available": true,
      "created_at": "2026-03-01T00:00:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 10
}
```

#### POST /api/meals
**Purpose:** Create new meal program (Admin only)
**Authentication:** Required (admin role)
**Body:** Program details

```typescript
{
  "program_name": "New Program",
  "category": "weight_loss",
  "duration_days": 30,
  "meals_per_day": 2,
  "price_per_meal": 75,
  "nutrition_targets": {
    "calories": 1800,
    "protein": 150,
    "carbs": 180,
    "fat": 60
  },
  "points_earned": 10,
  "points_bonus": 500
}
```

#### GET /api/meals/[id]
**Purpose:** Get single program details
**Authentication:** Public

#### PATCH /api/meals/[id]
**Purpose:** Update program (Admin only)
**Authentication:** Required (admin role)

#### DELETE /api/meals/[id]
**Purpose:** Delete program (Admin only)
**Authentication:** Required (admin role)

#### GET /api/meals/[id]/meals
**Purpose:** Get all meals in a program
**Authentication:** Public

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "program_id": "uuid",
      "day": 1,
      "meal_type": "breakfast",
      "meal_name": "Grilled Chicken with Rice",
      "description": "...",
      "calories": 400,
      "protein": 30,
      "carbs": 50,
      "fat": 10,
      "ingredients": ["chicken", "rice", "vegetables"],
      "instructions": "...",
      "prep_time_minutes": 15,
      "image_url": "..."
    }
  ]
}
```

#### POST /api/meals/reviews
**Purpose:** Submit program review
**Authentication:** Required (customer)
**Body:**

```typescript
{
  "program_id": "uuid",
  "rating": 5,
  "comment": "Excellent program!",
  "would_recommend": true
}
```

---

### 2️⃣ CUSTOMER PROGRAMS

#### GET /api/customer-programs
**Purpose:** Get my enrolled programs
**Authentication:** Required (customer)

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "program_id": "uuid",
      "program": {
        "program_name": "30-Day Weight Loss",
        "duration_days": 30,
        "meals_per_day": 2
      },
      "status": "active",
      "enrollment_date": "2026-03-01T00:00:00Z",
      "start_date": "2026-03-01T00:00:00Z",
      "expected_end_date": "2026-03-31T00:00:00Z",
      "meals_consumed": 35,
      "days_completed": 17,
      "pause_date": null,
      "notes": "...",
      "progress_percentage": 56.7
    }
  ]
}
```

#### POST /api/customer-programs
**Purpose:** Subscribe to a program
**Authentication:** Required (customer)
**Body:**

```typescript
{
  "program_id": "uuid"
}
```

#### PATCH /api/customer-programs/[id]
**Purpose:** Update program progress
**Authentication:** Required (customer)
**Body:**

```typescript
{
  "meals_consumed": 36,
  "notes": "On track!"
}
```

#### POST /api/customer-programs/[id]/pause
**Purpose:** Pause a program
**Authentication:** Required (customer)

#### POST /api/customer-programs/[id]/resume
**Purpose:** Resume a paused program
**Authentication:** Required (customer)

---

### 3️⃣ LOYALTY SYSTEM

#### GET /api/loyalty/account
**Purpose:** Get my loyalty account
**Authentication:** Required (customer)

```typescript
// Response
{
  "data": {
    "id": "uuid",
    "customer_id": "uuid",
    "points_balance": 2350,
    "tier_id": "uuid",
    "tier": {
      "tier_name": "Gold",
      "tier_level": 3,
      "points_min": 1201,
      "points_max": 3000,
      "discount_percent": 10,
      "benefits": [
        "10% discount on all programs",
        "Free delivery",
        "Priority support"
      ]
    },
    "points_to_next_tier": 650,
    "tier_progress_percent": 46.7,
    "total_points_earned_all_time": 3250,
    "total_points_redeemed": 900,
    "updated_at": "2026-03-16T12:00:00Z"
  }
}
```

#### GET /api/loyalty/transactions
**Purpose:** Get my points transactions
**Authentication:** Required (customer)

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "points": 300,
      "transaction_type": "earn",
      "reason": "completed_program",
      "description": "Completed 30-Day Weight Loss Program",
      "reference_id": "program_uuid",
      "created_at": "2026-03-15T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1
}
```

#### GET /api/loyalty/rewards
**Purpose:** Get available rewards
**Authentication:** Required (customer)

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "reward_name": "฿50 Discount",
      "description": "฿50 off your next order",
      "points_required": 500,
      "reward_type": "discount",
      "reward_value": 50,
      "available_quantity": 100,
      "is_available": true,
      "can_redeem": false,
      "points_short": 150,
      "redeemed_count": 0
    }
  ]
}
```

#### POST /api/loyalty/redeem
**Purpose:** Redeem a reward
**Authentication:** Required (customer)
**Body:**

```typescript
{
  "reward_id": "uuid"
}
```

---

### 4️⃣ HEALTH METRICS

#### POST /api/health/metrics
**Purpose:** Log health metric
**Authentication:** Required (customer)
**Body:**

```typescript
{
  "metric_type": "weight",  // weight, energy_level, sleep_hours, custom
  "value": 75.5,
  "unit": "kg",
  "notes": "Feeling great!"
}
```

#### GET /api/health/metrics
**Purpose:** Get my health metrics
**Authentication:** Required (customer)
**Query params:** `metric_type?`, `days?` (default: 30)

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "metric_type": "weight",
      "value": 75.5,
      "unit": "kg",
      "recorded_at": "2026-03-16T08:00:00Z"
    }
  ]
}
```

#### GET /api/health/progress
**Purpose:** Get health progress summary
**Authentication:** Required (customer)

```typescript
// Response
{
  "data": {
    "weight": {
      "current": 75.5,
      "starting": 78.0,
      "change": -2.5,
      "change_percent": -3.2,
      "trend": "down"
    },
    "energy_level": {
      "average": 8.2,
      "trend": "up"
    },
    "sleep_hours": {
      "average": 7.5,
      "trend": "stable"
    }
  }
}
```

---

### 5️⃣ REFERRALS

#### GET /api/referrals
**Purpose:** Get my referral stats
**Authentication:** Required (customer)

```typescript
// Response
{
  "data": {
    "referral_code": "HOMIE_USER123",
    "total_referrals": 5,
    "successful_referrals": 3,
    "pending_referrals": 2,
    "points_earned": 1500,
    "referrals": [
      {
        "id": "uuid",
        "referred_user_id": "uuid",
        "referred_user_name": "Friend Name",
        "status": "completed",
        "signup_bonus_earned": 500,
        "completion_bonus_earned": 500,
        "created_at": "2026-03-10T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/referrals/generate
**Purpose:** Generate new referral code
**Authentication:** Required (customer)

```typescript
// Response
{
  "code": "HOMIE_USER123",
  "url": "https://homiecleanfood.com?ref=HOMIE_USER123"
}
```

---

### 6️⃣ ADMIN ENDPOINTS

#### GET /api/admin/programs
**Purpose:** List all programs (with analytics)
**Authentication:** Required (admin)

```typescript
// Response
{
  "data": [
    {
      "id": "uuid",
      "program_name": "30-Day Weight Loss",
      "total_customers": 125,
      "revenue": 562500,
      "avg_rating": 4.8,
      "completion_rate": 78.5,
      "created_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

#### PATCH /api/admin/programs/[id]
**Purpose:** Update program details
**Authentication:** Required (admin)

#### DELETE /api/admin/programs/[id]
**Purpose:** Delete program
**Authentication:** Required (admin)

#### GET /api/admin/loyalty/tiers
**Purpose:** Get loyalty tier configuration
**Authentication:** Required (admin)

#### PATCH /api/admin/loyalty/tiers/[id]
**Purpose:** Update tier settings
**Authentication:** Required (admin)

#### GET /api/admin/loyalty/rewards
**Purpose:** Get reward definitions
**Authentication:** Required (admin)

#### POST /api/admin/loyalty/rewards
**Purpose:** Create new reward
**Authentication:** Required (admin)

#### GET /api/admin/analytics/revenue
**Purpose:** Revenue analytics
**Authentication:** Required (admin)

```typescript
// Response
{
  "data": {
    "total_revenue": 2486250,
    "revenue_this_month": 312000,
    "average_order_value": 2350,
    "total_orders": 1057,
    "revenue_by_program": [
      {
        "program_name": "30-Day Weight Loss",
        "revenue": 562500,
        "order_count": 75
      }
    ],
    "revenue_by_date": [...]
  }
}
```

#### GET /api/admin/analytics/customers
**Purpose:** Customer analytics
**Authentication:** Required (admin)

#### GET /api/admin/analytics/loyalty
**Purpose:** Loyalty program analytics
**Authentication:** Required (admin)

```typescript
// Response
{
  "data": {
    "total_points_distributed": 45000,
    "total_points_redeemed": 12500,
    "avg_points_per_customer": 2350,
    "tier_distribution": {
      "bronze": 120,
      "silver": 85,
      "gold": 45,
      "platinum": 8
    },
    "top_rewards": [
      {
        "reward_name": "฿50 Discount",
        "times_redeemed": 234
      }
    ]
  }
}
```

#### GET /api/admin/config
**Purpose:** Get system configuration
**Authentication:** Required (admin)

#### PATCH /api/admin/config
**Purpose:** Update system configuration
**Authentication:** Required (admin)

#### GET /api/admin/audit
**Purpose:** Get admin action audit log
**Authentication:** Required (admin)

---

## 🛠️ Implementation Steps

### Step 1: Create Base Types (lib/types/)
```typescript
// lib/types/meal-program.ts
export interface MealProgram {
  id: string;
  program_name: string;
  duration_days: number;
  // ... other fields
}

export interface Program {
  id: string;
  program_name: string;
  // ... fields
}
```

### Step 2: Create Database Query Functions (lib/db/)
```typescript
// lib/db/meal-programs.ts
export async function getMealPrograms(filters?) {
  const { data, error } = await supabase
    .from('meal_programs')
    .select('*')
    .match(filters || {});

  if (error) throw error;
  return data;
}
```

### Step 3: Create API Endpoints (/app/api/)
```typescript
// app/api/meals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMealPrograms } from '@/lib/db/meal-programs';

export async function GET(request: NextRequest) {
  try {
    const programs = await getMealPrograms();
    return NextResponse.json({
      data: programs,
      total: programs.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 📅 Implementation Timeline

### Week 1: Foundation
- [ ] Create base TypeScript types (`lib/types/`)
- [ ] Create database query functions (`lib/db/`)
- [ ] Set up error handling & utilities
- [ ] Create meal programs endpoints (GET, POST, PATCH, DELETE)

### Week 2: Core Features
- [ ] Customer program endpoints (subscribe, pause, resume)
- [ ] Loyalty system endpoints (account, transactions, rewards)
- [ ] Health metrics endpoints
- [ ] Referral endpoints

### Week 3: Admin & Analytics
- [ ] Admin program management endpoints
- [ ] Admin loyalty configuration endpoints
- [ ] Analytics endpoints (revenue, customers, loyalty)
- [ ] Config management endpoint

---

## ✅ Verification Checklist

After implementing all endpoints, verify:

- [ ] All 20+ endpoints implemented
- [ ] TypeScript types defined for all responses
- [ ] Database queries tested
- [ ] Authentication checks in place (public vs. admin)
- [ ] Error handling for all edge cases
- [ ] Response formats match specifications above
- [ ] No console errors or warnings
- [ ] Postman collection created for testing

---

## 📚 Tech Stack Reference

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM:** Supabase JS Client
- **Auth:** Supabase Auth (built-in)

---

**Status:** Ready to implement after Phase 1 ✅

Once database is deployed, you can start Phase 2 immediately!
