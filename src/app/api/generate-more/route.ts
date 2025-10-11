import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { searchCompanies, fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP, generateSearchQueries, extractCompaniesFromSearch } from '@/lib/ai';
import { db, companies as companiesTable } from '@/lib/db';
import { getEffectiveEntitlements, incrementUsage } from '@/lib/billing/entitlements';
import type { Company } from '@/types';

const GenerateMoreRequestSchema = z.object({
  batchSize: z.number().int().min(1).max(100), // Limit to 100 per request
  maxTotalProspects: z.number().int().min(10).max(500).optional(), // Optional max total limit
  icp: z.object({
    solution: z.string(),
    workflows: z.array(z.string()),
    industries: z.array(z.string()),
    buyerRoles: z.array(z.string()),
    firmographics: z.object({
      size: z.string(),
      geo: z.string(),
    }),
  }),
  existingProspects: z.array(z.object({
    id: z.number(),
    domain: z.string(),
    name: z.string(),
    quality: z.string().nullable().optional(),
    icpScore: z.number(),
    rationale: z.string().optional(),
  })),
});

async function generateMoreHandler(request: NextRequest) {
  try {
    // ========== AUTH & BILLING ENFORCEMENT ==========
    console.log('[GENERATE-MORE] Checking authentication and billing...');
    
    // 1. Authenticate user
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
      console.error('[GENERATE-MORE] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GENERATE-MORE] User authenticated:', user.email);

    // 2. Check entitlements
    const { effectivePlan, isTrialing, allowed, used, thresholds } = 
      await getEffectiveEntitlements(user.id);

    console.log('[GENERATE-MORE] Entitlements:', {
      plan: effectivePlan,
      trial: isTrialing,
      used,
      allowed,
      thresholds,
    });

    // 3. Check if at hard limit (BLOCK)
    if (used >= thresholds.blockAt) {
      console.log('[GENERATE-MORE] BLOCKED: User at limit');
      const upgradePlan = effectivePlan === 'free' || isTrialing ? 'starter' : 'pro';
      return NextResponse.json({
        error: 'Limit reached',
        message: `You've reached your ${isTrialing ? 'trial' : effectivePlan} limit of ${allowed} AI generations this month.`,
        code: 'LIMIT_REACHED',
        usage: { used, allowed },
        cta: {
          type: 'upgrade',
          plan: upgradePlan,
          url: '/settings/billing',
        },
      }, { status: 402 }); // 402 Payment Required
    }

    // 4. Check if near limit (WARNING)
    const shouldWarn = used >= thresholds.warnAt;
    const remaining = allowed - used;

    if (shouldWarn) {
      console.log(`[GENERATE-MORE] WARNING: User at ${used}/${allowed} (${remaining} left)`);
    }

    // 5. Increment usage (atomic)
    console.log('[GENERATE-MORE] Incrementing usage...');
    try {
      await incrementUsage(user.id, isTrialing);
      console.log('[GENERATE-MORE] Usage incremented successfully');
    } catch (usageError) {
      console.error('[GENERATE-MORE] Failed to increment usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to track usage' },
        { status: 500 }
      );
    }

    // ========== PROCEED WITH GENERATION ==========
    const body = await request.json();
    const { batchSize, maxTotalProspects, icp, existingProspects } = GenerateMoreRequestSchema.parse(body);
    
    const maxTotal = maxTotalProspects || 100; // Default to 100 if not specified
    const currentCount = existingProspects.length;
    
    // Check if we've hit the max total limit
    if (currentCount >= maxTotal) {
      return NextResponse.json({
        prospects: [],
        message: `Maximum limit of ${maxTotal} prospects reached. Adjust in settings to generate more.`,
        reachedLimit: true,
        usage: { used: used + 1, allowed }, // Show updated usage
        warning: shouldWarn ? {
          message: `You have ${remaining - 1} AI generations left this month.`,
          remaining: remaining - 1,
        } : undefined,
      });
    }
    
    // Adjust batch size to not exceed max total
    const actualBatchSize = Math.min(batchSize, maxTotal - currentCount);
    
    // Use SSE for real-time progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send progress messages
        const sendMessage = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
        };
        
        try {
          sendMessage(`🎯 Generating ${actualBatchSize} more prospects (current: ${currentCount}, max: ${maxTotal})...`);
    
          // Filter out existing domains to avoid duplicates
          const existingDomains = new Set(existingProspects.map(p => p.domain.toLowerCase()));
          
          // Identify excellent prospects to learn from
          const excellentProspects = existingProspects.filter(p => p.quality === 'excellent');
          const excellentNames = excellentProspects.map(p => p.name);
          
          if (excellentProspects.length > 0) {
            sendMessage(`📚 Learning from ${excellentProspects.length} excellent prospects: ${excellentNames.slice(0, 3).join(', ')}`);
          }
          
          // PHASE 1: GPT generates intelligent search queries
          sendMessage(`🧠 AI generating optimized search queries...`);
          const searchQueries = await generateSearchQueries(icp, existingProspects, actualBatchSize);
          
          sendMessage(`📋 Generated ${searchQueries.length} search queries:`);
          searchQueries.forEach((query, idx) => {
            sendMessage(`   ${idx + 1}. "${query}"`);
          });
          
          // PHASE 2: Execute web searches with Tavily
          sendMessage(`\n🌐 Searching the web with AI-optimized queries...`);
          const allSearchResults: Array<{ title: string; snippet: string; url: string }> = [];
          
          for (let i = 0; i < searchQueries.length; i++) {
            const query = searchQueries[i];
            sendMessage(`   Searching: "${query}"`);
            
            try {
              const results = await searchCompanies(query);
              allSearchResults.push(...results);
              sendMessage(`   Found ${results.length} results`);
            } catch (error) {
              sendMessage(`   ⚠️ Search failed, continuing...`);
            }
          }
          
          sendMessage(`📊 Collected ${allSearchResults.length} total search results from web`);
          
          // PHASE 3: GPT analyzes and filters results
          sendMessage(`\n🤖 AI analyzing results to extract real companies...`);
          const candidates = await extractCompaniesFromSearch(
            allSearchResults,
            icp,
            existingDomains,
            excellentNames.slice(0, 3)
          );
          
          // Sort by confidence
          candidates.sort((a, b) => b.confidence - a.confidence);
          
          sendMessage(`✅ AI identified ${candidates.length} high-confidence companies`);
          
          // Show top candidates
          if (candidates.length > 0) {
            sendMessage(`\nTop candidates:`);
            candidates.slice(0, 5).forEach((c, idx) => {
              sendMessage(`   ${idx + 1}. ${c.name} (${c.domain}) - Confidence: ${c.confidence}%`);
            });
          }
          
          // If we don't have enough candidates, try one more round with different angle
          if (candidates.length < actualBatchSize * 2) {
            sendMessage(`\n🔍 Need more candidates, generating additional queries...`);
            
            const additionalQueries = await generateSearchQueries(
              icp,
              existingProspects,
              actualBatchSize * 2
            );
            
            const additionalResults: Array<{ title: string; snippet: string; url: string }> = [];
            for (const query of additionalQueries.slice(0, 3)) {
              try {
                const results = await searchCompanies(query);
                additionalResults.push(...results);
              } catch (error) {
                // Continue on error
              }
            }
            
            if (additionalResults.length > 0) {
              const additionalCandidates = await extractCompaniesFromSearch(
                additionalResults,
                icp,
                existingDomains,
                excellentNames.slice(0, 3)
              );
              
              // Merge and deduplicate
              const existingCandidateDomains = new Set(candidates.map(c => c.domain.toLowerCase()));
              const newCandidates = additionalCandidates.filter(
                c => !existingCandidateDomains.has(c.domain.toLowerCase())
              );
              
              candidates.push(...newCandidates);
              candidates.sort((a, b) => b.confidence - a.confidence);
              
              sendMessage(`   Found ${newCandidates.length} additional companies`);
            }
          }
          
          sendMessage(`\n📊 Final candidate pool: ${candidates.length} companies`);
          
          if (candidates.length === 0) {
            sendMessage(`❌ No new unique prospects found. Try adjusting ICP criteria or check your search API.`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result: { prospects: [], message: 'No prospects found' } })}\n\n`));
            controller.close();
            return;
          }
    
          // Analyze each candidate's website
          sendMessage(`\n🤖 AI Website Analysis: Analyzing candidates to reach target of ${actualBatchSize} prospects...`);
          sendMessage(`   Validating domains and fetching website content...\n`);
          
          const newProspects: Company[] = [];
          let processedCount = 0;
          let skippedLowScore = 0;
          let skippedInvalidDomain = 0;
          
          // Adaptive threshold: start high, lower if we can't find enough
          let currentThreshold = 50;
          const minThreshold = 20; // Accept anything above 20 if needed
          
          for (const candidate of candidates) {
            if (newProspects.length >= actualBatchSize) {
              sendMessage(`✅ Reached target of ${actualBatchSize} prospects!`);
              break;
            }
            
            try {
              processedCount++;
              sendMessage(`🔍 [${newProspects.length + 1}/${actualBatchSize}] Analyzing ${candidate.name} (${candidate.domain})...`);
              sendMessage(`   Pre-screening: ${candidate.icpMatch.slice(0, 100)}...`);
              
              // Fetch and analyze website content
              const content = await fetchWebsiteContent(candidate.domain);
              const analysis = await analyzeWebsiteAgainstICP(content, candidate.name, candidate.domain, icp);
              
              sendMessage(`   📊 ICP Score: ${analysis.icpScore}/100, Analysis Confidence: ${analysis.confidence}%`);
              
              // Adaptive threshold: lower it if we're running out of candidates
              const remainingCandidates = candidates.length - processedCount;
              const remainingNeeded = actualBatchSize - newProspects.length;
              
              if (remainingCandidates <= remainingNeeded && currentThreshold > minThreshold) {
                currentThreshold = Math.max(minThreshold, currentThreshold - 10);
                sendMessage(`   📉 Lowering acceptance threshold to ${currentThreshold}`);
              }
              
              // Accept if above current threshold
              if (analysis.icpScore >= currentThreshold) {
                try {
                  // Insert to database
                  const insertedProspect = await db.insert(companiesTable).values({
                    userId: user.id, // Use authenticated user
                    name: candidate.name,
                    domain: candidate.domain,
                    source: 'expanded',
                    sourceCustomerDomain: null,
                    icpScore: analysis.icpScore,
                    confidence: analysis.confidence,
                    status: 'New',
                    rationale: analysis.rationale,
                    evidence: analysis.evidence,
                  }).returning();
                  
                  newProspects.push(insertedProspect[0]);
                  sendMessage(`   ✅ Added to prospects!\n`);
                } catch (dbError) {
                  const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
                  // Skip if duplicate domain
                  if (errorMessage.includes('duplicate key') || errorMessage.includes('companies_domain_unique')) {
                    sendMessage(`   ⏭️ Already exists in database, skipping...\n`);
                  } else {
                    sendMessage(`   ❌ Database error: ${errorMessage}\n`);
                  }
                }
              } else {
                skippedLowScore++;
                sendMessage(`   ⏭️ Skipped (ICP score ${analysis.icpScore} below threshold ${currentThreshold})\n`);
              }
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              
              // Categorize errors
              if (errorMsg.includes('Domain not found') || errorMsg.includes('ENOTFOUND')) {
                skippedInvalidDomain++;
                sendMessage(`   ⚠️ Domain doesn't exist or is unreachable\n`);
              } else {
                sendMessage(`   ❌ Analysis failed: ${errorMsg}\n`);
              }
              // Continue with next candidate
            }
          }
          
          // Final summary
          sendMessage(`\n📊 Generation complete!`);
          sendMessage(`   ✅ Added: ${newProspects.length} new prospects`);
          sendMessage(`   ⏭️ Skipped low scores: ${skippedLowScore}`);
          sendMessage(`   ⚠️ Invalid domains: ${skippedInvalidDomain}`);
          sendMessage(`   🎯 AI-orchestrated search: query generation → web search → intelligent filtering`);
          
          if (newProspects.length < actualBatchSize) {
            sendMessage(`\n⚠️ Warning: Only generated ${newProspects.length} of ${actualBatchSize} requested prospects. Exhausted all search options. Consider broader ICP criteria.`);
          } else {
            sendMessage(`\n🎉 Successfully generated all ${actualBatchSize} requested prospects!`);
          }
          
          // Send final result with usage info
          const result = {
            success: true,
            prospects: newProspects,
            message: `Generated ${newProspects.length} new high-quality prospects`,
            mockData: false,
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
          
          if (shouldWarn) {
            sendMessage(`\n⚠️ Usage Warning: ${remaining - 1} AI generations remaining this month`);
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Generate more error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Failed to generate more prospects';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
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
    console.error('Generate more error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate more prospects' },
      { status: 500 }
    );
  }
}

export const POST = generateMoreHandler;

