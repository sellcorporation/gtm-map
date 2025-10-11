#!/usr/bin/env node

/**
 * Restore User Trial
 * 
 * This script restores a user's trial to active state (14 days from now).
 * Useful for testing or giving users another trial.
 * 
 * Usage: node scripts/restore-trial.mjs <user_id_or_email>
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL!');
  process.exit(1);
}

async function restoreTrial() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    const userIdentifier = process.argv[2];
    
    if (!userIdentifier) {
      console.error('❌ Usage: node scripts/restore-trial.mjs <user_id_or_email>');
      process.exit(1);
    }

    await client.connect();
    console.log('🔌 Connected to database\n');

    // Find user (try UUID first, then email)
    let userId, email;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(userIdentifier)) {
      // It's a UUID
      const result = await client.query(
        `SELECT id, email FROM auth.users WHERE id = $1`,
        [userIdentifier]
      );
      if (result.rows.length === 0) {
        console.error(`❌ User not found: ${userIdentifier}`);
        process.exit(1);
      }
      userId = result.rows[0].id;
      email = result.rows[0].email;
    } else {
      // It's an email
      const result = await client.query(
        `SELECT id, email FROM auth.users WHERE email = $1`,
        [userIdentifier]
      );
      if (result.rows.length === 0) {
        console.error(`❌ User not found: ${userIdentifier}`);
        process.exit(1);
      }
      userId = result.rows[0].id;
      email = result.rows[0].email;
    }

    console.log(`✓ Found user: ${email}`);
    console.log(`  ID: ${userId}\n`);

    // Calculate new expiry (14 days from now)
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 14);

    // Update trial
    await client.query(
      `UPDATE trial_usage 
       SET expires_at = $1, 
           generations_used = 0,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newExpiry.toISOString(), userId]
    );

    // Update subscription to trialing
    await client.query(
      `UPDATE user_subscriptions 
       SET plan_id = 'free',
           status = 'trialing'
       WHERE user_id = $1`,
      [userId]
    );

    console.log('✅ Trial restored successfully!');
    console.log(`  New expiry: ${newExpiry.toISOString()}`);
    console.log(`  Days remaining: 14`);
    console.log(`  Generations: 0/10`);
    console.log(`  Status: trialing\n`);

    console.log('💡 User can now:');
    console.log('  - Make 10 AI generations');
    console.log('  - Use Pro features');
    console.log('  - Has 14 days before expiry\n');

  } catch (error) {
    console.error('❌ Failed to restore trial:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

restoreTrial();

