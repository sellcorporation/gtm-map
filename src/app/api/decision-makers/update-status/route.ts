import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, companies } from '@/lib/db';
import type { DecisionMaker } from '@/types';

const UpdateStatusSchema = z.object({
  companyId: z.number().int().positive(),
  decisionMakerName: z.string(),
  contactStatus: z.enum(['Not Contacted', 'Attempted', 'Connected', 'Responded', 'Unresponsive']),
  notes: z.string().optional(),
});

async function updateDecisionMakerStatusHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, decisionMakerName, contactStatus, notes } = UpdateStatusSchema.parse(body);
    
    // Get the company
    const result = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    const company = result[0];
    
    // Update decision maker status
    const decisionMakers = (company.decisionMakers as DecisionMaker[]) || [];
    const dmIndex = decisionMakers.findIndex(dm => dm.name === decisionMakerName);
    
    if (dmIndex === -1) {
      return NextResponse.json({ error: 'Decision maker not found' }, { status: 404 });
    }
    
    decisionMakers[dmIndex] = {
      ...decisionMakers[dmIndex],
      contactStatus,
      notes: notes || decisionMakers[dmIndex].notes,
    };
    
    // Update in database
    await db
      .update(companies)
      .set({ decisionMakers })
      .where(eq(companies.id, companyId));
    
    return NextResponse.json({ 
      success: true, 
      decisionMaker: decisionMakers[dmIndex]
    });
    
  } catch (error) {
    console.error('Decision maker status update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update decision maker status' },
      { status: 500 }
    );
  }
}

export const PATCH = updateDecisionMakerStatusHandler;

