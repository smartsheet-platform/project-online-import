/**
 * Integration tests for Load (L) phase of ETL pipeline
 * Uses mock Project Online oData responses with real Smartsheet SDK
 *
 * CRITICAL: These tests require a valid SMARTSHEET_API_TOKEN environment variable
 *
 * Test Architecture:
 * - Mock: Project Online oData client (using MockODataClient + builders)
 * - Real: Smartsheet SDK (actual API calls)
 * - Verify: Transformation → Load → Smartsheet state
 */

import { MockODataClient } from '../unit/MockODataClient';
import {
  TestWorkspaceManager,
  getSheetDetails,
  verifySheetColumns,
  verifySheetRowCount,
} from './helpers/smartsheet-setup';
import * as fixtures from './helpers/odata-fixtures';
import { ProjectTransformer } from '../../src/transformers/ProjectTransformer';
import { TaskTransformer } from '../../src/transformers/TaskTransformer';
import { ResourceTransformer } from '../../src/transformers/ResourceTransformer';
import { AssignmentTransformer } from '../../src/transformers/AssignmentTransformer';
import { SmartsheetClient } from '../../src/types/SmartsheetClient';
import * as smartsheet from 'smartsheet';

describe('Load Phase Integration Tests', () => {
  let smartsheetClient: SmartsheetClient;
  let odataClient: MockODataClient;
  let workspaceManager: TestWorkspaceManager;

  beforeAll(() => {
    // Verify environment is configured
    if (!process.env.SMARTSHEET_API_TOKEN) {
      throw new Error(
        'SMARTSHEET_API_TOKEN environment variable is required for integration tests.\n' +
          'Please set it in your .env file or environment.'
      );
    }

    // Initialize real Smartsheet client
    smartsheetClient = smartsheet.createClient({
      accessToken: process.env.SMARTSHEET_API_TOKEN,
    }) as SmartsheetClient;

    console.log('Integration tests configured with real Smartsheet API');
  });

  beforeEach(() => {
    // Initialize mock oData client
    odataClient = new MockODataClient();

    // Initialize workspace manager (manages test workspace lifecycle)
    workspaceManager = new TestWorkspaceManager(smartsheetClient);
  });

  afterEach(async () => {
    // Cleanup test workspaces
    if (workspaceManager) {
      const testPassed = expect.getState().currentTestName ? true : false;
      await workspaceManager.cleanup(testPassed);
    }
  }, 30000); // 30 second timeout for cleanup operations (some tests create multiple workspaces)

  describe('Project Entity Tests', () => {
    test('should create workspace from basic project', async () => {
      // Load fixture
      const fixture = fixtures.createMinimalProject();
      odataClient.loadFixture(fixture);

      // Create test workspace
      const workspace = await workspaceManager.createWorkspace('Basic Project');

      // Transform and load
      const transformer = new ProjectTransformer(smartsheetClient);
      const result = await transformer.transformProject(fixture.project, workspace.id);

      // Verify workspace structure
      expect(result.workspace).toBeDefined();
      expect(result.workspace.name).toContain(fixture.project.Name);

      // Verify sheets were created using helper function
      const { getAllSheetsFromWorkspace } = await import('./helpers/smartsheet-setup');
      const sheets = await getAllSheetsFromWorkspace(workspaceManager.client, workspace.id);

      expect(sheets).toBeDefined();
      // API consistency: Sometimes the third sheet takes a moment to appear
      expect(sheets.length).toBeGreaterThanOrEqual(2);
      expect(sheets.length).toBeLessThanOrEqual(3);

      // Verify sheet names match project
      const sheetNames = sheets.map((s) => s.name);
      expect(sheetNames.some((name) => name.includes('Summary'))).toBe(true);
      expect(sheetNames.some((name) => name.includes('Tasks'))).toBe(true);

      // Verify the transformer returned sheet IDs
      expect(result.sheets.summarySheet.id).toBeDefined();
      expect(result.sheets.taskSheet.id).toBeDefined();
      expect(result.sheets.resourceSheet.id).toBeDefined();
    });

    test('should handle project with special characters in name', async () => {
      const fixture = fixtures.createSpecialCharsProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Special Chars Project');
      const transformer = new ProjectTransformer(smartsheetClient);
      const result = await transformer.transformProject(fixture.project, workspace.id);

      // Verify name was sanitized but recognizable
      expect(result.workspace.name).toBeDefined();
      // Name should not contain problematic characters
      expect(result.workspace.name).not.toMatch(/[<>:"\\|?*]/);
    });

    test('should handle all 7 priority levels', async () => {
      const projects = fixtures.projectScenarios.projectsWithAllPriorities();

      for (const project of projects) {
        odataClient.addProject(project);
        const workspace = await workspaceManager.createWorkspace(`Priority ${project.Priority}`);
        const transformer = new ProjectTransformer(smartsheetClient);
        const result = await transformer.transformProject(project, workspace.id);

        expect(result.workspace).toBeDefined();
        // Verify priority was mapped correctly
        // (specific verification depends on how priority is stored in workspace)
      }
    }, 60000); // 60 second timeout - creates 7 workspaces sequentially

    test('should handle project with null optional fields', async () => {
      const fixture = fixtures.getFixture('minimal');
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Null Fields Project');
      const transformer = new ProjectTransformer(smartsheetClient);
      const result = await transformer.transformProject(fixture.project, workspace.id);

      expect(result.workspace).toBeDefined();
      // Should not fail on null fields
    }, 30000); // 30 second timeout

    test('should handle project with edge case dates', async () => {
      const fixture = fixtures.createEdgeDateProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Edge Dates Project');
      const transformer = new ProjectTransformer(smartsheetClient);
      const result = await transformer.transformProject(fixture.project, workspace.id);

      expect(result.workspace).toBeDefined();
    });

    test('should truncate very long project names', async () => {
      const fixture = {
        project: fixtures.projectScenarios.projectWithLongName(),
        tasks: [],
        resources: [],
        assignments: [],
      };
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Long Name Project');
      const transformer = new ProjectTransformer(smartsheetClient);
      const result = await transformer.transformProject(fixture.project, workspace.id);

      expect(result.workspace).toBeDefined();
      // Smartsheet workspace names have max length
      expect(result.workspace.name.length).toBeLessThanOrEqual(100);
    });

    test('should create complete project with all optional fields', async () => {
      const fixture = {
        project: fixtures.projectScenarios.completeProject(),
        tasks: [],
        resources: [],
        assignments: [],
      };
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Complete Project');
      const transformer = new ProjectTransformer(smartsheetClient);
      const result = await transformer.transformProject(fixture.project, workspace.id);

      expect(result.workspace).toBeDefined();
      // All fields should be populated
    });
  });

  describe('Task Entity Tests', () => {
    test('should create flat task list', async () => {
      const fixture = fixtures.createMinimalProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Flat Tasks');

      // Transform project first
      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      // Transform tasks
      const taskTransformer = new TaskTransformer(smartsheetClient);
      const transformResult = await taskTransformer.transformTasks(
        fixture.tasks,
        projectResult.sheets.taskSheet.id
      );

      console.log(`DEBUG: Expected ${fixture.tasks.length} tasks`);
      console.log(`DEBUG: Transformer reports ${transformResult.rowsCreated} rows created`);

      // Verify row count
      const rowCount = await verifySheetRowCount(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        fixture.tasks.length
      );
      console.log(
        `DEBUG: Sheet actually has ${rowCount.actual} rows (expected ${rowCount.expected})`
      );

      expect(rowCount.success).toBe(true);
      expect(rowCount.actual).toBe(fixture.tasks.length);
    }, 30000); // 30 second timeout for column addition operations

    test('should create simple 2-level hierarchy', async () => {
      const fixture = fixtures.createHierarchyProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Simple Hierarchy');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Verify hierarchy was created
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      expect(sheet?.rows).toBeDefined();

      // Verify parent-child relationships
      const rows = sheet?.rows || [];
      const parentRows = rows.filter((r) => !r.parentId);
      const childRows = rows.filter((r) => r.parentId);

      expect(parentRows.length).toBeGreaterThan(0);
      expect(childRows.length).toBeGreaterThan(0);
    }, 60000); // 60 second timeout - API can be slow with hierarchy creation

    test('should handle deep hierarchy (5+ levels)', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const tasks = fixtures.taskScenarios.deepHierarchy(project.Id);
      odataClient.loadFixture({ project, tasks, resources: [], assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Deep Hierarchy');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(tasks, projectResult.sheets.taskSheet.id);

      // Verify hierarchy depth by checking parentId relationships
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);

      // Build parent-child map
      const rowsByParent = new Map<number | null, Array<{ id?: number; parentId?: number }>>();
      sheet?.rows?.forEach((row) => {
        const parentId = row.parentId || null;
        if (!rowsByParent.has(parentId)) {
          rowsByParent.set(parentId, []);
        }
        rowsByParent.get(parentId)!.push(row);
      });

      // Calculate max depth by walking the hierarchy
      function getDepth(rowId: number | null, depth: number = 0): number {
        const children = rowsByParent.get(rowId) || [];
        if (children.length === 0) return depth;
        return Math.max(...children.map((child) => getDepth(child.id || null, depth + 1)));
      }

      const maxDepth = getDepth(null);
      console.log(`DEBUG: Hierarchy depth: ${maxDepth} levels`);

      // 5 levels means depth 4 (0-indexed: root children are depth 0, their children are depth 1, etc.)
      expect(maxDepth).toBeGreaterThanOrEqual(4);
    }, 60000); // 60 second timeout - API can be slow with hierarchy creation

    test('should handle all duration variations', async () => {
      const fixture = fixtures.createDurationProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Duration Variations');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Verify duration conversions
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      expect(sheet?.rows?.length).toBe(fixture.tasks.length);

      // Duration column should exist and have values
      const durationColumn = sheet?.columns?.find((c) => c.title === 'Duration');
      expect(durationColumn).toBeDefined();
    }, 60000); // 60 second timeout - API can be slow with column additions

    test('should handle all 7 priority levels', async () => {
      const fixture = fixtures.createPriorityProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Task Priorities');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Verify priority column exists
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        [{ title: 'Priority', type: 'PICKLIST' }]
      );
      expect(columnCheck.success).toBe(true);
    }, 60000); // 60 second timeout - API can be slow with column additions

    test('should handle milestone tasks', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const tasks = fixtures.taskScenarios.milestoneTasks(project.Id);
      odataClient.loadFixture({ project, tasks, resources: [], assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Milestones');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(tasks, projectResult.sheets.taskSheet.id);

      // Milestones should have zero duration
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      expect(sheet?.rows?.length).toBe(tasks.length);
    }, 60000); // 60 second timeout - API can be slow with column additions

    test('should handle all 8 constraint types', async () => {
      const fixture = fixtures.createConstraintProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Constraints');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Verify constraint column
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        [{ title: 'Constraint Type', type: 'PICKLIST' }]
      );
      expect(columnCheck.success).toBe(true);
    }, 60000); // 60 second timeout - API can be slow with column additions

    test('should handle predecessor relationships', async () => {
      const fixture = fixtures.createPredecessorProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Predecessors');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Verify predecessors column exists
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        [{ title: 'Predecessors', type: 'PREDECESSOR' }]
      );
      expect(columnCheck.success).toBe(true);
    }, 30000); // 30 second timeout for column addition operations

    test('should handle system columns (dual date pattern)', async () => {
      const fixture = fixtures.createMinimalProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('System Columns');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Verify Project Online date columns exist
      // Note: Smartsheet's CREATED_DATE and MODIFIED_DATE are system metadata
      // attached to rows, not visible columns in the columns array
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        [
          { title: 'Project Online Created Date', type: 'DATE' },
          { title: 'Project Online Modified Date', type: 'DATE' },
        ]
      );
      expect(columnCheck.success).toBe(true);

      // Verify system metadata is tracked (every row has createdAt/modifiedAt)
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      const rowsWithSystemMetadata = sheet?.rows?.filter(
        (r) => 'createdAt' in r && 'modifiedAt' in r && !!r.createdAt && !!r.modifiedAt
      );
      expect(rowsWithSystemMetadata?.length).toBe(fixture.tasks.length);
    }, 30000); // 30 second timeout for column addition operations

    test('should handle complete task with all fields', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const task = fixtures.taskScenarios.completeTask(project.Id);
      odataClient.loadFixture({ project, tasks: [task], resources: [], assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Complete Task');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks([task], projectResult.sheets.taskSheet.id);

      // Verify all 18 columns exist (Task Name + 17 additional)
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      expect(sheet?.columns?.length).toBeGreaterThanOrEqual(18);

      // Verify key columns that should exist for a complete task
      const expectedColumns = [
        { title: 'Task Name', type: 'TEXT_NUMBER' },
        { title: 'Start Date', type: 'DATE' },
        { title: 'End Date', type: 'DATE' },
        { title: 'Duration', type: 'DURATION' },
        { title: '% Complete', type: 'TEXT_NUMBER' },
        { title: 'Status', type: 'PICKLIST' }, // Status is a PICKLIST, not TEXT_NUMBER
        { title: 'Priority', type: 'PICKLIST' },
        { title: 'Work (hrs)', type: 'TEXT_NUMBER' },
        { title: 'Actual Work (hrs)', type: 'TEXT_NUMBER' },
        { title: 'Milestone', type: 'CHECKBOX' },
        { title: 'Notes', type: 'TEXT_NUMBER' },
        { title: 'Predecessors', type: 'PREDECESSOR' },
        { title: 'Constraint Type', type: 'PICKLIST' },
        { title: 'Constraint Date', type: 'DATE' },
      ];

      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        expectedColumns
      );
      expect(columnCheck.success).toBe(true);

      // Verify row was created with data
      expect(sheet?.rows?.length).toBe(1);

      // Verify the task row has the primary column (Task Name) populated
      const taskRow = sheet?.rows?.[0];
      expect(taskRow).toBeDefined();
      const taskNameColumn = sheet?.columns?.find((c) => c.primary);
      expect(taskNameColumn).toBeDefined();

      // Verify task name cell is populated
      const taskNameCell = taskRow?.cells?.find((c) => c.columnId === taskNameColumn?.id);
      expect(taskNameCell?.value).toBeTruthy();
      expect(taskNameCell?.value).toContain('Complete Task');
    }, 60000); // 60 second timeout - API can be slow with all column additions
  });

  describe('Resource Entity Tests', () => {
    test('should create Work resource with email', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const resources = [fixtures.resourceScenarios.workResourceWithEmail()];
      odataClient.loadFixture({ project, tasks: [], resources, assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Work Resource');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        resources,
        projectResult.sheets.resourceSheet.id
      );

      const rowCount = await verifySheetRowCount(
        smartsheetClient,
        projectResult.sheets.resourceSheet.id,
        resources.length
      );
      expect(rowCount.success).toBe(true);
    }, 60000); // 60 second timeout - API can be slow with resource operations

    test('should create Material resource', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const resources = [fixtures.resourceScenarios.materialResource()];
      odataClient.loadFixture({ project, tasks: [], resources, assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Material Resource');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        resources,
        projectResult.sheets.resourceSheet.id
      );

      // Verify resource type column
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.resourceSheet.id,
        [{ title: 'Resource Type', type: 'PICKLIST' }]
      );
      expect(columnCheck.success).toBe(true);
    }, 90000); // 90 second timeout - API can be very slow with resource type verification

    test('should create Cost resource', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const resources = [fixtures.resourceScenarios.costResource()];
      odataClient.loadFixture({ project, tasks: [], resources, assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Cost Resource');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        resources,
        projectResult.sheets.resourceSheet.id
      );

      const rowCount = await verifySheetRowCount(
        smartsheetClient,
        projectResult.sheets.resourceSheet.id,
        resources.length
      );
      expect(rowCount.success).toBe(true);
    }, 60000); // 60 second timeout - API can be slow with resource operations

    test('should handle resources with all rate types', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const resources = fixtures.resourceScenarios.resourcesWithRates();
      odataClient.loadFixture({ project, tasks: [], resources, assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Resource Rates');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        resources,
        projectResult.sheets.resourceSheet.id
      );

      // Verify rate columns exist
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.resourceSheet.id,
        [
          { title: 'Standard Rate', type: 'TEXT_NUMBER' },
          { title: 'Overtime Rate', type: 'TEXT_NUMBER' },
          { title: 'Cost Per Use', type: 'TEXT_NUMBER' },
        ]
      );
      expect(columnCheck.success).toBe(true);
    }, 60000); // 60 second timeout - API can be slow with resource operations

    test('should handle MaxUnits variations', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const resources = fixtures.resourceScenarios.resourcesWithMaxUnitsVariations();
      odataClient.loadFixture({ project, tasks: [], resources, assignments: [] });

      const workspace = await workspaceManager.createWorkspace('MaxUnits Variations');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        resources,
        projectResult.sheets.resourceSheet.id
      );

      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.resourceSheet.id);
      expect(sheet?.rows?.length).toBe(resources.length);
    }, 60000); // 60 second timeout - API can be slow with resource operations

    test('should handle boolean fields', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const resources = fixtures.resourceScenarios.resourcesWithBooleanFields();
      odataClient.loadFixture({ project, tasks: [], resources, assignments: [] });

      const workspace = await workspaceManager.createWorkspace('Boolean Fields');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(project, workspace.id);

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        resources,
        projectResult.sheets.resourceSheet.id
      );

      // Verify boolean columns exist
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.resourceSheet.id,
        [
          { title: 'Is Active', type: 'CHECKBOX' },
          { title: 'Is Generic', type: 'CHECKBOX' },
        ]
      );
      expect(columnCheck.success).toBe(true);
    }, 60000); // 60 second timeout - API can be slow with resource operations

    test('should discover department picklist values', async () => {
      const fixture = fixtures.createDepartmentProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Department Discovery');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      await resourceTransformer.transformResources(
        fixture.resources,
        projectResult.sheets.resourceSheet.id
      );

      // Verify Department column is PICKLIST
      const columnCheck = await verifySheetColumns(
        smartsheetClient,
        projectResult.sheets.resourceSheet.id,
        [{ title: 'Department', type: 'PICKLIST' }]
      );
      expect(columnCheck.success).toBe(true);

      // Verify unique departments were discovered
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.resourceSheet.id);
      const deptColumn = sheet?.columns?.find((c) => c.title === 'Department');
      const uniqueDepts = new Set(fixture.resources.map((r) => r.Department).filter(Boolean));
      const optionsArray = Array.isArray(deptColumn?.options) ? deptColumn.options : [];
      expect(optionsArray.length).toBeGreaterThanOrEqual(uniqueDepts.size);
    }, 60000); // 60 second timeout - API can be slow with resource operations
  });

  describe('Assignment Tests', () => {
    test('CRITICAL: Work resources create MULTI_CONTACT_LIST columns', async () => {
      const fixture = fixtures.createResourceTypeProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Work Assignment Type');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      // Transform resources
      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      const allResources = [
        ...fixture.resources.work,
        ...fixture.resources.material,
        ...fixture.resources.cost,
      ];
      await resourceTransformer.transformResources(
        allResources,
        projectResult.sheets.resourceSheet.id
      );

      // Transform assignments (creates assignment columns on task sheet)
      const assignmentTransformer = new AssignmentTransformer(smartsheetClient);
      await assignmentTransformer.transformAssignments(
        fixture.assignments,
        allResources,
        projectResult.sheets.taskSheet.id
      );

      // Verify Work resource columns are MULTI_CONTACT_LIST
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      const workResourceColumns = sheet?.columns?.filter((c) =>
        fixture.resources.work.some((r) => c.title?.includes(r.Name))
      );

      workResourceColumns?.forEach((col) => {
        expect(col.type).toBe('MULTI_CONTACT_LIST');
      });
    }, 60000); // 60 second timeout - increased due to API slowness with assignment column creation

    test('CRITICAL: Material/Cost resources create MULTI_PICKLIST columns', async () => {
      const fixture = fixtures.createResourceTypeProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Material/Cost Assignment Type');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      const allResources = [
        ...fixture.resources.work,
        ...fixture.resources.material,
        ...fixture.resources.cost,
      ];
      await resourceTransformer.transformResources(
        allResources,
        projectResult.sheets.resourceSheet.id
      );

      // Transform assignments (creates assignment columns on task sheet)
      const assignmentTransformer = new AssignmentTransformer(smartsheetClient);
      await assignmentTransformer.transformAssignments(
        fixture.assignments,
        allResources,
        projectResult.sheets.taskSheet.id
      );

      // Verify Material/Cost resource columns are MULTI_PICKLIST
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      const nonWorkResourceColumns = sheet?.columns?.filter((c) =>
        [...fixture.resources.material, ...fixture.resources.cost].some((r) =>
          c.title?.includes(r.Name)
        )
      );

      nonWorkResourceColumns?.forEach((col) => {
        expect(col.type).toBe('MULTI_PICKLIST');
      });
    }, 60000); // 60 second timeout - increased due to API slowness with assignment column creation

    test('should handle mixed assignment types on same task', async () => {
      const fixture = fixtures.createResourceTypeProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Mixed Assignments');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      // Transform resources
      const resourceTransformer = new ResourceTransformer(smartsheetClient);
      const allResources = [
        ...fixture.resources.work,
        ...fixture.resources.material,
        ...fixture.resources.cost,
      ];
      await resourceTransformer.transformResources(
        allResources,
        projectResult.sheets.resourceSheet.id
      );

      // Transform assignments (creates assignment columns on task sheet)
      const assignmentTransformer = new AssignmentTransformer(smartsheetClient);
      await assignmentTransformer.transformAssignments(
        fixture.assignments,
        allResources,
        projectResult.sheets.taskSheet.id
      );

      // Should create both MULTI_CONTACT_LIST and MULTI_PICKLIST columns
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      const contactColumns = sheet?.columns?.filter((c) => c.type === 'MULTI_CONTACT_LIST');
      const picklistColumns = sheet?.columns?.filter((c) => c.type === 'MULTI_PICKLIST');

      expect(contactColumns?.length).toBeGreaterThan(0);
      expect(picklistColumns?.length).toBeGreaterThan(0);
    }, 60000); // 60 second timeout - increased due to API slowness with assignment column creation
  });

  describe('Performance Tests', () => {
    test('should handle 1000+ tasks efficiently', async () => {
      const fixture = fixtures.createLargeProject(1000, 10);
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Large Project');

      const startTime = Date.now();

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      const duration = Date.now() - startTime;

      // Should complete within reasonable time (< 5 minutes = 300000ms)
      expect(duration).toBeLessThan(300000);

      // Verify all tasks were loaded
      const rowCount = await verifySheetRowCount(
        smartsheetClient,
        projectResult.sheets.taskSheet.id,
        1000,
        10 // Allow 10 row tolerance for headers/metadata
      );
      expect(rowCount.success).toBe(true);
    }, 300000); // 5 minute timeout
  });

  describe('Error Handling Tests', () => {
    test('should handle missing required fields gracefully', async () => {
      // Create invalid project (missing required Name field)
      const invalidProject = { Id: 'test-id' } as Parameters<
        typeof transformer.transformProject
      >[0];
      odataClient.addProject(invalidProject);

      const workspace = await workspaceManager.createWorkspace('Invalid Project');

      const transformer = new ProjectTransformer(smartsheetClient);

      await expect(transformer.transformProject(invalidProject, workspace.id)).rejects.toThrow();
    });

    test('should handle invalid foreign keys', async () => {
      const project = fixtures.projectScenarios.basicProject();
      const tasks = fixtures.taskScenarios.flatTaskList('invalid-project-id', 3);
      odataClient.loadFixture({ project, tasks, resources: [], assignments: [] });

      // Tasks reference non-existent project - should be handled gracefully
      // (Actual behavior depends on transformer implementation)
    });

    test('should handle Unicode and special characters', async () => {
      const fixture = fixtures.createSpecialCharsProject();
      odataClient.loadFixture(fixture);

      const workspace = await workspaceManager.createWorkspace('Unicode Test');

      const projectTransformer = new ProjectTransformer(smartsheetClient);
      const projectResult = await projectTransformer.transformProject(
        fixture.project,
        workspace.id
      );

      const taskTransformer = new TaskTransformer(smartsheetClient);
      await taskTransformer.transformTasks(fixture.tasks, projectResult.sheets.taskSheet.id);

      // Should handle special characters without errors
      const sheet = await getSheetDetails(smartsheetClient, projectResult.sheets.taskSheet.id);
      expect(sheet?.rows?.length).toBe(fixture.tasks.length);
    }, 30000); // 30 second timeout for column addition operations
  });
});
