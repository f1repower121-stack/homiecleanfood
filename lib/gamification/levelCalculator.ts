// Level Calculation Logic

import { UserLevel, LEVEL_CONFIG, LevelConfig } from '@/types/gamification';

/**
 * Calculate user level based on total meals consumed
 */
export function calculateLevel(totalMealsConsumed: number): {
  currentLevel: number;
  levelName: string;
  progressPercentage: number;
  mealsToNextLevel: number;
} {
  let currentLevel = 1;
  let currentLevelConfig: LevelConfig | undefined;

  // Find current level
  for (const config of LEVEL_CONFIG) {
    if (totalMealsConsumed >= config.minMeals && totalMealsConsumed <= config.maxMeals) {
      currentLevel = config.level;
      currentLevelConfig = config;
      break;
    }
  }

  // Get next level config
  const nextLevelConfig = LEVEL_CONFIG.find(c => c.level === currentLevel + 1);

  // Calculate progress percentage
  let progressPercentage = 0;
  let mealsToNextLevel = 0;

  if (nextLevelConfig) {
    const mealsSinceLastLevel = totalMealsConsumed - (currentLevelConfig?.minMeals || 0);
    const mealsForLevel = nextLevelConfig.minMeals - (currentLevelConfig?.minMeals || 0);
    progressPercentage = Math.round((mealsSinceLastLevel / mealsForLevel) * 100);
    mealsToNextLevel = nextLevelConfig.minMeals - totalMealsConsumed;
  } else {
    // Max level reached
    progressPercentage = 100;
    mealsToNextLevel = 0;
  }

  return {
    currentLevel,
    levelName: currentLevelConfig?.name || 'Fresh Start',
    progressPercentage: Math.min(Math.max(progressPercentage, 0), 100),
    mealsToNextLevel: Math.max(mealsToNextLevel, 0),
  };
}

/**
 * Get rewards for reaching a specific level
 */
export function getLevelRewards(level: number): {
  features: string[];
  rewards: string[];
} | null {
  const config = LEVEL_CONFIG.find(c => c.level === level);
  if (!config) return null;

  return {
    features: config.unlockedFeatures,
    rewards: config.availableRewards,
  };
}

/**
 * Get all unlocked features up to current level
 */
export function getUnlockedFeatures(currentLevel: number): string[] {
  const features: string[] = [];

  for (const config of LEVEL_CONFIG) {
    if (config.level <= currentLevel) {
      features.push(...config.unlockedFeatures);
    }
  }

  return [...new Set(features)]; // Remove duplicates
}

/**
 * Get level milestone information
 */
export function getLevelMilestones(): Array<{
  level: number;
  name: string;
  minMeals: number;
  emoji: string;
  color: string;
}> {
  const emojis = ['🌱', '🎯', '⭐', '💎', '👑'];

  return LEVEL_CONFIG.map((config, idx) => ({
    level: config.level,
    name: config.name,
    minMeals: config.minMeals,
    emoji: emojis[idx] || '⭐',
    color: config.color || '#10B981',
  }));
}

/**
 * Check if user reached a new level
 */
export function checkLevelUp(
  previousMeals: number,
  currentMeals: number
): {
  leveledUp: boolean;
  newLevel: number;
  previousLevel: number;
} {
  const prevLevel = calculateLevel(previousMeals).currentLevel;
  const currLevel = calculateLevel(currentMeals).currentLevel;

  return {
    leveledUp: currLevel > prevLevel,
    newLevel: currLevel,
    previousLevel: prevLevel,
  };
}

/**
 * Get level up celebration message
 */
export function getLevelUpMessage(newLevel: number): string {
  const messages: Record<number, string> = {
    1: '🌱 Welcome to HomieClean! Your journey starts here.',
    2: '🎯 You\'ve reached Committed level! Unlock priority support.',
    3: '⭐ Congratulations on Dedicated! Unlock custom meal swaps.',
    4: '💎 Master level unlocked! You\'re a true meal prep warrior.',
    5: '👑 Legend status achieved! You\'re the ultimate HomieClean champion!',
  };

  return messages[newLevel] || '🎉 Level up! Keep going!';
}

/**
 * Get next level information
 */
export function getNextLevelInfo(
  currentLevel: number
): LevelConfig | null {
  return LEVEL_CONFIG.find(c => c.level === currentLevel + 1) || null;
}

/**
 * Get progress towards next level
 */
export function getLevelProgress(
  currentLevel: number,
  totalMealsConsumed: number
): {
  current: number;
  target: number;
  percentage: number;
} | null {
  const currentConfig = LEVEL_CONFIG.find(c => c.level === currentLevel);
  const nextConfig = LEVEL_CONFIG.find(c => c.level === currentLevel + 1);

  if (!currentConfig || !nextConfig) return null;

  const mealsSinceCurrentLevel = totalMealsConsumed - currentConfig.minMeals;
  const mealsForNextLevel = nextConfig.minMeals - currentConfig.minMeals;

  return {
    current: mealsSinceCurrentLevel,
    target: mealsForNextLevel,
    percentage: Math.round((mealsSinceCurrentLevel / mealsForNextLevel) * 100),
  };
}

/**
 * Get meals remaining to reach target level
 */
export function getMealsToLevel(
  targetLevel: number,
  currentMealsConsumed: number
): number {
  const targetConfig = LEVEL_CONFIG.find(c => c.level === targetLevel);
  if (!targetConfig) return 0;

  const mealsNeeded = targetConfig.minMeals - currentMealsConsumed;
  return Math.max(mealsNeeded, 0);
}

/**
 * Format level display with emoji
 */
export function formatLevelDisplay(level: number): string {
  const emojis = ['', '🌱', '🎯', '⭐', '💎', '👑'];
  const config = LEVEL_CONFIG.find(c => c.level === level);

  if (!config) return `Level ${level}`;

  return `${emojis[level] || '⭐'} Level ${level}: ${config.name}`;
}

/**
 * Get level requirements as human-readable text
 */
export function getLevelDescription(level: number): string | null {
  const config = LEVEL_CONFIG.find(c => c.level === level);
  if (!config) return null;

  const desc = [
    `Requires ${config.minMeals}+ meals`,
    `Unlocks: ${config.unlockedFeatures.join(', ')}`,
    `Rewards: ${config.availableRewards.join(', ')}`,
  ].join('\n');

  return desc;
}
