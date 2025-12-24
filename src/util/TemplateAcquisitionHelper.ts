/**
 * Template Acquisition Helper
 *
 * Guides users through acquiring a template workspace via Smartsheet distribution link
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetWorkspace } from '../types/Smartsheet';
import { Logger } from './Logger';
import { tryWith as withBackoff } from './ExponentialBackoff';

export interface TemplateAcquisitionResult {
  success: boolean;
  workspaceId?: number;
  workspaceName?: string;
  cancelled?: boolean;
  error?: string;
}

export class TemplateAcquisitionHelper {
  private static readonly POLLING_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_POLLING_ATTEMPTS = 10; // 5 minutes total (10 * 30s)

  /**
   * Guide user through template acquisition via distribution link
   * @param client - Smartsheet client for API calls
   * @param distributionUrl - Distribution link URL
   * @param expectedWorkspaceName - Name of workspace created by distribution
   * @param logger - Optional logger for debug output
   * @returns Promise with acquisition result
   */
  static async acquireTemplate(
    client: SmartsheetClient,
    distributionUrl: string,
    expectedWorkspaceName: string,
    logger?: Logger
  ): Promise<TemplateAcquisitionResult> {
    try {
      // Display instructions with distribution URL
      this.displayInstructions(distributionUrl);

      // Poll for workspace creation
      console.log(
        `\nWaiting for template acquisition... (checking every 30 seconds for up to 5 minutes)`
      );
      console.log('');

      const workspaceId = await this.pollForWorkspace(client, expectedWorkspaceName, logger);

      if (workspaceId) {
        console.log(`\n✓ Found workspace! ID: ${workspaceId}\n`);
        return {
          success: true,
          workspaceId,
          workspaceName: expectedWorkspaceName,
        };
      } else {
        // Workspace not found after polling timeout
        console.log(`\n⚠ Workspace "${expectedWorkspaceName}" not found after 5 minutes\n`);
        console.log('Troubleshooting:');
        console.log('  1. Verify you accepted/saved the template in Smartsheet');
        console.log('  2. Check you are logged into the correct Smartsheet account');
        console.log('  3. The workspace should appear in your Smartsheet home page\n');

        return {
          success: false,
          error: `Workspace "${expectedWorkspaceName}" not found after polling timeout`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error(`Template acquisition error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Poll for workspace creation by checking every 30 seconds
   * @param client - Smartsheet client
   * @param workspaceName - Name of workspace to find
   * @param logger - Optional logger
   * @returns Workspace ID if found, null if timeout
   */
  private static async pollForWorkspace(
    client: SmartsheetClient,
    workspaceName: string,
    logger?: Logger
  ): Promise<number | null> {
    for (let attempt = 1; attempt <= this.MAX_POLLING_ATTEMPTS; attempt++) {
      logger?.debug(`Polling attempt ${attempt}/${this.MAX_POLLING_ATTEMPTS}`);

      const workspaceId = await this.findWorkspaceByName(client, workspaceName, logger);

      if (workspaceId) {
        return workspaceId;
      }

      if (attempt < this.MAX_POLLING_ATTEMPTS) {
        const remainingTime =
          (this.MAX_POLLING_ATTEMPTS - attempt) * (this.POLLING_INTERVAL_MS / 1000);
        console.log(
          `Attempt ${attempt}/${this.MAX_POLLING_ATTEMPTS}: Workspace not found yet. ` +
            `Checking again in 30 seconds... (${Math.floor(remainingTime / 60)}m remaining)`
        );

        // Wait before next poll
        await this.sleep(this.POLLING_INTERVAL_MS);
      }
    }

    return null;
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Find workspace by name using Smartsheet API
   * @param client - Smartsheet client
   * @param workspaceName - Name of workspace to find
   * @param logger - Optional logger
   * @returns Workspace ID if found, null otherwise
   */
  private static async findWorkspaceByName(
    client: SmartsheetClient,
    workspaceName: string,
    logger?: Logger
  ): Promise<number | null> {
    try {
      if (!client.workspaces?.listWorkspaces) {
        throw new Error('Smartsheet client does not support listWorkspaces');
      }

      const listWorkspaces = client.workspaces.listWorkspaces;

      // Use exponential backoff for API resilience
      const response = await withBackoff(
        () =>
          listWorkspaces({
            queryParameters: { paginationType: 'token' },
          }),
        undefined,
        undefined,
        logger
      );

      const workspaces: SmartsheetWorkspace[] = response.data || response.result || [];
      logger?.debug(`Found ${workspaces.length} workspaces`);

      // Search for exact name match
      const matches = workspaces.filter((ws) => ws.name === workspaceName);

      if (matches.length === 0) {
        logger?.debug(`No workspace found with name: ${workspaceName}`);
        return null;
      }

      if (matches.length === 1) {
        logger?.debug(`Found single workspace: ${matches[0].name} (ID: ${matches[0].id})`);
        return matches[0].id!;
      }

      // Multiple matches - use most recently created
      // Sort by ID (higher IDs are typically newer)
      matches.sort((a, b) => (b.id || 0) - (a.id || 0));
      const selected = matches[0];

      logger?.info(
        `Found ${matches.length} workspaces named "${workspaceName}". ` +
          `Using most recent (ID: ${selected.id})`
      );

      return selected.id!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error(`Failed to search for workspace: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Display user instructions for template acquisition
   * Uses same format as Device Code Flow for consistency
   */
  private static displayInstructions(distributionUrl: string): void {
    console.log('\n' + '='.repeat(60));
    console.log('Template Workspace Setup Required');
    console.log('='.repeat(60));
    console.log('\nTo ensure your Project Online workspaces have the proper structure,');
    console.log('please acquire the recommended template workspace.');
    console.log('\n' + '─'.repeat(60));
    console.log('\n1. Open your browser and go to:');
    console.log(`   ${this.colorize(distributionUrl, 'cyan')}`);
    console.log('\n2. Log in to Smartsheet:');
    console.log('   • Use the SAME account associated with your SMARTSHEET_API_TOKEN');
    console.log('   • This is critical - mismatched accounts will cause template not found');
    console.log('\n3. Accept the template:');
    console.log('   • Review the "Project Online Migration" template');
    console.log('   • Click to save/accept it to your Smartsheet account');
    console.log('\n' + '─'.repeat(60));
    console.log('\nWaiting for template acquisition...');
    console.log('');
  }

  /**
   * Colorize text for terminal output (matches DeviceCodeDisplay format)
   */
  private static colorize(
    text: string,
    color: 'cyan' | 'yellow' | 'green' | 'red',
    bold: boolean = false
  ): string {
    const colors = {
      cyan: '\x1b[36m',
      yellow: '\x1b[33m',
      green: '\x1b[32m',
      red: '\x1b[31m',
    };

    const reset = '\x1b[0m';
    const boldCode = bold ? '\x1b[1m' : '';

    return `${boldCode}${colors[color]}${text}${reset}`;
  }
}
