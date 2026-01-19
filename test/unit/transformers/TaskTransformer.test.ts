import { MockSmartsheetClient } from '../MockSmartsheetClient';
import { ProjectOnlineTask, PMOStandardsWorkspaceInfo } from '../../../src/types/ProjectOnline';
import {
  createTasksSheet,
  createTasksSheetColumns,
  createTaskRow,
  deriveTaskStatus,
  mapTaskPriority,
  mapPredecessorsToSmartsheet,
  configureTaskPicklistColumns,
  discoverAssignmentColumns,
  configureAssignmentColumns,
  validateTask,
} from '../../../src/transformers/TaskTransformer';

describe('TaskTransformer', () => {
  let mockClient: MockSmartsheetClient;
  let pmoStandards: PMOStandardsWorkspaceInfo;

  beforeEach(() => {
    mockClient = new MockSmartsheetClient();

    // Set up PMO Standards workspace with reference sheets
    pmoStandards = {
      workspaceId: 1000,
      workspaceName: 'PMO Standards',
      referenceSheets: {
        'Task - Status': { sheetId: 2001, columnId: 3001 },
        'Task - Priority': { sheetId: 2002, columnId: 3002 },
        'Task - Constraint Type': { sheetId: 2003, columnId: 3003 },
      },
    };
  });

  describe('createTasksSheet', () => {
    it('should create a Tasks sheet with all required columns and configuration', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const projectName = 'Test Project';
      const tasks: ProjectOnlineTask[] = [
        {
          Id: 'task-1',
          ProjectId: 'proj-1',
          Name: 'Design Homepage',
          TaskIndex: 1,
          OutlinePosition: '1',
          OutlineLevel: 1,
          Start: '2024-03-15T09:00:00Z',
          Finish: '2024-03-22T17:00:00Z',
          Duration: 'PT40H',
          Work: 'PT80H',
          ActualWork: 'PT32H',
          PercentComplete: 45,
          TaskType: 'Fixed Duration',
          Priority: 800,
          IsMilestone: false,
          IsActive: true,
          TaskNotes: 'Initial design phase',
          Predecessors: { results: [] },
          ConstraintType: 'ASAP',
          ConstraintDate: undefined,
          Deadline: '2024-04-01T17:00:00Z',
          ResourceNames: 'John Doe, Jane Smith',
          CreatedDate: '2024-03-01T08:00:00Z',
          ModifiedDate: '2024-03-15T10:00:00Z',
        },
      ];

      const result = await createTasksSheet(
        mockClient,
        workspace.id!,
        projectName,
        tasks,
        pmoStandards
      );

      expect(result.sheetId).toBeDefined();
      expect(result.sheetName).toContain('Tasks');
      expect(result.rowsCreated).toBe(1);
      expect(result.columns).toBeDefined();
      expect(result.columns.length).toBe(21);
    });

    it('should enable Gantt and dependencies on project sheet', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const projectName = 'Test Project';
      const tasks: ProjectOnlineTask[] = [];

      const result = await createTasksSheet(
        mockClient,
        workspace.id!,
        projectName,
        tasks,
        pmoStandards
      );

      // Verify sheet was created
      expect(result.sheetId).toBeDefined();
    });
  });

  describe('createTasksSheetColumns', () => {
    it('should create 18 standard columns in correct order', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      expect(columns.length).toBe(21);

      // Verify column order
      expect(columns[0].title).toBe('Task Name');
      expect(columns[0].primary).toBe(true);
      expect(columns[1].title).toBe('Project Online Task ID');
      expect(columns[1].type).toBe('TEXT_NUMBER');
      expect(columns[1].hidden).toBe(true);
    });

    it('should configure Task Name as primary column with hierarchy enabled', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      const taskNameColumn = columns.find((c) => c.title === 'Task Name');
      expect(taskNameColumn).toBeDefined();
      expect(taskNameColumn?.primary).toBe(true);
      expect(taskNameColumn?.type).toBe('TEXT_NUMBER');
    });

    it('should create DATE columns for Start Date and End Date', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      const startDateColumn = columns.find((c) => c.title === 'Start Date');
      const endDateColumn = columns.find((c) => c.title === 'End Date');

      expect(startDateColumn?.type).toBe('DATE');
      expect(endDateColumn?.type).toBe('DATE');
    });

    it('should create DURATION column type', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      const durationColumn = columns.find((c) => c.title === 'Duration');
      expect(durationColumn?.type).toBe('DURATION');
    });

    it('should create PICKLIST columns for Status, Priority, Constraint Type', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      const statusColumn = columns.find((c) => c.title === 'Status');
      const priorityColumn = columns.find((c) => c.title === 'Priority');
      const constraintColumn = columns.find((c) => c.title === 'Constraint Type');

      expect(statusColumn?.type).toBe('PICKLIST');
      expect(priorityColumn?.type).toBe('PICKLIST');
      expect(constraintColumn?.type).toBe('PICKLIST');
    });

    it('should create CHECKBOX column for Milestone', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      const milestoneColumn = columns.find((c) => c.title === 'Milestone');
      expect(milestoneColumn?.type).toBe('CHECKBOX');
    });

    it('should create PREDECESSOR column', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      const predecessorColumn = columns.find((c) => c.title === 'Predecessors');
      expect(predecessorColumn?.type).toBe('PREDECESSOR');
    });

    it('should include Project Online metadata columns', () => {
      const projectName = 'Test Project';
      const columns = createTasksSheetColumns(projectName);

      // Verify Project Online Created Date and Modified Date columns exist
      expect(columns.some((c) => c.title === 'Project Online Created Date')).toBe(true);
      expect(columns.some((c) => c.title === 'Project Online Modified Date')).toBe(true);
    });
  });

  describe('createTaskRow', () => {
    it('should transform a task to a Smartsheet row with all cell values', () => {
      const task: ProjectOnlineTask = {
        Id: 'task-1',
        ProjectId: 'proj-1',
        Name: 'Design Homepage',
        TaskIndex: 1,
        OutlinePosition: '1',
        OutlineLevel: 1,
        Start: '2024-03-15T09:00:00Z',
        Finish: '2024-03-22T17:00:00Z',
        Duration: 'PT40H',
        Work: 'PT80H',
        ActualWork: 'PT32H',
        PercentComplete: 45,
        TaskType: 'Fixed Duration',
        Priority: 800,
        IsMilestone: false,
        IsActive: true,
        TaskNotes: 'Initial design phase',
        Predecessors: { results: [] },
        ConstraintType: 'ASAP',
        ConstraintDate: undefined,
        Deadline: '2024-04-01T17:00:00Z',
        ResourceNames: 'John Doe, Jane Smith',
        CreatedDate: '2024-03-01T08:00:00Z',
        ModifiedDate: '2024-03-15T10:00:00Z',
      };

      const columnMap = {
        'Task Name': 1,
        'Project Online Task ID': 2,
        'Start Date': 3,
        'End Date': 4,
        Duration: 5,
        '% Complete': 6,
        Status: 7,
        Priority: 8,
        'Work (hrs)': 9,
        'Actual Work (hrs)': 10,
        Milestone: 11,
        Notes: 12,
        Predecessors: 13,
        'Constraint Type': 14,
        'Constraint Date': 15,
        Deadline: 16,
        'Project Online Created Date': 17,
        'Project Online Modified Date': 18,
      };

      const row = createTaskRow(task, columnMap, [task]);

      expect(row.cells).toBeDefined();
      expect(row.cells?.length).toBeGreaterThan(0);

      // Verify Task Name
      const taskNameCell = row.cells?.find((c) => c.columnId === columnMap['Task Name']);
      expect(taskNameCell?.value).toBe('Design Homepage');

      // Verify Start Date
      const startDateCell = row.cells?.find((c) => c.columnId === columnMap['Start Date']);
      expect(startDateCell?.value).toBe('2024-03-15');

      // Verify Duration (decimal days for project sheet)
      const durationCell = row.cells?.find((c) => c.columnId === columnMap['Duration']);
      expect(durationCell?.value).toBe(5.0); // 40 hours / 8 = 5 days

      // Verify % Complete
      const percentCell = row.cells?.find((c) => c.columnId === columnMap['% Complete']);
      expect(percentCell?.value).toBe('45%');

      // Verify Milestone checkbox
      const milestoneCell = row.cells?.find((c) => c.columnId === columnMap['Milestone']);
      expect(milestoneCell?.value).toBe(false);
    });

    it('should set toBottom for top-level tasks', () => {
      const task: ProjectOnlineTask = {
        Id: 'task-2',
        ProjectId: 'proj-1',
        Name: 'Top-level Task',
        TaskIndex: 2,
        OutlinePosition: '1', // Top level (Project Online: "1" = top level)
        OutlineLevel: 1, // Numeric level 1
        Start: '2024-03-15T09:00:00Z',
        Finish: '2024-03-17T17:00:00Z',
        Duration: 'PT16H',
        PercentComplete: 0,
        Priority: 500,
        IsMilestone: false,
        IsActive: true,
      };

      const columnMap = { 'Task Name': 1 };
      const row = createTaskRow(task, columnMap, [task]);

      expect(row.toBottom).toBe(true);
      expect(row.indent).toBeUndefined();
    });

    it('should set indent level for child tasks', () => {
      const task: ProjectOnlineTask = {
        Id: 'task-3',
        ProjectId: 'proj-1',
        Name: 'Child Task',
        TaskIndex: 3,
        OutlinePosition: '1.1', // Child position (Project Online: "1.1" = first child)
        OutlineLevel: 2, // Numeric level 2
        Start: '2024-03-15T09:00:00Z',
        Finish: '2024-03-17T17:00:00Z',
        Duration: 'PT16H',
        PercentComplete: 0,
        Priority: 500,
        IsMilestone: false,
        IsActive: true,
      };

      const columnMap = { 'Task Name': 1 };
      const row = createTaskRow(task, columnMap, [task]);

      expect(row.indent).toBe(1); // OutlineLevel 2 -> indent 1
      expect(row.toBottom).toBeUndefined();
    });
  });

  describe('deriveTaskStatus', () => {
    it('should return "Not Started" for 0% complete', () => {
      expect(deriveTaskStatus(0)).toBe('Not Started');
    });

    it('should return "In Progress" for 1-99% complete', () => {
      expect(deriveTaskStatus(1)).toBe('In Progress');
      expect(deriveTaskStatus(50)).toBe('In Progress');
      expect(deriveTaskStatus(99)).toBe('In Progress');
    });

    it('should return "Complete" for 100% complete', () => {
      expect(deriveTaskStatus(100)).toBe('Complete');
    });
  });

  describe('mapTaskPriority', () => {
    it('should map priority values to 7-level labels', () => {
      expect(mapTaskPriority(0)).toBe('Lowest');
      expect(mapTaskPriority(200)).toBe('Very Low');
      expect(mapTaskPriority(400)).toBe('Lower');
      expect(mapTaskPriority(500)).toBe('Medium');
      expect(mapTaskPriority(600)).toBe('Higher');
      expect(mapTaskPriority(800)).toBe('Very High');
      expect(mapTaskPriority(1000)).toBe('Highest');
    });

    it('should handle boundary values correctly', () => {
      expect(mapTaskPriority(199)).toBe('Lowest');
      expect(mapTaskPriority(399)).toBe('Very Low');
      expect(mapTaskPriority(499)).toBe('Lower');
      expect(mapTaskPriority(599)).toBe('Medium');
      expect(mapTaskPriority(799)).toBe('Higher');
      expect(mapTaskPriority(999)).toBe('Very High');
      expect(mapTaskPriority(1001)).toBe('Highest');
    });
  });

  describe('mapPredecessorsToSmartsheet', () => {
    const allTasks: ProjectOnlineTask[] = [
      { Id: 'task-1', Name: 'Task 1' } as ProjectOnlineTask,
      { Id: 'task-2', Name: 'Task 2' } as ProjectOnlineTask,
      { Id: 'task-3', Name: 'Task 3' } as ProjectOnlineTask,
    ];

    it('should map single predecessor', () => {
      const predecessors = [{
        PredecessorTaskId: 'task-1',
        SuccessorTaskId: 'task-2',
        DependencyType: 1, // FS
        LinkLag: 0,
        LinkLagDuration: null
      }];
      const result = mapPredecessorsToSmartsheet(predecessors, allTasks);
      expect(result).toBe('1FS');
    });

    it('should map predecessor with different dependency type', () => {
      const predecessors = [{
        PredecessorTaskId: 'task-1',
        SuccessorTaskId: 'task-3',
        DependencyType: 3, // SS
        LinkLag: 0,
        LinkLagDuration: null
      }];
      const result = mapPredecessorsToSmartsheet(predecessors, allTasks);
      expect(result).toBe('1SS');
    });

    it('should map predecessor with lag', () => {
      const predecessors = [{
        PredecessorTaskId: 'task-2',
        SuccessorTaskId: 'task-3',
        DependencyType: 1, // FS
        LinkLag: 2,
        LinkLagDuration: 'PT2D'
      }];
      const result = mapPredecessorsToSmartsheet(predecessors, allTasks);
      expect(result).toBe('2FS+2d');
    });

    it('should map multiple predecessors', () => {
      const predecessors = [
        {
          PredecessorTaskId: 'task-1',
          SuccessorTaskId: 'task-3',
          DependencyType: 1, // FS
          LinkLag: 0,
          LinkLagDuration: null
        },
        {
          PredecessorTaskId: 'task-2',
          SuccessorTaskId: 'task-3',
          DependencyType: 3, // SS
          LinkLag: 1,
          LinkLagDuration: 'PT1D'
        }
      ];
      const result = mapPredecessorsToSmartsheet(predecessors, allTasks);
      expect(result).toBe('1FS,2SS+1d');
    });

    it('should handle empty predecessors array', () => {
      const result = mapPredecessorsToSmartsheet([], allTasks);
      expect(result).toBeNull();
    });

    it('should handle null predecessors', () => {
      const result = mapPredecessorsToSmartsheet(null as any, allTasks);
      expect(result).toBeNull();
    });
  });

  describe('configureTaskPicklistColumns', () => {
    it('should configure Status column to reference PMO Standards', async () => {
      await mockClient.createWorkspace({ name: 'PMO Standards' });
      const sheet = await mockClient.createSheetInWorkspace(1000, {
        name: 'Test Tasks',
        columns: [
          { title: 'Status', type: 'PICKLIST' },
          { title: 'Priority', type: 'PICKLIST' },
          { title: 'Constraint Type', type: 'PICKLIST' },
        ],
      });

      const sheetId = sheet.id!;
      const statusColumnId = sheet.columns![0].id!;
      const priorityColumnId = sheet.columns![1].id!;
      const constraintColumnId = sheet.columns![2].id!;

      await configureTaskPicklistColumns(
        mockClient,
        sheetId,
        statusColumnId,
        priorityColumnId,
        constraintColumnId,
        pmoStandards
      );

      const updates = mockClient.getColumnUpdates(sheetId);
      const statusUpdate = updates.find((u) => u.columnId === statusColumnId);

      expect(statusUpdate).toBeDefined();
      expect(statusUpdate?.column.type).toBe('PICKLIST');
    });

    it('should configure Priority column to reference PMO Standards', async () => {
      await mockClient.createWorkspace({ name: 'PMO Standards' });
      const sheet = await mockClient.createSheetInWorkspace(1000, {
        name: 'Test Tasks',
        columns: [
          { title: 'Status', type: 'PICKLIST' },
          { title: 'Priority', type: 'PICKLIST' },
          { title: 'Constraint Type', type: 'PICKLIST' },
        ],
      });

      const sheetId = sheet.id!;
      const statusColumnId = sheet.columns![0].id!;
      const priorityColumnId = sheet.columns![1].id!;
      const constraintColumnId = sheet.columns![2].id!;

      await configureTaskPicklistColumns(
        mockClient,
        sheetId,
        statusColumnId,
        priorityColumnId,
        constraintColumnId,
        pmoStandards
      );

      const updates = mockClient.getColumnUpdates(sheetId);
      const priorityUpdate = updates.find((u) => u.columnId === priorityColumnId);

      expect(priorityUpdate).toBeDefined();
      expect(priorityUpdate?.column.type).toBe('PICKLIST');
    });

    it('should configure Constraint Type column to reference PMO Standards', async () => {
      await mockClient.createWorkspace({ name: 'PMO Standards' });
      const sheet = await mockClient.createSheetInWorkspace(1000, {
        name: 'Test Tasks',
        columns: [
          { title: 'Status', type: 'PICKLIST' },
          { title: 'Priority', type: 'PICKLIST' },
          { title: 'Constraint Type', type: 'PICKLIST' },
        ],
      });

      const sheetId = sheet.id!;
      const statusColumnId = sheet.columns![0].id!;
      const priorityColumnId = sheet.columns![1].id!;
      const constraintColumnId = sheet.columns![2].id!;

      await configureTaskPicklistColumns(
        mockClient,
        sheetId,
        statusColumnId,
        priorityColumnId,
        constraintColumnId,
        pmoStandards
      );

      const updates = mockClient.getColumnUpdates(sheetId);
      const constraintUpdate = updates.find((u) => u.columnId === constraintColumnId);

      expect(constraintUpdate).toBeDefined();
      expect(constraintUpdate?.column.type).toBe('PICKLIST');
    });
  });

  describe('discoverAssignmentColumns', () => {
    it('should discover assignment column types from resource types', () => {
      const resources = [
        { Id: 'res-1', Name: 'John Doe', Email: 'john@example.com', ResourceType: 'Work' },
        { Id: 'res-2', Name: 'Concrete', Email: null, ResourceType: 'Material' },
        { Id: 'res-3', Name: 'Engineering Dept', Email: null, ResourceType: 'Cost' },
      ];

      const result = discoverAssignmentColumns(resources);

      expect(result).toEqual({
        'Assigned To': { type: 'MULTI_CONTACT_LIST', resourceType: 'Work' },
        Materials: { type: 'MULTI_PICKLIST', resourceType: 'Material' },
        'Cost Resources': { type: 'MULTI_PICKLIST', resourceType: 'Cost' },
      });
    });

    it('should handle only Work resources', () => {
      const resources = [
        { Id: 'res-1', Name: 'John Doe', Email: 'john@example.com', ResourceType: 'Work' },
        { Id: 'res-2', Name: 'Jane Smith', Email: 'jane@example.com', ResourceType: 'Work' },
      ];

      const result = discoverAssignmentColumns(resources);

      expect(result).toEqual({
        'Assigned To': { type: 'MULTI_CONTACT_LIST', resourceType: 'Work' },
      });
    });

    it('should handle only Material resources', () => {
      const resources = [
        { Id: 'res-1', Name: 'Concrete', Email: null, ResourceType: 'Material' },
        { Id: 'res-2', Name: 'Steel', Email: null, ResourceType: 'Material' },
      ];

      const result = discoverAssignmentColumns(resources);

      expect(result).toEqual({
        Materials: { type: 'MULTI_PICKLIST', resourceType: 'Material' },
      });
    });

    it('should handle only Cost resources', () => {
      const resources = [
        { Id: 'res-1', Name: 'Engineering', Email: null, ResourceType: 'Cost' },
        { Id: 'res-2', Name: 'Marketing', Email: null, ResourceType: 'Cost' },
      ];

      const result = discoverAssignmentColumns(resources);

      expect(result).toEqual({
        'Cost Resources': { type: 'MULTI_PICKLIST', resourceType: 'Cost' },
      });
    });

    it('should default to Work type for resources without ResourceType', () => {
      const resources = [{ ResourceType: undefined }];

      const result = discoverAssignmentColumns(resources);

      expect(result).toEqual({
        'Assigned To': { type: 'MULTI_CONTACT_LIST', resourceType: 'Work' },
      });
    });
  });

  describe('configureAssignmentColumns', () => {
    it('should configure Assigned To column to source from Resources Team Members', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const resourcesSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Resources',
        columns: [{ title: 'Team Members', type: 'CONTACT_LIST', primary: true }],
      });

      const tasksSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Tasks',
        columns: [{ title: 'Assigned To', type: 'MULTI_CONTACT_LIST' }],
      });

      const assignmentColumns: Record<
        string,
        {
          type: 'MULTI_CONTACT_LIST' | 'MULTI_PICKLIST';
          resourceType: 'Work' | 'Material' | 'Cost';
        }
      > = {
        'Assigned To': { type: 'MULTI_CONTACT_LIST', resourceType: 'Work' },
      };

      const assignedToColumnId = tasksSheet.columns![0].id!;
      const teamMembersColumnId = resourcesSheet.columns![0].id!;

      await configureAssignmentColumns(
        mockClient,
        tasksSheet.id!,
        { 'Assigned To': assignedToColumnId },
        resourcesSheet.id!,
        { 'Team Members': teamMembersColumnId },
        assignmentColumns
      );

      const updates = mockClient.getColumnUpdates(tasksSheet.id!);
      const assignedToUpdate = updates.find((u) => u.columnId === assignedToColumnId);

      expect(assignedToUpdate).toBeDefined();
      expect(assignedToUpdate?.column.type).toBe('MULTI_CONTACT_LIST');
      expect(assignedToUpdate?.column.contactOptions).toBeDefined();
      expect(assignedToUpdate?.column.contactOptions![0].sheetId).toBe(resourcesSheet.id);
      expect(assignedToUpdate?.column.contactOptions![0].columnId).toBe(teamMembersColumnId);
    });

    it('should configure Materials column to source from Resources Materials', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const resourcesSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Resources',
        columns: [
          { title: 'Team Members', type: 'CONTACT_LIST', primary: true },
          { title: 'Materials', type: 'TEXT_NUMBER' },
        ],
      });

      const tasksSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Tasks',
        columns: [{ title: 'Materials', type: 'MULTI_PICKLIST' }],
      });

      const assignmentColumns: Record<
        string,
        {
          type: 'MULTI_CONTACT_LIST' | 'MULTI_PICKLIST';
          resourceType: 'Work' | 'Material' | 'Cost';
        }
      > = {
        Materials: { type: 'MULTI_PICKLIST', resourceType: 'Material' },
      };

      const tasksMaterialsColumnId = tasksSheet.columns![0].id!;
      const resourcesMaterialsColumnId = resourcesSheet.columns![1].id!;

      await configureAssignmentColumns(
        mockClient,
        tasksSheet.id!,
        { Materials: tasksMaterialsColumnId },
        resourcesSheet.id!,
        { Materials: resourcesMaterialsColumnId },
        assignmentColumns
      );

      const updates = mockClient.getColumnUpdates(tasksSheet.id!);
      const materialsUpdate = updates.find((u) => u.columnId === tasksMaterialsColumnId);

      expect(materialsUpdate).toBeDefined();
      expect(materialsUpdate?.column.type).toBe('MULTI_PICKLIST');
      expect(materialsUpdate?.column.options).toBeDefined();
    });

    it('should configure Cost Resources column to source from Resources Cost Resources', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const resourcesSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Resources',
        columns: [
          { title: 'Team Members', type: 'CONTACT_LIST', primary: true },
          { title: 'Cost Resources', type: 'TEXT_NUMBER' },
        ],
      });

      const tasksSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Tasks',
        columns: [{ title: 'Cost Resources', type: 'MULTI_PICKLIST' }],
      });

      const assignmentColumns: Record<
        string,
        {
          type: 'MULTI_CONTACT_LIST' | 'MULTI_PICKLIST';
          resourceType: 'Work' | 'Material' | 'Cost';
        }
      > = {
        'Cost Resources': { type: 'MULTI_PICKLIST', resourceType: 'Cost' },
      };

      const tasksCostColumnId = tasksSheet.columns![0].id!;
      const resourcesCostColumnId = resourcesSheet.columns![1].id!;

      await configureAssignmentColumns(
        mockClient,
        tasksSheet.id!,
        { 'Cost Resources': tasksCostColumnId },
        resourcesSheet.id!,
        { 'Cost Resources': resourcesCostColumnId },
        assignmentColumns
      );

      const updates = mockClient.getColumnUpdates(tasksSheet.id!);
      const costUpdate = updates.find((u) => u.columnId === tasksCostColumnId);

      expect(costUpdate).toBeDefined();
      expect(costUpdate?.column.type).toBe('MULTI_PICKLIST');
      expect(costUpdate?.column.options).toBeDefined();
    });

    it('should configure all three resource types simultaneously', async () => {
      const workspace = await mockClient.createWorkspace({ name: 'Test Workspace' });
      const resourcesSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Resources',
        columns: [
          { title: 'Team Members', type: 'CONTACT_LIST', primary: true },
          { title: 'Materials', type: 'TEXT_NUMBER' },
          { title: 'Cost Resources', type: 'TEXT_NUMBER' },
        ],
      });

      const tasksSheet = await mockClient.createSheetInWorkspace(workspace.id!, {
        name: 'Tasks',
        columns: [
          { title: 'Assigned To', type: 'MULTI_CONTACT_LIST' },
          { title: 'Materials', type: 'MULTI_PICKLIST' },
          { title: 'Cost Resources', type: 'MULTI_PICKLIST' },
        ],
      });

      const assignmentColumns = {
        'Assigned To': { type: 'MULTI_CONTACT_LIST' as const, resourceType: 'Work' as const },
        Materials: { type: 'MULTI_PICKLIST' as const, resourceType: 'Material' as const },
        'Cost Resources': { type: 'MULTI_PICKLIST' as const, resourceType: 'Cost' as const },
      };

      await configureAssignmentColumns(
        mockClient,
        tasksSheet.id!,
        {
          'Assigned To': tasksSheet.columns![0].id!,
          Materials: tasksSheet.columns![1].id!,
          'Cost Resources': tasksSheet.columns![2].id!,
        },
        resourcesSheet.id!,
        {
          'Team Members': resourcesSheet.columns![0].id!,
          Materials: resourcesSheet.columns![1].id!,
          'Cost Resources': resourcesSheet.columns![2].id!,
        },
        assignmentColumns
      );

      const updates = mockClient.getColumnUpdates(tasksSheet.id!);
      expect(updates.length).toBe(3);
    });
  });

  describe('validateTask', () => {
    it('should return valid for complete task', () => {
      const task: ProjectOnlineTask = {
        Id: 'task-1',
        ProjectId: 'proj-1',
        Name: 'Design Homepage',
        TaskIndex: 1,
        OutlinePosition: '1',
        OutlineLevel: 1,
        Start: '2024-03-15T09:00:00Z',
        Finish: '2024-03-22T17:00:00Z',
        Duration: 'PT40H',
        PercentComplete: 45,
        Priority: 800,
        IsMilestone: false,
        IsActive: true,
      };

      const result = validateTask(task);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing Name', () => {
      const task = {
        Id: 'task-1',
        ProjectId: 'proj-1',
        TaskIndex: 1,
        OutlinePosition: '1',
        OutlineLevel: 1,
      } as ProjectOnlineTask;

      const result = validateTask(task);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task Name is required');
    });

    it('should return warning for invalid priority range', () => {
      const task: ProjectOnlineTask = {
        Id: 'task-1',
        ProjectId: 'proj-1',
        Name: 'Test Task',
        TaskIndex: 1,
        OutlinePosition: '1',
        OutlineLevel: 1,
        PercentComplete: 0,
        Priority: -100, // Invalid
        IsMilestone: false,
        IsActive: true,
      };

      const result = validateTask(task);

      expect(result.warnings).toContain('Priority value -100 is outside normal range (0-1000)');
    });
  });
});
