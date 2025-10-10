-- Add user_sessions table for storing ICP profiles and analysis state
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  website_url TEXT,
  icp JSONB,
  analysis_step TEXT DEFAULT 'input',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add userId to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'demo-user';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add userId to clusters table
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'demo-user';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_clusters_user_id ON clusters(user_id);

-- Create index on domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);

