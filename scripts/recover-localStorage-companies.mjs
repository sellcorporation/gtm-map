#!/usr/bin/env node

/**
 * Recovery Script: Save localStorage Companies to Database
 * 
 * This script helps recover manually added companies that were stuck in localStorage
 * with fake timestamp IDs and never saved to the database.
 * 
 * Usage:
 *   1. Copy the localStorage data from browser console:
 *      localStorage.getItem('gtm-data')
 *   2. Paste it into a file: localStorage-data.json
 *   3. Run: node scripts/recover-localStorage-companies.mjs your-user-id localStorage-data.json
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function recoverCompanies(userId, localStorageFile) {
  console.log('🔌 Connected to database');
  console.log('👤 User ID:', userId);
  
  // Read localStorage data
  const localStorageData = JSON.parse(readFileSync(localStorageFile, 'utf-8'));
  const prospects = localStorageData.prospects || [];
  
  console.log(`\n📊 Found ${prospects.length} companies in localStorage\n`);
  
  // Filter companies with timestamp IDs (fake IDs > 1000000000000)
  const fakeIdCompanies = prospects.filter(p => p.id > 1000000000000);
  
  if (fakeIdCompanies.length === 0) {
    console.log('✅ No companies with fake IDs found. All companies appear to be saved correctly.');
    return;
  }
  
  console.log(`⚠️  Found ${fakeIdCompanies.length} companies with fake timestamp IDs:\n`);
  
  fakeIdCompanies.forEach((company, idx) => {
    console.log(`${idx + 1}. ${company.name} (${company.domain})`);
    console.log(`   Fake ID: ${company.id}`);
    console.log(`   ICP Score: ${company.icpScore}, Confidence: ${company.confidence}`);
    console.log(`   Status: ${company.status}`);
    console.log(`   Rationale: ${company.rationale?.substring(0, 100)}...`);
    console.log('');
  });
  
  console.log('\n🔄 Saving these companies to the database...\n');
  
  let savedCount = 0;
  let errorCount = 0;
  
  for (const company of fakeIdCompanies) {
    try {
      // Check if domain already exists (to avoid duplicates)
      const { data: existing } = await supabaseAdmin
        .from('companies')
        .select('id, name, domain')
        .eq('user_id', userId)
        .eq('domain', company.domain)
        .single();
      
      if (existing) {
        console.log(`⏭️  Skipped ${company.name} - already exists in database (ID: ${existing.id})`);
        continue;
      }
      
      // Insert into database
      const { data: saved, error } = await supabaseAdmin
        .from('companies')
        .insert({
          user_id: userId,
          name: company.name,
          domain: company.domain,
          source: company.source || 'expanded',
          source_customer_domain: company.sourceCustomerDomain || null,
          icp_score: company.icpScore || 50,
          confidence: company.confidence || 50,
          status: company.status || 'New',
          rationale: company.rationale || 'Recovered from localStorage',
          evidence: company.evidence || [],
          decision_makers: company.decisionMakers || null,
          quality: company.quality || null,
          notes: company.notes || null,
          tags: company.tags || null,
          related_company_ids: company.relatedCompanyIds || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed to save ${company.name}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Saved ${company.name} with new database ID: ${saved.id}`);
        savedCount++;
      }
    } catch (error) {
      console.error(`❌ Error saving ${company.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Recovery Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully saved: ${savedCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`⏭️  Skipped (already in DB): ${fakeIdCompanies.length - savedCount - errorCount}`);
  console.log('='.repeat(60));
  
  if (savedCount > 0) {
    console.log('\n🎉 Recovery complete! Refresh your browser to see the recovered companies.');
  }
}

// Parse command line arguments
const userId = process.argv[2];
const localStorageFile = process.argv[3];

if (!userId || !localStorageFile) {
  console.error('Usage: node scripts/recover-localStorage-companies.mjs <user_id> <localStorage_file.json>');
  console.error('');
  console.error('Steps:');
  console.error('1. In your browser console, run: copy(localStorage.getItem("gtm-data"))');
  console.error('2. Paste the content into a file (e.g., localStorage-data.json)');
  console.error('3. Run this script with your user ID and the file path');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/recover-localStorage-companies.mjs abc-123-def-456 localStorage-data.json');
  process.exit(1);
}

recoverCompanies(userId, localStorageFile);

