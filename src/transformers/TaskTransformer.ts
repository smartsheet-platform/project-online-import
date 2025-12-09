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
  const rows = tasks.map((task) => createTaskRow(task, columnMap));
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
  columnMap: Record<string, number>
): SmartsheetRow {
  const cells: SmartsheetCell[] = [];

  // Task Name
  if (columnMap['Task Name']) {
    cells.push({
      columnId: columnMap['Task Name'],
      value: task.TaskName,
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

  // Predecessors (will be populated separately if needed)
  if (columnMap['Predecessors'] && task.Predecessors) {
    cells.push({
      columnId: columnMap['Predecessors'],
      value: task.Predecessors,
    });
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
      columns['Team Members'] = {
        type: 'MULTI_CONTACT_LIST',
        resourceType: 'Work',
      };
    } else if (resourceType === 'Material') {
      columns['Equipment'] = {
        type: 'MULTI_PICKLIST',
        resourceType: 'Material',
      };
    } else if (resourceType === 'Cost') {
      columns['Cost Centers'] = {
        type: 'MULTI_PICKLIST',
        resourceType: 'Cost',
      };
    }
  }

  return columns;
}

/**
 * Configure assignment columns to source from Resources sheet
 */
export async function configureAssignmentColumns(
  client: SmartsheetClient,
  tasksSheetId: number,
  assignmentColumnIds: Record<string, number>,
  _resourcesSheetId: number,
  _resourcesContactColumnId: number,
  assignmentColumns: Record<string, AssignmentColumnDefinition>
): Promise<void> {
  // Configure each assignment column
  for (const [columnName, definition] of Object.entries(assignmentColumns)) {
    const columnId = assignmentColumnIds[columnName];
    if (!columnId) continue;

    if (definition.type === 'MULTI_CONTACT_LIST') {
      // Configure to source from Resources sheet Contact column
      await client.updateColumn?.(tasksSheetId, columnId, {
        type: 'MULTI_CONTACT_LIST',
        contactOptions: [
          {
            sheetId: _resourcesSheetId,
            columnId: _resourcesContactColumnId,
          },
        ],
      });
    } else if (definition.type === 'MULTI_PICKLIST') {
      // MULTI_PICKLIST columns for Material and Cost resources
      // These use text-based selection without contact sourcing
      await client.updateColumn?.(tasksSheetId, columnId, {
        type: 'MULTI_PICKLIST',
      });
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
  if (!task.TaskName || task.TaskName.trim() === '') {
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
  ): Promise<{ rowsCreated: number; sheetId: number }> {
    // Validate all tasks
    for (const task of tasks) {
      const validation = validateTask(task);
      if (!validation.isValid) {
        throw new Error(`Invalid task ${task.TaskName}: ${validation.errors.join(', ')}`);
      }
    }

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

      if (columnMap['Task Name']) {
        cells.push({ columnId: columnMap['Task Name'], value: task.TaskName });
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
      if (columnMap['Predecessors'] && task.Predecessors) {
        cells.push({ columnId: columnMap['Predecessors'], value: task.Predecessors });
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

      // Group tasks by their parent ID (or 'NO_PARENT' for level 1 or missing parents)
      const tasksByParent = new Map<string, ProjectOnlineTask[]>();

      for (const task of tasksAtLevel) {
        let groupKey: string;
        if (level === 1) {
          groupKey = 'NO_PARENT';
        } else {
          const parentRowId = task.ParentTaskId ? taskIdToRowId[task.ParentTaskId] : null;
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
    };
  }
}
