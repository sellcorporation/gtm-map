#!/usr/bin/env node

/**
 * CI Guardrail: Prevent forbidden localStorage keys from reappearing
 * 
 * This script scans the codebase for any usage of legacy localStorage keys
 * that should only be stored in the database.
 * 
 * Usage:
 *   node scripts/check-forbidden-localstorage.mjs
 * 
 * Exit codes:
 *   0: No forbidden keys found
 *   1: Forbidden keys detected
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🚨 FORBIDDEN KEYS: Data entities that must live in DB only
const FORBIDDEN_KEYS = [
  'gtm-data',
  'gtm-icp',
  'gtm-customers',
  'gtm-website-url',
  'gtm-analysis-step',
];

// ✅ ALLOWED KEYS: UI preferences only
const ALLOWED_KEYS = [
  'gtm-batch-size',
  'gtm-max-total-prospects',
  'gtm-min-icp-score',
];

// Directories to scan
const SCAN_DIRS = [
  path.join(__dirname, '../src'),
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /check-forbidden-localstorage\.mjs$/,
];

/**
 * Recursively scan directory for files
 */
function* walkSync(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
        yield* walkSync(filePath);
      }
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      // Only scan TypeScript and JavaScript files
      if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
        yield filePath;
      }
    }
  }
}

/**
 * Check file for forbidden localStorage usage
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    // Check for localStorage.getItem/setItem with forbidden keys
    for (const key of FORBIDDEN_KEYS) {
      // Match patterns like:
      // localStorage.getItem('gtm-data')
      // localStorage.setItem("gtm-data", ...)
      // localStorage.removeItem('gtm-data')
      const patterns = [
        new RegExp(`localStorage\\.(?:get|set|remove)Item\\(['"]${key}['"]\\)`, 'g'),
        new RegExp(`localStorage\\[['"]${key}['"]\\]`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            line: index + 1,
            code: line.trim(),
            key,
          });
        }
      }
    }
  });

  return violations;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning for forbidden localStorage keys...\n');
  console.log('Forbidden keys:', FORBIDDEN_KEYS.join(', '));
  console.log('Allowed keys:', ALLOWED_KEYS.join(', '));
  console.log('');

  let totalViolations = 0;
  const violationsByFile = new Map();

  // Scan all directories
  for (const dir of SCAN_DIRS) {
    for (const filePath of walkSync(dir)) {
      const violations = checkFile(filePath);
      
      if (violations.length > 0) {
        totalViolations += violations.length;
        violationsByFile.set(filePath, violations);
      }
    }
  }

  // Report results
  if (totalViolations === 0) {
    console.log('✅ No forbidden localStorage keys found!');
    console.log('');
    process.exit(0);
  } else {
    console.error(`❌ Found ${totalViolations} violation(s):\n`);
    
    for (const [file, violations] of violationsByFile.entries()) {
      const relPath = path.relative(path.join(__dirname, '..'), file);
      console.error(`  ${relPath}:`);
      
      for (const violation of violations) {
        console.error(`    Line ${violation.line}: ${violation.code}`);
        console.error(`      → Key "${violation.key}" must be stored in database only`);
      }
      console.error('');
    }

    console.error('💡 Fix: Remove localStorage usage for data entities. Use database instead.');
    console.error('');
    process.exit(1);
  }
}

main();

