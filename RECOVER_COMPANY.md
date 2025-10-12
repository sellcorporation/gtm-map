# 🔧 Recover Lost Company (Reliable Surveyors)

Your manually added company "Reliable Surveyors" was created with a fake timestamp ID before the fix, so it never saved to the database. Let's recover it!

---

## 🚀 **Quick Recovery (Browser Console)**

### **Step 1: Check if it's still in localStorage**

Open your browser console (F12) and paste:

```javascript
// Check localStorage for the company
const data = JSON.parse(localStorage.getItem('gtm-data') || '{}');
const reliableSurveyors = data.prospects?.find(p => 
  p.name?.includes('Reliable') || p.domain?.includes('reliablesurveyors')
);

if (reliableSurveyors) {
  console.log('✅ FOUND IT!', reliableSurveyors);
  console.log('\n📋 Company Details:');
  console.log('Name:', reliableSurveyors.name);
  console.log('Domain:', reliableSurveyors.domain);
  console.log('ICP Score:', reliableSurveyors.icpScore);
  console.log('Confidence:', reliableSurveyors.confidence);
  console.log('Status:', reliableSurveyors.status);
  console.log('Rationale:', reliableSurveyors.rationale);
  console.log('Evidence:', reliableSurveyors.evidence);
  console.log('Decision Makers:', reliableSurveyors.decisionMakers);
  console.log('\n⚠️ Fake ID:', reliableSurveyors.id, '(timestamp - not in database)');
} else {
  console.log('❌ Not found in localStorage');
}
```

---

### **Step 2: Save it to the database**

If Step 1 found it, run this to save it properly:

```javascript
// Save to database via API
(async () => {
  const data = JSON.parse(localStorage.getItem('gtm-data') || '{}');
  const reliableSurveyors = data.prospects?.find(p => 
    p.name?.includes('Reliable') || p.domain?.includes('reliablesurveyors')
  );
  
  if (!reliableSurveyors) {
    console.error('❌ Company not found in localStorage');
    return;
  }
  
  console.log('🔄 Saving to database...');
  
  try {
    const response = await fetch('/api/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: reliableSurveyors.name,
        domain: reliableSurveyors.domain,
        icpScore: reliableSurveyors.icpScore,
        confidence: reliableSurveyors.confidence,
        rationale: reliableSurveyors.rationale,
        notes: reliableSurveyors.notes || 'Recovered from localStorage',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to save:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ SUCCESS! Saved with database ID:', result.company.id);
    console.log('📊 Saved company:', result.company);
    
    // Update localStorage with the real ID
    const oldId = reliableSurveyors.id;
    reliableSurveyors.id = result.company.id;
    reliableSurveyors.userId = result.company.userId;
    reliableSurveyors.createdAt = result.company.createdAt;
    reliableSurveyors.updatedAt = result.company.updatedAt;
    
    // Replace in localStorage
    data.prospects = data.prospects.map(p => 
      p.id === oldId ? reliableSurveyors : p
    );
    localStorage.setItem('gtm-data', JSON.stringify(data));
    
    console.log('✅ localStorage updated with real ID');
    console.log('\n🎉 RECOVERY COMPLETE! Refresh the page to see the company.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

---

## 🔄 **Alternative: Re-add Manually**

If localStorage doesn't have it, you'll need to re-add it:

1. **Click "Add Prospect Manually"**
2. **Enter details:**
   - Name: `Reliable Surveyors`
   - Domain: `reliablesurveyors.co.uk`
   - Enable "Use AI to analyze" ✅
3. **Click "Add Prospect"**
4. **It will now save properly** (bug is fixed!)

You'll need to re-generate decision makers and any other details you added.

---

## 🐛 **Why This Happened**

The bug was that manually added companies were:
- ❌ Created with `Date.now()` timestamp as ID (e.g., `1760273750372`)
- ❌ Stored only in localStorage
- ❌ Never saved to database
- ❌ When you tried to edit → Database rejected the timestamp ID
- ❌ On refresh → Loaded from database → Not there → Disappeared

**This is now FIXED!** New manually added companies will:
- ✅ Save to database immediately
- ✅ Get real database IDs
- ✅ Persist across refreshes
- ✅ Can be edited without errors

---

## 📊 **Prevention (Already Fixed)**

The fix ensures:
1. **With AI analysis**: `/api/company/analyze` now saves to database and returns real ID
2. **Without AI**: `/api/company` POST endpoint saves to database and returns real ID
3. **Frontend uses real IDs** from the database response
4. **No more timestamp IDs** ✅

---

## 🆘 **Need Help?**

If the browser console recovery doesn't work, you can:

1. **Export your localStorage data**:
   ```javascript
   copy(localStorage.getItem('gtm-data'))
   ```
   
2. **Save it to a file** (e.g., `localStorage-data.json`)

3. **Run the recovery script**:
   ```bash
   node scripts/recover-localStorage-companies.mjs YOUR_USER_ID localStorage-data.json
   ```

Replace `YOUR_USER_ID` with your actual Supabase user ID (found in Supabase dashboard or by running `supabase.auth.getUser()` in console).

---

## ✅ **After Recovery**

1. ✅ Company will appear in your list
2. ✅ It will have a real database ID
3. ✅ You can edit and save it normally
4. ✅ It will persist across refreshes
5. ✅ All your AI-generated details will be there (if recovered from localStorage)

**Try the browser console recovery first - it's the quickest!** 🚀

