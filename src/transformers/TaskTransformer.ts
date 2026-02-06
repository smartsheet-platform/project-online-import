import {
  ProjectOnlineTask,
  ProjectOnlineResource,
  PMOStandardsWorkspaceInfo,
  SmartsheetColumn,
  SmartsheetRow,
  SmartsheetCell,
} from '../types/ProjectOnline';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { 
  convertDateTimeToDate, 
  convertDurationToHoursString, 
  getUnmappedTaskFields
} from './utils';
import { getColumnMap, addColumnsIfNotExist } from '../util/SmartsheetHelpers';
import { Logger } from '../util/Logger';
import { CustomFieldHandler } from '../lib/CustomFieldHandler';

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
  pmoStandards: PMOStandardsWorkspaceInfo,
  resourcesSheetId?: number
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

  // Configure resource assignment columns to reference Resources sheet if provided
  if (resourcesSheetId) {
    const workResourceColumnId = columnMap['Work Resource'];
    const materialResourceColumnId = columnMap['Material Resource'];
    const costResourceColumnId = columnMap['Cost Resource'];

    // Configure Work Resource column (MULTI_CONTACT_LIST)
    if (workResourceColumnId) {
      await client.columns?.updateColumn?.({
        sheetId,
        columnId: workResourceColumnId,
        body: {
          type: 'MULTI_CONTACT_LIST',
          contactOptions: [{
            sheetId: resourcesSheetId,
            columnId: 4, // Team Members column in Resources sheet
          }],
        },
      });
    }

    // Configure Material Resource column (MULTI_PICKLIST)
    if (materialResourceColumnId) {
      await client.columns?.updateColumn?.({
        sheetId,
        columnId: materialResourceColumnId,
        body: {
          type: 'MULTI_PICKLIST',
          options: [{
            value: {
              objectType: 'CELL_LINK',
              sheetId: resourcesSheetId,
              columnId: 5, // Materials column in Resources sheet
            },
          }],
        },
      });
    }

    // Configure Cost Resource column (MULTI_PICKLIST)
    if (costResourceColumnId) {
      await client.columns?.updateColumn?.({
        sheetId,
        columnId: costResourceColumnId,
        body: {
          type: 'MULTI_PICKLIST',
          options: [{
            value: {
              objectType: 'CELL_LINK',
              sheetId: resourcesSheetId,
              columnId: 6, // Cost Resources column in Resources sheet
            },
          }],
        },
      });
    }
  }

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
      type: 'TEXT_NUMBER',
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
      title: 'ConstraintStartEnd',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Deadline',
      type: 'DATE',
      width: 120,
    },
    // Critical path fields
    {
      title: 'Late Start',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Late Finish',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Total Slack (days)',
      type: 'TEXT_NUMBER',
      width: 120,
    },
    {
      title: 'Free Slack (days)',
      type: 'TEXT_NUMBER',
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
      title: 'Work Resource',
      type: 'MULTI_CONTACT_LIST',
      width: 200,
    },
    {
      title: 'Material Resource',
      type: 'MULTI_PICKLIST', 
      width: 200,
    },
    {
      title: 'Cost Resource',
      type: 'MULTI_PICKLIST',
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

  // Duration (readable format like "5d" or "40h")
  if (columnMap['Duration']) {
    // Try DurationTimeSpan first (ISO8601 format), then Duration (simple format)
    const durationValue = task.DurationTimeSpan || task.Duration;
    if (durationValue) {
      cells.push({
        columnId: columnMap['Duration'],
        value: convertDurationToReadableString(durationValue),
      });
    }
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
  if (columnMap['Constraint Type'] && task.ConstraintType !== undefined && task.ConstraintType !== null) {
    const constraintTypeText = mapConstraintTypeToAbbreviation(task.ConstraintType);
    if (constraintTypeText) {
      cells.push({
        columnId: columnMap['Constraint Type'],
        value: constraintTypeText,
      });
    }
  }

  // ConstraintStartEnd
  if (columnMap['ConstraintStartEnd'] && task.ConstraintStartEnd) {
    cells.push({
      columnId: columnMap['ConstraintStartEnd'],
      value: convertDateTimeToDate(task.ConstraintStartEnd),
    });
  }

  // Deadline
  if (columnMap['Deadline'] && task.Deadline) {
    cells.push({
      columnId: columnMap['Deadline'],
      value: convertDateTimeToDate(task.Deadline),
    });
  }

  // Critical path fields
  if (columnMap['Late Start']) {
    const lateStart = safeConvertDate(task.LatestStart);
    if (lateStart !== null) {
      cells.push({
        columnId: columnMap['Late Start'],
        value: lateStart,
      });
    }
  }

  if (columnMap['Late Finish']) {
    const lateFinish = safeConvertDate(task.LatestFinish);
    if (lateFinish !== null) {
      cells.push({
        columnId: columnMap['Late Finish'],
        value: lateFinish,
      });
    }
  }

  if (columnMap['Total Slack (days)']) {
    const totalSlack = safeDurationToDays(task.TotalSlack);
    if (totalSlack !== null) {
      cells.push({
        columnId: columnMap['Total Slack (days)'],
        value: totalSlack,
      });
    }
  }

  if (columnMap['Free Slack (days)']) {
    const freeSlack = safeDurationToDays(task.FreeSlack);
    if (freeSlack !== null) {
      cells.push({
        columnId: columnMap['Free Slack (days)'],
        value: freeSlack,
      });
    }
  }

  // Project Online Created Date
  if (columnMap['Project Online Created Date'] && task.Created) {
    cells.push({
      columnId: columnMap['Project Online Created Date'],
      value: convertDateTimeToDate(task.Created),
    });
  }

  // Project Online Modified Date
  if (columnMap['Project Online Modified Date'] && task.Modified) {
    cells.push({
      columnId: columnMap['Project Online Modified Date'],
      value: convertDateTimeToDate(task.Modified),
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
 * Create enhanced task row with both template-mapped and dynamic unmapped fields
 */
export function createEnhancedTaskRow(
  task: ProjectOnlineTask,
  templateColumnMap: Record<string, number>,
  dynamicFieldsColumnMap: Record<string, number>,
  allTasks: ProjectOnlineTask[] = []
): SmartsheetRow {
  // Start with the standard template row
  const templateRow = createTaskRow(task, templateColumnMap, allTasks);
  const cells = templateRow.cells ? [...templateRow.cells] : [];
  
  // Add unmapped fields as dynamic columns
  const unmappedFields = getUnmappedTaskFields(task);
  
  for (const field of unmappedFields) {
    const columnId = dynamicFieldsColumnMap[field.titleCase];
    if (columnId && field.value !== null && field.value !== undefined) {
      // Handle different data types appropriately
      let cellValue: any = field.value;
      
      if (field.columnType === 'DATE' && typeof field.value === 'string') {
        cellValue = convertDateTimeToDate(field.value);
        // Skip empty/invalid dates
        if (!cellValue) continue;
      } else if (field.columnType === 'CHECKBOX' && typeof field.value === 'boolean') {
        cellValue = field.value;
      } else if (field.columnType === 'TEXT_NUMBER') {
        // Handle duration fields
        if (field.fieldName.toLowerCase().includes('duration') || 
            field.fieldName.toLowerCase().includes('work') ||
            field.fieldName.toLowerCase().includes('slack')) {
          if (typeof field.value === 'string' && field.value.match(/^P|^PT|\d+[hd]$/)) {
            try {
              cellValue = convertDurationToHoursString(field.value);
            } catch {
              cellValue = field.value; // Keep original if conversion fails
            }
          }
        }
        // Handle cost/numeric fields that might need formatting
        else if (typeof field.value === 'number') {
          cellValue = field.value;
        } else {
          cellValue = String(field.value);
        }
      }
      
      cells.push({
        columnId,
        value: cellValue
      });
    }
  }
  
  // Check for duplicate column IDs and remove them
  const seenColumnIds = new Set<number>();
  const dedupedCells = cells.filter(cell => {
    if (seenColumnIds.has(cell.columnId)) {
      console.log(`WARNING: Duplicate column ID ${cell.columnId} found in task ${task.Name}, removing duplicate`);
      return false;
    }
    seenColumnIds.add(cell.columnId);
    return true;
  });
  
  // Return enhanced row with same positioning logic
  const enhancedRow: SmartsheetRow = {
    cells: dedupedCells,
  };

  // Handle positioning based on hierarchy level
  const outlineLevel = task.OutlineLevel || 1;
  if (outlineLevel > 1) {
    enhancedRow.indent = outlineLevel - 1;
  } else {
    enhancedRow.toBottom = true;
  }

  return enhancedRow;
}

/**
 * Convert ISO8601 duration to readable string format for Duration column
 * Examples: PT40H → "5d", PT8H → "1d", PT4H → "0.5d"
 */
function convertDurationToReadableString(isoDuration: string): string {
  // Parse ISO8601 duration to hours
  const hours = parseHoursFromISO8601(isoDuration);

  // Convert to days (8-hour workday)
  const days = hours / 8;

  // Format based on whether it's a whole day or not
  if (days === Math.floor(days)) {
    return `${days}d`;
  } else {
    return `${Math.round(days * 100) / 100}d`;
  }
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
 * Parse hours from ISO8601 duration string or simple duration format
 */
function parseHoursFromISO8601(duration: string): number {
  // Handle simple formats first: 4d, 32h, 480m
  if (/^\d+d$/.test(duration)) {
    const days = parseFloat(duration.replace('d', ''));
    return days * 8; // Assume 8-hour workday
  }
  
  if (/^\d+h$/.test(duration)) {
    const hours = parseFloat(duration.replace('h', ''));
    return hours;
  }
  
  if (/^\d+m$/.test(duration)) {
    const minutes = parseFloat(duration.replace('m', ''));
    return minutes / 60;
  }

  // Handle ISO8601 patterns: PT40H, P5D, PT480M, P1DT8H
  if (duration.startsWith('PT') && duration.includes('H')) {
    const hours = parseFloat(duration.replace('PT', '').replace('H', ''));
    return hours;
  }

  if (duration.startsWith('P') && duration.includes('D') && !duration.includes('T')) {
    const days = parseFloat(duration.replace('P', '').replace('D', ''));
    return days * 8; // Assume 8-hour workday
  }

  if (duration.startsWith('PT') && duration.includes('M')) {
    const minutes = parseFloat(duration.replace('PT', '').replace('M', ''));
    return minutes / 60;
  }

  // Handle complex ISO8601 format like P1DT8H (1 day + 8 hours)
  if (duration.startsWith('P') && duration.includes('DT') && duration.includes('H')) {
    const daysPart = duration.split('DT')[0].replace('P', '');
    const hoursPart = duration.split('DT')[1].replace('H', '');
    
    const days = daysPart ? parseFloat(daysPart) : 0;
    const hours = hoursPart ? parseFloat(hoursPart) : 0;
    
    return (days * 8) + hours; // Convert days to hours + additional hours
  }

  return 0;
}

/**
 * Safely convert ISO8601 duration to decimal days
 * Returns null if the value is invalid or cannot be converted
 */
function safeDurationToDays(duration: string | undefined | null): number | null {
  if (!duration || typeof duration !== 'string' || duration.trim() === '') {
    return null;
  }
  try {
    const value = convertDurationToDecimalDays(duration);
    if (isFinite(value) && value >= 0) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely convert date string to Smartsheet date format
 * Returns null if the value is invalid or cannot be converted
 */
function safeConvertDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return null;
  }
  try {
    const value = convertDateTimeToDate(dateStr);
    // Check if the conversion resulted in a valid date string
    if (value && value !== 'Invalid Date' && value.length > 0) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
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
 * Get resource type for assignment filtering
 */
function getAssignmentResourceType(resource: ProjectOnlineResource): 'Work' | 'Material' | 'Cost' {
  // Check for Material resource indicators
  if (resource.MaterialLabel && resource.MaterialLabel.trim() !== '') {
    return 'Material';
  }
  
  // Check for Cost resource indicators
  const isNotMaterial = !resource.MaterialLabel || resource.MaterialLabel.trim() === '';
  
  // Not a typical Work resource (no email, can't be leveled)
  const isNotWorkResource = !resource.Email && !resource.CanLevel;
  
  // May have IsBudgeted flag set
  // Cost resources often have zero rates and no work values
  if (isNotMaterial && isNotWorkResource) {
    return 'Cost';
  }
  
  return 'Work';
}

/**
 * Map Project Online constraint type numeric value to abbreviated string for PMO Standards
 * Project Online uses numeric values 0-7, PMO Standards uses abbreviated strings
 */
export function mapConstraintTypeToAbbreviation(constraintType: number): string {
  switch (constraintType) {
    case 0:
      return 'ASAP'; // As Soon As Possible
    case 1:
      return 'ALAP'; // As Late As Possible
    case 2:
      return 'MSO';  // Must Start On
    case 3:
      return 'MFO';  // Must Finish On
    case 4:
      return 'SNET'; // Start No Earlier Than
    case 5:
      return 'SNLT'; // Start No Later Than
    case 6:
      return 'FNET'; // Finish No Earlier Than
    case 7:
      return 'FNLT'; // Finish No Later Than
    default:
      return 'ALAP';
  }
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
   
    // Step 1: Add template columns (existing functionality)
    const allTaskColumns = createTasksSheetColumns('Project');
    const columnsToAdd = allTaskColumns.slice(1); // Remove Task Name which already exists

    this.logger?.debug(
      `Adding ${columnsToAdd.length} template columns to task sheet ${sheetId} (skipping existing)`
    );

    const addedColumns = await addColumnsIfNotExist(this.client, sheetId, columnsToAdd);

    // Step 2: Process custom fields with CustomFieldHandler
    const customFieldHandler = new CustomFieldHandler(tasks);
    const customColumns = customFieldHandler.customColumns();
    
    if (customColumns.length > 0) {
      this.logger?.debug(`Adding ${customColumns.length} custom field columns`);
      await addColumnsIfNotExist(this.client, sheetId, customColumns);
    }

    // Step 3: Discover dynamic fields from all tasks
    const allUnmappedFields = new Map<string, {titleCase: string, columnType: string}>();
    
    for (const task of tasks) {
      const unmappedFields = getUnmappedTaskFields(task);
      for (const field of unmappedFields) {
        if (!allUnmappedFields.has(field.titleCase)) {
          allUnmappedFields.set(field.titleCase, {
            titleCase: field.titleCase,
            columnType: field.columnType
          });
        }
      }
    }

    this.logger?.debug(
      `Found ${allUnmappedFields.size} additional dynamic fields: ${Array.from(allUnmappedFields.keys()).join(', ')}`
    );

    // Step 4: Add dynamic columns for unmapped fields
    const dynamicColumnsToAdd: SmartsheetColumn[] = Array.from(allUnmappedFields.values()).map(field => ({
      title: field.titleCase,
      type: field.columnType as any,
      width: 120
    }));

    let dynamicAddedColumns: Array<{title: string, id: number, wasCreated: boolean}> = [];
    if (dynamicColumnsToAdd.length > 0) {
      this.logger?.debug(
        `Adding ${dynamicColumnsToAdd.length} dynamic columns for unmapped fields`
      );
      
      dynamicAddedColumns = await addColumnsIfNotExist(this.client, sheetId, dynamicColumnsToAdd);
    }

    // Step 5: Build combined column maps
    const templateColumnMap: Record<string, number> = {};
    const dynamicFieldsColumnMap: Record<string, number> = {};

    // Get existing Task Name column
    const existingColumnMap = await getColumnMap(this.client, sheetId);
    if (existingColumnMap['Task Name']) {
      templateColumnMap['Task Name'] = existingColumnMap['Task Name'].id;
      this.logger?.debug(`Task Name column ID: ${existingColumnMap['Task Name'].id}`);
    }

    // Add template columns to template map
    for (const result of addedColumns) {
      templateColumnMap[result.title] = result.id;
      this.logger?.debug(
        `Template column ${result.title} - ID: ${result.id}, ${result.wasCreated ? 'newly created' : 'already existed'}`
      );
    }

    // Add dynamic columns to dynamic map
    for (const result of dynamicAddedColumns) {
      dynamicFieldsColumnMap[result.title] = result.id;
      this.logger?.debug(
        `Dynamic column ${result.title} - ID: ${result.id}, ${result.wasCreated ? 'newly created' : 'already existed'}`
      );
    }

    // Get custom field column mappings
    const customFieldColumnMap = await getColumnMap(this.client, sheetId);
    const customFieldCellPayload = customFieldHandler.cellPayload(customFieldColumnMap);

    this.logger?.debug(
      `Template columns: ${Object.keys(templateColumnMap).length}, Dynamic columns: ${Object.keys(dynamicFieldsColumnMap).length}, Custom field columns: ${customColumns.length}`
    );

    // Step 6: Enhanced row creation function with both template and dynamic data
    const buildEnhancedCells = (task: ProjectOnlineTask): SmartsheetCell[] => {
      // Start with template row creation
      const templateRow = createTaskRow(task, templateColumnMap, tasks);
      const cells = templateRow.cells ? [...templateRow.cells] : [];

      // Handle assignment resources (from original buildCells function)
      if (templateColumnMap['Work Resource'] && task.Assignments?.results && task.Assignments.results.length > 0) {
        const workAssignments = task.Assignments.results.filter(a => a.Resource && a.Resource.Name && getAssignmentResourceType(a.Resource) === 'Work');
        totalAssignmentsProcessed += workAssignments.length;
        
        const contacts = workAssignments.map(a => ({
          objectType: 'CONTACT' as const,
          name: a.Resource!.Name,
          email: a.Resource!.Email
        }));
                
        if (contacts.length > 0) {
          cells.push({
            columnId: templateColumnMap['Work Resource'],
            objectValue: {
              objectType: 'MULTI_CONTACT',
              values: contacts
            }
          });
        }
      }

      if (templateColumnMap['Material Resource'] && task.Assignments?.results && task.Assignments.results.length > 0) {
        const materialAssignments = task.Assignments.results.filter(a => a.Resource && a.Resource.Name && getAssignmentResourceType(a.Resource) === 'Material');
        
        const materialNames = materialAssignments.map(a => a.Resource!.Name).filter(Boolean);
        
        if (materialNames.length > 0) {
          cells.push({
            columnId: templateColumnMap['Material Resource'],
            objectValue: {
              objectType: 'MULTI_PICKLIST',
              values: materialNames
            }
          });
        }
      }

      if (templateColumnMap['Cost Resource'] && task.Assignments?.results && task.Assignments.results.length > 0) {
        const costAssignments = task.Assignments.results.filter(a => a.Resource && a.Resource.Name && getAssignmentResourceType(a.Resource) === 'Cost');
        
        const costNames = costAssignments.map(a => a.Resource!.Name).filter(Boolean);
        
        if (costNames.length > 0) {
          cells.push({
            columnId: templateColumnMap['Cost Resource'],
            objectValue: {
              objectType: 'MULTI_PICKLIST',
              values: costNames
            }
          });
        }
      }

      // Add dynamic fields
      const unmappedFields = getUnmappedTaskFields(task);
      for (const field of unmappedFields) {
        const columnId = dynamicFieldsColumnMap[field.titleCase];
        if (columnId && field.value !== null && field.value !== undefined) {
          let cellValue: any = field.value;
          
          if (field.columnType === 'DATE' && typeof field.value === 'string') {
            cellValue = convertDateTimeToDate(field.value);
            if (!cellValue) continue; // Skip empty/invalid dates
          } else if (field.columnType === 'CHECKBOX' && typeof field.value === 'boolean') {
            cellValue = field.value;
          } else if (field.columnType === 'TEXT_NUMBER') {
            // Handle duration fields
            if (field.fieldName.toLowerCase().includes('duration') || 
                field.fieldName.toLowerCase().includes('work') ||
                field.fieldName.toLowerCase().includes('slack')) {
              if (typeof field.value === 'string' && field.value.match(/^P|^PT|\d+[hd]$/)) {
                try {
                  cellValue = convertDurationToHoursString(field.value);
                } catch {
                  cellValue = field.value; // Keep original if conversion fails
                }
              }
            }
            // Handle numeric fields
            else if (typeof field.value === 'number') {
              cellValue = field.value;
            } else {
              cellValue = String(field.value);
            }
          }
          
          cells.push({
            columnId,
            value: cellValue
          });
        }
      }

      // Add custom field cells for this task
      const customFieldCells = customFieldCellPayload[task.Id] || [];
      cells.push(...customFieldCells);

      // Check for duplicate column IDs and remove them
      const seenColumnIds = new Set<number>();
      const dedupedCells = cells.filter(cell => {
        if (seenColumnIds.has(cell.columnId)) {
          console.log(`WARNING: Duplicate column ID ${cell.columnId} found in task ${task.Name}, removing duplicate`);
          return false;
        }
        seenColumnIds.add(cell.columnId);
        return true;
      });

      return dedupedCells;
    };

    // Step 6: Create rows with hierarchy (same logic as before)
    const taskIdToRowId: Record<string, number> = {};
    let totalRowsCreated = 0;
    const maxLevel = Math.max(...tasks.map((t) => t.OutlineLevel || 1));

    for (let level = 1; level <= maxLevel; level++) {
      const tasksAtLevel = tasks.filter((t) => (t.OutlineLevel || 1) === level);
      if (tasksAtLevel.length === 0) continue;

      const tasksByParent = new Map<string, ProjectOnlineTask[]>();

      for (const task of tasksAtLevel) {
        let groupKey: string;
        if (level === 1) {
          groupKey = 'NO_PARENT';
        } else {
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

      for (const [groupKey, groupTasks] of tasksByParent.entries()) {
        
        const rowsToAdd = groupTasks.map((task) => {
          const cells = buildEnhancedCells(task);
          
          const row: SmartsheetRow = { cells };

          if (groupKey === 'NO_PARENT') {
            row.toBottom = true;
          } else {
            const parentRowId = parseInt(groupKey.replace('PARENT_', ''));
            row.parentId = parentRowId;
          }

          return row;
        });

        // Validate row structure before sending
        for (let i = 0; i < rowsToAdd.length; i++) {
          const row = rowsToAdd[i];
          console.log(`Row ${i + 1}: ${row.cells?.length || 0} cells, indent: ${row.indent}, toBottom: ${row.toBottom}, parentId: ${row.parentId}`);
          
          // Check for invalid cells
          if (row.cells) {
            for (let j = 0; j < row.cells.length; j++) {
              const cell = row.cells[j];
              if (!cell.columnId) {
                console.log(`ERROR: Row ${i + 1}, cell ${j + 1} missing columnId`);
              }
              if (cell.value === undefined) {
                console.log(`WARNING: Row ${i + 1}, cell ${j + 1} has undefined value`);
              }
            }
          }
        }
        
        try {
          const addRowsResponse = await this.client.sheets?.addRows?.({ sheetId, body: rowsToAdd });

          const createdRows = addRowsResponse?.result || addRowsResponse?.data || addRowsResponse || [];
          const rowsArray = Array.isArray(createdRows) ? createdRows : [];

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

    this.logger?.debug(`Created ${totalRowsCreated} total task rows with hierarchy and ${allUnmappedFields.size} dynamic columns`);

    return {
      rowsCreated: totalRowsCreated,
      sheetId,
      assignmentsProcessed: totalAssignmentsProcessed,
    };
  }
}
