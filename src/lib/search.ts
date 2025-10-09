import type { SearchResult } from '@/types';

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
    
    return data.results?.map((result: any) => ({
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
