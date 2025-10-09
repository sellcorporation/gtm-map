import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, companies } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const StatusUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['New', 'Researching', 'Contacted', 'Won', 'Lost']),
});

async function updateStatusHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = StatusUpdateSchema.parse(body);
    
    // Check if in mock mode by checking if db has the special mock property
    const isMockMode = typeof db === 'object' && !db.query;
    
    let updated;
    if (isMockMode) {
      // In mock mode, use a simpler update approach
      // Find the item, update it, and return it
      const allCompanies = db.select().from(companies) as Array<{ id: number; status: string; [key: string]: unknown }>;
      const company = allCompanies.find((c: { id: number }) => c.id === id);
      
      if (company) {
        company.status = status;
        updated = [company];
      } else {
        updated = [];
      }
    } else {
      // Real database mode
      updated = await db
        .update(companies)
        .set({ status })
        .where(eq(companies.id, id))
        .returning();
    }
    
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

export const PATCH = requireAuth(updateStatusHandler);
