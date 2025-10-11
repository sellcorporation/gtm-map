# Ultra-MVP Fixes — Addressing Review Feedback

**Status**: ✅ All inconsistencies fixed  
**Date**: 2025-10-11

---

## 🔧 Required Fixes Applied

### **1. Starter Warning Threshold (45/50 Everywhere)**

**Issue**: Some sections said "48/50", others "45/50"

**Fix**: Standardized to **45/50** across all code, tests, and documentation

**Rationale**: 90% threshold (45/50) gives better UX than 96% (48/50)

**Updated Files**:
- `ULTRA_MVP_FINAL_SPEC.md` → Thresholds section
- Enforcement logic → `getThresholds()` function
- UI copy → Warning banner, block modal
- Tests → All warning threshold assertions

**Code**:
```typescript
function getThresholds(plan: 'trial' | 'starter' | 'pro', allowed: number) {
  if (plan === 'trial')   return { warnAt: 8,   blockAt: 10 };  // 80%
  if (plan === 'starter') return { warnAt: 45,  blockAt: 50 };  // 90%
  if (plan === 'pro')     return { warnAt: 190, blockAt: 200 }; // 95%
  return { warnAt: Math.max(0, allowed - 2), blockAt: allowed };
}
```

---

### **2. No Annual Plans in Ultra-MVP**

**Issue**: Some sections included yearly SKUs and pricing

**Fix**: Removed all annual pricing from ultra-MVP, kept table structure for future

**Changes**:
- ❌ Removed: `starter_yearly`, `pro_yearly` from seed data
- ❌ Removed: Annual pricing copy (`£290/year`, `£990/year`)
- ❌ Removed: Annual tests and UI
- ✅ Kept: `plan_prices` table with `cadence` column (easy to add `yearly` later)

**Seed Data (Monthly Only)**:
```sql
-- subscription_plans (no changes - limits only)
insert into subscription_plans (id, name, price_monthly, max_ai_generations_per_month, is_active)
values
  ('free', 'Free', 0, 0, true),
  ('starter', 'Starter', 2900, 50, true),
  ('pro', 'Pro', 9900, 200, true)
on conflict (id) do update set
  price_monthly = excluded.price_monthly,
  max_ai_generations_per_month = excluded.max_ai_generations_per_month;

-- plan_prices (monthly only - replace placeholders with real Stripe price IDs)
insert into plan_prices (plan_id, cadence, stripe_price_id, amount, currency)
values
  ('starter', 'monthly', 'price_STARTER_MONTHLY_REPLACE_ME', 2900, 'gbp'),
  ('pro', 'monthly', 'price_PRO_MONTHLY_REPLACE_ME', 9900, 'gbp')
on conflict (plan_id, cadence) do update set
  stripe_price_id = excluded.stripe_price_id,
  amount = excluded.amount;
```

**Future-Proofing**: To add annual later:
```sql
insert into plan_prices (plan_id, cadence, stripe_price_id, amount, currency)
values
  ('starter', 'yearly', 'price_STARTER_YEARLY_ID', 29000, 'gbp'), -- £290 (2 months free)
  ('pro', 'yearly', 'price_PRO_YEARLY_ID', 99000, 'gbp');        -- £990 (2 months free)
```

---

### **3. Service Role for All Billing Writes** ✅

**Issue**: Checkout route used anon client to update `user_subscriptions`, which would fail with RLS

**Fix**: All billing/subscription writes now use `supabaseAdmin` (service role)

**Pattern**:
```typescript
// ❌ WRONG (anon client can't write billing data with RLS)
await supabase
  .from('user_subscriptions')
  .update({ stripe_customer_id: customerId })
  .eq('user_id', user.id);

// ✅ CORRECT (service role bypasses RLS for admin writes)
await supabaseAdmin
  .from('user_subscriptions')
  .update({ stripe_customer_id: customerId })
  .eq('user_id', user.id);
```

**Service Role Client** (`src/lib/supabase/service.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

// Admin client with service role (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
```

**Use Cases**:

| Operation | Client | Why |
|-----------|--------|-----|
| **Read user session** | `supabase` (anon) | User is authenticated, RLS allows |
| **Read user's own data** | `supabase` (anon) | RLS policy: `user_id = auth.uid()` |
| **Create Stripe customer** | `supabaseAdmin` | Admin write, bypass RLS |
| **Webhook upserts** | `supabaseAdmin` | No user context, admin write |
| **Usage increments** | `supabaseAdmin` | Atomic RPC, bypass RLS |
| **Trial expiry downgrade** | `supabaseAdmin` | Admin write, bypass RLS |

**Updated Files**:
- `src/lib/supabase/service.ts` (new) → Service role client
- `src/lib/billing/entitlements.ts` → Use `supabaseAdmin` for all writes
- `src/app/api/stripe/checkout/route.ts` → Use `supabaseAdmin` for customer ID save
- `src/app/api/stripe/webhook/route.ts` → Use `supabaseAdmin` for all upserts

---

### **4. Refund/Downgrade Logic (Period-End, No Prorated Refunds)**

**Issue**: Tests/copy mentioned "prorated refund issued" on downgrade

**Fix**: Updated all copy and tests to match MVP policy

**Policy**:
- **Downgrades**: Take effect at **period end**, **no prorated refunds**
- **Cancellations**: Take effect at **period end**, **no prorated refunds**
- **Upgrades**: Take effect **immediately**, **prorated charge applied** (Stripe default)

**Copy Updates**:

| Location | Old | New |
|----------|-----|-----|
| **Billing Page** | "Cancel anytime" | "Cancels at period end" |
| **Tests** | "Prorated refund issued" | "Downgrade at period end" |
| **Legal** | N/A | "Cancellations take effect at period end. No prorated refunds for partial months. Upgrades take effect immediately; price difference prorated and charged." |

**Stripe Portal Configuration**:
```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
  // Default Stripe behavior:
  // - Upgrades: immediate, prorated charge
  // - Downgrades/cancels: period end, no refund
});
```

**Legal Text** (Add to `/settings/billing`):
```tsx
<p className="text-xs text-gray-500 mt-4">
  Cancellations and downgrades take effect at the end of your billing period.
  No prorated refunds for partial months.
  Upgrades take effect immediately; the price difference is prorated and charged.
  Billed in GBP. Your bank may apply conversion fees.
</p>
```

---

### **5. Top-Up Remnants Removed** ✅

**Issue**: Some code had top-up references (`upgradeCTA?: { topup50?... }`)

**Fix**: Removed all top-up references

**Removed**:
- `ai_topups` table references
- `topup_50`, `topup_100` Stripe SKU references
- CTA copy with top-up options
- Tests for top-up purchase/expiry
- View logic that summed top-ups

**Block Modal CTA (Simplified)**:
```typescript
// ❌ OLD (with top-ups)
cta: {
  topup50: '£25',
  upgradePro: '£99/mo'
}

// ✅ NEW (single upgrade path)
cta: {
  upgradePro: 'Upgrade to Pro (200/mo)'
}
```

**Code**:
```typescript
// Starter at limit
if (used >= thresholds.blockAt && plan === 'starter') {
  return NextResponse.json(
    {
      error: 'Limit reached',
      message: `You've reached ${used}/${allowed} AI generations this month.`,
      cta: { upgradePro: 'Upgrade to Pro (200/mo)' }, // Single upgrade path
    },
    { status: 402 }
  );
}
```

---

### **6. Trial Expiry Path (Instant Clamping)** ✅

**Issue**: Need to ensure effective plan clamping happens **before** DB write completes

**Fix**: Already implemented correctly in `ULTRA_MVP_TRIAL_EXPIRY.md`

**Verification**:
```typescript
// 1) Read current subscription state
const { data: sub } = await supabaseAdmin
  .from('user_subscriptions')
  .select('plan_id, status, trial_ends_at')
  .eq('user_id', userId)
  .single();

const now = new Date();
const trialExpired =
  sub.status === 'trialing' &&
  sub.trial_ends_at &&
  now > new Date(sub.trial_ends_at);

// 2) COMPUTE EFFECTIVE PLAN (instant clamp - before DB write)
const effectivePlan = trialExpired ? 'free' : sub.plan_id;

// 3) BACKGROUND DOWNGRADE (idempotent side-effect)
if (trialExpired) {
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ plan_id: 'free', status: 'active' })
    .eq('user_id', userId)
    .eq('status', 'trialing'); // Idempotent: only update if still trialing
  
  await supabaseAdmin
    .from('entitlement_overrides')
    .update({ valid_to: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('feature_code', 'ai_generations')
    .is('valid_to', null); // Idempotent: only close open overrides
}

// User can't generate past expiry, even if DB write is delayed
```

**Profiles Row Creation**:

**Option A (Recommended)**: Database Trigger (from `AUTH_IMPLEMENTATION_PLAN.md`)
```sql
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = ''
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  
  insert into public.user_settings (user_id)
  values (new.id);
  
  insert into public.user_subscriptions (user_id, plan_id, status, trial_ends_at)
  values (new.id, 'pro', 'trialing', now() + interval '14 days');
  
  insert into public.entitlement_overrides (user_id, feature_code, value, valid_to)
  values (new.id, 'ai_generations', 10, now() + interval '14 days');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Option B**: App-level seed (first login fallback)
```typescript
// In middleware or first protected route
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('id', user.id)
  .single();

if (!profile) {
  // Create missing profile (fallback if trigger failed)
  await supabaseAdmin.from('profiles').insert({ id: user.id });
  await supabaseAdmin.from('user_settings').insert({ user_id: user.id });
  await supabaseAdmin.from('user_subscriptions').insert({
    user_id: user.id,
    plan_id: 'pro',
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
  await supabaseAdmin.from('entitlement_overrides').insert({
    user_id: user.id,
    feature_code: 'ai_generations',
    value: 10,
    valid_to: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
}
```

**MVP Recommendation**: Use **trigger** (simpler, guaranteed), add **app-level fallback** for safety.

---

### **7. Copy & Currency Audit** ✅

**Issue**: Stray `$` signs and typos ("handleded")

**Fixes**:
- ✅ Changed all `$` to `£` (GBP)
- ✅ Fixed typos: "handleded" → "handled"
- ✅ Added currency disclaimer: "Billed in GBP. Your bank may apply conversion fees."

**Standardized Copy**:

| Element | Text |
|---------|------|
| **Starter Plan** | £29/month (50 AI generations) |
| **Pro Plan** | £99/month (200 AI generations) |
| **Warning Banner** | "You've used 45/50 AI generations this month. Upgrade to Pro (200/mo) to continue without interruption." |
| **Block Modal** | "You've reached 50/50 AI generations this month on Starter. Upgrade to Pro for 200 AI generations per month." |
| **Legal Footer** | "Billed in GBP. Your bank may apply conversion fees." |

**UI Component** (`src/components/BillingLegal.tsx`):
```tsx
export function BillingLegal() {
  return (
    <p className="text-xs text-gray-500 mt-6 max-w-2xl">
      Cancellations and downgrades take effect at the end of your billing period.
      No prorated refunds for partial months.
      Upgrades take effect immediately; the price difference is prorated and charged.
      <br />
      <strong>Billed in GBP.</strong> Your bank may apply conversion fees.
    </p>
  );
}
```

---

## ✅ Updated Acceptance Criteria

### **Core Functionality**
- [ ] Trial: **10 allowance**, warn **8**, block **10**
- [ ] Starter: **50 allowance**, warn **45**, block **50** ✅ (was 48)
- [ ] Pro: **200 allowance**, warn **190**, block **200**
- [ ] Upgrade mid-cycle: allowance jumps immediately, usage unchanged
- [ ] Monthly reset: new month = fresh `usage_counters` row
- [ ] Trial expiry: user clamped to Free plan **instantly** (before DB write)

### **Billing**
- [ ] Checkout: `mode='subscription'`, GBP, Tax on, success/cancel URLs
- [ ] Portal: plan changes + **cancel at period end** enabled
- [ ] Webhooks: checkout/subscription/invoice events handled
- [ ] Idempotency: no duplicate processing (using `stripe_events` table)
- [ ] **Service role writes**: All billing writes use `supabaseAdmin` ✅

### **UX**
- [ ] Header badge: "AI gens: X/Y" (click = noop for MVP)
- [ ] Warning banner: appears at threshold **(8, 45, 190)** ✅, closeable, re-shows after gen
- [ ] Block modal: single "Upgrade to Pro" CTA (no top-ups) ✅
- [ ] Billing page: current plan card + upgrade button (no grid, no history)
- [ ] Legal footer: "Billed in GBP. Your bank may apply conversion fees." ✅

### **Refund Policy**
- [ ] Downgrades: **Period-end, no prorated refunds** ✅ (updated from prorated)
- [ ] Cancellations: **Period-end, no prorated refunds** ✅
- [ ] Upgrades: **Immediate, prorated charge** ✅

### **Security**
- [ ] RLS: users SELECT only, **server writes via service role** ✅
- [ ] Anti-abuse L0: verification, rate limits, disposable email blocking
- [ ] Concurrency: 3 parallel gens don't over-spend (atomic `increment_usage` RPC)

### **Deferred (NOT in scope)**
- [ ] ~~Annual pricing~~ ✅ (removed)
- [ ] ~~Billing history UI~~
- [ ] ~~Plan comparison grids~~
- [ ] ~~Notifications UI~~ (fields stored, UI deferred)
- [ ] ~~Usage drawer~~
- [ ] ~~Top-ups~~ ✅ (removed)
- [ ] ~~Organizations/teams~~

---

## 📊 Changes Summary

| Area | What Changed | Why |
|------|--------------|-----|
| **Thresholds** | Starter: 48 → **45** | Consistency (90% threshold) |
| **Annual Plans** | Removed from MVP | Simplify, add later via feature flag |
| **Service Role** | All billing writes use admin client | Bypass RLS for admin operations |
| **Refunds** | No prorated refunds on downgrade | Simplify MVP, clear policy |
| **Top-Ups** | All references removed | Single upgrade path (clearer UX) |
| **Trial Expiry** | Instant clamp verified | No generation past expiry |
| **Currency** | All $ → £, added disclaimer | GBP-only MVP |
| **Typos** | Fixed typos, standardized copy | Polish |

---

## 🎯 Implementation Impact

**No changes to**:
- Core architecture (still sound)
- Database schema (tables unchanged)
- RLS policies (still correct)
- Webhook flow (still correct)

**Changes only affect**:
- Seed data (monthly only, correct thresholds)
- Client usage (anon vs admin)
- Copy (GBP, no top-ups, period-end refunds)
- Tests (updated assertions)

**Implementation time**: Still **10-12 hours** (fixes are minor)

---

## ✅ Ready to Build

All inconsistencies fixed. Spec is now:
- ✅ **Internally consistent** (thresholds, currency, policy)
- ✅ **Best-practice compliant** (service role for billing writes)
- ✅ **Simplified** (no annual, no top-ups, clear refund policy)
- ✅ **Production-ready** (T3 Stripe + Supabase RLS patterns)

**Next step**: Implement 🚀

