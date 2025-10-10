import { NextResponse } from 'next/server';
import { db, companies } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function getProspectsHandler() {
  try {
    // Fetch all companies from database
    const allCompanies = await db.select().from(companies);
    
    return NextResponse.json({
      prospects: allCompanies,
      total: allCompanies.length,
    });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prospects from database' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getProspectsHandler);

