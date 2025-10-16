# 🚨 localStorage Audit & Fix Plan

## **PROBLEM SUMMARY**
The app is currently **DUAL-STORING** data:
- ✅ Writes to database (companies, clusters, ads, user_sessions)
- ❌ **ALSO** writes to localStorage as "source of truth"
- ❌ On refresh, loads from localStorage (not database!)
- ❌ Result: Database has data, but UI doesn't show it

---

## **CURRENT STATE: What's Stored Where**

### **❌ WRONGLY IN localStorage (Should be in DB)**

| localStorage Key | Data | Should Be In Table | Status |
|-----------------|------|-------------------|--------|
| `gtm-data` | `{ prospects, clusters, ads }` | `companies`, `clusters`, `ads` | **CRITICAL BUG** |
| `gtm-icp` | ICP profile | `user_sessions.icp` | **BUG** |
| `gtm-customers` | Customer list | `companies` (source='seed') | **BUG** |
| `gtm-website-url` | Website URL | `user_sessions.website_url` | **BUG** |
| `gtm-analysis-step` | Current analysis step | `user_sessions.analysis_step` | **BUG** |

### **✅ CORRECTLY IN localStorage (UI Preferences Only)**

| localStorage Key | Data | Reason | Keep? |
|-----------------|------|--------|-------|
| `gtm-batch-size` | AI generation batch size (default: 10) | UI preference | ✅ YES |
| `gtm-max-total-prospects` | Max prospects (default: 100) | UI preference | ✅ YES |
| `gtm-min-icp-score` | ICP score filter (default: 50) | UI filter state | ✅ YES |

---

## **ROOT CAUSE ANALYSIS**

### **1. Initial Analysis Flow (`/api/analyse`)**
```typescript
// Line 206-208: POST /api/session 404
// The /api/session route DOES NOT EXIST!
// But code tries to save: fetch('/api/session', { method: 'POST', ... })
```
**Result:** ICP never saved to database, falls back to localStorage

### **2. Manual Prospect Addition (`ProspectsTab.tsx`)**
```typescript
// Lines 824-830: After successful API call, updates localStorage
const savedData = localStorage.getItem('gtm-data');
parsed.prospects = [...parsed.prospects, newProspect];
localStorage.setItem('gtm-data', JSON.stringify(parsed));
```
**Result:** Prospect saved to DB, but also written to localStorage (why?!)

### **3. Page Load (`page.tsx`)**
```typescript
// Line 127: Loads from localStorage, NOT database
const savedData = localStorage.getItem('gtm-data');
```
**Result:** UI shows localStorage data (stale), not database (fresh)

### **4. Competitors Generation (`ProspectsTab.tsx`)**
```typescript
// Lines 717-721: After API call, updates localStorage
const savedData = localStorage.getItem('gtm-data');
parsed.prospects = [...parsed.prospects, ...newCompetitors];
localStorage.setItem('gtm-data', JSON.stringify(parsed));
```
**Result:** Competitors saved to DB, duplicated in localStorage

---

## **THE FIX: 3-Phase Migration**

### **Phase 1: Create Missing API Route**
**File:** `src/app/api/session/route.ts` (MISSING!)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { db, userSessions } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { websiteUrl, icp, analysisStep } = await request.json();

  // Upsert user session
  const existingSession = await db.query.userSessions.findFirst({
    where: eq(userSessions.userId, user.id),
  });

  if (existingSession) {
    await db
      .update(userSessions)
      .set({ websiteUrl, icp, analysisStep, updatedAt: new Date() })
      .where(eq(userSessions.userId, user.id));
  } else {
    await db.insert(userSessions).values({
      userId: user.id,
      websiteUrl,
      icp,
      analysisStep,
    });
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await db.query.userSessions.findFirst({
    where: eq(userSessions.userId, user.id),
  });

  return NextResponse.json({ session });
}
```

---

### **Phase 2: Remove localStorage Writes (Frontend)**

#### **2a. `src/app/page.tsx`**
**REMOVE:**
```typescript
// Line 326-330
localStorage.setItem('gtm-data', JSON.stringify({
  prospects: finalResult.prospects,
  clusters: finalResult.clusters,
  ads: finalResult.ads,
}));

// Line 169
const savedCustomers = localStorage.getItem('gtm-customers');

// Line 221
localStorage.setItem('gtm-customers', JSON.stringify(customerList));

// Line 358
localStorage.setItem('gtm-analysis-step', 'input');

// Line 430, 454, 513, 549, 558, 565
// All localStorage.setItem('gtm-data', ...) calls
```

**REPLACE WITH:**
```typescript
// Load from database (already exists at /api/prospects)
const loadData = async () => {
  const [prospectsRes, sessionRes] = await Promise.all([
    fetch('/api/prospects'),
    fetch('/api/session'),
  ]);
  
  const { prospects } = await prospectsRes.json();
  const { session } = await sessionRes.json();
  
  setProspects(prospects || []);
  if (session?.icp) setIcp(session.icp);
  if (session?.analysisStep) setAnalysisStep(session.analysisStep);
};
```

#### **2b. `src/components/ProspectsTab.tsx`**
**REMOVE:**
```typescript
// Lines 824-830
const savedData = localStorage.getItem('gtm-data');
if (savedData) {
  const parsed = JSON.parse(savedData);
  parsed.prospects = [...(parsed.prospects || []), newProspect];
  localStorage.setItem('gtm-data', JSON.stringify(parsed));
}

// Lines 717-721
const savedData = localStorage.getItem('gtm-data');
if (savedData) {
  const parsed = JSON.parse(savedData);
  parsed.prospects = [...(parsed.prospects || []), ...newCompetitors];
  localStorage.setItem('gtm-data', JSON.stringify(parsed));
}
```

**REPLACE WITH:**
```typescript
// Just call onProspectUpdate - parent will re-fetch from database
onProspectUpdate(newProspect);
```

---

### **Phase 3: Database as Source of Truth**

#### **3a. Page Load Strategy**
```typescript
// On mount:
useEffect(() => {
  loadFromDatabase(); // Fetch from /api/prospects, /api/session
}, []);

// NOT:
useEffect(() => {
  const savedData = localStorage.getItem('gtm-data'); // ❌ BAD
}, []);
```

#### **3b. Data Mutation Strategy**
```typescript
// After any mutation:
1. Call API (e.g., POST /api/company)
2. Re-fetch from database (GET /api/prospects)
3. Update React state

// NOT:
1. Call API
2. Also update localStorage ❌
```

---

## **IMPLEMENTATION CHECKLIST**

### **Step 1: Create Missing Route**
- [ ] Create `src/app/api/session/route.ts`
- [ ] Add POST endpoint (upsert user_sessions)
- [ ] Add GET endpoint (fetch user_sessions)
- [ ] Test: `curl -X POST /api/session -d '{"websiteUrl":"...","icp":{...}}'`

### **Step 2: Fix Page.tsx**
- [ ] Remove all `localStorage.setItem('gtm-data', ...)` calls
- [ ] Remove all `localStorage.getItem('gtm-data')` calls
- [ ] Replace with `fetch('/api/prospects')` and `fetch('/api/session')`
- [ ] Keep only UI preferences in localStorage (batch-size, min-score)

### **Step 3: Fix ProspectsTab.tsx**
- [ ] Remove `localStorage.setItem('gtm-data', ...)` after manual add
- [ ] Remove `localStorage.getItem('gtm-data')` reads
- [ ] Rely on parent component's re-fetch

### **Step 4: Fix MarketMapPanel.tsx**
- [ ] Remove any `localStorage.setItem('gtm-data', ...)` writes
- [ ] Keep `gtm-batch-size` read (UI preference) ✅

### **Step 5: Migration Script**
- [ ] Create `scripts/migrate-localStorage-to-db.mjs`
- [ ] Read localStorage from user's browser (manual copy-paste)
- [ ] Insert missing data into database
- [ ] Clear localStorage (except UI preferences)

---

## **ACCEPTANCE CRITERIA**

### **Must Work:**
1. ✅ User completes analysis → Data saved to database
2. ✅ User refreshes page → Data loaded from database (not localStorage)
3. ✅ User adds manual prospect → Saved to database, appears on refresh
4. ✅ User generates decision makers → Saved to database, persists on refresh
5. ✅ ICP profile saved to `user_sessions` table
6. ✅ Customers list saved to `companies` table (source='seed')
7. ✅ Analysis step saved to `user_sessions` table

### **Must NOT Happen:**
1. ❌ localStorage used for prospects/companies/clusters/ads
2. ❌ Data exists in database but not shown in UI
3. ❌ Page refresh loses user's work

### **OK to Keep in localStorage:**
1. ✅ `gtm-batch-size` (UI preference)
2. ✅ `gtm-max-total-prospects` (UI preference)
3. ✅ `gtm-min-icp-score` (UI filter)

---

## **RISKS & MITIGATIONS**

| Risk | Mitigation |
|------|------------|
| Users lose localStorage data during migration | Create recovery script to import from localStorage |
| Clusters/ads not saved properly | Verify `/api/analyse` route saves to `clusters` and `ads` tables |
| ICP disappears on refresh | Fix `/api/session` route (currently 404) |
| Slow page loads (fetching from DB) | Add loading states, optimize queries |

---

## **NEXT STEPS**

1. **User confirms plan** ✅
2. **I create `/api/session` route** 
3. **I refactor `page.tsx` to remove localStorage** 
4. **I refactor `ProspectsTab.tsx` to remove localStorage** 
5. **Test end-to-end** )
6. **Deploy & verify** 

**Total Time: ~45 minutes**

---

## **LOGS SHOWING THE ISSUE**

```
Line 208: POST /api/session 404 in 529ms    ← Route doesn't exist!
Line 335: ICPProfileModal render: { isOpen: false, hasICP: false, hasEditedICP: false }  ← ICP lost on refresh
Line 355: [COMPANY-CREATE] Created company with ID: 189  ← Saved to DB
Line 360-361: POST /api/session 404 ← Can't save session
Line 365: GET /api/prospects 200 in 221ms ← Prospects loaded from DB (but ICP missing)
```

**Root cause:** `/api/session` route missing → ICP not saved → hasICP = false on refresh

---

Do you want me to proceed with the fix? 🛠️

