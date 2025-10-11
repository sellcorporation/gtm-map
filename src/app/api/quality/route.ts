import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, companies } from '@/lib/db';

const QualityUpdateSchema = z.object({
  companyId: z.number().int().positive(),
  quality: z.enum(['excellent', 'good', 'poor']).nullable(),
});

async function updateQualityHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, quality } = QualityUpdateSchema.parse(body);
    
    const updated = await db
      .update(companies)
      .set({ quality })
      .where(eq(companies.id, companyId))
      .returning();
    
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, company: updated[0] });
    
  } catch (error) {
    console.error('Quality update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update quality' },
      { status: 500 }
    );
  }
}

export const PATCH = updateQualityHandler;

