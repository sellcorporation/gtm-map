import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateDecisionMakers } from '@/lib/ai';
import { requireAuth } from '@/lib/auth';

const DecisionMakersRequestSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  buyerRoles: z.array(z.string()).min(1),
});

async function generateDecisionMakersHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, companyName, companyDomain, buyerRoles } = DecisionMakersRequestSchema.parse(body);
    
    // In mock mode, we don't need to lookup the company from DB
    // Just generate decision makers using the provided company details
    
    // Generate decision makers
    const { decisionMakers, isMock } = await generateDecisionMakers(
      companyName,
      companyDomain,
      buyerRoles
    );
    
    // In a real DB setup, we would update the company record here:
    // await db.update(companies)
    //   .set({ decisionMakers })
    //   .where(eq(companies.id, companyId));
    
    // For now, the client will handle updating localStorage
    
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

