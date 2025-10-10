const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' });

async function checkProspects() {
  try {
    const prospects = await sql`SELECT id, name, domain, icp_score, confidence, created_at FROM companies ORDER BY created_at DESC LIMIT 10`;
    console.log('\n📊 Latest 10 prospects in database:\n');
    prospects.forEach(p => {
      console.log(`${p.name}`);
      console.log(`  Domain: ${p.domain}`);
      console.log(`  ICP Score: ${p.icp_score}/100`);
      console.log(`  Confidence: ${p.confidence}%`);
      console.log(`  Created: ${p.created_at}`);
      console.log('');
    });
    
    const valunation = await sql`SELECT * FROM companies WHERE name ILIKE '%valunation%'`;
    if (valunation.length > 0) {
      console.log('🔍 Found Valunation:');
      console.log(`  ICP Score: ${valunation[0].icp_score}`);
      console.log(`  Created: ${valunation[0].created_at}`);
      console.log(`  (This is likely OLD data - created before migration)`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkProspects();
