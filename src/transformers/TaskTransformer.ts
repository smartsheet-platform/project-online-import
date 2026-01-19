import {
  ProjectOnlineTask,
  PMOStandardsWorkspaceInfo,
  SmartsheetColumn,
  SmartsheetRow,
  SmartsheetCell,
} from '../types/ProjectOnline';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { convertDateTimeToDate, convertDurationToHoursString } from './utils';
import { getColumnMap, addColumnsIfNotExist } from '../util/SmartsheetHelpers';
import { Logger } from '../util/Logger';

/**
 * Task transformer - converts Project Online Tasks to Smartsheet Tasks sheet rows
 */

interface TasksSheetResult {
  sheetId: number;
  sheetName: string;
  rowsCreated: number;
  columns: SmartsheetColumn[];
}

interface AssignmentColumnDefinition {
  type: 'MULTI_CONTACT_LIST' | 'MULTI_PICKLIST';
  resourceType: 'Work' | 'Material' | 'Cost';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface PredecessorInfo {
  rowNumber: number;
  type: string;
  lag: string | null;
}

/**
 * Create Tasks sheet with all columns and rows
 */
export async function createTasksSheet(
  client: SmartsheetClient,
  workspaceId: number,
  projectName: string,
  tasks: ProjectOnlineTask[],
  pmoStandards: PMOStandardsWorkspaceInfo
): Promise<TasksSheetResult> {
  const sheetName = `${projectName} - Tasks`;

  // Create sheet with columns
  const columns = createTasksSheetColumns(projectName);
  const sheet = await client.createSheetInWorkspace?.(workspaceId, {
    name: sheetName,
    columns,
  });

  if (!sheet) {
    throw new Error('Failed to create task sheet');
  }

  const sheetId = sheet.id!;

  // Enable dependencies (project sheet configuration)
  // Note: Gantt view is automatically enabled when dependencies are enabled
  await client.sheets?.updateSheet?.({
    sheetId,
    body: {
      dependenciesEnabled: true,
    },
  });

  // Build column ID map
  const columnMap: Record<string, number> = {};
  sheet.columns?.forEach((col: SmartsheetColumn) => {
    if (col.title && col.id) {
      columnMap[col.title] = col.id;
    }
  });

  // Create rows for all tasks
  const rows = tasks.map((task) => createTaskRow(task, columnMap, tasks));
  if (rows.length > 0) {
    await client.addRows?.(sheetId, rows);
  }

  // Configure picklist columns to reference PMO Standards
  const statusColumnId = columnMap['Status'];
  const priorityColumnId = columnMap['Priority'];
  const constraintColumnId = columnMap['Constraint Type'];

  await configureTaskPicklistColumns(
    client,
    sheetId,
    statusColumnId,
    priorityColumnId,
    constraintColumnId,
    pmoStandards
  );

  return {
    sheetId,
    sheetName,
    rowsCreated: rows.length,
    columns: sheet.columns || [],
  };
}

/**
 * Create column definitions for Tasks sheet
 */
export function createTasksSheetColumns(_projectName: string): SmartsheetColumn[] {
  return [
    // Primary column
    {
      title: 'Task Name',
      type: 'TEXT_NUMBER',
      primary: true,
      width: 300,
    },
    // Hidden GUID
    {
      title: 'Project Online Task ID',
      type: 'TEXT_NUMBER',
      hidden: true,
      locked: true,
      width: 150,
    },
    // Project sheet system columns
    {
      title: 'Start Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'End Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Duration',
      type: 'DURATION',
      width: 80,
    },
    // Task properties
    {
      title: '% Complete',
      type: 'TEXT_NUMBER',
      width: 100,
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
      title: 'Work (hrs)',
      type: 'TEXT_NUMBER',
      width: 100,
    },
    {
      title: 'Actual Work (hrs)',
      type: 'TEXT_NUMBER',
      width: 100,
    },
    {
      title: 'Milestone',
      type: 'CHECKBOX',
      width: 80,
    },
    {
      title: 'Notes',
      type: 'TEXT_NUMBER',
      width: 250,
    },
    {
      title: 'Predecessors',
      type: 'PREDECESSOR',
      width: 150,
    },
    {
      title: 'Constraint Type',
      type: 'PICKLIST',
      width: 120,
    },
    {
      title: 'Constraint Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Deadline',
      type: 'DATE',
      width: 120,
    },
    // Project Online metadata
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
    // Assignment resources
    {
      title: 'Resources',
      type: 'MULTI_CONTACT_LIST',
      width: 200,
    },
  ];
}

/**
 * Generate 3-4 letter prefix from project name for Task IDs
 * Currently unused - will be needed when AUTO_NUMBER columns are added
 */
// function generateTaskPrefix(projectName: string): string {
//   // Clean and split into words
//   const cleanName = projectName.replace(/[^a-zA-Z0-9\s]/g, ' ');
//   const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

//   if (words.length === 0) {
//     return 'TSK';
//   }

//   // Collect initials from all words
//   const initials = words.map((w) => w[0].toUpperCase()).join('');

//   if (initials.length >= 3) {
//     return initials.substring(0, 4);
//   }

//   // Not enough initials, supplement from first word
//   const firstWord = words[0].toUpperCase();
//   return (initials + firstWord.substring(1)).substring(0, 4);
// }

/**
 * Create a Smartsheet row from a Project Online Task
 */
export function createTaskRow(
  task: ProjectOnlineTask,
  columnMap: Record<string, number>,
  allTasks: ProjectOnlineTask[] = []
): SmartsheetRow {
  const cells: SmartsheetCell[] = [];

  // Task Name
  if (columnMap['Task Name']) {
    cells.push({
      columnId: columnMap['Task Name'],
      value: task.Name,
    });
  }

  // Project Online Task ID (hidden GUID)
  if (columnMap['Project Online Task ID']) {
    cells.push({
      columnId: columnMap['Project Online Task ID'],
      value: task.Id,
    });
  }

  // Start Date
  if (columnMap['Start Date'] && task.Start) {
    cells.push({
      columnId: columnMap['Start Date'],
      value: convertDateTimeToDate(task.Start),
    });
  }

  // End Date
  if (columnMap['End Date'] && task.Finish) {
    cells.push({
      columnId: columnMap['End Date'],
      value: convertDateTimeToDate(task.Finish),
    });
  }

  // Duration (decimal days for project sheet)
  if (columnMap['Duration'] && task.Duration) {
    cells.push({
      columnId: columnMap['Duration'],
      value: convertDurationToDecimalDays(task.Duration),
    });
  }

  // % Complete
  if (columnMap['% Complete'] && task.PercentComplete !== undefined) {
    cells.push({
      columnId: columnMap['% Complete'],
      value: `${task.PercentComplete}%`,
    });
  }

  // Status (derived from % Complete)
  if (columnMap['Status'] && task.PercentComplete !== undefined) {
    cells.push({
      columnId: columnMap['Status'],
      value: deriveTaskStatus(task.PercentComplete),
    });
  }

  // Priority
  if (columnMap['Priority'] && task.Priority !== undefined) {
    cells.push({
      columnId: columnMap['Priority'],
      value: mapTaskPriority(task.Priority),
    });
  }

  // Work (hrs)
  if (columnMap['Work (hrs)'] && task.Work) {
    cells.push({
      columnId: columnMap['Work (hrs)'],
      value: convertDurationToHoursString(task.Work),
    });
  }

  // Actual Work (hrs)
  if (columnMap['Actual Work (hrs)'] && task.ActualWork) {
    cells.push({
      columnId: columnMap['Actual Work (hrs)'],
      value: convertDurationToHoursString(task.ActualWork),
    });
  }

  // Milestone
  if (columnMap['Milestone']) {
    cells.push({
      columnId: columnMap['Milestone'],
      value: task.IsMilestone || false,
    });
  }

  // Notes
  if (columnMap['Notes'] && task.TaskNotes) {
    cells.push({
      columnId: columnMap['Notes'],
      value: task.TaskNotes,
    });
  }

  // Predecessors - convert from Project Online to Smartsheet format
  if (columnMap['Predecessors'] && task.Predecessors?.results?.length) {
    const predecessorValue = mapPredecessorsToSmartsheet(task.Predecessors.results, allTasks);
    if (predecessorValue) {
      cells.push({
        columnId: columnMap['Predecessors'],
        value: predecessorValue,
      });
    }
  }

  // Constraint Type
  if (columnMap['Constraint Type'] && task.ConstraintType) {
    cells.push({
      columnId: columnMap['Constraint Type'],
      value: task.ConstraintType,
    });
  }

  // Constraint Date
  if (columnMap['Constraint Date'] && task.ConstraintDate) {
    cells.push({
      columnId: columnMap['Constraint Date'],
      value: convertDateTimeToDate(task.ConstraintDate),
    });
  }

  // Deadline
  if (columnMap['Deadline'] && task.Deadline) {
    cells.push({
      columnId: columnMap['Deadline'],
      value: convertDateTimeToDate(task.Deadline),
    });
  }

  // Project Online Created Date
  if (columnMap['Project Online Created Date'] && task.CreatedDate) {
    cells.push({
      columnId: columnMap['Project Online Created Date'],
      value: convertDateTimeToDate(task.CreatedDate),
    });
  }

  // Project Online Modified Date
  if (columnMap['Project Online Modified Date'] && task.ModifiedDate) {
    cells.push({
      columnId: columnMap['Project Online Modified Date'],
      value: convertDateTimeToDate(task.ModifiedDate),
    });
  }

  // Build row object
  const row: SmartsheetRow = {
    cells,
  };

  // Handle positioning based on hierarchy level
  // Project Online OutlineLevel: 1 = top level, 2 = first indent, 3 = second indent, etc.
  // Smartsheet indent: 0 = top level, 1 = first indent, 2 = second indent, etc.
  const outlineLevel = task.OutlineLevel || 1; // Default to top level

  if (outlineLevel > 1) {
    // For indented tasks, use indent (cannot use toBottom with indent)
    row.indent = outlineLevel - 1; // Convert PO level to Smartsheet indent
  } else {
    // For top-level tasks (OutlineLevel = 1), use toBottom
    row.toBottom = true;
  }

  return row;

}

/**
 * Convert ISO8601 duration to decimal days for project sheet Duration column
 */
function convertDurationToDecimalDays(isoDuration: string): number {
  // Parse ISO8601 duration to hours
  const hours = parseHoursFromISO8601(isoDuration);

  // Convert to days (8-hour workday)
  const days = hours / 8;

  return Math.round(days * 100) / 100; // Round to 2 decimals
}

/**
 * Parse hours from ISO8601 duration string
 */
function parseHoursFromISO8601(duration: string): number {
  // Handle common patterns: PT40H, P5D, PT480M
  if (duration.startsWith('PT') && duration.includes('H')) {
    const hours = parseFloat(duration.replace('PT', '').replace('H', ''));
    return hours;
  }

  if (duration.startsWith('P') && duration.includes('D')) {
    const days = parseFloat(duration.replace('P', '').replace('D', ''));
    return days * 8; // Assume 8-hour workday
  }

  if (duration.startsWith('PT') && duration.includes('M')) {
    const minutes = parseFloat(duration.replace('PT', '').replace('M', ''));
    return minutes / 60;
  }

  return 0;
}

/**
 * Derive task status from completion percentage
 */
export function deriveTaskStatus(percentComplete: number): string {
  if (percentComplete === 0) {
    return 'Not Started';
  } else if (percentComplete === 100) {
    return 'Complete';
  } else {
    return 'In Progress';
  }
}

/**
 * Map Project Online priority (0-1000) to 7-level picklist
 */
export function mapTaskPriority(priority: number): string {
  if (priority >= 1000) {
    return 'Highest';
  } else if (priority >= 800) {
    return 'Very High';
  } else if (priority >= 600) {
    return 'Higher';
  } else if (priority >= 500) {
    return 'Medium';
  } else if (priority >= 400) {
    return 'Lower';
  } else if (priority >= 200) {
    return 'Very Low';
  } else {
    return 'Lowest';
  }
}

/**
 * Parse predecessor string to structured format
 */
export function parseTaskPredecessors(predecessorStr: string): PredecessorInfo[] {
  if (!predecessorStr || predecessorStr.trim() === '') {
    return [];
  }

  const predecessors: PredecessorInfo[] = [];
  const parts = predecessorStr.split(',').map((p) => p.trim());

  for (const part of parts) {
    // Parse format: "5FS+2d" or "8SS-1d" or "3"
    const match = part.match(/^(\d+)(FS|SS|FF|SF)?([+-]\d+[dwm])?$/i);

    if (match) {
      predecessors.push({
        rowNumber: parseInt(match[1], 10),
        type: match[2] || 'FS', // Default to FS
        lag: match[3] || null,
      });
    }
  }

  return predecessors;
}

/**
 * Map Project Online predecessors to Smartsheet predecessor format
 * Project Online predecessors contain task references, we need to convert to row numbers
 */
export function mapPredecessorsToSmartsheet(
  predecessors: any[],
  allTasks: ProjectOnlineTask[]
): string | null {
  if (!predecessors || predecessors.length === 0) {
    return null;
  }

  const predecessorStrings: string[] = [];
  
  // Map DependencyType values to Smartsheet format
  const linkTypeMap: Record<number, string> = {
    0: 'FF',  // Finish-to-Finish
    1: 'FS',  // Finish-to-Start
    2: 'SF',  // Start-to-Finish
    3: 'SS'   // Start-to-Start
  };
  
  for (const predecessor of predecessors) {
    // Find the predecessor task index in the tasks array (1-based for Smartsheet)
    const taskIndex = allTasks.findIndex(task => task.Id === predecessor.PredecessorTaskId);
    if (taskIndex >= 0) {
      // Smartsheet uses 1-based row numbers
      const rowNumber = taskIndex + 1;
      
      // Get dependency type (default to FS if not specified)
      const linkType = linkTypeMap[predecessor.DependencyType] || 'FS';
      
      // Build predecessor string with lag if present
      let predecessorStr = `${rowNumber}${linkType}`;
      
      // Add lag duration if present
      if (predecessor.LinkLag && predecessor.LinkLagDuration) {
        // Convert LinkLagDuration (ISO 8601 duration) to Smartsheet format
        const lagStr = parseLagDuration(predecessor.LinkLagDuration);
        if (lagStr) {
          const sign = predecessor.LinkLag >= 0 ? '+' : '';
          predecessorStr += `${sign}${lagStr}`;
        }
      }
      
      predecessorStrings.push(predecessorStr);
    }
  }

  return predecessorStrings.length > 0 ? predecessorStrings.join(',') : null;
}

/**
 * Parse ISO 8601 duration to Smartsheet lag format
 * Examples: PT1H -> 1h, PT2D -> 2d, PT8H -> 1d (8h = 1 workday)
 */
function parseLagDuration(duration: string): string | null {
  if (!duration) return null;
  
  // Simple parsing - you may need to adjust based on your needs
  const match = duration.match(/PT(\d+)([DHMS])/i);
  if (match) {
    const value = match[1];
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'd': return `${value}d`;
      case 'h': 
        // Convert hours to days if 8+ hours (assuming 8-hour workday)
        const hours = parseInt(value);
        if (hours >= 8 && hours % 8 === 0) {
          return `${hours / 8}d`;
        }
        return `${value}h`;
      case 'm': return `${value}m`;
      default: return `${value}d`; // Default to days
    }
  }
  
  return null;
}

/**
 * Configure Task picklist columns to reference PMO Standards sheets
 */
export async function configureTaskPicklistColumns(
  client: SmartsheetClient,
  sheetId: number,
  statusColumnId: number,
  priorityColumnId: number,
  constraintColumnId: number,
  pmoStandards: PMOStandardsWorkspaceInfo
): Promise<void> {
  // Configure Status column
  const statusRef = pmoStandards.referenceSheets['Task - Status'];
  await client.columns?.updateColumn?.({
    sheetId,
    columnId: statusColumnId,
    body: {
      type: 'PICKLIST',
      options: {
        options: [
          {
            value: {
              objectType: 'CELL_LINK',
              sheetId: statusRef.sheetId,
              columnId: statusRef.columnId,
            },
          },
        ],
      },
    },
  });

  // Configure Priority column
  const priorityRef = pmoStandards.referenceSheets['Task - Priority'];
  await client.columns?.updateColumn?.({
    sheetId,
    columnId: priorityColumnId,
    body: {
      type: 'PICKLIST',
      options: {
        options: [
          {
            value: {
              objectType: 'CELL_LINK',
              sheetId: priorityRef.sheetId,
              columnId: priorityRef.columnId,
            },
          },
        ],
      },
    },
  });

  // Configure Constraint Type column
  const constraintRef = pmoStandards.referenceSheets['Task - Constraint Type'];
  await client.columns?.updateColumn?.({
    sheetId,
    columnId: constraintColumnId,
    body: {
      type: 'PICKLIST',
      options: {
        options: [
          {
            value: {
              objectType: 'CELL_LINK',
              sheetId: constraintRef.sheetId,
              columnId: constraintRef.columnId,
            },
          },
        ],
      },
    },
  });
}

/**
 * Discover assignment column types from resources
 */
export function discoverAssignmentColumns(
  resources: Array<{ ResourceType?: string }>
): Record<string, AssignmentColumnDefinition> {
  const columns: Record<string, AssignmentColumnDefinition> = {};

  for (const resource of resources) {
    const resourceType = resource.ResourceType || 'Work';

    if (resourceType === 'Work') {
      columns['Assigned To'] = {
        type: 'MULTI_CONTACT_LIST',
        resourceType: 'Work',
      };
    } else if (resourceType === 'Material') {
      columns['Materials'] = {
        type: 'MULTI_PICKLIST',
        resourceType: 'Material',
      };
    } else if (resourceType === 'Cost') {
      columns['Cost Resources'] = {
        type: 'MULTI_PICKLIST',
        resourceType: 'Cost',
      };
    }
  }

  return columns;
}

/**
 * Configure assignment columns to source from Resources sheet
 *
 * @param client Smartsheet client
 * @param tasksSheetId Tasks sheet ID
 * @param assignmentColumnIds Map of assignment column names to IDs in Tasks sheet
 * @param resourcesSheetId Resources sheet ID
 * @param resourcesColumnIds Map of resource type column names to IDs in Resources sheet
 * @param assignmentColumns Assignment column definitions discovered from resources
 */
export async function configureAssignmentColumns(
  client: SmartsheetClient,
  tasksSheetId: number,
  assignmentColumnIds: Record<string, number>,
  resourcesSheetId: number,
  resourcesColumnIds: Record<string, number>,
  assignmentColumns: Record<string, AssignmentColumnDefinition>
): Promise<void> {
  // Configure each assignment column to reference the corresponding Resources sheet column
  for (const [columnName, definition] of Object.entries(assignmentColumns)) {
    const tasksColumnId = assignmentColumnIds[columnName];
    if (!tasksColumnId) continue;

    if (definition.type === 'MULTI_CONTACT_LIST' && definition.resourceType === 'Work') {
      // Configure "Assigned To" column to source from "Team Members" in Resources sheet
      const teamMembersColumnId = resourcesColumnIds['Team Members'];
      if (teamMembersColumnId) {
        await client.columns?.updateColumn?.({
          sheetId: tasksSheetId,
          columnId: tasksColumnId,
          body: {
            type: 'MULTI_CONTACT_LIST',
            contactOptions: [
              {
                sheetId: resourcesSheetId,
                columnId: teamMembersColumnId,
              },
            ],
          },
        });
      }
    } else if (definition.type === 'MULTI_PICKLIST' && definition.resourceType === 'Material') {
      // Configure "Materials" column to source from "Materials" in Resources sheet
      const materialsColumnId = resourcesColumnIds['Materials'];
      if (materialsColumnId) {
        await client.columns?.updateColumn?.({
          sheetId: tasksSheetId,
          columnId: tasksColumnId,
          body: {
            type: 'MULTI_PICKLIST',
            options: [
              {
                value: {
                  objectType: 'CELL_LINK',
                  sheetId: resourcesSheetId,
                  columnId: materialsColumnId,
                },
              },
            ],
          },
        });
      }
    } else if (definition.type === 'MULTI_PICKLIST' && definition.resourceType === 'Cost') {
      // Configure "Cost Resources" column to source from "Cost Resources" in Resources sheet
      const costResourcesColumnId = resourcesColumnIds['Cost Resources'];
      if (costResourcesColumnId) {
        await client.columns?.updateColumn?.({
          sheetId: tasksSheetId,
          columnId: tasksColumnId,
          body: {
            type: 'MULTI_PICKLIST',
            options: [
              {
                value: {
                  objectType: 'CELL_LINK',
                  sheetId: resourcesSheetId,
                  columnId: costResourcesColumnId,
                },
              },
            ],
          },
        });
      }
    }
  }
}

/**
 * Validate task data
 */
export function validateTask(task: ProjectOnlineTask): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!task.Name || task.Name.trim() === '') {
    errors.push('Task Name is required');
  }

  // Priority range warning
  if (
    task.Priority !== undefined &&
    task.Priority !== null &&
    (task.Priority < 0 || task.Priority > 1000)
  ) {
    warnings.push(`Priority value ${task.Priority} is outside normal range (0-1000)`);
  }

  // Percent complete range
  if (
    task.PercentComplete !== undefined &&
    task.PercentComplete !== null &&
    (task.PercentComplete < 0 || task.PercentComplete > 100)
  ) {
    warnings.push(`Percent Complete ${task.PercentComplete} is outside valid range (0-100)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Class-based wrapper for integration tests
 * Provides the expected API while using the functional implementation
 */
export class TaskTransformer {
  private logger?: Logger;

  constructor(
    private client: SmartsheetClient,
    logger?: Logger
  ) {
    this.logger = logger;
  }

  async transformTasks(
    tasks: ProjectOnlineTask[],
    sheetId: number
  ): Promise<{ rowsCreated: number; sheetId: number; assignmentsProcessed: number }> {

    for (const task of tasks) {
      const validation = validateTask(task);
      if (!validation.isValid) {
        throw new Error(`Invalid task ${task.Name}: ${validation.errors.join(', ')}`);
      }
    }
    let totalAssignmentsProcessed = 0;
   
    // The sheet was created by ProjectTransformer with only a primary "Task Name" column
    // We need to add all the task columns before we can add rows
    // For re-run resiliency, we check if columns exist before adding

    // Get all task columns (this returns the full column structure including Task Name)
    const allTaskColumns = createTasksSheetColumns('Project'); // Use a placeholder name

    // Remove the first column (Task Name) since it already exists as the primary column
    const columnsToAdd = allTaskColumns.slice(1);

    this.logger?.debug(
      `Adding ${columnsToAdd.length} columns to task sheet ${sheetId} (skipping existing)`
    );

    // Use resiliency helper to add columns (skips existing ones)
    // Don't specify index - let Smartsheet append columns to end of sheet
    const addedColumns = await addColumnsIfNotExist(this.client, sheetId, columnsToAdd);

    // Build column map from results
    const columnMap: Record<string, number> = {};

    // First, get the existing Task Name column from the sheet
    const existingColumnMap = await getColumnMap(this.client, sheetId);
    if (existingColumnMap['Task Name']) {
      columnMap['Task Name'] = existingColumnMap['Task Name'].id;
      this.logger?.debug(`Task Name column ID: ${existingColumnMap['Task Name'].id}`);
    }

    // Add all other columns from the add results
    for (const result of addedColumns) {
      columnMap[result.title] = result.id;
      this.logger?.debug(
        `Column ${result.title} - ID: ${result.id}, ${result.wasCreated ? 'newly created' : 'already existed'}`
      );
    }

    this.logger?.debug(
      `Final columnMap has ${Object.keys(columnMap).length} columns: ${Object.keys(columnMap).join(', ')}`
    );

    // Note: Dependencies should already be enabled on sheets created from template
    // For test sheets, dependencies will be auto-enabled when predecessor column is added

    // Helper function to build cells for a task
    const buildCells = (task: ProjectOnlineTask): SmartsheetCell[] => {
      const cells: SmartsheetCell[] = [];

      if (columnMap['Resources'] && task.Assignments?.results && task.Assignments.results.length > 0) {
        const workAssignments = task.Assignments.results.filter(a => a.Resource && a.Resource.Name && a.Resource.DefaultBookingType === 1);
        totalAssignmentsProcessed += workAssignments.length;
        
        const contacts = workAssignments.map(a => ({
          objectType: 'CONTACT' as const,
          name: a.Resource!.Name,
          email: a.Resource!.Email
        }));
                
        if (contacts.length > 0) {
          cells.push({
            columnId: columnMap['Resources'],
            objectValue: {
              objectType: 'MULTI_CONTACT',
              values: contacts
            }
          });
        }
      }

      if (columnMap['Task Name']) {
        cells.push({ columnId: columnMap['Task Name'], value: task.Name });
      }
      if (columnMap['Project Online Task ID']) {
        cells.push({ columnId: columnMap['Project Online Task ID'], value: task.Id });
      }
      if (columnMap['Start Date'] && task.Start) {
        cells.push({ columnId: columnMap['Start Date'], value: convertDateTimeToDate(task.Start) });
      }
      if (columnMap['End Date'] && task.Finish) {
        cells.push({ columnId: columnMap['End Date'], value: convertDateTimeToDate(task.Finish) });
      }
      // NOTE: Duration is auto-calculated by Smartsheet from Start/End dates
      // Do NOT set it directly - it will cause a 500 error
      // if (columnMap['Duration'] && task.Duration) {
      //   cells.push({ columnId: columnMap['Duration'], value: convertDurationToDecimalDays(task.Duration) });
      // }
      if (columnMap['% Complete'] && task.PercentComplete !== undefined) {
        cells.push({ columnId: columnMap['% Complete'], value: `${task.PercentComplete}%` });
      }
      if (columnMap['Status'] && task.PercentComplete !== undefined) {
        cells.push({
          columnId: columnMap['Status'],
          value: deriveTaskStatus(task.PercentComplete),
        });
      }
      if (columnMap['Priority'] && task.Priority !== undefined) {
        cells.push({ columnId: columnMap['Priority'], value: mapTaskPriority(task.Priority) });
      }
      if (columnMap['Work (hrs)'] && task.Work) {
        cells.push({
          columnId: columnMap['Work (hrs)'],
          value: convertDurationToHoursString(task.Work),
        });
      }
      if (columnMap['Actual Work (hrs)'] && task.ActualWork) {
        cells.push({
          columnId: columnMap['Actual Work (hrs)'],
          value: convertDurationToHoursString(task.ActualWork),
        });
      }
      if (columnMap['Milestone']) {
        cells.push({ columnId: columnMap['Milestone'], value: task.IsMilestone || false });
      }
      if (columnMap['Notes'] && task.TaskNotes) {
        cells.push({ columnId: columnMap['Notes'], value: task.TaskNotes });
      }
      if (columnMap['Predecessors'] && task.Predecessors?.results?.length) {
        const predecessorValue = mapPredecessorsToSmartsheet(task.Predecessors.results, tasks);
        if (predecessorValue) {
          cells.push({ columnId: columnMap['Predecessors'], value: predecessorValue });
        }
      }
      if (columnMap['Constraint Type'] && task.ConstraintType) {
        cells.push({ columnId: columnMap['Constraint Type'], value: task.ConstraintType });
      }
      if (columnMap['Constraint Date'] && task.ConstraintDate) {
        cells.push({
          columnId: columnMap['Constraint Date'],
          value: convertDateTimeToDate(task.ConstraintDate),
        });
      }
      if (columnMap['Deadline'] && task.Deadline) {
        cells.push({
          columnId: columnMap['Deadline'],
          value: convertDateTimeToDate(task.Deadline),
        });
      }
      if (columnMap['Project Online Created Date'] && task.CreatedDate) {
        cells.push({
          columnId: columnMap['Project Online Created Date'],
          value: convertDateTimeToDate(task.CreatedDate),
        });
      }
      if (columnMap['Project Online Modified Date'] && task.ModifiedDate) {
        cells.push({
          columnId: columnMap['Project Online Modified Date'],
          value: convertDateTimeToDate(task.ModifiedDate),
        });
      }

      return cells;
    };

    // Add rows in batches by outline level to establish hierarchy
    // Map task ID to created row ID for parent-child relationships
    const taskIdToRowId: Record<string, number> = {};
    let totalRowsCreated = 0;

    // Find max outline level
    const maxLevel = Math.max(...tasks.map((t) => t.OutlineLevel || 1));

    // Add tasks level by level, grouped by parent
    for (let level = 1; level <= maxLevel; level++) {
      const tasksAtLevel = tasks.filter((t) => (t.OutlineLevel || 1) === level);
      if (tasksAtLevel.length === 0) continue;

      // Group tasks by their parent ID (using expanded Parent object)
      const tasksByParent = new Map<string, ProjectOnlineTask[]>();

      for (const task of tasksAtLevel) {
        let groupKey: string;
        if (level === 1) {
          groupKey = 'NO_PARENT';
        } else {
          // Use expanded Parent object to get parent ID
          let parentTaskId: string | null = null;
          if (task.Parent && task.Parent.Id) {
            parentTaskId = task.Parent.Id;
          }
          
          const parentRowId = parentTaskId ? taskIdToRowId[parentTaskId] : null;
          groupKey = parentRowId ? `PARENT_${parentRowId}` : 'NO_PARENT';
        }

        if (!tasksByParent.has(groupKey)) {
          tasksByParent.set(groupKey, []);
        }
        tasksByParent.get(groupKey)!.push(task);
      }

      // Add each group separately (all rows in a batch must use same location attribute)
      for (const [groupKey, groupTasks] of tasksByParent.entries()) {
        const rowsToAdd = groupTasks.map((task) => {
          const cells = buildCells(task);
          const row: SmartsheetRow = { cells };

          if (groupKey === 'NO_PARENT') {
            row.toBottom = true;
          } else {
            // Extract parent ID from groupKey
            const parentRowId = parseInt(groupKey.replace('PARENT_', ''));
            row.parentId = parentRowId;
          }

          return row;
        });

        // Add this group's rows in a batch
        try {
          const addRowsResponse = await this.client.sheets?.addRows?.({
            sheetId: sheetId,
            body: rowsToAdd,
          });

          // Unwrap the API response to get the actual array
          const createdRows =
            addRowsResponse?.result || addRowsResponse?.data || addRowsResponse || [];
          const rowsArray = Array.isArray(createdRows) ? createdRows : [];

          // Map task IDs to row IDs for next level
          groupTasks.forEach((task, index) => {
            if (rowsArray[index]?.id && task.Id) {
              taskIdToRowId[task.Id] = rowsArray[index].id;
            }
          });

          totalRowsCreated += rowsArray.length;
        } catch (error) {
          this.logger?.error(
            `Failed to add task rows at level ${level}, group ${groupKey}: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
      }
    }

    this.logger?.debug(`Created ${totalRowsCreated} total task rows with hierarchy`);

    return {
      rowsCreated: totalRowsCreated,
      sheetId,
      assignmentsProcessed: totalAssignmentsProcessed,
    };
  }
}
