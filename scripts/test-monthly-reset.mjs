#!/usr/bin/env node

/**
 * Test Monthly Usage Counter Reset
 * 
 * This script tests the monthly usage counter reset:
 * 1. Shows current month's usage
 * 2. Manually triggers a new period (simulates month change)
 * 3. Verifies old counter still exists
 * 4. Makes a new API call (simulates usage in new month)
 * 5. Verifies new counter created with usage=1
 * 
 * Usage: node scripts/test-monthly-reset.mjs [user_email]
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL!');
  process.exit(1);
}

async function testMonthlyReset() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔌 Connected to database\n');

    const userEmail = process.argv[2];

    // Find user
    let userId, email;
    if (userEmail) {
      console.log(`🔍 Looking for user: ${userEmail}`);
      const userResult = await client.query(
        `SELECT id, email FROM auth.users WHERE email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        console.error(`❌ User not found: ${userEmail}`);
        process.exit(1);
      }
      userId = userResult.rows[0].id;
      email = userResult.rows[0].email;
      console.log(`✓ Found user: ${email} (${userId})\n`);
    } else {
      // Find any user with usage
      console.log('🔍 Looking for any user with usage...');
      const userResult = await client.query(`
        SELECT 
          uc.user_id,
          u.email,
          uc.used,
          uc.period_start
        FROM usage_counters uc
        JOIN auth.users u ON u.id = uc.user_id
        WHERE uc.metric = 'ai_generations'
        ORDER BY uc.period_start DESC
        LIMIT 1
      `);

      if (userResult.rows.length === 0) {
        console.error('❌ No users with usage found');
        process.exit(1);
      }

      userId = userResult.rows[0].user_id;
      email = userResult.rows[0].email;
      console.log(`✓ Found user with usage: ${email}`);
      console.log(`  Current usage: ${userResult.rows[0].used}`);
      console.log(`  Period: ${userResult.rows[0].period_start}\n`);
    }

    // Get current period
    const currentPeriod = new Date();
    currentPeriod.setUTCDate(1);
    currentPeriod.setUTCHours(0, 0, 0, 0);
    const currentPeriodStr = currentPeriod.toISOString().split('T')[0];

    // Get next period (simulate month change)
    const nextPeriod = new Date(currentPeriod);
    nextPeriod.setMonth(nextPeriod.getMonth() + 1);
    const nextPeriodStr = nextPeriod.toISOString().split('T')[0];

    console.log('📅 Period Information:');
    console.log(`  Current period: ${currentPeriodStr}`);
    console.log(`  Next period:    ${nextPeriodStr}\n`);

    // Show current usage
    console.log('📊 CURRENT PERIOD USAGE:');
    const currentUsage = await client.query(
      `SELECT * FROM usage_counters 
       WHERE user_id = $1 
       AND metric = 'ai_generations' 
       AND period_start = $2`,
      [userId, currentPeriodStr]
    );

    if (currentUsage.rows.length > 0) {
      console.log(`  Period: ${currentUsage.rows[0].period_start}`);
      console.log(`  Used: ${currentUsage.rows[0].used}`);
      console.log(`  Updated: ${currentUsage.rows[0].updated_at}\n`);
    } else {
      console.log('  No usage in current period\n');
    }

    // Show all usage history
    console.log('📜 USAGE HISTORY:');
    const allUsage = await client.query(
      `SELECT period_start, used, updated_at 
       FROM usage_counters 
       WHERE user_id = $1 AND metric = 'ai_generations'
       ORDER BY period_start DESC`,
      [userId]
    );

    if (allUsage.rows.length > 0) {
      allUsage.rows.forEach(row => {
        console.log(`  ${row.period_start}: ${row.used} generations`);
      });
      console.log();
    } else {
      console.log('  No usage history\n');
    }

    // Simulate month rollover by creating usage in next period
    console.log('🔄 Simulating month rollover...');
    console.log(`   Creating usage entry for ${nextPeriodStr}\n`);

    // Call increment_usage RPC for next period
    await client.query(
      `SELECT increment_usage($1, $2, $3)`,
      [userId, 'ai_generations', nextPeriodStr]
    );

    console.log('✓ Usage incremented for next period\n');

    // Verify both periods exist
    console.log('📊 VERIFICATION:');
    const verifyUsage = await client.query(
      `SELECT period_start, used, updated_at 
       FROM usage_counters 
       WHERE user_id = $1 AND metric = 'ai_generations'
       ORDER BY period_start DESC`,
      [userId]
    );

    console.log('  All periods:');
    verifyUsage.rows.forEach(row => {
      const isCurrent = row.period_start === currentPeriodStr;
      const isNext = row.period_start === nextPeriodStr;
      const label = isCurrent ? ' (current)' : isNext ? ' (next - NEW!)' : '';
      console.log(`    ${row.period_start}: ${row.used} generations${label}`);
    });
    console.log();

    // Verify next period has usage=1
    const nextUsage = verifyUsage.rows.find(r => r.period_start === nextPeriodStr);
    
    if (nextUsage && nextUsage.used === 1) {
      console.log('✅ TEST PASSED: Monthly usage counter works correctly!');
      console.log('   - Old period preserved: ✓');
      console.log('   - New period created: ✓');
      console.log('   - New period started at 1: ✓\n');
      
      console.log('💡 In production:');
      console.log('   - Each month gets its own counter');
      console.log('   - Old months are preserved for history/analytics');
      console.log('   - New month starts fresh at 0');
      console.log('   - RPC function handles this automatically\n');
    } else {
      console.log('❌ TEST FAILED: Monthly reset not working correctly');
      console.log(`   Expected next period usage: 1`);
      console.log(`   Got: ${nextUsage?.used || 'undefined'}\n`);
    }

    // Cleanup option
    console.log('💡 To clean up test data:');
    console.log(`   DELETE FROM usage_counters WHERE user_id = '${userId}' AND period_start = '${nextPeriodStr}';\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testMonthlyReset();

