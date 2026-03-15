// Gamification System Types

// Badge Configuration
export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeConfig {
  key: string;
  name: string;
  emoji: string;
  tier: BadgeTier;
  description: string;
  unlockCriteria: string;
  icon?: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeKey: string;
  badgeName: string;
  badgeEmoji: string;
  badgeTier: BadgeTier;
  isEarned: boolean;
  earnedAt: string | null;
  progressCurrent: number;
  progressTarget: number;
  description: string;
  unlockCriteria: string;
  createdAt: string;
  updatedAt: string;
}

// Streak Types
export interface UserStreak {
  id: string;
  userId: string;
  currentStreakDays: number;
  lastMealDate: string | null;
  bestStreakDays: number;
  bestStreakEndedAt: string | null;
  currentStreakStartedAt: string | null;
  mealsOnCurrentStreak: number;
  createdAt: string;
  updatedAt: string;
}

// Level Configuration
export type LevelName = 'Fresh Start' | 'Committed' | 'Dedicated' | 'Master' | 'Legend';

export interface LevelConfig {
  level: number;
  name: LevelName;
  minMeals: number;
  maxMeals: number;
  unlockedFeatures: string[];
  availableRewards: string[];
  icon?: string;
  color?: string;
}

export interface UserLevel {
  id: string;
  userId: string;
  currentLevel: number;
  levelName: LevelName;
  totalMealsConsumed: number;
  mealsToNextLevel: number;
  progressPercentage: number;
  unlockedFeatures: string[];
  availableRewards: string[];
  claimedRewards: string[];
  createdAt: string;
  updatedAt: string;
}

// Challenge Types
export type ChallengeKey =
  | 'consistency_king'
  | 'protein_power'
  | 'macros_match'
  | 'referral_rockstar';

export interface ChallengeConfig {
  key: ChallengeKey;
  name: string;
  emoji: string;
  description: string;
  goalDescription: string;
  targetProgress: number;
  rewardPoints: number;
  rewardBadge?: string;
  calculateProgress: (userData: any) => number;
  icon?: string;
}

export interface UserWeeklyChallenge {
  id: string;
  userId: string;
  challengeKey: ChallengeKey;
  challengeName: string;
  challengeEmoji: string;
  weekStartDate: string;
  weekEndDate: string;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  status: 'in_progress' | 'completed' | 'failed';
  completedAt: string | null;
  rewardPoints: number;
  rewardBadgeUnlocked: string | null;
  description: string;
  goalDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserChallengeHistory {
  id: string;
  userId: string;
  challengeKey: ChallengeKey;
  challengeName: string;
  completedAt: string;
  periodType: 'weekly' | 'monthly' | 'all_time';
  finalProgress: number;
  rewardPoints: number;
  badgeEarned: string | null;
  createdAt: string;
}

// Gamification Summary (for dashboard display)
export interface GamificationSummary {
  streak: UserStreak;
  level: UserLevel;
  badges: UserBadge[];
  weeklyEarnedBadges: number;
  totalPoints: number;
  earnedBadgesCount: number;
  nextBadgeProgress: number;
  weeklyRewards: number;
  activeChallenges: UserWeeklyChallenge[];
}

// Daily Meal Tracking (for streak calculation)
export interface DailyMealTracking {
  userId: string;
  date: string;
  mealsDelivered: number;
  mealsConsumed: number;
  streakContinued: boolean;
}

// Badge List - All Available Badges
export const AVAILABLE_BADGES: BadgeConfig[] = [
  // Bronze Tier
  {
    key: 'first_step',
    name: 'First Step',
    emoji: '🌱',
    tier: 'bronze',
    description: 'Completed your first meal',
    unlockCriteria: 'Eat 1 meal',
    icon: 'plant',
  },
  {
    key: 'week_warrior',
    name: 'Week Warrior',
    emoji: '🏃',
    tier: 'bronze',
    description: 'Maintained a 7-day streak',
    unlockCriteria: '7-day streak',
    icon: 'zap',
  },
  {
    key: 'month_master',
    name: 'Month Master',
    emoji: '💪',
    tier: 'bronze',
    description: 'Maintained a 30-day streak',
    unlockCriteria: '30-day streak',
    icon: 'award',
  },
  {
    key: 'consistency_champion',
    name: 'Consistency Champion',
    emoji: '🎯',
    tier: 'bronze',
    description: 'Maintained a 45+ day streak',
    unlockCriteria: '45+ day streak',
    icon: 'trophy',
  },
  // Silver Tier
  {
    key: 'veggie_lover',
    name: 'Veggie Lover',
    emoji: '🥗',
    tier: 'silver',
    description: 'Ate 20 vegetarian meals',
    unlockCriteria: '20 vegetarian meals',
    icon: 'leaf',
  },
  {
    key: 'protein_pro',
    name: 'Protein Pro',
    emoji: '🍗',
    tier: 'silver',
    description: 'Maintained 80g+ protein average',
    unlockCriteria: '80g+ protein average',
    icon: 'muscle',
  },
  {
    key: 'data_driven',
    name: 'Data Driven',
    emoji: '📊',
    tier: 'silver',
    description: 'Completed 100+ meals',
    unlockCriteria: '100+ meals consumed',
    icon: 'bar-chart',
  },
  {
    key: 'savvy_saver',
    name: 'Savvy Saver',
    emoji: '💰',
    tier: 'silver',
    description: 'Saved ฿5,000+',
    unlockCriteria: 'Save ฿5,000+',
    icon: 'coins',
  },
  // Gold Tier
  {
    key: 'elite_subscriber',
    name: 'Elite Subscriber',
    emoji: '🏅',
    tier: 'gold',
    description: 'Subscribed to 2+ programs',
    unlockCriteria: '2+ active programs',
    icon: 'crown',
  },
  {
    key: 'perfect_month',
    name: 'Perfect Month',
    emoji: '🌟',
    tier: 'gold',
    description: 'No skipped meals in a month',
    unlockCriteria: 'Perfect month (0 skips)',
    icon: 'sparkles',
  },
  {
    key: 'nutrition_master',
    name: 'Nutrition Master',
    emoji: '🎓',
    tier: 'gold',
    description: 'Hit all macro goals',
    unlockCriteria: 'All macros on target',
    icon: 'book',
  },
  {
    key: 'legend_status',
    name: 'Legend Status',
    emoji: '👑',
    tier: 'gold',
    description: 'Completed 200+ meals',
    unlockCriteria: '200+ meals',
    icon: 'star',
  },
];

// Level Configuration
export const LEVEL_CONFIG: LevelConfig[] = [
  {
    level: 1,
    name: 'Fresh Start',
    minMeals: 0,
    maxMeals: 15,
    unlockedFeatures: ['Meal tracking', 'Basic stats'],
    availableRewards: ['First badge'],
    color: '#F59E0B',
  },
  {
    level: 2,
    name: 'Committed',
    minMeals: 16,
    maxMeals: 50,
    unlockedFeatures: ['Priority support', 'Meal history'],
    availableRewards: ['5% discount'],
    color: '#10B981',
  },
  {
    level: 3,
    name: 'Dedicated',
    minMeals: 51,
    maxMeals: 100,
    unlockedFeatures: ['Custom meal swaps', 'Advanced analytics'],
    availableRewards: ['Free consultation'],
    color: '#3B82F6',
  },
  {
    level: 4,
    name: 'Master',
    minMeals: 101,
    maxMeals: 200,
    unlockedFeatures: ['VIP support', 'Early access to new meals'],
    availableRewards: ['฿500 credit'],
    color: '#8B5CF6',
  },
  {
    level: 5,
    name: 'Legend',
    minMeals: 201,
    maxMeals: Infinity,
    unlockedFeatures: ['Everything', 'Beta features', 'Lifetime elite status'],
    availableRewards: ['Lifetime premium'],
    color: '#DC2626',
  },
];

// Weekly Challenges Configuration
export const WEEKLY_CHALLENGES: ChallengeConfig[] = [
  {
    key: 'consistency_king',
    name: 'Consistency King',
    emoji: '👑',
    description: 'Get all your meals this week',
    goalDescription: 'Deliver: Get all 7 meals this week',
    targetProgress: 7,
    rewardPoints: 50,
    rewardBadge: 'week_warrior',
    calculateProgress: (userData: any) => {
      // Calculate based on delivered meals this week
      return userData.mealsThisWeek || 0;
    },
    icon: 'heart',
  },
  {
    key: 'protein_power',
    name: 'Protein Power',
    emoji: '💪',
    description: 'Average 25g+ protein per meal',
    goalDescription: 'Goal: Average 25g+ protein per meal',
    targetProgress: 100,
    rewardPoints: 30,
    rewardBadge: 'protein_pro',
    calculateProgress: (userData: any) => {
      // Calculate protein average progress as percentage
      const avgProtein = userData.avgProteinThisWeek || 0;
      return Math.min((avgProtein / 25) * 100, 100);
    },
    icon: 'zap',
  },
  {
    key: 'macros_match',
    name: 'Macros Match',
    emoji: '🎯',
    description: 'Hit carb target within 5%',
    goalDescription: 'Goal: Hit carb target within 5%',
    targetProgress: 95,
    rewardPoints: 40,
    rewardBadge: 'data_driven',
    calculateProgress: (userData: any) => {
      // Calculate macro accuracy
      return userData.macroAccuracyThisWeek || 0;
    },
    icon: 'target',
  },
  {
    key: 'referral_rockstar',
    name: 'Referral Rockstar',
    emoji: '🌟',
    description: 'Refer 1 friend this week',
    goalDescription: 'Goal: Refer 1 friend this week',
    targetProgress: 1,
    rewardPoints: 100,
    rewardBadge: 'elite_subscriber',
    calculateProgress: (userData: any) => {
      // Count successful referrals
      return userData.referralsThisWeek || 0;
    },
    icon: 'share',
  },
];

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  score: number;
  metric: 'streak' | 'points' | 'level' | 'meals';
  location?: string;
  badges: number;
}

export interface Leaderboard {
  metric: 'streak' | 'points' | 'level' | 'meals';
  period: 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
}
