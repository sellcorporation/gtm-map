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

// Decision Maker Schema
const DecisionMakerSchema = z.object({
  decisionMakers: z.array(z.object({
    name: z.string(),
    role: z.string(),
    linkedin: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }))
});

// Mock decision makers for testing
function generateMockDecisionMakers(companyName: string, buyerRoles: string[]): Array<{
  name: string;
  role: string;
  linkedin?: string;
  email?: string;
  contactStatus: 'Not Contacted' | 'Attempted' | 'Connected' | 'Responded' | 'Unresponsive';
}> {
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  return buyerRoles.slice(0, 3).map((role, i) => ({
    name: `[Demo] ${role} at ${companyName}`,
    role,
    linkedin: `https://linkedin.com/in/demo-${role.toLowerCase().replace(/\s+/g, '-')}-${i}`,
    email: `${role.toLowerCase().replace(/\s+/g, '.')}@${domain}`,
    contactStatus: 'Not Contacted' as const,
  }));
}

// Generate decision makers for a company using AI
export async function generateDecisionMakers(
  companyName: string,
  companyDomain: string,
  buyerRoles: string[]
): Promise<{
  decisionMakers: Array<{
    name: string;
    role: string;
    linkedin?: string;
    email?: string;
    phone?: string;
    contactStatus: 'Not Contacted' | 'Attempted' | 'Connected' | 'Responded' | 'Unresponsive';
  }>;
  isMock: boolean;
}> {
  const DECISION_MAKERS_PROMPT = `You are a B2B lead research assistant. Generate likely decision makers for the company "${companyName}" (${companyDomain}).

Based on the target buyer roles: ${buyerRoles.join(', ')}

Generate 2-4 realistic decision makers who would be involved in purchasing decisions. For each:

1. Create a realistic full name (first and last name)
2. Assign one of the provided buyer roles
3. Generate a likely LinkedIn URL (format: https://linkedin.com/in/firstname-lastname)
4. Generate a likely email address using common patterns (firstname.lastname@domain, f.lastname@domain, etc.)
5. Only include phone if you have high confidence (leave empty otherwise)

Make the names diverse and realistic. Use the company domain for email addresses.

Return a JSON object with a "decisionMakers" array.`;

  try {
    const { object } = await generateObject({
      model,
      schema: DecisionMakerSchema,
      prompt: DECISION_MAKERS_PROMPT,
      temperature: 0.7,
    });
    
    // Add default contact status
    const decisionMakers = object.decisionMakers.map(dm => ({
      ...dm,
      contactStatus: 'Not Contacted' as const,
    }));
    
    return { decisionMakers, isMock: false };
  } catch (error) {
    console.error('Error generating decision makers:', error);
    
    // Fall back to mock data
    console.log('OpenAI error occurred, using mock decision makers');
    return { 
      decisionMakers: generateMockDecisionMakers(companyName, buyerRoles), 
      isMock: true 
    };
  }
}
