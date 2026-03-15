'use client';

import React from 'react';
import { UserStreak } from '@/types/gamification';

interface StreakCardProps {
  streak: UserStreak;
  nextBadgeGoal?: {
    name: string;
    daysRequired: number;
  };
}

export function StreakCard({ streak, nextBadgeGoal }: StreakCardProps) {
  const fireEmojis = Math.min(
    Math.floor(streak.currentStreakDays / 5) + 1,
    3
  ).toString().split('').map(() => '🔥').join('');

  // Get daily breakdown for the week
  const getDailyBreakdown = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Placeholder - in real implementation, fetch actual daily data
    const daysComplete = [true, true, true, true, true, true, false];
    return days.map((day, idx) => ({
      day: day.charAt(0),
      complete: daysComplete[idx],
    }));
  };

  const dailyBreakdown = getDailyBreakdown();
  const completedThisWeek = dailyBreakdown.filter(d => d.complete).length;

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          🔥 YOUR CONSISTENCY STREAK
        </h3>
        <span className="text-sm font-medium text-gray-500">Keep it up!</span>
      </div>

      {/* Main Streak Display */}
      <div className="text-center py-8 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl mb-6">
        <div className="text-5xl font-bold text-amber-600 mb-2">
          {streak.currentStreakDays}
        </div>
        <div className="text-xl text-gray-700 mb-2">
          {streak.currentStreakDays === 1 ? 'Day' : 'Days'} {fireEmojis}
        </div>
        <p className="text-sm text-gray-600">Current Streak</p>
      </div>

      {/* Best Streak Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
            Best Streak
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {streak.bestStreakDays}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {streak.bestStreakEndedAt
              ? new Date(streak.bestStreakEndedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              : 'In progress'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
            Total Meals
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {streak.mealsOnCurrentStreak}
          </p>
          <p className="text-xs text-gray-500 mt-1">on streak</p>
        </div>
      </div>

      {/* Next Badge Goal */}
      {nextBadgeGoal && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-green-900 mb-1">
            🏆 {nextBadgeGoal.name}
          </p>
          <p className="text-sm text-green-700">
            Keep going! {nextBadgeGoal.daysRequired - streak.currentStreakDays}{' '}
            more days to unlock!
          </p>
        </div>
      )}

      {/* Weekly Breakdown */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
          This Week
        </p>
        <div className="flex items-center justify-between gap-1">
          {dailyBreakdown.map((day, idx) => (
            <div key={idx} className="flex-1 text-center">
              <div
                className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  day.complete
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {day.complete ? '✓' : '○'}
              </div>
              <p className="text-xs text-gray-600 mt-1 font-medium">
                {day.day}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3 text-center">
          {completedThisWeek}/7 meals delivered
        </p>
      </div>

      {/* Pause Warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-900">
          <strong>💡 Tip:</strong> Pausing your subscription will reset your
          streak. Stay consistent!
        </p>
      </div>
    </div>
  );
}
