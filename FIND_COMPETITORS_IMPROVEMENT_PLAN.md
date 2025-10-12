# 🎯 Find Competitors Feature - Improvement Plan

## **PROBLEM STATEMENT**

**Current Behavior:** Find Competitors often returns only 1-2 companies instead of the requested 10.

**Expected Behavior:** When settings specify 10 prospects, the feature should deliver 10 high-quality competitors (internet has plenty of them).

**User Feedback:**
> "High-quality prospects because the internet is filled with them. Maybe you have to increase the search time or the context that's given to the AI when it's looking for more competitors of a company. There are many lists, blogs, and websites that display regionally."

---

## **CURRENT STATE ANALYSIS**

### **How It Works Now**

```
1. Run 3 search queries (via Tavily API)
   ├─ "{company} competitors {industry}"
   ├─ "alternative to {company} {industry}"
   └─ "companies like {company} {industry}"
   
2. AI extracts competitor names from search results
   └─ Limited to first 4000 chars of search results ❌
   
3. For each name, find their website domain
   └─ Stops at batchSize * 2 candidates ❌
   
4. For each candidate, analyze with AI
   └─ Fetch website → AI analyze → Score/Filter
   
5. Filter by ICP score threshold
   └─ min_icp_score = 50 (from settings)
   
6. Return qualifying competitors
```

### **🚨 Critical Bottlenecks**

| Issue | Impact | Severity |
|-------|--------|----------|
| **1. Limited Search Results** | Only 6 results per query × 3 queries = 18 total | 🔴 HIGH |
| **2. Truncated Context** | AI only sees first 4000 chars | 🔴 HIGH |
| **3. Early Exit Logic** | Stops at `batchSize * 2` (20 for 10 requested) | 🔴 HIGH |
| **4. Single Search Provider** | Only Tavily (no fallback/parallel) | 🟡 MEDIUM |
| **5. No Regional Sources** | Doesn't search regional lists/directories | 🟡 MEDIUM |
| **6. Sequential Processing** | One competitor at a time | 🟡 MEDIUM |
| **7. No Retry Logic** | If domain unreachable, skip entirely | 🟡 MEDIUM |

### **Example Failure Scenario**

```
Goal: Find 10 competitors

Step 1: Search → 18 results
Step 2: AI extracts → 12 company names
Step 3: Domain lookup → 8 valid domains (4 failed/skipped)
Step 4: Analyze 8 candidates:
   - 3 websites timeout ❌
   - 2 score < 50 (filtered out) ❌
   - 2 already in list (duplicates) ❌
   - 1 qualifies ✅

Result: Only 1 competitor found (instead of 10) ❌
```

---

## **IMPROVED STATE - DETAILED PLAN**

### **🎯 Design Principles**

1. **Target-Driven**: Don't stop until we have `batchSize` high-quality results
2. **Multi-Sourced**: Cast a wider net using multiple search strategies
3. **Resilient**: Handle failures gracefully with retries and fallbacks
4. **Efficient**: Parallel processing where possible
5. **Quality-First**: Better filtering and scoring

---

### **🔄 Improved Flow**

```
PHASE 1: BROAD DISCOVERY (Get 3-5× the target)
├─ Run 6 search queries (2× current)
│  ├─ "{company} competitors {industry}"
│  ├─ "alternative to {company} {industry}"
│  ├─ "{company} vs comparison {industry}"
│  ├─ "best {industry} software like {company}"
│  ├─ "{industry} vendors similar to {company}"
│  └─ "top {industry} companies {geo}" (regional)
│
├─ Increase search results per query: 6 → 10
│  └─ Total: 60 search results (vs 18 current)
│
├─ Add regional/list sources
│  ├─ Capterra/G2 listings
│  ├─ "best {industry} companies UK/US/EU"
│  └─ Industry-specific directories
│
└─ AI extraction with FULL context
   ├─ No 4000 char truncation ✅
   ├─ Extract up to 30 names (vs 15 current)
   └─ Provide better context to AI

PHASE 2: INTELLIGENT CANDIDATE SELECTION
├─ Domain lookup with retry logic
│  ├─ Retry failed lookups with alternative queries
│  ├─ Parallel domain lookups (5 at a time)
│  └─ Target: 3-4× batch size candidates
│
└─ Smart pre-filtering
   ├─ Remove obvious non-companies early
   ├─ Deduplicate by domain similarity
   └─ Prioritize candidates with complete info

PHASE 3: ANALYSIS WITH ADAPTIVE STRATEGY
├─ Analyze in batches of 5 (parallel)
│
├─ Adaptive thresholds
│  ├─ Start with min_icp_score (50)
│  ├─ If not enough results, lower to 40
│  └─ If still not enough, lower to 30
│
├─ Website fetch with retry & timeout handling
│  ├─ Timeout: 10s → 15s
│  ├─ Retry once on failure
│  └─ Fallback to domain description if fetch fails
│
└─ Continue until target met or candidates exhausted
   ├─ Track: analyzed/qualified/target
   ├─ Dynamic reporting: "Analyzed 15, qualified 7, target 10"
   └─ Only stop when target reached or out of candidates

PHASE 4: QUALITY ASSURANCE
├─ Post-filter duplicates (domain similarity)
├─ Ensure minimum data quality
└─ Return exactly batchSize best matches
```

---

## **📊 DETAILED IMPROVEMENTS**

### **1. Enhanced Search Queries**

#### Current (3 queries, 18 results)
```typescript
const searchQueries = [
  `${companyName} competitors ${industry}`,
  `alternative to ${companyName} ${industry}`,
  `${industry} companies like ${companyName}`,
];
// 6 results per query = 18 total
```

#### Improved (6-8 queries, 60-80 results)
```typescript
const geo = icp.firmographics.geo || 'global';
const workflows = icp.workflows.slice(0, 2).join(' ');

const searchQueries = [
  // Direct competitors
  `${companyName} competitors ${industry}`,
  `${companyName} vs alternatives ${industry}`,
  
  // Functional alternatives
  `alternative to ${companyName} ${industry}`,
  `${industry} software like ${companyName}`,
  `best ${workflows} tools similar to ${companyName}`,
  
  // Regional/market searches
  `top ${industry} companies ${geo}`,
  `${industry} vendors ${geo}`,
  
  // List-based searches (optional, if budget allows)
  `${industry} software directory`,
];

// 10 results per query = 60-80 total ✅
```

### **2. Increase Search Result Limits**

```typescript
// Current
search_depth: 'basic'  // Returns ~6 results
max_results: 6

// Improved
search_depth: 'advanced' // Returns ~10 results
max_results: 10
```

### **3. Remove Context Truncation**

```typescript
// Current ❌
${searchResultsText.slice(0, 4000)}  // Cuts off important results

// Improved ✅
${searchResultsText.slice(0, 12000)}  // 3× more context
// Or use smart chunking if too large
```

### **4. Adaptive Candidate Pool**

```typescript
// Current ❌
for (const competitor of competitorNames) {
  if (candidates.length >= batchSize * 2) break;  // Stops at 20
}

// Improved ✅
const targetCandidates = Math.max(batchSize * 4, 30);  // At least 30 or 4× target
for (const competitor of competitorNames) {
  if (candidates.length >= targetCandidates) break;
}
```

### **5. Parallel Domain Lookups**

```typescript
// Current ❌ Sequential
for (const competitor of competitorNames) {
  const domain = await findDomain(competitor.name);
  if (domain) candidates.push({ name, domain });
}

// Improved ✅ Parallel (batches of 5)
const chunks = chunkArray(competitorNames, 5);
for (const chunk of chunks) {
  const results = await Promise.allSettled(
    chunk.map(c => findDomainWithRetry(c.name))
  );
  // Process fulfilled results
}
```

### **6. Adaptive ICP Score Thresholding**

```typescript
// Current ❌ Fixed threshold
const MIN_ICP_SCORE = settings.minIcpScore || 50;
if (icpScore >= MIN_ICP_SCORE) {
  // Add to qualified list
}

// Improved ✅ Adaptive thresholds
let currentThreshold = settings.minIcpScore || 50;
const qualifiedCompetitors: Company[] = [];

while (qualifiedCompetitors.length < batchSize && candidates.length > 0) {
  // Analyze batch
  const batch = candidates.splice(0, 5);
  const results = await analyzeBatch(batch, currentThreshold);
  
  qualifiedCompetitors.push(...results);
  
  // If not enough results and threshold is high, lower it
  if (qualifiedCompetitors.length < batchSize && 
      candidates.length > 0 && 
      currentThreshold > 30) {
    currentThreshold -= 10;
    sendUpdate(`📉 Adjusting threshold to ${currentThreshold} to find more matches`);
  }
}
```

### **7. Website Fetch Improvements**

```typescript
// Current ❌
const websiteContent = await fetchWebsiteContent(domain);
// No retry, no timeout handling

// Improved ✅
async function fetchWithRetry(domain: string, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s vs 10s
      
      const response = await fetch(`https://${domain}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0...' }
      });
      
      clearTimeout(timeout);
      return await response.text();
      
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }
      
      // Fallback: use domain description from search
      return await fetchDomainDescription(domain);
    }
  }
}
```

### **8. Progress Reporting**

```typescript
// Current ❌ Basic progress
sendUpdate(`✓ Found ${candidates.length} unique domains`);

// Improved ✅ Detailed tracking
sendUpdate(`📊 Progress: ${analyzed}/${candidates.length} analyzed, ${qualified.length}/${batchSize} qualified`);
sendUpdate(`🎯 Target: ${batchSize} | Found: ${qualified.length} | Analyzing next batch...`);
```

---

## **📈 EXPECTED OUTCOMES**

### **Before vs After Metrics**

| Metric | Current | Improved | Improvement |
|--------|---------|----------|-------------|
| **Search Results** | 18 | 60-80 | +333% |
| **Candidate Pool** | 12-15 | 25-40 | +200% |
| **Analysis Attempts** | 10-20 | 30-50 | +200% |
| **Success Rate** | 10-20% | 70-90% | +400% |
| **Avg Competitors Found** | 1-2 | 8-10 | +500% |
| **Time to Complete** | 30-45s | 60-90s | +100% ⚠️ |

### **Quality Improvements**

✅ **More Consistent**: Always delivers close to target (8-10 vs 1-2)  
✅ **More Comprehensive**: Casts wider net with regional and functional searches  
✅ **More Resilient**: Handles failures gracefully with retries and adaptive thresholds  
✅ **Better Context**: AI sees 3× more search results for better extraction  
✅ **Smarter Filtering**: Adaptive thresholds prevent over-filtering  

### **Trade-offs**

⚠️ **Increased API Costs**:
- Tavily: 3 queries → 6-8 queries (+100-150% cost)
- OpenAI: More analysis calls (but within reason)

⚠️ **Longer Processing Time**:
- 30-45s → 60-90s
- But users get **much better results** (8-10 vs 1-2)

✅ **Mitigation**:
- Parallel processing keeps time reasonable
- Progress updates keep user informed
- Results are worth the wait

---

## **🔧 IMPLEMENTATION PHASES**

### **Phase 1: Quick Wins (2-3 hours)**
- ✅ Increase search results per query: 6 → 10
- ✅ Remove 4000 char context truncation
- ✅ Increase candidate pool: batchSize × 2 → batchSize × 4
- ✅ Add 2-3 more search query variations

**Expected Impact**: 2-3× more competitors found

### **Phase 2: Core Improvements (4-6 hours)**
- ✅ Implement adaptive ICP score thresholds
- ✅ Add retry logic for website fetches
- ✅ Parallel domain lookups (batches of 5)
- ✅ Enhanced progress reporting

**Expected Impact**: 70-80% success rate (vs 20% current)

### **Phase 3: Advanced Features (6-8 hours)**
- ✅ Regional search queries based on ICP geo
- ✅ Parallel candidate analysis
- ✅ Fallback to domain descriptions when fetch fails
- ✅ Smart pre-filtering to eliminate obvious non-competitors

**Expected Impact**: 90%+ success rate, better quality

### **Phase 4: Polish (2-3 hours)**
- ✅ Better error messages and user feedback
- ✅ Configuration options (aggressive/balanced/conservative)
- ✅ Analytics/logging for monitoring success rates

---

## **🎬 ACCEPTANCE CRITERIA**

### **Must Have**
- [ ] Consistently finds 8-10 competitors when 10 is requested (80-100% fulfillment)
- [ ] Completes within 90 seconds (vs 45s current, but with 5× better results)
- [ ] Handles failures gracefully (no crashes, clear error messages)
- [ ] Real-time progress updates keep user informed

### **Should Have**
- [ ] Adaptive thresholds ensure target is met
- [ ] Parallel processing for speed
- [ ] Regional search queries for better coverage
- [ ] Retry logic for robustness

### **Nice to Have**
- [ ] Configurable aggressiveness (conservative/balanced/aggressive)
- [ ] Analytics dashboard showing success rates
- [ ] Cache frequently searched competitors

---

## **💭 OPEN QUESTIONS FOR REVIEW**

1. **API Cost vs Results**: Are you OK with 2× Tavily API cost for 5× better results?

2. **Processing Time**: Is 60-90 seconds acceptable for 8-10 competitors (vs 30-45s for 1-2)?

3. **Adaptive Thresholds**: Should we auto-lower ICP score threshold to meet target, or strictly honor user settings?

4. **Regional Focus**: Should we prioritize geo-specific searches based on ICP firmographics.geo?

5. **Batch Size Limits**: Should we cap at 10 competitors max, or allow 15-20 for power users?

---

## **📝 RECOMMENDATION**

**Implement in 2 phases:**

**Phase 1 (Quick Wins)** - Ship in 1 day:
- Increase search results and candidate pool
- Remove context truncation
- Add 2-3 more search queries
- **Impact**: 2-3× improvement immediately

**Phase 2 (Core Improvements)** - Ship in 3-4 days:
- Adaptive thresholds
- Retry logic
- Parallel processing
- Enhanced progress reporting
- **Impact**: 70-90% success rate

This approach gives immediate improvements while building toward the ideal solution.

---

## **🎯 SUCCESS METRICS (After Implementation)**

- ✅ 80-100% target fulfillment (8-10 competitors when 10 requested)
- ✅ 70-90% of searches complete successfully
- ✅ <90 seconds processing time
- ✅ <3% error rate
- ✅ User satisfaction with result quality

---

**Ready for your review!** Let me know:
1. Which phases to prioritize
2. Any concerns about API costs or processing time
3. Whether to implement adaptive thresholds or honor strict settings

