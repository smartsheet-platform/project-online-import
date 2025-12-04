/**
 * PMO Standards transformer - creates centralized PMO Standards workspace
 * and reference sheets that source picklist options for project sheets
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetSheet, SmartsheetRow } from '../types/Smartsheet';

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
 * Create PMO Standards workspace with all standard reference sheets
 * This workspace is shared across all project migrations
 */
export async function createPMOStandardsWorkspace(
  client: SmartsheetClient
): Promise<PMOStandardsWorkspaceInfo> {
  // Create workspace
  const workspace = await client.createWorkspace({
    name: 'PMO Standards',
  });

  // Create all standard reference sheets
  const referenceSheets: Record<string, ReferenceSheetInfo> = {};

  for (const [sheetName, values] of Object.entries(STANDARD_REFERENCE_SHEETS)) {
    const sheetInfo = await ensureStandardReferenceSheet(client, workspace.id!, sheetName, values);
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
 */
export async function ensureStandardReferenceSheet(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string,
  predefinedValues: string[]
): Promise<ReferenceSheetInfo> {
  // Create sheet with single "Name" column as primary
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

  await client.addRows(createdSheet.id!, rows);

  return {
    sheetId: createdSheet.id!,
    sheetName: createdSheet.name,
    columnId: nameColumnId,
    type: 'standard',
    values: predefinedValues,
  };
}
