import * as cheerio from 'cheerio';
import type { SearchResult } from '@/types';

export async function fetchWebsiteContent(url: string): Promise<string> {
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
    
    throw new Error(`Failed to fetch website content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function searchCompetitors(
  domain: string,
  industry: string
): Promise<SearchResult[]> {
  const query = `${domain} competitors ${industry}`;
  
  // Check if Tavily API key is available
  if (!process.env.TAVILY_API_KEY) {
    // Fallback to dummy results if no API key
    console.warn('No Tavily API key found, using dummy results');
    return [
      {
        title: `${domain} Competitors and Alternatives`,
        snippet: `Find the best alternatives to ${domain} in the ${industry} industry. Compare features, pricing, and reviews.`,
        url: `https://example.com/${domain}-competitors`,
      },
      {
        title: `Top ${industry} Companies Like ${domain}`,
        snippet: `Discover similar companies to ${domain} in the ${industry} sector. See how they compare in terms of market share and offerings.`,
        url: `https://example.com/similar-${domain}`,
      },
      {
        title: `${domain} vs Competitors Analysis`,
        snippet: `Comprehensive analysis of ${domain} compared to its main competitors in the ${industry} market.`,
        url: `https://example.com/${domain}-analysis`,
      },
    ];
  }

  try {
    // Use fetch instead of Tavily client for now
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: 6,
        search_depth: 'basic',
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results?.map((result: { title?: string; content?: string; url?: string }) => ({
      title: result.title || '',
      snippet: result.content || '',
      url: result.url || '',
    })) || [];
  } catch (error) {
    console.error('Tavily search error:', error);
    // Return dummy results on error
    return [
      {
        title: `${domain} Competitors`,
        snippet: `Search results for ${domain} competitors in ${industry}`,
        url: `https://example.com/${domain}-competitors`,
      },
    ];
  }
}
