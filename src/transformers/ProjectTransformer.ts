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
  SmartsheetColumnType,
} from '../types/Smartsheet';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { PMOStandardsWorkspaceInfo } from './PMOStandardsTransformer';
import {
  sanitizeWorkspaceName,
  convertDateTimeToDate,
  mapPriority,
  createContactObject,
  createSheetName,
  camelCaseToTitleCase,
  determineSmartsheetColumnType,
} from './utils';
import { getOrCreateSheet, copyWorkspace, addColumnsIfNotExist, getColumnMap, findSheetByPartialName } from '../util/SmartsheetHelpers';
import { ConfigManager } from '../util/ConfigManager';

/**
 * Fields to ignore when discovering unmapped project fields
 */
export const PROJECT_FIELDS_TO_IGNORE = new Set([
  'Tasks',
  'Resources', 
  'ProjectResources',
  'Assignments',
]);

/**
 * Core field mappings from Project Online to Smartsheet columns
 */
const CORE_FIELD_MAPPINGS: Record<string, string> = {
  Id: 'Project Online Project ID',
  Name: 'Project Name',
  Description: 'Description',
  Owner: 'Owner',
  StartDate: 'Start Date',
  FinishDate: 'Finish Date',
  ProjectStatus: 'Status',
  Priority: 'Priority',
  PercentComplete: '% Complete',
  CreatedDate: 'Project Online Created Date',
  LastSavedDate: 'Project Online Modified Date',
};

/**
 * Transform Project Online project to Smartsheet workspace
 */
export function transformProjectToWorkspace(project: ProjectOnlineProject): SmartsheetWorkspace {
  return {
    name: sanitizeWorkspaceName(project.Name),
  };
}

/**
 * Get template project summary sheet columns if template workspace is configured
 */
async function getTemplateProjectColumns(
  client: SmartsheetClient,
  templateWorkspaceId?: number
): Promise<SmartsheetColumn[]> {
  if (!templateWorkspaceId) {
    return [];
  }

  try {
    // Find project summary sheet in template workspace
    const projectSheet = await findSheetByPartialName(
      client,
      templateWorkspaceId,
      'Summary'
    );

    if (!projectSheet) {
      return [];
    }

    // Get full sheet details with columns
    const sheet = await client.sheets?.getSheet?.({ id: projectSheet.id });
    return sheet?.columns || [];
  } catch (error) {
    // Template access failed - fall back to no template columns
    return [];
  }
}

/**
 * Check if template sheet has matching column (case and space insensitive)
 */
function findTemplateColumnMatch(
  templateColumns: SmartsheetColumn[],
  projectOnlineFieldName: string
): SmartsheetColumn | null {
  const normalizedFieldName = projectOnlineFieldName.toLowerCase().replace(/\s+/g, '');
  
  return templateColumns.find(col => {
    if (!col.title) return false;
    const normalizedColumnTitle = col.title.toLowerCase().replace(/\s+/g, '');
    return normalizedColumnTitle === normalizedFieldName;
  }) || null;
}

/**
 * Create automatic field mapping for project summary sheet
 */
export async function createProjectFieldMapping(
  project: ProjectOnlineProject,
  client: SmartsheetClient,
  templateWorkspaceId?: number
): Promise<{
  coreColumns: SmartsheetColumn[];
  additionalColumns: SmartsheetColumn[];
  fieldMappings: Record<string, string>; // ProjectOnline field -> Smartsheet column title
}> {
  // Get core predefined columns
  const coreColumns = createProjectSummaryColumns();
  
  // Get template columns if available
  const templateColumns = await getTemplateProjectColumns(client, templateWorkspaceId);
  
  const additionalColumns: SmartsheetColumn[] = [];
  const fieldMappings: Record<string, string> = {};
  
  // Core mappings (use constants)
  Object.assign(fieldMappings, CORE_FIELD_MAPPINGS);

  // Process each Project Online field
  for (const [fieldName, value] of Object.entries(project)) {
    // Skip already mapped core fields, ignored fields, or object values
    if (fieldMappings[fieldName] || PROJECT_FIELDS_TO_IGNORE.has(fieldName) || 
        (value && typeof value === 'object')) {
      continue;
    }

    // Convert field name to title case
    const titleCaseFieldName = camelCaseToTitleCase(fieldName);
    
    // Check if template has matching column
    const templateMatch = findTemplateColumnMatch(templateColumns, titleCaseFieldName);
    
    if (templateMatch) {
      // Use template column (existing column will be reused)
      fieldMappings[fieldName] = templateMatch.title!;
    } else {
      // Create new column
      const columnType = determineSmartsheetColumnType(value);
      const newColumn: SmartsheetColumn = {
        title: titleCaseFieldName,
        type: columnType as SmartsheetColumnType,
        width: 120,
      };
      
      additionalColumns.push(newColumn);
      fieldMappings[fieldName] = titleCaseFieldName;
    }
  }

  return { coreColumns, additionalColumns, fieldMappings };
}

/**
 * Create enhanced project row with automatic field mapping
 */
export function createEnhancedProjectRow(
  project: ProjectOnlineProject,
  columnMap: Record<string, { id: number; type: string }>,
  fieldMappings: Record<string, string>
): SmartsheetRow {
  const cells: SmartsheetCell[] = [];

  // Process each Project Online field using the mapping
  for (const [poField, smartsheetColumn] of Object.entries(fieldMappings)) {
    const columnInfo = columnMap[smartsheetColumn];
    if (!columnInfo) continue;

    const value = (project as any)[poField];
    
    // Skip object values
    if (value && typeof value === 'object') {
      continue;
    }

    // Handle special field mappings
    let cellValue: any = value;
    
    if (poField === 'Owner' && smartsheetColumn === 'Owner') {
      // Create contact object if we have owner info
      const contact = createContactObject(project.Owner, (project as any).OwnerEmail);
      if (contact) {
        cells.push({
          columnId: columnInfo.id,
          objectValue: contact,
        });
        continue;
      }
      cellValue = project.Owner || '';
    } else if (poField === 'Priority' && typeof value === 'number') {
      cellValue = mapPriority(value);
    } else if (poField === 'PercentComplete' && typeof value === 'number') {
      cellValue = `${value}%`;
    } else if (columnInfo.type === 'DATE') {
      cellValue = value ? convertDateTimeToDate(value) : '';
    } else if (columnInfo.type === 'CHECKBOX') {
      cellValue = value ?? false;
    } else if (value === null || value === undefined) {
      continue; // Skip empty values
    }

    cells.push({
      columnId: columnInfo.id,
      value: cellValue,
    });
  }

  return {
    cells,
    toBottom: true,
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
export function createProjectSummaryColumns(): SmartsheetColumn[] {
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
    value: convertDateTimeToDate(project.LastSavedDate),
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
 * Populate project data into an existing summary sheet with enhanced field mapping
 */
export async function populateProjectSummary(
  client: SmartsheetClient,
  project: ProjectOnlineProject,
  summarySheetId: number,
  templateWorkspaceId?: number
): Promise<{ rowsCreated: number }> {
  // Create automatic field mapping
  const { additionalColumns, fieldMappings } = await createProjectFieldMapping(
    project,
    client,
    templateWorkspaceId
  );

  // Always ensure core columns exist (mandatory columns)
  const coreColumns = createProjectSummaryColumns();
  try {
    await addColumnsIfNotExist(client, summarySheetId, coreColumns);
  } catch (error) {
    // Columns might already exist, which is fine
    console.log('Some core columns already exist (expected)');
  }

  // Add any missing additional columns
  if (additionalColumns.length > 0) {
    try {
      await addColumnsIfNotExist(client, summarySheetId, additionalColumns);
    } catch (error) {
      console.error('Failed to add additional columns:', error);
      // Continue - we'll work with existing columns
    }
  }

  // Refresh column map after adding new columns
  const finalColumnMap = await getColumnMap(client, summarySheetId);

  // Create enhanced project row
  const row = createEnhancedProjectRow(project, finalColumnMap, fieldMappings);

  // Add the row to the sheet
  await client.sheets?.addRows?.({
    sheetId: summarySheetId,
    body: [row],
  });

  return { rowsCreated: 1 };
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
  await client.columns?.updateColumn?.({
    sheetId,
    columnId: statusColumnId,
    body: {
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
    },
  });

  // Configure Priority column to source from "Project - Priority" reference sheet
  const priorityReferenceSheet = pmoStandards.referenceSheets['Project - Priority'];
  await client.columns?.updateColumn?.({
    sheetId,
    columnId: priorityColumnId,
    body: {
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

  if (!project.LastSavedDate) {
    errors.push('Project ModifiedDate is required');
  }

  // Warnings for missing optional but important fields
  if (!project.Owner) {
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

/**
 * Class-based wrapper for integration tests
 * Provides the expected API while using the functional implementation
 */
export class ProjectTransformer {
  private templateWorkspaceId?: number;

  constructor(
    private client: SmartsheetClient,
    configManager?: ConfigManager
  ) {
    // Get template workspace ID from config (no default - creates blank workspace if not set)
    this.templateWorkspaceId = configManager?.get().templateWorkspaceId;
  }

  async transformProject(
    project: ProjectOnlineProject,
    workspaceId?: number
  ): Promise<{
    workspace: SmartsheetWorkspace;
    sheets: {
      summarySheet: { id: number; name: string };
      taskSheet: { id: number; name: string };
      resourceSheet: { id: number; name: string };
    };
  }> {
    // Validate project
    const validation = validateProject(project);
    if (!validation.valid) {
      throw new Error(`Invalid project: ${validation.errors.join(', ')}`);
    }

    // Transform to workspace structure
    const workspace = transformProjectToWorkspace(project);

    // NEW BEHAVIOR: If no workspaceId provided, create new workspace with sheets
    if (!workspaceId) {
      let newWorkspace: { id: number; permalink?: string };

      if (this.templateWorkspaceId) {
        // Use template workspace if configured
        newWorkspace = await copyWorkspace(this.client, this.templateWorkspaceId, workspace.name);
      } else {
        // Create blank workspace if no template configured
        if (!this.client.workspaces?.createWorkspace) {
          throw new Error('Smartsheet client does not support workspace creation');
        }
        const created = await this.client.workspaces.createWorkspace({
          body: {
            name: workspace.name,
          },
        });
        // Smartsheet SDK can return data in either .result or .data depending on the operation
        const createdData = created?.result || created?.data;
        if (!createdData?.id) {
          throw new Error('Failed to create workspace - no ID returned');
        }
        newWorkspace = { id: createdData.id, permalink: createdData.permalink };
      }
      workspace.id = newWorkspace.id;
      workspace.permalink = newWorkspace.permalink;

      // Create the three sheets in the new workspace
      const summarySheetName = createSheetName(workspace.name, 'Summary');
      const taskSheetName = createSheetName(workspace.name, 'Tasks');
      const resourceSheetName = createSheetName(workspace.name, 'Resources');

      // Step 1: Get or create summary sheet with just primary column
      const summarySheet = await getOrCreateSheet(this.client, workspace.id, {
        name: summarySheetName,
        columns: [
          {
            title: 'Project Name',
            type: 'TEXT_NUMBER',
            primary: true,
          },
        ],
      });

      // Step 2: Ensure ALL needed columns exist (addColumnsIfNotExist filters out existing ones)
      // Filter out system columns that can't be created via API AND the primary column we just created
      const allSummaryColumns = createProjectSummaryColumns();
      const systemColumnTypes = ['CREATED_DATE', 'MODIFIED_DATE', 'CREATED_BY', 'MODIFIED_BY'];
      const columnsToEnsure = allSummaryColumns
        .filter((col) => !systemColumnTypes.includes(col.type || ''))
        .filter((col) => col.title !== 'Project Name'); // Skip primary column we just created

      await addColumnsIfNotExist(this.client, summarySheet.id!, columnsToEnsure);

      const taskSheet = await getOrCreateSheet(this.client, workspace.id, {
        name: taskSheetName,
        columns: [
          {
            title: 'Task Name',
            type: 'TEXT_NUMBER',
            primary: true,
          },
        ],
      });

      const resourceSheet = await getOrCreateSheet(this.client, workspace.id, {
        name: resourceSheetName,
        columns: [
          {
            title: 'Resource Name',
            type: 'TEXT_NUMBER',
            primary: true,
          },
        ],
      });

      return {
        workspace,
        sheets: {
          summarySheet: {
            id: summarySheet.id!,
            name: summarySheet.name!,
          },
          taskSheet: {
            id: taskSheet.id!,
            name: taskSheet.name!,
          },
          resourceSheet: {
            id: resourceSheet.id!,
            name: resourceSheet.name!,
          },
        },
      };
    }

    // OLD BEHAVIOR: If workspaceId provided (for testing), create sheets using getOrCreateSheet
    workspace.id = workspaceId;

    // Step 1: Get or create summary sheet with just primary column
    const createdSummary = await getOrCreateSheet(this.client, workspaceId, {
      name: createSheetName(workspace.name, 'Summary'),
      columns: [
        {
          title: 'Project Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    });

    if (!createdSummary?.id) {
      throw new Error('Failed to get or create summary sheet');
    }

    // Step 2: Ensure ALL needed columns exist (addColumnsIfNotExist filters out existing ones)
    // Filter out system columns that can't be created via API AND the primary column we just created
    const allSummaryColumns = createProjectSummaryColumns();
    const systemColumnTypes = ['CREATED_DATE', 'MODIFIED_DATE', 'CREATED_BY', 'MODIFIED_BY'];
    const columnsToEnsure = allSummaryColumns
      .filter((col) => !systemColumnTypes.includes(col.type || ''))
      .filter((col) => col.title !== 'Project Name'); // Skip primary column we just created

    await addColumnsIfNotExist(this.client, createdSummary.id, columnsToEnsure);

    // Get or create resource sheet first (will be populated by ResourceTransformer)
    // If re-running, this will use the existing sheet
    const resourceSheet = await getOrCreateSheet(this.client, workspaceId, {
      name: createSheetName(workspace.name, 'Resources'),
      columns: [
        {
          title: 'Resource Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    });

    if (!resourceSheet?.id) {
      throw new Error('Failed to get or create resource sheet');
    }

    // Get or create task sheet (will be populated by TaskTransformer)
    // If re-running, this will use the existing sheet
    const taskSheet = await getOrCreateSheet(this.client, workspaceId, {
      name: createSheetName(workspace.name, 'Tasks'),
      columns: [
        {
          title: 'Task Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    });

    if (!taskSheet?.id) {
      throw new Error('Failed to get or create task sheet');
    }

    return {
      workspace: { ...workspace, id: workspaceId },
      sheets: {
        summarySheet: {
          id: createdSummary.id!,
          name: createdSummary.name!,
        },
        taskSheet: {
          id: taskSheet.id!,
          name: taskSheet.name!,
        },
        resourceSheet: {
          id: resourceSheet.id!,
          name: resourceSheet.name!,
        },
      },
    };
  }
}
