# Authentication System - Comprehensive Implementation Plan

**Branch:** `feature/user-authentication`  
**Date:** October 11, 2025  
**Status:** Planning Phase - Ready to Implement  
**Recommended Stack:** ✅ **Vercel + Supabase Integration**

---

## 📢 **EXECUTIVE SUMMARY**

### **Why Vercel + Supabase?**

After discovering Vercel's **native Supabase integration**, this is now the clear winner:

✅ **One-click setup** through Vercel dashboard  
✅ **Auto-configured** (13 environment variables set automatically)  
✅ **Single billing** through Vercel  
✅ **Production-ready auth** (signup, login, password reset, email verification)  
✅ **Works with your existing Drizzle ORM** (Supabase uses PostgreSQL)  
✅ **Preview branches** auto-configured  
✅ **Bonus features:** Storage, Edge Functions, Realtime  
✅ **Already installed:** `@supabase/supabase-js` is in your package.json  

### **Two Implementation Paths:**

| Feature | Path A: Full Supabase | Path B: Auth Only |
|---------|----------------------|-------------------|
| **Database** | Migrate to Supabase PostgreSQL | Keep existing + Supabase for users |
| **Timeline** | 10-12 days | 7-9 days |
| **Complexity** | Medium | Low |
| **Long-term** | Cleaner, all in one place | Two databases to manage |
| **Best For** | New or small projects | Minimal disruption |

### **What You Need to Do:**

1. ✅ Set up Vercel + Supabase integration (5 mins)
2. ✅ Share design reference for UI
3. ✅ Answer 8 key questions (see below)
4. ✅ Choose Path A or B

**Then I'll build everything!** 🚀

---

## 📊 Current State Analysis

### Existing Implementation
- **Basic password-only authentication** using `APP_PASSWORD` environment variable
- **No user accounts** - single shared password for all users
- **Session management** using HTTP-only cookies (24-hour duration)
- **SHA-256 password hashing** (⚠️ **INSECURE** - not suitable for production)
- **No registration flow** - users cannot create accounts
- **No password recovery** mechanism
- **userId is text field** in database but always set to `'demo-user'`
- **Supabase already installed** (`@supabase/supabase-js`) but not utilized

### Database Schema
- **user_sessions** table exists with `userId` field
- **companies, clusters, ads** tables all have `userId` field for multi-tenancy
- **No users table** currently defined
- Uses **PostgreSQL** via Drizzle ORM

---

## 🎯 Proposed Architecture

### Technology Stack Decision

#### **✅ RECOMMENDED: Vercel + Supabase Integration** 🏆

**Why This Is Perfect For You:**
- ✅ **Native Vercel integration** - one-click setup through Vercel dashboard
- ✅ **Auto-configured environment variables** - all 13 variables set automatically
- ✅ **Single billing through Vercel** - no separate Supabase account needed
- ✅ **Preview branch auto-config** - redirect URLs created automatically
- ✅ **Already have `@supabase/supabase-js`** installed
- ✅ **Production-ready auth** - signup, login, password reset, email verification
- ✅ **Social auth** (Google, GitHub, etc.) ready to enable
- ✅ **Supabase PostgreSQL** works perfectly with your existing Drizzle ORM
- ✅ **Row Level Security (RLS)** for database security
- ✅ **Bonus features:** Storage, Edge Functions, Realtime
- ✅ **Email templates** included
- ✅ **Free tier** is generous

**Environment Variables Auto-Set by Vercel:**
```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_JWT_SECRET
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
```

**Implementation Options:**

**Option A: Full Supabase Stack** (Recommended for new projects)
- Use Supabase PostgreSQL as your primary database
- Use Supabase Auth for authentication
- Your existing Drizzle ORM code works with zero changes
- All data in one place, managed through Vercel
- **Best for:** Clean architecture, all features available

**Option B: Supabase Auth + Keep Existing Database** (Easier migration)
- Keep your current PostgreSQL for app data (companies, prospects)
- Use Supabase PostgreSQL only for authentication (users table)
- Sync `userId` between systems
- **Best for:** Minimal disruption, gradual migration

---

#### **Alternative: NextAuth.js** (Not Recommended)

**Pros:**
- ✅ Single database (your existing PostgreSQL)
- ✅ No external auth service

**Cons:**
- ⚠️ Need to add dependency
- ⚠️ More manual setup required
- ⚠️ Email service needed separately (Resend, SendGrid)
- ⚠️ More code to maintain
- ⚠️ No native Vercel integration
- ⚠️ Social auth is more complex
- ⚠️ Missing production features (preview URLs, etc.)

**Why Not:** Vercel + Supabase gives you everything NextAuth provides PLUS better Vercel integration, easier setup, and bonus features.

---

**FINAL RECOMMENDATION:** **Vercel + Supabase Integration (Option A or B)** - Production-ready, hassle-free, perfectly integrated with your stack.

---

## 🔐 Security Implementation Plan

### Password Security

**⚠️ You Don't Handle Passwords - Supabase Does!**

- Supabase Auth handles all password hashing (industry best practices)
- You **never** see or store plain text passwords
- Current SHA-256 implementation **will be removed**
- **Your responsibility:** Password requirements configuration only

**Password Requirements (Configured in Supabase):**
- Minimum 8 characters (configurable)
- Optional: Mix of uppercase, lowercase, numbers
- Optional: Special characters
- Optional: Check against common password lists (Have I Been Pwned)

**DO NOT implement custom password hashing** - Supabase handles this securely.

### Session Management

**MVP Session Strategy:**
- **Session duration:** 7 days (configurable in Supabase)
- **Session rotation:** Rotate session token on every login
- **Privilege change:** Rotate session on password change or role updates
- **HTTP-only cookies:** ✅ (Supabase handles)
- **Secure flag in production:** ✅ (Supabase handles)
- **SameSite: Lax:** ✅ (Supabase handles)
- **Auto-refresh:** Supabase SDK auto-refreshes before expiry
- **Concurrent sessions:** Allow multiple devices (MVP)

**Backlog (Post-MVP):**
- "Log out of all devices" button in user settings
- Session management UI (see all active sessions)
- Revoke specific sessions

### Database Security - Row Level Security (RLS)

**⚠️ CRITICAL: Write and Test Actual RLS Policies**

Don't just "configure RLS" - implement and test specific policies.

#### **RLS Policies to Implement:**

```sql
-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User Settings: users can only access their own settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Companies: users can only access their own data
CREATE POLICY "Users can view own companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

-- Clusters: same pattern
CREATE POLICY "Users can view own clusters"
  ON public.clusters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clusters"
  ON public.clusters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clusters"
  ON public.clusters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clusters"
  ON public.clusters FOR DELETE
  USING (auth.uid() = user_id);
```

#### **RLS Testing Requirements:**

**Unit Tests:** Test policies programmatically
```typescript
// Test: User A cannot access User B's data
test('RLS prevents cross-user access', async () => {
  const userA = await signUp('userA@test.com');
  const userB = await signUp('userB@test.com');
  
  // User A creates a company
  const companyA = await createCompany(userA, 'Company A');
  
  // User B tries to access User A's company
  const result = await fetchCompany(userB, companyA.id);
  expect(result).toBeNull(); // Should fail due to RLS
});
```

**E2E Tests:** Test via actual API calls
```typescript
// Test: Attempt to query another user's data
test('API respects RLS for companies', async () => {
  const userA = await loginAs('userA@test.com');
  const userB = await loginAs('userB@test.com');
  
  // Create company as User A
  const companyId = await createCompanyAPI(userA.token, { name: 'Test' });
  
  // Try to fetch as User B
  const response = await fetch(`/api/company/${companyId}`, {
    headers: { Authorization: `Bearer ${userB.token}` }
  });
  
  expect(response.status).toBe(404); // Or 403 Forbidden
});
```

### Other Database Security

- **API endpoints** always verify `userId` from session
- **Input validation** with Zod (already using ✅)
- **SQL injection protection** via Drizzle ORM (already using ✅)

### API Security
- **Rate limiting** on auth endpoints (login, signup, password reset)
- **CORS configuration** proper
- **CSRF protection** via SameSite cookies
- **Brute force protection** - lockout after N failed attempts

---

## 🗂️ Database Schema Changes

### **Path A: Full Supabase Migration**

**Good News:** Your Drizzle ORM code works with **zero changes**! Supabase uses PostgreSQL.

**What Changes:**
1. Connection URL → Use `POSTGRES_URL` from Vercel (auto-set)
2. Add `users` table to your schema
3. Update existing tables with foreign key constraints

### ⚠️ **CRITICAL: Do NOT Create a `users` Table**

**Supabase Auth already provides `auth.users`!** Creating your own users table causes:
- Data drift
- Sync issues
- Maintenance pain

### **Instead: Create `profiles` + `user_settings` Tables**

```typescript
// profiles - extends auth.users with app-specific data
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // References auth.users(id)
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

// user_settings - user preferences
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(), // References auth.users(id)
  emailNotifications: boolean('email_notifications').default(true),
  sessionDuration: text('session_duration').default('7d'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Key Points:**
- `profiles.id` = `auth.users.id` (1:1 relationship)
- Email, password, email_verified → Managed by Supabase Auth
- Your app data → `profiles` and `user_settings`

### Update Existing Tables - **CRITICAL: Change to UUID**

**Current Issue:** Your `userId` is `text`. Supabase Auth uses `uuid`.

```typescript
// CHANGE existing tables from text to uuid
export const companies = pgTable('companies', {
  // ... existing columns
  userId: uuid('user_id').notNull(), // CHANGED from text to uuid
  // Later add: .references(() => profiles.id, { onDelete: 'cascade' })
});

export const clusters = pgTable('clusters', {
  // ... existing columns
  userId: uuid('user_id').notNull(), // CHANGED from text to uuid
});

export const userSessions = pgTable('user_sessions', {
  // ... existing columns
  userId: uuid('user_id').notNull(), // CHANGED from text to uuid
});
```

**MVP Approach:**
- ✅ Change column type to `uuid`
- ✅ Store `auth.users.id` value on write
- ⚠️ **Don't add FK constraints yet** if keeping app DB separate
- ✅ Enforce in application code
- ✅ Add FK constraints later when migrating to Supabase

**⚠️ MVP Scope Note:**
This is **single-user tenancy** (each user owns their data).  
**Phase 2** will introduce organizations, team memberships, and shared workspaces.

### Migration Strategy

**Path A (Full Migration):**
1. ✅ Export data from current PostgreSQL
2. ✅ Update Drizzle connection to `POSTGRES_URL`
3. ✅ Create `users` table in Supabase
4. ✅ Create other tables (companies, clusters, etc.)
5. ✅ Import data
6. ✅ Add foreign key constraints
7. ✅ Test all queries work

**Path B (Auth Only):**
1. ✅ Keep existing PostgreSQL connection
2. ✅ Add separate Supabase connection for auth
3. ✅ Create `users` table in Supabase only
4. ✅ Sync userId when creating companies/clusters
5. ✅ No data migration needed!

**Recommendation:** Path B for **minimal disruption**, Path A for **cleaner architecture**.

---

## 🪝 Post-Signup Hook (CRITICAL)

**Problem:** When a user signs up, `auth.users` is created, but `profiles` and `user_settings` are not.

**Solution:** Implement a **Database Trigger** or **Edge Function** to auto-create related records.

### **Option A: Database Trigger** (Recommended - Simpler)

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **Option B: Supabase Edge Function** (More flexible)

```typescript
// supabase/functions/on-user-created/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { record } = await req.json(); // auth.users record
  
  // Create profile
  await supabase.from('profiles').insert({
    id: record.id,
    full_name: record.raw_user_meta_data?.full_name,
    avatar_url: record.raw_user_meta_data?.avatar_url,
  });
  
  // Create settings
  await supabase.from('user_settings').insert({
    user_id: record.id,
  });
  
  return new Response('OK', { status: 200 });
});
```

Then configure webhook in Supabase Dashboard:
- Auth → Hooks → "insert" on auth.users → Point to Edge Function

**Recommendation:** **Database Trigger** for MVP (simpler, no webhook config needed).

---

## 🎨 UI/UX Flow

### Pages Needed
1. **Login Page** (`/login`)
   - Email + Password
   - "Remember me" checkbox
   - "Forgot password?" link
   - "Don't have an account? Sign up" link
   - Social auth buttons (optional)

2. **Signup Page** (`/signup`)
   - Full name
   - Email
   - Password
   - Confirm password
   - Terms & conditions checkbox
   - "Already have an account? Login" link
   - Social auth buttons (optional)

3. **Forgot Password Page** (`/forgot-password`)
   - Email input
   - Submit button
   - Back to login link

4. **Reset Password Page** (`/reset-password?token=xyz`)
   - New password
   - Confirm new password
   - Submit button

5. **Email Verification Page** (`/verify-email?token=xyz`)
   - Success/error message
   - Redirect to dashboard or login

6. **User Profile/Settings** (future)
   - Change password
   - Update profile info
   - Manage sessions
   - Delete account

### Design Reference
You mentioned liking a marketing page signup design. **Please share:**
- Screenshot or link to the design you like
- Any specific design system/brand colors
- Any specific components or animations you want

---

## ❓ Key Questions for You

### Critical Decisions Needed

#### 1. **Authentication Provider**
- **Do you want to use Supabase Auth?** (Recommended - you already have it installed)
- Or would you prefer NextAuth.js or custom solution?

#### 2. **Social Authentication**
- Do you want users to sign in with:
  - [ ] Google
  - [ ] GitHub
  - [ ] LinkedIn
  - [ ] Microsoft
  - [ ] Other?
- Or **email/password only** for now?

#### 3. **Email Service**
- For password resets and verification emails, which service?
  - Supabase (built-in if using Supabase Auth)
  - Resend
  - SendGrid
  - AWS SES
  - Other?

#### 4. **Email Verification**
- **Require email verification** before users can access the app?
- Or allow immediate access and verify later?

#### 5. **Registration Flow**
- **Open registration** (anyone can sign up)?
- **Invite-only** (require invite code)?
- **Waitlist** (request access)?

#### 6. **User Roles/Permissions** (Future)
- Do you plan to have different user types?
  - Admin vs Regular User?
  - Team/workspace features?
  - Billing/subscription tiers?
- Or all users have same access for now?

#### 7. **Session Management**
- Allow users to be logged in on **multiple devices**?
- Or **single session** only (logout on new device)?
- Session duration: **7 days** or different?

#### 8. **Branding & Design**
- Can you share the design reference you mentioned?
- Color scheme preference?
- Logo available?

#### 9. **Data Migration**
- What happens to existing data tied to `'demo-user'`?
  - Transfer to first registered user?
  - Keep as demo data?
  - Delete it?

#### 10. **Rate Limiting**
- Strict limits (e.g., 5 login attempts per 15 mins)?
- Or more lenient for MVP?

---

## 🚨 FMEA - Failure Mode and Effects Analysis

### Authentication & Authorization Failures

| # | Failure Mode | Potential Causes | Effects | Severity (1-10) | Likelihood (1-10) | Risk Priority | Detection Method | Mitigation Strategy | Residual Risk |
|---|--------------|------------------|---------|---------|----------|---------------|------------------|---------------------|---------------|
| **1** | **User locked out of account** | Forgot password, no recovery email | Cannot access application | 8 | 7 | 56 | User report | • Implement password reset flow<br>• Email verification<br>• Support contact | LOW |
| **2** | **Password breach (plain text/weak hash)** | Using SHA-256 or worse | User accounts compromised | 10 | 9 | 90 | Security audit | • Use bcrypt/Supabase Auth<br>• Never store plain text<br>• Minimum 14 rounds | LOW |
| **3** | **Session hijacking** | XSS, stolen cookie | Unauthorized access to account | 9 | 5 | 45 | Security monitoring | • HTTP-only cookies ✅<br>• Secure flag in prod ✅<br>• SameSite attribute ✅<br>• CSRF tokens<br>• Short session duration | MED |
| **4** | **Brute force attack on login** | No rate limiting | Account takeover | 8 | 8 | 64 | Failed login monitoring | • Rate limiting (5 tries/15min)<br>• Account lockout after N attempts<br>• CAPTCHA after 3 failures<br>• Email notification on failed attempts | LOW |
| **5** | **Email enumeration** | Different responses for existing/non-existing emails | Privacy leak, targeted attacks | 6 | 7 | 42 | Security testing | • Same response for existing/non-existing emails<br>• Generic error messages<br>• Rate limiting | LOW |
| **6** | **Token reuse/replay attack** | JWT/reset tokens not invalidated | Unauthorized password reset | 9 | 4 | 36 | Log analysis | • One-time use tokens<br>• Short expiry (15 mins for reset)<br>• Store used tokens<br>• Invalidate on use | LOW |
| **7** | **Account takeover via password reset** | Reset link sent to wrong email | User loses account access | 9 | 3 | 27 | User report | • Email verification required<br>• Confirmation email on changes<br>• Security questions (optional) | LOW |
| **8** | **No email verification** | Fake emails, spam accounts | Database pollution, abuse | 6 | 8 | 48 | Admin dashboard | • Require email verification<br>• Block disposable emails<br>• CAPTCHA on signup | MED |
| **9** | **SQL injection** | Unsanitized user input | Database compromise | 10 | 2 | 20 | Automated testing | • Use Drizzle ORM ✅<br>• Input validation with Zod ✅<br>• Parameterized queries ✅ | LOW |
| **10** | **Cross-Site Scripting (XSS)** | Unsanitized output | Session theft, account takeover | 9 | 3 | 27 | Security scanning | • React escaping ✅<br>• CSP headers<br>• Input sanitization | LOW |

### Database & Data Integrity Failures

| # | Failure Mode | Potential Causes | Effects | Severity | Likelihood | Risk Priority | Detection Method | Mitigation Strategy | Residual Risk |
|---|--------------|------------------|---------|----------|------------|---------------|------------------|---------------------|---------------|
| **11** | **Orphaned data after user deletion** | No cascade delete setup | Data inconsistency | 5 | 6 | 30 | Data audit | • Foreign key constraints with CASCADE<br>• Soft delete option<br>• Data retention policy | LOW |
| **12** | **Race condition on concurrent logins** | Multiple sessions created simultaneously | Session confusion | 4 | 5 | 20 | Load testing | • Database transactions<br>• Proper locking<br>• Idempotent operations | LOW |
| **13** | **Database connection pool exhausted** | Too many auth requests | Service unavailable | 8 | 4 | 32 | Monitoring alerts | • Connection pooling config<br>• Rate limiting<br>• Load balancing<br>• Caching | LOW |
| **14** | **Lost user data on migration** | Schema changes, data transfer errors | User frustration, data loss | 9 | 3 | 27 | Migration testing | • Backup before migration<br>• Rollback plan<br>• Test on staging<br>• Gradual rollout | LOW |

### Email & Communication Failures

| # | Failure Mode | Potential Causes | Effects | Severity | Likelihood | Risk Priority | Detection Method | Mitigation Strategy | Residual Risk |
|---|--------------|------------------|---------|----------|------------|---------------|------------------|---------------------|---------------|
| **15** | **Verification email not received** | Spam filter, wrong email | User cannot access app | 7 | 6 | 42 | User report | • "Resend email" option<br>• Allow email change pre-verification<br>• Clear instructions<br>• Use reputable email service | MED |
| **16** | **Email service outage** | Third-party service down | Cannot send emails | 7 | 4 | 28 | Service monitoring | • Fallback email provider<br>• Queue system<br>• Retry logic<br>• Status page | MED |
| **17** | **Expired password reset link** | User delayed action | User frustration | 5 | 7 | 35 | User report | • Clear expiry time shown<br>• Easy to request new link<br>• 15-60 min expiry window | LOW |

### User Experience & Edge Cases

| # | Failure Mode | Potential Causes | Effects | Severity | Likelihood | Risk Priority | Detection Method | Mitigation Strategy | Residual Risk |
|---|--------------|------------------|---------|----------|------------|---------------|------------------|---------------------|---------------|
| **18** | **User forgets which email was used** | Multiple emails | Cannot log in | 6 | 6 | 36 | User report | • "Find my account" feature<br>• Support contact<br>• Social login as alternative | MED |
| **19** | **Password too complex to remember** | Strict requirements | Constant password resets | 4 | 8 | 32 | Analytics tracking | • Balanced requirements (8+ chars)<br>• Password manager encouragement<br>• "Show password" toggle ✅ | LOW |
| **20** | **Mobile app not responsive** | Design not mobile-first | Poor user experience | 5 | 3 | 15 | Mobile testing | • Responsive design ✅<br>• Touch-friendly buttons ✅<br>• Test on real devices | LOW |
| **21** | **User tries to sign up with existing email** | Forgot they have account | Confusion | 4 | 7 | 28 | Form validation | • Clear error message<br>• "Login instead" link<br>• "Forgot password" reminder | LOW |
| **22** | **Network timeout during signup** | Slow connection | Unclear if signup succeeded | 6 | 5 | 30 | Error handling | • Loading states<br>• Timeout handling<br>• Clear error messages<br>• Retry logic | LOW |

### Infrastructure & Deployment Failures

| # | Failure Mode | Potential Causes | Effects | Severity | Likelihood | Risk Priority | Detection Method | Mitigation Strategy | Residual Risk |
|---|--------------|------------------|---------|----------|------------|---------------|------------------|---------------------|---------------|
| **23** | **Environment variable missing** | Deployment misconfiguration | App crash, cannot authenticate | 9 | 4 | 36 | Build-time checks | • Validate env vars on startup<br>• CI/CD checks<br>• Default fallbacks where safe<br>• Documentation | LOW |
| **24** | **Supabase service outage** | Third-party dependency | Cannot authenticate | 8 | 2 | 16 | Status page monitoring | • Graceful degradation<br>• Cached sessions<br>• Status page<br>• SLA monitoring | MED |
| **25** | **Migration rollback needed** | Critical bug in production | User lockout | 8 | 3 | 24 | Monitoring, user reports | • Feature flags<br>• Rollback script ready<br>• Database backups<br>• Staged rollout | LOW |

---

## 📋 Implementation Phases

### **Phase 0: Vercel Setup** (30 minutes) ⚡
- [ ] Go to Vercel dashboard → Your project
- [ ] Navigate to "Storage" tab
- [ ] Click "Create Database" → Select "Supabase"
- [ ] Follow wizard (Vercel auto-configures everything)
- [ ] Verify all 13 environment variables are set
- [ ] Access Supabase dashboard via Vercel

### **Phase 1: Database Strategy & Schema** (4-6 hours)

**CRITICAL: Fix userId type first!**

#### **Step 1.1: Update Schema to UUID** (2 hours)
- [ ] Change `userId` from `text` to `uuid` in all tables:
  - `companies.userId`
  - `clusters.userId`
  - `user_sessions.userId`
- [ ] Create migration script for existing data
- [ ] Test migration on local database

#### **Step 1.2: Create New Tables** (1 hour)
- [ ] Create `profiles` table (NOT users!)
  - `id: uuid` (primary key, references `auth.users.id`)
  - `fullName`, `avatarUrl`, timestamps
- [ ] Create `user_settings` table
  - `userId: uuid` (references `auth.users.id`)
  - Settings fields
- [ ] Write Drizzle schema definitions

#### **Step 1.3: Set Up Post-Signup Hook** (1 hour)
- [ ] Write database trigger function `handle_new_user()`
- [ ] Attach trigger to `auth.users` INSERT
- [ ] Test: signup should auto-create profile + settings

#### **Step 1.4: Implement RLS Policies** (2 hours)
- [ ] Enable RLS on all tables
- [ ] Write policies for profiles, user_settings, companies, clusters
- [ ] Deploy policies to Supabase
- [ ] **Test with two users** - verify cross-user access fails

**Choose Your Path:**

**Path A: Full Supabase Migration**
- [ ] Export existing data from current PostgreSQL
- [ ] Update Drizzle connection to use `POSTGRES_URL` from Vercel
- [ ] Import/migrate existing data
- [ ] Add FK constraints to `profiles.id`
- [ ] Test all existing queries work

**Path B: Auth-Only (Easier, Recommended for MVP)**
- [ ] Keep existing PostgreSQL for app data
- [ ] Use Supabase connection for auth queries only
- [ ] No FK constraints yet (enforce in code)
- [ ] Add FKs later when fully migrating

### **Phase 2: Auth Package Setup** (1 hour)
- [ ] Install `@supabase/ssr` (Next.js 13+ App Router support)
- [ ] Create Supabase client utilities
  - Server-side client
  - Client-side client
  - Middleware client
- [ ] Set up Supabase client helpers

### **Phase 3: Core Authentication** (2-3 days)
- [ ] Implement signup flow
  - Email + password validation
  - Use Supabase Auth signup
  - Email verification (Supabase handles)
  - Create user record
- [ ] Implement login flow
  - Email + password
  - Supabase session management
  - Redirect to dashboard
- [ ] Implement logout
  - Clear Supabase session
  - Clear cookies
- [ ] Update AuthGuard component
  - Check Supabase session
  - Redirect to login if needed
- [ ] Create auth context/hooks for client-side
  - useAuth hook
  - useUser hook
  - User state management

### **Phase 4: Password Management** (1 day)
- [ ] Implement "Forgot Password" flow
  - Use Supabase resetPasswordForEmail()
  - Customize email template (Supabase dashboard)
- [ ] Implement "Reset Password" page
  - Handle token from email
  - Use Supabase updateUser()
  - Auto-invalidates old sessions
- [ ] Implement "Change Password" (in profile)
  - Require current password
  - Update via Supabase

### **Phase 5: UI/UX Pages** (2-3 days)
- [ ] Create login page (`/login`)
  - Beautiful design (based on your reference)
  - Email + password fields
  - "Forgot password?" link
  - "Sign up" link
  - Loading states, error handling
- [ ] Create signup page (`/signup`)
  - Full name, email, password
  - Password strength indicator
  - Terms acceptance
  - "Login" link
- [ ] Create forgot password page (`/forgot-password`)
- [ ] Create reset password page (`/reset-password`)
- [ ] Create email verification success page
- [ ] Make all pages mobile-responsive

### **Phase 6: Security & Polish** (1-2 days)
- [ ] Configure Supabase Auth settings
  - Session duration
  - Email templates
  - Redirect URLs
  - Social providers (if needed)
- [ ] Add rate limiting (Supabase has built-in)
- [ ] Configure Row Level Security (RLS) policies
- [ ] Email notifications for security events
- [ ] Security headers (CSP, etc.)
- [ ] Add loading and error states

### **Phase 7: Data Migration** (if Path A) (4-6 hours)
- [ ] Create migration script
- [ ] Backup current database
- [ ] Test migration on staging
- [ ] Run production migration
- [ ] Verify data integrity
- [ ] Update existing `userId` references

### **Phase 8: Testing** (1-2 days)

#### **Functional Testing**
- [ ] Test signup flow (email verification)
- [ ] Test login flow (various devices)
- [ ] Test password reset flow
- [ ] Test session management
- [ ] Test post-signup hook (profile + settings creation)

#### **Security Testing (CRITICAL)**
- [ ] **RLS Cross-User Tests:**
  - [ ] User A creates company, User B cannot access it
  - [ ] User A creates cluster, User B cannot access it
  - [ ] User A cannot update User B's profile
  - [ ] User A cannot view User B's settings
- [ ] Test session rotation on login
- [ ] Test session invalidation on password change
- [ ] Test rate limiting on auth endpoints

#### **Device & Environment Testing**
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Test preview branch deployments (redirect URLs)
- [ ] Test email delivery (verification, password reset)

#### **Performance & Load Testing**
- [ ] Load test auth endpoints (signup, login)
- [ ] Test database performance with RLS enabled
- [ ] Monitor Supabase connection pooling

### **Phase 9: Deployment** (1 day)
- [ ] Deploy to preview branch first
- [ ] Test thoroughly
- [ ] Deploy to production
- [ ] Monitor auth metrics
- [ ] User acceptance testing
- [ ] Monitor error logs

**Total Estimated Time:**
- **Path A (Full Migration): 10-12 days**
- **Path B (Auth Only): 7-9 days**

---

## 📝 Next Steps

### **STEP 1: You Set Up Vercel Integration** (5 minutes) 🚀

**Do this now:**
1. Open your Vercel dashboard
2. Go to your `gtm-map` project
3. Click "Storage" tab
4. Click "Create Database"
5. Select "Supabase"
6. Follow the wizard (Vercel handles everything)
7. Verify all environment variables are set

**That's it!** Vercel will auto-configure everything.

---

### **STEP 2: Answer These Key Questions** ❓

#### **Critical Decisions:**

1. **📊 Database Migration Path:**
   - [ ] **Path A:** Full Supabase (migrate all data) - Clean architecture
   - [ ] **Path B:** Auth-only (keep existing DB) - Easier transition
   - **How much data do you have?** (companies, prospects count)

2. **🎨 Design Reference:**
   - **Please share** the design/screenshot you mentioned
   - Any brand colors, logo, or design system?
   - Preferred style: Minimal, Modern, Corporate?

3. **🔐 Email Verification:**
   - [ ] **Required** before app access (more secure)
   - [ ] **Optional** (easier onboarding, verify later)

4. **👥 Registration Flow:**
   - [ ] **Open registration** (anyone can sign up)
   - [ ] **Invite-only** (require invite code)
   - [ ] **Waitlist** (request access first)

5. **🌐 Social Authentication:** (Easy to add with Supabase)
   - [ ] Google Sign-In
   - [ ] GitHub Sign-In
   - [ ] LinkedIn Sign-In
   - [ ] Email/password only (for now)

6. **⏱️ Session Duration:**
   - [ ] 7 days (recommended)
   - [ ] 30 days (longer)
   - [ ] 24 hours (more secure)

7. **📱 Multi-Device Sessions:**
   - [ ] Yes - Allow login on multiple devices
   - [ ] No - Logout on new device

8. **📧 Email Templates:**
   - Use Supabase default templates?
   - Or customize with your branding?

---

### **STEP 3: I'll Implement** (7-12 days)

Once you complete Steps 1 & 2, I will:

1. ✅ Finalize technical specifications
2. ✅ Create database migration strategy
3. ✅ Design beautiful UI components (based on your reference)
4. ✅ Implement all auth flows
5. ✅ Set up security measures
6. ✅ Test thoroughly
7. ✅ Deploy to production

---

## 🎯 Success Metrics

After implementation, we'll measure:
- **Security:** Zero security incidents, all FMEA mitigations in place
- **Reliability:** 99.9% auth success rate
- **Performance:** < 500ms login time (Supabase is fast!)
- **User Experience:** 
  - Smooth signup/login flow
  - Mobile-responsive design
  - Clear error messages
  - < 5% support tickets related to auth
- **Migration Success:** All data migrated without loss (if Path A)

---

## 🚀 **Ready to Start!**

**What You Need to Do NOW:**

1. ✅ **Set up Vercel + Supabase integration** (5 mins)
2. ✅ **Share design reference** 🎨
3. ✅ **Answer the 8 questions** above
4. ✅ **Choose Path A or B** for database

**Once you complete these, we'll start building immediately!**

The plan is ready. The FMEA is done. Vercel integration makes this incredibly smooth.

**Let's build this! 🎉**

