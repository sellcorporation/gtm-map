-- ============================================================================
-- RLS Security Tests for Supabase Auth + GTM Map
-- Run these tests in Supabase SQL Editor to verify Row Level Security
-- ============================================================================
-- 
-- HOW TO RUN:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy/paste each test block
-- 3. Run and verify results
-- 4. All cross-user access attempts should return 0 rows or raise errors
--
-- ============================================================================

-- ============================================================================
-- SETUP: Create two test users
-- ============================================================================
-- NOTE: You'll need to create these users via the Supabase Auth UI or signup flow
-- User 1: alice@test.com (get UUID from auth.users after signup)
-- User 2: bob@test.com (get UUID from auth.users after signup)
--
-- For testing, we'll simulate their UUIDs:
-- ============================================================================

DO $$
DECLARE
  alice_id uuid;
  bob_id uuid;
BEGIN
  -- Get test user IDs (replace with actual test user IDs from auth.users)
  SELECT id INTO alice_id FROM auth.users WHERE email = 'alice@test.com' LIMIT 1;
  SELECT id INTO bob_id FROM auth.users WHERE email = 'bob@test.com' LIMIT 1;
  
  RAISE NOTICE 'Alice ID: %', alice_id;
  RAISE NOTICE 'Bob ID: %', bob_id;
  
  IF alice_id IS NULL OR bob_id IS NULL THEN
    RAISE EXCEPTION 'Test users not found. Create alice@test.com and bob@test.com first.';
  END IF;
END $$;


-- ============================================================================
-- TEST 1: Profiles Table - Users can only see their own profile
-- ============================================================================
-- Expected: Alice can see only her profile, Bob can see only his profile

-- Switch to Alice's context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "ALICE_UUID_HERE"}'; -- Replace with actual Alice UUID

-- Alice should see 1 row (her profile)
SELECT COUNT(*) as alice_profile_count FROM profiles;
-- Expected: 1

-- Alice should NOT see Bob's profile
SELECT COUNT(*) as bob_profile_via_alice FROM profiles WHERE id = 'BOB_UUID_HERE';
-- Expected: 0


-- ============================================================================
-- TEST 2: Companies Table - Users can only see their own companies
-- ============================================================================
-- Setup test data
INSERT INTO companies (user_id, name, domain, source, status)
VALUES 
  ('ALICE_UUID_HERE', 'Alice Company 1', 'alice-co-1.com', 'seed', 'New'),
  ('ALICE_UUID_HERE', 'Alice Company 2', 'alice-co-2.com', 'seed', 'New'),
  ('BOB_UUID_HERE', 'Bob Company 1', 'bob-co-1.com', 'seed', 'New')
ON CONFLICT (user_id, domain) DO NOTHING;

-- Switch to Alice's context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "ALICE_UUID_HERE"}';

-- Alice should see only her 2 companies
SELECT COUNT(*) as alice_company_count FROM companies WHERE user_id = 'ALICE_UUID_HERE';
-- Expected: 2

-- Alice should NOT see Bob's company
SELECT COUNT(*) as bob_companies_via_alice FROM companies WHERE user_id = 'BOB_UUID_HERE';
-- Expected: 0

-- Switch to Bob's context
SET LOCAL request.jwt.claims TO '{"sub": "BOB_UUID_HERE"}';

-- Bob should see only his 1 company
SELECT COUNT(*) as bob_company_count FROM companies WHERE user_id = 'BOB_UUID_HERE';
-- Expected: 1


-- ============================================================================
-- TEST 3: Clusters Table - Users can only see their own clusters
-- ============================================================================
-- Setup test data
INSERT INTO clusters (user_id, label, criteria, company_ids)
VALUES 
  ('ALICE_UUID_HERE', 'Alice Cluster 1', '{"avgIcpScore": 85}'::jsonb, ARRAY[1, 2]),
  ('BOB_UUID_HERE', 'Bob Cluster 1', '{"avgIcpScore": 90}'::jsonb, ARRAY[3])
ON CONFLICT DO NOTHING;

-- Switch to Alice's context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "ALICE_UUID_HERE"}';

-- Alice should see only her cluster
SELECT COUNT(*) as alice_cluster_count FROM clusters WHERE user_id = 'ALICE_UUID_HERE';
-- Expected: 1

-- Alice should NOT see Bob's cluster
SELECT COUNT(*) as bob_clusters_via_alice FROM clusters WHERE user_id = 'BOB_UUID_HERE';
-- Expected: 0


-- ============================================================================
-- TEST 4: Ads Table - Users can only see ads from their own clusters
-- ============================================================================
-- Note: Ads are accessed via cluster ownership, not direct user_id

-- Get Alice's cluster ID
DO $$
DECLARE
  alice_cluster_id int;
  bob_cluster_id int;
BEGIN
  SELECT id INTO alice_cluster_id FROM clusters WHERE user_id = 'ALICE_UUID_HERE' LIMIT 1;
  SELECT id INTO bob_cluster_id FROM clusters WHERE user_id = 'BOB_UUID_HERE' LIMIT 1;
  
  -- Insert test ads
  INSERT INTO ads (cluster_id, headline, body_text, cta_text)
  VALUES 
    (alice_cluster_id, 'Alice Ad 1', 'Alice body', 'Click here'),
    (bob_cluster_id, 'Bob Ad 1', 'Bob body', 'Click here')
  ON CONFLICT DO NOTHING;
END $$;

-- Switch to Alice's context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "ALICE_UUID_HERE"}';

-- Alice should see only ads from her clusters
SELECT COUNT(*) as alice_ads_count FROM ads a
JOIN clusters c ON a.cluster_id = c.id
WHERE c.user_id = 'ALICE_UUID_HERE';
-- Expected: 1

-- Alice should NOT see Bob's ads
SELECT COUNT(*) as bob_ads_via_alice FROM ads a
JOIN clusters c ON a.cluster_id = c.id
WHERE c.user_id = 'BOB_UUID_HERE';
-- Expected: 0 (should be blocked by RLS)


-- ============================================================================
-- TEST 5: INSERT/UPDATE/DELETE Protection
-- ============================================================================
-- Users should NOT be able to insert/update/delete other users' data

-- Switch to Alice's context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "ALICE_UUID_HERE"}';

-- Alice tries to insert a company for Bob (should fail)
DO $$
BEGIN
  INSERT INTO companies (user_id, name, domain, source, status)
  VALUES ('BOB_UUID_HERE', 'Malicious Company', 'hack.com', 'seed', 'New');
  
  RAISE EXCEPTION 'SECURITY BREACH: Alice was able to insert data for Bob!';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Alice cannot insert data for Bob';
  WHEN check_violation THEN
    RAISE NOTICE 'PASS: Alice cannot insert data for Bob (check constraint)';
END $$;

-- Alice tries to update Bob's company (should fail)
DO $$
BEGIN
  UPDATE companies SET name = 'Hacked Name' WHERE user_id = 'BOB_UUID_HERE';
  
  IF FOUND THEN
    RAISE EXCEPTION 'SECURITY BREACH: Alice was able to update Bob''s data!';
  ELSE
    RAISE NOTICE 'PASS: Alice cannot update Bob''s companies (no rows found)';
  END IF;
END $$;

-- Alice tries to delete Bob's company (should fail)
DO $$
BEGIN
  DELETE FROM companies WHERE user_id = 'BOB_UUID_HERE';
  
  IF FOUND THEN
    RAISE EXCEPTION 'SECURITY BREACH: Alice was able to delete Bob''s data!';
  ELSE
    RAISE NOTICE 'PASS: Alice cannot delete Bob''s companies (no rows found)';
  END IF;
END $$;


-- ============================================================================
-- TEST 6: Anonymous Access (should be denied)
-- ============================================================================
SET LOCAL role anon;

-- Anonymous users should see 0 companies
SELECT COUNT(*) as anon_companies FROM companies;
-- Expected: 0

-- Anonymous users should see 0 clusters
SELECT COUNT(*) as anon_clusters FROM clusters;
-- Expected: 0


-- ============================================================================
-- TEST 7: Profile Update Restrictions
-- ============================================================================
-- Users should be able to update their own profile but not others

-- Switch to Alice's context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "ALICE_UUID_HERE"}';

-- Alice updates her own profile (should succeed)
UPDATE profiles SET full_name = 'Alice Updated' WHERE id = 'ALICE_UUID_HERE';
-- Expected: 1 row updated

-- Alice tries to update Bob's profile (should fail)
DO $$
BEGIN
  UPDATE profiles SET full_name = 'Hacked Bob' WHERE id = 'BOB_UUID_HERE';
  
  IF FOUND THEN
    RAISE EXCEPTION 'SECURITY BREACH: Alice was able to update Bob''s profile!';
  ELSE
    RAISE NOTICE 'PASS: Alice cannot update Bob''s profile';
  END IF;
END $$;


-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================
-- Run this after tests to clean up

-- DELETE FROM ads WHERE headline LIKE '%Alice Ad%' OR headline LIKE '%Bob Ad%';
-- DELETE FROM clusters WHERE label LIKE '%Alice Cluster%' OR label LIKE '%Bob Cluster%';
-- DELETE FROM companies WHERE name LIKE '%Alice Company%' OR name LIKE '%Bob Company%' OR name = 'Malicious Company';


-- ============================================================================
-- MANUAL VERIFICATION CHECKLIST
-- ============================================================================
-- [ ] All SELECT tests return expected counts (0 for cross-user access)
-- [ ] All INSERT/UPDATE/DELETE attempts by Alice on Bob's data fail
-- [ ] Anonymous users see 0 rows
-- [ ] Users can update their own profiles
-- [ ] Users cannot update other users' profiles
-- [ ] No SECURITY BREACH exceptions raised
-- [ ] All PASS notices displayed

-- ============================================================================
-- ADDITIONAL SECURITY CHECKS
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('companies', 'clusters', 'ads', 'profiles', 'user_settings')
  AND schemaname = 'public';
-- Expected: All should have rowsecurity = true

-- List all RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: Should see policies for own_companies, own_clusters, own_ads, own_profile, etc.

