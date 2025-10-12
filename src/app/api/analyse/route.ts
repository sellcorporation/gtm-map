import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { db, companies, clusters, ads } from '@/lib/db';
import { extractICP, findCompetitors, generateAdCopy, analyzeWebsiteAgainstICP } from '@/lib/ai';
import { searchCompetitors, fetchWebsiteContent as fetchWebsite } from '@/lib/search';
import { AnalyseRequestSchema } from '@/lib/prompts';
import { getEffectiveEntitlements, incrementUsage } from '@/lib/billing/entitlements';
import type { ICP, Competitor, Evidence, Company } from '@/types';

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Add https:// if no protocol is provided
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }
    
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GTM-Map/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check size limit (1MB)
    if (html.length > 1024 * 1024) {
      throw new Error('Website content too large (max 1MB)');
    }
    
    // Parse HTML and extract text
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header').remove();
    
    // Extract text content
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error('Error fetching website:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        throw new Error('Domain not found. Please check the website URL and try again.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Connection refused. The website may be down or unreachable.');
      }
      if (error.message.includes('ETIMEDOUT')) {
        throw new Error('Connection timed out. The website took too long to respond.');
      }
    }
    
    throw new Error('Failed to fetch website content. Please verify the URL is correct.');
  }
}

async function computeICPScore(company: Competitor, icp: ICP): Promise<number> {
  // Simple scoring logic - in a real app, you'd use more sophisticated algorithms
  let score = 0;
  
  // Industry match (40 points)
  const industryMatch = icp.industries.some(industry => 
    company.rationale.toLowerCase().includes(industry.toLowerCase())
  );
  if (industryMatch) score += 40;
  
  // Workflow match (30 points) - changed from pains
  const workflows = icp.workflows || [];
  const workflowMatch = workflows.some(workflow => 
    company.rationale.toLowerCase().includes(workflow.toLowerCase())
  );
  if (workflowMatch) score += 30;
  
  // Buyer role match (20 points)
  const roleMatch = icp.buyerRoles.some(role => 
    company.rationale.toLowerCase().includes(role.toLowerCase())
  );
  if (roleMatch) score += 20;
  
  // Confidence bonus (10 points)
  score += Math.floor(company.confidence / 10);
  
  return Math.min(score, 100);
}

async function createClusters(prospects: Company[], icp: ICP, userId: string) {
  const clusterMap = new Map<string, number[]>();
  
  // Create multi-dimensional clusters based on ICP score ranges and characteristics
  prospects.forEach((prospect) => {
    // Determine cluster based on ICP score and dominant characteristics
        let clusterKey = '';
    
    // Primary dimension: ICP Score Range
    if (prospect.icpScore >= 80) {
      clusterKey += 'high-';
    } else if (prospect.icpScore >= 60) {
      clusterKey += 'medium-';
    } else {
      clusterKey += 'low-';
    }
    
    // Secondary dimension: Industry (from rationale)
    const industry = icp.industries.find(ind => 
      prospect.rationale.toLowerCase().includes(ind.toLowerCase())
    ) || icp.industries[0] || 'General';
    
    clusterKey += industry.toLowerCase().replace(/\s+/g, '-');
    
    if (!clusterMap.has(clusterKey)) {
      clusterMap.set(clusterKey, []);
    }
    clusterMap.get(clusterKey)!.push(prospect.id);
  });
  
  // Only create clusters with at least 2 companies (or keep single companies in a catch-all)
  const validClusters = new Map<string, { companyIds: number[], label: string }>();
  const singletons: number[] = [];
  
  for (const [key, companyIds] of clusterMap) {
    if (companyIds.length >= 2) {
      const label = key.split('-').slice(0, -1).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') + ' ' + key.split('-').pop()?.split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      
      validClusters.set(key, { companyIds, label });
    } else {
      singletons.push(...companyIds);
    }
  }
  
  // Create a catch-all cluster for singletons if there are any
  if (singletons.length > 0) {
    validClusters.set('other', { 
      companyIds: singletons, 
      label: 'Other Prospects' 
    });
  }
  
  const clusterRecords = [];
  const adRecords = [];
  
  for (const { companyIds, label } of validClusters.values()) {
    const clusterProspects = prospects.filter(p => companyIds.includes(p.id));
    
    const avgIcpScore = companyIds.reduce((sum, id) => {
      const prospect = prospects.find(p => p.id === id);
      return sum + (prospect?.icpScore || 0);
    }, 0) / companyIds.length;
    
    const avgConfidence = companyIds.reduce((sum, id) => {
      const prospect = prospects.find(p => p.id === id);
      return sum + (prospect?.confidence || 0);
    }, 0) / companyIds.length;
    
    // Determine dominant workflows and industries for this cluster
    const workflowCounts = new Map<string, number>();
    const industryCounts = new Map<string, number>();
    
    const workflows = icp.workflows || [];
    
    clusterProspects.forEach(prospect => {
      workflows.forEach(workflow => {
        if (prospect.rationale.toLowerCase().includes(workflow.toLowerCase())) {
          workflowCounts.set(workflow, (workflowCounts.get(workflow) || 0) + 1);
        }
      });
      
      icp.industries.forEach(industry => {
        if (prospect.rationale.toLowerCase().includes(industry.toLowerCase())) {
          industryCounts.set(industry, (industryCounts.get(industry) || 0) + 1);
        }
      });
    });
    
    const dominantWorkflow = Array.from(workflowCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || workflows[0] || '';
    
    const dominantIndustry = Array.from(industryCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || icp.industries[0];
    
    const cluster = await db.insert(clusters).values({
      userId,
      label,
      criteria: { 
        avgIcpScore: Math.round(avgIcpScore),
        avgConfidence: Math.round(avgConfidence),
        dominantIndustry,
        dominantPain: dominantWorkflow, // Store workflow in dominantPain field
        companyCount: companyIds.length
      },
      companyIds,
    }).returning();
    
    clusterRecords.push(cluster[0]);
    
    // Generate ad copy for this cluster using dominant characteristics
    const { adCopy } = await generateAdCopy(
      dominantIndustry,
      [dominantWorkflow],
      [dominantIndustry],
      icp.buyerRoles
    );
    
    const ad = await db.insert(ads).values({
      clusterId: cluster[0].id,
      headline: adCopy.headline,
      lines: adCopy.lines,
      cta: adCopy.cta,
    }).returning();
    
    adRecords.push(ad[0]);
  }
  
  return { clusters: clusterRecords, ads: adRecords };
}

async function analyseHandler(request: NextRequest) {
  try {
    // ========== AUTH & BILLING ENFORCEMENT (BEFORE STREAMING) ==========
    console.log('[ANALYSE] Checking authentication and billing...');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[ANALYSE] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ANALYSE] User authenticated:', user.email);

    const { effectivePlan, isTrialing, allowed, used, thresholds } = 
      await getEffectiveEntitlements(user.id);

    console.log('[ANALYSE] Entitlements:', {
      plan: effectivePlan,
      trial: isTrialing,
      used,
      allowed,
      thresholds,
    });

    // ========== BLOCK BEFORE STREAMING IF AT LIMIT ==========
    if (used >= thresholds.blockAt) {
      console.log('[ANALYSE] BLOCKED: User at limit');
      const upgradePlan = effectivePlan === 'free' || isTrialing ? 'starter' : 'pro';
      return NextResponse.json({ 
        error: `You've reached your ${isTrialing ? 'trial' : effectivePlan} limit of ${allowed} AI generations this month.`,
        message: `You've reached your ${isTrialing ? 'trial' : effectivePlan} limit of ${allowed} AI generations this month.`,
        code: 'LIMIT_REACHED',
        usage: { 
          used, 
          allowed,
          plan: isTrialing ? 'trial' : effectivePlan,
          isTrialing,
        },
        cta: {
          type: 'upgrade',
          plan: upgradePlan,
          url: '/settings/billing',
        },
      }, { status: 402 });
    }

    const shouldWarn = used >= thresholds.warnAt;
    const remaining = allowed - used;

    if (shouldWarn) {
      console.log(`[ANALYSE] WARNING: User at ${used}/${allowed} (${remaining} left)`);
    }

    console.log('[ANALYSE] Incrementing usage...');
    try {
      await incrementUsage(user.id, isTrialing);
      console.log('[ANALYSE] Usage incremented successfully');
    } catch (usageError) {
      console.error('[ANALYSE] Failed to increment usage:', usageError);
      return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
    }

    // ========== PROCEED WITH ANALYSIS (START STREAMING) ==========
    const userId = user.id; // Use authenticated user's ID
    const body = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendMessage = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
        };

        try {
        const { websiteUrl, customers, icp: providedICP, batchSize } = AnalyseRequestSchema.parse(body);
        
        // Use provided batch size or default to 10
        const maxProspects = batchSize || 10;
        
        sendMessage(`🎯 Starting analysis for ${customers.length} customer(s), generating up to ${maxProspects} prospects...`);
    
    let icp: ICP;
    let icpIsMock = false;
    
    // Use provided ICP if available, otherwise extract from website
    if (providedICP) {
      icp = providedICP;
    } else {
      // Fetch and parse website content
      const websiteText = await fetchWebsiteContent(websiteUrl);
      
      // Extract ICP
      const extraction = await extractICP(websiteText);
      icp = extraction.icp;
      icpIsMock = extraction.isMock;
    }
    
        // Process each customer
        const allCompetitors: Competitor[] = [];
        let competitorsIsMock = false;
        
        sendMessage(`\n📊 Analyzing ${customers.length} customer company(ies)...`);
        
        for (const customer of customers) {
          // Check if we've reached the limit
          if (allCompetitors.length >= maxProspects) {
            break;
          }
          
          sendMessage(`🔍 Searching for competitors of ${customer.name}...`);
          
          // Search for competitors
          const searchResults = await searchCompetitors(customer.domain, icp.industries[0] || '');
      
          // Find competitors using AI
          // Calculate how many more prospects we need
          const remainingNeeded = maxProspects - allCompetitors.length;
          const { competitors, isMock: isMock } = await findCompetitors(
            customer.domain,
            customer.name,
            icp,
            searchResults,
            remainingNeeded // Pass the batch size to AI
          );
          
          sendMessage(`✅ Found ${competitors.length} potential competitors for ${customer.name}`);
          
          if (isMock) {
            competitorsIsMock = true;
          }
          
          // Add source customer info and search for missing domains
          for (const competitor of competitors) {
            competitor.evidenceUrls = competitor.evidenceUrls.slice(0, 3); // Limit to 3 URLs
            
            // Check if domain is invalid and try to find the real one
            const invalidDomains = ['n/a', 'na', 'unknown', 'not found', 'none', 'n'];
            const domain = competitor.domain.toLowerCase().trim();
            const isInvalid = invalidDomains.includes(domain) || domain.length < 3 || !domain.includes('.');
            
            if (isInvalid) {
              sendMessage(`⚠️ Invalid domain for ${competitor.name}, searching for correct domain...`);
              
              // Try to find the real domain using Tavily search
              try {
                const tavilyKey = process.env.TAVILY_API_KEY;
                if (tavilyKey) {
                  const searchQuery = `${competitor.name} official website`;
                  const searchResponse = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      api_key: tavilyKey,
                      query: searchQuery,
                      max_results: 3,
                    }),
                  });
                  
                  if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.results && searchData.results.length > 0) {
                      const url = searchData.results[0].url;
                      const foundDomain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                      competitor.domain = foundDomain;
                      sendMessage(`✅ Found domain for ${competitor.name}: ${foundDomain}`);
                    } else {
                      sendMessage(`❌ Could not find domain for ${competitor.name}`);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error searching for domain for ${competitor.name}:`, error);
              }
            }
          }
          
          // Only add up to the remaining slots
          const remainingSlots = maxProspects - allCompetitors.length;
          const competitorsToAdd = competitors.slice(0, remainingSlots);
          allCompetitors.push(...competitorsToAdd);
        }
    
    // Helper function to validate if a name is a real company name
    const isValidCompanyName = (name: string): boolean => {
      const lowerName = name.toLowerCase();
      
      // Filter out article titles and aggregator listings
      const badPatterns = [
        /^\d+\s+(types|ways|best|top|great)/i, // "11 Types of...", "Top 10..."
        /^(best|top)\s+\d+/i, // "Best 10...", "Top 5..."
        /surveyors?\s+in\s+/i, // "Surveyors in New York"
        /\sin\s+\w+,?\s+\w+$/i, // Ends with "in Location, State"
        /^the\s+best/i, // "THE BEST..."
        /^the\s+\d+/i, // "The 10..."
        /what\s+(are|is)\s+the/i, // "What are the..."
        /(directory|list|guide|review)/i, // Directory/list indicators
        /\d+\s+best/i, // "10 Best..."
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(name)) {
          return false;
        }
      }
      
      return true;
    };
    
    // Filter out invalid domains and bad company names
    sendMessage(`\n🔍 Validating company names and domains...`);
    const invalidDomains = ['n/a', 'na', 'unknown', 'not found', 'none', 'n'];
    const validCompetitors = allCompetitors.filter(competitor => {
      // Validate company name first
      if (!isValidCompanyName(competitor.name)) {
        sendMessage(`⚠️ Filtered out invalid name: "${competitor.name}"`);
        return false;
      }
      
      // Then validate domain
      const domain = competitor.domain.toLowerCase().trim();
      if (invalidDomains.includes(domain) || domain.length < 3 || !domain.includes('.')) {
        sendMessage(`⚠️ Skipping ${competitor.name}: Invalid domain "${competitor.domain}"`);
        return false;
      }
      
      return true;
    });
    
    // Dedupe by domain
    const uniqueCompetitors = validCompetitors.reduce((acc, competitor) => {
      const existing = acc.find(c => c.domain === competitor.domain);
      if (!existing) {
        acc.push(competitor);
      } else if (competitor.confidence > existing.confidence) {
        // Replace with higher confidence version
        const index = acc.indexOf(existing);
        acc[index] = competitor;
      }
      return acc;
    }, [] as Competitor[]);
    
        // If we don't have enough competitors yet, do additional broader searches
        if (uniqueCompetitors.length < maxProspects) {
          sendMessage(`\n🔍 Need more prospects (have ${uniqueCompetitors.length}, need ${maxProspects}), searching with broader terms...`);
          
          const broaderSearches = [
            `${icp.industries[0]} companies ${icp.firmographics.geo}`,
            `${icp.industries[0]} services ${icp.firmographics.geo}`,
            `${icp.workflows[0]} companies`,
          ];
          
          for (const searchQuery of broaderSearches) {
            if (uniqueCompetitors.length >= maxProspects * 2) break; // Get extra for filtering
            
            sendMessage(`   🌐 Searching: "${searchQuery}"`);
            const additionalSearchResults = await searchCompetitors(searchQuery, '');
            const additionalNeeded = maxProspects * 2 - uniqueCompetitors.length;
            
            const { competitors: moreCompetitors } = await findCompetitors(
              customers[0]?.domain || '',
              'Additional Search',
              icp,
              additionalSearchResults,
              additionalNeeded
            );
            
            sendMessage(`   ✅ Found ${moreCompetitors.length} additional candidates`);
            
            // Dedupe and add
            for (const comp of moreCompetitors) {
              const existing = uniqueCompetitors.find(c => c.domain === comp.domain);
              if (!existing) {
                uniqueCompetitors.push(comp);
              }
            }
          }
          
          sendMessage(`📊 Total prospect pool after broad search: ${uniqueCompetitors.length} companies`);
        }
        
        // Analyze each competitor with AI-powered workflow scoring
        sendMessage(`\n🤖 AI Analysis Phase: Analyzing prospects to reach target of ${maxProspects}...`);
        
        const prospectRecords = [];
        const processedDomains = new Set<string>();
        let analyzedCount = 0;
        
        // Adaptive threshold for analysis
        let currentThreshold = 30; // Start accepting scores of 30+
        const minThreshold = 20; // Go as low as 20 if needed
        
        for (const competitor of uniqueCompetitors) {
          // Stop if we've reached the target
          if (prospectRecords.length >= maxProspects) {
            sendMessage(`✅ Reached target of ${maxProspects} prospects!`);
            break;
          }
          
          // Adaptive threshold: lower it if we're running out of candidates
          const remainingCandidates = uniqueCompetitors.length - analyzedCount;
          const remainingNeeded = maxProspects - prospectRecords.length;
          
          if (remainingCandidates <= remainingNeeded * 1.5 && currentThreshold > minThreshold) {
            currentThreshold = Math.max(minThreshold, currentThreshold - 5);
            sendMessage(`📉 Lowering acceptance threshold to ${currentThreshold} to ensure target is met`);
          }
          // Skip if we've already processed this domain (handles duplicates from multiple sources)
          const normalizedDomain = competitor.domain.toLowerCase();
          if (processedDomains.has(normalizedDomain)) {
            sendMessage(`⏭️ Skipping duplicate: ${competitor.domain}`);
            continue;
          }
          processedDomains.add(normalizedDomain);
          
          analyzedCount++;
          sendMessage(`\n[${analyzedCount}/${uniqueCompetitors.length}] 🔎 Analyzing ${competitor.name}...`);
          
          try {
            // Validate domain before fetching
            if (!competitor.domain || competitor.domain.length < 3) {
              sendMessage(`⚠️ Invalid domain for ${competitor.name}, skipping...`);
              continue;
            }
            
            sendMessage(`📡 Fetching website content from ${competitor.domain}...`);
            
            // Fetch website content for proper analysis
            const websiteContent = await fetchWebsite(competitor.domain);
            
            sendMessage(`🧠 AI analyzing workflow fit for ${competitor.name}...`);
            
            // Use AI-powered workflow-based analysis
            const analysis = await analyzeWebsiteAgainstICP(
              websiteContent,
              competitor.name,
              competitor.domain,
              icp
            );
            
            sendMessage(`✅ ${competitor.name}: ICP Score ${analysis.icpScore}/100, Confidence ${analysis.confidence}%`);
        
            // Check if prospect meets current threshold
            if (analysis.icpScore < currentThreshold) {
              sendMessage(`⏭️ Skipped ${competitor.name}: score ${analysis.icpScore} below threshold ${currentThreshold}`);
              continue;
            }
        
        const prospect = await db.insert(companies).values({
          userId,
          name: competitor.name,
          domain: competitor.domain,
          source: 'expanded',
          sourceCustomerDomain: customers[0]?.domain,
          icpScore: analysis.icpScore,
          confidence: analysis.confidence,
          status: 'New',
          rationale: analysis.rationale,
          evidence: analysis.evidence,
        }).returning();
        
            prospectRecords.push(prospect[0]);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Only use fallback if it's NOT a duplicate key error
            if (errorMessage.includes('duplicate key') || errorMessage.includes('companies_domain_unique')) {
              sendMessage(`⏭️ ${competitor.domain} already exists in database, skipping...`);
              continue;
            }
            
            // If website fetch failed, search the web for the correct domain
            if (errorMessage.includes('Failed to fetch website') || errorMessage.includes('fetch failed')) {
              sendMessage(`⚠️ Domain ${competitor.domain} failed to load, searching web for correct domain...`);
              
              // Function to search for correct domain using multiple strategies
              const findCorrectDomain = async (companyName: string): Promise<string | null> => {
                const tavilyKey = process.env.TAVILY_API_KEY;
                if (!tavilyKey) {
                  sendMessage(`⚠️ No search API key available`);
                  return null;
                }
                
                // Try multiple search queries in order of specificity
                const searchQueries = [
                  `${companyName} official website`,
                  `${companyName} company website`,
                  `${companyName} home page`,
                ];
                
                for (const query of searchQueries) {
                  try {
                    sendMessage(`🔍 Searching web: "${query}"...`);
                    const response = await fetch('https://api.tavily.com/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        api_key: tavilyKey,
                        query: query,
                        max_results: 5,
                        search_depth: 'basic',
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.results && data.results.length > 0) {
                        // Filter out aggregator/directory sites
                        const aggregators = ['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com', 
                                            'clutch.co', 'yelp.com', 'trustpilot.com', 'ricsfirms.com',
                                            'wikipedia.org', 'crunchbase.com', 'comparemymove.com', 'propertyinspect.com'];
                        
                        for (const result of data.results) {
                          const url = result.url;
                          const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                          
                          // Skip aggregator sites
                          const isAggregator = aggregators.some(agg => domain.includes(agg));
                          if (isAggregator) {
                            continue;
                          }
                          
                          // Validate domain looks reasonable
                          if (domain.length >= 5 && domain.includes('.')) {
                            sendMessage(`🌐 Found potential official website: ${domain}`);
                            return domain;
                          }
                        }
                      }
                    }
                  } catch (searchErr) {
                    // Continue to next query
                    continue;
                  }
                }
                
                return null;
              };
              
              // Search for correct domain
              try {
                const correctedDomain = await findCorrectDomain(competitor.name);
                
                if (correctedDomain) {
                  sendMessage(`✅ Found correct domain: ${correctedDomain}`);
                  
                  // Verify the domain is different and actually works
                  if (correctedDomain !== competitor.domain) {
                    try {
                      sendMessage(`📡 Fetching website content from ${correctedDomain}...`);
                      const websiteContent = await fetchWebsite(correctedDomain);
                      
                      sendMessage(`🧠 AI analyzing workflow fit for ${competitor.name}...`);
                      const analysis = await analyzeWebsiteAgainstICP(
                        websiteContent,
                        competitor.name,
                        correctedDomain,
                        icp
                      );
                      
                      sendMessage(`✅ ${competitor.name}: ICP Score ${analysis.icpScore}/100, Confidence ${analysis.confidence}% (domain corrected)`);
                      
                      const prospect = await db.insert(companies).values({
                        userId,
                        name: competitor.name,
                        domain: correctedDomain, // Use corrected domain
                        source: 'expanded',
                        sourceCustomerDomain: customers[0]?.domain,
                        icpScore: analysis.icpScore,
                        confidence: analysis.confidence,
                        status: 'New',
                        rationale: analysis.rationale,
                        evidence: analysis.evidence,
                      }).returning();
                      
                      prospectRecords.push(prospect[0]);
                      continue; // Success with corrected domain, move to next
                    } catch (retryError) {
                      sendMessage(`⚠️ Corrected domain (${correctedDomain}) also failed to load`);
                    }
                  } else {
                    sendMessage(`⚠️ Found domain is same as original, cannot retry`);
                  }
                } else {
                  sendMessage(`⚠️ Could not find correct domain via web search`);
                }
              } catch (searchError) {
                sendMessage(`⚠️ Domain search failed: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`);
              }
            }
            
            sendMessage(`⚠️ Failed to analyze ${competitor.name}: ${errorMessage}`);
        
            // Fall back to simple scoring if AI analysis and domain correction both failed
            try {
              sendMessage(`🔄 Using fallback scoring for ${competitor.name}...`);
              const icpScore = await computeICPScore(competitor, icp);
              const evidence: Evidence[] = competitor.evidenceUrls.map(url => ({
                url,
                snippet: `Evidence for ${competitor.name} as competitor`,
              }));
              
              const prospect = await db.insert(companies).values({
                userId,
                name: competitor.name,
                domain: competitor.domain,
                source: 'expanded',
                sourceCustomerDomain: customers[0]?.domain,
                icpScore,
                confidence: competitor.confidence,
                status: 'New',
                rationale: competitor.rationale,
                evidence,
              }).returning();
              
              prospectRecords.push(prospect[0]);
              sendMessage(`✅ ${competitor.name}: Fallback ICP Score ${icpScore}/100`);
            } catch (fallbackError) {
              sendMessage(`❌ Failed to insert ${competitor.name}, skipping...`);
              // Skip this prospect entirely
              continue;
            }
          }
        }
    
        // Create clusters and ads
        sendMessage(`\n📊 Creating clusters and generating ad copy...`);
        const { clusters: clusterRecords, ads: adRecords } = await createClusters(prospectRecords, icp, userId);
        sendMessage(`✅ Created ${clusterRecords.length} cluster(s) with ${adRecords.length} ad(s)`);
        
        // Check if we used mock data
        const usedMockData = icpIsMock || competitorsIsMock;

        // Summary message
        const skippedCount = uniqueCompetitors.length - prospectRecords.length;
        sendMessage(`\n📊 Analysis Summary:`);
        sendMessage(`   ✅ Added: ${prospectRecords.length} prospects`);
        if (skippedCount > 0) {
          sendMessage(`   ⏭️ Skipped: ${skippedCount} (low scores, duplicates, or errors)`);
        }
        sendMessage(`   📈 Used adaptive threshold to maximize quality while meeting target`);
        
        // Celebrate hitting target or warn if we couldn't
        if (prospectRecords.length >= maxProspects) {
          sendMessage(`\n🎉 Successfully generated all ${maxProspects} requested prospects!`);
        } else if (prospectRecords.length < maxProspects) {
          sendMessage(`\n⚠️ Warning: Only generated ${prospectRecords.length} of ${maxProspects} requested prospects. Exhausted all search options. Consider broader ICP criteria.`);
        }
        
        sendMessage(`\n🎉 Analysis complete! Moving to cluster generation...`);

        // Send usage warning if near limit
        if (shouldWarn) {
          sendMessage(`\n⚠️ Usage Warning: ${remaining - 1} AI generations remaining this month`);
        }

        // Send final result
        const result = {
          prospects: prospectRecords,
          clusters: clusterRecords,
          ads: adRecords,
          icp,
          mockData: usedMockData,
          usage: { 
            used: used + 1, 
            allowed,
            plan: effectivePlan,
            isTrialing,
          },
          warning: shouldWarn ? {
            message: `You have ${remaining - 1} AI generations left this month.`,
            remaining: remaining - 1,
            threshold: thresholds.warnAt,
          } : undefined,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Analysis error:', error);
        
        let errorMessage = 'Analysis failed';
        if (error instanceof z.ZodError) {
          errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        sendMessage(`\n❌ Error: ${errorMessage}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[ANALYSE] Pre-stream error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export const POST = analyseHandler;
