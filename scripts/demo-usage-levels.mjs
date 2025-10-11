#!/usr/bin/env node

/**
 * Demo Usage Levels
 * 
 * This script simulates different usage levels to test the warning/block UI
 * without actually consuming AI generations.
 * 
 * Usage: node scripts/demo-usage-levels.mjs <user_email> <level>
 * 
 * Levels:
 *   safe    - 0 generations (no warnings)
 *   warn    - 45 generations for Starter / 190 for Pro (warning banner)
 *   critical - 48 generations for Starter / 195 for Pro (warning toast)
 *   limit   - 50 generations for Starter / 200 for Pro (blocked)
 *   reset   - Reset to 0
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL!');
  process.exit(1);
}

const USAGE_LEVELS = {
  safe: {
    starter: 0,
    pro: 0,
    description: 'No warnings (fresh start)',
  },
  warn: {
    starter: 45,
    pro: 190,
    description: 'Warning banner appears (limit - 5)',
  },
  critical: {
    starter: 48,
    pro: 195,
    description: 'Warning toast on each generation (limit - 2)',
  },
  limit: {
    starter: 50,
    pro: 200,
    description: 'BLOCKED - Cannot generate (at limit)',
  },
  reset: {
    starter: 0,
    pro: 0,
    description: 'Reset to zero',
  },
};

async function demoUsageLevels() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    const userEmail = process.argv[2];
    const level = process.argv[3];

    if (!userEmail || !level) {
      console.log('Usage: node scripts/demo-usage-levels.mjs <user_email> <level>\n');
      console.log('Available levels:\n');
      Object.entries(USAGE_LEVELS).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(10)} - ${value.description}`);
        console.log(`               Starter: ${value.starter}/50, Pro: ${value.pro}/200\n`);
      });
      process.exit(1);
    }

    if (!USAGE_LEVELS[level]) {
      console.error(`❌ Invalid level: ${level}`);
      console.log('\nAvailable levels:', Object.keys(USAGE_LEVELS).join(', '));
      process.exit(1);
    }

    await client.connect();
    console.log('🔌 Connected to database\n');

    // Get user info
    const userResult = await client.query(
      `SELECT 
        u.id,
        u.email,
        us.plan_id,
        us.status
       FROM auth.users u
       JOIN user_subscriptions us ON u.id = us.user_id
       WHERE u.email = $1`,
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    const userId = user.id;
    const planId = user.plan_id;

    console.log(`👤 User: ${user.email}`);
    console.log(`📦 Plan: ${planId} (${user.status})\n`);

    // Get the usage value for this plan and level
    const usageValue = USAGE_LEVELS[level][planId] || 0;
    const planLimit = planId === 'pro' ? 200 : planId === 'starter' ? 50 : 0;

    // Get current period
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Show what we're doing
    console.log(`🎬 Demo Level: ${level.toUpperCase()}`);
    console.log(`📝 Description: ${USAGE_LEVELS[level].description}`);
    console.log(`🎯 Setting usage to: ${usageValue}/${planLimit}\n`);

    // Update or insert usage counter
    await client.query(
      `INSERT INTO usage_counters (user_id, metric, period_start, used)
       VALUES ($1, 'ai_generations', $2, $3)
       ON CONFLICT (user_id, metric, period_start)
       DO UPDATE SET used = $3, updated_at = NOW()`,
      [userId, periodStartStr, usageValue]
    );

    console.log('✅ Usage counter updated!\n');

    // Show current state
    console.log('📊 CURRENT STATE:');
    console.log(`   Usage: ${usageValue}/${planLimit} AI generations`);
    console.log(`   Remaining: ${planLimit - usageValue}\n`);

    // Show UI expectations
    console.log('🎨 EXPECTED UI:');
    
    if (level === 'safe') {
      console.log('   ✓ UsageBadge: Shows 0/' + planLimit);
      console.log('   ✓ No warnings');
      console.log('   ✓ No banners');
      console.log('   ✓ Generate buttons enabled');
    } else if (level === 'warn') {
      console.log('   ✓ UsageBadge: Shows ' + usageValue + '/' + planLimit);
      console.log('   ⚠️  Warning banner appears (amber)');
      console.log('   ✓ Generate buttons still enabled');
      console.log('   ✓ Message: "You have 5 generations left"');
    } else if (level === 'critical') {
      console.log('   ✓ UsageBadge: Shows ' + usageValue + '/' + planLimit);
      console.log('   ⚠️  Warning banner visible (amber)');
      console.log('   ⚠️  Warning toasts on each generation');
      console.log('   ✓ Generate buttons still enabled');
      console.log('   ✓ Message: "You have 2 generations left"');
    } else if (level === 'limit') {
      console.log('   ✓ UsageBadge: Shows ' + usageValue + '/' + planLimit + ' (red)');
      console.log('   🚫 Block modal appears on generate attempt');
      console.log('   ✗ API returns 402 Payment Required');
      console.log('   ✗ Message: "You\'ve reached your limit"');
      console.log('   ✓ Shows upgrade CTA');
    } else if (level === 'reset') {
      console.log('   ✓ UsageBadge: Shows 0/' + planLimit);
      console.log('   ✓ All warnings cleared');
      console.log('   ✓ Generate buttons enabled');
    }

    console.log('\n💡 What to do next:');
    console.log('   1. Refresh your browser page');
    console.log('   2. Check the usage badge in header');
    
    if (level === 'warn' || level === 'critical') {
      console.log('   3. Look for the amber warning banner');
      console.log('   4. Try clicking "Generate More Prospects"');
      console.log('   5. See the warning toast message');
    } else if (level === 'limit') {
      console.log('   3. Try clicking "Generate More Prospects"');
      console.log('   4. You should see a block modal');
      console.log('   5. Check browser console for 402 error');
    } else if (level === 'reset') {
      console.log('   3. All warnings should be gone');
      console.log('   4. You can generate normally');
    }

    console.log('\n🎭 Try other demo levels:');
    console.log(`   node scripts/demo-usage-levels.mjs ${userEmail} safe`);
    console.log(`   node scripts/demo-usage-levels.mjs ${userEmail} warn`);
    console.log(`   node scripts/demo-usage-levels.mjs ${userEmail} critical`);
    console.log(`   node scripts/demo-usage-levels.mjs ${userEmail} limit`);
    console.log(`   node scripts/demo-usage-levels.mjs ${userEmail} reset\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

demoUsageLevels();

