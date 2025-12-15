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
import { tryWith as withBackoff } from './ExponentialBackoff';
import { Logger } from './Logger';

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
  sheetName: string,
  logger?: Logger
): Promise<{ id: number; name: string } | null> {
  try {
    // Use getWorkspaceChildren to list sheets in workspace
    const response = await withBackoff(
      () =>
        client.workspaces!.getWorkspaceChildren!({
          workspaceId,
          queryParameters: { includeAll: true },
        }),
      undefined,
      undefined,
      logger
    );

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
  sheetConfig: { name: string; columns: SmartsheetColumn[] },
  logger?: Logger
): Promise<SmartsheetSheet> {
  // Check if sheet already exists
  const existingSheet = await findSheetInWorkspace(client, workspaceId, sheetConfig.name, logger);

  if (existingSheet) {
    // Sheet exists - fetch full details
    const sheetResponse = await withBackoff(
      () =>
        client.sheets!.getSheet!({
          id: existingSheet.id,
        }),
      undefined,
      undefined,
      logger
    );
    const fullSheet = sheetResponse?.result || sheetResponse?.data;

    return {
      id: existingSheet.id,
      name: existingSheet.name,
      columns: fullSheet?.columns || [],
      rows: fullSheet?.rows || [],
    };
  }

  // Sheet doesn't exist - create it
  const createResponse = await withBackoff(
    () =>
      client.sheets!.createSheetInWorkspace!({
        workspaceId,
        body: sheetConfig,
      }),
    undefined,
    undefined,
    logger
  );

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
  columnTitle: string,
  logger?: Logger
): Promise<{ id: number; title: string; type: string } | null> {
  try {
    // Get sheet with columns
    const sheetResponse = await withBackoff(
      () =>
        client.sheets!.getSheet!({
          id: sheetId,
        }),
      undefined,
      undefined,
      logger
    );

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
  columnConfig: SmartsheetColumn & { index?: number },
  logger?: Logger
): Promise<{ id: number; title: string; type: string }> {
  if (!columnConfig.title) {
    throw new Error('Column title is required');
  }

  // Check if column already exists
  const existingColumn = await findColumnInSheet(client, sheetId, columnConfig.title, logger);

  if (existingColumn) {
    // Column exists - return it
    return existingColumn;
  }

  // Column doesn't exist - add it
  // Strip unsupported properties during creation (width, hidden, locked can only be set via UPDATE)
  // But DO include index - Smartsheet API requires it (despite docs saying it's optional)
  //const { width: _width, hidden: _hidden, locked: _locked, ...cleanConfig } = columnConfig;
  const cleanConfig = columnConfig;

  // Ensure index is set - default to 1 (add after primary column)
  if (!cleanConfig.index) {
    cleanConfig.index = 1;
  }

  console.log(`[DEBUG] Adding column "${cleanConfig.title}" at index ${cleanConfig.index}`);

  const addResponse = await withBackoff(
    () =>
      client.sheets!.addColumn!({
        sheetId,
        body: cleanConfig,
      }),
    undefined,
    undefined,
    logger
  );

  // When body is a single column, response is a single column (not array)
  const responseData = addResponse?.result || addResponse?.data;
  const addedColumn = Array.isArray(responseData) ? responseData[0] : responseData;

  console.log(`[DEBUG] Column "${cleanConfig.title}" added successfully, ID: ${addedColumn?.id}`);

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
  sheetId: number,
  logger?: Logger
): Promise<Record<string, { id: number; type: string }>> {
  const sheetResponse = await withBackoff(
    () =>
      client.sheets!.getSheet!({
        id: sheetId,
      }),
    undefined,
    undefined,
    logger
  );

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
 * OPTIMIZATION: Fetches sheet ONCE, identifies ALL missing columns, then adds them
 * in sequence. This eliminates redundant sheet fetches (N sheet fetches + N adds → 1 fetch + N adds).
 *
 * @param client - Smartsheet client
 * @param sheetId - Sheet ID
 * @param columns - Array of column configurations
 * @returns Array of column IDs (existing or newly added)
 */
export async function addColumnsIfNotExist(
  client: SmartsheetClient,
  sheetId: number,
  columns: Array<SmartsheetColumn & { index?: number }>,
  logger?: Logger
): Promise<Array<{ title: string; id: number; wasCreated: boolean }>> {
  const results: Array<{ title: string; id: number; wasCreated: boolean }> = [];

  // OPTIMIZATION: Fetch sheet ONCE to get existing columns and determine next index
  const sheetResponse = await withBackoff(
    () => client.sheets!.getSheet!({ id: sheetId }),
    undefined,
    undefined,
    logger
  );
  const sheet = sheetResponse?.result || sheetResponse?.data;
  const existingColumns = sheet?.columns || [];

  // Build map of existing column titles for O(1) lookup
  const existingColumnMap = new Map<string, { id: number; type: string }>();
  for (const col of existingColumns) {
    if (col.title && col.id) {
      existingColumnMap.set(col.title, {
        id: col.id,
        type: col.type || 'TEXT_NUMBER',
      });
    }
  }

  // When batching columns, they all use the SAME index (insertion point)
  // The API inserts them sequentially starting from that index
  const insertionIndex = existingColumns.length;

  // Separate columns into existing and missing
  const columnsToAdd: Array<SmartsheetColumn & { index: number }> = [];

  for (const columnConfig of columns) {
    if (!columnConfig.title) {
      continue;
    }

    const existingColumn = existingColumnMap.get(columnConfig.title);

    if (existingColumn) {
      // Column exists - record it
      results.push({
        title: columnConfig.title,
        id: existingColumn.id,
        wasCreated: false,
      });
    } else {
      // Column doesn't exist - prepare to add it
      // All columns in batch use SAME index (insertion point)
      const cleanConfig: SmartsheetColumn & { index: number } = {
        title: columnConfig.title,
        type: columnConfig.type,
        index: insertionIndex,
      };

      // Include primary flag if specified
      if (columnConfig.primary) {
        cleanConfig.primary = columnConfig.primary;
      }

      columnsToAdd.push(cleanConfig);
    }
  }

  // OPTIMIZATION: Add ALL missing columns in a SINGLE batch API call using addColumn with array body
  // Sheet was already fetched ONCE above - no redundant fetches
  if (columnsToAdd.length > 0) {
    /*
    console.log(
      `[DEBUG] Adding ${columnsToAdd.length} missing columns to sheet ${sheetId} in single batch API call`
    );
    */

    // Strip unsupported properties from all columns (width, hidden, locked can only be set via UPDATE)
    const cleanColumns = columnsToAdd.map(
      ({ width: _width, hidden: _hidden, locked: _locked, ...cleanConfig }) => cleanConfig
    );

    // CRITICAL: Smartsheet SDK's addColumn (singular) accepts an array in body for batch operations
    // The method name is singular, but it handles both single and batch column additions
    if (!client.sheets?.addColumn) {
      throw new Error(
        'SmartsheetClient does not support column addition (addColumn method missing). ' +
          'Client wrapper must be updated to expose this SDK capability.'
      );
    }

    // Make SINGLE batch API call with array of columns
    // The Smartsheet SDK addColumn method accepts arrays for batch operations
    const addResponse = await withBackoff(
      () =>
        client.sheets!.addColumn!({
          sheetId,
          body: cleanColumns,
        }),
      undefined,
      undefined,
      logger
    );

    // Extract array of added columns from response
    // When body is an array, response contains array of columns
    // Type assertion needed because SDK types don't reflect polymorphic behavior
    const responseData = addResponse?.result || addResponse?.data;
    const addedColumns = Array.isArray(responseData) ? responseData : [responseData];

    if (addedColumns.length !== columnsToAdd.length) {
      throw new Error(
        `Failed to add all columns: expected ${columnsToAdd.length}, got ${addedColumns.length}`
      );
    }

    // Add results for all newly created columns
    for (const addedColumn of addedColumns) {
      if (!addedColumn?.id || !addedColumn?.title) {
        throw new Error(`Invalid column response: ${JSON.stringify(addedColumn)}`);
      }

      results.push({
        title: addedColumn.title,
        id: addedColumn.id,
        wasCreated: true,
      });
    }

    /*
    console.log(
      `[DEBUG] Successfully added ${addedColumns.length} columns to sheet ${sheetId} in single API call`
    );
    */
  }

  return results;
}

/**
 * Copy a workspace to create a new workspace with all its contents
 *
 * NOTE: Smartsheet API does not currently support direct workspace copying via the API.
 * This function creates a new empty workspace instead.
 * For template-based workspace creation, use sheet-level copying instead.
 *
 * @param client - Smartsheet client
 * @param sourceWorkspaceId - ID of workspace to copy (currently unused)
 * @param newWorkspaceName - Name for the new workspace
 * @returns New workspace (without copied contents)
 */
export async function copyWorkspace(
  client: SmartsheetClient,
  _sourceWorkspaceId: number,
  newWorkspaceName: string,
  logger?: Logger
): Promise<{ id: number; name: string; permalink: string }> {
  try {
    // Create new workspace (Smartsheet API doesn't support workspace copying)
    const createResponse = await withBackoff(
      () =>
        client.workspaces!.createWorkspace!({
          body: {
            name: newWorkspaceName,
          },
        }),
      undefined,
      undefined,
      logger
    );

    const newWorkspace = createResponse?.result || createResponse?.data;

    if (!newWorkspace?.id) {
      throw new Error('Failed to create workspace - no ID returned');
    }

    return {
      id: newWorkspace.id,
      name: newWorkspace.name || newWorkspaceName,
      permalink: newWorkspace.permalink || '',
    };
  } catch (error) {
    throw new Error(
      `Failed to create workspace: ${error instanceof Error ? error.message : JSON.stringify(error)}`
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
  newName: string,
  logger?: Logger
): Promise<{ id: number; name: string }> {
  try {
    const updateResponse = await withBackoff(
      () =>
        client.sheets!.updateSheet!({
          sheetId,
          body: {
            name: newName,
          },
        }),
      undefined,
      undefined,
      logger
    );

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
export async function deleteAllRows(
  client: SmartsheetClient,
  sheetId: number,
  logger?: Logger
): Promise<number> {
  try {
    // Get sheet to find all row IDs
    const sheetResponse = await withBackoff(
      () =>
        client.sheets!.getSheet!({
          id: sheetId,
        }),
      undefined,
      undefined,
      logger
    );

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
    await withBackoff(
      () =>
        client.sheets!.deleteRows!({
          sheetId,
          queryParameters: {
            ids: rowIds.join(','),
            ignoreRowsNotFound: true,
          },
        }),
      undefined,
      undefined,
      logger
    );

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
  partialName: string,
  logger?: Logger
): Promise<{ id: number; name: string } | null> {
  try {
    const response = await withBackoff(
      () =>
        client.workspaces!.getWorkspaceChildren!({
          workspaceId,
          queryParameters: { includeAll: true },
        }),
      undefined,
      undefined,
      logger
    );

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
