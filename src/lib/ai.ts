import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ICP_PROMPT, COMPETITOR_PROMPT, ADS_PROMPT } from './prompts';
import type { ICP, Competitor, AdCopy } from '@/types';

const model = openai('gpt-4o');

const ICPSchema = z.object({
  industries: z.array(z.string()),
  pains: z.array(z.string()),
  buyerRoles: z.array(z.string()),
  firmographics: z.object({
    size: z.string(),
    geo: z.string(),
  }),
});

const CompetitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    domain: z.string(),
    rationale: z.string(),
    evidenceUrls: z.array(z.string()),
    confidence: z.number().min(0).max(100),
  }))
});

const AdCopySchema = z.object({
  headline: z.string(),
  lines: z.array(z.string()).length(2),
  cta: z.string(),
});

// Mock ICP for testing when OpenAI quota is exceeded
function generateMockICP(): ICP {
  return {
    industries: ['Technology', 'Software', 'SaaS'],
    pains: ['Manual processes', 'Data silos', 'Poor user experience'],
    buyerRoles: ['CTO', 'VP Engineering', 'Product Manager'],
    firmographics: {
      size: 'Medium to Enterprise',
      geo: 'Global'
    }
  };
}

// Mock competitors for testing
function generateMockCompetitors(customerDomain: string, customerName: string): Competitor[] {
  const baseCompetitors = [
    {
      name: `${customerName} Alternative`,
      domain: `${customerDomain}-alternative.com`,
      rationale: `Direct competitor to ${customerName} offering similar solutions`,
      evidenceUrls: [`https://example.com/${customerDomain}-competitors`],
      confidence: 85
    },
    {
      name: `TechCorp Solutions`,
      domain: `techcorp-solutions.com`,
      rationale: `Enterprise software company competing in the same market space`,
      evidenceUrls: [`https://example.com/techcorp-analysis`],
      confidence: 78
    },
    {
      name: `InnovateSoft`,
      domain: `innovatesoft.com`,
      rationale: `Growing competitor with modern technology stack`,
      evidenceUrls: [`https://example.com/innovatesoft-review`],
      confidence: 72
    }
  ];

  return baseCompetitors.map(comp => ({
    ...comp,
    evidenceUrls: comp.evidenceUrls.slice(0, 3)
  }));
}

// Mock ad copy for testing
function generateMockAdCopy(clusterLabel: string): AdCopy {
  return {
    headline: `Transform Your ${clusterLabel} Operations`,
    lines: [
      `Stop struggling with outdated ${clusterLabel.toLowerCase()} processes`,
      `Join 500+ companies already using our solution`
    ],
    cta: 'Get Started Today'
  };
}

export async function extractICP(websiteText: string): Promise<{ icp: ICP; isMock: boolean }> {
  try {
    // Check if OpenAI API key is available and has quota
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OpenAI API key found, using mock ICP');
      return { icp: generateMockICP(), isMock: true };
    }

    const { object } = await generateObject({
      model,
      schema: ICPSchema,
      prompt: `${ICP_PROMPT}\n\nWebsite content:\n${websiteText}`,
    });
    
    return { icp: object, isMock: false };
  } catch (error) {
    console.error('Error extracting ICP:', error);
    
    // Always fall back to mock data on any OpenAI error (quota, rate limit, etc.)
    console.log('OpenAI error occurred, using mock ICP');
    return { icp: generateMockICP(), isMock: true };
  }
}

export async function findCompetitors(
  companyDomain: string,
  companyName: string,
  icp: ICP,
  searchResults: Array<{ title: string; snippet: string; url: string }>
): Promise<{ competitors: Competitor[]; isMock: boolean }> {
  try {
    // Check if OpenAI API key is available and has quota
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OpenAI API key found, using mock competitors');
      return { competitors: generateMockCompetitors(companyDomain, companyName), isMock: true };
    }

    const searchResultsText = searchResults
      .map((result, index) => `${index + 1}. ${result.title}\n   ${result.snippet}\n   ${result.url}`)
      .join('\n\n');

    const prompt = COMPETITOR_PROMPT
      .replace('{companyDomain}', companyDomain)
      .replace('{companyName}', companyName)
      .replace('{icp}', JSON.stringify(icp, null, 2))
      .replace('{searchResults}', searchResultsText);

    const { object } = await generateObject({
      model,
      schema: CompetitorSchema,
      prompt,
    });

    return { competitors: object.competitors, isMock: false };
  } catch (error) {
    console.error('Error finding competitors:', error);
    
    // Always fall back to mock data on any OpenAI error
    console.log('OpenAI error occurred, using mock competitors');
    return { competitors: generateMockCompetitors(companyDomain, companyName), isMock: true };
  }
}

export async function generateAdCopy(
  clusterLabel: string,
  pains: string[],
  industries: string[],
  buyerRoles: string[]
): Promise<{ adCopy: AdCopy; isMock: boolean }> {
  try {
    // Check if OpenAI API key is available and has quota
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OpenAI API key found, using mock ad copy');
      return { adCopy: generateMockAdCopy(clusterLabel), isMock: true };
    }

    const prompt = ADS_PROMPT
      .replace('{clusterLabel}', clusterLabel)
      .replace('{pains}', pains.join(', '))
      .replace('{industries}', industries.join(', '))
      .replace('{buyerRoles}', buyerRoles.join(', '));

    const { object } = await generateObject({
      model,
      schema: AdCopySchema,
      prompt,
    });

    return { adCopy: object, isMock: false };
  } catch (error) {
    console.error('Error generating ad copy:', error);
    
    // Always fall back to mock data on any OpenAI error
    console.log('OpenAI error occurred, using mock ad copy');
    return { adCopy: generateMockAdCopy(clusterLabel), isMock: true };
  }
}
