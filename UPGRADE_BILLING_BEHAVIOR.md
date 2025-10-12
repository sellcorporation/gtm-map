# 🎯 Mid-Cycle Upgrade Billing Behavior

**Status**: Current implementation is incomplete  
**Last Updated**: October 12, 2025

---

## 📋 What Should Happen (Per Plan Document)

### Scenario: Starter User Upgrades to Pro After 1 Week

**User Journey**:
1. User signs up, trial expires → upgrades to Starter (£29/month)
2. **7 days later**, user hits 50 AI generation limit
3. User clicks "Upgrade to Pro" → Sees BlockModal with encouragement
4. User proceeds to checkout

### Expected Billing Behavior (from `SETTINGS_AND_BILLING_PLAN.md`)

**Policy**: 
> "Upgrades: `proration_behavior='always_invoice'` (immediate charge)"

**What This Means**:
- User is **immediately charged a prorated amount** for the upgrade
- They get **immediate access** to Pro limits (200 generations)
- Stripe calculates: 
  - Unused time on Starter: ~21 days remaining
  - Credit for unused Starter time: ~£21 (21/30 × £29)
  - Full Pro monthly cost: £99
  - **Prorated charge now**: ~£78 (£99 - £21 credit)
- Next billing date remains the same (original monthly anniversary)
- Future invoices will be full £99/month

### Expected Generation Limits

**Immediately After Upgrade**:
- ✅ Limit changes from 50 → 200 generations
- ✅ Current usage DOES NOT RESET (stays at 50/200)
- ✅ User can now generate 150 more this month
- ✅ Counter resets to 0/200 on next billing date

**Why Usage Doesn't Reset**:
- Usage is tracked per billing period (e.g., Jan 1 - Jan 31)
- Upgrading mid-period doesn't change the period
- Only the **limit** changes, not the period start date
- This prevents abuse (upgrade → generate 200 → downgrade → repeat)

---

## ❌ What's Currently Implemented

### Current Checkout Route (`/api/stripe/checkout/route.ts`)

**Problem**: The checkout always creates a **NEW subscription**, regardless of whether the user already has one.

```typescript
// Line 172-194: Always creates new subscription
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  mode: 'subscription',  // ❌ Always creates NEW subscription
  payment_method_types: ['card'],
  line_items: [
    {
      price: priceData.stripe_price_id,
      quantity: 1,
    },
  ],
  // ❌ No proration_behavior specified
  // ❌ No check for existing subscription
  // ❌ No subscription_data.proration_behavior
  success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?canceled=true`,
  // ...
});
```

### What Happens Now

**If User Already Has Starter Subscription**:
1. User clicks "Upgrade to Pro"
2. Checkout tries to create a **second subscription**
3. Stripe allows this (multiple subscriptions per customer)
4. User now has TWO active subscriptions:
   - Starter: £29/month (still active)
   - Pro: £99/month (new)
5. User gets billed **£128/month total** 😱
6. Database only tracks one subscription (last one processed)
7. Entitlements may be incorrect

**What Should Happen**:
1. Detect existing subscription
2. Update it to Pro plan with proration
3. Immediate prorated charge
4. Single subscription at £99/month going forward

---

## ✅ Correct Implementation

### Option A: Update Existing Subscription (Server-Side)

**Best Practice**: Handle upgrades/downgrades via API, not Checkout

```typescript
// In /api/stripe/upgrade/route.ts (NEW)
export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const user = await authenticateUser();
  
  // 2. Get user's current subscription from Stripe
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, plan_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_subscription_id) {
    // No existing subscription → Use checkout for new subscription
    return createCheckoutSession(user, requestedPlan);
  }

  // 3. User has existing subscription → UPDATE it
  const stripeSubscription = await stripe.subscriptions.retrieve(
    sub.stripe_subscription_id
  );

  // 4. Get new plan's price ID
  const { data: newPrice } = await supabase
    .from('plan_prices')
    .select('stripe_price_id')
    .eq('plan_id', requestedPlan)
    .eq('cadence', 'monthly')
    .single();

  // 5. Update subscription with proration
  const updatedSubscription = await stripe.subscriptions.update(
    sub.stripe_subscription_id,
    {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPrice.stripe_price_id,
      }],
      proration_behavior: 'always_invoice', // ✅ Immediate prorated charge
      billing_cycle_anchor: 'unchanged',    // ✅ Keep same billing date
    }
  );

  // 6. Stripe webhook will update database
  // 7. Return success
  return NextResponse.json({ 
    success: true, 
    subscriptionId: updatedSubscription.id 
  });
}
```

### Option B: Checkout with Subscription Mode (Simpler for MVP)

**For MVP**: Use Checkout Sessions but configure correctly

```typescript
// In /api/stripe/checkout/route.ts (MODIFIED)

// After checking for existing subscription:
const { data: existingSub } = await supabase
  .from('user_subscriptions')
  .select('stripe_subscription_id')
  .eq('user_id', user.id)
  .single();

if (existingSub?.stripe_subscription_id) {
  // User has active subscription → Update it directly
  const subscription = await stripe.subscriptions.retrieve(
    existingSub.stripe_subscription_id
  );
  
  await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
    items: [{
      id: subscription.items.data[0].id,
      price: priceData.stripe_price_id,
    }],
    proration_behavior: 'always_invoice',
  });
  
  // Redirect to billing page (no checkout needed)
  return NextResponse.json({ 
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?upgraded=true` 
  });
}

// Otherwise, create new subscription via checkout (first time)
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  mode: 'subscription',
  // ... rest of checkout config
});
```

---

## 🔧 What Needs to Change

### Immediate Fixes Required

1. **Detect Existing Subscriptions**
   - Check if user already has a Stripe subscription ID
   - If yes, use `stripe.subscriptions.update()` instead of Checkout

2. **Add Proration Settings**
   - Use `proration_behavior: 'always_invoice'` for upgrades
   - Use `billing_cycle_anchor: 'unchanged'` to keep billing date

3. **Update Frontend BlockModal**
   - If user has existing subscription, button should say "Upgrade Now (£X prorated)"
   - Calculate and display prorated amount before checkout

4. **Webhook Enhancement**
   - Ensure `customer.subscription.updated` webhook handles plan changes
   - Update `user_subscriptions.plan_id` when subscription item changes

### Testing Checklist

- [ ] Trial user (no subscription) → Starter: Creates new subscription via Checkout ✅
- [ ] Starter user (has subscription) → Pro: Updates subscription with proration ⚠️
- [ ] Pro user (has subscription) → Downgrade to Starter: Scheduled for period end ⚠️
- [ ] Verify only ONE subscription exists per customer after upgrade ⚠️
- [ ] Verify prorated charge appears on invoice ⚠️
- [ ] Verify usage limit updates immediately (50 → 200) ⚠️
- [ ] Verify usage count does NOT reset (stays at 50/200) ⚠️
- [ ] Verify next billing date remains unchanged ⚠️

---

## 📚 Stripe Documentation References

### Proration Behavior
- **`always_invoice`**: Immediate charge for prorated amount (upgrades)
- **`create_prorations`**: Create proration but invoice at end of period
- **`none`**: No proration (user loses unused time)

**Our Choice**: `always_invoice` for upgrades (user pays now, gets access now)

### Billing Cycle Anchor
- **`unchanged`**: Keep original billing date (recommended for upgrades)
- **`now`**: Reset billing date to today (creates odd billing periods)

**Our Choice**: `unchanged` to maintain consistent billing dates

### Subscription Update vs. Checkout
- **Checkout**: For NEW subscriptions (trial → Starter, new customers)
- **`subscriptions.update()`**: For EXISTING subscriptions (Starter → Pro)

---

## 💡 Recommended Approach for MVP

**Phase 1 (Immediate)**:
1. Modify `/api/stripe/checkout/route.ts`:
   - Check for existing subscription before creating checkout
   - If exists, use `stripe.subscriptions.update()` instead
   - Add `proration_behavior: 'always_invoice'`

**Phase 2 (Future)**:
1. Create dedicated `/api/stripe/upgrade` endpoint
2. Calculate prorated amounts client-side
3. Show preview: "You'll be charged £78 today (prorated)"
4. Add downgrade scheduling (period end)

---

## 🎯 Summary: What User Experiences

### ✅ Correct Flow (After Fix)

**Week 1**: 
- User on Starter (£29/month, 50 gens)
- Uses 50 gens in first week
- Hits limit, sees BlockModal: "🎉 Amazing work! Upgrade to Pro for 200 gens/month"

**Upgrade Click**:
- System detects existing subscription
- Calculates proration: ~£78 immediate charge
- Updates subscription (not new one)
- User sees: "Successfully upgraded! You now have 200 generations/month."

**Immediately After**:
- Usage badge: 50/200 (limit increased, usage preserved)
- Can generate 150 more this month
- Next billing date: Same as before (e.g., 1st of next month)
- Invoice: £78 charged today

**Next Month**:
- Usage resets: 0/200
- Billed: £99 (full month of Pro)

### ❌ Current Behavior (Bug)

**Upgrade Click**:
- Creates SECOND subscription
- User charged full £99 today
- Also charged £29 on original date
- Database confused about which subscription is "real"
- Potentially billed £128/month 😱

---

## 🚨 Action Required

**Developer**: Implement subscription update logic before launch  
**Priority**: HIGH (affects all paid upgrades)  
**Risk**: Financial (users overcharged) + reputational damage

