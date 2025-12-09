/**
 * Mock Smartsheet SDK client for testing transformation logic
 * Acts as a test spy to verify transformation calls without network requests
 */

import { SmartsheetClient, SmartsheetApiOptions } from '../../src/types/SmartsheetClient';
import {
  SmartsheetWorkspace,
  SmartsheetSheet,
  SmartsheetColumn,
  SmartsheetRow,
} from '../../src/types/Smartsheet';

interface WorkspaceCreationCall {
  workspace: SmartsheetWorkspace;
  timestamp: Date;
}

interface SheetCreationCall {
  workspaceId: number;
  sheet: SmartsheetSheet;
  timestamp: Date;
}

interface ColumnAdditionCall {
  sheetId: number;
  columns: SmartsheetColumn[];
  timestamp: Date;
}

interface RowAdditionCall {
  sheetId: number;
  rows: SmartsheetRow[];
  timestamp: Date;
}

interface ColumnUpdateCall {
  sheetId: number;
  columnId: number;
  column: Partial<SmartsheetColumn>;
  timestamp: Date;
}

/**
 * Mock Smartsheet client that tracks all operations as a test spy
 */
export class MockSmartsheetClient implements SmartsheetClient {
  // Internal storage (renamed to avoid interface conflicts)
  private _workspaceStorage: Map<number, SmartsheetWorkspace> = new Map();
  private _sheetStorage: Map<number, SmartsheetSheet> = new Map();
  private nextWorkspaceId: number = 1000;
  private nextSheetId: number = 2000;
  private nextColumnId: number = 3000;
  private nextRowId: number = 4000;

  // Test spy tracking
  private workspaceCreations: WorkspaceCreationCall[] = [];
  private sheetCreations: SheetCreationCall[] = [];
  private columnAdditions: ColumnAdditionCall[] = [];
  private rowAdditions: RowAdditionCall[] = [];
  private columnUpdates: ColumnUpdateCall[] = [];
  private callCount: Map<string, number> = new Map();
  private shouldFail: boolean = false;
  private failureCount: number = 0;

  /**
   * Configure client to fail for testing exponential backoff
   */
  setFailureMode(shouldFail: boolean, failureCount: number = 1): void {
    this.shouldFail = shouldFail;
    this.failureCount = failureCount;
  }

  /**
   * Get call count for a specific operation
   */
  getCallCount(operation: string): number {
    return this.callCount.get(operation) || 0;
  }

  /**
   * Reset all mock data and test spy state
   */
  reset(): void {
    this._workspaceStorage.clear();
    this._sheetStorage.clear();
    this.workspaceCreations = [];
    this.sheetCreations = [];
    this.columnAdditions = [];
    this.rowAdditions = [];
    this.columnUpdates = [];
    this.callCount.clear();
    this.shouldFail = false;
    this.failureCount = 0;
    this.nextWorkspaceId = 1000;
    this.nextSheetId = 2000;
    this.nextColumnId = 3000;
    this.nextRowId = 4000;
  }

  /**
   * Simulate API failure for testing retry logic
   */
  private checkFailure(operation: string): void {
    const count = this.getCallCount(operation);
    this.callCount.set(operation, count + 1);

    if (this.shouldFail && count < this.failureCount) {
      throw new Error(`Mock Smartsheet API failure for ${operation} (attempt ${count + 1})`);
    }
  }

  /**
   * Get all workspace creation calls (test spy)
   */
  getWorkspaceCreations(): WorkspaceCreationCall[] {
    return [...this.workspaceCreations];
  }

  /**
   * Get all sheet creation calls (test spy)
   */
  getSheetCreations(): SheetCreationCall[] {
    return [...this.sheetCreations];
  }

  /**
   * Get all column addition calls (test spy)
   */
  getColumnAdditions(): ColumnAdditionCall[] {
    return [...this.columnAdditions];
  }

  /**
   * Get all row addition calls (test spy)
   */
  getRowAdditions(): RowAdditionCall[] {
    return [...this.rowAdditions];
  }

  /**
   * Get all column update calls for a specific sheet (test spy)
   */
  getColumnUpdates(sheetId: number): ColumnUpdateCall[] {
    return this.columnUpdates.filter((update) => update.sheetId === sheetId);
  }

  /**
   * Create workspace
   */
  async createWorkspace(workspace: SmartsheetWorkspace): Promise<SmartsheetWorkspace> {
    const operation = 'createWorkspace';
    this.checkFailure(operation);

    const workspaceId = this.nextWorkspaceId++;
    const createdWorkspace: SmartsheetWorkspace = {
      ...workspace,
      id: workspaceId,
      accessLevel: 'OWNER',
      permalink: `https://app.smartsheet.com/workspace/${workspaceId}`,
    };

    this._workspaceStorage.set(workspaceId, createdWorkspace);
    this.workspaceCreations.push({
      workspace: createdWorkspace,
      timestamp: new Date(),
    });

    return createdWorkspace;
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: number): Promise<SmartsheetWorkspace> {
    const operation = 'getWorkspace';
    this.checkFailure(operation);

    const workspace = this._workspaceStorage.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    return workspace;
  }

  /**
   * Create sheet in workspace
   */
  async createSheetInWorkspace(
    workspaceId: number,
    sheet: SmartsheetSheet
  ): Promise<SmartsheetSheet> {
    const operation = 'createSheetInWorkspace';
    this.checkFailure(operation);

    // Verify workspace exists
    if (!this._workspaceStorage.has(workspaceId)) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const sheetId = this.nextSheetId++;
    const columns = sheet.columns?.map((col) => ({
      ...col,
      id: this.nextColumnId++,
    }));

    const createdSheet: SmartsheetSheet = {
      ...sheet,
      id: sheetId,
      columns: columns || [],
      rows: [],
      accessLevel: 'OWNER',
      permalink: `https://app.smartsheet.com/sheets/${sheetId}`,
    };

    this._sheetStorage.set(sheetId, createdSheet);
    this.sheetCreations.push({
      workspaceId,
      sheet: createdSheet,
      timestamp: new Date(),
    });

    return createdSheet;
  }

  /**
   * Get sheet by ID
   */
  async getSheet(sheetId: number): Promise<SmartsheetSheet> {
    const operation = 'getSheet';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }
    return sheet;
  }

  /**
   * Add columns to sheet
   */
  async addColumns(sheetId: number, columns: SmartsheetColumn[]): Promise<SmartsheetColumn[]> {
    const operation = 'addColumns';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    const newColumns = columns.map((col) => ({
      ...col,
      id: this.nextColumnId++,
    }));

    sheet.columns = [...(sheet.columns || []), ...newColumns];
    this.columnAdditions.push({
      sheetId,
      columns: newColumns,
      timestamp: new Date(),
    });

    return newColumns;
  }

  /**
   * Add rows to sheet
   */
  async addRows(sheetId: number, rows: SmartsheetRow[]): Promise<SmartsheetRow[]> {
    const operation = 'addRows';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    const newRows = rows.map((row, index) => ({
      ...row,
      id: this.nextRowId++,
      sheetId,
      rowNumber: (sheet.rows?.length || 0) + index + 1,
    }));

    sheet.rows = [...(sheet.rows || []), ...newRows];
    this.rowAdditions.push({
      sheetId,
      rows: newRows,
      timestamp: new Date(),
    });

    return newRows;
  }

  /**
   * Update rows in sheet
   */
  async updateRows(sheetId: number, rows: SmartsheetRow[]): Promise<SmartsheetRow[]> {
    const operation = 'updateRows';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    // In real implementation, would update existing rows
    // For mock, just track the call
    return rows;
  }

  /**
   * Update column in sheet (for configuring picklist options, etc.)
   */
  async updateColumn(
    sheetId: number,
    columnId: number,
    column: Partial<SmartsheetColumn>
  ): Promise<SmartsheetColumn> {
    const operation = 'updateColumn';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    const existingColumn = sheet.columns?.find((col) => col.id === columnId);
    if (!existingColumn) {
      throw new Error(`Column not found: ${columnId} in sheet ${sheetId}`);
    }

    // Merge the update into the existing column
    const updatedColumn: SmartsheetColumn = {
      ...existingColumn,
      ...column,
      id: columnId, // Preserve the ID
    };

    // Update the column in the sheet
    sheet.columns = sheet.columns?.map((col) => (col.id === columnId ? updatedColumn : col));

    // Track the update for test spy
    this.columnUpdates.push({
      sheetId,
      columnId,
      column,
      timestamp: new Date(),
    });

    return updatedColumn;
  }

  /**
   * Update sheet properties (for enabling Gantt, dependencies, etc.)
   */
  async updateSheet(
    sheetId: number,
    updates: Partial<SmartsheetSheet>
  ): Promise<{ result?: SmartsheetSheet; data?: SmartsheetSheet }> {
    const operation = 'updateSheet';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    // Apply updates to the sheet
    Object.assign(sheet, updates);

    return { result: sheet };
  }

  /**
   * Add single column or multiple columns to sheet (SDK-style method)
   * Matches real Smartsheet SDK behavior: accepts both single column and array
   */
  async addColumn(
    sheetId: number,
    columnOrColumns: SmartsheetColumn | SmartsheetColumn[]
  ): Promise<SmartsheetColumn | SmartsheetColumn[]> {
    const operation = 'addColumn';
    this.checkFailure(operation);

    const sheet = this._sheetStorage.get(sheetId);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    // Handle both single column and array of columns
    const isArray = Array.isArray(columnOrColumns);
    const columns = isArray ? columnOrColumns : [columnOrColumns];

    const newColumns = columns.map((col) => ({
      ...col,
      id: this.nextColumnId++,
    }));

    sheet.columns = [...(sheet.columns || []), ...newColumns];

    // Track addition (use internal addColumns tracking)
    this.columnAdditions.push({
      sheetId,
      columns: newColumns,
      timestamp: new Date(),
    });

    return isArray ? newColumns : newColumns[0];
  }

  // SDK-style nested object structure
  workspaces = {
    createWorkspace: async (options: SmartsheetApiOptions) => {
      const workspace = await this.createWorkspace(options.body as SmartsheetWorkspace);
      return { result: workspace };
    },
    getWorkspace: async (options: SmartsheetApiOptions) => {
      const workspace = await this.getWorkspace(options.workspaceId!);
      return { result: workspace };
    },
    getWorkspaceMetadata: async (options: SmartsheetApiOptions) => {
      const workspace = await this.getWorkspace(options.workspaceId!);
      return { result: workspace };
    },
    getWorkspaceChildren: async (options: SmartsheetApiOptions) => {
      const workspaceId = options.workspaceId!;
      const workspace = this._workspaceStorage.get(workspaceId);
      if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      // Return sheets in this workspace
      const sheets = Array.from(this._sheetStorage.values())
        .filter((sheet) => {
          // Check if this sheet was created in this workspace
          const creation = this.sheetCreations.find((c) => c.sheet.id === sheet.id);
          return creation && creation.workspaceId === workspaceId;
        })
        .map((sheet) => ({
          id: sheet.id,
          name: sheet.name,
          resourceType: 'sheet',
          permalink: sheet.permalink,
        }));

      return { data: sheets };
    },
    deleteWorkspace: async (options: SmartsheetApiOptions) => {
      const workspaceId = options.workspaceId!;
      this._workspaceStorage.delete(workspaceId);
      return { result: { message: 'Workspace deleted' } };
    },
    listWorkspaces: async (_options?: SmartsheetApiOptions) => {
      const workspaces = Array.from(this._workspaceStorage.values());
      return { result: workspaces };
    },
  };

  sheets = {
    getSheet: async (options: SmartsheetApiOptions) => {
      // SDK ONLY accepts 'id' parameter for GET operations, not 'sheetId'
      if (!options.id) {
        throw new Error('getSheet requires "id" parameter (not "sheetId")');
      }
      const sheet = await this.getSheet(options.id);
      return { result: sheet };
    },
    createSheetInWorkspace: async (options: SmartsheetApiOptions) => {
      const sheet = await this.createSheetInWorkspace(
        options.workspaceId!,
        options.body as SmartsheetSheet
      );
      return { result: sheet };
    },
    addColumn: async (options: SmartsheetApiOptions) => {
      const result = await this.addColumn(
        options.sheetId!,
        options.body as SmartsheetColumn | SmartsheetColumn[]
      );
      return { result };
    },
    addRows: async (options: SmartsheetApiOptions) => {
      const rows = await this.addRows(options.sheetId!, options.body as SmartsheetRow[]);
      return { result: rows };
    },
    updateSheet: async (options: SmartsheetApiOptions) => {
      return this.updateSheet(options.sheetId!, options.body as Partial<SmartsheetSheet>);
    },
  };

  columns = {
    updateColumn: async (options: SmartsheetApiOptions) => {
      const column = await this.updateColumn(
        options.sheetId!,
        options.columnId!,
        options.body as Partial<SmartsheetColumn>
      );
      return { result: column };
    },
  };
}
