import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, companies } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const UpdateCompanySchema = z.object({
  companyId: z.number().int().positive(),
  name: z.string().optional(),
  domain: z.string().optional(),
  rationale: z.string().optional(),
  status: z.enum(['New', 'Researching', 'Contacted', 'Won', 'Lost']).optional(),
  quality: z.enum(['excellent', 'good', 'poor']).nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  relatedCompanyIds: z.array(z.number()).nullable().optional(),
});

const DeleteCompanySchema = z.object({
  companyId: z.number().int().positive(),
});

async function updateCompanyHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, ...updates } = UpdateCompanySchema.parse(body);
    
    const updated = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, companyId))
      .returning();
    
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, company: updated[0] });
    
  } catch (error) {
    console.error('Company update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

async function deleteCompanyHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = DeleteCompanySchema.parse(body);
    
    const deleted = await db
      .delete(companies)
      .where(eq(companies.id, companyId))
      .returning();
    
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Company deletion error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}

export const PUT = requireAuth(updateCompanyHandler);
export const DELETE = requireAuth(deleteCompanyHandler);

