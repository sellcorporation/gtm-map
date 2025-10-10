import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { searchCompetitors, fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP } from '@/lib/ai';
import type { Company } from '@/types';

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
  batchSize: z.number().int().min(1).max(10).default(5),
});

async function findCompetitorsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, companyDomain, icp, existingProspects, batchSize } = CompetitorsRequestSchema.parse(body);

    console.log(`Finding competitors for: ${companyName} (${companyDomain})`);

    // Filter out existing domains to avoid duplicates
    const existingDomains = new Set(existingProspects.map(p => p.domain.toLowerCase()));

    // Search for competitors using the company domain and industry
    const industry = icp.industries[0] || 'business';
    const searchResults = await searchCompetitors(companyDomain, industry);

    console.log(`Found ${searchResults.length} potential competitors from search`);

    // Extract domains from URLs and filter out duplicates
    const candidates = searchResults
      .map(result => {
        try {
          // Extract domain from URL
          const urlObj = new URL(result.url);
          const domain = urlObj.hostname.replace('www.', '');

          // Extract company name from title (take first part before separator)
          const name = result.title.split(/[-|–—]/)[0].trim();

          return { name, domain, url: result.url };
        } catch (error) {
          console.error('Failed to parse search result:', error);
          return null;
        }
      })
      .filter((candidate): candidate is { name: string; domain: string; url: string } =>
        candidate !== null &&
        candidate.domain.toLowerCase() !== companyDomain.toLowerCase() && // Exclude the company itself
        !existingDomains.has(candidate.domain.toLowerCase())
      )
      .slice(0, Math.min(batchSize * 2, 10)); // Get more candidates than needed

    console.log(`Found ${candidates.length} unique candidate domains (excluding original company and existing prospects)`);

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        competitors: [],
        message: `No new competitors found for ${companyName}. They may already be in your list.`,
      });
    }

    // Analyze each candidate
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

