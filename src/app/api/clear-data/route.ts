import { NextRequest, NextResponse } from 'next/server';
import { db, companies, clusters, ads } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function clearDataHandler(_request: NextRequest) {
  try {
    // Delete all data from database
    // Order matters due to foreign key constraints
    await db.delete(ads); // Delete ads first (references clusters)
    await db.delete(clusters); // Delete clusters second (references companies)
    await db.delete(companies); // Delete companies last
    
    console.log('All data cleared from database');
    
    return NextResponse.json({
      success: true,
      message: 'All data cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data from database' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(clearDataHandler);

