import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { db, companies } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

const ProspectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required'),
  sourceCustomerDomain: z.string().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  icpScore: z.number().int().min(0).max(100).optional(),
});

const BulkImportRequestSchema = z.object({
  prospects: z.array(ProspectSchema).min(1, 'At least one prospect is required'),
});

async function bulkImportHandler(request: NextRequest) {
  try {
    // ========== AUTH CHECK ==========
    console.log('[BULK-IMPORT] Checking authentication...');
    
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
      console.error('[BULK-IMPORT] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[BULK-IMPORT] User authenticated:', user.email);
    const userId = user.id;

    // ========== PROCEED WITH IMPORT ==========
    const body = await request.json();
    const { prospects } = BulkImportRequestSchema.parse(body);
    
    // Fetch existing domains for this user to check for duplicates
    const existingCompanies = await db
      .select({ domain: companies.domain, name: companies.name })
      .from(companies)
      .where(eq(companies.userId, userId));
    
    const existingDomains = new Map(
      existingCompanies.map(c => [c.domain.toLowerCase(), c.name])
    );
    
    let importedCount = 0;
    let renamedCount = 0;
    const errors: string[] = [];
    
    for (const prospect of prospects) {
      try {
        const normalizedDomain = prospect.domain.toLowerCase();
        let finalName = prospect.name;
        
        // Check if domain already exists
        if (existingDomains.has(normalizedDomain)) {
          // Auto-rename: append (1), (2), etc. to the name
          let counter = 1;
          let candidateName = `${prospect.name} (${counter})`;
          
          // Check if this renamed version also exists (by name)
          const existingNames = await db
            .select({ name: companies.name })
            .from(companies)
            .where(and(
              eq(companies.userId, userId),
              eq(companies.domain, normalizedDomain)
            ));
          
          const nameSet = new Set(existingNames.map(c => c.name));
          
          while (nameSet.has(candidateName)) {
            counter++;
            candidateName = `${prospect.name} (${counter})`;
          }
          
          finalName = candidateName;
          renamedCount++;
        }
        
        // Insert the prospect
        await db.insert(companies).values({
          userId,
          name: finalName,
          domain: normalizedDomain,
          source: 'imported',
          sourceCustomerDomain: prospect.sourceCustomerDomain || null,
          icpScore: prospect.icpScore || 70, // Default to 70 if not provided
          confidence: prospect.confidence || 70, // Default to 70 if not provided
          status: 'New',
          rationale: 'Imported from external source',
          evidence: [{ 
            url: normalizedDomain, 
            snippet: 'External import - pending analysis' 
          }],
        });
        
        importedCount++;
        
        // Add to existing domains map to prevent duplicates within this batch
        existingDomains.set(normalizedDomain, finalName);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to import ${prospect.name}: ${errorMsg}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      imported: importedCount,
      renamed: renamedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedCount} prospect(s)${
        renamedCount > 0 ? ` (${renamedCount} renamed due to duplicates)` : ''
      }`,
    });
    
  } catch (error) {
    console.error('Bulk import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import prospects' },
      { status: 500 }
    );
  }
}

export const POST = bulkImportHandler;

