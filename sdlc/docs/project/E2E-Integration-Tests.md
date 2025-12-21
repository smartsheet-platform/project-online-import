# Project Online End-to-End Integration Tests Specification

## Document Information
- **Created**: 2024-12-08
- **Purpose**: Comprehensive specification for E2E integration tests using real Project Online data
- **Related Specs**: 
  - [`sdlc/docs/project/Test-Data-Population-Script.md`](./Test-Data-Population-Script.md) - Test data population
  - [`test/integration/INTEGRATION_TEST_SPEC.md`](../../../test/integration/INTEGRATION_TEST_SPEC.md) - 31 integration test scenarios
  - [`sdlc/docs/project/ETL-System-Design.md`](./ETL-System-Design.md) - ETL architecture

## Executive Summary

This specification defines end-to-end integration tests that verify the complete ETL flow using **real Project Online data** and **real Smartsheet workspaces**. These tests validate that the system can successfully extract data from Project Online, transform it correctly, and load it into Smartsheet with full fidelity.

## Goals

1. **Full ETL Validation**: Test complete Extract → Transform → Load pipeline with real APIs
2. **Real-World Coverage**: Use actual Project Online OData API (not mocks)
3. **Comprehensive Scenarios**: Cover all 31 integration test scenarios
4. **Relationship Verification**: Validate hierarchy, assignments, predecessors preserved correctly
5. **Performance Testing**: Ensure system handles 1000+ tasks efficiently
6. **Error Resilience**: Verify error handling with real API constraints

## Test Architecture Overview

### Test Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  0. Pre-Test Setup (Manual or Automated)                             │
│     - Ensure Project Online test data exists                         │
│     - Run populate-project-online-test-data.ts if needed             │
│     - Verify API connectivity                                        │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Extract Phase (Real Project Online API)                          │
│     - Use ProjectOnlineClient with real OData calls                  │
│     - Fetch projects, tasks, resources, assignments                  │
│     - Test pagination, filtering, error handling                     │
│     - Validate extracted data structure and completeness             │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Transform Phase (Real Transformation Logic)                      │
│     - Use actual transformer classes                                 │
│     - ProjectTransformer, TaskTransformer, etc.                      │
│     - Validate transformation rules applied correctly                │
│     - Verify data type conversions (ISO8601, priorities, etc.)       │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Load Phase (Real Smartsheet API)                                 │
│     - Create real Smartsheet workspaces and sheets                   │
│     - Use actual Smartsheet client (not mocks)                       │
│     - Validate workspace structure, sheet types, columns             │
│     - Verify hierarchy, assignments, data integrity                  │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Verification Phase                                               │
│     - Query Smartsheet for loaded data                               │
│     - Compare against original Project Online data                   │
│     - Verify transformation accuracy                                 │
│     - Validate relationships preserved (hierarchy, assignments)      │
│     - Check column types, data types, special characters             │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. Cleanup Phase (Configurable)                                     │
│     - Delete test Smartsheet workspaces                              │
│     - Log cleanup status                                             │
│     - Preserve on failure for debugging (optional)                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Differences from Existing Integration Tests

| Aspect | Existing Integration Tests | E2E Integration Tests |
|--------|---------------------------|----------------------|
| **Project Online Data** | Mocked with ODataBuilders | Real API calls to Project Online |
| **Data Source** | In-memory test data | Pre-populated test data in Project Online |
| **Extract Phase** | Skipped (data already in memory) | Full extraction via ProjectOnlineClient |
| **Smartsheet** | Real Smartsheet API | Real Smartsheet API (same) |
| **Test Isolation** | Each test creates own data | Shares Project Online test data pool |
| **Setup** | Minimal (mock data generated) | Requires Project Online test data populated |
| **Duration** | Fast (~10-30s per test) | Slower (~30-60s per test due to API calls) |
| **Purpose** | Validate transformation + loading | Validate complete ETL end-to-end |

## Test Suite Structure

### File Organization

```
test/
└── e2e/
    ├── README.md                           # E2E test suite overview
    ├── e2e-setup.ts                        # E2E test configuration and helpers
    ├── e2e-project-online-extract.test.ts  # Extraction phase tests
    ├── e2e-full-etl-flow.test.ts           # Complete ETL flow tests
    ├── e2e-performance.test.ts             # Performance and scale tests
    ├── e2e-error-handling.test.ts          # Error scenarios with real API
    └── helpers/
        ├── ProjectOnlineTestDataManager.ts # Manages test data access
        ├── ETLFlowExecutor.ts              # Executes full ETL pipeline
        └── SmartsheetVerifier.ts           # Verifies Smartsheet data
```

### Test Categories

#### Category 1: Extraction Phase Tests (7 tests)

**File**: `test/e2e/e2e-project-online-extract.test.ts`

Tests the extraction phase in isolation using real Project Online API:

```typescript
describe('E2E: Project Online Extraction', () => {
  let client: ProjectOnlineClient;
  let testDataManager: ProjectOnlineTestDataManager;
  
  beforeAll(async () => {
    client = new ProjectOnlineClient(config);
    await client.testConnection();
    testDataManager = new ProjectOnlineTestDataManager(client);
  });
  
  test('E2E-EXTRACT-001: Extract basic project with OData API', async () => {
    // Find TEST_PROJECT_001_BasicProject
    const project = await testDataManager.findTestProject('TEST_PROJECT_001_BasicProject');
    expect(project).toBeDefined();
    
    // Extract project data
    const extracted = await client.extractProjectData(project.Id);
    
    // Verify extraction
    expect(extracted.project.Name).toBe('TEST_PROJECT_001_BasicProject');
    expect(extracted.tasks.length).toBeGreaterThan(0);
    expect(extracted.resources.length).toBeGreaterThan(0);
    expect(extracted.assignments.length).toBeGreaterThan(0);
  });
  
  test('E2E-EXTRACT-002: Extract project with deep hierarchy', async () => {
    const project = await testDataManager.findTestProject('TEST_PROJECT_007_DeepHierarchy');
    const extracted = await client.extractProjectData(project.Id);
    
    // Verify hierarchy levels
    const maxLevel = Math.max(...extracted.tasks.map(t => t.OutlineLevel));
    expect(maxLevel).toBeGreaterThanOrEqual(5);
    
    // Verify parent-child relationships
    const childTasks = extracted.tasks.filter(t => t.ParentTaskId);
    for (const child of childTasks) {
      const parent = extracted.tasks.find(t => t.Id === child.ParentTaskId);
      expect(parent).toBeDefined();
      expect(parent!.OutlineLevel).toBe(child.OutlineLevel - 1);
    }
  });
  
  test('E2E-EXTRACT-003: Extract with pagination (1000+ tasks)', async () => {
    const project = await testDataManager.findTestProject('TEST_PROJECT_022_Performance');
    const extracted = await client.extractProjectData(project.Id);
    
    // Verify large data set extracted successfully
    expect(extracted.tasks.length).toBeGreaterThanOrEqual(1000);
  });
  
  test('E2E-EXTRACT-004: Extract mixed resource types', async () => {
    const project = await testDataManager.findTestProject('TEST_PROJECT_021_MixedAssignments');
    const extracted = await client.extractProjectData(project.Id);
    
    // Verify all resource types present
    const workResources = extracted.resources.filter(r => r.ResourceType === 'Work');
    const materialResources = extracted.resources.filter(r => r.ResourceType === 'Material');
    const costResources = extracted.resources.filter(r => r.ResourceType === 'Cost');
    
    expect(workResources.length).toBeGreaterThan(0);
    expect(materialResources.length).toBeGreaterThan(0);
    expect(costResources.length).toBeGreaterThan(0);
  });
  
  test('E2E-EXTRACT-005: Extract with OData filtering', async () => {
    // Query with $filter
    const projects = await client.getProjects({
      $filter: "contains(Name, 'TEST_PROJECT')"
    });
    
    expect(projects.value.length).toBeGreaterThan(0);
    expect(projects.value.every(p => p.Name.includes('TEST_PROJECT'))).toBe(true);
  });
  
  test('E2E-EXTRACT-006: Extract with OData expansion', async () => {
    // Query with $expand (if supported)
    const projects = await client.getProjects({
      $expand: ['Tasks', 'Resources']
    });
    
    // Verify expansion worked (or gracefully handled if not supported)
    expect(projects.value.length).toBeGreaterThan(0);
  });
  
  test('E2E-EXTRACT-007: Handle extraction errors gracefully', async () => {
    // Try to extract non-existent project
    await expect(
      client.extractProjectData('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow();
  });
});
```

#### Category 2: Full ETL Flow Tests (25 tests)

**File**: `test/e2e/e2e-full-etl-flow.test.ts`

Tests complete Extract → Transform → Load pipeline for each of the 25 test projects:

```typescript
describe('E2E: Full ETL Flow', () => {
  let etlExecutor: ETLFlowExecutor;
  let verifier: SmartsheetVerifier;
  let testWorkspaces: Map<string, number>; // projectName → workspaceId
  
  beforeAll(async () => {
    etlExecutor = new ETLFlowExecutor(projectOnlineClient, smartsheetClient);
    verifier = new SmartsheetVerifier(smartsheetClient);
    testWorkspaces = new Map();
  });
  
  afterAll(async () => {
    // Cleanup: Delete all test workspaces
    if (config.cleanupOnSuccess) {
      for (const [projectName, workspaceId] of testWorkspaces) {
        await smartsheetClient.deleteWorkspace(workspaceId);
      }
    }
  });
  
  // Test 1: Basic Project
  test('E2E-ETL-001: Basic project with required fields only', async () => {
    const projectName = 'TEST_PROJECT_001_BasicProject';
    
    // Execute full ETL flow
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify workspace structure
    const workspace = await smartsheetClient.getWorkspace(result.workspaceId);
    expect(workspace.name).toContain(projectName);
    expect(workspace.sheets.length).toBeGreaterThanOrEqual(3); // Summary, Tasks, Resources
    
    // Verify project metadata
    const summarySheet = workspace.sheets.find(s => s.name.includes('Summary'));
    expect(summarySheet).toBeDefined();
    
    // Verify tasks loaded
    const tasksSheet = workspace.sheets.find(s => s.name.includes('Tasks'));
    expect(tasksSheet).toBeDefined();
    const tasks = await smartsheetClient.getSheet(tasksSheet!.id);
    expect(tasks.rows.length).toBe(5); // Expected 5 tasks
    
    // Verify resources loaded
    const resourcesSheet = workspace.sheets.find(s => s.name.includes('Resources'));
    expect(resourcesSheet).toBeDefined();
    const resources = await smartsheetClient.getSheet(resourcesSheet!.id);
    expect(resources.rows.length).toBe(3); // Expected 3 resources
  });
  
  // Test 2: Complete fields
  test('E2E-ETL-002: Complete project with all optional fields', async () => {
    const projectName = 'TEST_PROJECT_002_CompleteFields';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify all optional fields populated
    const summarySheet = await verifier.getSummarySheet(result.workspaceId);
    const projectRow = summarySheet.rows[0];
    
    // Verify Description, Owner, StartDate, FinishDate, Priority all present
    expect(projectRow.cells.find(c => c.columnId === summarySheet.columns.find(col => col.title === 'Description')?.id)?.value).toBeDefined();
    expect(projectRow.cells.find(c => c.columnId === summarySheet.columns.find(col => col.title === 'Owner')?.id)?.value).toBeDefined();
    expect(projectRow.cells.find(c => c.columnId === summarySheet.columns.find(col => col.title === 'Priority')?.id)?.value).toBeDefined();
  });
  
  // Test 3: Special characters
  test('E2E-ETL-003: Project with special characters requiring sanitization', async () => {
    const projectName = 'TEST_PROJECT_003_SpecialChars';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify workspace name sanitized
    const workspace = await smartsheetClient.getWorkspace(result.workspaceId);
    expect(workspace.name).not.toContain('<');
    expect(workspace.name).not.toContain('>');
    expect(workspace.name).not.toContain('"');
  });
  
  // Test 4-10: All priorities (7 projects)
  test('E2E-ETL-004: Projects with all 7 priority levels', async () => {
    const priorityProjects = [
      'TEST_PROJECT_004_Priority_Lowest',
      'TEST_PROJECT_004_Priority_VeryLow',
      'TEST_PROJECT_004_Priority_Lower',
      'TEST_PROJECT_004_Priority_Medium',
      'TEST_PROJECT_004_Priority_Higher',
      'TEST_PROJECT_004_Priority_VeryHigh',
      'TEST_PROJECT_004_Priority_Highest'
    ];
    
    for (const projectName of priorityProjects) {
      const result = await etlExecutor.executeFullETL(projectName);
      testWorkspaces.set(projectName, result.workspaceId);
      
      // Verify priority picklist value
      const summarySheet = await verifier.getSummarySheet(result.workspaceId);
      const priorityColumn = summarySheet.columns.find(c => c.title === 'Priority');
      expect(priorityColumn?.type).toBe('PICKLIST');
    }
  });
  
  // Test 11: Flat task list
  test('E2E-ETL-011: Flat task list (no hierarchy)', async () => {
    const projectName = 'TEST_PROJECT_005_FlatTaskList';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify all tasks at level 0 (no indentation)
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    expect(tasksSheet.rows.every(r => !r.parentId)).toBe(true);
  });
  
  // Test 12: Simple hierarchy
  test('E2E-ETL-012: Simple 2-level hierarchy', async () => {
    const projectName = 'TEST_PROJECT_006_SimpleHierarchy';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify hierarchy structure
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const childTasks = tasksSheet.rows.filter(r => r.parentId);
    expect(childTasks.length).toBeGreaterThan(0);
    
    // Verify parent tasks exist
    for (const child of childTasks) {
      const parent = tasksSheet.rows.find(r => r.id === child.parentId);
      expect(parent).toBeDefined();
    }
  });
  
  // Test 13: Deep hierarchy (5+ levels)
  test('E2E-ETL-013: Deep 5-level hierarchy', async () => {
    const projectName = 'TEST_PROJECT_007_DeepHierarchy';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify hierarchy depth
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const depth = verifier.calculateMaxHierarchyDepth(tasksSheet.rows);
    expect(depth).toBeGreaterThanOrEqual(5);
  });
  
  // Test 14: Complex multi-branch hierarchy
  test('E2E-ETL-014: Complex multi-branch hierarchy', async () => {
    const projectName = 'TEST_PROJECT_008_ComplexHierarchy';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify multiple root tasks (branches)
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const rootTasks = tasksSheet.rows.filter(r => !r.parentId);
    expect(rootTasks.length).toBeGreaterThan(1);
  });
  
  // Test 15: Duration variations
  test('E2E-ETL-015: Tasks with duration variations', async () => {
    const projectName = 'TEST_PROJECT_009_DurationVariations';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify duration auto-calculated from Start/End dates
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const startCol = tasksSheet.columns.find(c => c.title === 'Start');
    const endCol = tasksSheet.columns.find(c => c.title === 'End');
    const durationCol = tasksSheet.columns.find(c => c.title === 'Duration');
    
    expect(durationCol?.type).toBe('DURATION'); // Auto-calculated
  });
  
  // Test 16: Milestones
  test('E2E-ETL-016: Milestone tasks (zero duration)', async () => {
    const projectName = 'TEST_PROJECT_010_Milestones';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify milestones (Start === End)
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const milestones = tasksSheet.rows.filter(r => {
      const startCell = r.cells.find(c => c.columnId === tasksSheet.columns.find(col => col.title === 'Start')?.id);
      const endCell = r.cells.find(c => c.columnId === tasksSheet.columns.find(col => col.title === 'End')?.id);
      return startCell?.value === endCell?.value;
    });
    
    expect(milestones.length).toBeGreaterThan(0);
  });
  
  // Test 17: Constraints
  test('E2E-ETL-017: Tasks with all 8 constraint types', async () => {
    const projectName = 'TEST_PROJECT_011_Constraints';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify constraint columns created
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const constraintTypeCol = tasksSheet.columns.find(c => c.title === 'Constraint Type');
    const constraintDateCol = tasksSheet.columns.find(c => c.title === 'Constraint Date');
    
    expect(constraintTypeCol).toBeDefined();
    expect(constraintDateCol).toBeDefined();
    expect(constraintTypeCol?.type).toBe('PICKLIST');
  });
  
  // Test 18: Predecessors
  test('E2E-ETL-018: Tasks with predecessor relationships', async () => {
    const projectName = 'TEST_PROJECT_012_Predecessors';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify predecessors column
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const predecessorsCol = tasksSheet.columns.find(c => c.title === 'Predecessors');
    expect(predecessorsCol).toBeDefined();
    expect(predecessorsCol?.type).toBe('PREDECESSOR');
  });
  
  // Test 19: Work resources with email (CRITICAL)
  test('E2E-ETL-019: Work resources create MULTI_CONTACT_LIST columns', async () => {
    const projectName = 'TEST_PROJECT_019_WorkContactList';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify MULTI_CONTACT_LIST columns created
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const assignmentColumns = tasksSheet.columns.filter(c => c.title.includes('Assigned'));
    
    for (const col of assignmentColumns) {
      expect(col.type).toBe('MULTI_CONTACT_LIST');
    }
    
    // Verify contact objects have emails
    const taskWithAssignments = tasksSheet.rows.find(r => 
      r.cells.some(c => c.columnId === assignmentColumns[0]?.id && c.objectValue)
    );
    
    if (taskWithAssignments) {
      const assignmentCell = taskWithAssignments.cells.find(c => c.columnId === assignmentColumns[0]?.id);
      const contacts = assignmentCell?.objectValue?.values as any[];
      expect(contacts.every(c => c.email)).toBe(true);
    }
  });
  
  // Test 20: Material/Cost resources (CRITICAL)
  test('E2E-ETL-020: Material/Cost resources create MULTI_PICKLIST columns', async () => {
    const projectName = 'TEST_PROJECT_020_MaterialPicklist';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify MULTI_PICKLIST columns created
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const materialColumns = tasksSheet.columns.filter(c => c.title.includes('Material') || c.title.includes('Cost'));
    
    for (const col of materialColumns) {
      expect(col.type).toBe('MULTI_PICKLIST');
    }
  });
  
  // Test 21: Mixed assignments (CRITICAL)
  test('E2E-ETL-021: Mixed resource types create BOTH column types', async () => {
    const projectName = 'TEST_PROJECT_021_MixedAssignments';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify BOTH column types present
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const contactColumns = tasksSheet.columns.filter(c => c.type === 'MULTI_CONTACT_LIST');
    const picklistColumns = tasksSheet.columns.filter(c => c.type === 'MULTI_PICKLIST' && (c.title.includes('Material') || c.title.includes('Cost')));
    
    expect(contactColumns.length).toBeGreaterThan(0);
    expect(picklistColumns.length).toBeGreaterThan(0);
  });
  
  // Test 22: Performance (1000+ tasks)
  test('E2E-ETL-022: Large project with 1000+ tasks', async () => {
    const projectName = 'TEST_PROJECT_022_Performance';
    
    const startTime = Date.now();
    const result = await etlExecutor.executeFullETL(projectName);
    const duration = Date.now() - startTime;
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify all tasks loaded
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    expect(tasksSheet.rows.length).toBeGreaterThanOrEqual(1000);
    
    // Verify reasonable performance (<5 minutes)
    expect(duration).toBeLessThan(5 * 60 * 1000);
  });
  
  // Test 23: Error - missing required fields
  test('E2E-ETL-023: Handle missing required fields gracefully', async () => {
    const projectName = 'TEST_PROJECT_023_ErrorMissingFields';
    
    // Expect graceful failure
    await expect(
      etlExecutor.executeFullETL(projectName)
    ).rejects.toThrow(/required field/i);
  });
  
  // Test 24: Error - invalid foreign keys
  test('E2E-ETL-024: Handle invalid foreign keys gracefully', async () => {
    const projectName = 'TEST_PROJECT_024_ErrorInvalidFK';
    
    // Expect graceful failure
    await expect(
      etlExecutor.executeFullETL(projectName)
    ).rejects.toThrow(/foreign key|reference/i);
  });
  
  // Test 25: Unicode support
  test('E2E-ETL-025: Unicode and special character support', async () => {
    const projectName = 'TEST_PROJECT_025_UnicodeSupport';
    const result = await etlExecutor.executeFullETL(projectName);
    testWorkspaces.set(projectName, result.workspaceId);
    
    // Verify unicode preserved
    const tasksSheet = await verifier.getTasksSheet(result.workspaceId);
    const taskWithUnicode = tasksSheet.rows.find(r => 
      r.cells.some(c => /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(String(c.value || '')))
    );
    
    expect(taskWithUnicode).toBeDefined();
  });
});
```

#### Category 3: Performance Tests (3 tests)

**File**: `test/e2e/e2e-performance.test.ts`

```typescript
describe('E2E: Performance and Scale', () => {
  test('E2E-PERF-001: Extract 1000+ tasks within time limit', async () => {
    const project = await testDataManager.findTestProject('TEST_PROJECT_022_Performance');
    
    const startTime = Date.now();
    const extracted = await client.extractProjectData(project.Id);
    const duration = Date.now() - startTime;
    
    expect(extracted.tasks.length).toBeGreaterThanOrEqual(1000);
    expect(duration).toBeLessThan(60 * 1000); // < 1 minute
  });
  
  test('E2E-PERF-002: Transform 1000+ tasks efficiently', async () => {
    const project = await testDataManager.findTestProject('TEST_PROJECT_022_Performance');
    const extracted = await client.extractProjectData(project.Id);
    
    const startTime = Date.now();
    const transformer = new TaskTransformer();
    const transformed = await transformer.transform(extracted.tasks);
    const duration = Date.now() - startTime;
    
    expect(transformed.length).toBe(extracted.tasks.length);
    expect(duration).toBeLessThan(30 * 1000); // < 30 seconds
  });
  
  test('E2E-PERF-003: Load 1000+ tasks to Smartsheet efficiently', async () => {
    const projectName = 'TEST_PROJECT_022_Performance';
    
    const startTime = Date.now();
    const result = await etlExecutor.executeFullETL(projectName);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5 * 60 * 1000); // < 5 minutes
  });
});
```

#### Category 4: Error Handling Tests (5 tests)

**File**: `test/e2e/e2e-error-handling.test.ts`

```typescript
describe('E2E: Error Handling with Real APIs', () => {
  test('E2E-ERROR-001: Handle Project Online authentication failure', async () => {
    const badConfig = { ...config, clientSecret: 'invalid' };
    const badClient = new ProjectOnlineClient(badConfig);
    
    await expect(badClient.testConnection()).rejects.toThrow(/auth/i);
  });
  
  test('E2E-ERROR-002: Handle Project Online rate limiting', async () => {
    // Make many rapid requests to trigger rate limit
    const requests = Array(100).fill(null).map(() => 
      client.getProjects({ $top: 1 })
    );
    
    // Should handle rate limit gracefully (retry with backoff)
    await expect(Promise.all(requests)).resolves.toBeDefined();
  });
  
  test('E2E-ERROR-003: Handle Smartsheet workspace creation failure', async () => {
    // Try to create workspace with invalid name
    await expect(
      smartsheetClient.createWorkspace({ name: '' })
    ).rejects.toThrow();
  });
  
  test('E2E-ERROR-004: Handle network interruption gracefully', async () => {
    // Simulate network error by providing bad endpoint
    const badConfig = { ...config, siteUrl: 'https://invalid.example.com' };
    const badClient = new ProjectOnlineClient(badConfig);
    
    await expect(badClient.testConnection()).rejects.toThrow(/network|connection/i);
  });
  
  test('E2E-ERROR-005: Partial failure recovery (some entities fail)', async () => {
    // Test scenario with mix of valid and invalid entities
    const projectName = 'TEST_PROJECT_024_ErrorInvalidFK';
    
    // Should fail gracefully with detailed error message
    try {
      await etlExecutor.executeFullETL(projectName);
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('foreign key');
      // Verify partial data still loaded (if applicable)
    }
  });
});
```

## Test Helpers and Utilities

### ProjectOnlineTestDataManager

**Purpose**: Manages access to pre-populated Project Online test data.

```typescript
// test/e2e/helpers/ProjectOnlineTestDataManager.ts

export class ProjectOnlineTestDataManager {
  constructor(private client: ProjectOnlineClient) {}
  
  /**
   * Find test project by name
   */
  async findTestProject(projectName: string): Promise<ProjectOnlineProject> {
    const projects = await this.client.getProjects({
      $filter: `Name eq '${projectName}' and ProjectText30 eq 'TEST_DATA_v1'`
    });
    
    if (projects.value.length === 0) {
      throw new Error(`Test project not found: ${projectName}. Did you run populate-project-online-test-data.ts?`);
    }
    
    return projects.value[0];
  }
  
  /**
   * Verify test data exists
   */
  async verifyTestDataExists(): Promise<boolean> {
    const projects = await this.client.getProjects({
      $filter: "ProjectText30 eq 'TEST_DATA_v1'"
    });
    
    return projects.value.length > 0;
  }
  
  /**
   * Get test project by scenario ID
   */
  async getProjectByScenario(scenarioId: string): Promise<ProjectOnlineProject> {
    // Map scenario IDs to project names
    const scenarioMap: Record<string, string> = {
      'project-001-basic-creation': 'TEST_PROJECT_001_BasicProject',
      'task-002-simple-hierarchy': 'TEST_PROJECT_006_SimpleHierarchy',
      // ... more mappings ...
    };
    
    const projectName = scenarioMap[scenarioId];
    if (!projectName) {
      throw new Error(`Unknown scenario ID: ${scenarioId}`);
    }
    
    return this.findTestProject(projectName);
  }
}
```

### ETLFlowExecutor

**Purpose**: Executes complete ETL pipeline for a test project.

```typescript
// test/e2e/helpers/ETLFlowExecutor.ts

export interface ETLFlowResult {
  projectName: string;
  projectId: string;
  workspaceId: number;
  workspaceName: string;
  extractDuration: number;
  transformDuration: number;
  loadDuration: number;
  totalDuration: number;
  taskCount: number;
  resourceCount: number;
  assignmentCount: number;
}

export class ETLFlowExecutor {
  constructor(
    private projectOnlineClient: ProjectOnlineClient,
    private smartsheetClient: SmartsheetClient
  ) {}
  
  /**
   * Execute full ETL flow for test project
   */
  async executeFullETL(projectName: string): Promise<ETLFlowResult> {
    const startTime = Date.now();
    const result: Partial<ETLFlowResult> = { projectName };
    
    // 1. Extract from Project Online
    const extractStart = Date.now();
    const manager = new ProjectOnlineTestDataManager(this.projectOnlineClient);
    const project = await manager.findTestProject(projectName);
    const extracted = await this.projectOnlineClient.extractProjectData(project.Id);
    result.projectId = project.Id;
    result.extractDuration = Date.now() - extractStart;
    
    // 2. Transform
    const transformStart = Date.now();
    const importer = new Importer({
      projectOnlineClient: this.projectOnlineClient,
      smartsheetClient: this.smartsheetClient,
      config: {}
    });
    
    // Use actual transformer classes
    const transformedData = await importer['transformData'](extracted);
    result.transformDuration = Date.now() - transformStart;
    
    // 3. Load to Smartsheet
    const loadStart = Date.now();
    const workspaceResult = await importer['loadToSmartsheet'](project, transformedData);
    result.workspaceId = workspaceResult.workspaceId;
    result.workspaceName = workspaceResult.workspaceName;
    result.loadDuration = Date.now() - loadStart;
    
    // Summary
    result.totalDuration = Date.now() - startTime;
    result.taskCount = extracted.tasks.length;
    result.resourceCount = extracted.resources.length;
    result.assignmentCount = extracted.assignments.length;
    
    return result as ETLFlowResult;
  }
}
```

### SmartsheetVerifier

**Purpose**: Verifies data loaded into Smartsheet matches expectations.

```typescript
// test/e2e/helpers/SmartsheetVerifier.ts

export class SmartsheetVerifier {
  constructor(private client: SmartsheetClient) {}
  
  async getSummarySheet(workspaceId: number): Promise<SmartsheetSheet> {
    const workspace = await this.client.getWorkspace(workspaceId);
    const summarySheet = workspace.sheets.find(s => s.name.includes('Summary'));
    
    if (!summarySheet) {
      throw new Error('Summary sheet not found');
    }
    
    return this.client.getSheet(summarySheet.id);
  }
  
  async getTasksSheet(workspaceId: number): Promise<SmartsheetSheet> {
    const workspace = await this.client.getWorkspace(workspaceId);
    const tasksSheet = workspace.sheets.find(s => s.name.includes('Tasks'));
    
    if (!tasksSheet) {
      throw new Error('Tasks sheet not found');
    }
    
    return this.client.getSheet(tasksSheet.id);
  }
  
  async getResourcesSheet(workspaceId: number): Promise<SmartsheetSheet> {
    const workspace = await this.client.getWorkspace(workspaceId);
    const resourcesSheet = workspace.sheets.find(s => s.name.includes('Resources'));
    
    if (!resourcesSheet) {
      throw new Error('Resources sheet not found');
    }
    
    return this.client.getSheet(resourcesSheet.id);
  }
  
  calculateMaxHierarchyDepth(rows: SmartsheetRow[]): number {
    let maxDepth = 0;
    
    for (const row of rows) {
      let depth = 0;
      let currentRow = row;
      
      while (currentRow.parentId) {
        depth++;
        currentRow = rows.find(r => r.id === currentRow.parentId)!;
        if (!currentRow) break;
      }
      
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }
  
  async verifyTransformationAccuracy(
    projectOnlineData: ExtractedProjectData,
    workspaceId: number
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Verify task count
    const tasksSheet = await this.getTasksSheet(workspaceId);
    if (tasksSheet.rows.length !== projectOnlineData.tasks.length) {
      errors.push(`Task count mismatch: expected ${projectOnlineData.tasks.length}, got ${tasksSheet.rows.length}`);
    }
    
    // Verify resource count
    const resourcesSheet = await this.getResourcesSheet(workspaceId);
    if (resourcesSheet.rows.length !== projectOnlineData.resources.length) {
      errors.push(`Resource count mismatch: expected ${projectOnlineData.resources.length}, got ${resourcesSheet.rows.length}`);
    }
    
    // Verify hierarchy preserved
    // ... more verification logic ...
    
    return { errors, warnings, success: errors.length === 0 };
  }
}
```

## Test Execution

### Prerequisites

1. **Project Online Test Data**: Run population script before E2E tests
   ```bash
   npm run populate-test-data
   ```

2. **Environment Configuration**: Set up `.env.e2e`
   ```bash
   # Project Online (Device Code Flow - interactive authentication)
   PROJECT_ONLINE_TENANT_ID=your-tenant-id
   PROJECT_ONLINE_CLIENT_ID=your-client-id
   PROJECT_ONLINE_SITE_URL=https://your-tenant.sharepoint.com/sites/pwa
   
   # Note: No CLIENT_SECRET required for Device Code Flow
   # You'll authenticate interactively via browser when tests run
   
   # Smartsheet
   SMARTSHEET_ACCESS_TOKEN=your-smartsheet-token
   
   # E2E Test Configuration
   E2E_CLEANUP_ON_SUCCESS=true
   E2E_CLEANUP_ON_FAILURE=false
   E2E_TIMEOUT_PER_TEST=120000  # 2 minutes per test
   ```

3. **API Access**: Verify connectivity to both APIs
   ```bash
   npm run verify-api-access
   ```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test category
npm run test:e2e -- test/e2e/e2e-full-etl-flow.test.ts

# Run with coverage
npm run test:e2e -- --coverage

# Run in watch mode (for development)
npm run test:e2e -- --watch

# Run with verbose output
npm run test:e2e -- --verbose

# Run specific test by name
npm run test:e2e -- -t "E2E-ETL-019"
```

### Jest Configuration for E2E Tests

```javascript
// jest.config.e2e.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 120000, // 2 minutes per test (real API calls are slow)
  setupFilesAfterEnv: ['<rootDir>/test/e2e/e2e-setup.ts'],
  globalSetup: '<rootDir>/test/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/test/e2e/global-teardown.ts',
  maxWorkers: 1, // Run tests sequentially (avoid rate limits)
  bail: false, // Continue even if some tests fail
  verbose: true,
};
```

### Global Setup and Teardown

```typescript
// test/e2e/global-setup.ts

export default async function globalSetup() {
  console.log('E2E Test Suite: Global Setup');
  
  // 1. Verify Project Online test data exists
  const client = new ProjectOnlineClient(config);
  const manager = new ProjectOnlineTestDataManager(client);
  const testDataExists = await manager.verifyTestDataExists();
  
  if (!testDataExists) {
    console.error('❌ Project Online test data not found!');
    console.error('Please run: npm run populate-test-data');
    process.exit(1);
  }
  
  console.log('✓ Project Online test data verified');
  
  // 2. Verify Smartsheet API access
  const smartsheetClient = new SmartsheetClient(config);
  await smartsheetClient.testConnection();
  console.log('✓ Smartsheet API access verified');
  
  console.log('E2E Test Suite: Ready to run');
}
```

```typescript
// test/e2e/global-teardown.ts

export default async function globalTeardown() {
  console.log('E2E Test Suite: Global Teardown');
  
  // Optional: Clean up any orphaned Smartsheet workspaces
  if (config.cleanupOrphanedWorkspaces) {
    // ... cleanup logic ...
  }
  
  console.log('E2E Test Suite: Teardown complete');
}
```

## Success Criteria

The E2E test suite is successful when:

1. ✅ **All 40 tests pass**: Extraction (7) + Full ETL (25) + Performance (3) + Errors (5)
2. ✅ **Complete ETL coverage**: All 31 integration test scenarios validated end-to-end
3. ✅ **Real API validation**: Tests use actual Project Online and Smartsheet APIs (not mocks)
4. ✅ **Performance targets met**: Large projects (1000+ tasks) complete within time limits
5. ✅ **Error handling verified**: Graceful failure and recovery from real API errors
6. ✅ **Data fidelity confirmed**: Transformation accuracy verified across all entity types
7. ✅ **Relationship integrity**: Hierarchy, assignments, predecessors preserved correctly

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml

name: E2E Integration Tests

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:  # Manual trigger

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Populate Project Online test data
        env:
          PROJECT_ONLINE_TENANT_ID: ${{ secrets.PROJECT_ONLINE_TENANT_ID }}
          PROJECT_ONLINE_CLIENT_ID: ${{ secrets.PROJECT_ONLINE_CLIENT_ID }}
          PROJECT_ONLINE_SITE_URL: ${{ secrets.PROJECT_ONLINE_SITE_URL }}
          # Note: Device Code Flow requires pre-authenticated token cache in CI/CD
          # Recommendation: Use cached authentication token from secure storage
        run: npm run populate-test-data
      
      - name: Run E2E tests
        env:
          PROJECT_ONLINE_TENANT_ID: ${{ secrets.PROJECT_ONLINE_TENANT_ID }}
          PROJECT_ONLINE_CLIENT_ID: ${{ secrets.PROJECT_ONLINE_CLIENT_ID }}
          PROJECT_ONLINE_SITE_URL: ${{ secrets.PROJECT_ONLINE_SITE_URL }}
          SMARTSHEET_ACCESS_TOKEN: ${{ secrets.SMARTSHEET_ACCESS_TOKEN }}
          # Note: Device Code Flow uses cached authentication token
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: test-results/
```

## Related Documentation

- **Test Data Population**: [`sdlc/docs/project/Test-Data-Population-Script.md`](./Test-Data-Population-Script.md)
- **Integration Test Spec**: [`test/integration/INTEGRATION_TEST_SPEC.md`](../../../test/integration/INTEGRATION_TEST_SPEC.md)
- **ETL Architecture**: [`sdlc/docs/project/ETL-System-Design.md`](./ETL-System-Design.md)
- **Project Online Client**: [`src/lib/ProjectOnlineClient.ts`](../../../src/lib/ProjectOnlineClient.ts)