/**
 * Interface for Smartsheet client operations
 * This allows production code to work with different client implementations
 */

import {
  SmartsheetSheet,
  SmartsheetWorkspace,
  SmartsheetRow,
  SmartsheetColumn,
} from './Smartsheet';

export interface SmartsheetClient {
  createWorkspace(workspace: SmartsheetWorkspace): Promise<SmartsheetWorkspace>;
  createSheetInWorkspace(workspaceId: number, sheet: SmartsheetSheet): Promise<SmartsheetSheet>;
  addRows(sheetId: number, rows: SmartsheetRow[]): Promise<SmartsheetRow[]>;
  updateColumn(
    sheetId: number,
    columnId: number,
    column: Partial<SmartsheetColumn>
  ): Promise<SmartsheetColumn>;
  updateSheet(sheetId: number, updates: any): Promise<void>;
}
