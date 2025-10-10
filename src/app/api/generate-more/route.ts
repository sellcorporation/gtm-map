import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { searchCompanies, fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP } from '@/lib/ai';
import { db, companies as companiesTable } from '@/lib/db';
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
      });
    }
    
    // Adjust batch size to not exceed max total
    const actualBatchSize = Math.min(batchSize, maxTotal - currentCount);
    
    console.log(`Generating ${actualBatchSize} more prospects (current: ${currentCount}, max: ${maxTotal})...`);
    
    // Filter out existing domains to avoid duplicates
    const existingDomains = new Set(existingProspects.map(p => p.domain.toLowerCase()));
    
    // Analyze high-quality prospects to refine search
    const excellentProspects = existingProspects.filter(p => p.quality === 'excellent');
    const goodProspects = existingProspects.filter(p => p.quality === 'good' || p.icpScore >= 70);
    
    // Build a more targeted search query based on ICP + quality patterns
    let searchQuery = '';
    
    if (excellentProspects.length > 0) {
      // Learn from excellent prospects
      console.log(`Learning from ${excellentProspects.length} excellent prospects...`);
      searchQuery = `companies like ${excellentProspects.slice(0, 3).map(p => p.name).join(', ')} in ${icp.industries.join(' or ')}`;
    } else if (goodProspects.length > 0) {
      // Use good prospects as examples
      console.log(`Learning from ${goodProspects.length} good prospects...`);
      searchQuery = `companies similar to ${goodProspects.slice(0, 3).map(p => p.name).join(', ')} in ${icp.industries.join(' or ')}`;
    } else {
      // Fall back to ICP-based search
      const workflows = icp.workflows || [];
      searchQuery = `${icp.industries[0]} companies ${icp.firmographics.geo} ${workflows[0] || ''}`;
    }
    
    console.log(`Search query: ${searchQuery}`);
    
    // Search for new companies
    const searchResults = await searchCompanies(searchQuery);
    
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
        /(directory|list|guide|review)/i, // Directory/list indicators
      ];
      
      for (const pattern of badPatterns) {
        if (pattern.test(name)) {
          return false;
        }
      }
      
      return true;
    };

    // Extract domains from URLs and filter out duplicates
    const candidates = searchResults
      .map(result => {
        try {
          // Extract domain from URL
          const urlObj = new URL(result.url);
          const domain = urlObj.hostname.replace('www.', '');
          
          // Filter out aggregator domains
          const aggregatorDomains = ['clutch.co', 'yelp.com', 'ricsfirms.com', 'trustpilot.com', 'linkedin.com', 'facebook.com', 'instagram.com'];
          if (aggregatorDomains.some(agg => domain.includes(agg))) {
            return null;
          }
          
          // Extract company name from title (take first part before separator)
          let name = result.title.split(/[-|–—]/)[0].trim();
          
          // Validate the company name
          if (!isValidCompanyName(name)) {
            console.log(`⚠️ Filtered out invalid name: "${name}"`);
            return null;
          }
          
          return { name, domain, url: result.url };
        } catch (error) {
          console.error('Failed to parse search result:', error);
          return null;
        }
      })
      .filter((candidate): candidate is { name: string; domain: string; url: string } => 
        candidate !== null && !existingDomains.has(candidate.domain.toLowerCase())
      )
      .slice(0, Math.min(actualBatchSize * 2, 50)); // Get more candidates than needed
    
    console.log(`Found ${candidates.length} unique candidate domains`);
    
    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        prospects: [],
        message: 'No new unique prospects found. Try refining your ICP or quality ratings.',
        mockData: false,
      });
    }
    
    // Analyze each candidate
    const newProspects: Company[] = [];
    let processedCount = 0;
    
    for (const candidate of candidates) {
      if (newProspects.length >= actualBatchSize) break;
      
      try {
        console.log(`Analyzing ${candidate.domain}...`);
        
        // Fetch and analyze website content
        const content = await fetchWebsiteContent(candidate.domain);
        const analysis = await analyzeWebsiteAgainstICP(content, candidate.name, candidate.domain, icp);
        
        // Only include if ICP score is above threshold (50+)
        if (analysis.icpScore >= 50) {
          try {
            // Insert to database
            const insertedProspect = await db.insert(companiesTable).values({
              userId: 'demo-user', // TODO: Get from auth context
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
            console.log(`✓ Added ${candidate.name} (ICP Score: ${analysis.icpScore})`);
          } catch (dbError) {
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
            // Skip if duplicate domain
            if (errorMessage.includes('duplicate key') || errorMessage.includes('companies_domain_unique')) {
              console.log(`⏭️ ${candidate.domain} already exists, skipping...`);
            } else {
              console.error(`Failed to insert ${candidate.name}:`, errorMessage);
            }
          }
        } else {
          console.log(`✗ Skipped ${candidate.name} (ICP Score: ${analysis.icpScore} too low)`);
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`Failed to analyze ${candidate.domain}:`, error);
        // Continue with next candidate
      }
    }
    
    console.log(`Successfully generated ${newProspects.length} new prospects`);
    
    return NextResponse.json({
      success: true,
      prospects: newProspects,
      message: `Generated ${newProspects.length} new high-quality prospects`,
      mockData: false,
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

export const POST = requireAuth(generateMoreHandler);

