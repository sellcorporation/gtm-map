# 🔐 Supabase Auth Migration Instructions

## ⚠️ **IMPORTANT: Run This Before Testing Auth**

The database schema has been updated, but you need to apply the SQL migration to your Supabase database.

---

## 📋 **Steps to Apply Migration**

### **1. Open Supabase SQL Editor**

1. Go to your Supabase project dashboard (via Vercel integration)
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### **2. Copy & Paste Migration SQL**

1. Open `/migrations/auth_migration.sql` in your project
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor

### **3. Execute the Migration**

1. Click **Run** (or press `Cmd/Ctrl + Enter`)
2. Wait for confirmation: **Success. No rows returned**

---

## ✅ **Verification**

After running the migration, verify it succeeded by running these queries:

### **Check Tables Exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'user_settings');
```
**Expected:** 2 rows (profiles, user_settings)

### **Check RLS is Enabled:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_settings', 'companies', 'clusters', 'ads');
```
**Expected:** All `rowsecurity = true`

### **Check Policies Exist:**
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected:** ~20 policies across all tables

### **Check Trigger Exists:**
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
  AND trigger_name = 'on_auth_user_created';
```
**Expected:** 1 row (on_auth_user_created → auth.users)

---

## 🚨 **If You Have Existing Data**

If you already have companies/clusters with `userId = 'demo-user'`:

### **Option A: Delete Demo Data**
```sql
DELETE FROM public.companies WHERE user_id = 'demo-user';
DELETE FROM public.clusters WHERE user_id = 'demo-user';
```

### **Option B: Migrate to First User (Run after signup)**
1. Sign up as your first user
2. Get your user ID:
   ```sql
   SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
   ```
3. Update existing data:
   ```sql
   UPDATE public.companies SET user_id = '<YOUR_USER_ID>';
   UPDATE public.clusters SET user_id = '<YOUR_USER_ID>';
   ```

---

## 📝 **What This Migration Does**

1. ✅ Creates `profiles` table (extends `auth.users`)
2. ✅ Creates `user_settings` table (user preferences)
3. ✅ Updates `userId` columns from `text` → `uuid`
4. ✅ Creates post-signup trigger (auto-creates profile + settings)
5. ✅ Implements Row Level Security (RLS) policies
6. ✅ Adds performance indexes

---

## 🎯 **Next Steps After Migration**

Once the migration succeeds:
1. ✅ Test signup flow (verify profile + settings are auto-created)
2. ✅ Test RLS (create two users, verify cross-user access is blocked)
3. ✅ Continue with Phase 2 implementation (auth pages)

---

## 🆘 **Troubleshooting**

### **Error: `column "user_id" cannot be cast automatically`**
- **Cause:** Existing data in `user_id` column
- **Fix:** Choose Option A or B above (delete or migrate data first)

### **Error: `relation "auth.users" does not exist`**
- **Cause:** Not running in Supabase (trying locally?)
- **Fix:** Run SQL in Supabase dashboard, not locally

### **Error: `permission denied for schema auth`**
- **Cause:** Wrong database user
- **Fix:** Run in Supabase SQL Editor (not via external client)

---

## ✅ **Migration Complete!**

Once all verification queries pass, you're ready to continue with Phase 2 (authentication pages).

**Let me know when the migration is complete and I'll continue building the auth flows!** 🚀

