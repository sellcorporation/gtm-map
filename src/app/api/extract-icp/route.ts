import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { extractICP } from '@/lib/ai';

const ExtractICPSchema = z.object({
  websiteUrl: z.string().min(1, 'Website URL is required'),
  customers: z.array(z.object({
    name: z.string(),
    domain: z.string(),
  })).min(1, 'At least one customer is required for ICP extraction'),
  isRegenerating: z.boolean().optional(), // Flag for free regeneration on errors
});

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

async function extractICPHandler(request: NextRequest) {
  try {
    // ========== AUTH CHECK (No usage tracking for ICP extraction) ==========
    console.log('[EXTRACT-ICP] Checking authentication...');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[EXTRACT-ICP] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[EXTRACT-ICP] User authenticated:', user.email);

    // ========== PROCEED WITH ICP EXTRACTION ==========
    const body = await request.json();
    const { websiteUrl, customers, isRegenerating } = ExtractICPSchema.parse(body);
    
    console.log('[EXTRACT-ICP] Prerequisites validated:', {
      websiteUrl,
      customerCount: customers.length,
      isRegenerating: isRegenerating || false,
    });
    
    // Fetch and parse website content
    const websiteText = await fetchWebsiteContent(websiteUrl);
    
    // Extract ICP with retry logic for incomplete responses
    let icp;
    let isMock = false;
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`[EXTRACT-ICP] Extraction attempt ${attempt}/${maxAttempts}`);
      
      try {
        const result = await extractICP(websiteText, customers);
        icp = result.icp;
        isMock = result.isMock;
        
        // Validate that ALL required fields are present
        const missingFields = [];
        
        if (!icp.solution || icp.solution.length === 0) missingFields.push('solution');
        if (!icp.workflows || icp.workflows.length === 0) missingFields.push('workflows');
        if (!icp.industries || icp.industries.length === 0) missingFields.push('industries');
        if (!icp.buyerRoles || icp.buyerRoles.length === 0) missingFields.push('buyerRoles');
        if (!icp.firmographics || !icp.firmographics.size || !icp.firmographics.geo) {
          missingFields.push('firmographics');
        }
        
        if (missingFields.length === 0) {
          console.log('[EXTRACT-ICP] All required fields present');
          break; // Success!
        }
        
        console.warn(`[EXTRACT-ICP] Incomplete ICP, missing: ${missingFields.join(', ')}`);
        
        if (attempt < maxAttempts) {
          console.log('[EXTRACT-ICP] Retrying with more explicit prompt...');
        } else {
          return NextResponse.json({
            error: `AI generated incomplete ICP profile. Missing: ${missingFields.join(', ')}. Please try again.`,
            code: 'INCOMPLETE_ICP',
            missingFields,
            canRegenerate: true, // Allow free regeneration
          }, { status: 422 });
        }
      } catch (error) {
        console.error(`[EXTRACT-ICP] Attempt ${attempt} failed:`, error);
        
        if (attempt >= maxAttempts) {
          throw error; // Re-throw on final attempt
        }
      }
    }
    
    console.log('[EXTRACT-ICP] Extraction successful');
    
    return NextResponse.json({
      icp,
      mockData: isMock,
    });
    
  } catch (error) {
    console.error('ICP extraction error:', error);
    
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { error: `Invalid input: ${errorMessage}`, details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract ICP' },
      { status: 500 }
    );
  }
}

export const POST = extractICPHandler;

