# Vercel Environment Variables Setup Guide

## 🎯 Overview

Your application now uses Stripe for billing and subscriptions. This guide walks you through setting up all required environment variables in Vercel.

---

## 📋 Required Environment Variables

### 1. **Supabase Variables** (Already Configured)

These should already be set in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

✅ **Action**: Verify these are set in Vercel → Project Settings → Environment Variables

---

### 2. **Stripe API Keys** (NEW - Required)

#### `STRIPE_SECRET_KEY`

- **Purpose**: Authenticates server-side Stripe API calls (creating customers, subscriptions, checkout sessions)
- **Where to get it**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys) → Developers → API Keys → Secret Key
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Environment**: All (Production, Preview, Development)
- **⚠️ Security**: NEVER expose this key to the client or commit it to git

#### `STRIPE_WEBHOOK_SECRET`

- **Purpose**: Verifies webhook signatures from Stripe (subscription updates, payments)
- **Where to get it**: [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → Add Endpoint
- **Format**: `whsec_...`
- **Environment**: Production (and optionally Preview)
- **Note**: You'll need to create a separate webhook endpoint for production

---

### 3. **Application URL** (NEW - Required)

#### `NEXT_PUBLIC_SITE_URL`

- **Purpose**: Used for redirect URLs after Stripe checkout and portal
- **Format**: `https://your-app.vercel.app` (no trailing slash)
- **Environment**: 
  - **Production**: Your production domain (e.g., `https://gtm-map.vercel.app`)
  - **Preview**: Can use `https://$VERCEL_URL` or specific preview URL
  - **Development**: `http://localhost:3000`

---

## 🔧 Step-by-Step Setup in Vercel

### Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode)
4. Keep this tab open for later steps

### Step 2: Set Up Stripe Webhook for Production

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **+ Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/stripe/webhook
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 3: Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | ✅ Production<br>✅ Preview<br>✅ Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Step 2) | ✅ Production |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | ✅ Production<br>✅ Preview<br>✅ Development |

#### Tips for Setting Environment Variables:

- **Use separate Stripe accounts** for test and production
- For **Development**, use `http://localhost:3000` as `NEXT_PUBLIC_SITE_URL`
- For **Preview**, you can use `https://$VERCEL_URL` or skip it if not needed
- Click **"Save"** after adding each variable

### Step 4: Redeploy Your Application

After adding environment variables, Vercel will prompt you to redeploy. Click **"Redeploy"** or:

```bash
git commit --allow-empty -m "Trigger redeploy with new env vars"
git push origin main
```

---

## 🧪 Testing the Setup

### 1. Test Stripe Connection

Visit: `https://your-app.vercel.app/api/stripe/test`

Expected response:
```json
{
  "stripe": "✅ Connected",
  "account": "acct_...",
  "mode": "test"
}
```

### 2. Test Webhook

1. Generate a test event from [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Send test webhook for `checkout.session.completed`
3. Check webhook logs in Stripe Dashboard → Should show `200 OK`

### 3. Test Checkout Flow

1. Log in to your app
2. Navigate to Settings → Billing
3. Click "Upgrade to Starter" or "Upgrade to Pro"
4. Complete the test checkout (use card `4242 4242 4242 4242`)
5. Verify subscription appears in:
   - Stripe Dashboard → Customers
   - Your app → Billing page
   - Database → `user_subscriptions` table

---

## 🔐 Security Checklist

- ✅ `STRIPE_SECRET_KEY` is set to **Server-side only** (not exposed to client)
- ✅ `STRIPE_WEBHOOK_SECRET` is configured for production endpoint
- ✅ `.gitignore` includes `stripe-webhook.log` (local testing file)
- ✅ Webhook endpoint uses signature verification
- ✅ All Stripe API calls happen server-side (API routes)
- ✅ Row Level Security (RLS) is enabled on Supabase tables

---

## 🎛️ Stripe Dashboard Configuration

### Required Stripe Products & Prices

Your app expects these plans to be configured in the database (`plan_prices` table):

| Plan | Monthly Price | Max AI Generations |
|------|--------------|-------------------|
| **Trial** | Free | 10 |
| **Free** | Free | 10 |
| **Starter** | $49/month | 50 |
| **Pro** | $99/month | 200 |

#### To Set Up Products in Stripe:

1. Go to [Stripe Products](https://dashboard.stripe.com/products)
2. Create products for each plan:
   - **Starter Plan** → Set price to $49/month
   - **Pro Plan** → Set price to $99/month
3. Copy the **Price IDs** (starts with `price_...`)
4. Update your database `plan_prices` table with these Price IDs

#### Example SQL to Update Price IDs:

```sql
-- Update Starter plan price
UPDATE plan_prices
SET stripe_price_id = 'price_1ABC...XYZ'
WHERE plan_id = 'starter' AND cadence = 'monthly';

-- Update Pro plan price
UPDATE plan_prices
SET stripe_price_id = 'price_1DEF...XYZ'
WHERE plan_id = 'pro' AND cadence = 'monthly';
```

---

## 🚨 Troubleshooting

### Issue: Webhook Not Receiving Events

**Solution:**
1. Check webhook URL is correct in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
3. Check webhook logs in Stripe Dashboard for error details
4. Ensure your app is deployed and accessible publicly

### Issue: Checkout Session Redirects to Wrong URL

**Solution:**
1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly
2. Ensure no trailing slash in URL
3. Redeploy after changing environment variables

### Issue: "Stripe API Version Deprecated" Warning

**Solution:**
- The app is pinned to API version `2025-09-30.clover`
- Stripe maintains backward compatibility for at least 1 year
- Update `src/lib/stripe.ts` if you need a different version

### Issue: Database Errors After Webhook Events

**Solution:**
1. Check Supabase RLS policies allow service role access
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check database schema matches expected structure:
   - Table: `user_subscriptions`
   - Columns: `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `plan`, etc.

---

## 📊 Monitoring

### Stripe Dashboard

- **Payments**: [https://dashboard.stripe.com/payments](https://dashboard.stripe.com/payments)
- **Subscriptions**: [https://dashboard.stripe.com/subscriptions](https://dashboard.stripe.com/subscriptions)
- **Webhooks**: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- **Logs**: [https://dashboard.stripe.com/logs](https://dashboard.stripe.com/logs)

### Vercel Logs

Monitor your API routes:
- `/api/stripe/webhook` - Webhook events
- `/api/stripe/checkout` - Checkout sessions
- `/api/stripe/portal` - Customer portal

### Database Monitoring

Check these tables in Supabase:
- `user_subscriptions` - Active subscriptions
- `user_usage` - AI generation usage
- `plan_prices` - Stripe price IDs

---

## 🎉 Success Criteria

Your Stripe integration is fully configured when:

- ✅ Test checkout creates a subscription in Stripe Dashboard
- ✅ Webhook events update database records
- ✅ Billing page shows correct subscription status
- ✅ AI generation limits enforce based on plan
- ✅ Upgrade flow transitions user from Starter → Pro
- ✅ Customer portal allows subscription management
- ✅ No errors in Vercel logs or Stripe webhook logs

---

## 📞 Need Help?

- **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
- **Vercel Documentation**: [https://vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)

---

## 🔄 Going to Production

When you're ready to launch with real payments:

1. **Switch to Stripe Live Mode**
   - Get your **Live API keys** from Stripe Dashboard
   - Update `STRIPE_SECRET_KEY` in Vercel to use `sk_live_...`
   - Create a new webhook endpoint for production with `whsec_live_...`

2. **Update Environment Variables**
   - Set `STRIPE_SECRET_KEY` to live key
   - Set `STRIPE_WEBHOOK_SECRET` to live webhook secret
   - Verify `NEXT_PUBLIC_SITE_URL` points to your production domain

3. **Test Thoroughly**
   - Use real test cards first
   - Verify all flows work in production
   - Monitor webhook delivery

4. **Enable Production Features**
   - Set up email notifications for failed payments
   - Configure Stripe Billing Portal settings
   - Set up tax collection if required

---

**Last Updated**: October 12, 2025
**Status**: Ready for Configuration

