-- ========================================
-- SUPABASE AUTH MIGRATION
-- ========================================
-- This migration adds Supabase Auth integration:
-- 1. Creates profiles and user_settings tables
-- 2. Updates userId columns from text to uuid
-- 3. Creates post-signup trigger
-- 4. Implements RLS policies
-- 5. Adds performance indexes
-- 
-- Execute this in Supabase SQL Editor
-- ========================================

-- ========================================
-- STEP 1: CREATE NEW AUTH TABLES
-- ========================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  timezone text DEFAULT 'Europe/London',
  email_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile data extending auth.users';
COMMENT ON TABLE public.user_settings IS 'Per-user application settings';

-- ========================================
-- STEP 2: UPDATE EXISTING TABLES (userId: text → uuid)
-- ========================================

-- Note: This assumes you have NO existing data with 'demo-user'
-- If you have data, you'll need to migrate it first

-- Update companies table
ALTER TABLE public.companies 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Update clusters table
ALTER TABLE public.clusters 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Update user_sessions table (if exists)
ALTER TABLE public.user_sessions 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- ========================================
-- STEP 3: CREATE POST-SIGNUP TRIGGER
-- ========================================

-- Trigger function to auto-create profile + settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create user settings with defaults
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates profile and settings when a new user signs up';

-- ========================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- ========================================

-- Indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS companies_user_idx ON public.companies USING btree (user_id);
CREATE INDEX IF NOT EXISTS clusters_user_idx ON public.clusters USING btree (user_id);
CREATE INDEX IF NOT EXISTS ads_cluster_idx ON public.ads USING btree (cluster_id);

-- Unique constraint: one domain per user
CREATE UNIQUE INDEX IF NOT EXISTS companies_domain_per_user ON public.companies (user_id, domain);

COMMENT ON INDEX companies_user_idx IS 'Performance index for RLS policies on companies';
COMMENT ON INDEX clusters_user_idx IS 'Performance index for RLS policies on clusters';

-- ========================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: CREATE RLS POLICIES - PROFILES
-- ========================================

-- Profiles: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========================================
-- STEP 7: CREATE RLS POLICIES - USER SETTINGS
-- ========================================

-- User Settings: Users can manage their own settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STEP 8: CREATE RLS POLICIES - COMPANIES
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
-- STEP 9: CREATE RLS POLICIES - CLUSTERS
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
-- STEP 10: CREATE RLS POLICIES - ADS (via cluster ownership)
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

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to verify the migration succeeded:

-- 1. Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('profiles', 'user_settings');

-- 2. Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('profiles', 'user_settings', 'companies', 'clusters', 'ads');

-- 3. Check policies exist
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- 4. Check trigger exists
-- SELECT trigger_name, event_object_table FROM information_schema.triggers 
-- WHERE trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Test signup flow - verify profile and settings are created
-- 2. Test RLS - create two users and verify cross-user access is blocked
-- 3. Update drizzle.config.ts to use SUPABASE_URL from Vercel
-- ========================================

