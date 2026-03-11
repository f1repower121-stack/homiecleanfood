-- Homie Clean Food: Dashboard schema (Calorie Tracker, Goals, Exercise, Recommendations)
-- Run in Supabase SQL Editor

-- Drop existing tables if they have wrong schema (removes existing data in these tables)
DROP TABLE IF EXISTS calorie_logs CASCADE;
DROP TABLE IF EXISTS exercise_logs CASCADE;

-- 1. Add goal columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_calorie_goal integer DEFAULT 2000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_calorie_goal integer DEFAULT 14000;

-- 2. Calorie logs (daily summary: consumed + burned)
CREATE TABLE IF NOT EXISTS calorie_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL,
  calories_consumed integer DEFAULT 0,
  calories_burned integer DEFAULT 0,
  UNIQUE(user_id, log_date)
);
ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own calorie_logs" ON calorie_logs;
CREATE POLICY "Users manage own calorie_logs" ON calorie_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_date ON calorie_logs(user_id, log_date);

-- 3. Exercise logs
CREATE TABLE IF NOT EXISTS exercise_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL,
  activity_type text NOT NULL,
  duration_minutes integer NOT NULL,
  calories_burned integer,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own exercise_logs" ON exercise_logs;
CREATE POLICY "Users manage own exercise_logs" ON exercise_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON exercise_logs(user_id, log_date);

-- 4. User goals (optional - nutrition targets)
CREATE TABLE IF NOT EXISTS user_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  calorie_target integer DEFAULT 2000,
  protein_target integer DEFAULT 150,
  weekly_calorie_goal integer DEFAULT 14000,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_goals" ON user_goals;
CREATE POLICY "Users manage own user_goals" ON user_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
