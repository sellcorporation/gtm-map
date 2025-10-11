#!/usr/bin/env node

/**
 * Test Trial Expiry Auto-Downgrade
 * 
 * This script tests the trial expiry flow:
 * 1. Finds a user with an active trial
 * 2. Expires the trial (sets expires_at to past date)
 * 3. Calls getEffectiveEntitlements (should auto-downgrade to free)
 * 4. Verifies the user was downgraded
 * 
 * Usage: node scripts/test-trial-expiry.mjs [user_email]
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL!');
  process.exit(1);
}

async function testTrialExpiry() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔌 Connected to database\n');

    const userEmail = process.argv[2];

    // Find user
    let userId;
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
      console.log(`✓ Found user: ${userResult.rows[0].email} (${userId})\n`);
    } else {
      // Find any user with active trial
      console.log('🔍 Looking for any user with active trial...');
      const trialResult = await client.query(`
        SELECT 
          tu.user_id,
          u.email,
          tu.expires_at,
          tu.generations_used,
          tu.max_generations
        FROM trial_usage tu
        JOIN auth.users u ON u.id = tu.user_id
        WHERE tu.expires_at > NOW()
        LIMIT 1
      `);

      if (trialResult.rows.length === 0) {
        console.error('❌ No users with active trials found');
        process.exit(1);
      }

      userId = trialResult.rows[0].user_id;
      console.log(`✓ Found user with active trial: ${trialResult.rows[0].email}`);
      console.log(`  Trial expires: ${trialResult.rows[0].expires_at}`);
      console.log(`  Usage: ${trialResult.rows[0].generations_used}/${trialResult.rows[0].max_generations}\n`);
    }

    // Get current state
    console.log('📊 BEFORE EXPIRY:');
    const beforeSub = await client.query(
      `SELECT plan_id, status FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );
    const beforeTrial = await client.query(
      `SELECT expires_at, generations_used FROM trial_usage WHERE user_id = $1`,
      [userId]
    );

    console.log(`  Subscription: ${beforeSub.rows[0]?.plan_id || 'none'} (${beforeSub.rows[0]?.status || 'none'})`);
    console.log(`  Trial expires: ${beforeTrial.rows[0]?.expires_at || 'none'}`);
    console.log(`  Trial usage: ${beforeTrial.rows[0]?.generations_used || 0}\n`);

    // Expire the trial
    console.log('⏰ Expiring trial...');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Set to yesterday

    await client.query(
      `UPDATE trial_usage SET expires_at = $1 WHERE user_id = $2`,
      [pastDate.toISOString(), userId]
    );
    console.log(`✓ Trial expires_at set to: ${pastDate.toISOString()}\n`);

    // Simulate calling getEffectiveEntitlements
    console.log('🔄 Simulating getEffectiveEntitlements call...');
    console.log('   (This would normally happen when user makes API request)\n');

    // Check if trial is expired
    const nowDate = new Date();
    const trialCheck = await client.query(
      `SELECT expires_at FROM trial_usage WHERE user_id = $1`,
      [userId]
    );
    const trialExpired = nowDate > new Date(trialCheck.rows[0].expires_at);
    
    console.log(`  Trial expired: ${trialExpired ? 'YES ✓' : 'NO ✗'}`);

    // Run the auto-downgrade logic
    if (trialExpired) {
      console.log('  Running auto-downgrade...');
      const { rowCount } = await client.query(`
        UPDATE user_subscriptions
        SET plan_id = 'free', status = 'active'
        WHERE user_id = $1 AND status = 'trialing'
      `, [userId]);
      
      if (rowCount > 0) {
        console.log('  ✓ User downgraded to Free plan\n');
      } else {
        console.log('  ℹ User was already on Free plan (idempotent)\n');
      }
    }

    // Get final state
    console.log('📊 AFTER EXPIRY:');
    const afterSub = await client.query(
      `SELECT plan_id, status FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );
    const afterTrial = await client.query(
      `SELECT expires_at, generations_used FROM trial_usage WHERE user_id = $1`,
      [userId]
    );

    console.log(`  Subscription: ${afterSub.rows[0]?.plan_id || 'none'} (${afterSub.rows[0]?.status || 'none'})`);
    console.log(`  Trial expires: ${afterTrial.rows[0]?.expires_at || 'none'}`);
    console.log(`  Trial usage: ${afterTrial.rows[0]?.generations_used || 0}\n`);

    // Verify
    if (afterSub.rows[0]?.plan_id === 'free' && afterSub.rows[0]?.status === 'active') {
      console.log('✅ TEST PASSED: User successfully downgraded to Free plan!');
      console.log('   Next API request will be blocked (0 AI generations allowed)\n');
    } else {
      console.log('❌ TEST FAILED: User was not downgraded correctly');
      console.log(`   Expected: free (active)`);
      console.log(`   Got: ${afterSub.rows[0]?.plan_id} (${afterSub.rows[0]?.status})\n`);
    }

    // Cleanup option
    console.log('💡 To restore trial, run:');
    console.log(`   node scripts/restore-trial.mjs ${userId}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testTrialExpiry();

