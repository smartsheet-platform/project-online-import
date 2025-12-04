/**
 * Smartsheet integration test helpers
 * Handles workspace creation, cleanup, and verification using the real Smartsheet SDK
 */

import { SmartsheetClient, WorkspaceChildrenData } from '../../../src/types/SmartsheetClient';
import { SmartsheetWorkspace } from '../../../src/types/Smartsheet';

export interface TestWorkspaceConfig {
  prefix: string;
  cleanupOnSuccess: boolean;
  cleanupOnFailure: boolean;
}

export interface TestWorkspace {
  id: number;
  name: string;
  permalink: string;
  createdAt: Date;
}

export interface TestSheet {
  id: number;
  name: string;
  permalink: string;
}

/**
 * Default configuration from environment variables
 */
export function getDefaultConfig(): TestWorkspaceConfig {
  return {
    prefix: process.env.TEST_WORKSPACE_PREFIX || 'ETL Test -',
    cleanupOnSuccess: process.env.CLEANUP_TEST_WORKSPACES !== 'false',
    cleanupOnFailure: process.env.CLEANUP_TEST_WORKSPACES_ON_FAILURE === 'true',
  };
}

/**
 * Create a test workspace with a unique name
 * Smartsheet workspace names are limited to 50 characters
 */
export async function createTestWorkspace(
  client: SmartsheetClient,
  testName: string,
  config: TestWorkspaceConfig = getDefaultConfig()
): Promise<TestWorkspace> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Smartsheet workspace name limit is 50 characters
  const maxNameLength = 50;
  const prefixLength = config.prefix.length;
  const timestampLength = timestamp.length + 1; // +1 for space before timestamp
  const maxTestNameLength = maxNameLength - prefixLength - timestampLength;

  let truncatedTestName = testName;
  if (testName.length > maxTestNameLength) {
    // Truncate and add ellipsis, ensuring we stay within limit
    truncatedTestName = testName.substring(0, maxTestNameLength - 3) + '...';
  }

  const workspaceName = `${config.prefix}${truncatedTestName} ${timestamp}`;

  try {
    const response = await client.workspaces?.createWorkspace?.({
      body: {
        name: workspaceName,
      },
    });

    // Smartsheet SDK can return data in either .result or .data depending on the operation
    // Workspace creation typically returns in .data
    const workspaceData = response?.result || response?.data;

    if (!workspaceData || !workspaceData.id) {
      throw new Error('Failed to create workspace - no ID returned');
    }

    return {
      id: workspaceData.id!,
      name: workspaceData.name!,
      permalink: workspaceData.permalink!,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Workspace creation error:', error);
    throw new Error(
      `Failed to create test workspace: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Delete a test workspace
 */
export async function deleteTestWorkspace(
  client: SmartsheetClient,
  workspaceId: number
): Promise<void> {
  try {
    await client.workspaces?.deleteWorkspace?.({
      workspaceId,
    });
  } catch (error) {
    console.warn(`Failed to delete workspace ${workspaceId}:`, error);
    // Don't throw - cleanup is best effort
  }
}

/**
 * Find and cleanup old test workspaces
 * Note: This deletes workspaces OLDER than the specified hours (opposite of the main cleanup script)
 */
export async function cleanupOldTestWorkspaces(
  client: SmartsheetClient,
  olderThanHours: number = 24,
  config: TestWorkspaceConfig = getDefaultConfig()
): Promise<number> {
  try {
    // Get ALL workspaces with token-based pagination
    let allWorkspaces: SmartsheetWorkspace[] = [];
    let lastKey: string | undefined = undefined;

    do {
      const queryParams: Record<string, unknown> = {
        paginationType: 'token',
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

    // Filter to only owned workspaces with matching prefix
    const ownedWorkspaces = allWorkspaces.filter(
      (ws) => ws.accessLevel === 'OWNER' && (!config.prefix || ws.name?.startsWith(config.prefix))
    );

    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let deletedCount = 0;

    // Fetch detailed info for each owned workspace to get createdAt timestamp
    for (const workspace of ownedWorkspaces) {
      try {
        const workspaceInfo = await client.workspaces?.getWorkspaceMetadata?.({
          workspaceId: workspace.id,
        });

        const createdAt = workspaceInfo?.createdAt;
        if (createdAt) {
          const createdDate = new Date(createdAt);
          // Delete if created BEFORE cutoff time (older than N hours)
          if (createdDate.getTime() < cutoffTime) {
            await deleteTestWorkspace(client, workspace.id!);
            deletedCount++;
          }
        }
      } catch (error) {
        console.warn(`Could not fetch/delete workspace ${workspace.name}:`, error);
      }
    }

    return deletedCount;
  } catch (error) {
    console.warn('Failed to cleanup old workspaces:', error);
    return 0;
  }
}

/**
 * Get a sheet from a workspace by name
 */
export async function getSheetFromWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string
): Promise<TestSheet | null> {
  try {
    // Use non-deprecated API: getWorkspaceChildren instead of getWorkspace
    const response = await client.workspaces?.getWorkspaceChildren?.({
      workspaceId,
      queryParameters: { includeAll: true },
    });

    // Smartsheet SDK can return data in either .result or .data depending on the operation
    // Unwrap response first, then access the children list
    const responseData = response?.result || response?.data || response;
    // responseData could be the array directly, or an object containing .data
    const items: WorkspaceChildrenData[] = Array.isArray(responseData)
      ? responseData
      : responseData?.data || [];
    const sheets = items.filter((item) => item.resourceType === 'sheet');
    const sheet = sheets.find((s) => s.name === sheetName);

    if (!sheet) {
      return null;
    }

    return {
      id: sheet.id!,
      name: sheet.name!,
      permalink: (sheet.permalink as string) || '',
    };
  } catch (error) {
    throw new Error(
      `Failed to get sheet from workspace: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Get all sheets from a workspace
 */
export async function getAllSheetsFromWorkspace(
  client: SmartsheetClient,
  workspaceId: number
): Promise<TestSheet[]> {
  try {
    // Use non-deprecated API: getWorkspaceChildren instead of getWorkspace
    const response = await client.workspaces?.getWorkspaceChildren?.({
      workspaceId,
      queryParameters: { includeAll: true },
    });

    // Smartsheet SDK can return data in either .result or .data depending on the operation
    // Unwrap response first, then access the children list
    const responseData = response?.result || response?.data || response;
    // responseData could be the array directly, or an object containing .data
    const items: WorkspaceChildrenData[] = Array.isArray(responseData)
      ? responseData
      : responseData?.data || [];
    const sheets = items.filter((item) => item.resourceType === 'sheet');

    return sheets.map((sheet) => ({
      id: sheet.id!,
      name: sheet.name!,
      permalink: (sheet.permalink as string) || '',
    }));
  } catch (error) {
    throw new Error(
      `Failed to get sheets from workspace: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Verify workspace structure matches expected
 */
export async function verifyWorkspaceStructure(
  client: SmartsheetClient,
  workspaceId: number,
  expectedSheetNames: string[]
): Promise<{ success: boolean; missing: string[]; extra: string[] }> {
  const sheets = await getAllSheetsFromWorkspace(client, workspaceId);
  const actualNames = sheets.map((s) => s.name);

  const missing = expectedSheetNames.filter((name) => !actualNames.includes(name));
  const extra = actualNames.filter((name) => !expectedSheetNames.includes(name));

  return {
    success: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}

/**
 * Get full sheet details including columns and rows
 */
export async function getSheetDetails(client: SmartsheetClient, sheetId: number) {
  try {
    const response = await client.sheets?.getSheet?.({
      id: sheetId,
      queryParameters: {
        level: 2, // Include all row data including parent-child relationships
      },
    });

    // Unwrap the API response to get the actual sheet
    return response;
  } catch (error) {
    throw new Error(
      `Failed to get sheet details: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Verify sheet column structure
 */
export async function verifySheetColumns(
  client: SmartsheetClient,
  sheetId: number,
  expectedColumns: Array<{ title: string; type: string }>
): Promise<{
  success: boolean;
  missing: string[];
  typeMismatches: Array<{ title: string; expected: string; actual: string }>;
}> {
  const sheet = await getSheetDetails(client, sheetId);
  const columns = sheet?.columns || [];

  const missing: string[] = [];
  const typeMismatches: Array<{ title: string; expected: string; actual: string }> = [];

  for (const expected of expectedColumns) {
    const actual = columns.find((c) => c.title === expected.title);
    if (!actual) {
      missing.push(expected.title);
    } else if (actual.type !== expected.type) {
      typeMismatches.push({
        title: expected.title,
        expected: expected.type,
        actual: actual.type!,
      });
    }
  }

  return {
    success: missing.length === 0 && typeMismatches.length === 0,
    missing,
    typeMismatches,
  };
}

/**
 * Verify sheet row count
 */
export async function verifySheetRowCount(
  client: SmartsheetClient,
  sheetId: number,
  expectedCount: number,
  tolerance: number = 0
): Promise<{ success: boolean; expected: number; actual: number }> {
  const sheet = await getSheetDetails(client, sheetId);
  const actualCount = sheet?.rows?.length || 0;

  return {
    success: Math.abs(actualCount - expectedCount) <= tolerance,
    expected: expectedCount,
    actual: actualCount,
  };
}

/**
 * Create a test workspace manager for use in tests
 */
export class TestWorkspaceManager {
  private workspaces: TestWorkspace[] = [];
  private config: TestWorkspaceConfig;
  public client: SmartsheetClient;

  constructor(client: SmartsheetClient, config?: Partial<TestWorkspaceConfig>) {
    this.client = client;
    this.config = { ...getDefaultConfig(), ...config };
  }

  async createWorkspace(testName: string): Promise<TestWorkspace> {
    const workspace = await createTestWorkspace(this.client, testName, this.config);
    this.workspaces.push(workspace);
    return workspace;
  }

  /**
   * Track an existing workspace for cleanup (e.g., workspace created by importer)
   */
  trackWorkspace(workspaceId: number, workspaceName?: string): void {
    // Check if already tracked
    if (!this.workspaces.find((ws) => ws.id === workspaceId)) {
      this.workspaces.push({
        id: workspaceId,
        name: workspaceName || `Workspace ${workspaceId}`,
        permalink: '',
        createdAt: new Date(),
      });
    }
  }

  async cleanup(testPassed: boolean = true): Promise<void> {
    const shouldCleanup = testPassed ? this.config.cleanupOnSuccess : this.config.cleanupOnFailure;

    if (!shouldCleanup) {
      console.log('Skipping workspace cleanup (preserving for inspection)');
      this.workspaces.forEach((ws) => {
        console.log(`  - ${ws.name}: ${ws.permalink}`);
      });
      return;
    }

    for (const workspace of this.workspaces) {
      await deleteTestWorkspace(this.client, workspace.id);
    }
    this.workspaces = [];
  }

  getWorkspaces(): TestWorkspace[] {
    return [...this.workspaces];
  }
}
