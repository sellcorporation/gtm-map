import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { requireAuth } from '@/lib/auth';
import { searchCompanies, fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP } from '@/lib/ai';
import type { Company } from '@/types';

const model = openai('gpt-4o');

const CompetitorsRequestSchema = z.object({
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  icp: z.object({
    industries: z.array(z.string()),
    pains: z.array(z.string()),
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
  })),
  batchSize: z.number().int().min(1).max(15).default(10),
});

const CompetitorNamesSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    domain: z.string().optional(), // Optional because AI might not always find domain
  })).max(15),
});

async function findCompetitorsHandler(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const data = JSON.stringify({ message, type, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const body = await request.json();
        const { companyName, companyDomain, icp, existingProspects, batchSize } = CompetitorsRequestSchema.parse(body);

        sendUpdate(`🔍 Finding competitors for ${companyName}...`);

        // Filter out existing domains and names to avoid duplicates
        const existingDomains = new Set(existingProspects.map(p => p.domain.toLowerCase()));
        const existingNames = new Set(existingProspects.map(p => p.name.toLowerCase()));

        // Step 1: Search for competitors using multiple search queries
        const industry = icp.industries[0] || 'business';
        const searchQueries = [
          `${companyName} competitors ${industry}`,
          `alternative to ${companyName} ${industry}`,
          `${industry} companies like ${companyName}`,
        ];

        sendUpdate(`🌐 Running ${searchQueries.length} search queries...`);

        const allSearchResults: Array<{ title: string; snippet: string; url: string }> = [];

        for (let i = 0; i < searchQueries.length; i++) {
          sendUpdate(`📡 Search query ${i + 1}/${searchQueries.length}...`);
          const results = await searchCompanies(searchQueries[i]);
          allSearchResults.push(...results);
        }

        sendUpdate(`✓ Found ${allSearchResults.length} search results`, 'success');

        // Step 2: Use AI to extract actual competitor company names from search results
        sendUpdate(`🤖 AI analyzing search results to extract competitor names...`);
        
        const searchResultsText = allSearchResults
          .map((result, index) => `${index + 1}. ${result.title}\n   ${result.snippet}`)
          .join('\n\n');

        let competitorNames: Array<{ name: string; domain?: string }> = [];

        if (process.env.OPENAI_API_KEY && searchResultsText.length > 100) {
          try {
            const prompt = `You are analyzing search results to find competitors of "${companyName}" (${companyDomain}) in the ${industry} industry.

From these search results, extract ONLY the names of actual competitor companies (not the websites publishing articles about competitors).

SEARCH RESULTS:
${searchResultsText.slice(0, 4000)}

Extract up to 15 ACTUAL COMPETITOR COMPANIES. For each:
- Company Name: The actual competitor's name (not "RocketReach", "LinkedIn", "Crunchbase", etc.)
- Domain (if mentioned): Their actual website domain

EXCLUDE:
- Data aggregator sites (RocketReach, LinkedIn, Crunchbase, ZoomInfo, etc.)
- News/blog sites
- Social media platforms
- The original company itself (${companyName})

Return a JSON array of competitor objects with "name" and optionally "domain".`;

            const { object } = await generateObject({
              model,
              schema: CompetitorNamesSchema,
              prompt,
              temperature: 0.3,
            });

            competitorNames = object.competitors;
            sendUpdate(`✓ AI extracted ${competitorNames.length} competitor names`, 'success');
            if (competitorNames.length > 0) {
              sendUpdate(`📋 Found: ${competitorNames.slice(0, 5).map(c => c.name).join(', ')}${competitorNames.length > 5 ? '...' : ''}`);
            }
          } catch (error) {
            sendUpdate(`⚠️ AI extraction failed, using fallback method`);
            console.error('AI extraction failed:', error);
          }
        }

        // Fallback: If AI didn't find anything, try basic extraction
        if (competitorNames.length === 0) {
          sendUpdate(`📝 Using basic extraction from titles...`);
          const seen = new Set<string>();
          competitorNames = allSearchResults
            .map(result => {
              const name = result.title.split(/[-|–—:]/)[0].trim();
              return { name };
            })
            .filter(c => {
              const lowerName = c.name.toLowerCase();
              if (seen.has(lowerName)) return false;
              seen.add(lowerName);
              return !lowerName.includes('competitor') &&
                     !lowerName.includes('alternative') &&
                     !lowerName.includes('vs') &&
                     lowerName.length > 3;
            })
            .slice(0, 15);
          sendUpdate(`✓ Extracted ${competitorNames.length} names`, 'success');
        }

        // Step 3: For each competitor name, find their actual website domain
        sendUpdate(`🌍 Finding website domains for competitors...`);
        
        const candidates: Array<{ name: string; domain: string }> = [];

        for (const competitor of competitorNames) {
          if (candidates.length >= batchSize * 2) break;

          // Skip if we already have this company
          if (existingNames.has(competitor.name.toLowerCase())) {
            sendUpdate(`⏭️ Skipping ${competitor.name} - already in your list`);
            continue;
          }

          try {
            let domain = competitor.domain;

            // If AI didn't provide domain, search for it
            if (!domain) {
              sendUpdate(`🔎 Looking up domain for ${competitor.name}...`);
              const domainSearchResults = await searchCompanies(`${competitor.name} official website`);
              
              // Extract domain from first result that looks like a company website
              for (const result of domainSearchResults.slice(0, 3)) {
                try {
                  const urlObj = new URL(result.url);
                  const candidateDomain = urlObj.hostname.replace('www.', '');
                  
                  // Filter out known aggregator/social domains
                  const excludeDomains = ['linkedin.com', 'facebook.com', 'twitter.com', 'crunchbase.com', 
                                         'rocketreach.co', 'zoominfo.com', 'bloomberg.com', 'wikipedia.org',
                                         'indeed.com', 'glassdoor.com', 'yelp.com'];
                  
                  if (!excludeDomains.includes(candidateDomain) && 
                      !candidateDomain.includes('linkedin') &&
                      !candidateDomain.includes('facebook') &&
                      !candidateDomain.includes('twitter')) {
                domain = candidateDomain;
                break;
              }
            } catch {
              // Skip invalid URLs
            }
          }
        }

            if (domain && !existingDomains.has(domain.toLowerCase()) && domain.toLowerCase() !== companyDomain.toLowerCase()) {
              candidates.push({ name: competitor.name, domain });
              sendUpdate(`✓ ${competitor.name} → ${domain}`, 'success');
            }
          } catch (error) {
            sendUpdate(`⚠️ Could not find domain for ${competitor.name}`);
            console.error(`Failed to find domain for ${competitor.name}:`, error);
          }
        }

        sendUpdate(`✓ Found ${candidates.length} unique competitor domains`, 'success');

        if (candidates.length === 0) {
          sendUpdate(`❌ No new competitors found. Try a different company or refine your search.`, 'error');
          const finalData = JSON.stringify({ 
            done: true, 
            success: true,
            competitors: [],
            message: `No new competitors found for ${companyName}.`
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
          return;
        }

        // Step 4: Analyze each candidate against ICP
        sendUpdate(`🔬 Analyzing ${Math.min(batchSize, candidates.length)} competitors against your ICP...`);
        
        const newCompetitors: Company[] = [];
        let processedCount = 0;

        for (const candidate of candidates) {
          if (newCompetitors.length >= batchSize) break;

          try {
            sendUpdate(`📊 Analyzing ${candidate.name} (${candidate.domain})...`);

            // Fetch and analyze website content
            const content = await fetchWebsiteContent(candidate.domain);
            const analysis = await analyzeWebsiteAgainstICP(content, candidate.name, candidate.domain, icp);

            // Only include if ICP score is above threshold (40+)
            if (analysis.icpScore >= 40) {
              const competitor: Company = {
                id: Date.now() + processedCount, // Temporary ID
                name: candidate.name,
                domain: candidate.domain,
                source: 'expanded' as const,
                sourceCustomerDomain: companyDomain,
                icpScore: analysis.icpScore,
                confidence: analysis.confidence,
                status: 'New' as const,
                rationale: analysis.rationale,
                evidence: analysis.evidence,
                decisionMakers: null,
                quality: null,
                notes: `Competitor of ${companyName}`,
                tags: null,
                relatedCompanyIds: null,
              };

              newCompetitors.push(competitor);
              sendUpdate(`✅ Added ${candidate.name} (ICP: ${analysis.icpScore}, Confidence: ${analysis.confidence})`, 'success');
            } else {
              sendUpdate(`⏭️ Skipped ${candidate.name} (ICP Score ${analysis.icpScore} too low)`);
            }

            processedCount++;

          } catch (error) {
            sendUpdate(`⚠️ Failed to analyze ${candidate.name}`);
            console.error(`Failed to analyze ${candidate.domain}:`, error);
            // Continue with next candidate
          }
        }

        sendUpdate(`🎉 Complete! Found ${newCompetitors.length} competitors for ${companyName}`, 'success');

        // Send final result
        const finalData = JSON.stringify({ 
          done: true, 
          success: true,
          competitors: newCompetitors,
          message: newCompetitors.length > 0
            ? `Found ${newCompetitors.length} competitor(s)`
            : 'No competitors found that match your ICP'
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        controller.close();

      } catch (error) {
        console.error('Find competitors error:', error);
        
        const errorMessage = error instanceof z.ZodError
          ? 'Invalid input data'
          : error instanceof Error 
            ? error.message 
            : 'Failed to find competitors';
        
        sendUpdate(`❌ Error: ${errorMessage}`, 'error');
        
        const errorData = JSON.stringify({ 
          done: true, 
          success: false,
          error: errorMessage,
          competitors: []
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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
}

export const POST = requireAuth(findCompetitorsHandler);

