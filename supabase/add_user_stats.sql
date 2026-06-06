-- Run in Supabase SQL Editor
-- Stores per-user XP, level, and avatar for the gamification system

CREATE TABLE IF NOT EXISTS user_stats (
  user_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp      integer     NOT NULL DEFAULT 0,
  current_level integer     NOT NULL DEFAULT 1,
  avatar        text        NOT NULL DEFAULT '🚀',
  updated_at    timestamptz          DEFAULT now()
);

-- Allow each user to read and write only their own row
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);
