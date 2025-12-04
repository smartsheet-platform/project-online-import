/**
 * Project transformer - converts Project Online projects to Smartsheet workspaces
 * Based on transformation mapping specification
 */

import { ProjectOnlineProject } from '../types/ProjectOnline';
import {
  SmartsheetWorkspace,
  SmartsheetSheet,
  SmartsheetColumn,
  SmartsheetRow,
  SmartsheetCell,
} from '../types/Smartsheet';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { PMOStandardsWorkspaceInfo } from './PMOStandardsTransformer';
import {
  sanitizeWorkspaceName,
  convertDateTimeToDate,
  mapPriority,
  createContactObject,
} from './utils';

/**
 * Transform Project Online project to Smartsheet workspace
 */
export function transformProjectToWorkspace(project: ProjectOnlineProject): SmartsheetWorkspace {
  return {
    name: sanitizeWorkspaceName(project.Name),
  };
}

/**
 * Create Project Summary sheet structure
 * Sheet with 15 columns and 1 row containing project metadata
 */
export function createProjectSummarySheet(
  project: ProjectOnlineProject,
  projectName: string
): SmartsheetSheet {
  const columns: SmartsheetColumn[] = createProjectSummaryColumns();
  const rows: SmartsheetRow[] = [createProjectSummaryRow(project)];

  return {
    name: `${projectName} - Summary`,
    columns,
    rows,
  };
}

/**
 * Create columns for Project Summary sheet
 * Returns 15 columns for project metadata
 */
function createProjectSummaryColumns(): SmartsheetColumn[] {
  return [
    {
      title: 'Project Online Project ID',
      type: 'TEXT_NUMBER',
      width: 150,
      hidden: true,
      locked: true,
    },
    {
      title: 'Project Name',
      type: 'TEXT_NUMBER',
      primary: true,
      width: 200,
    },
    {
      title: 'Description',
      type: 'TEXT_NUMBER',
      width: 300,
    },
    {
      title: 'Owner',
      type: 'CONTACT_LIST',
      width: 150,
    },
    {
      title: 'Start Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Finish Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Status',
      type: 'PICKLIST',
      width: 120,
    },
    {
      title: 'Priority',
      type: 'PICKLIST',
      width: 120,
    },
    {
      title: '% Complete',
      type: 'TEXT_NUMBER',
      width: 100,
    },
    {
      title: 'Project Online Created Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Project Online Modified Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Created Date',
      type: 'CREATED_DATE',
      width: 120,
    },
    {
      title: 'Modified Date',
      type: 'MODIFIED_DATE',
      width: 120,
    },
    {
      title: 'Created By',
      type: 'CREATED_BY',
      width: 150,
    },
    {
      title: 'Modified By',
      type: 'MODIFIED_BY',
      width: 150,
    },
  ];
}

/**
 * Create single row for Project Summary sheet with all project data
 */
function createProjectSummaryRow(project: ProjectOnlineProject): SmartsheetRow {
  const cells: SmartsheetCell[] = [];

  // Column 0: Project Online Project ID
  cells.push({
    columnId: 0,
    value: project.Id,
  });

  // Column 1: Project Name
  cells.push({
    columnId: 1,
    value: project.Name,
  });

  // Column 2: Description
  cells.push({
    columnId: 2,
    value: project.Description || '',
  });

  // Column 3: Owner (Contact)
  const ownerContact = createContactObject(project.Owner, project.OwnerEmail);
  if (ownerContact) {
    cells.push({
      columnId: 3,
      objectValue: ownerContact,
    });
  } else {
    cells.push({
      columnId: 3,
      value: '',
    });
  }

  // Column 4: Start Date
  cells.push({
    columnId: 4,
    value: project.StartDate ? convertDateTimeToDate(project.StartDate) : '',
  });

  // Column 5: Finish Date
  cells.push({
    columnId: 5,
    value: project.FinishDate ? convertDateTimeToDate(project.FinishDate) : '',
  });

  // Column 6: Status
  cells.push({
    columnId: 6,
    value: project.ProjectStatus || '',
  });

  // Column 7: Priority
  cells.push({
    columnId: 7,
    value: project.Priority !== undefined ? mapPriority(project.Priority) : '',
  });

  // Column 8: % Complete
  cells.push({
    columnId: 8,
    value: project.PercentComplete !== undefined ? `${project.PercentComplete}%` : '',
  });

  // Column 9: Project Online Created Date
  cells.push({
    columnId: 9,
    value: convertDateTimeToDate(project.CreatedDate),
  });

  // Column 10: Project Online Modified Date
  cells.push({
    columnId: 10,
    value: convertDateTimeToDate(project.ModifiedDate),
  });

  // Columns 11-14: System-generated (Created Date, Modified Date, Created By, Modified By)
  // These are populated by Smartsheet automatically, no values needed

  return {
    rowNumber: 1,
    cells,
    toBottom: true,
  };
}

/**
 * Configure strict picklist columns to source from PMO Standards sheets
 * Must be called after sheet creation to update Status and Priority columns
 */
export async function configureProjectPicklistColumns(
  client: SmartsheetClient,
  sheetId: number,
  statusColumnId: number,
  priorityColumnId: number,
  pmoStandards: PMOStandardsWorkspaceInfo
): Promise<void> {
  // Configure Status column to source from "Project - Status" reference sheet
  const statusReferenceSheet = pmoStandards.referenceSheets['Project - Status'];
  await client.updateColumn(sheetId, statusColumnId, {
    type: 'PICKLIST',
    options: {
      strict: true,
      options: [
        {
          value: {
            objectType: 'CELL_LINK',
            sheetId: statusReferenceSheet.sheetId,
            columnId: statusReferenceSheet.columnId,
          },
        },
      ],
    },
  });

  // Configure Priority column to source from "Project - Priority" reference sheet
  const priorityReferenceSheet = pmoStandards.referenceSheets['Project - Priority'];
  await client.updateColumn(sheetId, priorityColumnId, {
    type: 'PICKLIST',
    options: {
      strict: true,
      options: [
        {
          value: {
            objectType: 'CELL_LINK',
            sheetId: priorityReferenceSheet.sheetId,
            columnId: priorityReferenceSheet.columnId,
          },
        },
      ],
    },
  });
}

/**
 * Validate project data before transformation
 */
export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProject(project: ProjectOnlineProject): ProjectValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!project.Id) {
    errors.push('Project ID is required');
  }

  if (!project.Name || project.Name.trim() === '') {
    errors.push('Project Name is required');
  }

  if (!project.CreatedDate) {
    errors.push('Project CreatedDate is required');
  }

  if (!project.ModifiedDate) {
    errors.push('Project ModifiedDate is required');
  }

  // Warnings for missing optional but important fields
  if (!project.Owner && !project.OwnerEmail) {
    warnings.push('Project has no owner information');
  }

  if (!project.StartDate) {
    warnings.push('Project has no start date');
  }

  if (!project.FinishDate) {
    warnings.push('Project has no finish date');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
