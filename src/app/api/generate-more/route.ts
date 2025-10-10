import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { searchCompanies, fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP } from '@/lib/ai';
import { db, companies as companiesTable } from '@/lib/db';
import type { Company } from '@/types';

const GenerateMoreRequestSchema = z.object({
  batchSize: z.number().int().min(1).max(100), // Limit to 100 per request
  maxTotalProspects: z.number().int().min(10).max(500).optional(), // Optional max total limit
  icp: z.object({
    solution: z.string(),
    workflows: z.array(z.string()),
    industries: z.array(z.string()),
    buyerRoles: z.array(z.string()),
    firmographics: z.object({
      size: z.string(),
      geo: z.string(),
    }),
  }),
  existingProspects: z.array(z.object({
    id: z.number(),
    domain: z.string(),
    name: z.string(),
    quality: z.string().nullable().optional(),
    icpScore: z.number(),
    rationale: z.string().optional(),
  })),
});

async function generateMoreHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchSize, maxTotalProspects, icp, existingProspects } = GenerateMoreRequestSchema.parse(body);
    
    const maxTotal = maxTotalProspects || 100; // Default to 100 if not specified
    const currentCount = existingProspects.length;
    
    // Check if we've hit the max total limit
    if (currentCount >= maxTotal) {
      return NextResponse.json({
        prospects: [],
        message: `Maximum limit of ${maxTotal} prospects reached. Adjust in settings to generate more.`,
        reachedLimit: true,
      });
    }
    
    // Adjust batch size to not exceed max total
    const actualBatchSize = Math.min(batchSize, maxTotal - currentCount);
    
    // Use SSE for real-time progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send progress messages
        const sendMessage = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
        };
        
        try {
          sendMessage(`🎯 Generating ${actualBatchSize} more prospects (current: ${currentCount}, max: ${maxTotal})...`);
    
    // Filter out existing domains to avoid duplicates
    const existingDomains = new Set(existingProspects.map(p => p.domain.toLowerCase()));
    
          // Analyze high-quality prospects to refine search
          const excellentProspects = existingProspects.filter(p => p.quality === 'excellent');
          const goodProspects = existingProspects.filter(p => p.quality === 'good' || p.icpScore >= 70);
          
          // Build a more targeted search query based on ICP + quality patterns
          let searchQuery = '';
          
          if (excellentProspects.length > 0) {
            // Learn from excellent prospects
            sendMessage(`📚 Learning from ${excellentProspects.length} excellent prospects...`);
            searchQuery = `companies like ${excellentProspects.slice(0, 3).map(p => p.name).join(', ')} in ${icp.industries.join(' or ')}`;
          } else if (goodProspects.length > 0) {
            // Use good prospects as examples
            sendMessage(`📚 Learning from ${goodProspects.length} good prospects...`);
            searchQuery = `companies similar to ${goodProspects.slice(0, 3).map(p => p.name).join(', ')} in ${icp.industries.join(' or ')}`;
          } else {
            // Fall back to ICP-based search
            const workflows = icp.workflows || [];
            searchQuery = `${icp.industries[0]} companies ${icp.firmographics.geo} ${workflows[0] || ''}`;
          }
          
          sendMessage(`🔍 Search query: ${searchQuery}`);
          
          // Search for new companies
          sendMessage(`🌐 Searching the web for potential matches...`);
          const searchResults = await searchCompanies(searchQuery);
    
          // Helper function to validate if a name is a real company name
          const isValidCompanyName = (name: string): boolean => {
            const lowerName = name.toLowerCase();
            
            // Filter out article titles and aggregator listings
            const badPatterns = [
              /^\d+\s+(types|ways|best|top|great)/i, // "11 Types of...", "Top 10..."
              /^(best|top)\s+\d+/i, // "Best 10...", "Top 5..."
              /surveyors?\s+in\s+/i, // "Surveyors in New York"
              /\sin\s+\w+,?\s+\w+$/i, // Ends with "in Location, State"
              /^the\s+best/i, // "THE BEST..."
              /^the\s+\d+/i, // "The 10..."
              /what\s+(are|is)\s+the/i, // "What are the..."
              /(directory|list|guide|review)/i, // Directory/list indicators
              /\d+\s+best/i, // "10 Best..."
            ];
            
            for (const pattern of badPatterns) {
              if (pattern.test(name)) {
                return false;
              }
            }
            
            return true;
          };

          // Extract domains from URLs and filter out duplicates
          sendMessage(`📋 Processing search results and filtering...`);
          let filteredCount = 0;
          
          const candidates = searchResults
            .map(result => {
              try {
                // Extract domain from URL
                const urlObj = new URL(result.url);
                const domain = urlObj.hostname.replace('www.', '');
                
                // Filter out aggregator domains
                const aggregatorDomains = ['clutch.co', 'yelp.com', 'ricsfirms.com', 'trustpilot.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'comparemymove.com', 'propertyinspect.com'];
                if (aggregatorDomains.some(agg => domain.includes(agg))) {
                  return null;
                }
                
                // Extract company name from title (take first part before separator)
                let name = result.title.split(/[-|–—]/)[0].trim();
                
                // Validate the company name
                if (!isValidCompanyName(name)) {
                  filteredCount++;
                  sendMessage(`⚠️ Filtered out invalid name: "${name}"`);
                  return null;
                }
                
                return { name, domain, url: result.url };
              } catch (error) {
                return null;
              }
            })
            .filter((candidate): candidate is { name: string; domain: string; url: string } => 
              candidate !== null && !existingDomains.has(candidate.domain.toLowerCase())
            )
            .slice(0, Math.min(actualBatchSize * 3, 50)); // Get more candidates than needed
          
          sendMessage(`✅ Found ${candidates.length} valid candidates (filtered out ${filteredCount} invalid names)`);
          
          if (candidates.length === 0) {
            sendMessage(`❌ No new unique prospects found. Try refining your ICP or quality ratings.`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result: { prospects: [], message: 'No prospects found' } })}\n\n`));
            controller.close();
            return;
          }
    
          // Analyze each candidate
          sendMessage(`\n🤖 AI Analysis Phase: Analyzing candidates against ICP...`);
          const newProspects: Company[] = [];
          let processedCount = 0;
          let skippedLowScore = 0;
          
          for (const candidate of candidates) {
            if (newProspects.length >= actualBatchSize) {
              sendMessage(`✅ Reached target of ${actualBatchSize} prospects!`);
              break;
            }
            
            try {
              processedCount++;
              sendMessage(`🔍 Analyzing ${candidate.name} (${candidate.domain})... [${processedCount}/${candidates.length}]`);
              
              // Fetch and analyze website content
              const content = await fetchWebsiteContent(candidate.domain);
              const analysis = await analyzeWebsiteAgainstICP(content, candidate.name, candidate.domain, icp);
              
              sendMessage(`   📊 ICP Score: ${analysis.icpScore}/100, Confidence: ${analysis.confidence}%`);
              
              // Only include if ICP score is above threshold (50+)
              if (analysis.icpScore >= 50) {
                try {
                  // Insert to database
                  const insertedProspect = await db.insert(companiesTable).values({
                    userId: 'demo-user', // TODO: Get from auth context
                    name: candidate.name,
                    domain: candidate.domain,
                    source: 'expanded',
                    sourceCustomerDomain: null,
                    icpScore: analysis.icpScore,
                    confidence: analysis.confidence,
                    status: 'New',
                    rationale: analysis.rationale,
                    evidence: analysis.evidence,
                  }).returning();
                  
                  newProspects.push(insertedProspect[0]);
                  sendMessage(`✅ Added ${candidate.name} to prospects!`);
                } catch (dbError) {
                  const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
                  // Skip if duplicate domain
                  if (errorMessage.includes('duplicate key') || errorMessage.includes('companies_domain_unique')) {
                    sendMessage(`⏭️ ${candidate.domain} already exists, skipping...`);
                  } else {
                    sendMessage(`❌ Failed to insert ${candidate.name}: ${errorMessage}`);
                  }
                }
              } else {
                skippedLowScore++;
                sendMessage(`⏭️ Skipped ${candidate.name} (score too low: ${analysis.icpScore})`);
              }
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              sendMessage(`❌ Failed to analyze ${candidate.domain}: ${errorMsg}`);
              // Continue with next candidate
            }
          }
          
          // Final summary
          sendMessage(`\n📊 Generation complete!`);
          sendMessage(`   ✅ Added: ${newProspects.length} new prospects`);
          sendMessage(`   ⏭️ Skipped: ${skippedLowScore} low-scoring candidates`);
          
          if (newProspects.length < actualBatchSize) {
            sendMessage(`\n⚠️ Note: Generated ${newProspects.length} of ${actualBatchSize} requested prospects. Some candidates had low ICP scores or couldn't be analyzed.`);
          }
          
          // Send final result
          const result = {
            success: true,
            prospects: newProspects,
            message: `Generated ${newProspects.length} new high-quality prospects`,
            mockData: false,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Generate more error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Failed to generate more prospects';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Generate more error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate more prospects' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(generateMoreHandler);

