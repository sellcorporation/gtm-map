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

// Search the web for real decision makers
async function searchDecisionMakers(
  companyName: string,
  companyDomain: string
): Promise<string> {
  // Check if Tavily API key is available
  if (!process.env.TAVILY_API_KEY) {
    console.warn('No Tavily API key found for decision maker search');
    return '';
  }

  try {
    // Search for leadership/team pages and LinkedIn profiles
    const queries = [
      `${companyName} ${companyDomain} leadership team executives`,
      `${companyName} CEO founder managing director site:linkedin.com`,
      `"${companyName}" ${companyDomain} about team management`,
    ];

    let allContent = '';

    for (const query of queries) {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          search_depth: 'basic',
          include_domains: ['linkedin.com', companyDomain],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.results?.map((r: { title?: string; content?: string; url?: string }) => 
          `${r.title}\n${r.content}\n${r.url}`
        ).join('\n\n') || '';
        allContent += content + '\n\n';
      }
    }

    return allContent;
  } catch (error) {
    console.error('Tavily search error for decision makers:', error);
    return '';
  }
}

// Generate decision makers for a company using real web search + AI extraction
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
  try {
    // Step 1: Search the web for real information about the company's leadership
    console.log(`Searching for real decision makers at ${companyName}...`);
    const searchResults = await searchDecisionMakers(companyName, companyDomain);

    if (!searchResults || searchResults.length < 100) {
      // No real data found - don't generate fake data
      console.warn('No web results found for decision makers');
      return { 
        decisionMakers: [], 
        isMock: true 
      };
    }

    // We found real data - extract decision makers from it
    const prompt = `You are a B2B lead research assistant. Extract REAL decision makers from the following web search results about "${companyName}" (${companyDomain}).

Target buyer roles to focus on: ${buyerRoles.join(', ')}

WEB SEARCH RESULTS:
${searchResults.slice(0, 4000)}

Extract 2-5 REAL decision makers from these search results. For each person:

1. Extract their ACTUAL full name (as found in the results)
2. Extract their ACTUAL role/title
3. Extract their LinkedIn URL if found (must be a real URL from the results)
4. Generate a likely email address using common patterns (firstname.lastname@${companyDomain}, f.lastname@${companyDomain}, etc.)
5. Only include phone if explicitly mentioned in the results

IMPORTANT: Only include people whose names and roles you actually found in the search results. Do NOT make up names.
If you cannot find enough people matching the target roles, include senior executives you did find.
If you cannot find ANY real names in the results, return an empty array.

Return a JSON object with a "decisionMakers" array.`;

    const { object } = await generateObject({
      model,
      schema: DecisionMakerSchema,
      prompt,
      temperature: 0.3, // Low temperature for factual extraction
    });
    
    // Add default contact status
    const decisionMakers = object.decisionMakers.map(dm => ({
      ...dm,
      contactStatus: 'Not Contacted' as const,
    }));
    
    return { 
      decisionMakers, 
      isMock: false 
    };
  } catch (error) {
    console.error('Error generating decision makers:', error);
    
    // Return empty array on error - don't generate fake data
    console.log('Error occurred, returning no decision makers');
    return { 
      decisionMakers: [], 
      isMock: true 
    };
  }
}
