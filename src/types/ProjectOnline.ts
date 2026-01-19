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
  LastSavedDate: string; // ISO 8601 DateTime
  ProjectStatus?: string;
  ProjectType?: string;
  Priority?: number; // 0-1000
  PercentComplete?: number; // 0-100
  
  // Navigation properties for $expand
  Tasks?: ProjectOnlineTask[];
  Resources?: ProjectOnlineResource[];
  ProjectResources?: ProjectOnlineResource[];
  Assignments?: ProjectOnlineAssignment[];
}

/**
 * Project Online Task Link entity (for predecessors/successors)
 */
export interface TaskLink {
  PredecessorTaskId: string;
  SuccessorTaskId: string;
  DependencyType: number; // 0=FF, 1=FS, 2=SF, 3=SS
  LinkLag?: number;
  LinkLagDuration?: string; // ISO 8601 duration
}

/**
 * Project Online Task entity
 * oData Endpoint: /_api/ProjectData/Tasks
 */
export interface ProjectOnlineTask {
  Id: string; // Guid
  ProjectId: string; // Guid (FK)
  Name: string;
  ParentTaskId?: string; // Guid (FK, self-reference)
  TaskIndex: number;
  OutlinePosition: string; // String position like "1", "1.1", "1.1.1", "2", etc.
  OutlineLevel?: number; // Numeric level: 1=root, 2=first indent, 3=second indent, etc.
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
  ConstraintType?: string;
  ConstraintDate?: string; // ISO 8601 DateTime
  Deadline?: string; // ISO 8601 DateTime
  ResourceNames?: string;
  CreatedDate?: string; // ISO 8601 DateTime
  ModifiedDate?: string; // ISO 8601 DateTime
  Assignments?: {results: ProjectOnlineAssignment[]};
  Parent?: ProjectOnlineTask;
  Predecessors?: {results: TaskLink[]};
}

/**
 * Project Online Resource entity
 */
export interface ProjectOnlineResource {
  Id: string; // Guid
  Name: string;
  Email?: string;  
  ResourceType?: string; // Work, Material, Cost
  DefaultBookingType?: number;
  MaximumCapacity?: number; // Decimal (1.0 = 100%)
  MaxUnits?: number; // Decimal (1.0 = 100%) - alternative name for MaximumCapacity
  StandardRate?: number; // Decimal
  OvertimeRate?: number; // Decimal
  CostPerUse?: number; // Decimal
  CanLevel?: boolean; 
  IsGenericResource?: boolean;
  IsActive?: boolean;
  IsGeneric?: boolean; // Alternative name for IsGenericResource
  Group?: string; 
  Code?: string;  
  Created?: string; 
  CreatedDate?: string; // Alternative name for Created
  Modified?: string; 
  Initials?: string;
  Department?: string;
  BaseCalendar?: string;
}

/**
 * Project Online Assignment entity
 * oData Endpoint: /_api/ProjectData/Assignments
 */
export interface ProjectOnlineAssignment {
  Id: string; // Guid
  ProjectId?: string; // Guid (FK) - may not be present in CSOM
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
  Resource?: ProjectOnlineResource; // Expanded Resource
  Task?: ProjectOnlineTask; // Expanded Task
}

/**
 * Resource column type for type-based column separation
 */
export type ResourceColumnType = 'Work' | 'Material' | 'Cost';

/**
 * Resource column mapping for Resources sheet
 * Maps resource types to their corresponding column information
 */
export interface ResourceColumnMapping {
  Work: { columnId: number; columnTitle: 'Team Members' };
  Material: { columnId: number; columnTitle: 'Materials' };
  Cost: { columnId: number; columnTitle: 'Cost Resources' };
}

/**
 * Resource column IDs returned from ResourceTransformer
 */
export interface ResourceColumnIds {
  'Team Members'?: number;
  Materials?: number;
  'Cost Resources'?: number;
  'Resource Type'?: number;
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
