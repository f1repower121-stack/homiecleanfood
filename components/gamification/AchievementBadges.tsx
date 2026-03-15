'use client';

import React, { useState } from 'react';
import { UserBadge, BadgeTier, AVAILABLE_BADGES } from '@/types/gamification';

interface AchievementBadgesProps {
  userBadges: UserBadge[];
  showLocked?: boolean;
  className?: string;
}

export function AchievementBadges({
  userBadges,
  showLocked = true,
  className = '',
}: AchievementBadgesProps) {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  // Get badge config for display
  const getBadgeConfig = (badgeKey: string) => {
    return AVAILABLE_BADGES.find(b => b.key === badgeKey);
  };

  // Separate earned and locked badges
  const earnedBadges = userBadges.filter(b => b.isEarned);
  const lockedBadges = userBadges.filter(b => !b.isEarned);

  // Group by tier
  const groupByTier = (badges: UserBadge[]): Record<BadgeTier, UserBadge[]> => {
    const grouped: Record<BadgeTier, UserBadge[]> = {
      bronze: [],
      silver: [],
      gold: [],
    };

    badges.forEach(badge => {
      grouped[badge.badgeTier]?.push(badge);
    });

    return grouped;
  };

  const earnedByTier = groupByTier(earnedBadges);

  return (
    <div className={`w-full ${className}`}>
      {/* Header with stats */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🏆 YOUR ACHIEVEMENTS
        </h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-600">Badges Earned</p>
            <p className="text-2xl font-bold text-gray-900">
              {earnedBadges.length}
            </p>
          </div>
          <div className="h-12 w-px bg-gray-200"></div>
          <div>
            <p className="text-sm text-gray-600">Total Badges</p>
            <p className="text-2xl font-bold text-gray-900">
              {userBadges.length}
            </p>
          </div>
          <div className="h-12 w-px bg-gray-200"></div>
          <div>
            <p className="text-sm text-gray-600">Progress</p>
            <p className="text-2xl font-bold text-amber-600">
              {Math.round((earnedBadges.length / userBadges.length) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tier sections */}
      <div className="space-y-8">
        {/* Bronze Tier */}
        <div>
          <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🥉</span>
            Bronze Tier
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userBadges
              .filter(b => b.badgeTier === 'bronze')
              .map(badge => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  config={getBadgeConfig(badge.badgeKey)}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
          </div>
        </div>

        {/* Silver Tier */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="text-2xl">🥈</span>
            Silver Tier
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userBadges
              .filter(b => b.badgeTier === 'silver')
              .map(badge => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  config={getBadgeConfig(badge.badgeKey)}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
          </div>
        </div>

        {/* Gold Tier */}
        <div>
          <h3 className="text-lg font-semibold text-yellow-700 mb-4 flex items-center gap-2">
            <span className="text-2xl">🥇</span>
            Gold Tier
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userBadges
              .filter(b => b.badgeTier === 'gold')
              .map(badge => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  config={getBadgeConfig(badge.badgeKey)}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          config={getBadgeConfig(selectedBadge.badgeKey)}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}

interface BadgeItemProps {
  badge: UserBadge;
  config?: any;
  onClick?: () => void;
}

function BadgeItem({ badge, config, onClick }: BadgeItemProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        badge.isEarned
          ? 'bg-white border-green-200 hover:border-green-400 hover:shadow-md'
          : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80'
      }`}
    >
      <div className="text-4xl mb-3 text-center">{badge.badgeEmoji}</div>
      <p className="text-sm font-semibold text-gray-900 line-clamp-2">
        {badge.badgeName}
      </p>
      {!badge.isEarned && badge.progressTarget > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${Math.min(
                  (badge.progressCurrent / badge.progressTarget) * 100,
                  100
                )}%`,
              }}
            ></div>
          </div>
          <p className="text-center">
            {badge.progressCurrent}/{badge.progressTarget}
          </p>
        </div>
      )}
      {badge.isEarned && badge.earnedAt && (
        <p className="text-xs text-green-600 mt-2 text-center">
          ✓ Earned{' '}
          {new Date(badge.earnedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      )}
    </button>
  );
}

interface BadgeDetailModalProps {
  badge: UserBadge;
  config?: any;
  onClose: () => void;
}

function BadgeDetailModal({ badge, config, onClose }: BadgeDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">{badge.badgeEmoji}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {badge.badgeName}
          </h2>
          <p className="text-sm font-medium text-amber-600 mb-4">
            {badge.badgeTier.toUpperCase()} TIER
          </p>

          <p className="text-gray-700 mb-6">{badge.description}</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Unlock Criteria</p>
            <p className="text-gray-900 font-semibold">
              {badge.unlockCriteria}
            </p>
          </div>

          {badge.isEarned ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-900 font-semibold">✓ Badge Earned!</p>
              <p className="text-sm text-green-700">
                {new Date(badge.earnedAt!).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900 font-semibold mb-2">In Progress</p>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(
                      (badge.progressCurrent / badge.progressTarget) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-blue-700">
                {badge.progressCurrent} / {badge.progressTarget}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
