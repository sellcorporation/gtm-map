import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, companies } from '@/lib/db';

const StatusUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['New', 'Researching', 'Contacted', 'Won', 'Lost']),
});

async function updateStatusHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = StatusUpdateSchema.parse(body);
    
    const updated = await db
      .update(companies)
      .set({ status })
      .where(eq(companies.id, id))
      .returning();
    
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, company: updated[0] });
    
  } catch (error) {
    console.error('Status update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

export const PATCH = updateStatusHandler;
