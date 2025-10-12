# 🎯 "Generate More" BlockModal & Pre-Check Fix

## Problems Reported

User clicked "Generate More Prospects" after hitting limit (10/10) and encountered TWO critical issues:

### Issue 1: ❌ **AI Chat Starts Before Limit Check**
- "AI working and initialising" log/chat appeared
- BUT user was at their limit and shouldn't see any AI processing
- **Expected**: Limit check FIRST, then AI processing (if allowed)

### Issue 2: ❌ **BlockModal Not Showing**
- Only saw a toast notification with "Upgrade to Starter" button
- **Expected**: Full-screen BlockModal (like in initial analysis)

---

## Root Causes

### **Issue 1: Pre-Check Problem**
**File**: `src/components/MarketMapPanel.tsx` (` handleGenerateMore`)

**BEFORE** (Wrong Order):
```typescript
const handleGenerateMore = async () => {
  // ❌ Show UI immediately
  setIsGenerating(true);
  setGenerateProgress([]);
  setShowGenerateProgress(true);
  
  // THEN make API call
  const response = await fetch('/api/generate-more', ...);
  
  // Check limit (too late, UI already shown)
  if (response.status === 402) {
    // ...
  }
}
```

**Problem**: The "AI working" chat appears BEFORE the API call checks the limit.

---

### **Issue 2: BlockModal Not Accessible**
**File**: `src/components/MarketMapPanel.tsx`

**Problem**: The component doesn't have access to `setShowBlockModal` from parent `page.tsx`, so it can only show a toast notification.

---

## Fixes Applied

### ✅ **Fix 1: Pre-Check Before UI (MarketMapPanel.tsx)**

**AFTER** (Correct Order):
```typescript
const handleGenerateMore = async () => {
  // ✅ FIRST: Make API call (don't show UI yet)
  const response = await fetch('/api/generate-more', ...);
  
  // Check limit BEFORE showing any UI
  if (response.status === 402) {
    // Show BlockModal (no UI started)
    if (onShowBlockModal && errorData.usage) {
      onShowBlockModal({
        used: errorData.usage.used,
        allowed: errorData.usage.allowed,
        plan: errorData.cta?.plan || 'trial'
      });
    }
    return; // Exit early
  }
  
  // ✅ ONLY NOW: Show "AI working" UI (limit check passed)
  setIsGenerating(true);
  setGenerateProgress([]);
  setShowGenerateProgress(true);
  toast.info(`Searching for ${batchSize} new high-quality prospects...`);
  
  // Process SSE stream...
}
```

**Key Changes**:
1. API call happens FIRST (line 99)
2. 402 check happens BEFORE any UI state changes (lines 118-150)
3. UI only appears AFTER limit check passes (lines 157-160)

---

### ✅ **Fix 2: BlockModal Access (page.tsx & MarketMapPanel.tsx)**

**1. Added prop to MarketMapPanel interface**:
```typescript
interface MarketMapPanelProps {
  // ... existing props
  onShowBlockModal?: (data: { used: number; allowed: number; plan: string }) => void;
}
```

**2. Passed callback from page.tsx**:
```typescript
<MarketMapPanel
  // ... existing props
  onShowBlockModal={(data) => {
    setBlockModalData(data);
    setShowBlockModal(true);
  }}
/>
```

**3. Triggered in handleGenerateMore (MarketMapPanel.tsx)**:
```typescript
if (response.status === 402) {
  const errorData = await response.json();
  
  // Refresh usage counter
  if (onUsageUpdate) {
    await onUsageUpdate();
  }
  
  // Show BlockModal if callback provided
  if (onShowBlockModal && errorData.usage) {
    onShowBlockModal({
      used: errorData.usage.used,
      allowed: errorData.usage.allowed,
      plan: errorData.cta?.plan || 'trial'
    });
  }
  
  return; // Exit before showing UI
}
```

---

## User Experience Flow (After Fix)

### **Trial User (10/10 limit) Clicks "Generate More"**

1. ✅ User clicks "Generate More Prospects" button
2. ✅ **No UI appears yet** (no "AI working" chat)
3. ✅ Backend receives request, checks limit, returns 402
4. ✅ Frontend receives 402 **BEFORE** showing any UI
5. ✅ **BlockModal appears** (full-screen overlay):
   - 🔒 Lock icon
   - "You've reached your limit"
   - "You've used all 10 AI generations in your trial"
   - **"Upgrade to Pro (£99/month)"** button
   - "Maybe later" option
6. ✅ Usage counter updates (10/10)
7. ✅ No AI processing started (clean, no wasted work)

---

## Acceptance Criteria ✅

### **Issue 1: Pre-Check**
- [x] API call happens BEFORE showing "AI working" UI
- [x] If at limit (402), no UI appears at all
- [x] If limit check passes, THEN show "AI working" chat
- [x] No wasted AI processing for blocked users

### **Issue 2: BlockModal**
- [x] BlockModal shows for "Generate More" (not just toast)
- [x] Modal displays correct usage data (10/10, trial, etc.)
- [x] "Upgrade to Pro" button redirects to `/settings/billing`
- [x] "Maybe later" dismisses modal
- [x] Consistent with initial analysis flow

---

## Files Changed

### 1. **`src/components/MarketMapPanel.tsx`**
- **Lines 19**: Added `onShowBlockModal` prop to interface
- **Lines 30**: Added prop to function params
- **Lines 97-150**: Reordered flow (API call first, UI later)
- **Lines 127-132**: Trigger BlockModal on 402
- **Lines 156-160**: Moved UI state updates AFTER limit check

### 2. **`src/app/page.tsx`**
- **Lines 809-812**: Added `onShowBlockModal` callback to MarketMapPanel

---

## Testing Steps

### **Test 1: At Limit (10/10)**
1. Exhaust trial limit (10 AI generations)
2. Click "Generate More Prospects"
3. ✅ **No "AI working" chat appears**
4. ✅ **BlockModal appears immediately**
5. ✅ Modal shows "You've used all 10 AI generations in your trial"
6. ✅ "Upgrade to Pro (£99/month)" button visible
7. Click "Maybe later" → modal dismisses

### **Test 2: Near Limit (8/10)**
1. Use 8 AI generations
2. Click "Generate More Prospects"
3. ✅ **"AI working" chat appears** (limit not reached)
4. ✅ AI processing starts
5. ✅ WarningBanner shows "2 generations left"

### **Test 3: Well Below Limit (3/10)**
1. Use 3 AI generations
2. Click "Generate More Prospects"
3. ✅ **"AI working" chat appears immediately**
4. ✅ AI processing starts
5. ✅ No warnings

---

## Comparison: Before vs After

| Aspect | Before ❌ | After ✅ |
|--------|----------|----------|
| **Limit Check Timing** | After UI starts | Before UI starts |
| **"AI working" Chat** | Always shows | Only if limit check passes |
| **At Limit UI** | Toast notification | BlockModal (full-screen) |
| **User Experience** | Confusing (starts then stops) | Clean (blocks immediately) |
| **Wasted Processing** | API call still made | No wasted work |
| **Consistency** | Different from initial analysis | Consistent across app |

---

## Related Fixes

This fix also prepares the ground for **Find Competitors** to use BlockModal:

```typescript
// In ProspectsTab.tsx (future enhancement)
const findCompetitors = async (...) => {
  const response = await fetch('/api/company/competitors', ...);
  
  if (response.status === 402) {
    if (onShowBlockModal && errorData.usage) {
      onShowBlockModal({...});
    }
    return;
  }
  
  // Only NOW: Show "Finding competitors" UI
  // ...
};
```

---

## Summary

**Problem 1**: "AI working" chat appeared even when user was at limit.  
**Fix 1**: API call and limit check now happen BEFORE any UI appears.

**Problem 2**: Only toast notification shown instead of BlockModal.  
**Fix 2**: Passed `onShowBlockModal` callback from `page.tsx` to `MarketMapPanel`, triggering full BlockModal on 402.

**Result**: Clean, professional UX that matches the initial analysis flow. User sees BlockModal immediately when at limit, with no confusing "AI working" state.

---

**Status**: ✅ **FIXED & READY TO TEST**

Test it now by clicking "Generate More Prospects" when at your 10/10 limit! 🚀

