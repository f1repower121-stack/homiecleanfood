// Streak Calculation Logic

import { UserStreak } from '@/types/gamification';
import { getTodayICT } from '@/lib/dateUtils';

/**
 * Calculate streak based on meal delivery history
 * A streak is maintained if customer received a meal every day
 * Streak resets if a day is skipped
 */
export function calculateStreak(
  mealDates: string[],
  currentStreak: UserStreak
): {
  currentStreak: number;
  bestStreak: number;
  streakStartDate: string;
} {
  if (mealDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: currentStreak.bestStreakDays,
      streakStartDate: new Date().toISOString().split('T')[0],
    };
  }

  // Sort dates
  const sortedDates = [...mealDates].sort();
  const today = getTodayICT();

  let maxStreak = 0;
  let currentStreakCount = 0;
  let currentStreakStart = sortedDates[0];
  let lastDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    // Check if this is consecutive with the last date
    if (lastDate) {
      const dayDiff =
        (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        // Consecutive day
        currentStreakCount++;
      } else if (dayDiff > 1) {
        // Gap in streak
        maxStreak = Math.max(maxStreak, currentStreakCount);
        currentStreakCount = 1;
        currentStreakStart = dateStr;
      }
      // If dayDiff === 0, it's a duplicate, skip
    } else {
      // First date
      currentStreakCount = 1;
    }

    lastDate = new Date(date);
  }

  // Check final streak
  maxStreak = Math.max(maxStreak, currentStreakCount);

  // Check if current streak continues to today
  const lastMealDate = new Date(sortedDates[sortedDates.length - 1]);
  const todayDate = new Date(today);
  const daysSinceLastMeal =
    (todayDate.getTime() - lastMealDate.getTime()) / (1000 * 60 * 60 * 24);

  // If more than 1 day has passed without a meal, streak is broken
  const isStreakActive = daysSinceLastMeal <= 1;

  return {
    currentStreak: isStreakActive ? currentStreakCount : 0,
    bestStreak: Math.max(maxStreak, currentStreak.bestStreakDays),
    streakStartDate: isStreakActive ? currentStreakStart : today,
  };
}

/**
 * Check if user has broken their streak
 * Returns true if there's a gap of more than 1 day since last meal
 */
export function isStreakBroken(
  lastMealDate: string | null,
  gracePeriodHours: number = 24
): boolean {
  if (!lastMealDate) return false;

  const today = new Date(getTodayICT());
  const lastMeal = new Date(lastMealDate);

  const hoursDiff = (today.getTime() - lastMeal.getTime()) / (1000 * 60 * 60);
  return hoursDiff > gracePeriodHours;
}

/**
 * Get next milestone for user's streak
 * Returns the next streak badge they can work towards
 */
export function getNextStreakMilestone(
  currentStreakDays: number
): {
  milestone: number;
  badge: string;
  name: string;
  daysRemaining: number;
} | null {
  const milestones = [
    { milestone: 7, badge: 'week_warrior', name: 'Week Warrior' },
    { milestone: 14, badge: 'consistent_collector', name: 'Consistent Collector' },
    { milestone: 30, badge: 'month_master', name: 'Month Master' },
    { milestone: 45, badge: 'consistency_champion', name: 'Consistency Champion' },
    { milestone: 60, badge: 'iron_will', name: 'Iron Will' },
    { milestone: 100, badge: 'century_club', name: 'Century Club' },
  ];

  for (const m of milestones) {
    if (currentStreakDays < m.milestone) {
      return {
        milestone: m.milestone,
        badge: m.badge,
        name: m.name,
        daysRemaining: m.milestone - currentStreakDays,
      };
    }
  }

  return null;
}

/**
 * Get streak information formatted for display
 */
export function getStreakDisplay(streak: UserStreak) {
  const fireEmojis = Math.min(Math.floor(streak.currentStreakDays / 5) + 1, 3);
  const fireStr = '🔥'.repeat(fireEmojis);

  return {
    displayText: `${streak.currentStreakDays} days ${fireStr}`,
    fireCount: fireEmojis,
    fireStr,
  };
}

/**
 * Generate motivation message based on streak
 */
export function getStreakMotivationMessage(
  currentStreakDays: number,
  bestStreakDays: number
): string {
  if (currentStreakDays === 0) {
    return '🌱 Start your streak today! Get your first meal to begin.';
  }

  if (currentStreakDays === 1) {
    return '🚀 Great start! Keep it going for more rewards.';
  }

  if (currentStreakDays === 7) {
    return '🏃 One week strong! You\'re on fire! 🔥';
  }

  if (currentStreakDays === 30) {
    return '💪 One month of consistency! You\'re a Month Master! 🏆';
  }

  if (currentStreakDays > bestStreakDays) {
    return `🎉 New personal best! You've beaten your previous record of ${bestStreakDays} days!`;
  }

  if (currentStreakDays % 10 === 0) {
    return `⭐ Amazing! ${currentStreakDays} days of consistency! Keep it up!`;
  }

  const nextMilestone = getNextStreakMilestone(currentStreakDays);
  if (nextMilestone && nextMilestone.daysRemaining <= 3) {
    return `🔥 Almost there! Just ${nextMilestone.daysRemaining} more days for "${nextMilestone.name}" badge!`;
  }

  return '💪 Keep up the great work! Your consistency is paying off.';
}

/**
 * Check if user earned a new streak badge
 */
export function checkStreakBadges(
  currentStreakDays: number,
  earnedBadges: string[]
): string[] {
  const newBadges: string[] = [];

  const badgeMilestones: Record<number, string> = {
    7: 'week_warrior',
    30: 'month_master',
    45: 'consistency_champion',
    100: 'century_club',
  };

  for (const [days, badgeKey] of Object.entries(badgeMilestones)) {
    const daysNum = parseInt(days);
    if (currentStreakDays >= daysNum && !earnedBadges.includes(badgeKey)) {
      newBadges.push(badgeKey);
    }
  }

  return newBadges;
}
