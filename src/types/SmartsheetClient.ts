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
  // Direct methods for simple client interface
  createWorkspace?(workspace: SmartsheetWorkspace): Promise<SmartsheetWorkspace>;
  createSheetInWorkspace?(workspaceId: number, sheet: SmartsheetSheet): Promise<SmartsheetSheet>;
  addRows?(sheetId: number, rows: SmartsheetRow[]): Promise<SmartsheetRow[]>;
  updateColumn?(
    sheetId: number,
    columnId: number,
    column: Partial<SmartsheetColumn>
  ): Promise<SmartsheetColumn>;
  updateSheet?(sheetId: number, updates: any): Promise<void>;

  // Real Smartsheet SDK structure (for integration tests)
  workspaces?: {
    createWorkspace?: (options: any) => Promise<any>;
    getWorkspace?: (options: any) => Promise<any>; // Deprecated: Use getWorkspaceMetadata and getWorkspaceChildren
    getWorkspaceMetadata?: (options: any) => Promise<any>; // Replacement for getWorkspace (metadata only)
    getWorkspaceChildren?: (options: any) => Promise<any>; // Replacement for getWorkspace (children/sheets)
    deleteWorkspace?: (options: any) => Promise<any>;
    listWorkspaces?: (options: any) => Promise<any>;
  };
  sheets?: {
    getSheet?: (options: any) => Promise<any>;
    createSheet?: (options: any) => Promise<any>;
    createSheetInWorkspace?: (options: any) => Promise<any>;
    updateSheet?: (options: any) => Promise<any>;
    deleteSheet?: (options: any) => Promise<any>;
    addRows?: (options: any) => Promise<any>;
    addColumn?: (options: any) => Promise<any>;
    updateRow?: (options: any) => Promise<any>;
    deleteRows?: (options: any) => Promise<any>;
  };
  columns?: {
    updateColumn?: (options: any) => Promise<any>;
  };
}
