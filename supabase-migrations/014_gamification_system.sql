-- Gamification System Tables - Streaks, Badges, Levels, Challenges

-- 1. USER STREAKS (Track consistency and streaks)
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current streak
  current_streak_days INTEGER DEFAULT 0,
  last_meal_date DATE,

  -- Best streak record
  best_streak_days INTEGER DEFAULT 0,
  best_streak_ended_at TIMESTAMP WITH TIME ZONE,

  -- Streak started
  current_streak_started_at TIMESTAMP WITH TIME ZONE,

  -- Total meals on current streak
  meals_on_current_streak INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 2. USER BADGES (Track achievements)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Badge identifier
  badge_key VARCHAR(50) NOT NULL, -- first_step, week_warrior, month_master, etc
  badge_name VARCHAR(255) NOT NULL,
  badge_emoji VARCHAR(10),
  badge_tier VARCHAR(20), -- bronze, silver, gold

  -- Status
  is_earned BOOLEAN DEFAULT FALSE,
  earned_at TIMESTAMP WITH TIME ZONE,

  -- Progress (for in-progress badges)
  progress_current INTEGER DEFAULT 0,
  progress_target INTEGER DEFAULT 0,

  -- Description
  description TEXT,
  unlock_criteria TEXT, -- "Get 7-day streak", "Eat 20 vegetarian meals"

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, badge_key)
);

-- 3. USER LEVELS (Track progression)
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current level
  current_level INTEGER DEFAULT 1,
  level_name VARCHAR(50), -- Fresh Start, Committed, Dedicated, Master, Legend

  -- Progress to next level
  total_meals_consumed INTEGER DEFAULT 0,
  meals_to_next_level INTEGER,
  progress_percentage INTEGER DEFAULT 0,

  -- Rewards
  unlocked_features TEXT[] DEFAULT '{}',
  available_rewards TEXT[] DEFAULT '{}',
  claimed_rewards TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 4. USER WEEKLY CHALLENGES (Track current week's challenges)
CREATE TABLE IF NOT EXISTS user_weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Challenge identifier
  challenge_key VARCHAR(50) NOT NULL, -- consistency_king, protein_power, macros_match, referral_rockstar
  challenge_name VARCHAR(255) NOT NULL,
  challenge_emoji VARCHAR(10),

  -- Week tracking
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Progress
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  progress_percentage INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, failed
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Rewards
  reward_points INTEGER DEFAULT 0,
  reward_badge_unlocked VARCHAR(50),

  -- Description
  description TEXT,
  goal_description TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, challenge_key, week_start_date)
);

-- 5. USER CHALLENGE HISTORY (Track completed challenges for stats)
CREATE TABLE IF NOT EXISTS user_challenge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Challenge details
  challenge_key VARCHAR(50) NOT NULL,
  challenge_name VARCHAR(255) NOT NULL,

  -- Period
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_type VARCHAR(50), -- weekly, monthly, all_time

  -- Results
  final_progress INTEGER,
  reward_points INTEGER,
  badge_earned VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_last_meal ON user_streaks(last_meal_date);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON user_badges(user_id, is_earned);
CREATE INDEX IF NOT EXISTS idx_user_levels_user ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_weekly_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_week ON user_weekly_challenges(week_start_date);
CREATE INDEX IF NOT EXISTS idx_challenge_history_user ON user_challenge_history(user_id);

-- ROW LEVEL SECURITY
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users see their own data
CREATE POLICY "Users see own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users see own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users see own levels"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users see own challenges"
  ON user_weekly_challenges FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users see own challenge history"
  ON user_challenge_history FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- INSERT policies (system can insert/update)
CREATE POLICY "Users insert own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own badges"
  ON user_badges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own levels"
  ON user_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own levels"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own challenges"
  ON user_weekly_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own challenges"
  ON user_weekly_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own challenge history"
  ON user_challenge_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
