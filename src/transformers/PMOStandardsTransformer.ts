/**
 * PMO Standards transformer - creates centralized PMO Standards workspace
 * and reference sheets that source picklist options for project sheets
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetSheet, SmartsheetRow } from '../types/Smartsheet';
import { Logger } from '../util/Logger';

/**
 * Standard reference sheets with predefined values
 * These are created at CLI startup before any project migrations
 */
export const STANDARD_REFERENCE_SHEETS: Record<string, string[]> = {
  'Project - Status': ['Active', 'Planning', 'Completed', 'On Hold', 'Cancelled'],
  'Project - Priority': ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'],
  'Task - Status': ['Not Started', 'In Progress', 'Complete'],
  'Task - Priority': ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'],
  'Task - Constraint Type': ['ASAP', 'ALAP', 'SNET', 'SNLT', 'FNET', 'FNLT', 'MSO', 'MFO'],
  'Resource - Type': ['Work', 'Material', 'Cost'],
};

/**
 * Reference sheet metadata returned after creation
 */
export interface ReferenceSheetInfo {
  sheetId: number;
  sheetName: string;
  columnId: number;
  type: 'standard' | 'discovered';
  values: string[];
}

/**
 * PMO Standards workspace metadata
 */
export interface PMOStandardsWorkspaceInfo {
  workspaceId: number;
  workspaceName: string;
  permalink: string;
  referenceSheets: Record<string, ReferenceSheetInfo>;
}

/**
 * Create or get existing PMO Standards workspace with all standard reference sheets
 * This workspace is shared across all project migrations
 *
 * @param client - Smartsheet client
 * @param existingWorkspaceId - Optional workspace ID to use instead of creating new
 * @param logger - Optional logger for debug output
 */
export async function createPMOStandardsWorkspace(
  client: SmartsheetClient,
  existingWorkspaceId?: number,
  logger?: Logger
): Promise<PMOStandardsWorkspaceInfo> {
  let workspace;

  if (existingWorkspaceId) {
    // Use existing workspace
    logger?.debug(`Using existing PMO Standards workspace ID: ${existingWorkspaceId}`);
    if (!client.workspaces?.getWorkspace) {
      throw new Error('SmartsheetClient does not support getWorkspace');
    }
    const workspaceResponse = await client.workspaces.getWorkspace({
      workspaceId: existingWorkspaceId,
    });
    workspace = workspaceResponse.data || workspaceResponse.result;
    if (!workspace) {
      throw new Error(`Workspace ${existingWorkspaceId} not found`);
    }
  } else {
    // Create new workspace
    logger?.debug(`Creating new PMO Standards workspace`);
    if (!client.createWorkspace) {
      throw new Error('SmartsheetClient does not support createWorkspace');
    }
    workspace = await client.createWorkspace({
      name: 'PMO Standards',
    });
  }

  // Ensure all standard reference sheets exist (create if missing, reuse if existing)
  const referenceSheets: Record<string, ReferenceSheetInfo> = {};

  for (const [sheetName, values] of Object.entries(STANDARD_REFERENCE_SHEETS)) {
    const sheetInfo = await ensureStandardReferenceSheet(
      client,
      workspace.id!,
      sheetName,
      values,
      logger
    );
    referenceSheets[sheetName] = sheetInfo;
  }

  return {
    workspaceId: workspace.id!,
    workspaceName: workspace.name,
    permalink: workspace.permalink || '',
    referenceSheets,
  };
}

/**
 * Create or verify a standard reference sheet with predefined values
 * Idempotent: checks if sheet exists by name, checks if values exist before adding
 */
export async function ensureStandardReferenceSheet(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string,
  predefinedValues: string[],
  logger?: Logger
): Promise<ReferenceSheetInfo> {
  // Check if sheet already exists in workspace
  const existingSheet = await findSheetInWorkspace(client, workspaceId, sheetName);

  if (existingSheet) {
    logger?.debug(`Found existing PMO Standards sheet: ${sheetName} (ID: ${existingSheet.id})`);

    // Find the Name column (should be primary column)
    const nameColumn = existingSheet.columns?.find((c) => c.title === 'Name' || c.primary);
    if (!nameColumn?.id) {
      throw new Error(`Name column not found in existing sheet: ${sheetName}`);
    }

    // Get existing rows to check which values are already present
    const existingSheet2Response = await client.sheets?.getSheet?.({ sheetId: existingSheet.id! });
    const existingSheet2 = existingSheet2Response?.data || existingSheet2Response?.result;
    const existingValues = new Set<string>();
    if (existingSheet2?.rows) {
      for (const row of existingSheet2.rows) {
        const nameCell = row.cells?.find((c: any) => c.columnId === nameColumn.id);
        if (nameCell?.value) {
          existingValues.add(String(nameCell.value));
        }
      }
    }

    // Add missing values
    const missingValues = predefinedValues.filter((v) => !existingValues.has(v));
    if (missingValues.length > 0) {
      logger?.debug(
        `Adding ${missingValues.length} missing values to ${sheetName}: ${missingValues.join(', ')}`
      );
      const rows: SmartsheetRow[] = missingValues.map((value) => ({
        toBottom: true,
        cells: [
          {
            columnId: nameColumn.id!,
            value,
          },
        ],
      }));

      if (!client.addRows) {
        throw new Error('SmartsheetClient does not support addRows');
      }
      await client.addRows(existingSheet.id!, rows);
    } else {
      logger?.debug(`All ${predefinedValues.length} values already present in ${sheetName}`);
    }

    return {
      sheetId: existingSheet.id!,
      sheetName: existingSheet.name,
      columnId: nameColumn.id,
      type: 'standard',
      values: predefinedValues,
    };
  }

  // Sheet doesn't exist, create it
  logger?.debug(
    `Creating new PMO Standards sheet: ${sheetName} with ${predefinedValues.length} values`
  );
  const sheet: SmartsheetSheet = {
    name: sheetName,
    columns: [
      {
        title: 'Name',
        type: 'TEXT_NUMBER',
        primary: true,
      },
    ],
  };

  if (!client.createSheetInWorkspace) {
    throw new Error('SmartsheetClient does not support createSheetInWorkspace');
  }
  const createdSheet = await client.createSheetInWorkspace(workspaceId, sheet);
  const nameColumnId = createdSheet.columns![0].id!;

  // Add all predefined values as rows
  const rows: SmartsheetRow[] = predefinedValues.map((value) => ({
    toBottom: true,
    cells: [
      {
        columnId: nameColumnId,
        value,
      },
    ],
  }));

  if (!client.addRows) {
    throw new Error('SmartsheetClient does not support addRows');
  }
  await client.addRows(createdSheet.id!, rows);

  return {
    sheetId: createdSheet.id!,
    sheetName: createdSheet.name,
    columnId: nameColumnId,
    type: 'standard',
    values: predefinedValues,
  };
}

/**
 * Find a sheet in a workspace by name
 */
async function findSheetInWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string
): Promise<SmartsheetSheet | undefined> {
  // Use getWorkspaceChildren to get sheets (getWorkspace is deprecated and doesn't include sheets in response)
  if (!client.workspaces?.getWorkspaceChildren) {
    throw new Error('SmartsheetClient does not support getWorkspaceChildren');
  }

  const childrenResponse = await client.workspaces.getWorkspaceChildren({
    workspaceId,
    queryParameters: { includeAll: true },
  });
  const children = childrenResponse?.data || [];

  // Filter for sheets and find by name
  const sheets = children.filter((item: any) => item.resourceType === 'sheet');
  const sheet = sheets.find((s: any) => s.name === sheetName);

  return sheet as SmartsheetSheet | undefined;
}
