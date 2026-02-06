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
  Duration?: string; // ISO 8601 Duration
  DurationTimeSpan?: string; // ISO 8601 Duration (alternative format)
  DurationMilliseconds?: number;
  ActualStart?: string; // ISO 8601 DateTime
  ActualFinish?: string; // ISO 8601 DateTime
  ActualDuration?: string; // ISO 8601 Duration
  ActualDurationMilliseconds?: number;
  ActualDurationTimeSpan?: string; // ISO 8601 Duration
  ScheduledStart?: string; // ISO 8601 DateTime
  ScheduledFinish?: string; // ISO 8601 DateTime
  ScheduledDuration?: string; // ISO 8601 Duration
  ScheduledDurationMilliseconds?: number;
  ScheduledDurationTimeSpan?: string; // ISO 8601 Duration
  BaselineStart?: string; // ISO 8601 DateTime
  BaselineFinish?: string; // ISO 8601 DateTime
  BaselineDuration?: string; // ISO 8601 Duration
  BaselineDurationMilliseconds?: number;
  BaselineDurationTimeSpan?: string; // ISO 8601 Duration
  EarliestStart?: string; // ISO 8601 DateTime
  EarliestFinish?: string; // ISO 8601 DateTime
  LatestStart?: string; // ISO 8601 DateTime
  LatestFinish?: string; // ISO 8601 DateTime
  Work?: string; // ISO 8601 Duration
  WorkMilliseconds?: number;
  WorkTimeSpan?: string; // ISO 8601 Duration
  ActualWork?: string; // ISO 8601 Duration
  ActualWorkMilliseconds?: number;
  ActualWorkTimeSpan?: string; // ISO 8601 Duration
  RemainingWork?: string; // ISO 8601 Duration
  RemainingWorkMilliseconds?: number;
  RemainingWorkTimeSpan?: string; // ISO 8601 Duration
  RemainingDuration?: string; // ISO 8601 Duration
  RemainingDurationMilliseconds?: number;
  RemainingDurationTimeSpan?: string; // ISO 8601 Duration
  BaselineWork?: string; // ISO 8601 Duration
  BaselineWorkMilliseconds?: number;
  BaselineWorkTimeSpan?: string; // ISO 8601 Duration
  OvertimeWork?: string; // ISO 8601 Duration
  OvertimeWorkMilliseconds?: number;
  OvertimeWorkTimeSpan?: string; // ISO 8601 Duration
  ActualOvertimeWork?: string; // ISO 8601 Duration
  ActualOvertimeWorkMilliseconds?: number;
  ActualOvertimeWorkTimeSpan?: string; // ISO 8601 Duration
  RemainingOvertimeWork?: string; // ISO 8601 Duration
  RemainingOvertimeWorkMilliseconds?: number;
  RemainingOvertimeWorkTimeSpan?: string; // ISO 8601 Duration
  RegularWork?: string; // ISO 8601 Duration
  RegularWorkMilliseconds?: number;
  RegularWorkTimeSpan?: string; // ISO 8601 Duration
  
  // Progress and Performance
  PercentComplete?: number; // 0-100
  PercentWorkComplete?: number; // 0-100
  PercentPhysicalWorkComplete?: number; // 0-100
  Completion?: string; // ISO 8601 DateTime
  
  // Task properties
  TaskType?: number; // 0=Fixed Units, 1=Fixed Work, 2=Fixed Duration
  Priority?: number; // 0-1000
  IsMilestone?: boolean;
  IsActive?: boolean;
  IsCritical?: boolean;
  IsEffortDriven?: boolean;
  IsManual?: boolean; // Manually scheduled
  IsSummary?: boolean;
  IsExternalTask?: boolean;
  IsSubProject?: boolean;
  IsSubProjectReadOnly?: boolean;
  IsSubProjectScheduledFromFinish?: boolean;
  IsRecurring?: boolean;
  IsRecurringSummary?: boolean;
  IsRolledUp?: boolean;
  IsOverAllocated?: boolean;
  IsDurationEstimate?: boolean;
  IsMarked?: boolean;
  IsLockedByManager?: boolean;
  UsePercentPhysicalWorkComplete?: boolean;
  IgnoreResourceCalendar?: boolean;
  
  // Constraints and deadlines
  ConstraintType?: number; // 0-7 enum (Project Online constraint types)
  ConstraintStartEnd?: string; // ISO 8601 DateTime
  Deadline?: string; // ISO 8601 DateTime
  
  // Critical path and slack
  TotalSlack?: string; // ISO 8601 Duration
  TotalSlackMilliseconds?: number;
  TotalSlackTimeSpan?: string; // ISO 8601 Duration
  FreeSlack?: string; // ISO 8601 Duration
  FreeSlackMilliseconds?: number;
  FreeSlackTimeSpan?: string; // ISO 8601 Duration
  StartSlack?: string; // ISO 8601 Duration
  StartSlackMilliseconds?: number;
  StartSlackTimeSpan?: string; // ISO 8601 Duration
  FinishSlack?: string; // ISO 8601 Duration
  FinishSlackMilliseconds?: number;
  FinishSlackTimeSpan?: string; // ISO 8601 Duration
  
  // Leveling
  LevelingDelay?: string; // Duration
  LevelingDelayMilliseconds?: number;
  LevelingDelayTimeSpan?: string; // ISO 8601 Duration
  LevelingAdjustsAssignments?: boolean;
  LevelingCanSplit?: boolean;
  PreLevelingStart?: string; // ISO 8601 DateTime
  PreLevelingFinish?: string; // ISO 8601 DateTime
  
  // Cost fields
  Cost?: number;
  ActualCost?: number;
  RemainingCost?: number;
  BaselineCost?: number;
  FixedCost?: number;
  FixedCostAccrual?: number; // 1=Start, 2=End, 3=Prorated
  OvertimeCost?: number;
  ActualOvertimeCost?: number;
  RemainingOvertimeCost?: number;
  BudgetCost?: number;
  BudgetWork?: string; // ISO 8601 Duration
  BudgetWorkMilliseconds?: number;
  BudgetWorkTimeSpan?: string; // ISO 8601 Duration
  
  // Performance indices and variance
  StartVariance?: string; // ISO 8601 Duration
  StartVarianceMilliseconds?: number;
  StartVarianceTimeSpan?: string; // ISO 8601 Duration
  FinishVariance?: string; // ISO 8601 Duration
  FinishVarianceMilliseconds?: number;
  FinishVarianceTimeSpan?: string; // ISO 8601 Duration
  WorkVariance?: string; // ISO 8601 Duration
  WorkVarianceMilliseconds?: number;
  WorkVarianceTimeSpan?: string; // ISO 8601 Duration
  DurationVariance?: string; // ISO 8601 Duration
  DurationVarianceMilliseconds?: number;
  DurationVarianceTimeSpan?: string; // ISO 8601 Duration
  CostVariance?: number;
  CostVarianceAtCompletion?: number;
  CurrentCostVariance?: number;
  CostVariancePercentage?: number;
  EstimateAtCompletion?: number;
  CostPerformanceIndex?: number;
  ScheduleCostVariance?: number;
  SchedulePerformanceIndex?: number;
  ScheduleVariancePercentage?: number;
  ToCompletePerformanceIndex?: number;
  BudgetedCostWorkPerformed?: number;
  BudgetedCostWorkScheduled?: number;
  ActualCostWorkPerformed?: number;
  
  // Timing and resume/stop
  Resume?: string; // ISO 8601 DateTime
  Stop?: string; // ISO 8601 DateTime
  
  // Text fields
  Notes?: string;
  TaskNotes?: string; // Alternative field name for notes
  StartText?: string;
  FinishText?: string;
  Contact?: string;
  WorkBreakdownStructure?: string; // WBS code
  ResourceNames?: string;
  Created?: string; // ISO 8601 DateTime
  Modified?: string; // ISO 8601 DateTime
  Status?: string;
  ExternalProjectUid?: string; // Guid
  ExternalTaskUid?: string; // Guid  
  Assignments?: {results: ProjectOnlineAssignment[]};
  Parent?: any; // Deferred object
  Predecessors?: {results: TaskLink[]};
  Successors?: any; // Deferred object
  CustomFields?: any; // Can be array or deferred object
  SubProject?: any; // Deferred object
  Calendar?: any; // Deferred object
  EntityLinks?: any; // Deferred object
  StatusManager?: any; // Deferred object
  TaskPlanLink?: any; // Deferred object
  [key: string]: any; // For custom fields with dynamic names like Custom_x005f_...
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
  MaterialLabel?: string; // Material resource specific field
  CustomFields?: []
  
  // Financial/Cost Fields
  ActualCost?: number;
  ActualCostWorkPerformed?: string;
  ActualOvertimeCost?: number;
  BaselineCost?: number;
  BudetCostWorkPerformed?: number; // Note: typo exists in Project Online
  BudgetedCost?: number;
  BudgetedCostWorkScheduled?: number;
  Cost?: number;
  CostVariance?: number;
  CostVarianceAtCompletion?: number;
  CurrentCostVariance?: number;
  RemainingCost?: number;
  RemainingOvertimeCost?: number;
  ScheduleCostVariance?: number;
  
  // Work/Time Fields
  ActualWork?: string; // ISO 8601 Duration
  ActualOvertimeWork?: string; // ISO 8601 Duration
  BaselineWork?: string; // ISO 8601 Duration
  BudgetedWork?: string; // ISO 8601 Duration
  PeakWork?: string; // ISO 8601 Duration
  PercentWorkComplete?: number;
  RegularWork?: string; // ISO 8601 Duration
  RemainingWork?: string; // ISO 8601 Duration
  RemainingOvertimeWork?: string; // ISO 8601 Duration
  Work?: string; // ISO 8601 Duration
  WorkVariance?: string; // ISO 8601 Duration
  OvertimeWork?: string; // ISO 8601 Duration
  
  // Date/Schedule Fields
  AvailableFrom?: string; // ISO 8601 DateTime
  AvailableTo?: string; // ISO 8601 DateTime
  Finish?: string; // ISO 8601 DateTime
  Start?: string; // ISO 8601 DateTime
  
  // Additional Properties
  CostAccrual?: number;
  CostCenter?: string;
  StandardRateUnits?: number;
  OvertimeRateUnits?: number;
  Phonetics?: string;
  IsBudgeted?: boolean;
  IsOverAllocated?: boolean;
  Notes?: string;
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
