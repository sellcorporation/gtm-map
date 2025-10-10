#!/usr/bin/env node

/**
 * Automatic Database Migration Script
 * Runs the SQL migration to add user_sessions table and update schema
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || DATABASE_URL.includes('placeholder')) {
  console.log('❌ No DATABASE_URL found or using placeholder. Migration skipped.');
  console.log('💡 This is normal for local development with mock database.');
  process.exit(0);
}

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  
  // Connect to database
  const sql = postgres(DATABASE_URL, {
    max: 1,
    ssl: 'require'
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add_user_sessions_and_user_id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Reading migration file...');
    console.log('📍 File:', migrationPath);
    console.log('');

    // Remove comments and split by semicolon more carefully
    const lines = migrationSQL.split('\n');
    const cleanedLines = lines.filter(line => !line.trim().startsWith('--') && line.trim().length > 0);
    const cleanedSQL = cleanedLines.join('\n');
    
    // Split by semicolon and filter empty statements
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add semicolon back
      const firstLine = statement.split('\n')[0];
      const preview = firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');
      
      console.log(`[${i + 1}/${statements.length}] ${preview}`);
      
      try {
        await sql.unsafe(statement);
        console.log(`✅ Success\n`);
      } catch (error) {
        // If the error is "already exists", that's okay
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.code === '42P07') { // PostgreSQL error code for "relation already exists"
          console.log(`⚠️  Already exists (skipping)\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✅ user_sessions table created');
    console.log('   ✅ companies table updated (user_id, created_at, updated_at)');
    console.log('   ✅ clusters table updated (user_id)');
    console.log('   ✅ Indexes created for performance');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('   1. Restart your dev server (if running)');
    console.log('   2. Hard refresh browser (Cmd+Shift+R)');
    console.log('   3. Clear data and run new analysis');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('🔍 Error details:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

