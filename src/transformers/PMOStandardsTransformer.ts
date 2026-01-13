/**
 * PMO Standards transformer - creates centralized PMO Standards workspace
 * and reference sheets that source picklist options for project sheets
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetSheet, SmartsheetRow } from '../types/Smartsheet';
import { Logger } from '../util/Logger';
import { WorkspaceFactoryProvider } from '../factories';
import type { ReferenceSheetInfo, PMOStandardsWorkspaceInfo } from '../factories/WorkspaceFactory';
import { tryWith as withBackoff } from '../util/ExponentialBackoff';

// Re-export types from factory interface for backward compatibility
export type { ReferenceSheetInfo, PMOStandardsWorkspaceInfo };

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
 * Create or get existing PMO Standards workspace with all standard reference sheets
 * This workspace is shared across all project migrations
 *
 * @deprecated Use WorkspaceFactory.createStandardsWorkspace() instead
 * @param client - Smartsheet client
 * @param existingWorkspaceId - Optional workspace ID to use instead of creating new
 * @param logger - Optional logger for debug output
 */
export async function createPMOStandardsWorkspace(
  client: SmartsheetClient,
  existingWorkspaceId?: number,
  logger?: Logger
) {
  // Delegate to factory implementation
  const factory = WorkspaceFactoryProvider.getFactory();
  return factory.createStandardsWorkspace(client, existingWorkspaceId, logger);
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

    // Get existing rows to check which values are already present - wrap with retry for eventual consistency
    if (!client.sheets?.getSheet) {
      throw new Error('SmartsheetClient does not support getSheet');
    }
    const getSheet = client.sheets.getSheet;
    const existingSheet2 = await withBackoff(() => getSheet({ id: existingSheet.id! }));
    const existingValues = new Set<string>();
    if (existingSheet2?.rows) {
      for (const row of existingSheet2.rows) {
        const nameCell = row.cells?.find((c) => c.columnId === nameColumn.id);
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

      if (!client.sheets?.addRows) {
        throw new Error('SmartsheetClient does not support addRows');
      }
      const addRows = client.sheets.addRows;
      await withBackoff(() =>
        addRows({
          sheetId: existingSheet.id!,
          body: rows,
        })
      );
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

  if (!client.sheets?.createSheetInWorkspace) {
    throw new Error('SmartsheetClient does not support createSheetInWorkspace');
  }
  const createSheetInWorkspace = client.sheets.createSheetInWorkspace;
  const createSheetResponse = await withBackoff(() =>
    createSheetInWorkspace({
      workspaceId,
      body: sheet,
    })
  );
  const createdSheet = createSheetResponse.data || createSheetResponse.result;
  if (!createdSheet) {
    throw new Error(`Failed to create sheet: ${sheetName}`);
  }
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

  if (!client.sheets?.addRows) {
    throw new Error('SmartsheetClient does not support addRows');
  }
  const addRows = client.sheets.addRows;
  await withBackoff(() =>
    addRows({
      sheetId: createdSheet.id!,
      body: rows,
    })
  );

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
  // Wrap with retry for eventual consistency
  if (!client.workspaces?.getWorkspaceChildren) {
    throw new Error('SmartsheetClient does not support getWorkspaceChildren');
  }

  const getWorkspaceChildren = client.workspaces.getWorkspaceChildren;
  const childrenResponse = await withBackoff(() =>
    getWorkspaceChildren({
      workspaceId,
      queryParameters: { includeAll: true },
    })
  );
  const children = childrenResponse?.data || [];

  // Filter for sheets and find by name
  const sheets = children.filter((item) => item.resourceType === 'sheet');
  const sheet = sheets.find((s) => s.name === sheetName);

  return sheet as SmartsheetSheet | undefined;
}
