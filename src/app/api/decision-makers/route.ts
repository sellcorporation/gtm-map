import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, companies } from '@/lib/db';
import { generateDecisionMakers } from '@/lib/ai';
import { requireAuth } from '@/lib/auth';

const DecisionMakersRequestSchema = z.object({
  companyId: z.number().int().positive(),
  buyerRoles: z.array(z.string()).min(1),
});

async function generateDecisionMakersHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, buyerRoles } = DecisionMakersRequestSchema.parse(body);
    
    // Check if in mock mode
    const isMockMode = typeof db === 'object' && !db.query;
    
    // Get the company
    let company;
    if (isMockMode) {
      const allCompanies = db.select().from(companies) as Array<{ 
        id: number; 
        name: string; 
        domain: string; 
        decisionMakers?: unknown;
        [key: string]: unknown 
      }>;
      company = allCompanies.find((c: { id: number }) => c.id === companyId);
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    } else {
      const result = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (result.length === 0) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      company = result[0];
    }
    
    // Generate decision makers
    const { decisionMakers, isMock } = await generateDecisionMakers(
      company.name,
      company.domain,
      buyerRoles
    );
    
    // Update company with decision makers
    if (isMockMode) {
      company.decisionMakers = decisionMakers;
    } else {
      await db
        .update(companies)
        .set({ decisionMakers })
        .where(eq(companies.id, companyId));
    }
    
    return NextResponse.json({ 
      success: true, 
      decisionMakers,
      mockData: isMock
    });
    
  } catch (error) {
    console.error('Decision makers generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate decision makers' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(generateDecisionMakersHandler);

