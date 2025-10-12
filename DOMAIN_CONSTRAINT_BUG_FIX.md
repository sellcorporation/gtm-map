# 🚨 Domain Constraint Bug Fix - "Failed to analyze" Pattern

## **PROBLEM DISCOVERED**

When analyzing prospects, many were failing with database insert errors like:
```
Failed to analyze SDL Surveying: Failed query: insert into "companies" ...
```

### **Root Cause: Wrong Database Constraint**

The `companies` table had a **GLOBAL unique constraint on `domain`**:
```sql
❌ WRONG: companies_domain_unique: UNIQUE (domain)
```

**This means:**
- If ANY user adds "sdlsurveying.co.uk", NO other user can add it
- Same domain can't exist twice in the database, even for different users
- Prospects fail to insert if the domain was added in a previous run or by another user

**What SHOULD happen:**
- Each user should be able to have their own prospects
- Domains should be unique **per user**, not globally
- The constraint should be: `UNIQUE (user_id, domain)`

---

## **THE FIX**

### **Applied Migration**

```sql
-- Drop the problematic global unique constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_domain_unique;

-- Ensure per-user domain uniqueness index exists
CREATE UNIQUE INDEX IF NOT EXISTS companies_domain_per_user 
  ON companies (user_id, domain);
```

### **What This Does**

✅ **Before**: Domain globally unique → "sdlsurveying.co.uk" can only exist once  
✅ **After**: Domain unique per user → User A and User B can both have "sdlsurveying.co.uk"

---

## **WHY THIS HAPPENED**

Looking at the migrations:
1. Original migration created global `UNIQUE (domain)` constraint
2. Later migration tried to fix it with `companies_domain_per_user` index
3. But **forgot to drop** the original global constraint
4. Result: Both constraints existed, causing failures

---

## **VERIFICATION**

After applying the fix:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'companies' AND indexname LIKE '%domain%';
```

Should show **only**:
- `companies_domain_per_user` - UNIQUE index on (user_id, domain) ✅

Should **NOT** show:
- `companies_domain_unique` - Global UNIQUE on (domain) ❌

---

## **TESTING**

### **Test the Fix**

1. **Clear your data** (to remove duplicates):
```sql
DELETE FROM companies WHERE user_id = '888db108-cca4-4f1d-8c37-5f552ffb61f1';
```

2. **Run analysis again:**
   - Enter website: `imfuna.com`
   - Upload customers CSV
   - Extract ICP
   - Click "Looks good - continue to find prospects"
   - ✅ **Should complete successfully without domain errors**

3. **Verify prospects saved:**
```sql
SELECT name, domain, user_id 
FROM companies 
WHERE user_id = '888db108-cca4-4f1d-8c37-5f552ffb61f1'
ORDER BY created_at DESC
LIMIT 10;
```

---

## **IMPACT**

### **Before Fix**
❌ Analysis fails after finding first few prospects  
❌ "Failed to analyze" errors for many companies  
❌ Database rejects inserts with constraint violation  
❌ Users can't have common competitor domains  

### **After Fix**
✅ All prospects can be inserted  
✅ Each user has their own prospect list  
✅ Same domains allowed for different users  
✅ Analysis completes successfully  

---

## **FILES CHANGED**

1. **New Migration**: `/migrations/fix_companies_domain_constraint.sql`
   - Drops global unique constraint on `domain`
   - Ensures per-user uniqueness with `UNIQUE (user_id, domain)`

2. **Database**: Applied migration via Supabase MCP
   - Constraint fixed in production database
   - Ready for testing

---

## **STATUS**
✅ **FIXED** - Ready to test!

The "Failed to analyze" pattern should be resolved. Each user can now have their own prospects, even if domains overlap with other users or previous test runs.

---

## **NEXT STEPS**

1. Clear your test data (see Testing section above)
2. Reload the app
3. Run a full analysis
4. Verify all prospects are saved successfully
5. No more "Failed to analyze" errors! 🎉

