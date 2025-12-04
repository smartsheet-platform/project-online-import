/**
 * Test suite for PMO Standards transformer
 * Tests creation of centralized PMO Standards workspace and reference sheets
 */

import {
  createPMOStandardsWorkspace,
  ensureStandardReferenceSheet,
  STANDARD_REFERENCE_SHEETS,
  PMOStandardsWorkspaceInfo,
} from '../../src/transformers/PMOStandardsTransformer';
import { MockSmartsheetClient } from '../mocks/MockSmartsheetClient';

describe('PMOStandardsTransformer', () => {
  let mockClient: MockSmartsheetClient;

  beforeEach(() => {
    mockClient = new MockSmartsheetClient();
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe('STANDARD_REFERENCE_SHEETS constant', () => {
    it('should define all 6 standard reference sheets', () => {
      expect(Object.keys(STANDARD_REFERENCE_SHEETS)).toHaveLength(6);
    });

    it('should define Project - Status sheet with 5 status values', () => {
      expect(STANDARD_REFERENCE_SHEETS['Project - Status']).toEqual([
        'Active',
        'Planning',
        'Completed',
        'On Hold',
        'Cancelled',
      ]);
    });

    it('should define Project - Priority sheet with 7 priority levels', () => {
      expect(STANDARD_REFERENCE_SHEETS['Project - Priority']).toEqual([
        'Lowest',
        'Very Low',
        'Lower',
        'Medium',
        'Higher',
        'Very High',
        'Highest',
      ]);
    });

    it('should define Task - Status sheet with 3 status values', () => {
      expect(STANDARD_REFERENCE_SHEETS['Task - Status']).toEqual([
        'Not Started',
        'In Progress',
        'Complete',
      ]);
    });

    it('should define Task - Priority sheet with 7 priority levels', () => {
      expect(STANDARD_REFERENCE_SHEETS['Task - Priority']).toEqual([
        'Lowest',
        'Very Low',
        'Lower',
        'Medium',
        'Higher',
        'Very High',
        'Highest',
      ]);
    });

    it('should define Task - Constraint Type sheet with 8 constraint types', () => {
      expect(STANDARD_REFERENCE_SHEETS['Task - Constraint Type']).toEqual([
        'ASAP',
        'ALAP',
        'SNET',
        'SNLT',
        'FNET',
        'FNLT',
        'MSO',
        'MFO',
      ]);
    });

    it('should define Resource - Type sheet with 3 resource types', () => {
      expect(STANDARD_REFERENCE_SHEETS['Resource - Type']).toEqual(['Work', 'Material', 'Cost']);
    });
  });

  describe('createPMOStandardsWorkspace', () => {
    it('should create PMO Standards workspace with correct name', async () => {
      await createPMOStandardsWorkspace(mockClient);

      const workspaceCreations = mockClient.getWorkspaceCreations();
      expect(workspaceCreations).toHaveLength(1);
      expect(workspaceCreations[0].workspace.name).toBe('PMO Standards');
    });

    it('should create workspace and return workspace info', async () => {
      const result = await createPMOStandardsWorkspace(mockClient);

      expect(result).toHaveProperty('workspaceId');
      expect(result).toHaveProperty('workspaceName', 'PMO Standards');
      expect(result).toHaveProperty('permalink');
      expect(result).toHaveProperty('referenceSheets');
      expect(typeof result.workspaceId).toBe('number');
      expect(typeof result.permalink).toBe('string');
    });

    it('should create all 6 standard reference sheets', async () => {
      const result = await createPMOStandardsWorkspace(mockClient);

      expect(Object.keys(result.referenceSheets)).toHaveLength(6);
      expect(result.referenceSheets).toHaveProperty('Project - Status');
      expect(result.referenceSheets).toHaveProperty('Project - Priority');
      expect(result.referenceSheets).toHaveProperty('Task - Status');
      expect(result.referenceSheets).toHaveProperty('Task - Priority');
      expect(result.referenceSheets).toHaveProperty('Task - Constraint Type');
      expect(result.referenceSheets).toHaveProperty('Resource - Type');
    });

    it('should create sheets in the PMO Standards workspace', async () => {
      const workspaceInfo = await createPMOStandardsWorkspace(mockClient);

      const sheetCreations = mockClient.getSheetCreations();
      expect(sheetCreations).toHaveLength(6);
      sheetCreations.forEach((creation) => {
        expect(creation.workspaceId).toBe(workspaceInfo.workspaceId);
      });
    });

    it('should populate each reference sheet with predefined values', async () => {
      await createPMOStandardsWorkspace(mockClient);

      const rowAdditions = mockClient.getRowAdditions();
      // 6 sheets × their respective row counts
      // Project - Status: 5 rows
      // Project - Priority: 7 rows
      // Task - Status: 3 rows
      // Task - Priority: 7 rows
      // Task - Constraint Type: 8 rows
      // Resource - Type: 3 rows
      // Total: 33 row additions (one call per sheet)
      expect(rowAdditions).toHaveLength(6);

      // Verify Project - Status has 5 values
      const projectStatusRows = rowAdditions.find((addition) => {
        const sheet = mockClient.getSheetCreations().find((s) => s.sheet.id === addition.sheetId);
        return sheet?.sheet.name === 'Project - Status';
      });
      expect(projectStatusRows?.rows).toHaveLength(5);
    });

    it('should return reference sheet info with sheet IDs and column IDs', async () => {
      const result = await createPMOStandardsWorkspace(mockClient);

      const projectStatusRef = result.referenceSheets['Project - Status'];
      expect(projectStatusRef).toHaveProperty('sheetId');
      expect(projectStatusRef).toHaveProperty('sheetName', 'Project - Status');
      expect(projectStatusRef).toHaveProperty('columnId');
      expect(projectStatusRef).toHaveProperty('type', 'standard');
      expect(projectStatusRef).toHaveProperty('values');
      expect(typeof projectStatusRef.sheetId).toBe('number');
      expect(typeof projectStatusRef.columnId).toBe('number');
    });
  });

  describe('ensureStandardReferenceSheet', () => {
    it('should create sheet with single Name column as primary', async () => {
      // Create workspace first
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheetName = 'Project - Status';
      const values = ['Active', 'Planning', 'Completed'];

      await ensureStandardReferenceSheet(mockClient, workspace.id!, sheetName, values);

      const sheetCreations = mockClient.getSheetCreations();
      expect(sheetCreations).toHaveLength(1);

      const createdSheet = sheetCreations[0].sheet;
      expect(createdSheet.columns).toHaveLength(1);
      expect(createdSheet.columns?.[0].title).toBe('Name');
      expect(createdSheet.columns?.[0].type).toBe('TEXT_NUMBER');
      expect(createdSheet.columns?.[0].primary).toBe(true);
    });

    it('should populate sheet with all predefined values as rows', async () => {
      // Create workspace first
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheetName = 'Project - Priority';
      const values = ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'];

      await ensureStandardReferenceSheet(mockClient, workspace.id!, sheetName, values);

      const rowAdditions = mockClient.getRowAdditions();
      expect(rowAdditions).toHaveLength(1);
      expect(rowAdditions[0].rows).toHaveLength(7);

      // Verify first and last values
      expect(rowAdditions[0].rows[0].cells?.[0].value).toBe('Lowest');
      expect(rowAdditions[0].rows[6].cells?.[0].value).toBe('Highest');
    });

    it('should return reference sheet info with metadata', async () => {
      // Create workspace first
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheetName = 'Task - Constraint Type';
      const values = ['ASAP', 'ALAP', 'SNET', 'SNLT'];

      const result = await ensureStandardReferenceSheet(
        mockClient,
        workspace.id!,
        sheetName,
        values
      );

      expect(result.sheetId).toBeGreaterThan(0);
      expect(result.sheetName).toBe(sheetName);
      expect(result.columnId).toBeGreaterThan(0);
      expect(result.type).toBe('standard');
      expect(result.values).toEqual(values);
    });

    it('should add rows to sheet with correct column ID references', async () => {
      // Create workspace first
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheetName = 'Resource - Type';
      const values = ['Work', 'Material', 'Cost'];

      const sheetInfo = await ensureStandardReferenceSheet(
        mockClient,
        workspace.id!,
        sheetName,
        values
      );

      const rowAdditions = mockClient.getRowAdditions();
      const addedRows = rowAdditions[0].rows;

      // Each row should have cell with column ID matching the Name column
      addedRows.forEach((row) => {
        expect(row.cells).toHaveLength(1);
        expect(row.cells?.[0].columnId).toBe(sheetInfo.columnId);
      });
    });
  });

  describe('PMOStandardsWorkspaceInfo type', () => {
    it('should return correctly typed workspace info', async () => {
      const result: PMOStandardsWorkspaceInfo = await createPMOStandardsWorkspace(mockClient);

      // TypeScript compile-time check
      expect(result.workspaceId).toBeDefined();
      expect(result.workspaceName).toBeDefined();
      expect(result.permalink).toBeDefined();
      expect(result.referenceSheets).toBeDefined();

      // Runtime check of reference sheet structure
      Object.values(result.referenceSheets).forEach((refSheet) => {
        expect(refSheet.sheetId).toBeDefined();
        expect(refSheet.sheetName).toBeDefined();
        expect(refSheet.columnId).toBeDefined();
        expect(refSheet.type).toBe('standard');
        expect(Array.isArray(refSheet.values)).toBe(true);
      });
    });
  });

  describe('Integration with ProjectTransformer', () => {
    it('should provide sheet IDs for picklist column sourcing', async () => {
      const pmoInfo = await createPMOStandardsWorkspace(mockClient);

      // These IDs would be used by ProjectTransformer to create picklist columns
      const projectStatusRef = pmoInfo.referenceSheets['Project - Status'];
      const projectPriorityRef = pmoInfo.referenceSheets['Project - Priority'];

      expect(projectStatusRef.sheetId).toBeGreaterThan(0);
      expect(projectStatusRef.columnId).toBeGreaterThan(0);
      expect(projectPriorityRef.sheetId).toBeGreaterThan(0);
      expect(projectPriorityRef.columnId).toBeGreaterThan(0);

      // Verify these can be used to create picklist options
      const statusPicklistOption = {
        sheetId: projectStatusRef.sheetId,
        columnId: projectStatusRef.columnId,
      };
      expect(statusPicklistOption.sheetId).toBeDefined();
      expect(statusPicklistOption.columnId).toBeDefined();
    });
  });
});
