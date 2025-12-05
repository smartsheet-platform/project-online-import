#!/usr/bin/env ts-node

/**
 * Cleanup script for old test workspaces
 * Removes test workspaces older than specified hours
 */

import * as dotenv from 'dotenv';
import { cleanupOldTestWorkspaces, getDefaultConfig } from '../test/integration/helpers/smartsheet-setup';

// Load environment variables
dotenv.config({ path: '.env.test' });

interface CleanupOptions {
  olderThanHours: number;
  dryRun: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    olderThanHours: 24, // Default: 24 hours
    dryRun: false,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--hours' && i + 1 < args.length) {
      options.olderThanHours = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  console.log('================================');
  console.log('Test Workspace Cleanup');
  console.log('================================\n');

  // Verify environment
  if (!process.env.SMARTSHEET_API_TOKEN) {
    console.error('ERROR: SMARTSHEET_API_TOKEN not set');
    console.error('Please set it in .env.test or environment variables');
    process.exit(1);
  }

  console.log(`Configuration:`);
  console.log(`  - Older than: ${options.olderThanHours} hours`);
  console.log(`  - Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`  - Workspace prefix: ${getDefaultConfig().prefix}`);
  console.log();

  if (options.dryRun) {
    console.log('DRY RUN MODE - No workspaces will be deleted\n');
  }

  try {
    // Initialize Smartsheet client
    // TODO: Import actual Smartsheet SDK once dependency is added
    // const smartsheet = require('smartsheet');
    // const client = smartsheet.createClient({ accessToken: process.env.SMARTSHEET_API_TOKEN });
    
    console.log('Scanning for old test workspaces...\n');

    // In dry run mode, just list workspaces
    if (options.dryRun) {
      console.log('Would delete workspaces matching:');
      console.log(`  - Name starts with: "${getDefaultConfig().prefix}"`);
      console.log(`  - Created before: ${new Date(Date.now() - options.olderThanHours * 60 * 60 * 1000).toISOString()}`);
      console.log();
      console.log('Run without --dry-run to perform actual deletion');
    } else {
      // Perform actual cleanup
      // const deletedCount = await cleanupOldTestWorkspaces(client, options.olderThanHours);
      
      console.log('Cleanup placeholder - actual implementation requires Smartsheet SDK');
      console.log(`Would delete test workspaces older than ${options.olderThanHours} hours`);
      
      // console.log(`\n✓ Deleted ${deletedCount} old test workspace(s)`);
    }
  } catch (error) {
    console.error('\nERROR during cleanup:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Test Workspace Cleanup Script

Usage:
  npm run cleanup-test-workspaces [options]
  ts-node scripts/cleanup-test-workspaces.ts [options]

Options:
  --hours <number>    Delete workspaces older than N hours (default: 24)
  --dry-run          Show what would be deleted without actually deleting
  --help             Show this help message

Examples:
  # Delete workspaces older than 24 hours (default)
  npm run cleanup-test-workspaces

  # Delete workspaces older than 48 hours
  npm run cleanup-test-workspaces -- --hours 48

  # Preview what would be deleted
  npm run cleanup-test-workspaces -- --dry-run

Environment:
  Requires SMARTSHEET_API_TOKEN in .env.test or environment variables
  `);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}