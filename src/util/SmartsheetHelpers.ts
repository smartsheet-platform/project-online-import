/**
 * Smartsheet Helper Utilities
 *
 * Provides resiliency helpers for re-run scenarios:
 * - Check if sheet exists before creation
 * - Check if column exists before adding
 * - Get or create sheet operations
 * - Get or add column operations
 */

import { SmartsheetClient, WorkspaceChildrenData } from '../types/SmartsheetClient';
import { SmartsheetSheet, SmartsheetColumn, SmartsheetRow } from '../types/Smartsheet';

/**
 * Check if a sheet exists in a workspace by name
 *
 * @param client - Smartsheet client
 * @param workspaceId - Workspace ID
 * @param sheetName - Sheet name to look for
 * @returns Sheet if found, null otherwise
 */
export async function findSheetInWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string
): Promise<{ id: number; name: string } | null> {
  try {
    // Use getWorkspaceChildren to list sheets in workspace
    const response = await client.workspaces?.getWorkspaceChildren?.({
      workspaceId,
      queryParameters: { includeAll: true },
    });

    // Filter for sheets with matching name
    const items: WorkspaceChildrenData[] = response?.data || [];
    const sheets = items.filter((item) => item.resourceType === 'sheet');
    const sheet = sheets.find((s) => s.name === sheetName);

    if (!sheet) {
      return null;
    }

    return {
      id: sheet.id!,
      name: sheet.name!,
    };
  } catch (error) {
    throw new Error(
      `Failed to search for sheet in workspace: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Get or create a sheet in a workspace
 *
 * If a sheet with the given name already exists, returns the existing sheet.
 * Otherwise, creates a new sheet with the provided configuration.
 *
 * @param client - Smartsheet client
 * @param workspaceId - Workspace ID
 * @param sheetConfig - Sheet configuration for creation
 * @returns Existing or newly created sheet
 */
export async function getOrCreateSheet(
  client: SmartsheetClient,
  workspaceId: number,
  sheetConfig: { name: string; columns: SmartsheetColumn[] }
): Promise<SmartsheetSheet> {
  // Check if sheet already exists
  const existingSheet = await findSheetInWorkspace(client, workspaceId, sheetConfig.name);

  if (existingSheet) {
    // Sheet exists - fetch full details
    const sheetResponse = await client.sheets?.getSheet?.({
      id: existingSheet.id,
    });
    const fullSheet = sheetResponse?.result || sheetResponse?.data;

    return {
      id: existingSheet.id,
      name: existingSheet.name,
      columns: fullSheet?.columns || [],
      rows: fullSheet?.rows || [],
    };
  }

  // Sheet doesn't exist - create it
  const createResponse = await client.sheets?.createSheetInWorkspace?.({
    workspaceId,
    body: sheetConfig,
  });

  const createdSheet = createResponse?.result || createResponse?.data;

  if (!createdSheet) {
    throw new Error(`Failed to create sheet: ${sheetConfig.name}`);
  }

  return createdSheet;
}

/**
 * Check if a column exists in a sheet by title
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @param columnTitle - Column title to look for
 * @returns Column if found, null otherwise
 */
export async function findColumnInSheet(
  client: SmartsheetClient,
  sheetId: number,
  columnTitle: string
): Promise<{ id: number; title: string; type: string } | null> {
  try {
    // Get sheet with columns
    const sheetResponse = await client.sheets?.getSheet?.({
      id: sheetId,
    });

    const sheet = sheetResponse?.result || sheetResponse?.data;
    const columns = sheet?.columns || [];

    // Find column by title
    const column = columns.find((col: SmartsheetColumn) => col.title === columnTitle);

    if (!column) {
      return null;
    }

    return {
      id: column.id!,
      title: column.title!,
      type: column.type!,
    };
  } catch (error) {
    throw new Error(
      `Failed to search for column in sheet: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Get or add a column to a sheet
 *
 * If a column with the given title already exists, returns the existing column.
 * Otherwise, adds a new column with the provided configuration.
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @param columnConfig - Column configuration for adding
 * @returns Existing or newly added column
 */
export async function getOrAddColumn(
  client: SmartsheetClient,
  sheetId: number,
  columnConfig: SmartsheetColumn & { index?: number }
): Promise<{ id: number; title: string; type: string }> {
  if (!columnConfig.title) {
    throw new Error('Column title is required');
  }

  // Check if column already exists
  const existingColumn = await findColumnInSheet(client, sheetId, columnConfig.title);

  if (existingColumn) {
    // Column exists - return it
    return existingColumn;
  }

  // Column doesn't exist - add it
  const addResponse = await client.sheets?.addColumn?.({
    sheetId,
    body: columnConfig,
  });

  const addedColumn = addResponse?.result || addResponse?.data;

  if (!addedColumn?.id || !addedColumn?.title) {
    throw new Error(`Failed to add column: ${columnConfig.title}`);
  }

  return {
    id: addedColumn.id,
    title: addedColumn.title,
    type: addedColumn.type || columnConfig.type || 'TEXT_NUMBER',
  };
}

/**
 * Get all columns from a sheet as a map of title -> column info
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @returns Map of column title to column info
 */
export async function getColumnMap(
  client: SmartsheetClient,
  sheetId: number
): Promise<Record<string, { id: number; type: string }>> {
  const sheetResponse = await client.sheets?.getSheet?.({
    id: sheetId,
  });

  const sheet = sheetResponse?.result || sheetResponse?.data;
  const columns = sheet?.columns || [];

  const columnMap: Record<string, { id: number; type: string }> = {};

  for (const col of columns) {
    if (col.title && col.id) {
      columnMap[col.title] = {
        id: col.id,
        type: col.type || 'TEXT_NUMBER',
      };
    }
  }

  return columnMap;
}

/**
 * Add multiple columns to a sheet, skipping any that already exist
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @param columns - Array of column configurations
 * @returns Array of column IDs (existing or newly added)
 */
export async function addColumnsIfNotExist(
  client: SmartsheetClient,
  sheetId: number,
  columns: Array<SmartsheetColumn & { index?: number }>
): Promise<Array<{ title: string; id: number; wasCreated: boolean }>> {
  const results: Array<{ title: string; id: number; wasCreated: boolean }> = [];

  for (const columnConfig of columns) {
    if (!columnConfig.title) {
      continue;
    }

    // Check if column exists
    const existingColumn = await findColumnInSheet(client, sheetId, columnConfig.title);

    if (existingColumn) {
      // Column exists - use it
      results.push({
        title: existingColumn.title,
        id: existingColumn.id,
        wasCreated: false,
      });
    } else {
      // Column doesn't exist - add it
      const addedColumn = await getOrAddColumn(client, sheetId, columnConfig);
      results.push({
        title: addedColumn.title,
        id: addedColumn.id,
        wasCreated: true,
      });
    }
  }

  return results;
}

/**
 * Copy a workspace to create a new workspace with all its contents
 *
 * @param client - Smartsheet client
 * @param sourceWorkspaceId - ID of workspace to copy
 * @param newWorkspaceName - Name for the copied workspace
 * @returns New workspace with copied contents
 */
export async function copyWorkspace(
  client: SmartsheetClient,
  sourceWorkspaceId: number,
  newWorkspaceName: string
): Promise<{ id: number; name: string; permalink: string }> {
  try {
    // Copy workspace using Smartsheet SDK
    const copyResponse = await client.workspaces?.createWorkspace?.({
      body: {
        name: newWorkspaceName,
        copyFrom: {
          workspaceId: sourceWorkspaceId,
          includes: ['data', 'attachments', 'cellLinks', 'forms', 'ruleRecipients', 'rules'],
        },
      },
    });

    const copiedWorkspace = copyResponse?.result || copyResponse?.data;

    if (!copiedWorkspace?.id) {
      throw new Error('Failed to copy workspace - no ID returned');
    }

    return {
      id: copiedWorkspace.id,
      name: copiedWorkspace.name || newWorkspaceName,
      permalink: copiedWorkspace.permalink || '',
    };
  } catch (error) {
    throw new Error(
      `Failed to copy workspace ${sourceWorkspaceId}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Rename a sheet
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @param newName - New name for the sheet
 * @returns Updated sheet info
 */
export async function renameSheet(
  client: SmartsheetClient,
  sheetId: number,
  newName: string
): Promise<{ id: number; name: string }> {
  try {
    const updateResponse = await client.sheets?.updateSheet?.({
      sheetId,
      body: {
        name: newName,
      },
    });

    const updatedSheet = updateResponse?.result || updateResponse?.data;

    return {
      id: sheetId,
      name: updatedSheet?.name || newName,
    };
  } catch (error) {
    throw new Error(
      `Failed to rename sheet ${sheetId}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Delete all rows from a sheet
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @returns Number of rows deleted
 */
export async function deleteAllRows(client: SmartsheetClient, sheetId: number): Promise<number> {
  try {
    // Get sheet to find all row IDs
    const sheetResponse = await client.sheets?.getSheet?.({
      id: sheetId,
    });

    const sheet = sheetResponse?.result || sheetResponse?.data;
    const rows = sheet?.rows || [];

    if (rows.length === 0) {
      return 0; // No rows to delete
    }

    // Extract row IDs
    const rowIds = rows
      .map((row: SmartsheetRow) => row.id)
      .filter((id: number | undefined): id is number => id !== undefined && typeof id === 'number');

    if (rowIds.length === 0) {
      return 0;
    }

    // Delete rows
    await client.sheets?.deleteRows?.({
      sheetId,
      queryParameters: {
        ids: rowIds.join(','),
        ignoreRowsNotFound: true,
      },
    });

    return rowIds.length;
  } catch (error) {
    throw new Error(
      `Failed to delete rows from sheet ${sheetId}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

/**
 * Find sheet by partial name match (useful for template sheets)
 *
 * @param client - Smartsheet client
 * @param workspaceId - Workspace ID
 * @param partialName - Partial sheet name to match (e.g., "Tasks", "Summary")
 * @returns Sheet if found, null otherwise
 */
export async function findSheetByPartialName(
  client: SmartsheetClient,
  workspaceId: number,
  partialName: string
): Promise<{ id: number; name: string } | null> {
  try {
    const response = await client.workspaces?.getWorkspaceChildren?.({
      workspaceId,
      queryParameters: { includeAll: true },
    });

    const items: WorkspaceChildrenData[] = response?.data || [];
    const sheets = items.filter((item) => item.resourceType === 'sheet');

    // Find sheet whose name includes the partial name
    const sheet = sheets.find(
      (s) =>
        s.name &&
        typeof s.name === 'string' &&
        s.name.toLowerCase().includes(partialName.toLowerCase())
    );

    if (!sheet) {
      return null;
    }

    return {
      id: sheet.id!,
      name: sheet.name!,
    };
  } catch (error) {
    throw new Error(
      `Failed to search for sheet by partial name in workspace: ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}
