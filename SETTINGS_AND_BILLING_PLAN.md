# Settings & Billing Architecture Plan

**Branch**: `settings-and-billing`  
**Status**: Planning Phase (Revised)  
**Last Updated**: October 11, 2025

---

## Executive Summary

With Supabase Auth in place, we're ready to add user settings and monetization. This plan outlines a **lightweight MVP** for settings management and Stripe-based billing that's upgradeable to organizations and tiered pricing.

### Key Decisions
- **✅ Recommended**: Stripe for billing (industry standard, great DX, webhooks, hosted checkout)
- **Settings Scope**: Profile, preferences, notifications (API keys deferred to Phase 2)
- **Billing Scope**: Single-user subscriptions with usage limits
- **Future-Proof**: Architecture supports upgrade to organizations + team billing

### ⚠️ Critical Design Principles (Revised)
- **No fake Stripe IDs** → NULL until first checkout, create real customer server-side
- **Separate usage from subscriptions** → Atomic counters in dedicated table
- **Plan prices as first-class entities** → Multiple prices per plan (monthly/yearly)
- **Webhook idempotency** → Store processed event IDs, handle retries safely
- **Service-role for billing writes** → Users can only read, webhooks update
- **Tax/SCA enabled** → Stripe Tax + 3DS for UK/EU compliance

---

## 1. Proposed Architecture

### A. Settings Management

#### **User Settings Table** (Already Exists)
From auth migration, we have:
```typescript
user_settings {
  user_id: uuid (PK, FK → auth.users.id)
  timezone: text (default 'Europe/London')
  created_at: timestamptz
  updated_at: timestamptz
}
```

#### **Expanded Settings Schema** (MVP)
```typescript
user_settings {
  user_id: uuid (PK, FK → auth.users.id ON DELETE CASCADE)
  
  // Profile Settings
  timezone: text (default 'Europe/London')
  language: text (default 'en')
  
  // Notification Preferences (consent storage only - no email sending yet)
  // These are just toggles for future use; this sprint only stores preferences
  email_notifications: boolean (default true)
  weekly_digest: boolean (default true)
  prospect_updates: boolean (default true)
  
  // App Preferences
  default_view: text (default 'prospects') // 'prospects' | 'clusters' | 'ads'
  prospects_per_page: integer (default 50)
  auto_expand_companies: boolean (default false)
  
  // API & Integrations (Future)
  api_key_hash: text (nullable) // For future API access
  
  // Metadata
  created_at: timestamptz (default now())
  updated_at: timestamptz (default now())
}
```

#### **Settings UI Categories**
```
/settings
  ├── /profile          → Name, email, avatar, timezone, language
  ├── /preferences      → App behavior, display options
  ├── /notifications    → Email preferences toggles (storage only, no email sending yet)
  ├── /billing          → Subscription, usage, payment methods
  └── /api              → API keys, webhooks (Phase 2)
```

#### **Notification Scoping Decision** ⚠️

**This Sprint (In Scope)**:
- ✅ Store notification preferences in `user_settings` (boolean fields)
- ✅ Build `/settings/notifications` page with toggles
- ✅ Rely on existing transactional emails:
  - Supabase Auth: email verification, password reset
  - Stripe: receipts, invoices, payment failures (configured in Stripe Dashboard)

**Future Sprint (Out of Scope)**:
- ❌ Digest/alerts system (weekly summaries, usage reminders)
- ❌ Notification service (queue, worker, templates, scheduling)
- ❌ Email provider integration (Postmark/Resend/SendGrid)
- ❌ SPF/DKIM/DMARC setup for custom domain
- ❌ In-app notifications
- ❌ Delivery retries, dead-letter queues, audit logs

**Why**: Notifications are orthogonal to billing. Bundling them now increases blast radius (deliverability, consent management, scheduling) without helping the billing MVP ship.

**Future-Proofing**:
1. **Consent Model**: Boolean fields in `user_settings` are the single source of truth
2. **Event Contract**: When building notifications, emit events (`user.plan_changed`, `usage.cap_reached`) that the notification service subscribes to

**Acceptance Criteria (Notifications Slice)**:
- [ ] Toggles exist in `/settings/notifications` and persist to DB
- [ ] Stripe/Supabase transactional emails work as-is
- [ ] No marketing/digest emails are sent yet
- [ ] Docs note: "Notification system deferred to future sprint"

---

### B. Billing Architecture

#### **Chosen Provider: Stripe**

**Why Stripe?**
- ✅ Industry standard with excellent DX
- ✅ Hosted Checkout (no PCI compliance needed)
- ✅ Customer Portal (self-service billing)
- ✅ Webhooks for real-time sync
- ✅ Test mode for development
- ✅ Vercel + Stripe integration available
- ✅ Supports subscriptions, metered billing, usage-based pricing
- ✅ Multi-currency, tax handling, invoices

#### **Billing Tables** (New - Revised Schema)

```typescript
// 1. Plan Definitions (static or seeded)
subscription_plans {
  id: text (PK) // 'free', 'starter', 'pro'
  name: text // 'Free', 'Starter', 'Pro'
  
  // Limits (source of truth)
  max_prospects: integer // -1 = unlimited
  max_clusters: integer // -1 = unlimited
  max_ai_generations_per_month: integer // -1 = unlimited
  max_decision_makers_per_company: integer // -1 = unlimited
  includes_api_access: boolean
  includes_priority_support: boolean
  
  // Metadata
  description: text
  features_json: jsonb // List of feature highlights
  is_active: boolean (default true)
  sort_order: integer
  created_at: timestamptz
  updated_at: timestamptz
}

// 2. Plan Prices (multiple prices per plan for monthly/yearly)
plan_prices {
  plan_id: text (FK → subscription_plans.id ON DELETE CASCADE)
  cadence: text (CHECK in ('monthly', 'yearly'))
  stripe_price_id: text (NOT NULL, unique)
  amount: integer // In cents (e.g., 2900, 29000)
  currency: text (default 'gbp') // UK-first
  
  PRIMARY KEY (plan_id, cadence)
}

// 3. User Subscriptions (lean, Stripe is source of truth)
user_subscriptions {
  user_id: uuid (PK, FK → auth.users.id ON DELETE CASCADE)
  
  // Stripe Data (NULL until first checkout)
  stripe_customer_id: text (nullable, unique)
  stripe_subscription_id: text (nullable)
  stripe_price_id: text (nullable)
  
  // Subscription State
  plan_id: text (FK → subscription_plans.id, default 'free')
  status: text (default 'active') // mirrors Stripe: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
  
  // Dates (managed by webhooks)
  current_period_start: timestamptz (nullable)
  current_period_end: timestamptz (nullable)
  canceled_at: timestamptz (nullable)
  
  // Metadata
  created_at: timestamptz (default now())
  updated_at: timestamptz (default now())
}

// 4. Usage Counters (atomic, per-metric, per-period)
usage_counters {
  user_id: uuid (FK → auth.users.id ON DELETE CASCADE)
  metric: text (CHECK in ('ai_generations', 'prospects', 'clusters'))
  period_start: date (NOT NULL) // Month bucket (UTC, e.g., '2025-10-01')
  used: integer (default 0)
  
  PRIMARY KEY (user_id, metric, period_start)
}

// 5. Billing Transactions (audit trail)
billing_transactions {
  id: serial (PK)
  user_id: uuid (FK → auth.users.id ON DELETE CASCADE)
  stripe_invoice_id: text (unique, NOT NULL)
  
  amount: integer // In cents
  currency: text (default 'gbp')
  status: text // 'paid' | 'open' | 'void' | 'uncollectible'
  
  invoice_pdf_url: text (nullable)
  invoice_number: text (nullable)
  billing_reason: text // 'subscription_create' | 'subscription_cycle' | 'subscription_update'
  
  created_at: timestamptz (default now())
}

// 6. Webhook Idempotency (prevent duplicate processing)
stripe_events {
  id: text (PK) // event.id from Stripe
  received_at: timestamptz (default now())
}
```

#### **Indexes** (Performance)
```sql
-- Plan prices lookup
CREATE UNIQUE INDEX plan_prices_stripe_price_idx ON plan_prices (stripe_price_id);

-- User subscriptions (user_id is PK, auto-indexed)
CREATE INDEX user_subscriptions_stripe_customer_idx ON user_subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX user_subscriptions_status_idx ON user_subscriptions (status) WHERE status != 'active';

-- Usage counters (composite PK auto-indexed, but add for period queries)
CREATE INDEX usage_counters_period_idx ON usage_counters (period_start DESC);

-- Billing history
CREATE INDEX billing_transactions_user_id_idx ON billing_transactions (user_id);
CREATE INDEX billing_transactions_created_at_idx ON billing_transactions (created_at DESC);

-- Webhook idempotency is PK, auto-indexed
```

#### **RLS Policies** (Security - Revised)

**Critical**: Users can **only read** their billing data. Webhooks use **service role** (bypasses RLS) for writes.

```sql
-- 1. Subscription Plans (public read, all active plans)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_plans ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 2. Plan Prices (public read, joined with plans)
ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_prices ON plan_prices
  FOR SELECT USING (true);

-- 3. User Subscriptions (users: read-only; webhooks: service role)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_subscription_read ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies → only service role can write

-- 4. Usage Counters (users: read-only; app: service role increments)
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_usage_read ON usage_counters
  FOR SELECT USING (user_id = auth.uid());
-- Increments done server-side with service role

-- 5. Billing Transactions (users: read-only audit trail)
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_transactions_read ON billing_transactions
  FOR SELECT USING (user_id = auth.uid());

-- 6. Webhook Idempotency (internal only, no user access)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY no_user_access ON stripe_events
  FOR SELECT USING (false);
-- Only service role queries this
```

**Service Role Usage**:
- Webhooks: Use `createClient` with `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- API routes enforcing limits: Use service role to read plans + increment counters
- Users never touch billing tables directly

---

## 2. Proposed Pricing Tiers (MVP)

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| **Price** | $0 | $29/mo | $99/mo | Custom |
| **Prospects** | 50 | 500 | Unlimited | Unlimited |
| **AI Generations/mo** | 10 | 100 | 500 | Unlimited |
| **Decision Makers/Company** | 3 | 10 | Unlimited | Unlimited |
| **Clusters** | 5 | Unlimited | Unlimited | Unlimited |
| **Export (CSV/Brief)** | ✅ | ✅ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Custom Integrations** | ❌ | ❌ | ❌ | ✅ |
| **SLA** | - | - | 99.5% | 99.9% |

**Notes**:
- Free tier = generous MVP limits to let users test the product
- Starter = Individual consultants, small agencies
- Pro = Growing teams (pre-organization feature)
- Enterprise = Custom pricing, contact sales (Phase 2+)

**Stripe Setup**:
1. Create products in Stripe Dashboard
2. Create monthly + yearly prices for each tier
3. Store `stripe_price_id` in `subscription_plans` table

---

## 3. Implementation Phases

### **Phase 0: Vercel + Stripe Setup**
**Time**: 30 minutes

1. **Install Stripe in Vercel**
   - Go to Vercel Dashboard → Integrations → Stripe
   - Connect Stripe account (use Test Mode for MVP)
   - Auto-configures env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

2. **Create Stripe Products** (in Stripe Dashboard)
   - Product: "Starter Plan" → Price: $29/month, $290/year
   - Product: "Pro Plan" → Price: $99/month, $990/year
   - Copy Price IDs for database seeding

3. **Enable Customer Portal** (Stripe Dashboard → Settings → Billing → Customer Portal)
   - Allow customers to update payment methods
   - Allow plan upgrades/downgrades
   - Allow subscription cancellation

---

### **Phase 1: Database Schema & Seeding**
**Time**: 1-2 hours

**Steps**:
1. Create migration SQL for new tables
2. Seed `subscription_plans` with Free/Starter/Pro
3. Add trigger to auto-create free subscription on user signup
4. Update `user_settings` schema with expanded fields
5. Test RLS policies

**Migration Script** (`migrations/billing_schema.sql`) - **REVISED**:
```sql
-- ============================================
-- BILLING & SETTINGS MIGRATION (Revised)
-- No fake Stripe IDs, separate usage tracking
-- ============================================

-- 1. Expand user_settings (defer API keys to Phase 2)
ALTER TABLE user_settings
ADD COLUMN language text DEFAULT 'en',
ADD COLUMN email_notifications boolean DEFAULT true,
ADD COLUMN weekly_digest boolean DEFAULT true,
ADD COLUMN prospect_updates boolean DEFAULT true,
ADD COLUMN default_view text DEFAULT 'prospects',
ADD COLUMN prospects_per_page integer DEFAULT 50,
ADD COLUMN auto_expand_companies boolean DEFAULT false,
ADD COLUMN updated_at timestamptz DEFAULT now();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Create subscription_plans (source of truth for limits)
CREATE TABLE subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  max_prospects integer NOT NULL,
  max_clusters integer NOT NULL,
  max_ai_generations_per_month integer NOT NULL,
  max_decision_makers_per_company integer NOT NULL,
  includes_api_access boolean DEFAULT false,
  includes_priority_support boolean DEFAULT false,
  description text,
  features_json jsonb,
  is_active boolean DEFAULT true,
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_plans ON subscription_plans
  FOR SELECT USING (is_active = true);

CREATE TRIGGER subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Create plan_prices (multiple prices per plan)
CREATE TABLE plan_prices (
  plan_id text REFERENCES subscription_plans(id) ON DELETE CASCADE,
  cadence text CHECK (cadence IN ('monthly', 'yearly')) NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  currency text DEFAULT 'gbp',
  PRIMARY KEY (plan_id, cadence)
);

ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_prices ON plan_prices
  FOR SELECT USING (true);

CREATE UNIQUE INDEX plan_prices_stripe_price_idx ON plan_prices (stripe_price_id);

-- 4. Create user_subscriptions (lean, Stripe is source of truth)
CREATE TABLE user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,               -- NULL until first checkout
  stripe_subscription_id text,
  stripe_price_id text,
  plan_id text NOT NULL REFERENCES subscription_plans(id) DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_subscription_read ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX user_subscriptions_stripe_customer_idx ON user_subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX user_subscriptions_status_idx ON user_subscriptions (status) WHERE status != 'active';

CREATE TRIGGER user_subscriptions_updated_at
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Create usage_counters (atomic, per-metric, per-period)
CREATE TABLE usage_counters (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text CHECK (metric IN ('ai_generations', 'prospects', 'clusters')) NOT NULL,
  period_start date NOT NULL,                   -- Month bucket (e.g., '2025-10-01')
  used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, metric, period_start)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_usage_read ON usage_counters
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX usage_counters_period_idx ON usage_counters (period_start DESC);

-- 6. Create billing_transactions (audit trail)
CREATE TABLE billing_transactions (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'gbp',
  status text NOT NULL,
  invoice_pdf_url text,
  invoice_number text,
  billing_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_transactions_read ON billing_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX billing_transactions_user_id_idx ON billing_transactions (user_id);
CREATE INDEX billing_transactions_created_at_idx ON billing_transactions (created_at DESC);

-- 7. Create webhook idempotency store
CREATE TABLE stripe_events (
  id text PRIMARY KEY,                          -- event.id from Stripe
  received_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY no_user_access ON stripe_events
  FOR SELECT USING (false);

-- 8. Seed plans (FREE/STARTER/PRO)
INSERT INTO subscription_plans (id, name, max_prospects, max_clusters, max_ai_generations_per_month, max_decision_makers_per_company, sort_order, description, features_json) VALUES
('free', 'Free', 50, 5, 10, 3, 1, 'Perfect for testing and small projects', '["50 prospects", "10 AI generations/mo", "5 clusters", "Basic export"]'::jsonb),
('starter', 'Starter', 500, -1, 100, 10, 2, 'For individual consultants and small agencies', '["500 prospects", "100 AI generations/mo", "Unlimited clusters", "Full export suite"]'::jsonb),
('pro', 'Pro', -1, -1, 500, -1, 3, 'For growing teams and power users', '["Unlimited prospects", "500 AI generations/mo", "Unlimited clusters", "API access", "Priority support"]'::jsonb);

-- 9. Seed plan prices (you'll replace stripe_price_id after creating in Stripe Dashboard)
-- For now, use placeholder 'price_starter_monthly' etc., then update after Stripe setup
INSERT INTO plan_prices (plan_id, cadence, stripe_price_id, amount, currency) VALUES
('starter', 'monthly', 'price_starter_monthly_placeholder', 2900, 'gbp'),
('starter', 'yearly', 'price_starter_yearly_placeholder', 29000, 'gbp'),
('pro', 'monthly', 'price_pro_monthly_placeholder', 9900, 'gbp'),
('pro', 'yearly', 'price_pro_yearly_placeholder', 99000, 'gbp');

-- NOTE: After creating products/prices in Stripe, run:
-- UPDATE plan_prices SET stripe_price_id = 'price_ACTUAL_ID_FROM_STRIPE' WHERE stripe_price_id = 'price_starter_monthly_placeholder';

-- 10. Post-signup hook: create free subscription (NO fake Stripe ID)
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER create_user_subscription_trigger
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION create_user_subscription();
```

**Key Changes**:
- ✅ No fake `stripe_customer_id` → NULL until first checkout
- ✅ Separate `usage_counters` table for atomic increments
- ✅ `plan_prices` for monthly/yearly pricing
- ✅ `stripe_events` for webhook idempotency
- ✅ RLS: users read-only, service role writes
- ✅ GBP currency (UK-first)
- ✅ Placeholder price IDs (update after Stripe setup)

---

### **Phase 2: Backend - Stripe Integration**
**Time**: 3-4 hours

**Files to Create**:

1. **`src/lib/stripe.ts`** - Stripe client + helpers
2. **`src/lib/billing.ts`** - Billing logic & limit checks
3. **`src/app/api/stripe/checkout/route.ts`** - Create checkout session
4. **`src/app/api/stripe/portal/route.ts`** - Customer portal session
5. **`src/app/api/stripe/webhook/route.ts`** - Stripe webhook handler

**Key Functions** (Revised):

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

// Use stable API version from dashboard (not future date)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Pin to stable version
  typescript: true,
});

// src/lib/supabase/service.ts (NEW - service role client for billing writes)
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NOT anon key
  { auth: { persistSession: false } }
);

// src/lib/billing.ts
import { supabaseAdmin } from './supabase/service';

export async function checkLimit(
  userId: string,
  metric: 'ai_generations' | 'prospects' | 'clusters'
): Promise<{ allowed: boolean; limit: number; used: number; remaining: number }> {
  // 1. Get user's subscription + plan
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan_id, subscription_plans(max_*)')
    .eq('user_id', userId)
    .single();
  
  if (!subscription) throw new Error('No subscription found');
  
  const plan = subscription.subscription_plans;
  const limit = plan[`max_${metric}_per_month`];
  
  if (limit === -1) {
    // Unlimited
    return { allowed: true, limit: -1, used: 0, remaining: -1 };
  }
  
  // 2. Get current period usage
  const periodStart = getMonthStart(); // '2025-10-01'
  const { data: counter } = await supabaseAdmin
    .from('usage_counters')
    .select('used')
    .eq('user_id', userId)
    .eq('metric', metric)
    .eq('period_start', periodStart)
    .single();
  
  const used = counter?.used || 0;
  const remaining = limit - used;
  const allowed = remaining > 0;
  
  return { allowed, limit, used, remaining };
}

export async function incrementUsage(
  userId: string,
  metric: 'ai_generations' | 'prospects' | 'clusters'
): Promise<void> {
  const periodStart = getMonthStart();
  
  // Atomic upsert: increment if exists, insert if not
  await supabaseAdmin.rpc('increment_usage', {
    p_user_id: userId,
    p_metric: metric,
    p_period_start: periodStart
  });
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
```

**Database Function for Atomic Increment**:
```sql
-- Add to migration
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id uuid,
  p_metric text,
  p_period_start date
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_counters (user_id, metric, period_start, used)
  VALUES (p_user_id, p_metric, p_period_start, 1)
  ON CONFLICT (user_id, metric, period_start)
  DO UPDATE SET used = usage_counters.used + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Webhook Events to Handle** (Critical):
- `checkout.session.completed` → Create/update Stripe customer, activate subscription
- `customer.subscription.updated` → Update plan_id, status, period dates
- `customer.subscription.deleted` → Set plan_id='free', status='canceled', canceled_at=now()
- `invoice.paid` → Record in billing_transactions
- `invoice.payment_failed` → Update status='past_due', send alert

**Webhook Security** (Must-Have):
```typescript
// Verify signature on every request
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

// Check idempotency
const { data: exists } = await supabaseAdmin
  .from('stripe_events')
  .select('id')
  .eq('id', event.id)
  .single();

if (exists) {
  return new Response('Already processed', { status: 200 });
}

// Process event...

// Mark as processed
await supabaseAdmin.from('stripe_events').insert({ id: event.id });
```

---

### **Phase 3: Frontend - Settings UI**
**Time**: 4-5 hours

**Pages to Create**:

1. **`src/app/settings/layout.tsx`** - Settings sidebar navigation
2. **`src/app/settings/profile/page.tsx`** - Profile settings
3. **`src/app/settings/preferences/page.tsx`** - App preferences
4. **`src/app/settings/notifications/page.tsx`** - Notification settings
5. **`src/app/settings/billing/page.tsx`** - Subscription & billing

**UI Components**:
- `SettingsSidebar` - Navigation for settings sections
- `PlanCard` - Display plan features + CTA
- `UsageProgress` - Show current usage vs. limits
- `BillingHistory` - Table of past invoices

**Settings Layout** (Mobile-Responsive):
```
┌─────────────────────────────────────┐
│  Settings                           │
├─────────┬───────────────────────────┤
│ Profile │ John Doe                  │
│ Prefs   │ john@example.com          │
│ Notify  │ [Avatar Upload]           │
│ Billing │ Timezone: Europe/London   │
│ API     │ Language: English         │
└─────────┴───────────────────────────┘
```

---

### **Phase 4: Limit Enforcement**
**Time**: 2-3 hours

**Where to Enforce Limits**:

1. **`/api/generate-more/route.ts`**
   - Check `ai_generations` limit before processing
   - Increment counter on success
   - Return upgrade prompt if limit reached

2. **`/api/decision-makers/route.ts`**
   - Check `decision_makers` limit before generating
   - Return upgrade prompt if limit reached

3. **`/api/prospects/route.ts`** (POST - manual add)
   - Check `prospects` limit before inserting
   - Return upgrade prompt if limit reached

4. **`/api/analyse/route.ts`** (clustering)
   - Check `clusters` limit before creating
   - Return upgrade prompt if limit reached

**UI Changes**:
- Show usage badges in header: "🔥 3/10 AI generations used"
- Show upgrade prompts when limits hit
- Disable buttons when at limit (with tooltip)

---

### **Phase 5: Billing UI & Flow**
**Time**: 3-4 hours

**Billing Page Features**:
1. **Current Plan Card** → Plan name, features, usage, next billing date
2. **Upgrade/Downgrade** → Show available plans with "Upgrade" buttons
3. **Payment Methods** → Link to Stripe Customer Portal
4. **Billing History** → Table of past invoices with PDF links
5. **Cancel Subscription** → Link to Stripe Customer Portal

**Checkout Flow**:
1. User clicks "Upgrade to Pro"
2. API creates Stripe Checkout Session
3. Redirect to Stripe Hosted Checkout
4. User pays
5. Webhook updates subscription
6. Redirect back to `/settings/billing?success=true`
7. Show success message

**Customer Portal Flow**:
1. User clicks "Manage Billing"
2. API creates Stripe Customer Portal Session
3. Redirect to Stripe Portal
4. User updates payment/cancels
5. Redirect back to `/settings/billing`

---

### **Phase 6: Testing**
**Time**: 2-3 hours

**Test Cases**:

1. **Settings CRUD**
   - Update profile → saves correctly
   - Change preferences → persists across sessions
   - Toggle notifications → updates in DB

2. **Billing Flows**
   - Free user upgrades to Starter → subscription created
   - Starter user upgrades to Pro → subscription updated
   - Pro user downgrades to Starter → prorated refund issued
   - User cancels subscription → reverts to Free at period end

3. **Limit Enforcement**
   - Free user hits 10 AI generations → blocked, shown upgrade prompt
   - Starter user adds 501st prospect → blocked
   - Pro user (unlimited) → no blocks

4. **Webhooks**
   - Mock webhook events in Stripe CLI
   - Verify subscription status updates
   - Verify transaction records created

5. **RLS Security**
   - User A cannot read User B's subscription
   - User A cannot update User B's settings

---

## 4. Future Upgrade Path: Organizations

When ready to add organizations (Phase 2), the architecture supports it:

**New Tables**:
```typescript
organizations {
  id: uuid (PK)
  name: text
  slug: text (unique)
  owner_user_id: uuid (FK → auth.users.id)
  subscription_id: integer (FK → user_subscriptions.id)
  created_at: timestamptz
}

organization_memberships {
  id: serial (PK)
  org_id: uuid (FK → organizations.id ON DELETE CASCADE)
  user_id: uuid (FK → auth.users.id ON DELETE CASCADE)
  role: text // 'owner' | 'admin' | 'member' | 'viewer'
  created_at: timestamptz
}
```

**Migration Path**:
1. Move `user_subscriptions.user_id` → `user_subscriptions.org_id`
2. Create default organization for existing users
3. Add org_id to `companies`, `clusters`, etc.
4. Update RLS policies to check org membership

**Billing Changes**:
- Organization pays, not individual users
- Seat-based pricing: "$99/mo for 5 users, +$20/user"
- Owner manages billing, members use product

---

## 5. Security & Safety Rails (Revised)

### **Critical Guardrails** ⚠️

**Never do these**:
- ❌ Generate fake Stripe IDs (customer, subscription, price)
- ❌ Store raw credit card numbers or CVVs
- ❌ Allow users to write to `user_subscriptions`, `usage_counters`, or `billing_transactions`
- ❌ Read-then-increment usage counters (use atomic DB function)
- ❌ Process webhook without signature verification
- ❌ Process same webhook event twice (check idempotency)
- ❌ Hardcode limits in code (read from `subscription_plans`)

**Always do these**:
- ✅ Use Stripe Hosted Checkout (PCI compliant, no raw PAN)
- ✅ Use service role (`SUPABASE_SERVICE_ROLE_KEY`) for billing writes
- ✅ Verify webhook signatures on every request
- ✅ Store processed event IDs in `stripe_events` table
- ✅ Allow `stripe_customer_id` to be NULL until first checkout
- ✅ Create real Stripe customer server-side when needed
- ✅ Atomic usage increments via `increment_usage()` DB function
- ✅ Read limits from `subscription_plans` (single source of truth)
- ✅ Enable Stripe Tax + 3DS/SCA for UK/EU compliance
- ✅ Use GBP as default currency (UK-first market)

### **Webhook Security** (Implementation)
```typescript
// src/app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  
  // 1. Verify signature (reject if invalid)
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }
  
  // 2. Check idempotency (already processed?)
  const { data: exists } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single();
  
  if (exists) {
    console.log(`Event ${event.id} already processed`);
    return new Response('Already processed', { status: 200 });
  }
  
  // 3. Process event based on type
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    // ... other events
  }
  
  // 4. Mark as processed
  await supabaseAdmin.from('stripe_events').insert({ id: event.id });
  
  return new Response('OK', { status: 200 });
}
```

### **Checkout Flow** (Create Real Customer)
```typescript
// src/app/api/stripe/checkout/route.ts
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/service';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  const { planId, cadence } = await request.json();
  
  // Get Stripe price ID for plan + cadence
  const { data: price } = await supabaseAdmin
    .from('plan_prices')
    .select('stripe_price_id')
    .eq('plan_id', planId)
    .eq('cadence', cadence)
    .single();
  
  if (!price) return new Response('Invalid plan', { status: 400 });
  
  // Get or create Stripe customer
  let { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();
  
  let customerId = subscription?.stripe_customer_id;
  
  if (!customerId) {
    // Create real Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name,
      metadata: { user_id: user.id },
    });
    
    customerId = customer.id;
    
    // Save customer ID (service role, bypasses RLS)
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: price.stripe_price_id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
    automatic_tax: { enabled: true }, // Enable Stripe Tax
    metadata: { user_id: user.id },
  });
  
  return Response.json({ url: session.url });
}
```

### **Rate Limiting** (Optional for MVP)
- Webhook endpoint: Already protected by signature verification
- API routes: 100 req/min per user (implement with Upstash Redis or Vercel KV)
- AI generation: Enforced by plan limits + usage counters

---

## 6. Environment Variables (Updated)

**Required** (from Vercel + Stripe integration + Supabase):
```bash
# Stripe (auto-configured by Vercel integration)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase (already set from auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb... (public, safe to expose)

# NEW: Supabase Service Role (for billing writes)
SUPABASE_SERVICE_ROLE_KEY=eyJhb... (SECRET, server-only, bypasses RLS)

# App Config
NEXT_PUBLIC_SITE_URL=http://localhost:3000 (or https://gtm-map.vercel.app)
```

**Where to get `SUPABASE_SERVICE_ROLE_KEY`**:
1. Go to Supabase Dashboard → Project Settings → API
2. Copy "service_role" key (NOT the anon key)
3. Add to Vercel env vars (mark as "Secret")
4. ⚠️ **Never expose this key client-side** (no `NEXT_PUBLIC_` prefix)

---

## 7. MVP Acceptance Criteria (Revised - Ship Checklist)

Ship when **all** of these pass:

### **Settings**
- [ ] User can update profile (name, timezone, language)
- [ ] User can update app preferences (default view, pagination)
- [ ] User can toggle notification preferences
- [ ] Settings persist across sessions
- [ ] RLS blocks cross-user access (tested)

### **Billing - Checkout & Customer**
- [ ] User can view current plan and usage (limits + counters)
- [ ] Stripe customer created server-side (real ID, not fake)
- [ ] User can upgrade from Free → Starter/Pro via Stripe Checkout
- [ ] User can downgrade/cancel via Stripe Customer Portal
- [ ] Stripe Tax + 3DS enabled (UK/EU compliant)
- [ ] GBP currency used (or multi-currency configured)

### **Billing - Webhooks**
- [ ] Webhook signature verification works (reject invalid)
- [ ] Idempotency: duplicate events ignored (test with Stripe CLI)
- [ ] `checkout.session.completed` → subscription activated
- [ ] `customer.subscription.updated` → plan/status/dates updated
- [ ] `customer.subscription.deleted` → downgrade to free
- [ ] `invoice.paid` → transaction recorded
- [ ] `invoice.payment_failed` → status updated to `past_due`

### **Limits - Enforcement**
- [ ] Free user blocked at 10 AI generations (with upgrade prompt)
- [ ] Free user blocked at 50 prospects
- [ ] Free user blocked at 5 clusters
- [ ] Starter user blocked at 100 AI generations
- [ ] Starter user blocked at 500 prospects
- [ ] Pro user has no blocks (unlimited where applicable)
- [ ] Usage counters increment atomically (no race conditions)
- [ ] Limits read from `subscription_plans` (no hardcoded values)

### **Security**
- [ ] Webhook signatures verified (test with Stripe CLI)
- [ ] Idempotency store prevents duplicate processing
- [ ] RLS policies: users can only read, service role writes
- [ ] No sensitive payment data stored in app DB (only Stripe IDs)
- [ ] All billing routes require authentication
- [ ] Service role key never exposed client-side
- [ ] Cross-user data access blocked (RLS tested with 2+ users)

### **Testing Proof**
- [ ] Concurrent usage increment test (10 parallel requests → accurate count)
- [ ] Webhook replay test (send same event twice → processed once)
- [ ] RLS cross-user test (User A can't read User B's subscription)
- [ ] Plan change test (upgrade → downgrade → cancel → flows work)

---

## 8. Open Questions

Before implementation, answer these:

1. **Pricing Validation**  
   - Are $29/$99 the right price points for your market?
   - Should we offer annual discounts (e.g., 2 months free)?

2. **Free Trial**  
   - Should paid plans include a 14-day free trial?
   - Or let users start on Free and upgrade when ready?

3. **Overage Handling**  
   - If Starter user hits 100 AI generations mid-month, what happens?
     - **Option A**: Hard block + upgrade prompt (recommended for MVP)
     - **Option B**: Allow overage, charge per-unit ($1 per 10 generations)
   - If Pro user exceeds 500 AI generations/mo?
     - **Option A**: Soft cap, no blocking (recommended)
     - **Option B**: Charge for overages

4. **Grandfather Existing Users**  
   - Should current users (you) be grandfathered into a special plan?
   - Or start everyone on Free and let them upgrade?

5. **Internationalization**  
   - Multi-currency support (USD, EUR, GBP)?
   - Or USD-only for MVP?

6. **Refund Policy**  
   - Allow downgrades with prorated refunds?
   - Or downgrades take effect at period end?

7. **Enterprise Plan**  
   - "Contact Sales" or immediate checkout?
   - MVP: Just show "Coming Soon" badge?

---

## Next Steps

1. **Review this plan** → Answer open questions above
2. **Approve pricing tiers** → Confirm Free/Starter/Pro limits
3. **Setup Stripe in Vercel** → Get test keys
4. **I implement Phase 0-6** → Full settings + billing
5. **You test end-to-end** → Upgrade, downgrade, limits
6. **Deploy to production** → Switch Stripe to live mode
7. **Launch! 🚀**

---

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 0 | Vercel + Stripe setup | 30 min |
| 1 | Database schema + migration | 1-2 hours |
| 2 | Backend Stripe integration | 3-4 hours |
| 3 | Frontend settings UI | 4-5 hours |
| 4 | Limit enforcement | 2-3 hours |
| 5 | Billing UI & flow | 3-4 hours |
| 6 | Testing | 2-3 hours |
| **Total** | **MVP Ready** | **16-22 hours** |

**With focus**: 2-3 full working days  
**With testing/polish**: 4-5 days

---

## Summary of Revisions (Addressing Feedback)

### ✅ **What Was Fixed**

1. **No Fake Stripe IDs** → `stripe_customer_id` is now NULL until first checkout; real customer created server-side
2. **Separate Usage Tracking** → New `usage_counters` table with atomic `increment_usage()` DB function
3. **Multiple Prices Per Plan** → New `plan_prices` table for monthly/yearly pricing
4. **Webhook Idempotency** → New `stripe_events` table to prevent duplicate processing
5. **Leaner Subscriptions Table** → Removed redundant fields (`billing_cycle`, usage counters moved out)
6. **Service-Role Enforcement** → Users can only read; webhooks/API use service role for writes
7. **VAT/SCA Compliance** → `automatic_tax: true`, GBP currency, 3DS enabled
8. **API Version** → Changed from future date (`2024-10-28.acacia`) to stable `2023-10-16`
9. **Explicit RLS Policies** → Separate read/write policies documented
10. **Comprehensive Guardrails** → "Never do" / "Always do" checklist added

### 📋 **What's Ready to Ship**

- **Database Schema**: Revised migration with all fixes
- **Backend Logic**: `checkLimit()`, `incrementUsage()`, webhook security examples
- **Checkout Flow**: Real customer creation, automatic tax, idempotency
- **Acceptance Criteria**: 40+ checklist items covering all critical paths
- **Future-Proof**: Supports upgrade to organizations (Phase 2)

### 🎯 **Next: Answer Open Questions**

Before I implement, please confirm your choices for:
1. **Pricing** ($29/$99 OK? Annual discounts?)
2. **Free Trial** (14 days or start on Free?)
3. **Overage Handling** (Hard block or pay-as-you-go?)
4. **Refund Policy** (Immediate or period-end downgrades?)
5. **Currency** (GBP-only or multi-currency?)
6. **Grandfather Policy** (Special plan for you?)
7. **Enterprise Plan** ("Contact Sales" button for MVP?)

---

**Ready to build when you are!** 🚀  
Just answer the 7 questions above and I'll implement the full MVP.

