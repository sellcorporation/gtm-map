# 🎯 Stripe Setup Checklist for Vercel Production

**Status**: 🚨 **URGENT - Required Before App Functions Properly**

---

## ⚡ Quick Action Items (Do This Now)

### ☐ 1. Get Stripe API Keys (2 minutes)

1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Keep this safe - you'll add it to Vercel next

### ☐ 2. Create Stripe Webhook Endpoint (3 minutes)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://gtm-90ro8bdpz-ionutfurnea-5209s-projects.vercel.app/api/stripe/webhook`
   - ⚠️ **Update this URL** with your actual Vercel production domain
4. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)

### ☐ 3. Add Environment Variables to Vercel (2 minutes)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add these three variables:

| Variable | Value | Where to Get It | Environments |
|----------|-------|----------------|--------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Step 1 above | ✅ Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Step 2 above | ✅ Production only |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Your Vercel app URL (no trailing slash) | ✅ Production, Preview, Development |

4. Click **"Save"** after each one

### ☐ 4. Redeploy Application (1 minute)

Option A: **In Vercel Dashboard**
- Vercel will prompt you to redeploy after adding env vars
- Click **"Redeploy"**

Option B: **Via Git**
```bash
git commit --allow-empty -m "Trigger redeploy with Stripe env vars"
git push origin main
```

---

## 🧪 Verification (Do This After Steps 1-4)

### Test 1: Stripe Connection

Visit: `https://your-app.vercel.app/api/stripe/test`

✅ **Expected Result:**
```json
{
  "stripe": "✅ Connected",
  "account": "acct_...",
  "mode": "test"
}
```

❌ **If you see an error:**
- Check `STRIPE_SECRET_KEY` is set in Vercel
- Verify the key starts with `sk_test_` or `sk_live_`
- Redeploy your app

### Test 2: Webhook Delivery

1. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**

✅ **Expected Result:**
- Status: `200 OK` or `204 No Content`
- Response body: Empty or success message

❌ **If you see 5xx error:**
- Check `STRIPE_WEBHOOK_SECRET` is set in Vercel
- Check webhook URL matches your app exactly
- Check Vercel function logs for errors

### Test 3: Checkout Flow

1. Log in to your production app
2. Navigate to **Settings** → **Billing**
3. Click **"Upgrade to Starter"**
4. Use test card: `4242 4242 4242 4242`, any future date, any CVV

✅ **Expected Result:**
- Redirects to Stripe checkout
- Checkout completes successfully
- Redirects back to billing page
- Shows "Starter" plan active

❌ **If checkout fails:**
- Check `NEXT_PUBLIC_SITE_URL` is correct (no trailing slash)
- Check Stripe products/prices are created (see Step 5 below)
- Check database `plan_prices` table has correct `stripe_price_id`

---

## 🎛️ Optional: Set Up Stripe Products (10 minutes)

### ☐ 5. Create Stripe Products & Prices

Your app expects these plans:

#### Starter Plan - $49/month
1. Go to [Stripe Products](https://dashboard.stripe.com/products)
2. Click **"Add product"**
3. **Name**: `Starter Plan`
4. **Description**: `50 AI generations per month`
5. **Pricing model**: `Recurring`
6. **Price**: `$49.00 USD`
7. **Billing period**: `Monthly`
8. Click **"Save product"**
9. **Copy the Price ID** (starts with `price_...`)

#### Pro Plan - $99/month
1. Click **"Add product"**
2. **Name**: `Pro Plan`
3. **Description**: `200 AI generations per month`
4. **Pricing model**: `Recurring`
5. **Price**: `$99.00 USD`
6. **Billing period**: `Monthly`
7. Click **"Save product"**
8. **Copy the Price ID** (starts with `price_...`)

### ☐ 6. Update Database with Price IDs

Use Supabase SQL Editor or your preferred method:

```sql
-- Update Starter plan price
UPDATE plan_prices
SET stripe_price_id = 'price_1ABC...XYZ'  -- ← Replace with your actual Price ID
WHERE plan_id = 'starter' AND cadence = 'monthly';

-- Update Pro plan price
UPDATE plan_prices
SET stripe_price_id = 'price_1DEF...XYZ'  -- ← Replace with your actual Price ID
WHERE plan_id = 'pro' AND cadence = 'monthly';

-- Verify the update
SELECT * FROM plan_prices;
```

---

## 📋 Current Status

| Item | Status | Notes |
|------|--------|-------|
| Stripe API Keys | ❓ Not Set | Add in Vercel |
| Webhook Endpoint | ❓ Not Set | Create in Stripe |
| Webhook Secret | ❓ Not Set | Add in Vercel |
| Site URL | ❓ Not Set | Add in Vercel |
| Stripe Products | ❓ Not Set | Create Starter & Pro |
| Database Price IDs | ❓ Not Set | Update after products created |

---

## 🚨 What Happens If You Don't Set These?

### Without `STRIPE_SECRET_KEY`:
- ❌ Checkout will fail with 500 error
- ❌ Can't create customers or subscriptions
- ❌ Billing page won't load subscription data

### Without `STRIPE_WEBHOOK_SECRET`:
- ❌ Webhook signature verification fails
- ❌ Subscription updates won't sync to database
- ❌ Users will appear as "Trial" even after payment

### Without `NEXT_PUBLIC_SITE_URL`:
- ❌ Checkout redirects will fail
- ❌ Customer portal redirects will fail
- ❌ Users get stuck on Stripe pages

### Without Stripe Products:
- ❌ Checkout will fail: "No price found for plan"
- ❌ Can't upgrade from Trial/Free to paid plans

---

## 🔐 Security Notes

✅ **Good News**: Your code already implements:
- Lazy-loaded Stripe client (won't break builds)
- Webhook signature verification
- Server-side only API calls
- No secrets exposed to client
- `.gitignore` configured for log files

⚠️ **Important**: 
- The exposed webhook secret in git history was a **local development secret** from Stripe CLI
- It's **not** your production secret (which you'll create in Step 2)
- Still, it's good practice to remove it from git history (see previous instructions)

---

## 📚 Full Documentation

For detailed explanations and troubleshooting, see:
- **[VERCEL_ENVIRONMENT_SETUP.md](./VERCEL_ENVIRONMENT_SETUP.md)** - Complete setup guide
- **[env.example](./env.example)** - Template for local development

---

## ✅ Done Checklist

Mark these as you complete them:

- [ ] Copied Stripe Secret Key from dashboard
- [ ] Created Stripe webhook endpoint
- [ ] Copied Stripe Webhook Secret
- [ ] Added `STRIPE_SECRET_KEY` to Vercel
- [ ] Added `STRIPE_WEBHOOK_SECRET` to Vercel
- [ ] Added `NEXT_PUBLIC_SITE_URL` to Vercel
- [ ] Redeployed application
- [ ] Tested `/api/stripe/test` endpoint
- [ ] Tested webhook delivery
- [ ] Created Starter product in Stripe
- [ ] Created Pro product in Stripe
- [ ] Updated database with Price IDs
- [ ] Tested complete checkout flow
- [ ] Verified subscription appears in billing page

---

**Next Steps After Completion:**
1. Test the full user journey (signup → trial → upgrade → billing)
2. Monitor Vercel logs for any errors
3. Check Stripe Dashboard for successful payments
4. When ready for production, switch to live Stripe keys

**Estimated Total Time:** ~20 minutes

---

**Need Help?** See the full documentation in `VERCEL_ENVIRONMENT_SETUP.md`

**Last Updated:** October 12, 2025

