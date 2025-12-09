/**
 * Tests for SmartsheetHelpers resiliency utilities
 */

import { MockSmartsheetClient } from '../unit/MockSmartsheetClient';
import {
  findSheetInWorkspace,
  getOrCreateSheet,
  findColumnInSheet,
  getOrAddColumn,
  getColumnMap,
  addColumnsIfNotExist,
} from '../../src/util/SmartsheetHelpers';

describe('SmartsheetHelpers - Re-run Resiliency', () => {
  let mockClient: MockSmartsheetClient;

  beforeEach(() => {
    mockClient = new MockSmartsheetClient();
  });

  describe('findSheetInWorkspace', () => {
    it('should find existing sheet by name', async () => {
      // Create a workspace
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });

      // Create a sheet in the workspace
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [{ title: 'Column 1', type: 'TEXT_NUMBER', primary: true }],
      });

      // Find the sheet
      const found = await findSheetInWorkspace(mockClient, workspace.id!, 'Test Sheet');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(sheet.id);
      expect(found?.name).toBe('Test Sheet');
    });

    it('should return null for non-existent sheet', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });

      const found = await findSheetInWorkspace(mockClient, workspace.id!, 'Non-Existent Sheet');

      expect(found).toBeNull();
    });
  });

  describe('getOrCreateSheet', () => {
    it('should create new sheet when it does not exist', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });

      const result = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'New Sheet',
        columns: [
          { title: 'Column 1', type: 'TEXT_NUMBER', primary: true },
          { title: 'Column 2', type: 'TEXT_NUMBER' },
        ],
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('New Sheet');
      expect(result.columns?.length).toBe(2);
    });

    it('should return existing sheet when it already exists', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });

      // Create sheet first time
      const firstResult = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'Existing Sheet',
        columns: [{ title: 'Column 1', type: 'TEXT_NUMBER', primary: true }],
      });

      // Try to create again (should return existing)
      const secondResult = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'Existing Sheet',
        columns: [{ title: 'Column 1', type: 'TEXT_NUMBER', primary: true }],
      });

      expect(secondResult.id).toBe(firstResult.id);
      expect(secondResult.name).toBe('Existing Sheet');

      // Should only have one sheet created
      const creations = mockClient.getSheetCreations();
      expect(creations.length).toBe(1);
    });

    it('should handle re-run scenario gracefully', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });

      // First run
      const run1 = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'Resilient Sheet',
        columns: [{ title: 'Primary', type: 'TEXT_NUMBER', primary: true }],
      });

      // Second run (simulating re-run)
      const run2 = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'Resilient Sheet',
        columns: [{ title: 'Primary', type: 'TEXT_NUMBER', primary: true }],
      });

      expect(run2.id).toBe(run1.id);
    });
  });

  describe('findColumnInSheet', () => {
    it('should find existing column by title', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Column 1', type: 'TEXT_NUMBER', primary: true },
          { title: 'Column 2', type: 'DATE' },
        ],
      });

      const found = await findColumnInSheet(mockClient, sheet.id!, 'Column 2');

      expect(found).not.toBeNull();
      expect(found?.title).toBe('Column 2');
      expect(found?.type).toBe('DATE');
    });

    it('should return null for non-existent column', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [{ title: 'Column 1', type: 'TEXT_NUMBER', primary: true }],
      });

      const found = await findColumnInSheet(mockClient, sheet.id!, 'Non-Existent Column');

      expect(found).toBeNull();
    });
  });

  describe('getOrAddColumn', () => {
    it('should add new column when it does not exist', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [{ title: 'Primary', type: 'TEXT_NUMBER', primary: true }],
      });

      const result = await getOrAddColumn(mockClient, sheet.id!, {
        title: 'New Column',
        type: 'DATE',
        width: 120,
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe('New Column');
      expect(result.type).toBe('DATE');
    });

    it('should return existing column when it already exists', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Primary', type: 'TEXT_NUMBER', primary: true },
          { title: 'Existing Column', type: 'DATE' },
        ],
      });

      const result = await getOrAddColumn(mockClient, sheet.id!, {
        title: 'Existing Column',
        type: 'DATE',
        width: 120,
      });

      expect(result.title).toBe('Existing Column');
      expect(result.type).toBe('DATE');

      // Verify column was not added again
      const updatedSheet = await mockClient.getSheet(sheet.id!);
      expect(updatedSheet.columns?.length).toBe(2); // Still only 2 columns
    });
  });

  describe('getColumnMap', () => {
    it('should return map of all columns', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Column 1', type: 'TEXT_NUMBER', primary: true },
          { title: 'Column 2', type: 'DATE' },
          { title: 'Column 3', type: 'CHECKBOX' },
        ],
      });

      const columnMap = await getColumnMap(mockClient, sheet.id!);

      expect(Object.keys(columnMap).length).toBe(3);
      expect(columnMap['Column 1']).toBeDefined();
      expect(columnMap['Column 2']).toBeDefined();
      expect(columnMap['Column 3']).toBeDefined();
      expect(columnMap['Column 2'].type).toBe('DATE');
      expect(columnMap['Column 3'].type).toBe('CHECKBOX');
    });
  });

  describe('addColumnsIfNotExist', () => {
    it('should add all new columns', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [{ title: 'Primary', type: 'TEXT_NUMBER', primary: true }],
      });

      const columnsToAdd = [
        { title: 'Column 1', type: 'TEXT_NUMBER' as const, width: 100 },
        { title: 'Column 2', type: 'DATE' as const, width: 120 },
        { title: 'Column 3', type: 'CHECKBOX' as const, width: 80 },
      ];

      const results = await addColumnsIfNotExist(mockClient, sheet.id!, columnsToAdd);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.wasCreated)).toBe(true);
      expect(results[0].title).toBe('Column 1');
      expect(results[1].title).toBe('Column 2');
      expect(results[2].title).toBe('Column 3');
    });

    it('should skip existing columns and add new ones', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Primary', type: 'TEXT_NUMBER', primary: true },
          { title: 'Existing Column', type: 'DATE' },
        ],
      });

      const columnsToAdd = [
        { title: 'Existing Column', type: 'DATE' as const, width: 120 },
        { title: 'New Column', type: 'TEXT_NUMBER' as const, width: 100 },
      ];

      const results = await addColumnsIfNotExist(mockClient, sheet.id!, columnsToAdd);

      expect(results.length).toBe(2);
      expect(results[0].title).toBe('Existing Column');
      expect(results[0].wasCreated).toBe(false); // Already existed
      expect(results[1].title).toBe('New Column');
      expect(results[1].wasCreated).toBe(true); // Newly created
    });

    it('should handle complete re-run with all existing columns', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Primary', type: 'TEXT_NUMBER', primary: true },
          { title: 'Column 1', type: 'TEXT_NUMBER' },
          { title: 'Column 2', type: 'DATE' },
        ],
      });

      const columnsToAdd = [
        { title: 'Column 1', type: 'TEXT_NUMBER' as const, width: 100 },
        { title: 'Column 2', type: 'DATE' as const, width: 120 },
      ];

      const results = await addColumnsIfNotExist(mockClient, sheet.id!, columnsToAdd);

      expect(results.length).toBe(2);
      expect(results.every((r) => !r.wasCreated)).toBe(true); // All existed
    });
  });

  describe('Integration - Full re-run scenario', () => {
    it('should handle complete re-run of sheet and column creation', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });

      // First run - create sheet and columns
      const firstSheet = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'Project Sheet',
        columns: [{ title: 'Task Name', type: 'TEXT_NUMBER', primary: true }],
      });

      await addColumnsIfNotExist(mockClient, firstSheet.id!, [
        { title: 'Start Date', type: 'DATE' as const, width: 120 },
        { title: 'Status', type: 'PICKLIST' as const, width: 100 },
      ]);

      // Second run - simulate re-run (should reuse existing sheet and columns)
      const secondSheet = await getOrCreateSheet(mockClient, workspace.id!, {
        name: 'Project Sheet',
        columns: [{ title: 'Task Name', type: 'TEXT_NUMBER', primary: true }],
      });

      const secondColumns = await addColumnsIfNotExist(mockClient, secondSheet.id!, [
        { title: 'Start Date', type: 'DATE' as const, width: 120 },
        { title: 'Status', type: 'PICKLIST' as const, width: 100 },
      ]);

      // Verify same sheet was reused
      expect(secondSheet.id).toBe(firstSheet.id);

      // Verify columns were not duplicated
      expect(secondColumns.length).toBe(2);
      expect(secondColumns.every((c) => !c.wasCreated)).toBe(true);

      // Verify no duplicate columns in sheet
      const finalSheet = await mockClient.getSheet(firstSheet.id!);
      expect(finalSheet.columns?.length).toBe(3); // Primary + 2 added columns
    });
  });
});
