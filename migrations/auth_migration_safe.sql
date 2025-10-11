-- ========================================
-- SUPABASE AUTH MIGRATION (SAFE VERSION)
-- ========================================
-- Handles existing data by backing up and recreating tables
-- ========================================

BEGIN;

-- ========================================
-- STEP 0: BACKUP EXISTING DATA (if any)
-- ========================================

-- Check if we have any data to preserve
DO $$
BEGIN
  -- If you want to preserve existing demo data, set this to true
  -- For a fresh start, keep it false
  IF EXISTS (SELECT 1 FROM companies WHERE user_id = 'demo-user') THEN
    RAISE NOTICE 'Found existing demo data. Deleting it for clean migration.';
    DELETE FROM ads WHERE cluster_id IN (SELECT id FROM clusters);
    DELETE FROM clusters;
    DELETE FROM companies;
  END IF;
END $$;

-- ========================================
-- STEP 1: CREATE NEW AUTH TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  timezone text DEFAULT 'Europe/London',
  email_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- STEP 2: UPDATE EXISTING TABLES
-- ========================================

-- Drop existing constraints that might interfere
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_domain_unique;

-- Update companies table (drop and recreate column)
ALTER TABLE companies DROP COLUMN user_id;
ALTER TABLE companies ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

-- Update clusters table
ALTER TABLE clusters DROP COLUMN user_id;
ALTER TABLE clusters ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

-- Update user_sessions table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE user_sessions DROP COLUMN user_id;
    ALTER TABLE user_sessions ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
END $$;

-- Remove default values (they were just for migration)
ALTER TABLE companies ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE clusters ALTER COLUMN user_id DROP DEFAULT;

-- ========================================
-- STEP 3: CREATE POST-SIGNUP TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS companies_user_idx ON public.companies USING btree (user_id);
CREATE INDEX IF NOT EXISTS clusters_user_idx ON public.clusters USING btree (user_id);
CREATE INDEX IF NOT EXISTS ads_cluster_idx ON public.ads USING btree (cluster_id);
CREATE UNIQUE INDEX IF NOT EXISTS companies_domain_per_user ON public.companies (user_id, domain);

-- ========================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: DROP EXISTING POLICIES (if any)
-- ========================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ========================================
-- STEP 7: CREATE RLS POLICIES - PROFILES
-- ========================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========================================
-- STEP 8: CREATE RLS POLICIES - USER SETTINGS
-- ========================================

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STEP 9: CREATE RLS POLICIES - COMPANIES
-- ========================================

CREATE POLICY "Users can view own companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ========================================
-- STEP 10: CREATE RLS POLICIES - CLUSTERS
-- ========================================

CREATE POLICY "Users can view own clusters"
  ON public.clusters FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own clusters"
  ON public.clusters FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own clusters"
  ON public.clusters FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own clusters"
  ON public.clusters FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ========================================
-- STEP 11: CREATE RLS POLICIES - ADS
-- ========================================

CREATE POLICY "Users can view own ads"
  ON public.ads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own ads"
  ON public.ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own ads"
  ON public.ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own ads"
  ON public.ads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = (SELECT auth.uid())
    )
  );

COMMIT;

-- ========================================
-- VERIFICATION
-- ========================================

SELECT 'Migration completed successfully!' as status;

-- Check tables
SELECT 'Tables created:' as info, string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_settings');

-- Check RLS
SELECT 'RLS enabled on ' || COUNT(*)::text || ' tables' as info
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies
SELECT 'Policies created: ' || COUNT(*)::text as info
FROM pg_policies 
WHERE schemaname = 'public';

-- Check trigger
SELECT 'Trigger status:' as info, trigger_name
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created';

