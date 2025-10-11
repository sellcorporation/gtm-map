# Authentication System - Production-Ready MVP Plan

**Branch:** `feature/user-authentication`  
**Date:** October 11, 2025  
**Status:** Ready to Implement  
**Architecture:** ✅ **Supabase Auth + Postgres (Full Stack) via Vercel**

---

## 📢 **EXECUTIVE SUMMARY**

### **The Decision: All-In on Supabase**

**Single database. Single auth provider. Zero split-brain. Clean MVP with rails for future teams/tiers.**

✅ **Vercel + Supabase Integration** (native, one-click setup)  
✅ **Supabase Auth** (email/password with verification)  
✅ **Supabase PostgreSQL** (one database for everything)  
✅ **Row Level Security** (database-enforced isolation)  
✅ **Future-proof** (easy upgrade to organizations/tiers)  
✅ **Production-ready** (13 auto-configured env vars, preview branches, backups)

---

## 🎯 **MVP SCOPE**

### **What We're Building**

1. **Authentication** (Email/Password Only)
   - Signup with email verification (required)
   - Login/logout
   - Forgot password flow
   - Password reset flow
   - Pages: `/signup`, `/login`, `/forgot-password`, `/reset-password`

2. **User Data Model**
   - `auth.users` (Supabase managed)
   - `profiles` (app-specific data: full_name, avatar_url)
   - `user_settings` (preferences: timezone, notifications)
   - Post-signup hook auto-creates profile + settings

3. **Data Isolation** (Single-User Tenancy)
   - `companies.user_id → auth.users.id`
   - `clusters.user_id → auth.users.id`
   - `ads` (via cluster ownership)
   - RLS enforces "users only see their own data"

4. **Security**
   - 7-day sessions, multi-device support
   - Rate limits: 5 login/15min, 3 reset/hour, 3 signup/day
   - Security headers (HSTS, CSP, etc.)
   - Error copy doesn't leak account existence

5. **Future-Ready**
   - UUID-based user_id (supports orgs later)
   - RLS architecture scales to multi-tenant
   - **Phase 2** (future): Add `organizations` + `memberships` tables

---

## 🗂️ **DATABASE SCHEMA**

### **Migration: `text` → `uuid` for `user_id`**

**Current Problem:** Your tables use `userId: text` (set to `'demo-user'`)  
**Fix:** Change to `userId: uuid` to match Supabase `auth.users.id`

### **New Tables**

```typescript
// ========================================
// PROFILES - Extends auth.users
// ========================================
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // References auth.users(id) with ON DELETE CASCADE
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// SQL: CREATE TABLE profiles (
//   id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
//   full_name text,
//   avatar_url text,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );

// ========================================
// USER SETTINGS - Per-user preferences
// ========================================
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey().references(() => profiles.id, { onDelete: 'cascade' }),
  timezone: text('timezone').default('Europe/London'),
  emailNotifications: boolean('email_notifications').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### **Updated Existing Tables**

```typescript
// ========================================
// COMPANIES - Change userId to UUID
// ========================================
export const companies = pgTable('companies', {
  // ... existing columns
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }), // CHANGED
  // ... rest
});

// ========================================
// CLUSTERS - Change userId to UUID
// ========================================
export const clusters = pgTable('clusters', {
  // ... existing columns
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }), // CHANGED
  // ... rest
});

// ========================================
// ADS - No userId (linked via cluster)
// ========================================
export const ads = pgTable('ads', {
  // ... existing columns
  clusterId: integer('cluster_id').notNull().references(() => clusters.id, { onDelete: 'cascade' }),
  // ... rest
});
```

### **Indexes (Fast & Simple)**

```sql
-- Unique domain per user
CREATE UNIQUE INDEX companies_domain_per_user ON companies (user_id, domain);

-- Fast lookups for RLS policies
CREATE INDEX companies_user_idx ON companies USING btree (user_id);
CREATE INDEX clusters_user_idx ON clusters USING btree (user_id);
CREATE INDEX ads_cluster_idx ON ads (cluster_id);

-- GIN indexes for JSONB (add later if needed)
-- CREATE INDEX companies_evidence_gin ON companies USING GIN (evidence);
```

### **Row Level Security (RLS) Policies**

```sql
-- ========================================
-- PROFILES
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========================================
-- USER SETTINGS
-- ========================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- COMPANIES
-- ========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- CLUSTERS
-- ========================================
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clusters"
  ON clusters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clusters"
  ON clusters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clusters"
  ON clusters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clusters"
  ON clusters FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- ADS (via cluster ownership)
-- ========================================
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ads"
  ON ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ads"
  ON ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ads"
  ON ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ads"
  ON ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clusters
      WHERE clusters.id = ads.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );
```

---

## 🪝 **POST-SIGNUP HOOK** (Critical)

**Problem:** When a user signs up, only `auth.users` is created. We need `profiles` and `user_settings` too.

**Solution:** Database trigger (recommended for MVP reliability)

```sql
-- ========================================
-- Trigger function to create profile + settings
-- ========================================
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

-- ========================================
-- Attach trigger to auth.users
-- ========================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Alternative:** Supabase Edge Function webhook (more flexible, but requires webhook config)

---

## 🔐 **SECURITY IMPLEMENTATION**

### **Password Security**

**You don't handle passwords - Supabase does!**

- ✅ Supabase Auth handles all hashing (industry best practices)
- ✅ You **never** see or store plain text passwords
- ✅ **Your job:** Configure password requirements in Supabase dashboard

**Supabase Settings:**
- Minimum 8 characters
- Optional: Mix of uppercase, lowercase, numbers
- Optional: Special characters
- Optional: Check against Have I Been Pwned database

### **Session Management**

**MVP Strategy:**
- **Duration:** 7 days
- **Rotation:** On every login + on password change
- **Multi-device:** Allowed ✅
- **Storage:** HTTP-only cookies (Supabase handles)
- **Secure flag:** Enabled in production (Supabase handles)
- **SameSite:** `Lax` (Supabase handles)
- **Auto-refresh:** Supabase SDK auto-refreshes before expiry

**Post-MVP Backlog:**
- "Log out of all devices" button
- Session management UI (view/revoke active sessions)

### **Rate Limiting**

```typescript
// Login: 5 attempts per 15 minutes per IP
// Password reset: 3 requests per hour per email
// Signup: 3 signups per day per IP
// CAPTCHA on anomalies (optional)
```

### **Error Messages (Prevent Account Enumeration)**

**Bad:**  
❌ "This email doesn't exist"  
❌ "Incorrect password"

**Good:**  
✅ "If that email exists, we've sent instructions."  
✅ "Invalid credentials. Please try again."

### **Security Headers**

```typescript
// Add to next.config.ts
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
]
```

### **Secrets Management**

```bash
# PUBLIC (client-side)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# SERVER-ONLY (never expose)
SUPABASE_SERVICE_ROLE_KEY  # ⚠️ CRITICAL: Server-only!
SUPABASE_JWT_SECRET
```

---

## 🌐 **FRONTEND WIRING** (Next.js + Supabase SSR)

### **1. Install Package**

```bash
npm install @supabase/ssr
```

### **2. Create Supabase Clients**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### **3. Auth Flows**

```typescript
// Signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    emailRedirectTo: `${location.origin}/auth/callback`,
    data: {
      full_name: 'John Doe',
    }
  }
});

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// Logout
await supabase.auth.signOut();

// Get current user (server)
const { data: { user } } = await supabase.auth.getUser();

// Reset password request
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: `${location.origin}/reset-password`,
});

// Update password
await supabase.auth.updateUser({
  password: 'new_password',
});
```

### **4. Protected Routes**

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request: Request) {
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && !request.url.includes('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password).*)'],
};
```

### **5. All CRUD Uses `user_id = auth.uid()`**

```typescript
// API route example
const { data: { user } } = await supabase.auth.getUser();

// Insert with RLS
await db.insert(companies).values({
  name: 'Company',
  userId: user.id, // UUID from Supabase
});

// RLS automatically filters queries
const myCompanies = await db.select().from(companies); // Only returns user's data
```

---

## ⚙️ **VERCEL + SUPABASE CONFIGURATION**

### **1. Set SITE_URL**

In Supabase dashboard (via Vercel):
```
Authentication → URL Configuration → Site URL
https://your-app.vercel.app
```

### **2. Add Redirect URLs**

```
Authentication → URL Configuration → Redirect URLs
https://your-app.vercel.app/**
https://*.vercel.app/**  (for preview branches)
```

### **3. Email Templates**

**MVP:** Use Supabase default templates ✅

**Later:** Customize in Supabase Dashboard → Authentication → Email Templates
- Add your logo
- Update colors
- Customize copy

**Future (Post-MVP):** Configure custom SMTP (Resend, Postmark) with SPF/DKIM/DMARC for better deliverability

---

## ✅ **MVP ACCEPTANCE CRITERIA** (Ship When All Pass)

### **Functional Tests**

- [ ] Sign up → receive verification email → click link → redirected to app
- [ ] `profiles` and `user_settings` rows exist for new `auth.users.id`
- [ ] Login with verified account → dashboard loads
- [ ] Session persists across browser refresh/restart (7 days)
- [ ] Logout → protected routes redirect to login
- [ ] Forgot password → email arrives → reset link works → old password invalid
- [ ] Login holds across multiple devices simultaneously

### **Security Tests (CRITICAL)**

- [ ] **RLS Test 1:** User A creates company → User B cannot see it
- [ ] **RLS Test 2:** User A creates cluster → User B cannot access it
- [ ] **RLS Test 3:** User A cannot read/update User B's profile
- [ ] **RLS Test 4:** User A cannot view User B's settings
- [ ] **RLS Test 5:** API attempts to access another user's data are blocked
- [ ] Session rotates on login (new token issued)
- [ ] Session invalidates on password change
- [ ] Rate limits fire (5 login attempts → blocked)
- [ ] Error messages don't leak account existence

### **UI/UX Tests**

- [ ] All pages mobile-responsive (iOS, Android)
- [ ] All pages work on desktop (Chrome, Safari, Firefox)
- [ ] Loading states display during async operations
- [ ] Error messages are clear and actionable
- [ ] "Show password" toggle works
- [ ] "Resend verification email" works

### **Infrastructure Tests**

- [ ] Preview branch deployments work (redirect URLs auto-configured)
- [ ] Environment variables present in Vercel
- [ ] Email delivery works (verification, reset)
- [ ] Post-signup hook creates profile + settings (no manual step)
- [ ] Database connection pooling stable under load

---

## 📋 **IMPLEMENTATION PHASES**

### **Phase 0: Prerequisites** (30 minutes - USER DOES THIS)

- [ ] Set up Vercel + Supabase integration (Vercel dashboard → Storage → Create Supabase)
- [ ] Verify 13 environment variables auto-set
- [ ] Access Supabase dashboard via Vercel
- [ ] Share design reference for UI styling

---

### **Phase 1: Database Migration** (4-6 hours)

#### **1.1 Update Schema (2 hours)**
- [ ] Change `userId` from `text` to `uuid` in:
  - `companies.userId`
  - `clusters.userId`
  - `user_sessions.userId` (or delete this table if Supabase handles sessions)
- [ ] Add `profiles` table (id, full_name, avatar_url, timestamps)
- [ ] Add `user_settings` table (user_id, timezone, email_notifications, timestamps)
- [ ] Write Drizzle schema definitions
- [ ] Generate migration files

#### **1.2 Deploy Schema (1 hour)**
- [ ] Run `drizzle-kit push` to Supabase
- [ ] Verify tables created in Supabase dashboard

#### **1.3 Post-Signup Hook (1 hour)**
- [ ] Write `handle_new_user()` trigger function (SQL above)
- [ ] Attach trigger to `auth.users` INSERT
- [ ] Test: signup should auto-create profile + settings

#### **1.4 RLS Policies (2 hours)**
- [ ] Enable RLS on all tables
- [ ] Deploy policies for profiles, user_settings, companies, clusters, ads
- [ ] **Test with two users** - verify cross-user access blocked

---

### **Phase 2: Authentication Core** (2-3 days)

#### **2.1 Supabase Client Setup (1 hour)**
- [ ] Install `@supabase/ssr`
- [ ] Create server client (`src/lib/supabase/server.ts`)
- [ ] Create browser client (`src/lib/supabase/client.ts`)
- [ ] Create middleware client for auth checks

#### **2.2 Signup Flow (4 hours)**
- [ ] Create `/signup` page
- [ ] Form validation (email, password, confirm password)
- [ ] Call `supabase.auth.signUp()`
- [ ] Show "Check your email" success message
- [ ] Handle errors gracefully

#### **2.3 Login Flow (3 hours)**
- [ ] Create `/login` page
- [ ] Form validation
- [ ] Call `supabase.auth.signInWithPassword()`
- [ ] Redirect to dashboard on success
- [ ] Handle errors (rate limiting, invalid credentials)

#### **2.4 Logout (1 hour)**
- [ ] Add logout button to dashboard
- [ ] Call `supabase.auth.signOut()`
- [ ] Redirect to login page

#### **2.5 Auth Guard (2 hours)**
- [ ] Update middleware to check Supabase session
- [ ] Redirect unauthenticated users to `/login`
- [ ] Allow access to public routes (login, signup, forgot-password)

---

### **Phase 3: Password Management** (1 day)

#### **3.1 Forgot Password (3 hours)**
- [ ] Create `/forgot-password` page
- [ ] Email input + validation
- [ ] Call `supabase.auth.resetPasswordForEmail()`
- [ ] Show generic success message (no account enumeration)

#### **3.2 Reset Password (3 hours)**
- [ ] Create `/reset-password` page (handles token from email)
- [ ] New password + confirm password fields
- [ ] Call `supabase.auth.updateUser({ password })`
- [ ] Redirect to login with success message

#### **3.3 Change Password (2 hours)**
- [ ] Add "Change Password" section in profile settings
- [ ] Require current password (re-authentication)
- [ ] Update via `supabase.auth.updateUser()`
- [ ] Rotate session on success

---

### **Phase 4: UI/UX Polish** (2-3 days)

#### **4.1 Login Page Design (4 hours)**
- [ ] Implement design (based on reference: minimal, modern, Apple-style)
- [ ] Email + password fields
- [ ] "Forgot password?" link
- [ ] "Sign up" link
- [ ] Loading states, error messages
- [ ] Mobile-responsive

#### **4.2 Signup Page Design (4 hours)**
- [ ] Full name, email, password fields
- [ ] Password strength indicator
- [ ] "Show password" toggle
- [ ] Terms & conditions checkbox
- [ ] "Login" link
- [ ] Mobile-responsive

#### **4.3 Password Reset Pages (3 hours)**
- [ ] Style `/forgot-password` (clean, minimal)
- [ ] Style `/reset-password` (clear instructions)
- [ ] Email verification success page
- [ ] Error states

#### **4.4 Email Templates (1 hour)**
- [ ] Review Supabase default templates
- [ ] Customize if needed (logo, colors) in Supabase dashboard

---

### **Phase 5: Security Hardening** (1-2 days)

#### **5.1 Supabase Auth Config (2 hours)**
- [ ] Set session duration to 7 days
- [ ] Enable email verification requirement
- [ ] Configure redirect URLs (production + preview)
- [ ] Set SITE_URL
- [ ] Review password requirements

#### **5.2 Rate Limiting (2 hours)**
- [ ] Verify Supabase rate limits are active
- [ ] Add custom rate limiting for sensitive endpoints (if needed)
- [ ] Test: 5 failed logins → account temporarily locked

#### **5.3 Security Headers (1 hour)**
- [ ] Add CSP, HSTS, X-Frame-Options to `next.config.ts`
- [ ] Test with https://securityheaders.com

#### **5.4 Error Copy Review (1 hour)**
- [ ] Audit all error messages
- [ ] Ensure no account enumeration leaks
- [ ] Generic messages: "If that email exists..."

---

### **Phase 6: Testing** (1-2 days)

#### **6.1 Functional Tests (4 hours)**
- [ ] Test signup → verify email → login
- [ ] Test password reset flow
- [ ] Test multi-device sessions
- [ ] Test logout behavior

#### **6.2 RLS Security Tests (4 hours)**
- [ ] Create two test users (User A, User B)
- [ ] User A creates company → verify User B cannot access
- [ ] User A creates cluster → verify User B cannot access
- [ ] Test API endpoints respect RLS
- [ ] Verify post-signup hook creates profile + settings

#### **6.3 Device Testing (2 hours)**
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on desktop (Chrome, Safari, Firefox)

#### **6.4 Email Testing (1 hour)**
- [ ] Verify email delivery (check spam folder)
- [ ] Test "resend email" functionality
- [ ] Test email links work (redirect to correct URL)

---

### **Phase 7: Deployment** (1 day)

#### **7.1 Preview Deployment (2 hours)**
- [ ] Deploy to preview branch (`feature/user-authentication`)
- [ ] Test all flows in preview environment
- [ ] Verify redirect URLs work for preview domain

#### **7.2 Production Deployment (2 hours)**
- [ ] Merge to `main` branch
- [ ] Deploy to production
- [ ] Monitor error logs (Vercel, Supabase)
- [ ] Test production URLs

#### **7.3 Monitoring Setup (2 hours)**
- [ ] Set up Supabase dashboard monitoring
- [ ] Configure alerts for auth failures
- [ ] Monitor signup/login metrics

---

**Total Estimated Time: 8-10 days**

---

## 🚀 **FUTURE: UPGRADE TO ORGANIZATIONS & TIERS**

**MVP Scope:** Single-user tenancy (each user owns their data)  
**Phase 2:** Multi-tenant organizations with billing tiers

### **Why This Architecture Is Future-Proof**

1. ✅ **UUID-based user_id** (compatible with organizations)
2. ✅ **RLS policies** (easy to extend to memberships)
3. ✅ **Separate profiles table** (can add organization_id later)
4. ✅ **Clean data model** (no hardcoded assumptions)

### **Phase 2: Organizations Architecture** (Future)

#### **New Tables**

```typescript
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  billingTier: text('billing_tier').default('free'), // free, pro, enterprise
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const memberships = pgTable('memberships', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  role: text('role').notNull(), // owner, admin, member, viewer
  joinedAt: timestamp('joined_at').defaultNow(),
});
```

#### **Update Data Tables**

```typescript
export const companies = pgTable('companies', {
  // ... existing columns
  userId: uuid('user_id').notNull(), // Keep for backwards compatibility
  organizationId: uuid('organization_id'), // NEW (nullable for migration)
});
```

#### **Updated RLS Policies**

```sql
-- New policy: Users can access data from their organizations
CREATE POLICY "Users can view org companies"
  ON companies FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM memberships 
      WHERE user_id = auth.uid()
    )
  );
```

#### **Migration Path (6 Steps)**

1. Add `organizations` and `memberships` tables
2. Auto-create organization for each existing user
3. Add `organizationId` column to data tables (nullable)
4. Populate `organizationId` based on `userId`
5. Update RLS policies to check membership
6. Add billing tier logic (Stripe integration)

**Key Point:** No data loss, backward compatible, smooth upgrade path.

---

## 🚨 **FMEA - FAILURE MODE & EFFECTS ANALYSIS**

### **Authentication Failures**

| # | Failure Mode | Potential Cause | Severity (1-10) | Likelihood (1-10) | Risk | Mitigation | Residual Risk |
|---|--------------|-----------------|---------|----------|------|------------|---------------|
| **1** | User locked out | Forgot password | 8 | 7 | 56 | Password reset flow, support contact | LOW |
| **2** | Session hijacking | Stolen cookie | 9 | 5 | 45 | HTTP-only cookies, Secure flag, SameSite, 7-day expiry | MED |
| **3** | Brute force attack | No rate limiting | 8 | 8 | 64 | Rate limits (5/15min), account lockout, email alerts | LOW |
| **4** | Email enumeration | Different responses | 6 | 7 | 42 | Generic error messages ("If that email exists...") | LOW |
| **5** | Token replay attack | Reset token reuse | 9 | 4 | 36 | One-time use tokens, 15-min expiry, store used tokens | LOW |

### **Database Security Failures**

| # | Failure Mode | Potential Cause | Severity | Likelihood | Risk | Mitigation | Residual Risk |
|---|--------------|-----------------|----------|------------|------|------------|---------------|
| **6** | Cross-user data access | RLS misconfigured | 10 | 3 | 30 | Explicit RLS tests (User A cannot see User B's data) | LOW |
| **7** | SQL injection | Unsanitized input | 10 | 2 | 20 | Drizzle ORM, Zod validation, parameterized queries | LOW |
| **8** | Orphaned data | No cascade delete | 5 | 6 | 30 | Foreign keys with `ON DELETE CASCADE` | LOW |

### **Email & Communication Failures**

| # | Failure Mode | Potential Cause | Severity | Likelihood | Risk | Mitigation | Residual Risk |
|---|--------------|-----------------|----------|------------|------|------------|---------------|
| **9** | Verification email not received | Spam filter | 7 | 6 | 42 | "Resend email" button, clear instructions, Supabase deliverability | MED |
| **10** | Email service outage | Supabase down | 7 | 2 | 14 | Cached sessions, graceful degradation, status monitoring | MED |
| **11** | Expired reset link | User delayed | 5 | 7 | 35 | Clear expiry time, easy to request new link | LOW |

### **Infrastructure Failures**

| # | Failure Mode | Potential Cause | Severity | Likelihood | Risk | Mitigation | Residual Risk |
|---|--------------|-----------------|----------|------------|------|------------|---------------|
| **12** | Missing env vars | Deployment error | 9 | 4 | 36 | Validate on startup, CI/CD checks, Vercel auto-config | LOW |
| **13** | Supabase outage | Third-party down | 8 | 2 | 16 | Cached sessions, status monitoring, SLA | MED |
| **14** | Preview branch redirect fail | Wrong URL config | 6 | 3 | 18 | Wildcard redirect URLs (`*.vercel.app/**`) | LOW |

---

## 📝 **NEXT STEPS**

### **✅ ALL QUESTIONS ANSWERED**

1. **Database Path:** Full Supabase (Auth + Postgres) ✅
2. **Design:** Minimal, modern, Apple-style; neutral greys/black/white ✅
3. **Email Verification:** Required ✅
4. **Registration:** Open (anyone can sign up) ✅
5. **Social Auth:** Email/password only (for now) ✅
6. **Session Duration:** 7 days ✅
7. **Multi-Device:** Allowed ✅
8. **Email Templates:** Supabase defaults ✅

---

### **🚀 IMMEDIATE ACTION ITEMS**

#### **FOR YOU (5 minutes):**
1. Go to Vercel dashboard → `gtm-map` project → "Storage" tab
2. Click "Create Database" → Select "Supabase"
3. Complete wizard (Vercel handles everything)
4. Share design reference (screenshot/link) for UI styling

#### **FOR ME (8-10 days):**
Once you complete Vercel setup and share design:
1. ✅ Migrate database schema to Supabase
2. ✅ Implement all auth flows (signup, login, password reset)
3. ✅ Deploy RLS policies and post-signup hook
4. ✅ Build beautiful UI (based on your design)
5. ✅ Security hardening (rate limits, headers)
6. ✅ Comprehensive testing (functional + security)
7. ✅ Deploy to production

---

## 🎯 **SUCCESS METRICS**

After implementation:
- ✅ **Security:** All FMEA mitigations in place, RLS tests pass
- ✅ **Reliability:** 99.9% auth success rate
- ✅ **Performance:** < 500ms login time
- ✅ **UX:** Smooth flows, mobile-responsive, clear error messages

---

## 🎉 **LET'S BUILD THIS!**

**The plan is ready. The architecture is solid. Vercel + Supabase makes this incredibly smooth.**

**Complete Vercel setup (5 mins) → Share design → I'll implement everything!** 🚀

