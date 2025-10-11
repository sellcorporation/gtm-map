# Webhook Testing Guide — Stripe CLI

This guide shows how to test Stripe webhooks locally and verify idempotency.

---

## 🛠️ **Setup**

### **1. Install Stripe CLI**

```bash
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### **2. Login to Stripe**

```bash
stripe login
```

This opens your browser to authenticate.

### **3. Forward Webhooks to Localhost**

```bash
cd /Users/ionutfurnea/gtm-map
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Output**:
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

**Copy the `whsec_xxx` value** and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 🧪 **Test Scenarios**

### **Scenario 1: Checkout Session Completed**

Simulates a user completing checkout for the Pro plan.

**Step 1**: Create a test customer
```bash
stripe customers create \
  --email test@example.com \
  --metadata supabase_user_id=YOUR_SUPABASE_USER_UUID
```

**Output**:
```
id: cus_xxx
```

**Step 2**: Create a subscription
```bash
stripe subscriptions create \
  --customer cus_xxx \
  --items '[{"price": "price_PRO_MONTHLY_REPLACE_ME"}]'
```

**Step 3**: Trigger checkout.session.completed event
```bash
stripe trigger checkout.session.completed
```

**Expected Result**:
- ✅ `user_subscriptions` updated with `plan_id='pro'`, `stripe_customer_id`, `stripe_subscription_id`
- ✅ `stripe_events` table has event ID recorded
- ✅ Console log: `[WEBHOOK] Processed checkout.session.completed`

---

### **Scenario 2: Subscription Updated (Upgrade)**

Simulates a user upgrading from Starter to Pro.

**Command**:
```bash
stripe trigger customer.subscription.updated
```

**Expected Result**:
- ✅ `user_subscriptions` updated with new `stripe_price_id`, `plan_id`, `current_period_end`
- ✅ Console log: `[WEBHOOK] Processed customer.subscription.updated`

---

### **Scenario 3: Subscription Deleted (Cancellation)**

Simulates a user canceling their subscription.

**Command**:
```bash
stripe trigger customer.subscription.deleted
```

**Expected Result**:
- ✅ `user_subscriptions` updated with `plan_id='free'`, `status='canceled'`
- ✅ Console log: `[WEBHOOK] Processed customer.subscription.deleted`

---

### **Scenario 4: Invoice Paid**

Simulates successful payment for a subscription renewal.

**Command**:
```bash
stripe trigger invoice.payment_succeeded
```

**Expected Result**:
- ✅ `billing_transactions` table has new row with `status='paid'`, `stripe_invoice_id`, `amount`
- ✅ Console log: `[WEBHOOK] Processed invoice.payment_succeeded`

---

### **Scenario 5: Invoice Payment Failed**

Simulates failed payment (e.g., expired card).

**Command**:
```bash
stripe trigger invoice.payment_failed
```

**Expected Result**:
- ✅ `billing_transactions` table has new row with `status='open'` (or relevant status)
- ✅ `user_subscriptions` potentially updated to `status='past_due'`
- ✅ Console log: `[WEBHOOK] Processed invoice.payment_failed`

---

### **Scenario 6: Idempotency Test (Replay)**

Tests that duplicate events are ignored.

**Step 1**: Capture an event ID
```bash
# After triggering an event, note the event ID from logs
# Example: evt_1234567890abcdef
```

**Step 2**: Replay the same event
```bash
stripe events resend evt_1234567890abcdef
```

**Expected Result**:
- ✅ Webhook receives event
- ✅ Checks `stripe_events` table, finds existing entry
- ✅ Returns 200 immediately with `{ received: true, skipped: true }`
- ✅ **No database changes** (idempotency works)
- ✅ Console log: `[WEBHOOK] Event already processed: evt_xxx`

---

## 📊 **Verification SQL Queries**

After each test, verify database state:

### **Check user subscription**
```sql
select user_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_end
from user_subscriptions
where user_id = 'YOUR_USER_UUID';
```

### **Check usage counters**
```sql
select user_id, metric, period_start, used
from usage_counters
where user_id = 'YOUR_USER_UUID';
```

### **Check billing transactions**
```sql
select user_id, stripe_invoice_id, amount, currency, status, created_at
from billing_transactions
where user_id = 'YOUR_USER_UUID'
order by created_at desc;
```

### **Check processed events (idempotency)**
```sql
select id, received_at
from stripe_events
order by received_at desc
limit 10;
```

---

## 🔍 **Debugging Webhook Issues**

### **Issue 1: Signature Verification Failed**

**Symptom**: `400 Bad Request` with "Invalid signature"

**Fix**:
1. Check `STRIPE_WEBHOOK_SECRET` in `.env.local` matches CLI output
2. Restart dev server after changing `.env.local`
3. Use `stripe listen --print-secret` to get correct secret

### **Issue 2: Event Not Processing**

**Symptom**: Webhook returns 200 but no DB changes

**Fix**:
1. Check console logs for errors
2. Verify `supabase_user_id` in customer metadata
3. Check RLS policies (service role should bypass)
4. Verify Stripe price IDs match `plan_prices` table

### **Issue 3: Duplicate Processing**

**Symptom**: Same event processed twice (DB changes duplicated)

**Fix**:
1. Check `stripe_events` table insert happens **before** processing
2. Wrap event processing in try/catch (don't fail before idempotency check)
3. Use `on conflict do nothing` for idempotency insert

---

## ✅ **Acceptance Checklist**

Before marking webhooks as complete:

- [ ] `checkout.session.completed` → Creates subscription + customer ID
- [ ] `customer.subscription.updated` → Updates plan/period/status
- [ ] `customer.subscription.deleted` → Downgrades to Free
- [ ] `invoice.payment_succeeded` → Records transaction
- [ ] `invoice.payment_failed` → Updates status (past_due)
- [ ] **Idempotency**: Replayed event is skipped (no duplicate changes)
- [ ] **Non-subscription sessions**: Ignored (don't error)
- [ ] **Invalid customer**: Logged, returns 200 (don't retry)
- [ ] **Service role**: All writes use `supabaseAdmin`
- [ ] **Signature verification**: Rejects tampered requests

---

## 🚀 **Production Setup**

When deploying to production:

1. **Create webhook endpoint in Stripe Dashboard**
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

2. **Get webhook signing secret**
   - Copy from Stripe Dashboard → Webhooks → Signing secret
   - Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

3. **Test with Stripe CLI**
   ```bash
   stripe listen --forward-to https://your-domain.com/api/stripe/webhook
   ```

4. **Monitor webhook logs**
   - Stripe Dashboard → Webhooks → View logs
   - Check for failed deliveries, signature errors

---

## 📝 **Common Webhook Patterns**

### **Pattern 1: Get user ID from customer**
```typescript
const customer = await stripe.customers.retrieve(customerId);
const userId = customer.metadata.supabase_user_id;
```

### **Pattern 2: Get plan from price ID**
```typescript
const { data: planPrice } = await supabaseAdmin
  .from('plan_prices')
  .select('plan_id')
  .eq('stripe_price_id', priceId)
  .single();
```

### **Pattern 3: Idempotency check**
```typescript
const { data: existingEvent } = await supabaseAdmin
  .from('stripe_events')
  .select('id')
  .eq('id', event.id)
  .single();

if (existingEvent) {
  return NextResponse.json({ received: true, skipped: true });
}
```

---

**Ready to test!** 🎉

Start with Scenario 1 (checkout) and work through each scenario in order.

