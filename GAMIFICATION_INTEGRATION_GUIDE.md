# Gamification System - Integration Guide

## Phase 1 Implementation Complete ✅

This guide shows how to integrate the gamification system into your existing application.

---

## Table of Contents
1. [Database Setup](#database-setup)
2. [Component Integration](#component-integration)
3. [Streak Calculation](#streak-calculation)
4. [Badge & Level Updates](#badge--level-updates)
5. [Weekly Challenge Updates](#weekly-challenge-updates)

---

## Database Setup

### 1. Run Migration
```bash
# Apply the gamification migration to Supabase
# Migration: supabase-migrations/014_gamification_system.sql

# Steps:
1. Go to Supabase dashboard → SQL Editor
2. Copy entire contents of 014_gamification_system.sql
3. Run the migration
```

### 2. Initialize User Gamification Records

When a user signs up or first uses meal programs, create their gamification records:

```typescript
// lib/gamification/initialize.ts

export async function initializeUserGamification(userId: string) {
  const supabase = createServerComponentClient({ cookies });

  // Initialize streak record
  await supabase.from('user_streaks').insert({
    user_id: userId,
    current_streak_days: 0,
    best_streak_days: 0,
    meals_on_current_streak: 0,
  });

  // Initialize level record
  await supabase.from('user_levels').insert({
    user_id: userId,
    current_level: 1,
    level_name: 'Fresh Start',
    total_meals_consumed: 0,
    meals_to_next_level: 15,
  });

  // Initialize all badges as locked
  for (const badge of AVAILABLE_BADGES) {
    await supabase.from('user_badges').insert({
      user_id: userId,
      badge_key: badge.key,
      badge_name: badge.name,
      badge_emoji: badge.emoji,
      badge_tier: badge.tier,
      is_earned: false,
      progress_current: 0,
      progress_target: badge.tier === 'bronze' ?
        (badge.key === 'week_warrior' ? 7 :
         badge.key === 'month_master' ? 30 :
         badge.key === 'consistency_champion' ? 45 : 1) : 0,
      description: badge.description,
      unlock_criteria: badge.unlockCriteria,
    });
  }

  // Initialize weekly challenges
  const { startDate, endDate } = getCurrentWeek();
  for (const challenge of WEEKLY_CHALLENGES) {
    await supabase.from('user_weekly_challenges').insert({
      user_id: userId,
      challenge_key: challenge.key,
      challenge_name: challenge.name,
      challenge_emoji: challenge.emoji,
      week_start_date: startDate,
      week_end_date: endDate,
      target_progress: challenge.targetProgress,
      reward_points: challenge.rewardPoints,
      description: challenge.description,
      goal_description: challenge.goalDescription,
    });
  }
}
```

---

## Component Integration

### 1. Add Gamification Tab to Dashboard

Update `app/dashboard/page.tsx`:

```typescript
import { GamificationDashboard } from '@/components/gamification';

// In your component:
const [tab, setTab] = useState<'overview' | 'gamification' | 'loyalty' | ...>('overview');

// Add to tab list:
const tabs = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'gamification', label: '🎮 Gamification' },
  { key: 'loyalty', label: '⭐ Loyalty' },
  // ...
];

// In render:
{tab === 'gamification' && (
  <GamificationDashboard userId={user.id} />
)}
```

### 2. Add Gamification to Mobile Navigation

If you have a mobile bottom nav, add gamification tab:

```typescript
<BottomNavItem
  icon={<Trophy size={24} />}
  label="Badges"
  href="/dashboard?tab=gamification"
  active={tab === 'gamification'}
/>
```

---

## Streak Calculation

### Trigger Streak Update on Meal Delivery

When a meal is delivered (status changes to 'delivered' in `meal_deliveries` table):

```typescript
// lib/gamification/updateStreak.ts

export async function updateUserStreakOnMealDelivery(
  userId: string,
  deliveryDate: string
) {
  const supabase = createServerComponentClient({ cookies });

  // Get user's meal delivery dates for current month
  const { data: meals } = await supabase
    .from('meal_deliveries')
    .select('scheduled_date')
    .eq('status', 'delivered')
    .like('user_id', `%${userId}%`)
    .gte('scheduled_date', startOfMonth(new Date()).toISOString().split('T')[0]);

  const mealDates = meals?.map(m => m.scheduled_date) || [];

  // Calculate new streak
  const { currentStreak, bestStreak } = calculateStreak(mealDates, currentStreakData);

  // Update database
  await supabase
    .from('user_streaks')
    .update({
      current_streak_days: currentStreak,
      best_streak_days: bestStreak,
      last_meal_date: deliveryDate,
      meals_on_current_streak: mealDates.length,
    })
    .eq('user_id', userId);

  // Check if user earned any streak badges
  const newBadges = checkStreakBadges(currentStreak, earnedBadgeKeys);
  for (const badgeKey of newBadges) {
    await supabase
      .from('user_badges')
      .update({
        is_earned: true,
        earned_at: new Date().toISOString(),
        progress_current: currentStreak,
      })
      .eq('user_id', userId)
      .eq('badge_key', badgeKey);

    // Trigger celebration notification
    await triggerStreakAchievementNotification(userId, badgeKey);
  }
}
```

### API Endpoint to Trigger Streak Update

```typescript
// app/api/gamification/update-streak/route.ts

export async function POST(request: NextRequest) {
  const { userId, deliveryDate } = await request.json();

  const supabase = createServerComponentClient({ cookies });

  // Verify user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await updateUserStreakOnMealDelivery(userId, deliveryDate);

  return NextResponse.json({ success: true });
}
```

---

## Badge & Level Updates

### Update Badges When Milestones are Hit

```typescript
// lib/gamification/updateBadges.ts

export async function updateUserBadges(
  userId: string,
  userData: {
    vegetarianMealsCount: number;
    avgProtein: number;
    totalMeals: number;
    moneySaved: number;
  }
) {
  const supabase = createServerComponentClient({ cookies });

  // Check Veggie Lover badge (20 vegetarian meals)
  if (userData.vegetarianMealsCount >= 20) {
    await supabase
      .from('user_badges')
      .update({
        is_earned: true,
        earned_at: new Date().toISOString(),
        progress_current: userData.vegetarianMealsCount,
      })
      .eq('user_id', userId)
      .eq('badge_key', 'veggie_lover');
  }

  // Check Protein Pro badge (80g+ protein average)
  if (userData.avgProtein >= 80) {
    await supabase
      .from('user_badges')
      .update({
        is_earned: true,
        earned_at: new Date().toISOString(),
        progress_current: Math.round(userData.avgProtein),
      })
      .eq('user_id', userId)
      .eq('badge_key', 'protein_pro');
  }

  // Check Data Driven badge (100+ meals)
  if (userData.totalMeals >= 100) {
    await supabase
      .from('user_badges')
      .update({
        is_earned: true,
        earned_at: new Date().toISOString(),
        progress_current: userData.totalMeals,
      })
      .eq('user_id', userId)
      .eq('badge_key', 'data_driven');
  }

  // Check Savvy Saver badge (฿5,000+ saved)
  if (userData.moneySaved >= 5000) {
    await supabase
      .from('user_badges')
      .update({
        is_earned: true,
        earned_at: new Date().toISOString(),
        progress_current: userData.moneySaved,
      })
      .eq('user_id', userId)
      .eq('badge_key', 'savvy_saver');
  }
}
```

### Update User Level

```typescript
// lib/gamification/updateLevel.ts

export async function updateUserLevel(
  userId: string,
  totalMealsConsumed: number
) {
  const supabase = createServerComponentClient({ cookies });

  // Get current level
  const { data: currentLevel } = await supabase
    .from('user_levels')
    .select('current_level, total_meals_consumed')
    .eq('user_id', userId)
    .single();

  // Calculate new level
  const { currentLevel: newLevel, levelName } = calculateLevel(totalMealsConsumed);

  if (newLevel > currentLevel?.current_level) {
    // Level up!
    const levelUpMsg = getLevelUpMessage(newLevel);

    // Update level
    await supabase
      .from('user_levels')
      .update({
        current_level: newLevel,
        level_name: levelName,
        total_meals_consumed: totalMealsConsumed,
        meals_to_next_level: getMealsToLevel(newLevel + 1, totalMealsConsumed),
        progress_percentage: getLevelProgress(newLevel, totalMealsConsumed)?.percentage || 0,
        unlocked_features: getUnlockedFeatures(newLevel),
      })
      .eq('user_id', userId);

    // Trigger celebration
    await triggerLevelUpNotification(userId, newLevel, levelUpMsg);
  } else {
    // Just update progress
    await supabase
      .from('user_levels')
      .update({
        total_meals_consumed: totalMealsConsumed,
        meals_to_next_level: getMealsToLevel(newLevel + 1, totalMealsConsumed),
        progress_percentage: getLevelProgress(newLevel, totalMealsConsumed)?.percentage || 0,
      })
      .eq('user_id', userId);
  }
}
```

---

## Weekly Challenge Updates

### Update Challenge Progress Daily

Create a scheduled job or cron endpoint that runs daily:

```typescript
// app/api/gamification/update-weekly-challenges/route.ts

export async function POST(request: NextRequest) {
  // This should be called by a cron job (e.g., at midnight ICT)

  const supabase = createServerComponentClient({ cookies });

  // Get all users with active meal programs
  const { data: allUsers } = await supabase
    .from('auth.users')
    .select('id');

  for (const user of allUsers || []) {
    // Get user's meal data for this week
    const weekData = await getUserWeeklyMealData(user.id);

    // Update each challenge's progress
    const { startDate, endDate } = getCurrentWeek();

    const challenges = WEEKLY_CHALLENGES;
    for (const challenge of challenges) {
      const progress = challenge.calculateProgress(weekData);
      const percentage = Math.min(
        Math.round((progress / challenge.targetProgress) * 100),
        100
      );

      const isCompleted = progress >= challenge.targetProgress;

      // Update challenge
      await supabase
        .from('user_weekly_challenges')
        .update({
          current_progress: progress,
          progress_percentage: percentage,
          status: isCompleted ? 'completed' : 'in_progress',
          completed_at: isCompleted ? new Date().toISOString() : null,
          reward_points: isCompleted ? challenge.rewardPoints : 0,
        })
        .eq('user_id', user.id)
        .eq('challenge_key', challenge.key)
        .gte('week_start_date', startDate)
        .lte('week_start_date', endDate);

      // If challenge completed, archive it
      if (isCompleted) {
        await supabase
          .from('user_challenge_history')
          .insert({
            user_id: user.id,
            challenge_key: challenge.key,
            challenge_name: challenge.name,
            completed_at: new Date().toISOString(),
            period_type: 'weekly',
            final_progress: progress,
            reward_points: challenge.rewardPoints,
          });

        // Unlock reward badge if applicable
        if (challenge.rewardBadge) {
          await supabase
            .from('user_badges')
            .update({
              is_earned: true,
              earned_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('badge_key', challenge.rewardBadge);
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
```

### Create New Challenges Every Monday

```typescript
// lib/gamification/createWeeklyChallenges.ts

export async function createNewWeeklyChallenges() {
  // This should run every Monday at midnight ICT

  const supabase = createServerComponentClient({ cookies });

  const { startDate, endDate } = getCurrentWeek();

  // Get all active users
  const { data: allUsers } = await supabase
    .from('auth.users')
    .select('id');

  for (const user of allUsers || []) {
    for (const challenge of WEEKLY_CHALLENGES) {
      // Check if challenge already exists for this week
      const { data: existing } = await supabase
        .from('user_weekly_challenges')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_key', challenge.key)
        .eq('week_start_date', startDate)
        .single();

      if (!existing) {
        // Create new challenge for this week
        await supabase.from('user_weekly_challenges').insert({
          user_id: user.id,
          challenge_key: challenge.key,
          challenge_name: challenge.name,
          challenge_emoji: challenge.emoji,
          week_start_date: startDate,
          week_end_date: endDate,
          target_progress: challenge.targetProgress,
          reward_points: challenge.rewardPoints,
          reward_badge_unlocked: challenge.rewardBadge,
          description: challenge.description,
          goal_description: challenge.goalDescription,
        });
      }
    }
  }
}
```

---

## Notification Triggers

### Streak Achievement Notification

```typescript
// lib/gamification/notifications.ts

export async function triggerStreakAchievementNotification(
  userId: string,
  badgeKey: string
) {
  // Get user's LINE user ID from profile
  const supabase = createServerComponentClient({ cookies });

  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', userId)
    .single();

  if (!profile?.line_user_id) return;

  // Send LINE notification
  const badgeConfig = AVAILABLE_BADGES.find(b => b.key === badgeKey);

  const message = `
🎉 You earned a new badge!
${badgeConfig?.emoji} ${badgeConfig?.name}
Keep up your amazing consistency! 🔥
  `;

  // Use your LINE API client
  await lineClient.pushMessage(profile.line_user_id, message);
}

export async function triggerLevelUpNotification(
  userId: string,
  newLevel: number,
  message: string
) {
  const supabase = createServerComponentClient({ cookies });

  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', userId)
    .single();

  if (!profile?.line_user_id) return;

  await lineClient.pushMessage(profile.line_user_id, message);
}
```

---

## Testing

### Test Streak Calculation

```typescript
// __tests__/gamification.test.ts

import { calculateStreak, checkStreakBadges } from '@/lib/gamification';

describe('Streak Calculator', () => {
  it('should calculate 7-day streak', () => {
    const dates = [
      '2026-03-10', '2026-03-11', '2026-03-12',
      '2026-03-13', '2026-03-14', '2026-03-15',
      '2026-03-16',
    ];

    const result = calculateStreak(dates, mockCurrentStreak);
    expect(result.currentStreak).toBe(7);
  });

  it('should check streak badges', () => {
    const badges = checkStreakBadges(30, []);
    expect(badges).toContain('month_master');
  });
});
```

### Test Level Calculation

```typescript
describe('Level Calculator', () => {
  it('should calculate level 2 at 25 meals', () => {
    const { currentLevel } = calculateLevel(25);
    expect(currentLevel).toBe(2);
  });
});
```

---

## Deployment Checklist

- [ ] Run database migration (014_gamification_system.sql)
- [ ] Deploy gamification components
- [ ] Deploy API endpoint (/api/gamification/[userId])
- [ ] Deploy utility functions
- [ ] Add gamification tab to dashboard
- [ ] Deploy streak update triggers
- [ ] Deploy badge/level update functions
- [ ] Deploy weekly challenge creation (set up cron)
- [ ] Configure LINE notifications for achievements
- [ ] Test end-to-end with test user account
- [ ] Deploy to production
- [ ] Monitor Supabase logs for errors

---

## Next Steps

### Phase 2 (Advanced Analytics)
- Health progress charts
- Nutrition analytics with macro breakdowns
- Spending analysis and ROI tracking
- Meal history and preferences

### Phase 3 (Community Features)
- Leaderboards (by streak, points, level)
- Smart meal recommendations
- Personalized monthly reports
- Churn prevention messaging

---

## Support & Debugging

### Common Issues

**Q: Streak not updating**
A: Check that meal_deliveries.status is being set to 'delivered' when meal is delivered.

**Q: Badges not unlocking**
A: Verify user_badges table is initialized with all badges as locked.

**Q: Challenges not progressing**
A: Ensure daily cron job is running to call `/api/gamification/update-weekly-challenges`

For more help, check the ADVANCED_FEATURES.md documentation.
