// GET /api/gamification/[userId]
// Fetch gamification data for a user

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { GamificationSummary } from '@/types/gamification';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const userId = params.userId;

    // Verify user is requesting their own data
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch streak data
    const { data: streakData, error: streakError } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      throw streakError;
    }

    // Fetch badge data
    const { data: badgeData, error: badgeError } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('is_earned', { ascending: false })
      .order('badge_tier', { ascending: true });

    if (badgeError && badgeError.code !== 'PGRST116') {
      throw badgeError;
    }

    // Fetch level data
    const { data: levelData, error: levelError } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (levelError && levelError.code !== 'PGRST116') {
      throw levelError;
    }

    // Fetch weekly challenges
    const { data: challengeData, error: challengeError } = await supabase
      .from('user_weekly_challenges')
      .select('*')
      .eq('user_id', userId)
      .order('status', { ascending: true })
      .order('progress_percentage', { ascending: false });

    if (challengeError && challengeError.code !== 'PGRST116') {
      throw challengeError;
    }

    // Build response with snake_case to camelCase conversion
    const gamificationSummary: GamificationSummary = {
      streak: streakData || {
        id: '',
        userId,
        currentStreakDays: 0,
        lastMealDate: null,
        bestStreakDays: 0,
        bestStreakEndedAt: null,
        currentStreakStartedAt: null,
        mealsOnCurrentStreak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      level: levelData || {
        id: '',
        userId,
        currentLevel: 1,
        levelName: 'Fresh Start',
        totalMealsConsumed: 0,
        mealsToNextLevel: 15,
        progressPercentage: 0,
        unlockedFeatures: [],
        availableRewards: [],
        claimedRewards: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      badges: badgeData || [],
      weeklyEarnedBadges: badgeData?.filter((b: any) => b.is_earned && b.earned_at).length || 0,
      totalPoints: badgeData?.reduce((sum: number, b: any) => {
        // Calculate points based on earned badges (placeholder)
        return sum + (b.is_earned ? 10 : 0);
      }, 0) || 0,
      earnedBadgesCount: badgeData?.filter((b: any) => b.is_earned).length || 0,
      nextBadgeProgress: badgeData?.find((b: any) => !b.is_earned && b.progress_target > 0)
        ?.progress_current || 0,
      weeklyRewards: challengeData?.reduce((sum: number, c: any) => {
        return sum + (c.status === 'completed' ? c.reward_points : 0);
      }, 0) || 0,
      activeChallenges: challengeData || [],
    };

    return NextResponse.json(gamificationSummary);
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gamification data' },
      { status: 500 }
    );
  }
}
