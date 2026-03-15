'use client';

import React, { useState } from 'react';
import { UserWeeklyChallenge } from '@/types/gamification';

interface WeeklyChallengesCardProps {
  challenges: UserWeeklyChallenge[];
  className?: string;
  onChallengeClick?: (challenge: UserWeeklyChallenge) => void;
}

export function WeeklyChallengesCard({
  challenges,
  className = '',
  onChallengeClick,
}: WeeklyChallengesCardProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<UserWeeklyChallenge | null>(null);

  // Sort challenges: completed first, then in progress
  const sortedChallenges = [...challenges].sort((a, b) => {
    const statusOrder = { completed: 0, in_progress: 1, failed: 2 };
    return (statusOrder[a.status as keyof typeof statusOrder] ?? 3) -
           (statusOrder[b.status as keyof typeof statusOrder] ?? 3);
  });

  const completedCount = challenges.filter(c => c.status === 'completed').length;
  const totalPoints = challenges
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + c.rewardPoints, 0);

  const handleChallengeClick = (challenge: UserWeeklyChallenge) => {
    setSelectedChallenge(challenge);
    onChallengeClick?.(challenge);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header with stats */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎯 THIS WEEK'S CHALLENGES
        </h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900">
              {completedCount}/{challenges.length}
            </p>
          </div>
          <div className="h-12 w-px bg-gray-200"></div>
          <div>
            <p className="text-sm text-gray-600">Points Earned</p>
            <p className="text-2xl font-bold text-amber-600">+{totalPoints}</p>
          </div>
        </div>
      </div>

      {/* Challenge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedChallenges.map(challenge => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onClick={() => handleChallengeClick(challenge)}
          />
        ))}
      </div>

      {/* Challenge Details Modal */}
      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
        />
      )}

      {/* Weekly Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">
          ℹ️ Weekly Reset
        </p>
        <p className="text-sm text-blue-700">
          Challenges reset every Monday. Complete all challenges to unlock bonus
          rewards and climb the leaderboard!
        </p>
      </div>
    </div>
  );
}

interface ChallengeCardProps {
  challenge: UserWeeklyChallenge;
  onClick?: () => void;
}

function ChallengeCard({ challenge, onClick }: ChallengeCardProps) {
  const statusColor = {
    completed: 'bg-green-50 border-green-200',
    in_progress: 'bg-white border-gray-100',
    failed: 'bg-gray-50 border-gray-200',
  };

  const statusText = {
    completed: '✓ Completed',
    in_progress: 'In Progress',
    failed: 'Failed',
  };

  const statusTextColor = {
    completed: 'text-green-700',
    in_progress: 'text-blue-700',
    failed: 'text-gray-700',
  };

  const progressBarColor = {
    completed: 'bg-green-500',
    in_progress: 'bg-blue-500',
    failed: 'bg-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border transition-all hover:shadow-md ${
        statusColor[challenge.status]
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{challenge.challengeEmoji}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 leading-tight">
              {challenge.challengeName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {challenge.goalDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progressBarColor[challenge.status]
            }`}
            style={{ width: `${Math.min(challenge.progressPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Progress Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${statusTextColor[challenge.status]}`}>
            {statusText[challenge.status]}
          </span>
          <span className="text-sm text-gray-600">
            {challenge.progressPercentage}%
          </span>
        </div>
        <div className="text-right">
          {challenge.status === 'completed' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-700">
                +{challenge.rewardPoints} pts
              </span>
              {challenge.rewardBadgeUnlocked && (
                <span className="text-lg">🏆</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {challenge.currentProgress}/{challenge.targetProgress}
            </p>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {challenge.status === 'completed' && (
        <div className="mt-4 pt-4 border-t border-green-200">
          <p className="text-xs font-semibold text-green-700">
            ✓ Challenge Completed!
          </p>
        </div>
      )}

      {challenge.status === 'in_progress' && challenge.progressPercentage >= 90 && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs font-semibold text-blue-700">
            🔥 Close! Keep going
          </p>
        </div>
      )}
    </button>
  );
}

interface ChallengeDetailModalProps {
  challenge: UserWeeklyChallenge;
  onClose: () => void;
}

function ChallengeDetailModal({ challenge, onClose }: ChallengeDetailModalProps) {
  const statusColor = {
    completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
    in_progress: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
    failed: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900' },
  };

  const color = statusColor[challenge.status];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{challenge.challengeEmoji}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {challenge.challengeName}
          </h2>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-gray-700">{challenge.description}</p>
        </div>

        {/* Goal */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Goal</p>
          <p className="text-gray-900">{challenge.goalDescription}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Progress</p>
            <p className="text-sm font-bold text-gray-900">
              {challenge.currentProgress}/{challenge.targetProgress}
            </p>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${Math.min(challenge.progressPercentage, 100)}%`,
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {challenge.progressPercentage}% complete
          </p>
        </div>

        {/* Rewards */}
        <div className={`rounded-lg p-4 mb-6 ${color.bg} border ${color.border}`}>
          <p className={`font-semibold ${color.text} mb-2`}>Rewards</p>
          <div className="space-y-1">
            <p className={`text-sm ${color.text}`}>
              ⭐ {challenge.rewardPoints} Challenge Points
            </p>
            {challenge.rewardBadgeUnlocked && (
              <p className={`text-sm ${color.text}`}>
                🏆 Badge: {challenge.rewardBadgeUnlocked}
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        {challenge.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-900 font-semibold text-center">
              ✓ Challenge Completed!
            </p>
            <p className="text-sm text-green-700 text-center mt-2">
              {new Date(challenge.completedAt!).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
