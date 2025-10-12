-- Fix user_sessions table schema
-- Add missing userId column and customers column

-- Add user_id column (foreign key to auth.users)
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add customers column
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS customers JSONB;

-- Add last_active column
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Change analysis_step from TEXT to INTEGER
ALTER TABLE user_sessions 
ALTER COLUMN analysis_step TYPE INTEGER USING (
  CASE 
    WHEN analysis_step = 'input' THEN 0
    WHEN analysis_step = 'icp-review' THEN 1
    WHEN analysis_step = 'results' THEN 2
    ELSE 0
  END
);

-- Set default value for analysis_step
ALTER TABLE user_sessions 
ALTER COLUMN analysis_step SET DEFAULT 0;

-- Create unique index on user_id (one session per user)
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);

-- Update RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own session" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert their own session" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own session" ON user_sessions;

-- Create policies
CREATE POLICY "Users can view their own session"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

