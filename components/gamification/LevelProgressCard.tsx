'use client';

import React from 'react';
import { UserLevel, LEVEL_CONFIG, LevelConfig } from '@/types/gamification';

interface LevelProgressCardProps {
  userLevel: UserLevel;
  className?: string;
}

export function LevelProgressCard({ userLevel, className = '' }: LevelProgressCardProps) {
  const currentLevelConfig = LEVEL_CONFIG.find(
    l => l.level === userLevel.currentLevel
  );
  const nextLevelConfig = LEVEL_CONFIG.find(
    l => l.level === userLevel.currentLevel + 1
  );

  const levelEmojis = ['🌱', '🎯', '⭐', '💎', '👑'];

  return (
    <div className={`w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        🏅 YOUR WELLNESS LEVEL
      </h3>

      {/* Current Level Display */}
      {currentLevelConfig && (
        <div className="mb-8">
          {/* Level Badge */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="text-6xl rounded-full w-24 h-24 flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: currentLevelConfig.color || '#10B981' }}
            >
              {levelEmojis[currentLevelConfig.level - 1]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Current Level
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {userLevel.currentLevel}
              </p>
              <p className="text-lg font-semibold text-gray-700">
                {userLevel.levelName}
              </p>
            </div>
          </div>

          {/* Meal Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                Total Meals
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {userLevel.totalMealsConsumed}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                To Next Level
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {userLevel.mealsToNextLevel}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${userLevel.progressPercentage}%`,
                  backgroundColor: currentLevelConfig.color || '#10B981',
                }}
              ></div>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-6">
            {userLevel.progressPercentage}% to {userLevel.levelName}
          </p>

          {/* Unlocked Features */}
          {userLevel.unlockedFeatures.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-green-900 mb-3">
                ✓ Unlocked Features
              </p>
              <ul className="space-y-2">
                {userLevel.unlockedFeatures.map((feature, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-green-700 flex items-center gap-2"
                  >
                    <span className="text-green-600">→</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Available Rewards */}
          {userLevel.availableRewards.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900 mb-3">
                🎁 Available Rewards
              </p>
              <ul className="space-y-2">
                {userLevel.availableRewards.map((reward, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-amber-700 flex items-center gap-2"
                  >
                    <span className="text-amber-600">★</span> {reward}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Next Level Preview */}
      {nextLevelConfig && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            Next Level Preview
          </h4>
          <div className="flex items-center gap-4">
            <div
              className="text-4xl rounded-full w-16 h-16 flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ backgroundColor: nextLevelConfig.color || '#3B82F6' }}
            >
              {levelEmojis[nextLevelConfig.level - 1]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">
                Level {nextLevelConfig.level}
              </p>
              <p className="font-semibold text-gray-900">
                {nextLevelConfig.name}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Requires {nextLevelConfig.minMeals}+ meals
              </p>
            </div>
          </div>

          {/* Next Level Features Preview */}
          {nextLevelConfig.unlockedFeatures.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                New Unlocks:
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                {nextLevelConfig.unlockedFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-blue-600">→</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* All Levels Visualization */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          Progression Path
        </h4>
        <div className="flex items-center justify-between">
          {LEVEL_CONFIG.map(level => (
            <div key={level.level} className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white transition-all ${
                  level.level <= userLevel.currentLevel
                    ? 'text-lg scale-100'
                    : 'text-sm scale-75 opacity-50'
                }`}
                style={{
                  backgroundColor:
                    level.level <= userLevel.currentLevel
                      ? level.color || '#10B981'
                      : '#D1D5DB',
                }}
              >
                {levelEmojis[level.level - 1]}
              </div>
              <p
                className={`text-xs font-medium mt-2 text-center ${
                  level.level <= userLevel.currentLevel
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {level.name.split(' ')[0]}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {level.minMeals}+
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
