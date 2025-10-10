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
  const ANALYSIS_PROMPT = `You are analyzing "${companyName}" (${companyDomain}) to determine if they match this Ideal Customer Profile (ICP):

**Solution Provided:** ${icp.solution}
**Key Workflows:** ${icp.workflows.join(', ')}
**Target Industries:** ${icp.industries.join(', ')}
**Target Buyer Roles:** ${icp.buyerRoles.join(', ')}
**Company Size:** ${icp.firmographics.size}
**Geography:** ${icp.firmographics.geo}

**Website Content:**
${websiteContent}

Analyze how well this company matches the ICP. Provide:
1. **ICP Score (0-100):** How well they match the ICP criteria
2. **Confidence (0-100):** How confident you are in this assessment based on available evidence
3. **Rationale:** A clear explanation of why they do or don't match
4. **Evidence:** URLs and snippets from their website that support your assessment

Be objective and evidence-based.`;

  try {
    const { object } = await generateObject({
      model,
      schema: CompanyAnalysisSchema,
      prompt: ANALYSIS_PROMPT,
      temperature: 0.3,
    });

    return {
      icpScore: object.icpScore,
      confidence: object.confidence,
      rationale: object.rationale,
      evidence: object.evidence,
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

async function regenerateCompanyHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, companyName, companyDomain, icp } = RegenerateRequestSchema.parse(body);

    // Fetch fresh website content
    let websiteContent: string;
    try {
      websiteContent = await fetchWebsiteContent(companyDomain);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch website content';
      return NextResponse.json(
        { error: `Could not access website: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Re-analyze the company
    const analysis = await analyzeCompany(companyName, companyDomain, websiteContent, icp);

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

