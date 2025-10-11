# 🔧 Stripe Customer Portal Setup

## Issue
When clicking "Manage billing", you get:
```
No configuration provided and your test mode default configuration 
has not been created
```

## Solution (2 minutes)

### **Step 1: Go to Stripe Dashboard**
https://dashboard.stripe.com/test/settings/billing/portal

### **Step 2: Configure Portal Settings**
1. **Features to enable** (recommended):
   - ✅ Update payment method
   - ✅ Cancel subscription
   - ✅ View invoices

2. **Business information**:
   - Company name: Your Company Name
   - Support email: support@yourcompany.com
   - Support phone: (optional)

3. **Cancellation settings**:
   - When: At period end (recommended)
   - Customer feedback: Optional
   - Email confirmation: Enabled

### **Step 3: Save Configuration**
Click "Save changes" at the bottom

### **Step 4: Test**
1. Go back to your app
2. Click "Manage billing"
3. Should now open Stripe Customer Portal! ✅

---

## What Customers Can Do

Once configured, customers can:
- ✅ Update their payment method (credit card)
- ✅ Cancel their subscription
- ✅ View invoice history
- ✅ Download receipts
- ❌ Change plans (requires custom implementation)

---

## Production Setup

When moving to production:
1. Go to: https://dashboard.stripe.com/settings/billing/portal
2. Configure the same settings for **live mode**
3. Update your `.env.local` with live keys

---

**That's it!** The Customer Portal is hosted and maintained by Stripe, so you don't need to build any UI.

