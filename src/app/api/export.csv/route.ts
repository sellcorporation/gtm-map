import { NextResponse } from 'next/server';
import { db, companies } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function exportCSVHandler() {
  try {
    const allCompanies = await db.select().from(companies);
    
    // Create CSV headers
    const headers = [
      'Name',
      'Domain',
      'Source',
      'Source Customer Domain',
      'ICP Score',
      'Confidence',
      'Status',
      'Rationale',
    ];
    
    // Create CSV rows
    const rows = allCompanies.map(company => [
      company.name,
      company.domain,
      company.source,
      company.sourceCustomerDomain || '',
      company.icpScore,
      company.confidence,
      company.status,
      company.rationale,
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="gtm-prospects.csv"',
      },
    });
    
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(exportCSVHandler);
