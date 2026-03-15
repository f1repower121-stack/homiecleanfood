// Gamification Library Export

export * from './streakCalculator';
export * from './levelCalculator';
export * from './challengeCalculator';

// Re-export types
export type {
  UserStreak,
  UserBadge,
  UserLevel,
  UserWeeklyChallenge,
  GamificationSummary,
} from '@/types/gamification';

export {
  AVAILABLE_BADGES,
  LEVEL_CONFIG,
  WEEKLY_CHALLENGES,
} from '@/types/gamification';
