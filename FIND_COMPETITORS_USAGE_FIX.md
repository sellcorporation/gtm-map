# 🔍 Find Competitors Usage Counter Fix

## **PROBLEM REPORTED**

User clicked "Find Competitors" for a specific company:
1. ✅ AI ran and found 1 competitor
2. ❌ Usage counter didn't update (still showed old count)
3. ✅ After page refresh → counter updated correctly

**Same issue as before**: Usage counter not updating in real-time after AI generation.

---

## **ROOT CAUSE**

The `findCompetitors` function in `ProspectsTab.tsx`:
- ✅ Calls `/api/company/competitors` (consumes AI generation)
- ✅ Adds new competitors to the UI
- ✅ Shows success toast
- ❌ **Never calls `onUsageUpdate()` to refresh the counter**
- ❌ **Didn't have `onUsageUpdate` prop at all**

---

## **THE FIX**

### **1. Added `onUsageUpdate` Prop to ProspectsTab**

```typescript
interface ProspectsTabProps {
  prospects: Company[];
  icp?: ICP;
  onStatusUpdate: (id: number, status: string) => Promise<void>;
  onProspectUpdate: (updatedProspect: Company) => void;
  onGenerateMore?: () => void;
  onMarkAsCustomer?: (prospect: Company) => void;
  onUsageUpdate?: () => Promise<void>; // ✅ Added
  showImportModal?: boolean;
  setShowImportModal?: (show: boolean) => void;
}
```

### **2. Added 402 Error Handling**

```typescript
// In findCompetitors function
// Handle 402 Payment Required (limit reached)
if (response.status === 402) {
  const errorData = await response.json();
  const plan = errorData.cta?.plan || 'Starter';
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  
  toast.error(errorData.message || 'You have reached your AI generation limit', {
    duration: 10000,
    action: {
      label: `Upgrade to ${planName}`,
      onClick: () => {
        window.location.href = '/settings/billing';
      },
    },
  });
  
  // ✅ Refresh usage to show updated state
  if (onUsageUpdate) {
    await onUsageUpdate();
  }
  
  return;
}
```

### **3. Refresh After Success**

```typescript
// Handle final result
if (finalResult && finalResult.success && finalResult.competitors.length > 0) {
  // Add new competitors...
  newCompetitors.forEach((competitor: Company) => {
    onProspectUpdate(competitor);
  });

  // Show success toast
  setTimeout(() => {
    toast.success(`Found and added ${newCompetitors.length} competitor(s) of ${prospect.name}!`);
  }, 100);
  
  // ✅ Refresh usage counter immediately after successful competitor search
  if (onUsageUpdate) {
    await onUsageUpdate();
  }
  
  // Clear progress...
}
```

### **4. Refresh Even When No Competitors Found**

```typescript
} else if (finalResult) {
  toast.info(finalResult.message || `No new competitors found for ${prospect.name}.`);
  
  // ✅ Still refresh usage even if no competitors found (usage was still consumed)
  if (onUsageUpdate) {
    await onUsageUpdate();
  }
  
  setTimeout(() => {
    setCompetitorProgress([]);
  }, 2000);
}
```

### **5. Pass Prop from MarketMapPanel to ProspectsTab**

```typescript
<ProspectsTab 
  prospects={prospects}
  icp={icp}
  onStatusUpdate={onStatusUpdate}
  onProspectUpdate={onProspectUpdate}
  onGenerateMore={handleGenerateMore}
  onMarkAsCustomer={onMarkAsCustomer}
  onUsageUpdate={onUsageUpdate} // ✅ Pass down from MarketMapPanel
  showImportModal={showImportModal}
  setShowImportModal={setShowImportModal}
/>
```

---

## **USAGE UPDATE FLOW (AFTER FIX)**

```
1. User clicks "Find Competitors" button
2. findCompetitors() runs → calls /api/company/competitors
3. API increments usage counter in database ✅
4. Frontend receives competitor results ✅
5. Competitors added to UI ✅
6. onUsageUpdate() called immediately ✅
7. Usage badge updates in real-time ✅
8. User sees updated count without refresh ✅
```

---

## **CONSISTENCY ACROSS ALL AI FEATURES**

Now **ALL** AI generation features update usage immediately:

| Feature | Updates Usage Counter? |
|---------|------------------------|
| Initial Analysis | ✅ YES |
| Generate More | ✅ YES |
| Find Competitors | ✅ YES (newly fixed) |
| Manual Prospect Analysis | ✅ YES |
| Decision Makers Generation | ✅ YES |
| 402 Limit Error (all features) | ✅ YES |

---

## **TESTING**

### **Test Real-Time Update After Finding Competitors**

1. **Clear your usage** (for clean test):
```bash
cd /Users/ionutfurnea/gtm-map
node scripts/restore-trial.mjs ionutfurnea@gmail.com
```

2. **Run initial analysis:**
   - Reload app
   - Complete full analysis (uses 1 generation)
   - **Note**: Usage should show "1/10" immediately ✅

3. **Test Find Competitors:**
   - Click on any prospect
   - Click "Find Competitors" button
   - Wait for competitors to be found
   - **Verify**: Usage counter updates immediately to "2/10" **without refreshing** ✅

4. **Test 402 Handling:**
   - Use up all generations (hit limit)
   - Try to find competitors
   - **Verify**: 
     - Clear error message with upgrade button ✅
     - Usage counter shows limit state ✅

---

## **WHY ONLY 1 COMPETITOR FOUND?**

The user mentioned finding only 1 competitor. This could be due to:

1. **🎯 High Quality Threshold**
   - The API filters competitors by ICP score and quality
   - Only high-quality, relevant matches are added
   - Low-scoring competitors are intentionally skipped

2. **🔄 Duplicate Detection**
   - Competitors already in your list are skipped
   - Prevents duplicate entries

3. **🌐 Limited Search Results**
   - Perplexity API might have returned few relevant results
   - Some domains might be unreachable or invalid

4. **✅ This is Expected Behavior**
   - Better to have 1 high-quality competitor than 10 low-quality ones
   - The algorithm prioritizes quality over quantity

**To find more competitors:**
- Try different existing prospects as the search base
- Lower the `gtm-min-icp-score` setting (currently 50)
- Check that the target company has a clear market niche

---

## **BENEFITS**

| Before | After |
|--------|-------|
| ❌ Stale usage counter after finding competitors | ✅ Real-time updates |
| ❌ No 402 error handling | ✅ Clear upgrade prompt |
| ❌ Usage only visible after refresh | ✅ Immediate feedback |
| ❌ Inconsistent behavior across features | ✅ Consistent everywhere |

---

## **FILES CHANGED**

1. **`/Users/ionutfurnea/gtm-map/src/components/ProspectsTab.tsx`**
   - Added `onUsageUpdate` prop to interface
   - Added 402 error handling in `findCompetitors`
   - Call `onUsageUpdate` after success (with or without results)

2. **`/Users/ionutfurnea/gtm-map/src/components/MarketMapPanel.tsx`**
   - Pass `onUsageUpdate` prop to `ProspectsTab`

---

## **STATUS**
✅ **FIXED** - Ready to test!

The usage counter will now update in real-time immediately after:
1. ✅ Initial analysis completes
2. ✅ Generate More completes
3. ✅ Find Competitors completes (newly fixed)
4. ✅ Manual prospect analysis completes
5. ✅ User hits their limit (402 error)

No more page refreshes needed! All AI features now have consistent, real-time usage tracking. 🎉

