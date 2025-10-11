/**
 * Run Billing Migration Script
 * 
 * Executes ultra_mvp_billing.sql in Supabase via direct Postgres connection
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

// Get Postgres connection string
const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Missing POSTGRES_URL!');
  console.error('Make sure POSTGRES_URL is set in .env.local');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to Supabase Postgres...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'migrations', 'ultra_mvp_billing.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('🚀 Executing migration SQL...\n');
    await client.query(sql);
    
    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    
    const { rows: plans } = await client.query('SELECT * FROM public.subscription_plans ORDER BY price_monthly');
    console.log('📊 Subscription Plans:');
    plans.forEach(plan => {
      console.log(`   ✓ ${plan.name}: £${(plan.price_monthly / 100).toFixed(2)}/mo (${plan.max_ai_generations_per_month} AI generations)`);
    });

    const { rows: prices } = await client.query('SELECT * FROM public.plan_prices ORDER BY amount');
    console.log('\n💰 Stripe Price IDs:');
    prices.forEach(price => {
      console.log(`   ✓ ${price.plan_id.padEnd(10)} (${price.cadence}): ${price.stripe_price_id}`);
    });

    // Check if trigger is set up
    const { rows: triggers } = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created_billing'
    `);
    
    if (triggers.length > 0) {
      console.log('\n🎣 Post-signup trigger: ✓ Installed');
    }

    // Check RPC functions
    const { rows: functions } = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('increment_usage', 'increment_trial_usage')
    `);
    
    console.log('\n⚙️  RPC Functions:');
    functions.forEach(fn => {
      console.log(`   ✓ ${fn.routine_name}()`);
    });

    console.log('\n✅ MIGRATION COMPLETE!\n');
    console.log('📝 Next step: Set up Stripe webhook\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

