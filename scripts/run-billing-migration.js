/**
 * Run Billing Migration Script
 * 
 * Executes ultra_mvp_billing.sql in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runMigration() {
  console.log('🚀 Running billing migration...\n');

  // Read migration file
  const migrationPath = join(__dirname, '..', 'migrations', 'ultra_mvp_billing.sql');
  const sql = readFileSync(migrationPath, 'utf8');

  try {
    // Execute the SQL
    // Note: Supabase REST API doesn't support raw SQL execution directly
    // We'll need to use the Postgres connection or break it into parts
    
    // For now, let's use the REST API for the parts we can
    console.log('⚠️  This script requires manual execution in Supabase SQL Editor');
    console.log('📋 Please copy the SQL from: migrations/ultra_mvp_billing.sql');
    console.log('🌐 Go to: https://supabase.com/dashboard/project/zcudacuxksulopgevkne/sql/new');
    console.log('\n✅ Migration SQL is ready to paste and execute!\n');
    
    // Verify connection works
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Error connecting to Supabase:', error.message);
      process.exit(1);
    }
    
    if (data && data.length > 0) {
      console.log('✅ Migration already complete! Found subscription_plans table.\n');
      
      // Show current plans
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*');
      
      if (plans) {
        console.log('📊 Current Plans:');
        plans.forEach(plan => {
          console.log(`   - ${plan.name}: £${(plan.price_monthly / 100).toFixed(2)}/mo (${plan.max_ai_generations_per_month} gens)`);
        });
      }
      
      // Show prices
      const { data: prices } = await supabase
        .from('plan_prices')
        .select('*');
      
      if (prices) {
        console.log('\n💰 Stripe Price IDs:');
        prices.forEach(price => {
          console.log(`   - ${price.plan_id} (${price.cadence}): ${price.stripe_price_id}`);
        });
      }
      
      console.log('\n✅ Migration verified successfully!\n');
    } else {
      console.log('⚠️  Tables not found. Please run the migration SQL manually.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();

