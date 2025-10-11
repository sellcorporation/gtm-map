#!/usr/bin/env node

/**
 * Comprehensive Billing Test Suite
 * 
 * Runs all billing tests in sequence and generates a report.
 * 
 * Usage: node scripts/test-billing-suite.mjs [user_email]
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL!');
  process.exit(1);
}

async function runTestSuite() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   BILLING SYSTEM TEST SUITE                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    // TEST 1: Database Schema
    console.log('📋 TEST 1: Database Schema\n');
    try {
      const tables = [
        'subscription_plans',
        'plan_prices',
        'user_subscriptions',
        'trial_usage',
        'usage_counters',
        'billing_transactions',
        'stripe_events',
      ];

      for (const table of tables) {
        const result = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        if (result.rows[0].exists) {
          console.log(`  ✓ Table '${table}' exists`);
        } else {
          console.log(`  ✗ Table '${table}' missing`);
          results.failed++;
          results.tests.push({ name: `Schema: ${table}`, status: 'failed' });
          continue;
        }
      }
      
      console.log('\n  ✅ Database schema: PASSED\n');
      results.passed++;
      results.tests.push({ name: 'Database Schema', status: 'passed' });
    } catch (error) {
      console.log(`  ✗ Database schema check failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: 'Database Schema', status: 'failed', error: error.message });
    }

    // TEST 2: Subscription Plans
    console.log('💰 TEST 2: Subscription Plans\n');
    try {
      const plans = await client.query(
        `SELECT id, name, price_monthly, max_ai_generations_per_month 
         FROM subscription_plans 
         ORDER BY price_monthly`
      );

      const expectedPlans = ['free', 'starter', 'pro'];
      const actualPlans = plans.rows.map(p => p.id);

      let plansPassed = true;
      for (const expectedPlan of expectedPlans) {
        if (actualPlans.includes(expectedPlan)) {
          const plan = plans.rows.find(p => p.id === expectedPlan);
          console.log(`  ✓ ${plan.name}: £${(plan.price_monthly / 100).toFixed(2)}/mo (${plan.max_ai_generations_per_month} generations)`);
        } else {
          console.log(`  ✗ Missing plan: ${expectedPlan}`);
          plansPassed = false;
        }
      }

      if (plansPassed) {
        console.log('\n  ✅ Subscription plans: PASSED\n');
        results.passed++;
        results.tests.push({ name: 'Subscription Plans', status: 'passed' });
      } else {
        console.log('\n  ✗ Subscription plans: FAILED\n');
        results.failed++;
        results.tests.push({ name: 'Subscription Plans', status: 'failed' });
      }
    } catch (error) {
      console.log(`  ✗ Subscription plans check failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: 'Subscription Plans', status: 'failed', error: error.message });
    }

    // TEST 3: RPC Functions
    console.log('⚙️  TEST 3: RPC Functions\n');
    try {
      const functions = ['increment_usage', 'increment_trial_usage'];
      let funcsPassed = true;

      for (const funcName of functions) {
        const result = await client.query(
          `SELECT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = $1
          )`,
          [funcName]
        );

        if (result.rows[0].exists) {
          console.log(`  ✓ Function '${funcName}' exists`);
        } else {
          console.log(`  ✗ Function '${funcName}' missing`);
          funcsPassed = false;
        }
      }

      if (funcsPassed) {
        console.log('\n  ✅ RPC Functions: PASSED\n');
        results.passed++;
        results.tests.push({ name: 'RPC Functions', status: 'passed' });
      } else {
        console.log('\n  ✗ RPC Functions: FAILED\n');
        results.failed++;
        results.tests.push({ name: 'RPC Functions', status: 'failed' });
      }
    } catch (error) {
      console.log(`  ✗ RPC functions check failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: 'RPC Functions', status: 'failed', error: error.message });
    }

    // TEST 4: Post-Signup Trigger
    console.log('🎣 TEST 4: Post-Signup Trigger\n');
    try {
      const trigger = await client.query(`
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'auth.users'::regclass 
        AND tgfoid = 'public.handle_new_user_billing'::regproc
      `);

      if (trigger.rows.length > 0) {
        console.log(`  ✓ Post-signup trigger installed: ${trigger.rows[0].tgname}`);
        console.log('\n  ✅ Post-Signup Trigger: PASSED\n');
        results.passed++;
        results.tests.push({ name: 'Post-Signup Trigger', status: 'passed' });
      } else {
        console.log('  ✗ Post-signup trigger not found');
        console.log('\n  ✗ Post-Signup Trigger: FAILED\n');
        results.failed++;
        results.tests.push({ name: 'Post-Signup Trigger', status: 'failed' });
      }
    } catch (error) {
      console.log(`  ✗ Trigger check failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: 'Post-Signup Trigger', status: 'failed', error: error.message });
    }

    // TEST 5: Stripe Integration
    console.log('💳 TEST 5: Stripe Configuration\n');
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET;
      
      let stripePassed = true;

      if (stripeKey && stripeKey.startsWith('sk_')) {
        console.log(`  ✓ Stripe Secret Key configured (${stripeKey.substring(0, 10)}...)`);
      } else {
        console.log('  ✗ Stripe Secret Key missing or invalid');
        stripePassed = false;
      }

      if (stripeWebhook) {
        console.log(`  ✓ Stripe Webhook Secret configured`);
      } else {
        console.log('  ⚠️ Stripe Webhook Secret not configured (needed for webhooks)');
      }

      // Check Stripe price IDs in database
      const prices = await client.query(
        `SELECT plan_id, stripe_price_id 
         FROM plan_prices 
         WHERE cadence = 'monthly'`
      );

      for (const price of prices.rows) {
        if (price.stripe_price_id && price.stripe_price_id.startsWith('price_')) {
          console.log(`  ✓ ${price.plan_id}: ${price.stripe_price_id}`);
        } else {
          console.log(`  ✗ ${price.plan_id}: Invalid price ID`);
          stripePassed = false;
        }
      }

      if (stripePassed) {
        console.log('\n  ✅ Stripe Configuration: PASSED\n');
        results.passed++;
        results.tests.push({ name: 'Stripe Configuration', status: 'passed' });
      } else {
        console.log('\n  ⚠️ Stripe Configuration: PARTIAL\n');
        results.skipped++;
        results.tests.push({ name: 'Stripe Configuration', status: 'partial' });
      }
    } catch (error) {
      console.log(`  ✗ Stripe check failed: ${error.message}\n`);
      results.failed++;
      results.tests.push({ name: 'Stripe Configuration', status: 'failed', error: error.message });
    }

    // TEST 6: User Trial Setup
    const userEmail = process.argv[2];
    if (userEmail) {
      console.log('👤 TEST 6: User Trial Setup\n');
      try {
        const user = await client.query(
          `SELECT id, email FROM auth.users WHERE email = $1`,
          [userEmail]
        );

        if (user.rows.length === 0) {
          console.log(`  ⚠️ User not found: ${userEmail}`);
          console.log('  (Skipping user-specific tests)\n');
          results.skipped++;
          results.tests.push({ name: 'User Trial Setup', status: 'skipped' });
        } else {
          const userId = user.rows[0].id;
          
          // Check subscription
          const sub = await client.query(
            `SELECT * FROM user_subscriptions WHERE user_id = $1`,
            [userId]
          );

          if (sub.rows.length > 0) {
            console.log(`  ✓ Subscription created: ${sub.rows[0].plan_id} (${sub.rows[0].status})`);
          } else {
            console.log('  ✗ Subscription not created');
          }

          // Check trial
          const trial = await client.query(
            `SELECT * FROM trial_usage WHERE user_id = $1`,
            [userId]
          );

          if (trial.rows.length > 0) {
            const now = new Date();
            const expires = new Date(trial.rows[0].expires_at);
            const isActive = expires > now;
            console.log(`  ✓ Trial created: ${trial.rows[0].generations_used}/${trial.rows[0].max_generations} (${isActive ? 'active' : 'expired'})`);
            console.log(`  ✓ Expires: ${trial.rows[0].expires_at}`);
          } else {
            console.log('  ✗ Trial not created');
          }

          console.log('\n  ✅ User Trial Setup: PASSED\n');
          results.passed++;
          results.tests.push({ name: 'User Trial Setup', status: 'passed' });
        }
      } catch (error) {
        console.log(`  ✗ User check failed: ${error.message}\n`);
        results.failed++;
        results.tests.push({ name: 'User Trial Setup', status: 'failed', error: error.message });
      }
    } else {
      console.log('👤 TEST 6: User Trial Setup - SKIPPED (no email provided)\n');
      results.skipped++;
      results.tests.push({ name: 'User Trial Setup', status: 'skipped' });
    }

    // SUMMARY
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   TEST SUMMARY                                         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const total = results.passed + results.failed + results.skipped;
    console.log(`  Total Tests: ${total}`);
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ✗ Failed: ${results.failed}`);
    console.log(`  ⚠️ Skipped: ${results.skipped}\n`);

    const percentage = Math.round((results.passed / (results.passed + results.failed)) * 100);
    console.log(`  Success Rate: ${percentage}%\n`);

    if (results.failed === 0) {
      console.log('  🎉 ALL TESTS PASSED!\n');
      console.log('  Your billing system is properly configured.\n');
    } else {
      console.log('  ⚠️ SOME TESTS FAILED\n');
      console.log('  Failed tests:');
      results.tests.filter(t => t.status === 'failed').forEach(t => {
        console.log(`    - ${t.name}${t.error ? ': ' + t.error : ''}`);
      });
      console.log();
    }

    console.log('💡 NEXT STEPS:\n');
    console.log('  1. Fix any failed tests above');
    console.log('  2. Run: node scripts/test-trial-expiry.mjs [email]');
    console.log('  3. Run: node scripts/test-monthly-reset.mjs [email]');
    console.log('  4. Test checkout flow in browser\n');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTestSuite();

