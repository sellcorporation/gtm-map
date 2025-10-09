import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { extractICP } from '@/lib/ai';
import { requireAuth } from '@/lib/auth';

const ExtractICPSchema = z.object({
  websiteUrl: z.string().min(1, 'Website URL is required'),
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
    const body = await request.json();
    const { websiteUrl } = ExtractICPSchema.parse(body);
    
    // Fetch and parse website content
    const websiteText = await fetchWebsiteContent(websiteUrl);
    
    // Extract ICP
    const { icp, isMock } = await extractICP(websiteText);
    
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

export const POST = requireAuth(extractICPHandler);

