import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { db, companies, clusters, ads } from '@/lib/db';
import { extractICP, findCompetitors, generateAdCopy } from '@/lib/ai';
import { searchCompetitors } from '@/lib/search';
import { AnalyseRequestSchema } from '@/lib/prompts';
import { requireAuth } from '@/lib/auth';
import type { ICP, Competitor, Evidence, Company } from '@/types';

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Add https:// if no protocol is provided
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }
    
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GTM-Map/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check size limit (1MB)
    if (html.length > 1024 * 1024) {
      throw new Error('Website content too large (max 1MB)');
    }
    
    // Parse HTML and extract text
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header').remove();
    
    // Extract text content
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error('Error fetching website:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        throw new Error('Domain not found. Please check the website URL and try again.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Connection refused. The website may be down or unreachable.');
      }
      if (error.message.includes('ETIMEDOUT')) {
        throw new Error('Connection timed out. The website took too long to respond.');
      }
    }
    
    throw new Error('Failed to fetch website content. Please verify the URL is correct.');
  }
}

async function computeICPScore(company: Competitor, icp: ICP): Promise<number> {
  // Simple scoring logic - in a real app, you'd use more sophisticated algorithms
  let score = 0;
  
  // Industry match (40 points)
  const industryMatch = icp.industries.some(industry => 
    company.rationale.toLowerCase().includes(industry.toLowerCase())
  );
  if (industryMatch) score += 40;
  
  // Pain point match (30 points)
  const painMatch = icp.pains.some(pain => 
    company.rationale.toLowerCase().includes(pain.toLowerCase())
  );
  if (painMatch) score += 30;
  
  // Buyer role match (20 points)
  const roleMatch = icp.buyerRoles.some(role => 
    company.rationale.toLowerCase().includes(role.toLowerCase())
  );
  if (roleMatch) score += 20;
  
  // Confidence bonus (10 points)
  score += Math.floor(company.confidence / 10);
  
  return Math.min(score, 100);
}

async function createClusters(prospects: Company[], icp: ICP) {
  const clusterMap = new Map<string, number[]>();
  
  // Create multi-dimensional clusters based on ICP score ranges and characteristics
  prospects.forEach((prospect) => {
    // Determine cluster based on ICP score and dominant characteristics
        let clusterKey = '';
    
    // Primary dimension: ICP Score Range
    if (prospect.icpScore >= 80) {
      clusterKey += 'high-';
    } else if (prospect.icpScore >= 60) {
      clusterKey += 'medium-';
    } else {
      clusterKey += 'low-';
    }
    
    // Secondary dimension: Industry (from rationale)
    const industry = icp.industries.find(ind => 
      prospect.rationale.toLowerCase().includes(ind.toLowerCase())
    ) || icp.industries[0] || 'General';
    
    clusterKey += industry.toLowerCase().replace(/\s+/g, '-');
    
    if (!clusterMap.has(clusterKey)) {
      clusterMap.set(clusterKey, []);
    }
    clusterMap.get(clusterKey)!.push(prospect.id);
  });
  
  // Only create clusters with at least 2 companies (or keep single companies in a catch-all)
  const validClusters = new Map<string, { companyIds: number[], label: string }>();
  const singletons: number[] = [];
  
  for (const [key, companyIds] of clusterMap) {
    if (companyIds.length >= 2) {
      const label = key.split('-').slice(0, -1).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') + ' ' + key.split('-').pop()?.split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      
      validClusters.set(key, { companyIds, label });
    } else {
      singletons.push(...companyIds);
    }
  }
  
  // Create a catch-all cluster for singletons if there are any
  if (singletons.length > 0) {
    validClusters.set('other', { 
      companyIds: singletons, 
      label: 'Other Prospects' 
    });
  }
  
  const clusterRecords = [];
  const adRecords = [];
  
  for (const { companyIds, label } of validClusters.values()) {
    const clusterProspects = prospects.filter(p => companyIds.includes(p.id));
    
    const avgIcpScore = companyIds.reduce((sum, id) => {
      const prospect = prospects.find(p => p.id === id);
      return sum + (prospect?.icpScore || 0);
    }, 0) / companyIds.length;
    
    const avgConfidence = companyIds.reduce((sum, id) => {
      const prospect = prospects.find(p => p.id === id);
      return sum + (prospect?.confidence || 0);
    }, 0) / companyIds.length;
    
    // Determine dominant pain points and industries for this cluster
    const painCounts = new Map<string, number>();
    const industryCounts = new Map<string, number>();
    
    clusterProspects.forEach(prospect => {
      icp.pains.forEach(pain => {
        if (prospect.rationale.toLowerCase().includes(pain.toLowerCase())) {
          painCounts.set(pain, (painCounts.get(pain) || 0) + 1);
        }
      });
      
      icp.industries.forEach(industry => {
        if (prospect.rationale.toLowerCase().includes(industry.toLowerCase())) {
          industryCounts.set(industry, (industryCounts.get(industry) || 0) + 1);
        }
      });
    });
    
    const dominantPain = Array.from(painCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || icp.pains[0];
    
    const dominantIndustry = Array.from(industryCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || icp.industries[0];
    
    const cluster = await db.insert(clusters).values({
      label,
      criteria: { 
        avgIcpScore: Math.round(avgIcpScore),
        avgConfidence: Math.round(avgConfidence),
        dominantIndustry,
        dominantPain,
        companyCount: companyIds.length
      },
      companyIds,
    }).returning();
    
    clusterRecords.push(cluster[0]);
    
    // Generate ad copy for this cluster using dominant characteristics
    const { adCopy } = await generateAdCopy(
      dominantIndustry,
      [dominantPain],
      [dominantIndustry],
      icp.buyerRoles
    );
    
    const ad = await db.insert(ads).values({
      clusterId: cluster[0].id,
      headline: adCopy.headline,
      lines: adCopy.lines,
      cta: adCopy.cta,
    }).returning();
    
    adRecords.push(ad[0]);
  }
  
  return { clusters: clusterRecords, ads: adRecords };
}

async function analyseHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { websiteUrl, customers, icp: providedICP } = AnalyseRequestSchema.parse(body);
    
    let icp: ICP;
    let icpIsMock = false;
    
    // Use provided ICP if available, otherwise extract from website
    if (providedICP) {
      icp = providedICP;
    } else {
      // Fetch and parse website content
      const websiteText = await fetchWebsiteContent(websiteUrl);
      
      // Extract ICP
      const extraction = await extractICP(websiteText);
      icp = extraction.icp;
      icpIsMock = extraction.isMock;
    }
    
    // Process each customer
    const allCompetitors: Competitor[] = [];
    let competitorsIsMock = false;
    
    for (const customer of customers) {
      // Search for competitors
      const searchResults = await searchCompetitors(customer.domain, icp.industries[0] || '');
      
      // Find competitors using AI
      const { competitors, isMock: isMock } = await findCompetitors(
        customer.domain,
        customer.name,
        icp,
        searchResults
      );
      
      if (isMock) {
        competitorsIsMock = true;
      }
      
      // Add source customer info
      competitors.forEach(competitor => {
        competitor.evidenceUrls = competitor.evidenceUrls.slice(0, 3); // Limit to 3 URLs
      });
      
      allCompetitors.push(...competitors);
    }
    
    // Dedupe by domain
    const uniqueCompetitors = allCompetitors.reduce((acc, competitor) => {
      const existing = acc.find(c => c.domain === competitor.domain);
      if (!existing) {
        acc.push(competitor);
      } else if (competitor.confidence > existing.confidence) {
        // Replace with higher confidence version
        const index = acc.indexOf(existing);
        acc[index] = competitor;
      }
      return acc;
    }, [] as Competitor[]);
    
    // Compute ICP scores and save to database
    const prospectRecords = [];
    
    for (const competitor of uniqueCompetitors) {
      const icpScore = await computeICPScore(competitor, icp);
      
      const evidence: Evidence[] = competitor.evidenceUrls.map(url => ({
        url,
        snippet: `Evidence for ${competitor.name} as competitor`,
      }));
      
      const prospect = await db.insert(companies).values({
        name: competitor.name,
        domain: competitor.domain,
        source: 'expanded',
        sourceCustomerDomain: customers[0]?.domain,
        icpScore,
        confidence: competitor.confidence,
        status: 'New',
        rationale: competitor.rationale,
        evidence,
      }).returning();
      
      prospectRecords.push(prospect[0]);
    }
    
    // Create clusters and ads
    const { clusters: clusterRecords, ads: adRecords } = await createClusters(prospectRecords, icp);
    
    // Check if we used mock data
    const usedMockData = icpIsMock || competitorsIsMock;

    return NextResponse.json({
      prospects: prospectRecords,
      clusters: clusterRecords,
      ads: adRecords,
      icp,
      mockData: usedMockData,
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('Validation errors:', error.issues);
      return NextResponse.json(
        { error: `Invalid input: ${errorMessage}`, details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(analyseHandler);
