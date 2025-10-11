import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP } from '@/lib/ai';

const AnalyzeRequestSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
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

async function analyzeCompanyHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, icp } = AnalyzeRequestSchema.parse(body);

    console.log(`Analyzing manually added prospect: ${name} (${domain})`);

    // Fetch website content
    const websiteContent = await fetchWebsiteContent(domain);

    // Analyze against ICP
    const analysis = await analyzeWebsiteAgainstICP(
      websiteContent,
      name,
      domain,
      icp
    );

    return NextResponse.json({
      success: true,
      icpScore: analysis.icpScore,
      confidence: analysis.confidence,
      rationale: analysis.rationale,
      evidence: analysis.evidence,
    });
  } catch (error) {
    console.error('Company analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze company' },
      { status: 500 }
    );
  }
}

export const POST = analyzeCompanyHandler;

