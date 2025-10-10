import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { requireAuth } from '@/lib/auth';
import type { ICP } from '@/types';

const model = openai('gpt-4o');

const RegenerateRequestSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
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
});

const CompanyAnalysisSchema = z.object({
  icpScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  rationale: z.string(),
  evidence: z.array(z.object({
    url: z.string(),
    snippet: z.string().optional(),
  })),
});

async function fetchWebsiteContent(domain: string): Promise<string> {
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GTM-Map/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract text content (simple version - in production, use a proper HTML parser)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text.slice(0, 8000); // Limit to first 8000 chars
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        throw new Error('Website took too long to respond. Please try again.');
      }
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        throw new Error('Could not find this website. Please check the domain is correct.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Connection refused by website. The site may be down.');
      }
    }
    throw error;
  }
}

async function analyzeCompany(
  companyName: string,
  companyDomain: string,
  websiteContent: string,
  icp: ICP
): Promise<{
  icpScore: number;
  confidence: number;
  rationale: string;
  evidence: Array<{ url: string; snippet?: string }>;
}> {
  const ANALYSIS_PROMPT = `You are analyzing "${companyName}" (${companyDomain}) to determine if they are a good fit for a B2B solution.

CRITICAL UNDERSTANDING:
We are selling: ${icp.solution}
We are NOT looking for: Companies that provide the same solution as us
We ARE looking for: Companies that PERFORM these workflows and would BENEFIT from our solution

**TARGET CUSTOMER WORKFLOWS (activities they do that our solution helps with):**
${icp.workflows.map(w => `- ${w}`).join('\n')}

**Target ICP Context:**
Industries: ${icp.industries.join(', ')}
Buyer Roles: ${icp.buyerRoles.join(', ')}
Company Size: ${icp.firmographics.size}
Geography: ${icp.firmographics.geo}

**Website Content:**
${websiteContent}

SCORING CRITERIA:
1. Industry Match (0-25): Is this company in the right industry?
2. Geography Match (0-20): Are they in the target geography?
3. Workflow Relevance (0-40): Does this company PERFORM these workflows?
   - HIGHEST WEIGHT - Look for evidence they DO these activities (not that they provide software/tools)
   - IGNORE whether they use software or manual processes - we care if they DO the work
4. Company Size Match (0-15): Similar scale to target?

IMPORTANT:
- A property surveyor that conducts inspections is a PERFECT match for inspection software
- Don't penalize them for not being a software company - that's WHY they need our solution!

Analyze how well this company matches the ICP. Provide:
1. **ICP Score (0-100):** How well they match (workflow-weighted)
2. **Confidence (0-100):** Based on evidence strength (3+ sources = 75-90, 2 sources = 60-70, 1 = ≤55)
3. **Rationale:** Explain if they DO these workflows (not if they sell the same solution)
4. **Evidence:** 2-5 items, each with:
   - A DIFFERENT source URL (different pages: /about, /services, /contact)
   - A specific text snippet proving they perform the workflow
   - IMPORTANT: Each evidence item must have a UNIQUE URL - don't use the same page multiple times

EVIDENCE DIVERSITY:
- Use different pages from their website (e.g., https://company.com/services, https://company.com/about)
- Each URL should be unique - NO duplicates allowed
- This ensures true evidence diversity

Be objective and evidence-based.`;

  try {
    const { object } = await generateObject({
      model,
      schema: CompanyAnalysisSchema,
      prompt: ANALYSIS_PROMPT,
      temperature: 0.3,
    });

    // Validate evidence URLs are unique
    const uniqueUrls = new Set<string>();
    const validEvidence = [];
    
    for (const item of object.evidence) {
      const normalizedUrl = item.url.toLowerCase().trim();
      if (!uniqueUrls.has(normalizedUrl)) {
        uniqueUrls.add(normalizedUrl);
        validEvidence.push(item);
      } else {
        console.warn(`Duplicate evidence URL detected and removed: ${item.url}`);
      }
    }
    
    // If we filtered out duplicates, log it
    if (validEvidence.length < object.evidence.length) {
      console.warn(`Removed ${object.evidence.length - validEvidence.length} duplicate evidence URLs for ${companyName}`);
    }

    return {
      icpScore: object.icpScore,
      confidence: object.confidence,
      rationale: object.rationale,
      evidence: validEvidence,
    };
  } catch (error) {
    console.error('Error analyzing company:', error);
    
    // Return mock data if OpenAI fails
    return {
      icpScore: 75,
      confidence: 70,
      rationale: `Mock analysis for ${companyName}. This company appears to be in the ${icp.industries[0]} industry and may use workflows related to ${icp.workflows[0]}. Further research recommended.`,
      evidence: [
        {
          url: `https://${companyDomain}`,
          snippet: 'Company website content analyzed (mock mode - OpenAI unavailable)',
        },
      ],
    };
  }
}

async function searchForCompanyDomain(companyName: string): Promise<string | null> {
  try {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      console.log('No Tavily API key, cannot search for domain');
      return null;
    }

    const searchQuery = `${companyName} official website`;
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: searchQuery,
        max_results: 3,
      }),
    });

    if (!response.ok) {
      console.log('Tavily search failed');
      return null;
    }

    const data = await response.json();
    
    // Extract domain from the first result
    if (data.results && data.results.length > 0) {
      const url = data.results[0].url;
      const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      console.log(`Found domain for ${companyName}: ${domain}`);
      return domain;
    }

    return null;
  } catch (error) {
    console.error('Error searching for company domain:', error);
    return null;
  }
}

async function regenerateCompanyHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, companyName, companyDomain, icp } = RegenerateRequestSchema.parse(body);

    let finalDomain = companyDomain;
    
    // Check if domain is invalid and search for the real one
    const invalidDomains = ['n/a', 'na', 'unknown', 'not found', 'none', 'n'];
    const isInvalid = invalidDomains.includes(companyDomain.toLowerCase().trim()) || 
                     companyDomain.length < 3 || 
                     !companyDomain.includes('.');
    
    if (isInvalid) {
      console.log(`Invalid domain "${companyDomain}" for ${companyName}, searching for real domain...`);
      const foundDomain = await searchForCompanyDomain(companyName);
      
      if (foundDomain) {
        console.log(`Found domain: ${foundDomain}`);
        finalDomain = foundDomain;
      } else {
        return NextResponse.json(
          { error: `Could not find a valid website for ${companyName}. Please enter the domain manually and try again.` },
          { status: 400 }
        );
      }
    }

    // Fetch fresh website content
    let websiteContent: string;
    try {
      websiteContent = await fetchWebsiteContent(finalDomain);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch website content';
      return NextResponse.json(
        { error: `Could not access website (${finalDomain}): ${errorMessage}. Try editing the domain manually.` },
        { status: 400 }
      );
    }

    // Re-analyze the company
    const analysis = await analyzeCompany(companyName, finalDomain, websiteContent, icp);

    // In production with a real DB, you would update the database here:
    // await db.update(companies)
    //   .set({
    //     icpScore: analysis.icpScore,
    //     confidence: analysis.confidence,
    //     rationale: analysis.rationale,
    //     evidence: analysis.evidence,
    //   })
    //   .where(eq(companies.id, companyId));

    return NextResponse.json({
      success: true,
      companyId,
      domain: finalDomain, // Return the (possibly updated) domain
      ...analysis,
      mockData: false, // Set to true if using mock data
    });

  } catch (error) {
    console.error('Regenerate company error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate company details' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(regenerateCompanyHandler);

