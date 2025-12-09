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

// Types for Smartsheet SDK method options and responses
export interface SmartsheetApiOptions {
  id?: number;
  sheetId?: number;
  workspaceId?: number;
  columnId?: number;
  body?: unknown;
  queryParameters?: Record<string, unknown>;
}

export interface SmartsheetApiResponse<T = unknown> {
  result?: T;
  data?: T;
}

export interface WorkspaceChildrenData {
  resourceType?: string;
  id?: number;
  name?: string;
  [key: string]: unknown;
}

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
  updateSheet?(
    sheetId: number,
    updates: Partial<SmartsheetSheet>
  ): Promise<SmartsheetApiResponse<SmartsheetSheet>>;

  // Real Smartsheet SDK structure (for integration tests)
  workspaces?: {
    createWorkspace?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetWorkspace>>;
    getWorkspace?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetWorkspace>>; // Deprecated: Use getWorkspaceMetadata and getWorkspaceChildren
    getWorkspaceMetadata?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetWorkspace>>; // Replacement for getWorkspace (metadata only)
    getWorkspaceChildren?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<WorkspaceChildrenData[]>>; // Replacement for getWorkspace (children/sheets)
    deleteWorkspace?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<{ message: string }>>;
    listWorkspaces?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetWorkspace[]>>;
  };
  sheets?: {
    getSheet?: (options: SmartsheetApiOptions) => Promise<SmartsheetApiResponse<SmartsheetSheet>>;
    createSheet?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetSheet>>;
    createSheetInWorkspace?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetSheet>>;
    updateSheet?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetSheet>>;
    deleteSheet?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<{ message: string }>>;
    addRows?: (options: SmartsheetApiOptions) => Promise<SmartsheetApiResponse<SmartsheetRow[]>>;
    // addColumn accepts both single column and array of columns in body
    // When body is array, response is array; when body is single, response is single
    addColumn?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetColumn | SmartsheetColumn[]>>;
    updateRow?: (options: SmartsheetApiOptions) => Promise<SmartsheetApiResponse<SmartsheetRow>>;
    deleteRows?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<{ message: string }>>;
  };
  columns?: {
    updateColumn?: (
      options: SmartsheetApiOptions
    ) => Promise<SmartsheetApiResponse<SmartsheetColumn>>;
  };
}
