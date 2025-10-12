# BlockModal Plan Detection & Messaging Fix

## Problems

### 1. Incorrect Plan Detection
The `BlockModal` was showing "You're on the highest plan" message for users on the Starter plan (50 generations) instead of showing an upgrade option to Pro (200 generations).

### 2. BlockModal Not Showing in MarketMapPanel
When clicking "Generate More" and hitting the limit, the API returned 402 but the `BlockModal` wasn't appearing.

### 3. Generic Messaging
The messaging for Starter users wasn't encouraging or acknowledging their achievement of using all 50 generations.

## Root Causes

### 1. Missing Plan Field in API Responses
When the API routes returned a 402 error, they were only including `used` and `allowed` in the response's `usage` object, but **not** the `plan` field:

```typescript
// ❌ BEFORE: Missing plan field
usage: { used, allowed },
```

### 2. Wrong Field Reference in MarketMapPanel
The `MarketMapPanel.tsx` was reading the plan from the wrong field when hitting the limit:
```typescript
// ❌ BEFORE: Reading from cta.plan (the upgrade target, not current plan)
plan: errorData.cta?.plan || 'trial'
```

### 3. No Plan-Specific Messaging
The BlockModal had a single generic message for all non-trial/free users, without acknowledging Starter users' achievement.

## Solution

### Files Changed

1. **`/api/analyse/route.ts`** (line 282):
Added `plan` and `isTrialing` to the 402 response:
```typescript
// ✅ AFTER: Includes plan and isTrialing
usage: { 
  used, 
  allowed,
  plan: isTrialing ? 'trial' : effectivePlan,
  isTrialing,
},
```

2. **`/api/generate-more/route.ts`** (line 85):
Added `plan` and `isTrialing` to the 402 response:
```typescript
// ✅ AFTER: Includes plan and isTrialing
usage: { 
  used, 
  allowed,
  plan: isTrialing ? 'trial' : effectivePlan,
  isTrialing,
},
```

3. **`page.tsx`** (line 316):
Updated to read the plan from the error response:
```typescript
// ✅ AFTER: Read from error response
plan: errorData.usage?.plan || 'trial'
```

4. **`MarketMapPanel.tsx`** (line 132):
Fixed to read the plan from the correct field:
```typescript
// ❌ BEFORE: Wrong field (upgrade target, not current plan)
plan: errorData.cta?.plan || 'trial'

// ✅ AFTER: Correct field (current plan)
plan: errorData.usage.plan || 'trial'
```

5. **`BlockModal.tsx`** (lines 63-73):
Added plan-specific messaging with encouragement for Starter users:
```tsx
{plan === 'starter' && (
  <>
    🎉 <strong>Amazing work!</strong> You've used all {allowed} AI generations this month. 
    You're clearly a power user! Upgrade to Pro for {suggestedGenerations} generations/month and keep the momentum going.
  </>
)}
```

## Result
Now the `BlockModal` correctly shows for both "Looks good - continue" and "Generate More" actions, with plan-specific messaging:

- **Trial users (10 gens)**: 
  - Message: "You've used all 10 AI generations in your trial. Upgrade to continue..."
  - Button: "Upgrade to Starter (£29/month)"

- **Free users**: 
  - Message: "You've used all X AI generations. Upgrade to continue..."
  - Button: "Upgrade to Starter (£29/month)"

- **Starter users (50 gens)**: ✅ **Fixed & Enhanced**
  - Message: "🎉 **Amazing work!** You've used all 50 AI generations this month. You're clearly a power user! Upgrade to Pro for 200 generations/month and keep the momentum going."
  - Button: "Upgrade to Pro (£99/month)"

- **Pro users (200 gens)**: 
  - Message: "🎊 **Incredible!** You've used all 200 AI generations this month. You're a true power user! We're working on a feature to unlock extra AI generations for users like you. Want early access? Send us an email at ionut.furnea@sellcorporation.com and we'll prioritize your request. Your limit resets next month."
  - Button: "Got it" (no upgrade option)
  - Email link: Pre-filled subject "Request for Extra AI Generations"

## Testing Checklist
- [ ] Hit limit as Trial user (via "Looks good - continue") → See "Upgrade to Starter" with standard message
- [ ] Hit limit as Starter user (via "Looks good - continue") → See "🎉 Amazing work!" message + "Upgrade to Pro" ✅
- [ ] Hit limit as Starter user (via "Generate More") → BlockModal appears (not just toast) ✅
- [ ] Hit limit as Pro user → See "highest plan" message with "Got it" button only
- [ ] Verify plan detection works for both `/api/analyse` and `/api/generate-more` endpoints
- [ ] Verify the upgrade button navigates to correct checkout flow
- [ ] Verify "Maybe later" button closes the modal for non-Pro users
- [ ] Verify messaging shows correct generation counts (10, 50, 200)

## Technical Details
The plan detection logic in `BlockModal.tsx` remains unchanged (lines 34-37):
```typescript
const isTrialOrFree = plan === 'trial' || plan === 'free';
const suggestedPlan = isTrialOrFree || plan === 'starter' ? 'pro' : 'starter';
```

The fix ensures that the correct `plan` value ('trial', 'free', 'starter', or 'pro') is passed from the API to the modal.

