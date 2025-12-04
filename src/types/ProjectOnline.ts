/**
 * Type definitions for Microsoft Project Online oData entities
 * Based on the transformation mapping specification
 */

/**
 * Project Online Project entity
 * oData Endpoint: /_api/ProjectData/Projects
 */
export interface ProjectOnlineProject {
  Id: string; // Guid
  Name: string;
  Description?: string;
  Owner?: string;
  OwnerEmail?: string;
  StartDate?: string; // ISO 8601 DateTime
  FinishDate?: string; // ISO 8601 DateTime
  CreatedDate: string; // ISO 8601 DateTime
  ModifiedDate: string; // ISO 8601 DateTime
  ProjectStatus?: string;
  ProjectType?: string;
  Priority?: number; // 0-1000
  PercentComplete?: number; // 0-100
}

/**
 * Project Online Task entity
 * oData Endpoint: /_api/ProjectData/Tasks
 */
export interface ProjectOnlineTask {
  Id: string; // Guid
  ProjectId: string; // Guid (FK)
  TaskName: string;
  ParentTaskId?: string; // Guid (FK, self-reference)
  TaskIndex: number;
  OutlineLevel: number; // 0=root, 1=child, etc.
  Start?: string; // ISO 8601 DateTime
  Finish?: string; // ISO 8601 DateTime
  Duration?: string; // ISO 8601 Duration (e.g., "PT40H")
  Work?: string; // ISO 8601 Duration
  ActualWork?: string; // ISO 8601 Duration
  PercentComplete?: number; // 0-100
  TaskType?: string;
  Priority?: number; // 0-1000
  IsMilestone: boolean;
  IsActive: boolean;
  TaskNotes?: string;
  Predecessors?: string;
  ConstraintType?: string;
  ConstraintDate?: string; // ISO 8601 DateTime
  Deadline?: string; // ISO 8601 DateTime
  ResourceNames?: string;
  CreatedDate?: string; // ISO 8601 DateTime
  ModifiedDate?: string; // ISO 8601 DateTime
}

/**
 * Project Online Resource entity
 * oData Endpoint: /_api/ProjectData/Resources
 */
export interface ProjectOnlineResource {
  Id: string; // Guid
  Name: string;
  Email?: string;
  ResourceType?: 'Work' | 'Material' | 'Cost';
  MaxUnits?: number; // Decimal (1.0 = 100%)
  StandardRate?: number; // Decimal
  OvertimeRate?: number; // Decimal
  CostPerUse?: number; // Decimal
  BaseCalendar?: string;
  IsActive: boolean;
  IsGeneric: boolean;
  Department?: string;
  Code?: string;
  CreatedDate?: string; // ISO 8601 DateTime
  ModifiedDate?: string; // ISO 8601 DateTime
}

/**
 * Project Online Assignment entity
 * oData Endpoint: /_api/ProjectData/Assignments
 */
export interface ProjectOnlineAssignment {
  Id: string; // Guid
  TaskId: string; // Guid (FK)
  ResourceId: string; // Guid (FK)
  ProjectId: string; // Guid (FK)
  Start?: string; // ISO 8601 DateTime
  Finish?: string; // ISO 8601 DateTime
  Work?: string; // ISO 8601 Duration
  ActualWork?: string; // ISO 8601 Duration
  RemainingWork?: string; // ISO 8601 Duration
  PercentWorkComplete?: number; // 0-100
  Units?: number; // Decimal (1.0 = 100%)
  Cost?: number; // Decimal
  ActualCost?: number; // Decimal
  RemainingCost?: number; // Decimal
  AssignmentNotes?: string;
}

/**
 * oData query options
 */
export interface ODataQueryOptions {
  $select?: string[];
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $expand?: string[];
}

/**
 * oData collection response wrapper
 */
export interface ODataCollectionResponse<T> {
  value: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}

/**
 * PMO Standards workspace information
 */
export interface PMOStandardsWorkspaceInfo {
  workspaceId: number;
  workspaceName: string;
  referenceSheets: Record<string, PMOStandardsReferenceSheet>;
}

/**
 * PMO Standards reference sheet information
 */
export interface PMOStandardsReferenceSheet {
  sheetId: number;
  columnId: number;
}

// Re-export Smartsheet types from the canonical source
export type {
  SmartsheetColumn,
  SmartsheetRow,
  SmartsheetCell,
  SmartsheetSheet,
  SmartsheetWorkspace,
  SmartsheetColumnType,
  SmartsheetColumnOptions,
  SmartsheetContact,
  SmartsheetMultiContact,
  SmartsheetMultiPicklist,
  SmartsheetObjectValue,
  SmartsheetCellLinkValue,
  SmartsheetPicklistOption,
} from './Smartsheet';
