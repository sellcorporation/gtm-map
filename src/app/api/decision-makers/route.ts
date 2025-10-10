import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { generateDecisionMakers } from '@/lib/ai';
import { requireAuth } from '@/lib/auth';
import { db, companies } from '@/lib/db';

const DecisionMakersRequestSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  buyerRoles: z.array(z.string()).min(1),
  existingDecisionMakers: z.array(z.object({
    name: z.string(),
    role: z.string(),
    quality: z.enum(['good', 'poor']).optional(),
  })).optional(),
});

async function generateDecisionMakersHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, companyName, companyDomain, buyerRoles, existingDecisionMakers } = DecisionMakersRequestSchema.parse(body);
    
    // Get the current company from database
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Generate decision makers, excluding rejected ones
    const { decisionMakers: newDecisionMakers, isMock } = await generateDecisionMakers(
      companyName,
      companyDomain,
      buyerRoles,
      existingDecisionMakers || []
    );
    
    // Merge with existing decision makers in database
    const existingDMsInDB = (company[0].decisionMakers as any[]) || [];
    const mergedDecisionMakers = [...existingDMsInDB, ...newDecisionMakers];
    
    // Update the company record in database with new decision makers and timestamp
    await db
      .update(companies)
      .set({ 
        decisionMakers: mergedDecisionMakers,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));
    
    return NextResponse.json({ 
      success: true, 
      decisionMakers: newDecisionMakers,
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

