-- Fix companies domain constraint
-- Problem: Global UNIQUE(domain) prevents multiple users from having same companies
-- Solution: Allow same domain for different users, enforce uniqueness per user

-- Drop the problematic global unique constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_domain_unique;

-- Ensure per-user domain uniqueness index exists
CREATE UNIQUE INDEX IF NOT EXISTS companies_domain_per_user 
  ON companies (user_id, domain);

-- Verify the fix
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' 
  AND conrelid = 'companies'::regclass
  AND contype = 'u';  -- Only unique constraints

