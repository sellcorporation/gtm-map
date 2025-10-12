import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ICP_PROMPT, COMPETITOR_PROMPT, ADS_PROMPT } from './prompts';
import type { ICP, Competitor, AdCopy } from '@/types';

const model = openai('gpt-4o');

const ICPSchema = z.object({
  solution: z.string().describe('One sentence describing the core solution provided'),
  workflows: z.array(z.string()).describe('Key workflows the solution enables (what users DO with it)'),
  industries: z.array(z.string()).describe('Specific target industries'),
  buyerRoles: z.array(z.string()).describe('Job titles who make purchasing decisions'),
  firmographics: z.object({
    size: z.string().describe('Target company size'),
    geo: z.string().describe('Primary geography'),
  }),
});

const CompetitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string().describe('The actual COMPANY NAME (not article titles, not descriptions, not "best X companies")'),
    domain: z.string().describe('Company domain/website'),
    rationale: z.string().describe('Why they are a competitor'),
    evidenceUrls: z.array(z.string()).describe('URLs supporting this is a real company'),
    confidence: z.number().min(0).max(100).describe('Confidence this is a real company (not an aggregator or article)'),
  }))
});

const AdCopySchema = z.object({
  headline: z.string(),
  lines: z.array(z.string()).length(2),
  cta: z.string(),
});

const SearchQueriesSchema = z.object({
  queries: z.array(z.string()).min(5).max(8).describe('5-8 optimized search queries to find companies'),
});

const ExtractedCompaniesSchema = z.object({
  companies: z.array(z.object({
    name: z.string().describe('Actual company name extracted from search results'),
    domain: z.string().describe('Company website domain (without protocol)'),
    evidence: z.string().describe('Snippet from search results proving this is a real company'),
    icpMatch: z.string().describe('Why they match ICP based on search results'),
    confidence: z.number().min(0).max(100).describe('Confidence this is real company matching ICP'),
  }))
});

// Mock ICP for testing when OpenAI quota is exceeded
function generateMockICP(): ICP {
  return {
    solution: 'Digital inspection and reporting software for property surveyors',
    workflows: [
      'Coordinate field inspections and site visits',
      'Produce branded PDF reports with photos and annotations',
      'Manage compliance documentation and certification tracking'
    ],
    industries: ['Property Surveying', 'Building Inspection', 'Construction Quality Assurance'],
    buyerRoles: ['Operations Director', 'Head of Quality Assurance', 'Managing Partner'],
    firmographics: {
      size: 'Medium to Enterprise',
      geo: 'UK and Ireland'
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

export async function extractICP(
  websiteText: string, 
  customers?: Array<{ name: string; domain: string }>
): Promise<{ icp: ICP; isMock: boolean }> {
  try {
    // Check if OpenAI API key is available and has quota
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OpenAI API key found, using mock ICP');
      return { icp: generateMockICP(), isMock: true };
    }

    // Build enhanced prompt with customer context
    let prompt = `${ICP_PROMPT}\n\nWebsite content:\n${websiteText}`;
    
    if (customers && customers.length > 0) {
      prompt += `\n\nKNOWN CUSTOMERS (use these to refine your ICP analysis):\n`;
      customers.forEach(c => {
        prompt += `- ${c.name} (${c.domain})\n`;
      });
      prompt += `\nIMPORTANT: ALL fields are MANDATORY. Analyze the website AND the customer list to provide complete, accurate ICP data. If any field cannot be determined, make an educated inference based on the available information.`;
    }

    const { object } = await generateObject({
      model,
      schema: ICPSchema,
      prompt,
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
  searchResults: Array<{ title: string; snippet: string; url: string }>,
  maxResults: number = 10
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
      .replace('{searchResults}', searchResultsText)
      .replace('Return up to 10 REAL competitors', `Return up to ${maxResults} REAL competitors`);

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
  workflows: string[],
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
      .replace('{workflows}', workflows.join(', '))
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
    emailSource: z.enum(['found', 'generated']).optional(),
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
  buyerRoles: string[],
  existingDecisionMakers: Array<{ name: string; role: string; quality?: 'good' | 'poor' }> = []
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
    // Filter out rejected (poor quality or deleted) decision makers to avoid regenerating them
    const rejectedNames = existingDecisionMakers
      .filter(dm => dm.quality === 'poor' || !dm.quality) // Treat deleted (no quality) as rejected
      .map(dm => dm.name);
    
    const approvedNames = existingDecisionMakers
      .filter(dm => dm.quality === 'good')
      .map(dm => dm.name);
    
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

${rejectedNames.length > 0 ? `
IMPORTANT - DO NOT INCLUDE THESE PEOPLE (user marked as incorrect/irrelevant):
${rejectedNames.map(name => `- ${name}`).join('\n')}

These people were previously suggested but rejected by the user. DO NOT include them again.
` : ''}

${approvedNames.length > 0 ? `
APPROVED DECISION MAKERS (already added by user):
${approvedNames.map(name => `- ${name}`).join('\n')}

These are already added. Find NEW people who are different from these.
` : ''}

WEB SEARCH RESULTS:
${searchResults.slice(0, 4000)}

Extract 2-5 NEW REAL decision makers from these search results. For each person:

1. Extract their ACTUAL full name (as found in the results)
2. Extract their ACTUAL role/title
3. Extract their LinkedIn URL if found (must be a real URL from the results)
4. For email addresses:
   - If you find an ACTUAL email in the search results, include it and set emailSource to "found"
   - If no email is found, generate a likely email using common patterns (firstname.lastname@${companyDomain}, f.lastname@${companyDomain}, etc.) and set emailSource to "generated"
5. Only include phone if explicitly mentioned in the results

CRITICAL RULES:
- Only include people whose names and roles you actually found in the search results
- DO NOT make up names
- DO NOT include anyone from the rejected list above
- DO NOT include anyone from the approved list above
- Find DIFFERENT people than previously suggested
- Always set emailSource to either "found" or "generated" for each email
- If you cannot find enough people matching the target roles, include senior executives you did find
- If you cannot find ANY real names that aren't already rejected/approved, return an empty array

Return a JSON object with a "decisionMakers" array. Each decision maker should include emailSource field.`;

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

// Generate intelligent search queries using GPT
export async function generateSearchQueries(
  icp: ICP,
  existingProspects: Array<{ name: string; quality?: string | null }>,
  targetCount: number
): Promise<string[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Return basic queries if no API key
      return [
        `${icp.industries[0]} companies ${icp.firmographics.geo}`,
        `${icp.industries[0]} services ${icp.firmographics.geo}`,
      ];
    }

    // Identify excellent prospects to learn from
    const excellentProspects = existingProspects.filter(p => p.quality === 'excellent');
    const excellentNames = excellentProspects.map(p => p.name).slice(0, 3);

    const prompt = `You are an expert web search strategist. Generate 5-8 highly optimized search queries to find companies matching this ICP.

TARGET ICP:
- Solution: ${icp.solution}
- Industries: ${icp.industries.join(', ')}
- Geography: ${icp.firmographics.geo}
- Key Workflows: ${icp.workflows.join(', ')}
- Company Size: ${icp.firmographics.size}

${excellentNames.length > 0 ? `
EXCELLENT EXAMPLES TO LEARN FROM:
${excellentNames.map(name => `- ${name}`).join('\n')}

Find companies SIMILAR to these excellent examples.
` : ''}

TARGET: Find ${targetCount} new companies

SEARCH QUERY REQUIREMENTS:

1. **Find Company Websites, Not Articles:**
   - Use negative keywords: -directory -list -"top 10" -"best" -review -clutch -yelp
   - Focus on finding actual company sites, not aggregator/review/article pages

2. **Leverage Geography:**
   - Include specific location terms
   - Use site: operators (e.g., site:*.co.uk for UK, site:*.ie for Ireland)

3. **Use Excellent Examples:**
   ${excellentNames.length > 0 ? `
   - Create queries like "companies similar to ${excellentNames[0]}"
   - Search for "alternatives to ${excellentNames[0]}"` : ''}

4. **Industry-Specific Terms:**
   - Use professional certifications, associations, or industry jargon
   - Example for surveyors: RICS, chartered, accredited

5. **Diverse Query Patterns:**
   - Don't repeat the same query pattern
   - Mix different angles: industry terms, workflow terms, comparison queries, certification queries

6. **Workflow-Based Queries:**
   - Search for companies that PERFORM these workflows: ${icp.workflows.slice(0, 2).join(', ')}
   - Example: If workflow is "conduct property inspections", search for "property inspection services"

GOOD EXAMPLES:
- "residential surveying firms UK RICS chartered -directory -list"
- "companies like ${excellentNames[0] || 'ExampleCo'} ${icp.industries[0]}"
- "property survey services ${icp.firmographics.geo} site:*.co.uk"
- "${icp.workflows[0]} ${icp.firmographics.geo} companies"

Return 5-8 diverse, optimized search queries as a JSON array.`;

    const { object } = await generateObject({
      model,
      schema: SearchQueriesSchema,
      prompt,
      temperature: 0.7, // Creative but focused
    });

    return object.queries;
  } catch (error) {
    console.error('Error generating search queries:', error);
    
    // Fallback to basic queries
    return [
      `${icp.industries[0]} companies ${icp.firmographics.geo}`,
      `${icp.industries[0]} services ${icp.firmographics.geo}`,
      `${icp.workflows[0]} ${icp.firmographics.geo}`,
    ];
  }
}

// Extract companies from search results using GPT intelligence
export async function extractCompaniesFromSearch(
  searchResults: Array<{ title: string; snippet: string; url: string }>,
  icp: ICP,
  existingDomains: Set<string>,
  excellentExamples: string[]
): Promise<Array<{
  name: string;
  domain: string;
  evidence: string;
  icpMatch: string;
  confidence: number;
}>> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Return empty if no API key
      return [];
    }

    if (searchResults.length === 0) {
      return [];
    }

    // Format search results for GPT
    const formattedResults = searchResults.map((result, idx) => 
      `[${idx + 1}] Title: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}\n`
    ).join('\n');

    const prompt = `You are an expert at analyzing web search results and extracting real company information.

TARGET ICP:
- Solution: ${icp.solution}
- Industries: ${icp.industries.join(', ')}
- Geography: ${icp.firmographics.geo}
- Key Workflows they perform: ${icp.workflows.join(', ')}
- Company Size: ${icp.firmographics.size}

${excellentExamples.length > 0 ? `
EXCELLENT PROSPECT EXAMPLES (find companies similar to these):
${excellentExamples.map(name => `- ${name}`).join('\n')}
` : ''}

SEARCH RESULTS TO ANALYZE:
${formattedResults}

YOUR TASK: Extract REAL company names from these search results.

CRITICAL RULES:

1. **Extract Company Names, NOT Article Titles:**
   ✅ GOOD: "Gateway Surveyors", "Knight Frank", "Savills", "eSurv"
   ❌ BAD: "Top 10 Surveyors in London 2024" (article title)
   ❌ BAD: "Best Surveying Companies" (list/directory title)
   ❌ BAD: "11 Types of Surveyors" (blog post)

2. **Identify Company Websites vs Aggregators:**
   ✅ KEEP: Company's own website (e.g., gatewaysurveyors.co.uk)
   ❌ SKIP: Clutch.co, Yelp, Trustpilot, LinkedIn, Facebook (directories/social)
   ❌ SKIP: Review sites, comparison sites, directory listings

3. **Extract Domain Correctly:**
   - Domain should be company's actual website
   - Remove protocol (https://) and www.
   - Example: "knightfrank.co.uk" not "www.knightfrank.co.uk" or "https://knightfrank.co.uk"

4. **Match ICP Criteria:**
   - Company must be in target industry: ${icp.industries.join(' or ')}
   - Company must be in target geography: ${icp.firmographics.geo}
   - Company must PERFORM these workflows (not sell software for them)
   - Look for evidence they match the size: ${icp.firmographics.size}

5. **Provide Evidence:**
   - Extract actual text from the snippet that proves this is a real company
   - Evidence should show what services they provide
   - Evidence should demonstrate ICP match

6. **Skip Existing Companies:**
   Already have these domains (SKIP them):
   ${Array.from(existingDomains).join(', ')}

7. **Confidence Scoring:**
   - 80-100: Clear company name, own website, strong ICP match, detailed evidence
   - 60-79: Likely a company, appears to match ICP, some evidence
   - 40-59: Uncertain if company or might be weak ICP match
   - 0-39: Probably aggregator/article or poor ICP match

Return up to 20 companies. If results only contain articles/directories, return fewer or empty array.

IMPORTANT: Only include companies where you can clearly identify:
1. The actual company name (not an article title)
2. Their real website domain (not a directory)
3. Evidence they match the ICP`;

    const { object } = await generateObject({
      model,
      schema: ExtractedCompaniesSchema,
      prompt,
      temperature: 0.3, // Low temperature for factual extraction
    });

    // Filter out companies we already have and low confidence ones
    const filtered = object.companies
      .filter(company => !existingDomains.has(company.domain.toLowerCase()))
      .filter(company => company.confidence >= 40); // Minimum confidence threshold

    return filtered;
  } catch (error) {
    console.error('Error extracting companies from search:', error);
    return [];
  }
}

// Analyze a website's content against an ICP with workflow-based scoring
export async function analyzeWebsiteAgainstICP(
  websiteContent: string,
  companyName: string,
  companyDomain: string,
  icp: ICP
): Promise<{
  rationale: string;
  confidence: number;
  evidence: Array<{ url: string; snippet: string }>;
  icpScore: number;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Return mock data if no API key
      const workflows = icp.workflows || [];
      return {
        rationale: `${companyName} operates in the ${icp.industries[0]} industry and may use workflows like ${workflows[0] || 'standard business processes'}.`,
        confidence: Math.floor(Math.random() * 30) + 50, // 50-79
        evidence: [
          { url: `https://${companyDomain}`, snippet: 'Company website content' }
        ],
        icpScore: Math.floor(Math.random() * 40) + 50, // 50-89
      };
    }

    const prompt = `You are analyzing a company's website to determine if they are a good fit for a B2B solution.

CRITICAL UNDERSTANDING:
We are selling: ${icp.solution}
We are NOT looking for: Companies that provide the same solution as us
We ARE looking for: Companies that PERFORM these workflows and would BENEFIT from our solution

TARGET CUSTOMER WORKFLOWS (activities they do that our solution helps with):
${icp.workflows.map(w => `- ${w}`).join('\n')}

COMPANY TO ANALYZE: ${companyName}
Domain: ${companyDomain}

Target ICP Context:
Industries: ${icp.industries.join(', ')}
Buyer Roles: ${icp.buyerRoles.join(', ')}
Company Size: ${icp.firmographics.size}
Geography: ${icp.firmographics.geo}

Website Content (first 3000 chars):
${websiteContent.slice(0, 3000)}

SCORING CRITERIA (0-100):

1. Industry Match (0-25): Is this company in the right industry?
2. Geography Match (0-20): Are they in the target geography?
3. Workflow Relevance (0-40): Does this company PERFORM these workflows?
   - HIGHEST WEIGHT - this is the key question
   - Look for evidence they DO these activities (not that they provide software/tools for them)
   - Example: If workflows include "conduct property inspections" → Do they conduct inspections?
   - Example: If workflows include "produce survey reports" → Do they produce reports?
   - IGNORE whether they use software or manual processes - we care if they DO the work
4. Company Size Match (0-15): Similar scale to target?

IMPORTANT: 
- A property surveyor company that conducts inspections is a PERFECT match for inspection software
- A construction firm that manages projects is a PERFECT match for project management software
- Don't penalize them for not being a software company - that's WHY they need our solution!

CONFIDENCE RULES (STRICTLY ENFORCE):
- 3+ solid evidence sources: 75-90 confidence
- 2 sources: 60-70 confidence  
- 1 source or weak evidence: ≤55 confidence

Provide:
1. Rationale (workflow-focused - explain if they DO these activities, not if they sell the same solution)
2. Confidence score (MUST follow rules above based on evidence count)
3. 2-5 evidence items, each with:
   - A DIFFERENT source URL (different pages from their site: /about, /services, /contact, OR external sources)
   - A specific text snippet proving they perform the workflow
   - IMPORTANT: Each evidence item must have a UNIQUE URL - don't use the homepage multiple times
4. Final ICP score (0-100, workflow-weighted)

EVIDENCE DIVERSITY:
- Use different pages from their website (e.g., https://company.com/services, https://company.com/about)
- If their website has multiple pages about their work, cite each one separately
- Each URL should be unique - NO duplicates allowed
- This ensures true evidence diversity

Be honest - if the workflow match is poor, give a low score even if industry matches.`;

    const ExtendedAnalysisSchema = z.object({
      rationale: z.string().describe('Why they match (workflow-focused)'),
      confidence: z.number().min(0).max(100).describe('Confidence (based on evidence count)'),
      evidence: z.array(z.object({
        url: z.string().describe('Specific URL where evidence was found (must be unique)'),
        snippet: z.string().describe('Text snippet proving they perform the workflow'),
      })).min(0).max(5).describe('0-5 evidence items with DIFFERENT URLs (0 if no match)'),
      icpScore: z.number().min(0).max(100).describe('ICP score (workflow-weighted)'),
    });

    const { object } = await generateObject({
      model,
      schema: ExtendedAnalysisSchema,
      prompt,
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
    
    const evidence = validEvidence;

    // Enforce confidence rules based on evidence count
    let adjustedConfidence = object.confidence;
    if (evidence.length >= 3) {
      // With 3+ sources, confidence can be high (75-90)
      adjustedConfidence = Math.max(75, Math.min(adjustedConfidence, 90));
    } else if (evidence.length === 2) {
      // With 2 sources, cap at 70
      adjustedConfidence = Math.min(adjustedConfidence, 70);
      if (adjustedConfidence < 60) adjustedConfidence = 60;
    } else if (evidence.length === 1) {
      // With 1 source, cap at 55
      adjustedConfidence = Math.min(adjustedConfidence, 55);
    } else {
      // With 0 sources (no match), keep confidence as is (usually 0)
      adjustedConfidence = Math.min(adjustedConfidence, 20);
    }

    return {
      rationale: object.rationale,
      confidence: adjustedConfidence,
      evidence,
      icpScore: object.icpScore,
    };

  } catch (error) {
    console.error('Error analyzing website against ICP:', error);
    
    // Return mock data on error
    const workflows = icp.workflows || [];
    return {
      rationale: `${companyName} operates in the ${icp.industries[0]} industry and may use workflows like ${workflows[0] || 'standard business processes'}.`,
      confidence: Math.floor(Math.random() * 30) + 50,
      evidence: [
        { url: `https://${companyDomain}`, snippet: 'Company website content (analysis error)' }
      ],
      icpScore: Math.floor(Math.random() * 40) + 50,
    };
  }
}
