/**
 * Resource transformer tests
 * Based on transformation mapping specification Section 3
 */

import {
  createResourcesSheet,
  createResourcesSheetColumns,
  createResourceRow,
  configureResourcePicklistColumns,
  discoverResourceDepartments,
  validateResource,
} from '../../../src/transformers/ResourceTransformer';
import { ProjectOnlineResource } from '../../../src/types/ProjectOnline';
import { MockSmartsheetClient } from '../MockSmartsheetClient';
import { PMOStandardsWorkspaceInfo } from '../../../src/transformers/PMOStandardsTransformer';

describe('ResourceTransformer', () => {
  const projectName = 'Test Project';
  const sampleResource: ProjectOnlineResource = {
    Id: 'resource-guid-123',
    Name: 'John Doe',
    Email: 'john.doe@example.com',
    ResourceType: 'Work',
    MaxUnits: 1.0,
    StandardRate: 75.0,
    OvertimeRate: 112.5,
    CostPerUse: 50.0,
    BaseCalendar: 'Standard',
    IsActive: true,
    IsGeneric: false,
    Department: 'Engineering',
    Code: 'ENG-001',
    CreatedDate: '2024-03-01T00:00:00Z',
    ModifiedDate: '2024-03-15T00:00:00Z',
  };

  describe('createResourcesSheet', () => {
    it('should create Resources sheet with correct name', () => {
      const resources: ProjectOnlineResource[] = [sampleResource];
      const sheet = createResourcesSheet(resources, projectName);

      expect(sheet.name).toBe('Test Project - Resources');
    });

    it('should include all resources as rows', () => {
      const resources: ProjectOnlineResource[] = [
        sampleResource,
        { ...sampleResource, Id: 'resource-2', Name: 'Jane Smith', Email: 'jane@example.com' },
      ];
      const sheet = createResourcesSheet(resources, projectName);

      expect(sheet.rows).toHaveLength(2);
    });

    it('should include all required columns', () => {
      const resources: ProjectOnlineResource[] = [sampleResource];
      const sheet = createResourcesSheet(resources, projectName);

      const columnTitles = sheet.columns?.map((col) => col.title) || [];
      expect(columnTitles).toContain('Resource ID');
      expect(columnTitles).toContain('Project Online Resource ID');
      expect(columnTitles).toContain('Contact');
      expect(columnTitles).toContain('Resource Type');
      expect(columnTitles).toContain('Max Units');
      expect(columnTitles).toContain('Standard Rate');
      expect(columnTitles).toContain('Overtime Rate');
      expect(columnTitles).toContain('Cost Per Use');
      expect(columnTitles).toContain('Department');
      expect(columnTitles).toContain('Code');
      expect(columnTitles).toContain('Is Active');
      expect(columnTitles).toContain('Is Generic');
      expect(columnTitles).toContain('Project Online Created Date');
      expect(columnTitles).toContain('Project Online Modified Date');
      expect(columnTitles).toContain('Created Date');
      expect(columnTitles).toContain('Modified Date');
      expect(columnTitles).toContain('Created By');
      expect(columnTitles).toContain('Modified By');
    });
  });

  describe('createResourcesSheetColumns', () => {
    it('should create 18 columns total', () => {
      const columns = createResourcesSheetColumns();
      expect(columns).toHaveLength(18);
    });

    it('should have Contact as primary column', () => {
      const columns = createResourcesSheetColumns();
      const contactColumn = columns.find((col) => col.title === 'Contact');
      expect(contactColumn?.primary).toBe(true);
    });

    it('should configure Resource ID as AUTO_NUMBER with project prefix', () => {
      const columns = createResourcesSheetColumns();
      const idColumn = columns.find((col) => col.title === 'Resource ID');
      expect(idColumn?.type).toBe('AUTO_NUMBER');
    });

    it('should hide and lock Project Online Resource ID column', () => {
      const columns = createResourcesSheetColumns();
      const poIdColumn = columns.find((col) => col.title === 'Project Online Resource ID');
      expect(poIdColumn?.hidden).toBe(true);
      expect(poIdColumn?.locked).toBe(true);
    });

    it('should configure Resource Type as PICKLIST', () => {
      const columns = createResourcesSheetColumns();
      const typeColumn = columns.find((col) => col.title === 'Resource Type');
      expect(typeColumn?.type).toBe('PICKLIST');
    });

    it('should configure Department as PICKLIST', () => {
      const columns = createResourcesSheetColumns();
      const deptColumn = columns.find((col) => col.title === 'Department');
      expect(deptColumn?.type).toBe('PICKLIST');
    });

    it('should configure boolean columns as CHECKBOX', () => {
      const columns = createResourcesSheetColumns();
      const activeColumn = columns.find((col) => col.title === 'Is Active');
      const genericColumn = columns.find((col) => col.title === 'Is Generic');
      expect(activeColumn?.type).toBe('CHECKBOX');
      expect(genericColumn?.type).toBe('CHECKBOX');
    });

    it('should configure rate columns as TEXT_NUMBER', () => {
      const columns = createResourcesSheetColumns();
      const standardRate = columns.find((col) => col.title === 'Standard Rate');
      const overtimeRate = columns.find((col) => col.title === 'Overtime Rate');
      const costPerUse = columns.find((col) => col.title === 'Cost Per Use');
      expect(standardRate?.type).toBe('TEXT_NUMBER');
      expect(overtimeRate?.type).toBe('TEXT_NUMBER');
      expect(costPerUse?.type).toBe('TEXT_NUMBER');
    });
  });

  describe('createResourceRow', () => {
    it('should create row with all required cells', () => {
      const row = createResourceRow(sampleResource);
      expect(row.cells?.length).toBeGreaterThan(0);
    });

    it('should populate Project Online Resource ID', () => {
      const row = createResourceRow(sampleResource);
      const poIdCell = row.cells?.find((cell) => cell.columnId === 1);
      expect(poIdCell?.value).toBe('resource-guid-123');
    });

    it('should create contact object with name and email', () => {
      const row = createResourceRow(sampleResource);
      const contactCell = row.cells?.find((cell) => cell.columnId === 2);
      expect(contactCell?.objectValue).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    it('should handle resource without email', () => {
      const resourceWithoutEmail: ProjectOnlineResource = {
        ...sampleResource,
        Email: undefined,
      };
      const row = createResourceRow(resourceWithoutEmail);
      const contactCell = row.cells?.find((cell) => cell.columnId === 2);
      expect(contactCell?.objectValue).toEqual({
        name: 'John Doe',
      });
    });

    it('should populate Resource Type', () => {
      const row = createResourceRow(sampleResource);
      const typeCell = row.cells?.find((cell) => cell.columnId === 3);
      expect(typeCell?.value).toBe('Work');
    });

    it('should convert MaxUnits to percentage string', () => {
      const row = createResourceRow(sampleResource);
      const maxUnitsCell = row.cells?.find((cell) => cell.columnId === 4);
      expect(maxUnitsCell?.value).toBe('100%');
    });

    it('should handle fractional MaxUnits', () => {
      const resource: ProjectOnlineResource = {
        ...sampleResource,
        MaxUnits: 0.5,
      };
      const row = createResourceRow(resource);
      const maxUnitsCell = row.cells?.find((cell) => cell.columnId === 4);
      expect(maxUnitsCell?.value).toBe('50%');
    });

    it('should populate rates as numeric values', () => {
      const row = createResourceRow(sampleResource);
      const standardRateCell = row.cells?.find((cell) => cell.columnId === 5);
      const overtimeRateCell = row.cells?.find((cell) => cell.columnId === 6);
      const costPerUseCell = row.cells?.find((cell) => cell.columnId === 7);
      expect(standardRateCell?.value).toBe(75.0);
      expect(overtimeRateCell?.value).toBe(112.5);
      expect(costPerUseCell?.value).toBe(50.0);
    });

    it('should populate Department', () => {
      const row = createResourceRow(sampleResource);
      const deptCell = row.cells?.find((cell) => cell.columnId === 8);
      expect(deptCell?.value).toBe('Engineering');
    });

    it('should populate Code', () => {
      const row = createResourceRow(sampleResource);
      const codeCell = row.cells?.find((cell) => cell.columnId === 9);
      expect(codeCell?.value).toBe('ENG-001');
    });

    it('should populate boolean fields', () => {
      const row = createResourceRow(sampleResource);
      const activeCell = row.cells?.find((cell) => cell.columnId === 10);
      const genericCell = row.cells?.find((cell) => cell.columnId === 11);
      expect(activeCell?.value).toBe(true);
      expect(genericCell?.value).toBe(false);
    });

    it('should convert created and modified dates', () => {
      const row = createResourceRow(sampleResource);
      const createdCell = row.cells?.find((cell) => cell.columnId === 12);
      const modifiedCell = row.cells?.find((cell) => cell.columnId === 13);
      expect(createdCell?.value).toBe('2024-03-01');
      expect(modifiedCell?.value).toBe('2024-03-15');
    });

    it('should set toBottom flag for row placement', () => {
      const row = createResourceRow(sampleResource);
      expect(row.toBottom).toBe(true);
    });
  });

  describe('discoverResourceDepartments', () => {
    it('should discover unique department values', () => {
      const resources: ProjectOnlineResource[] = [
        { ...sampleResource, Department: 'Engineering' },
        { ...sampleResource, Id: 'r2', Department: 'Marketing' },
        { ...sampleResource, Id: 'r3', Department: 'Engineering' },
        { ...sampleResource, Id: 'r4', Department: 'Sales' },
      ];
      const departments = discoverResourceDepartments(resources);
      expect(departments).toHaveLength(3);
      expect(departments).toContain('Engineering');
      expect(departments).toContain('Marketing');
      expect(departments).toContain('Sales');
    });

    it('should sort departments alphabetically', () => {
      const resources: ProjectOnlineResource[] = [
        { ...sampleResource, Department: 'Zebra' },
        { ...sampleResource, Id: 'r2', Department: 'Alpha' },
        { ...sampleResource, Id: 'r3', Department: 'Bravo' },
      ];
      const departments = discoverResourceDepartments(resources);
      expect(departments).toEqual(['Alpha', 'Bravo', 'Zebra']);
    });

    it('should filter out null and empty departments', () => {
      const resources: ProjectOnlineResource[] = [
        { ...sampleResource, Department: 'Engineering' },
        { ...sampleResource, Id: 'r2', Department: undefined },
        { ...sampleResource, Id: 'r3', Department: '' },
        { ...sampleResource, Id: 'r4', Department: 'Marketing' },
      ];
      const departments = discoverResourceDepartments(resources);
      expect(departments).toHaveLength(2);
      expect(departments).toContain('Engineering');
      expect(departments).toContain('Marketing');
    });

    it('should return empty array when no departments', () => {
      const resources: ProjectOnlineResource[] = [
        { ...sampleResource, Department: undefined },
        { ...sampleResource, Id: 'r2', Department: undefined },
      ];
      const departments = discoverResourceDepartments(resources);
      expect(departments).toEqual([]);
    });
  });

  describe('configureResourcePicklistColumns', () => {
    let mockClient: MockSmartsheetClient;
    let pmoStandards: PMOStandardsWorkspaceInfo;

    beforeEach(async () => {
      mockClient = new MockSmartsheetClient();
      pmoStandards = {
        workspaceId: 1000,
        workspaceName: 'PMO Standards',
        permalink: 'https://app.smartsheet.com/workspaces/1000',
        referenceSheets: {
          'Resource - Type': {
            sheetId: 2000,
            sheetName: 'Resource - Type',
            columnId: 3000,
            type: 'standard',
            values: ['Work', 'Material', 'Cost'],
          },
          'Resource - Department': {
            sheetId: 2001,
            sheetName: 'Resource - Department',
            columnId: 3001,
            type: 'discovered',
            values: ['Engineering', 'Marketing', 'Sales'],
          },
        },
      };
    });

    it('should configure Resource Type column to reference PMO Standards', async () => {
      // Create workspace and sheet first with columns
      await mockClient.createWorkspace({ name: 'PMO Standards' });
      const sheet = await mockClient.createSheetInWorkspace(1000, {
        name: 'Test Resources',
        columns: [
          { title: 'Resource Type', type: 'PICKLIST' },
          { title: 'Department', type: 'PICKLIST' },
        ],
      });
      const sheetId = sheet.id!;
      const resourceTypeColumnId = sheet.columns![0].id!;
      const departmentColumnId = sheet.columns![1].id!;

      await configureResourcePicklistColumns(
        mockClient,
        sheetId,
        resourceTypeColumnId,
        departmentColumnId,
        pmoStandards
      );

      const updates = mockClient.getColumnUpdates(sheetId);
      const typeUpdate = updates.find((u) => u.columnId === resourceTypeColumnId);

      expect(typeUpdate).toBeDefined();
      expect(typeUpdate?.column.type).toBe('PICKLIST');
      expect(typeUpdate?.column.options).toEqual({
        strict: true,
        options: [
          {
            value: {
              objectType: 'CELL_LINK',
              sheetId: 2000,
              columnId: 3000,
            },
          },
        ],
      });
    });

    it('should configure Department column to reference PMO Standards', async () => {
      // Create workspace and sheet first with columns
      await mockClient.createWorkspace({ name: 'PMO Standards' });
      const sheet = await mockClient.createSheetInWorkspace(1000, {
        name: 'Test Resources',
        columns: [
          { title: 'Resource Type', type: 'PICKLIST' },
          { title: 'Department', type: 'PICKLIST' },
        ],
      });
      const sheetId = sheet.id!;
      const resourceTypeColumnId = sheet.columns![0].id!;
      const departmentColumnId = sheet.columns![1].id!;

      await configureResourcePicklistColumns(
        mockClient,
        sheetId,
        resourceTypeColumnId,
        departmentColumnId,
        pmoStandards
      );

      const updates = mockClient.getColumnUpdates(sheetId);
      const deptUpdate = updates.find((u) => u.columnId === departmentColumnId);

      expect(deptUpdate).toBeDefined();
      expect(deptUpdate?.column.type).toBe('PICKLIST');
      expect(deptUpdate?.column.options).toEqual({
        strict: true,
        options: [
          {
            value: {
              objectType: 'CELL_LINK',
              sheetId: 2001,
              columnId: 3001,
            },
          },
        ],
      });
    });

    it('should configure both columns in single operation', async () => {
      // Create workspace and sheet first with columns
      await mockClient.createWorkspace({ name: 'PMO Standards' });
      const sheet = await mockClient.createSheetInWorkspace(1000, {
        name: 'Test Resources',
        columns: [
          { title: 'Resource Type', type: 'PICKLIST' },
          { title: 'Department', type: 'PICKLIST' },
        ],
      });
      const sheetId = sheet.id!;
      const resourceTypeColumnId = sheet.columns![0].id!;
      const departmentColumnId = sheet.columns![1].id!;

      await configureResourcePicklistColumns(
        mockClient,
        sheetId,
        resourceTypeColumnId,
        departmentColumnId,
        pmoStandards
      );

      const updates = mockClient.getColumnUpdates(sheetId);
      expect(updates).toHaveLength(2);
    });
  });

  describe('validateResource', () => {
    it('should validate valid resource', () => {
      const result = validateResource(sampleResource);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require Id', () => {
      const invalidResource: ProjectOnlineResource = {
        ...sampleResource,
        Id: '',
      };
      const result = validateResource(invalidResource);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Resource ID is required');
    });

    it('should require Name', () => {
      const invalidResource: ProjectOnlineResource = {
        ...sampleResource,
        Name: '',
      };
      const result = validateResource(invalidResource);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Resource Name is required');
    });

    it('should warn when Email is missing for Work resources', () => {
      const resource: ProjectOnlineResource = {
        ...sampleResource,
        ResourceType: 'Work',
        Email: undefined,
      };
      const result = validateResource(resource);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Work resource has no email address');
    });

    it('should not warn when Email is missing for Material resources', () => {
      const resource: ProjectOnlineResource = {
        ...sampleResource,
        ResourceType: 'Material',
        Email: undefined,
      };
      const result = validateResource(resource);
      expect(result.warnings).not.toContain('Work resource has no email address');
    });

    it('should warn when MaxUnits exceeds 1.0', () => {
      const resource: ProjectOnlineResource = {
        ...sampleResource,
        MaxUnits: 1.5,
      };
      const result = validateResource(resource);
      expect(result.warnings).toContain('Resource is overallocated (MaxUnits > 1.0)');
    });

    it('should warn when rates are negative', () => {
      const resource: ProjectOnlineResource = {
        ...sampleResource,
        StandardRate: -10,
      };
      const result = validateResource(resource);
      expect(result.warnings).toContain('Resource has negative rate value');
    });
  });
});
