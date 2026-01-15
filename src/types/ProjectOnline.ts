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
 * Project Online Task entity
 * oData Endpoint: /_api/ProjectData/Tasks
 */
export interface ProjectOnlineTask {
  Id: string; // Guid
  ProjectId: string; // Guid (FK)
  Name: string;
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
 * CSOM Endpoint: /_api/ProjectServer/Projects/ProjectResources
 */
export interface ProjectOnlineResource {
  Id: string; // Guid
  Name: string;
  Email?: string;
  
  // Resource type - CSOM: 1=Work, 2=Material, 3=Cost
  DefaultBookingType?: number;
  
  // Capacity - CSOM format
  MaximumCapacity?: number; // Decimal (1.0 = 100%)
  
  // Rates
  StandardRate?: number; // Decimal
  OvertimeRate?: number; // Decimal
  CostPerUse?: number; // Decimal
  
  // Status
  CanLevel?: boolean; // CSOM: indicates if resource is active
  IsGenericResource?: boolean; // CSOM: is generic resource
  
  // Organizational info
  Group?: string; // CSOM: department/group
  Code?: string;
  
  // Dates
  Created?: string; // CSOM: ISO 8601 DateTime
  Modified?: string; // CSOM: ISO 8601 DateTime
  
  // Additional useful CSOM properties
  Initials?: string;
}

/**
 * Project Online Assignment entity
 * oData Endpoint: /_api/ProjectData/Assignments
 * CSOM Endpoint: /_api/ProjectServer/Projects/Assignments
 */
export interface ProjectOnlineAssignment {
  Id: string; // Guid
  TaskId?: string; // Guid (FK) - may not be present in CSOM
  ResourceId?: string; // Guid (FK) - OData format
  ProjectId?: string; // Guid (FK) - may not be present in CSOM
  
  // CSOM navigation properties
  Resource?: {
    __deferred?: { uri: string };
    Id?: string;
    Name?: string;
    ResourceType?: string;
    Email?: string;
    IsActive?: boolean;
    IsGeneric?: boolean;
  } | ProjectOnlineResource; // Can be either deferred or expanded
  Task?: {
    __deferred?: { uri: string };
    Id?: string;
    Name?: string;
  } | ProjectOnlineTask; // Can be either deferred or expanded
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
