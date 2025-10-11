# ✅ READY FOR END-TO-END TESTING!

**Status**: 🟢 All systems operational  
**Branch**: `settings-and-billing`  
**Date**: October 11, 2025

---

## 🎯 WHAT'S RUNNING

### ✅ **Database Migration** - COMPLETE
- 📊 Subscription plans seeded (Free, Starter £29, Pro £99)
- 💰 Stripe price IDs configured
- 🎣 Post-signup trigger installed
- ⚙️  RPC functions ready (`increment_usage`, `increment_trial_usage`)
- 🔒 RLS policies active

### ✅ **Stripe Webhook** - LIVE
- 🔗 Listening at: `localhost:3000/api/stripe/webhook`
- 🔑 Signing secret: `whsec_4f4f...811d`
- 📝 Logs: `stripe-webhook.log`
- 🎯 Status: **Ready for events**

### ✅ **Next.js Dev Server** - RUNNING
- 🌐 URL: http://localhost:3000
- 🔥 Hot reload enabled
- 🔐 Auth: Supabase (email verification required)

---

## 🧪 END-TO-END TEST SCENARIOS

### **Test 1: New User Signup & Trial** (5 min)

**Goal**: Verify trial creation on signup

1. **Sign up**:
   - Go to http://localhost:3000/signup
   - Email: `test+trial1@example.com`
   - Password: `SecurePass123!`
   - Full name: `Trial User 1`

2. **Verify email**:
   - Check Supabase Auth → Users in dashboard
   - Click "Send confirmation email" if needed
   - Check email and click verification link

3. **Check trial in database**:
   ```sql
   -- In Supabase SQL Editor:
   SELECT * FROM trial_usage 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+trial1@example.com');
   
   -- Expected:
   -- generations_used: 0
   -- max_generations: 10
   -- expires_at: ~14 days from now
   ```

4. **Check subscription**:
   ```sql
   SELECT * FROM user_subscriptions 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+trial1@example.com');
   
   -- Expected:
   -- plan_id: 'free'
   -- status: 'active'
   -- stripe_customer_id: NULL (no checkout yet)
   ```

✅ **Success criteria**: Trial row exists with 10 gens, 14 days

---

### **Test 2: Billing Page & Upgrade Flow** (10 min)

**Goal**: Complete checkout and verify webhook processing

1. **Log in** as trial user

2. **Go to billing page**:
   - Navigate to http://localhost:3000/settings/billing
   - Expected: "Free Plan" with usage bar

3. **Upgrade to Starter**:
   - Click "Upgrade to Starter"
   - Redirected to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits
   - ZIP: any 5 digits

4. **Complete checkout**:
   - Click "Subscribe"
   - Wait for redirect back to app
   - Should see success message

5. **Check webhook logs**:
   ```bash
   tail -20 stripe-webhook.log
   ```
   - Expected: `checkout.session.completed` event received

6. **Verify in database**:
   ```sql
   SELECT * FROM user_subscriptions 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+trial1@example.com');
   
   -- Expected:
   -- plan_id: 'starter'
   -- status: 'active'
   -- stripe_customer_id: cus_xxxxx (real Stripe ID)
   -- stripe_subscription_id: sub_xxxxx
   -- stripe_price_id: price_1SHAhF2NFEywlXB6X3XqISK9
   ```

7. **Check Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/test/subscriptions
   - Find the new subscription
   - Customer email should match

✅ **Success criteria**: Subscription upgraded, webhook processed, DB updated

---

### **Test 3: Usage Tracking** (when integrated)

**Note**: This test requires integrating enforcement into an AI route.

**Example integration** (see `src/app/api/generate-more/route_EXAMPLE.ts`):

1. Call `getEffectiveEntitlements(userId)` before AI generation
2. Check if `used >= thresholds.blockAt` → return 402
3. Call `incrementUsage(userId, isTrialing)` after check
4. Proceed with AI generation

**Test steps**:
1. Make 45 AI generations (Starter plan)
2. Expected: Warning appears at 45/50
3. Make 5 more generations
4. Expected: Block modal at 50/50
5. Try to generate → 402 error

---

## 🔍 VERIFICATION QUERIES

### **Check all users with trials**:
```sql
SELECT 
  u.email,
  us.plan_id,
  us.status,
  tu.generations_used,
  tu.max_generations,
  tu.expires_at,
  tu.expires_at > now() as is_active
FROM auth.users u
JOIN user_subscriptions us ON us.user_id = u.id
LEFT JOIN trial_usage tu ON tu.user_id = u.id
ORDER BY u.created_at DESC;
```

### **Check all subscriptions**:
```sql
SELECT 
  u.email,
  us.plan_id,
  us.status,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_start,
  us.current_period_end
FROM auth.users u
JOIN user_subscriptions us ON us.user_id = u.id
ORDER BY us.updated_at DESC;
```

### **Check webhook events processed**:
```sql
SELECT * FROM stripe_events 
ORDER BY received_at DESC 
LIMIT 10;
```

---

## 🚨 TROUBLESHOOTING

### **Webhook not receiving events**:
1. Check `stripe-webhook.log` for errors
2. Verify webhook is running: `ps aux | grep stripe`
3. Restart: 
   ```bash
   pkill -f "stripe listen"
   ./stripe listen --forward-to localhost:3000/api/stripe/webhook &
   ```

### **Checkout redirects to wrong URL**:
- Check `NEXT_PUBLIC_SITE_URL` in `.env.local`
- Should be: `http://localhost:3000`

### **Database errors**:
- Check RLS policies: Users should **read-only** for billing tables
- Service role writes bypass RLS

### **Email verification not working**:
- Check Supabase → Authentication → Email Templates
- Check spam folder
- Use "Send confirmation email" in dashboard

---

## 📊 TEST DATA CARDS

**Stripe Test Cards**:
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`
- 🔐 3D Secure: `4000 0027 6000 3184`

**Test Emails**:
- Use `+` for unique emails: `your.email+test1@gmail.com`

---

## 🎯 ACCEPTANCE CHECKLIST

Before merging to `main`:

- [ ] New user signup creates trial (14 days, 10 gens)
- [ ] Trial shows in database with correct dates
- [ ] Billing page loads and shows correct plan
- [ ] Checkout flow works for Starter
- [ ] Checkout flow works for Pro
- [ ] Webhook receives `checkout.session.completed`
- [ ] Database updates with Stripe IDs
- [ ] Stripe Dashboard shows subscription
- [ ] RLS blocks cross-user access
- [ ] Idempotency works (replay webhook doesn't duplicate)

---

## 🚀 SERVICES STATUS

**Current Status** (as of now):

✅ **Stripe Webhook Listener**: RUNNING  
   - Process ID: Check with `ps aux | grep stripe`
   - Log file: `stripe-webhook.log`
   - Endpoint: `localhost:3000/api/stripe/webhook`

✅ **Next.js Dev Server**: RUNNING  
   - URL: http://localhost:3000
   - Process ID: Check with `ps aux | grep next`

✅ **Database**: CONNECTED  
   - Tables: Created ✓
   - Seed data: Loaded ✓
   - RLS: Active ✓

---

## 🎊 YOU'RE ALL SET!

Everything is configured and running. You can now:

1. **Test the signup flow** (create trial user)
2. **Test the billing page** (view plans)
3. **Test the checkout** (upgrade to Starter/Pro)
4. **Verify webhooks** (check logs)
5. **Inspect database** (confirm data)

**Need help?** Let me know if you hit any issues!

---

## 📝 NEXT STEPS (AFTER TESTING)

Once you confirm everything works:

1. **Integrate enforcement** into AI routes
2. **Add Customer Portal** endpoint
3. **Test trial expiry** (optional - can mock date)
4. **Approve merge to main**
5. **Deploy to Vercel**

**Remember**: This branch is isolated - no auto-deploy! 🚀

