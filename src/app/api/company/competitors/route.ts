import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { requireAuth } from '@/lib/auth';
import { searchCompetitors, searchCompanies, fetchWebsiteContent } from '@/lib/search';
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
  try {
    const body = await request.json();
    const { companyName, companyDomain, icp, existingProspects, batchSize } = CompetitorsRequestSchema.parse(body);

    console.log(`Finding competitors for: ${companyName} (${companyDomain})`);

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

    let allSearchResults: Array<{ title: string; snippet: string; url: string }> = [];

    for (const query of searchQueries) {
      const results = await searchCompanies(query);
      allSearchResults.push(...results);
    }

    console.log(`Found ${allSearchResults.length} search results from ${searchQueries.length} queries`);

    // Step 2: Use AI to extract actual competitor company names from search results
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
        console.log(`AI extracted ${competitorNames.length} competitor names:`, competitorNames.map(c => c.name).join(', '));
      } catch (error) {
        console.error('AI extraction failed:', error);
      }
    }

    // Fallback: If AI didn't find anything, try basic extraction
    if (competitorNames.length === 0) {
      console.log('Falling back to basic name extraction from titles');
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
    }

    console.log(`Processing ${competitorNames.length} potential competitors`);

    // Step 3: For each competitor name, find their actual website domain
    const candidates: Array<{ name: string; domain: string }> = [];

    for (const competitor of competitorNames) {
      if (candidates.length >= batchSize * 2) break;

      // Skip if we already have this company
      if (existingNames.has(competitor.name.toLowerCase())) {
        console.log(`Skipping ${competitor.name} - already in list`);
        continue;
      }

      try {
        let domain = competitor.domain;

        // If AI didn't provide domain, search for it
        if (!domain) {
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
            } catch (err) {
              // Skip invalid URLs
            }
          }
        }

        if (domain && !existingDomains.has(domain.toLowerCase()) && domain.toLowerCase() !== companyDomain.toLowerCase()) {
          candidates.push({ name: competitor.name, domain });
          console.log(`✓ Found domain for ${competitor.name}: ${domain}`);
        }
      } catch (error) {
        console.error(`Failed to find domain for ${competitor.name}:`, error);
      }
    }

    console.log(`Found ${candidates.length} unique competitor domains`);

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        competitors: [],
        message: `No new competitors found for ${companyName}. Try a different company or refine your search.`,
      });
    }

    // Step 4: Analyze each candidate against ICP
    const newCompetitors: Company[] = [];
    let processedCount = 0;

    for (const candidate of candidates) {
      if (newCompetitors.length >= batchSize) break;

      try {
        console.log(`Analyzing competitor: ${candidate.domain}...`);

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
          console.log(`✓ Added ${candidate.name} (ICP Score: ${analysis.icpScore})`);
        } else {
          console.log(`✗ Skipped ${candidate.name} (ICP Score: ${analysis.icpScore} too low)`);
        }

        processedCount++;

      } catch (error) {
        console.error(`Failed to analyze ${candidate.domain}:`, error);
        // Continue with next candidate
      }
    }

    console.log(`Successfully found ${newCompetitors.length} competitors for ${companyName}`);

    return NextResponse.json({
      success: true,
      competitors: newCompetitors,
      message: newCompetitors.length > 0
        ? `Found ${newCompetitors.length} competitor(s)`
        : 'No competitors found that match your ICP',
    });

  } catch (error) {
    console.error('Find competitors error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find competitors' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(findCompetitorsHandler);

