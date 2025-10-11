# Ultra-MVP Final Spec — Ready to Build

**Branch**: `settings-and-billing` (or `ultra-mvp`)  
**Status**: ✅ **APPROVED - READY TO IMPLEMENT**  
**Estimated Time**: **10-12 hours**

---

## 📋 **Final Decisions**

### **1. Trial Expiry Mechanism** ✅
**Approach**: Server preflight (on-demand check)  
**Details**: See `ULTRA_MVP_TRIAL_EXPIRY.md`  
**Why**: No cron, no Edge Function, instant effective plan, idempotent

### **2. Warning Thresholds** ✅

| Plan | Allowance | Warn At | Block At | Buffer | % Threshold |
|------|-----------|---------|----------|--------|-------------|
| **Trial** | 10 | 8 | 10 | 2 | 80% |
| **Starter** | 50 | 45 | 50 | 5 | 90% |
| **Pro** | 200 | 190 | 200 | 10 | 95% |

**Rationale**:
- **Trial (2-gen buffer)**: Users are exploring, 2 gens is enough warning
- **Starter (5-gen buffer)**: Mid-tier, 5 gens gives breathing room
- **Pro (10-gen buffer)**: Power users generate fast, 10-gen buffer = 5% headroom

**Code**:
```typescript
function getThresholds(plan: 'trial' | 'starter' | 'pro', allowed: number) {
  if (plan === 'trial')   return { warnAt: 8,   blockAt: 10 };
  if (plan === 'starter') return { warnAt: 45,  blockAt: 50 };
  if (plan === 'pro')     return { warnAt: 190, blockAt: 200 };
  return { warnAt: Math.max(0, allowed - 2), blockAt: allowed }; // fallback
}
```

---

## 🗂️ **Complete Data Model**

### **Seed Plans** (GBP monthly only)

```sql
insert into subscription_plans (id, name, price_monthly, max_ai_generations_per_month, is_active)
values
  ('free', 'Free', 0, 0, true),
  ('starter', 'Starter', 2900, 50, true),    -- £29.00
  ('pro', 'Pro', 9900, 200, true)            -- £99.00
on conflict (id) do update set
  price_monthly = excluded.price_monthly,
  max_ai_generations_per_month = excluded.max_ai_generations_per_month;
```

### **Seed Prices** (Stripe price IDs - replace with real values)

```sql
insert into plan_prices (plan_id, cadence, stripe_price_id, amount, currency)
values
  ('starter', 'monthly', 'price_starter_monthly_gbp_PLACEHOLDER', 2900, 'gbp'),
  ('pro', 'monthly', 'price_pro_monthly_gbp_PLACEHOLDER', 9900, 'gbp')
on conflict (plan_id, cadence) do update set
  stripe_price_id = excluded.stripe_price_id,
  amount = excluded.amount;
```

---

## 🎨 **UI Specification**

### **1. Header Usage Badge** (All Pages)

```tsx
// src/components/UsageBadge.tsx
export function UsageBadge({ used, allowed, plan, trialDaysLeft }: Props) {
  const isNearLimit = used >= allowed - 5; // warn threshold
  
  return (
    <div className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium",
      isNearLimit ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-700"
    )}>
      {plan === 'trialing' && trialDaysLeft !== null ? (
        <>AI gens: {used}/{allowed} · Trial · {trialDaysLeft}d left</>
      ) : (
        <>AI gens: {used}/{allowed}</>
      )}
    </div>
  );
}
```

### **2. Warning Banner** (Under Header, Conditional)

**Trigger**: `used >= warnAt && used < blockAt`

```tsx
// src/components/WarningBanner.tsx
export function WarningBanner({ used, allowed, plan }: Props) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-amber-900">
          You've used <strong>{used}/{allowed}</strong> AI generations this month.
          {plan === 'starter' && (
            <> <a href="/settings/billing" className="underline font-semibold">
              Upgrade to Pro (200/mo)
            </a> to continue without interruption.</>
          )}
        </p>
        <button onClick={() => setDismissed(true)} className="text-amber-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

### **3. Block Modal** (On Generation Attempt When Capped)

```tsx
// src/components/BlockModal.tsx
export function BlockModal({ plan, used, allowed }: Props) {
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Limit Reached</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            You've reached <strong>{used}/{allowed}</strong> AI generations
            this month on {plan === 'starter' ? 'Starter' : plan === 'trial' ? 'Trial' : 'Free'}.
          </p>
          {plan === 'starter' && (
            <p className="text-sm text-gray-600 mb-6">
              Upgrade to <strong>Pro</strong> for 200 AI generations per month.
            </p>
          )}
        </div>
        <DialogFooter className="flex gap-3">
          <Button variant="outline" asChild>
            <a href="/settings/billing">Manage Billing</a>
          </Button>
          <Button asChild>
            <a href="/api/stripe/checkout?plan=pro">Upgrade to Pro</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### **4. Billing Page** (`/settings/billing`)

**Ultra-minimal - no plan grid, no history**

```tsx
// src/app/settings/billing/page.tsx
export default async function BillingPage() {
  const { user } = await getUser();
  const { effectivePlan, isTrialing, trialDaysLeft } = await getUserPlan(user.id);
  
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>
      
      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-semibold">
                {effectivePlan === 'free' ? 'Free' :
                 effectivePlan === 'starter' ? 'Starter' : 'Pro'}
              </p>
              <p className="text-sm text-gray-600">
                {isTrialing && `Trial ends in ${trialDaysLeft} days`}
                {!isTrialing && effectivePlan === 'starter' && '£29/month'}
                {!isTrialing && effectivePlan === 'pro' && '£99/month'}
              </p>
            </div>
            {effectivePlan !== 'pro' && (
              <Button asChild>
                <a href="/api/stripe/checkout?plan=pro">
                  Upgrade to Pro
                </a>
              </Button>
            )}
          </div>
          
          {effectivePlan === 'pro' && (
            <p className="text-sm text-gray-600">
              You're on the highest plan. Next renewal: [date]
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Manage Billing (Stripe Portal) */}
      {effectivePlan !== 'free' && (
        <form action="/api/stripe/portal" method="POST">
          <Button variant="outline" type="submit">
            Manage Billing
          </Button>
        </form>
      )}
    </div>
  );
}
```

---

## 🔌 **Stripe Integration**

### **Products to Create in Stripe Dashboard**

1. **Starter (Monthly)**
   - Name: `Starter`
   - Price: `£29/month`
   - Recurring: Monthly
   - Copy price ID → `price_starter_monthly_gbp_XXXXX`

2. **Pro (Monthly)**
   - Name: `Pro`
   - Price: `£99/month`
   - Recurring: Monthly
   - Copy price ID → `price_pro_monthly_gbp_XXXXX`

### **Checkout Session** (`/api/stripe/checkout/route.ts`)

```typescript
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const plan = searchParams.get('plan'); // 'starter' or 'pro'
  
  if (!plan || !['starter', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  
  // Get user
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
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get or create Stripe customer
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();
  
  let customerId = sub?.stripe_customer_id;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    
    // Save customer ID
    await supabase
      .from('user_subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
  }
  
  // Get price ID from plan_prices
  const { data: priceData } = await supabase
    .from('plan_prices')
    .select('stripe_price_id')
    .eq('plan_id', plan)
    .eq('cadence', 'monthly')
    .single();
  
  if (!priceData) {
    return NextResponse.json({ error: 'Price not found' }, { status: 500 });
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceData.stripe_price_id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
    automatic_tax: { enabled: true },
    locale: 'auto',
    allow_promotion_codes: false, // MVP: no promo codes
    billing_address_collection: 'required',
  });
  
  return NextResponse.redirect(session.url!);
}
```

### **Customer Portal** (`/api/stripe/portal/route.ts`)

```typescript
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

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
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();
  
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No customer found' }, { status: 404 });
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
  });
  
  return NextResponse.redirect(session.url);
}
```

### **Webhook Handler** (`/api/stripe/webhook/route.ts`)

*See full implementation in original plan - handles:*
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

---

## ✅ **Acceptance Checklist**

### **Core Functionality**
- [ ] Trial: 10 allowance, warn 8, block 10
- [ ] Starter: 50 allowance, warn 45, block 50
- [ ] Pro: 200 allowance, warn 190, block 200
- [ ] Upgrade mid-cycle: allowance jumps immediately, usage unchanged
- [ ] Monthly reset: new month = fresh `usage_counters` row
- [ ] Trial expiry: user clamped to Free plan instantly (even before DB write)

### **Billing**
- [ ] Checkout: mode='subscription', GBP, Tax on, success/cancel URLs
- [ ] Portal: plan changes + cancel at period end enabled
- [ ] Webhooks: checkout/subscription/invoice events handled
- [ ] Idempotency: no duplicate processing (using `stripe_events` table)

### **UX**
- [ ] Header badge: "AI gens: X/Y" (click = noop for MVP)
- [ ] Warning banner: appears at threshold (8, 45, 190), closeable, re-shows after gen
- [ ] Block modal: single "Upgrade to Pro" CTA
- [ ] Billing page: current plan card + upgrade button (no grid, no history)

### **Security**
- [ ] RLS: users SELECT only, server writes via service role
- [ ] Anti-abuse L0: verification, rate limits, disposable email blocking
- [ ] Concurrency: 3 parallel gens don't over-spend (atomic `increment_usage` RPC)

### **Deferred (NOT in scope)**
- [ ] ~~Annual pricing~~
- [ ] ~~Billing history UI~~
- [ ] ~~Plan comparison grids~~
- [ ] ~~Notifications UI~~
- [ ] ~~Usage drawer~~
- [ ] ~~Top-ups~~
- [ ] ~~Organizations/teams~~

---

## 🚀 **Implementation Order** (10-12 hours)

| Phase | Task | Time | Files |
|-------|------|------|-------|
| **0. Stripe Setup** | Create products/prices in Stripe Dashboard | 20 min | N/A |
| **1. Database** | Run migration SQL (7 tables, seed, RLS, view, RPC) | 1 hour | `migrations/ultra_mvp_billing.sql` |
| **2. Backend Utils** | `getEffectiveEntitlements()`, `incrementUsage()` | 2 hours | `src/lib/billing/entitlements.ts` |
| **3. API Routes** | Checkout, Portal, Webhook | 2 hours | `src/app/api/stripe/*` |
| **4. Enforcement** | Integrate limit checks in AI gen endpoints | 1 hour | `src/app/api/generate-more/route.ts`, etc. |
| **5. UI Components** | Badge, Banner, Modal, Billing Page | 3 hours | `src/components/*`, `src/app/settings/billing/*` |
| **6. Testing** | Trial flow, upgrade flow, limits, webhooks | 2 hours | Manual + automated |

**Total**: **11 hours** (within 10-12 hour estimate)

---

## 🎯 **Ready to Build?**

**This spec is production-ready.**

**What's your call?**
1. **Start building now** → I'll implement ultra-MVP (11 hours)
2. **Final questions** → Ask me anything before we start
3. **Further simplify** → Show me where else to cut (though I don't think we should)

**Let's ship this!** 🚀

