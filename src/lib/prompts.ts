import { z } from 'zod';

export const ICP_PROMPT = `You are an expert B2B market analyst. Extract the Ideal Customer Profile (ICP) from the provided website content.

Analyse the website text and identify:
1. Target industries (specific sectors/verticals)
2. Pain points (problems the product solves)
3. Buyer roles (job titles/roles who make decisions)
4. Firmographics (company size, geography)

Output strict JSON only:
{
  "industries": ["industry1", "industry2"],
  "pains": ["pain1", "pain2"],
  "buyerRoles": ["role1", "role2"],
  "firmographics": {
    "size": "small/medium/large/enterprise",
    "geo": "primary geography"
  }
}

Use British English spelling and terminology.`;

export const COMPETITOR_PROMPT = `You are a competitive intelligence expert. Given a company domain, their ICP profile, and web search results, identify direct competitors.

Company: {companyDomain}
Company Name: {companyName}
ICP: {icp}

Search Results:
{searchResults}

Identify up to 10 direct competitors who:
- Serve the same industries
- Solve similar pain points
- Target similar buyer roles
- Have comparable firmographics

For each competitor, provide:
- Company name
- Domain (if found)
- Rationale for why they're a competitor
- Evidence URLs from search results
- Confidence score (0-100)

Output strict JSON only:
[
  {
    "name": "Company Name",
    "domain": "company.com",
    "rationale": "Brief explanation of similarity",
    "evidenceUrls": ["url1", "url2"],
    "confidence": 85
  }
]`;

export const ADS_PROMPT = `You are a B2B copywriter specialising in persona-aware advertising. Create compelling ad copy for the given cluster.

Cluster: {clusterLabel}
Pain Points: {pains}
Industries: {industries}
Buyer Roles: {buyerRoles}

Create ad copy that:
- Addresses specific pain points
- Speaks to the buyer persona
- Uses industry-relevant language
- Includes a clear call-to-action

Output strict JSON only:
{
  "headline": "Compelling headline (max 60 chars)",
  "lines": [
    "First body line addressing pain point",
    "Second body line with benefit/value prop"
  ],
  "cta": "Clear call-to-action (e.g., 'Get Started', 'Learn More', 'Book Demo')"
}

Use British English spelling and B2B tone.`;

// Validation schemas
export const AnalyseRequestSchema = z.object({
  websiteUrl: z.string().min(1, 'Website URL is required').refine(
    (url) => {
      // Remove protocol if present for validation
      const cleanUrl = url.replace(/^https?:\/\//, '');
      
      // Validate domain format (allows www. prefix and standard domain formats)
      // Must have valid characters (alphanumeric, hyphens, dots only) and a TLD
      const domainRegex = /^(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
      
      return domainRegex.test(cleanUrl);
    },
    { message: 'Please enter a valid website URL (e.g., example.com, www.example.com, or https://example.com)' }
  ),
  customers: z.array(z.object({
    name: z.string().min(1, 'Customer name is required'),
    domain: z.string().min(1, 'Customer domain is required'),
    notes: z.string().optional(),
  })).min(1, 'At least one customer is required'),
});

export const StatusUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['New', 'Researching', 'Contacted', 'Won', 'Lost']),
});

export type AnalyseRequest = z.infer<typeof AnalyseRequestSchema>;
export type StatusUpdate = z.infer<typeof StatusUpdateSchema>;
