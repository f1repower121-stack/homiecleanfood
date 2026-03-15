'use client';

import React, { useEffect, useState } from 'react';
import { StreakCard } from './StreakCard';
import { AchievementBadges } from './AchievementBadges';
import { LevelProgressCard } from './LevelProgressCard';
import { WeeklyChallengesCard } from './WeeklyChallengesCard';
import {
  GamificationSummary,
  UserStreak,
  UserBadge,
  UserLevel,
  UserWeeklyChallenge,
} from '@/types/gamification';

interface GamificationDashboardProps {
  userId: string;
  className?: string;
}

export function GamificationDashboard({
  userId,
  className = '',
}: GamificationDashboardProps) {
  const [gamificationData, setGamificationData] = useState<GamificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        const response = await fetch(`/api/gamification/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch gamification data');
        }
        const data = await response.json();
        setGamificationData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchGamificationData();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !gamificationData) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-900 font-semibold">Failed to load gamification data</p>
          <p className="text-red-700 text-sm mt-2">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  // Find next badge that user can work towards
  const nextBadgeGoal = gamificationData.badges.find(
    b => !b.isEarned && b.progressTarget > 0
  );

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Quick Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Streak"
          value={`${gamificationData.streak.currentStreakDays}d`}
          icon="🔥"
          highlight={gamificationData.streak.currentStreakDays > 0}
        />
        <StatCard
          label="Level"
          value={gamificationData.level.currentLevel}
          icon="⭐"
          highlight={true}
        />
        <StatCard
          label="Badges"
          value={`${gamificationData.earnedBadgesCount}/12`}
          icon="🏆"
          highlight={gamificationData.earnedBadgesCount >= 3}
        />
        <StatCard
          label="Points"
          value={gamificationData.totalPoints}
          icon="⚡"
          highlight={gamificationData.totalPoints > 0}
        />
      </div>

      {/* Main Components */}
      <StreakCard
        streak={gamificationData.streak}
        nextBadgeGoal={
          nextBadgeGoal
            ? {
                name: nextBadgeGoal.badgeName,
                daysRequired: nextBadgeGoal.progressTarget,
              }
            : undefined
        }
      />

      <WeeklyChallengesCard challenges={gamificationData.activeChallenges} />

      <LevelProgressCard userLevel={gamificationData.level} />

      <AchievementBadges userBadges={gamificationData.badges} showLocked={true} />

      {/* Footer Tip */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">💡 Pro Tips</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            ✓ Complete daily meals to grow your streak and earn consistency badges
          </li>
          <li>
            ✓ Work towards weekly challenges to earn bonus points and unlock badges
          </li>
          <li>
            ✓ Keep your streak alive - pausing will reset your progress
          </li>
          <li>
            ✓ Reach higher levels to unlock new features and exclusive rewards
          </li>
        </ul>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}

function StatCard({ label, value, icon, highlight = false }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        highlight
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
          : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${highlight ? 'text-green-700' : 'text-gray-600'}`}>
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
