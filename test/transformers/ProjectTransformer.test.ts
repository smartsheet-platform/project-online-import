import { configureProjectPicklistColumns } from '../../src/transformers/ProjectTransformer';
import { createPMOStandardsWorkspace } from '../../src/transformers/PMOStandardsTransformer';
import { MockSmartsheetClient } from '../mocks/MockSmartsheetClient';
import { SmartsheetPicklistOption } from '../../src/types/Smartsheet';

import {
  transformProjectToWorkspace,
  createProjectSummarySheet,
  validateProject,
} from '../../src/transformers/ProjectTransformer';
import { ProjectOnlineProject } from '../../src/types/ProjectOnline';

describe('ProjectTransformer', () => {
  const mockProject: ProjectOnlineProject = {
    Id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    Name: 'Website Redesign 2024',
    Description: 'Complete redesign of company website',
    Owner: 'John Doe',
    OwnerEmail: 'john.doe@example.com',
    StartDate: '2024-03-15T09:00:00Z',
    FinishDate: '2024-06-30T17:00:00Z',
    CreatedDate: '2024-03-01T10:00:00Z',
    ModifiedDate: '2024-03-15T14:30:00Z',
    ProjectStatus: 'Active',
    ProjectType: 'Website',
    Priority: 800,
    PercentComplete: 25,
  };

  describe('transformProjectToWorkspace', () => {
    it('should transform project to workspace with sanitized name', () => {
      const workspace = transformProjectToWorkspace(mockProject);

      expect(workspace.name).toBe('Website Redesign 2024');
      expect(workspace.id).toBeUndefined(); // ID assigned by Smartsheet
    });

    it('should sanitize project name with invalid characters', () => {
      const projectWithInvalidChars: ProjectOnlineProject = {
        ...mockProject,
        Name: 'Q1/Q2 Planning | Phase 1',
      };

      const workspace = transformProjectToWorkspace(projectWithInvalidChars);
      expect(workspace.name).toBe('Q1-Q2 Planning - Phase 1');
    });

    it('should truncate long project names', () => {
      const projectWithLongName: ProjectOnlineProject = {
        ...mockProject,
        Name: 'Very Long Project Name That Exceeds The Character Limit For Workspaces By Being Too Verbose And Detailed With Extra Words',
      };

      const workspace = transformProjectToWorkspace(projectWithLongName);
      expect(workspace.name.length).toBe(100);
      expect(workspace.name.endsWith('...')).toBe(true);
    });
  });

  describe('createProjectSummarySheet', () => {
    it('should create summary sheet with 15 columns', () => {
      const sheet = createProjectSummarySheet(mockProject, 'Website Redesign 2024');

      expect(sheet.name).toBe('Website Redesign 2024 - Summary');
      expect(sheet.columns).toHaveLength(15);

      // Check primary column
      expect(sheet.columns?.[1].title).toBe('Project Name');
      expect(sheet.columns?.[1].primary).toBe(true);

      // Check a few key columns
      expect(sheet.columns?.[0].title).toBe('Project Online Project ID');
      expect(sheet.columns?.[3].title).toBe('Owner');
      expect(sheet.columns?.[4].title).toBe('Start Date');
      expect(sheet.columns?.[7].title).toBe('Priority');
    });

    it('should create exactly one row with all project data', () => {
      const sheet = createProjectSummarySheet(mockProject, 'Website Redesign 2024');

      expect(sheet.rows).toBeDefined();
      expect(sheet.rows!.length).toBe(1);

      const row = sheet.rows![0];
      expect(row.cells).toBeDefined();
      expect(row.cells!.length).toBeGreaterThan(0);

      // Column 0: Project Online Project ID
      expect(row.cells![0].value).toBe(mockProject.Id);

      // Column 1: Project Name
      expect(row.cells![1].value).toBe(mockProject.Name);

      // Column 7: Priority (mapped)
      expect(row.cells![7].value).toBe('Very High'); // 800 → Very High

      // Column 8: % Complete
      expect(row.cells![8].value).toBe('25%');
    });

    it('should handle owner as contact object in correct column', () => {
      const sheet = createProjectSummarySheet(mockProject, 'Website Redesign 2024');

      const row = sheet.rows![0];

      // Column 3: Owner
      expect(row.cells![3].objectValue).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });

    it('should convert dates to YYYY-MM-DD format', () => {
      const sheet = createProjectSummarySheet(mockProject, 'Website Redesign 2024');

      const row = sheet.rows![0];

      // Column 4: Start Date
      expect(row.cells![4].value).toBe('2024-03-15');

      // Column 5: Finish Date
      expect(row.cells![5].value).toBe('2024-06-30');

      // Column 9: Project Online Created Date
      expect(row.cells![9].value).toBe('2024-03-01');

      // Column 10: Project Online Modified Date
      expect(row.cells![10].value).toBe('2024-03-15');
    });

    it('should handle project with minimal data', () => {
      const minimalProject: ProjectOnlineProject = {
        Id: 'minimal-id',
        Name: 'Minimal Project',
        CreatedDate: '2024-01-15T12:00:00Z',
        ModifiedDate: '2024-01-15T12:00:00Z',
      };

      const sheet = createProjectSummarySheet(minimalProject, 'Minimal Project');

      expect(sheet.rows).toBeDefined();
      expect(sheet.rows!.length).toBe(1);

      const row = sheet.rows![0];

      // Column 0: Project Online Project ID
      expect(row.cells![0].value).toBe('minimal-id');

      // Column 1: Project Name
      expect(row.cells![1].value).toBe('Minimal Project');

      // Column 2: Description (empty for minimal)
      expect(row.cells![2].value).toBe('');

      // Column 9: Project Online Created Date
      expect(row.cells![9].value).toBe('2024-01-15');

      // Column 10: Project Online Modified Date
      expect(row.cells![10].value).toBe('2024-01-15');
    });

    it('should handle missing optional fields with empty values', () => {
      const projectWithMissingFields: ProjectOnlineProject = {
        Id: 'test-id',
        Name: 'Test Project',
        CreatedDate: '2024-01-15T12:00:00Z',
        ModifiedDate: '2024-01-15T12:00:00Z',
        // Missing Description, Owner, StartDate, FinishDate, Status, Priority, PercentComplete
      };

      const sheet = createProjectSummarySheet(projectWithMissingFields, 'Test Project');
      const row = sheet.rows![0];

      // Column 2: Description (empty)
      expect(row.cells![2].value).toBe('');

      // Column 3: Owner (empty)
      expect(row.cells![3].value).toBe('');

      // Column 4: Start Date (empty)
      expect(row.cells![4].value).toBe('');

      // Column 5: Finish Date (empty)
      expect(row.cells![5].value).toBe('');

      // Column 6: Status (empty)
      expect(row.cells![6].value).toBe('');

      // Column 7: Priority (empty)
      expect(row.cells![7].value).toBe('');

      // Column 8: % Complete (empty)
      expect(row.cells![8].value).toBe('');
    });
  });

  describe('validateProject', () => {
    it('should validate valid project without errors', () => {
      const result = validateProject(mockProject);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing required fields', () => {
      const invalidProject = {
        Id: 'test-id',
        // Missing Name (required)
        CreatedDate: '2024-01-01T00:00:00Z',
        ModifiedDate: '2024-01-01T00:00:00Z',
      } as ProjectOnlineProject;

      const result = validateProject(invalidProject);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project Name is required');
    });

    it('should return error for empty project name', () => {
      const projectWithEmptyName: ProjectOnlineProject = {
        ...mockProject,
        Name: '   ',
      };

      const result = validateProject(projectWithEmptyName);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project Name is required');
    });

    it('should return warnings for missing optional fields', () => {
      const projectWithMissingOptional: ProjectOnlineProject = {
        Id: 'test-id',
        Name: 'Test Project',
        CreatedDate: '2024-01-01T00:00:00Z',
        ModifiedDate: '2024-01-01T00:00:00Z',
        // Missing Owner, StartDate, FinishDate
      };

      const result = validateProject(projectWithMissingOptional);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Project has no owner information');
      expect(result.warnings).toContain('Project has no start date');
      expect(result.warnings).toContain('Project has no finish date');
    });

    it('should validate project with all required fields', () => {
      const minimalValidProject: ProjectOnlineProject = {
        Id: 'test-id',
        Name: 'Test Project',
        Owner: 'Test Owner',
        OwnerEmail: 'test@example.com',
        StartDate: '2024-01-01T00:00:00Z',
        FinishDate: '2024-12-31T00:00:00Z',
        CreatedDate: '2024-01-01T00:00:00Z',
        ModifiedDate: '2024-01-01T00:00:00Z',
      };

      const result = validateProject(minimalValidProject);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('configureProjectPicklistColumns', () => {
    it('should configure Status column with strict picklist from PMO Standards', async () => {
      const mockClient = new MockSmartsheetClient();

      // Create PMO Standards workspace
      const pmoStandards = await createPMOStandardsWorkspace(mockClient);

      // Create a test sheet
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Name', type: 'TEXT_NUMBER', primary: true },
          { title: 'Status', type: 'PICKLIST' },
          { title: 'Priority', type: 'PICKLIST' },
        ],
      });

      const statusColumnId = sheet.columns![1].id!;
      const priorityColumnId = sheet.columns![2].id!;

      // Configure picklist columns
      await configureProjectPicklistColumns(
        mockClient,
        sheet.id!,
        statusColumnId,
        priorityColumnId,
        pmoStandards
      );

      // Verify Status column was updated with cross-sheet reference
      const updatedSheet = await mockClient.getSheet(sheet.id!);
      const statusColumn = updatedSheet.columns!.find((col) => col.id === statusColumnId);

      expect(statusColumn?.options?.strict).toBe(true);
      expect(statusColumn?.options?.options).toHaveLength(1);

      const statusOption = statusColumn?.options?.options?.[0] as SmartsheetPicklistOption;
      expect(statusOption.value.objectType).toBe('CELL_LINK');
      expect(statusOption.value.sheetId).toBe(
        pmoStandards.referenceSheets['Project - Status'].sheetId
      );
      expect(statusOption.value.columnId).toBe(
        pmoStandards.referenceSheets['Project - Status'].columnId
      );
    });

    it('should configure Priority column with strict picklist from PMO Standards', async () => {
      const mockClient = new MockSmartsheetClient();

      // Create PMO Standards workspace
      const pmoStandards = await createPMOStandardsWorkspace(mockClient);

      // Create a test sheet
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Name', type: 'TEXT_NUMBER', primary: true },
          { title: 'Status', type: 'PICKLIST' },
          { title: 'Priority', type: 'PICKLIST' },
        ],
      });

      const statusColumnId = sheet.columns![1].id!;
      const priorityColumnId = sheet.columns![2].id!;

      // Configure picklist columns
      await configureProjectPicklistColumns(
        mockClient,
        sheet.id!,
        statusColumnId,
        priorityColumnId,
        pmoStandards
      );

      // Verify Priority column was updated with cross-sheet reference
      const updatedSheet = await mockClient.getSheet(sheet.id!);
      const priorityColumn = updatedSheet.columns!.find((col) => col.id === priorityColumnId);

      expect(priorityColumn?.options?.strict).toBe(true);
      expect(priorityColumn?.options?.options).toHaveLength(1);

      const priorityOption = priorityColumn?.options?.options?.[0] as SmartsheetPicklistOption;
      expect(priorityOption.value.objectType).toBe('CELL_LINK');
      expect(priorityOption.value.sheetId).toBe(
        pmoStandards.referenceSheets['Project - Priority'].sheetId
      );
      expect(priorityOption.value.columnId).toBe(
        pmoStandards.referenceSheets['Project - Priority'].columnId
      );
    });

    it('should configure both columns in a single operation', async () => {
      const mockClient = new MockSmartsheetClient();
      const pmoStandards = await createPMOStandardsWorkspace(mockClient);

      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const sheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Test Sheet',
        columns: [
          { title: 'Name', type: 'TEXT_NUMBER', primary: true },
          { title: 'Status', type: 'PICKLIST' },
          { title: 'Priority', type: 'PICKLIST' },
        ],
      });

      const statusColumnId = sheet.columns![1].id!;
      const priorityColumnId = sheet.columns![2].id!;

      await configureProjectPicklistColumns(
        mockClient,
        sheet.id!,
        statusColumnId,
        priorityColumnId,
        pmoStandards
      );

      // Verify both columns are configured
      const updatedSheet = await mockClient.getSheet(sheet.id!);
      const statusColumn = updatedSheet.columns!.find((col) => col.id === statusColumnId);
      const priorityColumn = updatedSheet.columns!.find((col) => col.id === priorityColumnId);

      expect(statusColumn?.options?.strict).toBe(true);
      expect(priorityColumn?.options?.strict).toBe(true);
    });
  });
});
