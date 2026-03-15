// Weekly Challenge Calculation Logic

import { ChallengeKey, WEEKLY_CHALLENGES, UserWeeklyChallenge } from '@/types/gamification';
import { getTodayICT } from '@/lib/dateUtils';

/**
 * Get current week's start and end dates
 * Week starts on Monday
 */
export function getCurrentWeek(): {
  startDate: string;
  endDate: string;
} {
  const today = new Date(getTodayICT());
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

  const monday = new Date(today.setDate(diff));
  const sunday = new Date(today.setDate(monday.getDate() + 6));

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * Calculate challenge progress based on user data
 */
export function calculateChallengeProgress(
  challengeKey: ChallengeKey,
  userData: {
    mealsThisWeek: number;
    avgProteinThisWeek: number;
    macroAccuracyThisWeek: number;
    referralsThisWeek: number;
  }
): {
  currentProgress: number;
  progressPercentage: number;
} {
  const challenge = WEEKLY_CHALLENGES.find(c => c.key === challengeKey);
  if (!challenge) {
    return { currentProgress: 0, progressPercentage: 0 };
  }

  const currentProgress = challenge.calculateProgress(userData);
  const progressPercentage = Math.min(
    Math.round((currentProgress / challenge.targetProgress) * 100),
    100
  );

  return {
    currentProgress: Math.round(currentProgress),
    progressPercentage,
  };
}

/**
 * Check if challenge is completed
 */
export function isChallengeCompleted(
  currentProgress: number,
  targetProgress: number
): boolean {
  return currentProgress >= targetProgress;
}

/**
 * Get challenge completion reward
 */
export function getChallengeReward(
  challengeKey: ChallengeKey
): {
  points: number;
  badge?: string;
} | null {
  const challenge = WEEKLY_CHALLENGES.find(c => c.key === challengeKey);
  if (!challenge) return null;

  return {
    points: challenge.rewardPoints,
    badge: challenge.rewardBadge,
  };
}

/**
 * Calculate total weekly points from completed challenges
 */
export function calculateWeeklyPoints(completedChallenges: ChallengeKey[]): number {
  return completedChallenges.reduce((sum, key) => {
    const reward = getChallengeReward(key);
    return sum + (reward?.points || 0);
  }, 0);
}

/**
 * Get next challenge milestone
 */
export function getNextChallengeMilestone(
  currentProgress: number,
  targetProgress: number,
  milestones: number[] = [25, 50, 75, 100]
): number | null {
  const percentage = Math.round((currentProgress / targetProgress) * 100);

  for (const milestone of milestones) {
    if (percentage < milestone) {
      return milestone;
    }
  }

  return null;
}

/**
 * Get challenge difficulty level
 */
export function getChallengeDifficulty(
  currentProgress: number,
  targetProgress: number,
  timeRemainingDays: number
): 'easy' | 'medium' | 'hard' | 'impossible' {
  const progressPercentage = (currentProgress / targetProgress) * 100;
  const requiredPerDay = (targetProgress - currentProgress) / timeRemainingDays;

  if (currentProgress >= targetProgress) {
    return 'easy';
  }

  if (requiredPerDay === 0) {
    return 'easy';
  }

  if (requiredPerDay <= 0.5) {
    return 'easy';
  }

  if (requiredPerDay <= 1) {
    return 'medium';
  }

  if (requiredPerDay <= 2) {
    return 'hard';
  }

  return 'impossible';
}

/**
 * Get motivation message based on challenge progress
 */
export function getChallengeMotivationMessage(
  currentProgress: number,
  targetProgress: number,
  timeRemainingDays: number
): string {
  const percentage = Math.round((currentProgress / targetProgress) * 100);

  if (percentage >= 100) {
    return '🎉 Challenge completed! Great job!';
  }

  if (percentage >= 90) {
    return '🔥 So close! Finish strong!';
  }

  if (percentage >= 75) {
    return '💪 You\'re 3/4 of the way there!';
  }

  if (percentage >= 50) {
    return '🚀 Halfway there! Keep going!';
  }

  if (percentage >= 25) {
    return '⭐ Good start! Keep up the momentum!';
  }

  if (timeRemainingDays <= 2) {
    return '⏰ Only a few days left! Push hard!';
  }

  return '💡 You\'ve got this! One step at a time!';
}

/**
 * Check if user can complete challenge in remaining time
 */
export function canCompleteChallenge(
  currentProgress: number,
  targetProgress: number,
  timeRemainingDays: number,
  mealsPerDay: number = 1
): boolean {
  const remaining = targetProgress - currentProgress;
  const maxPossible = mealsPerDay * timeRemainingDays;
  return remaining <= maxPossible;
}

/**
 * Get estimated completion date
 */
export function getEstimatedCompletionDate(
  currentProgress: number,
  targetProgress: number,
  mealsPerDay: number = 1
): string | null {
  if (currentProgress >= targetProgress) {
    return null; // Already completed
  }

  const remaining = targetProgress - currentProgress;
  const daysNeeded = Math.ceil(remaining / mealsPerDay);

  const today = new Date(getTodayICT());
  const completionDate = new Date(today);
  completionDate.setDate(completionDate.getDate() + daysNeeded);

  return completionDate.toISOString().split('T')[0];
}

/**
 * Get all challenges for current week
 */
export function getWeekChallenges(): typeof WEEKLY_CHALLENGES {
  return WEEKLY_CHALLENGES;
}

/**
 * Format challenge display
 */
export function formatChallengeDisplay(
  challenge: UserWeeklyChallenge
): string {
  return `${challenge.challengeEmoji} ${challenge.challengeName} - ${challenge.progressPercentage}% complete`;
}

/**
 * Get challenges sorted by priority (closest to completion first)
 */
export function sortChallengesByPriority(
  challenges: UserWeeklyChallenge[]
): UserWeeklyChallenge[] {
  return [...challenges].sort((a, b) => {
    // Completed challenges first
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;

    // Then sort by how close to completion
    return b.progressPercentage - a.progressPercentage;
  });
}
