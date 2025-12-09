#!/usr/bin/env ts-node

/**
 * Cleanup script for old test workspaces
 * Removes test workspaces older than specified hours
 */

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import * as smartsheet from 'smartsheet';

// Load environment variables
dotenv.config({ path: '.env.test' });

interface CleanupOptions {
  olderThanHours: number;
  dryRun: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    olderThanHours: 1, // Default: 1 hour
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
  console.log(`  - Target: All owned test workspaces`);
  console.log();

  if (options.dryRun) {
    console.log('DRY RUN MODE - No workspaces will be deleted\n');
  }

  try {
    // Initialize Smartsheet client
    const client = smartsheet.createClient({ accessToken: process.env.SMARTSHEET_API_TOKEN });

    console.log('Scanning for old test workspaces...\n');

    // Get ALL workspaces with token-based pagination
    let allWorkspaces: any[] = [];
    let lastKey: string | undefined = undefined;
    
    do {
      const queryParams: any = {
        paginationType: 'token'
      };
      if (lastKey) {
        queryParams.lastKey = lastKey;
      }
      
      const response = await client.workspaces?.listWorkspaces?.({
        queryParameters: queryParams,
      });

      const workspacesInPage = response?.data || [];
      allWorkspaces = allWorkspaces.concat(workspacesInPage);
      
      // Check for next page using lastKey
      lastKey = response?.lastKey;
    } while (lastKey);
    
    const cutoffTime = Date.now() - options.olderThanHours * 60 * 60 * 1000;

    console.log(`Found ${allWorkspaces.length} total workspace(s)`);

    // Filter to only workspaces where user is OWNER
    const ownedWorkspaces = allWorkspaces.filter((ws: any) => ws.accessLevel === 'OWNER');
    console.log(`  - ${ownedWorkspaces.length} owned by you\n`);

    if (ownedWorkspaces.length === 0) {
      console.log('No owned workspaces to check.');
      return;
    }

    console.log('Fetching detailed workspace info to check creation dates...');

    // Fetch detailed info for each owned workspace to get createdAt timestamp
    const recentWorkspaces: any[] = [];
    for (const ws of ownedWorkspaces) {
      try {
        const workspaceInfo = await client.workspaces?.getWorkspaceMetadata?.({
          workspaceId: ws.id,
        });

        const createdAt = workspaceInfo?.createdAt;
        if (createdAt) {
          const createdDate = new Date(createdAt);
          // Check if workspace was created WITHIN the last N hours (newer than cutoff)
          if (createdDate.getTime() > cutoffTime) {
            recentWorkspaces.push({
              ...ws,
              createdAt: createdDate,
            });
          }
        }
      } catch (error) {
        console.warn(`  - Warning: Could not fetch info for workspace ${ws.name}:`, error);
      }
    }

    console.log(`  - ${recentWorkspaces.length} created within last ${options.olderThanHours} hour(s)\n`);

    // In dry run mode, just list workspaces
    if (options.dryRun) {
      console.log('Would delete workspaces matching:');
      console.log(`  - All owned workspaces (no prefix filter)`);
      console.log(`  - Created after: ${new Date(cutoffTime).toISOString()}`);
      console.log(`\nFound ${recentWorkspaces.length} workspace(s) to delete:`);
      recentWorkspaces.forEach((ws: any) => console.log(`  - ${ws.name}`));
      console.log();
      console.log('Run without --dry-run to perform actual deletion');
    } else {
      // Show DANGER warning before actual deletion
      if (recentWorkspaces.length === 0) {
        console.log('✓ No workspaces found matching criteria. Nothing to delete.');
      } else {
        console.log(
          '\x1b[41m\x1b[37m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════════'
        );
        console.log(
          '\x1b[41m\x1b[37m%s\x1b[0m',
          '███████████████████████  ⚠️  DANGER WARNING  ⚠️  ████████████████████████'
        );
        console.log(
          '\x1b[41m\x1b[37m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════════'
        );
        console.log('\x1b[31m%s\x1b[0m', '');
        console.log(
          '\x1b[31m%s\x1b[0m',
          `  ⚠️  THIS WILL PERMANENTLY DELETE ${recentWorkspaces.length} WORKSPACE(S) ⚠️`
        );
        console.log('\x1b[31m%s\x1b[0m', '  ⚠️  THIS ACTION CANNOT BE UNDONE ⚠️');
        console.log('\x1b[31m%s\x1b[0m', '');
        console.log('\x1b[33m%s\x1b[0m', 'Workspaces to be deleted:');
        recentWorkspaces.forEach((ws: any) => console.log(`\x1b[33m  - ${ws.name}\x1b[0m`));
        console.log('\x1b[31m%s\x1b[0m', '');
        console.log(
          '\x1b[41m\x1b[37m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════════'
        );
        console.log('');

        const confirmed = await confirmDeletion();
        if (!confirmed) {
          console.log('\x1b[32m%s\x1b[0m', '✓ Deletion cancelled. No workspaces were deleted.');
          return;
        }

        console.log('\nProceeding with deletion...\n');

        // Delete each workspace directly (don't use helper function with wrong logic)
        let deletedCount = 0;
        for (const ws of recentWorkspaces) {
          try {
            await client.workspaces?.deleteWorkspace?.({ workspaceId: ws.id });
            console.log(`  ✓ Deleted: ${ws.name}`);
            deletedCount++;
          } catch (error) {
            console.error(`  ✗ Failed to delete ${ws.name}:`, error);
          }
        }

        console.log(`\n\x1b[32m✓ Deleted ${deletedCount} recent test workspace(s)\x1b[0m`);
      }
    }
  } catch (error) {
    console.error('\nERROR during cleanup:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function confirmDeletion(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      '\x1b[1m\x1b[31mAre you ABSOLUTELY SURE you want to delete these workspaces? (yes/no): \x1b[0m',
      (answer) => {
        rl.close();
        const confirmed = answer.toLowerCase().trim() === 'yes';
        resolve(confirmed);
      }
    );
  });
}

function printHelp() {
  console.log(`
Test Workspace Cleanup Script

Usage:
  npm run cleanup-test-workspaces [options]
  ts-node scripts/cleanup-test-workspaces.ts [options]

Options:
  --hours <number>    Delete workspaces older than N hours (default: 1)
  --dry-run          Show what would be deleted without actually deleting
  --help             Show this help message

Examples:
  # Delete workspaces older than 1 hour (default)
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
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
