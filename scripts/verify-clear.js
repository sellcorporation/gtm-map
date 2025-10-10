const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' });

async function verify() {
  try {
    console.log('\n📊 Checking database state...\n');
    
    const companies = await sql`SELECT COUNT(*) FROM companies`;
    const sessions = await sql`SELECT COUNT(*) FROM user_sessions`;
    const clusters = await sql`SELECT COUNT(*) FROM clusters`;
    const ads = await sql`SELECT COUNT(*) FROM ads`;
    
    console.log(`Companies:     ${companies[0].count}`);
    console.log(`User Sessions: ${sessions[0].count}`);
    console.log(`Clusters:      ${clusters[0].count}`);
    console.log(`Ads:           ${ads[0].count}`);
    console.log('');
    
    const allEmpty = companies[0].count === '0' && 
                     sessions[0].count === '0' && 
                     clusters[0].count === '0' && 
                     ads[0].count === '0';
    
    if (allEmpty) {
      console.log('✅ Database is completely empty - Clear All Data working correctly!\n');
    } else {
      console.log('⚠️  Database has data - Clear All Data may not have been called yet\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

verify();
