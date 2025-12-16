# Project Online Test Data Population Script Specification

## Document Information
- **Created**: 2024-12-08
- **Purpose**: Comprehensive specification for populating Project Online with diverse test data
- **Related Specs**: 
  - [`test/integration/INTEGRATION_TEST_SPEC.md`](../../../test/integration/INTEGRATION_TEST_SPEC.md) - 31 integration test scenarios
  - [`sdlc/docs/architecture/etl-system-design.md`](../architecture/etl-system-design.md) - ETL architecture

## Executive Summary

This specification defines a TypeScript script that populates a Project Online instance with comprehensive, diverse test data covering all 31 integration test scenarios. The script is **idempotent** (safe to re-run) and includes **drift detection and resolution** capabilities to maintain data integrity over time.

## Goals

1. **Comprehensive Coverage**: Generate test data covering all 31 integration test scenarios
2. **Idempotency**: Detect existing data and update vs. create to prevent duplicates
3. **Drift Resolution**: Identify and correct data that has changed from expected state
4. **Safe Execution**: No destructive operations on production data (marker-based isolation)
5. **Reusability**: Leverage existing test scenario builders from [`test/integration/scenarios/`](../../../test/integration/scenarios/)

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Initialize & Authenticate                                │
│     - Load .env configuration                                │
│     - Authenticate to Project Online via MSAL                │
│     - Validate API connection                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Discover Existing Test Data                              │
│     - Query for projects with TEST_DATA marker               │
│     - Build inventory of existing entities                   │
│     - Compare against expected test scenarios                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Plan Operations (Create/Update/Skip)                     │
│     - Determine which entities need creation                 │
│     - Determine which entities need updates (drift)          │
│     - Determine which entities are already correct           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Execute Operations (Idempotent)                          │
│     - Create Projects (if missing)                           │
│     - Create Tasks (if missing, level-by-level hierarchy)    │
│     - Create Resources (if missing)                          │
│     - Create Assignments (if missing)                        │
│     - Update entities (if drift detected)                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Verify & Report                                          │
│     - Validate all entities created/updated successfully     │
│     - Generate summary report (created, updated, skipped)    │
│     - Log any warnings or errors                             │
└─────────────────────────────────────────────────────────────┘
```

### Entity Creation Order (Dependencies)

```
1. Projects (no dependencies)
   ↓
2. Tasks (depends on Projects)
   ↓ (hierarchy requires level-by-level creation)
3. Resources (no dependencies - can be parallel with Tasks)
   ↓
4. Assignments (depends on Tasks AND Resources)
```

## Test Data Structure

### Test Scenario Mapping

The script generates data covering all 31 integration test scenarios organized into test projects:

| Test Project Name | Scenarios Covered | Entity Count |
|-------------------|-------------------|--------------|
| **TEST_PROJECT_001_BasicProject** | project-001-basic-creation | 1 project, 5 tasks, 3 resources, 5 assignments |
| **TEST_PROJECT_002_CompleteFields** | project-002-complete-data, task-010-complete-fields | 1 project, 10 tasks, 5 resources, 15 assignments |
| **TEST_PROJECT_003_SpecialChars** | project-003-special-chars | 1 project, 5 tasks, 3 resources, 5 assignments |
| **TEST_PROJECT_004_AllPriorities** | project-004-all-priorities, task-005-all-priorities | 7 projects (one per priority), 35 tasks total, 10 resources, 50 assignments |
| **TEST_PROJECT_005_FlatTaskList** | task-001-flat-list | 1 project, 20 tasks (flat), 5 resources, 30 assignments |
| **TEST_PROJECT_006_SimpleHierarchy** | task-002-simple-hierarchy | 1 project, 15 tasks (2-level), 5 resources, 20 assignments |
| **TEST_PROJECT_007_DeepHierarchy** | task-003-deep-5-level | 1 project, 20 tasks (5-level), 5 resources, 30 assignments |
| **TEST_PROJECT_008_ComplexHierarchy** | task-004-complex-multi-branch | 1 project, 30 tasks (multi-branch), 8 resources, 45 assignments |
| **TEST_PROJECT_009_DurationVariations** | task-006-duration-variations | 1 project, 10 tasks, 3 resources, 10 assignments |
| **TEST_PROJECT_010_Milestones** | task-007-milestones | 1 project, 8 tasks (3 milestones), 3 resources, 8 assignments |
| **TEST_PROJECT_011_Constraints** | task-008-constraint-types | 1 project, 8 tasks (all constraint types), 3 resources, 8 assignments |
| **TEST_PROJECT_012_Predecessors** | task-009-predecessor-relationships | 1 project, 10 tasks (with predecessors), 3 resources, 10 assignments |
| **TEST_PROJECT_013_WorkResources** | resource-001-work-with-email, resource-002-work-without-email | 1 project, 10 tasks, 10 resources (Work), 15 assignments |
| **TEST_PROJECT_014_MaterialResources** | resource-003-material-type | 1 project, 10 tasks, 5 resources (Material), 10 assignments |
| **TEST_PROJECT_015_CostResources** | resource-004-cost-type | 1 project, 10 tasks, 5 resources (Cost), 10 assignments |
| **TEST_PROJECT_016_ResourceRates** | resource-005-rate-variations | 1 project, 10 tasks, 8 resources (various rates), 15 assignments |
| **TEST_PROJECT_017_MaxUnits** | resource-006-maxunits-variations | 1 project, 10 tasks, 6 resources (MaxUnits 0%, 50%, 100%, 150%), 12 assignments |
| **TEST_PROJECT_018_Departments** | resource-007-department-discovery | 1 project, 10 tasks, 10 resources (5 departments), 15 assignments |
| **TEST_PROJECT_019_WorkContactList** | assignment-001-work-contact-list (CRITICAL) | 1 project, 10 tasks, 10 resources (Work with emails), 20 assignments |
| **TEST_PROJECT_020_MaterialPicklist** | assignment-002-material-cost-picklist (CRITICAL) | 1 project, 10 tasks, 8 resources (Material/Cost), 15 assignments |
| **TEST_PROJECT_021_MixedAssignments** | assignment-003-mixed-resource-types (CRITICAL) | 1 project, 10 tasks, 12 resources (Work + Material + Cost), 30 assignments |
| **TEST_PROJECT_022_Performance** | perf-001-large-project | 1 project, 1000+ tasks (hierarchy), 20 resources, 200 assignments |
| **TEST_PROJECT_023_ErrorMissingFields** | error-001-missing-required-fields | 1 project, 5 tasks (intentionally incomplete), 3 resources, 0 assignments |
| **TEST_PROJECT_024_ErrorInvalidFK** | error-002-invalid-foreign-keys | 1 project, 5 tasks, 3 resources, 5 assignments (intentionally broken FKs) |
| **TEST_PROJECT_025_UnicodeSupport** | error-003-unicode-special-chars | 1 project, 5 tasks (unicode names), 3 resources (unicode), 5 assignments |

**Total Test Data Volume:**
- **Projects**: ~25 projects
- **Tasks**: ~1,300 tasks (including 1000+ in performance project)
- **Resources**: ~120 resources (Work, Material, Cost types)
- **Assignments**: ~500 assignments

### Test Data Marker Strategy

**Custom Field Marker**: Use Project Online custom field to mark test data:

```typescript
// Project marker (stored in ProjectText30)
ProjectText30 = "TEST_DATA_v1"

// Task marker (stored in TaskText30)
TaskText30 = "TEST_DATA_v1"

// Resource marker (stored in ResourceText30)
ResourceText30 = "TEST_DATA_v1"

// Assignment marker (stored in AssignmentText30)
AssignmentText30 = "TEST_DATA_v1"
```

**Benefits:**
1. Clear identification of test data vs. production data
2. Query optimization (filter by marker field in OData queries)
3. Versioning support (v1, v2, etc. for schema changes)
4. Cleanup support (delete all entities with marker)

## Script Implementation Details

### File Structure

```
scripts/
├── populate-project-online-test-data.ts  # Main script
├── lib/
│   ├── ProjectOnlineWriter.ts             # CREATE/UPDATE/DELETE operations
│   ├── TestDataInventory.ts               # Inventory management
│   ├── DriftDetector.ts                   # Drift detection logic
│   └── OperationPlanner.ts                # Create/Update/Skip decisions
└── types/
    └── TestDataTypes.ts                   # Type definitions for script
```

### Core Classes

#### 1. ProjectOnlineWriter

**Purpose**: Extends [`ProjectOnlineClient`](../../../src/lib/ProjectOnlineClient.ts) with CREATE, UPDATE, DELETE operations.

**Key Methods:**

```typescript
class ProjectOnlineWriter extends ProjectOnlineClient {
  // CREATE operations
  async createProject(project: ProjectOnlineProject): Promise<string>;
  async createTask(task: ProjectOnlineTask): Promise<string>;
  async createResource(resource: ProjectOnlineResource): Promise<string>;
  async createAssignment(assignment: ProjectOnlineAssignment): Promise<string>;
  
  // UPDATE operations (PATCH)
  async updateProject(projectId: string, updates: Partial<ProjectOnlineProject>): Promise<void>;
  async updateTask(taskId: string, updates: Partial<ProjectOnlineTask>): Promise<void>;
  async updateResource(resourceId: string, updates: Partial<ProjectOnlineResource>): Promise<void>;
  async updateAssignment(assignmentId: string, updates: Partial<ProjectOnlineAssignment>): Promise<void>;
  
  // DELETE operations (for cleanup only)
  async deleteProject(projectId: string): Promise<void>;
  async deleteTask(taskId: string): Promise<void>;
  async deleteResource(resourceId: string): Promise<void>;
  async deleteAssignment(assignmentId: string): Promise<void>;
  
  // Batch operations (for efficiency)
  async createTasksBatch(tasks: ProjectOnlineTask[]): Promise<string[]>;
  async createAssignmentsBatch(assignments: ProjectOnlineAssignment[]): Promise<string[]>;
}
```

**OData API Details:**

```typescript
// CREATE (POST)
POST /_api/ProjectData/Projects
Content-Type: application/json

{
  "Name": "TEST_PROJECT_001_BasicProject",
  "Description": "Test project for basic creation scenario",
  "StartDate": "2024-01-01T00:00:00Z",
  "FinishDate": "2024-12-31T00:00:00Z",
  "Priority": 500,
  "ProjectText30": "TEST_DATA_v1"
}

// UPDATE (PATCH)
PATCH /_api/ProjectData/Projects('project-guid-here')
Content-Type: application/json

{
  "Priority": 600,
  "Description": "Updated description"
}

// DELETE
DELETE /_api/ProjectData/Projects('project-guid-here')
```

#### 2. TestDataInventory

**Purpose**: Discover and track existing test data entities.

**Key Methods:**

```typescript
class TestDataInventory {
  // Discovery
  async discoverExistingTestData(): Promise<TestDataInventoryReport>;
  
  // Query helpers
  async findProjectByName(name: string): Promise<ProjectOnlineProject | null>;
  async findProjectByMarker(marker: string): Promise<ProjectOnlineProject[]>;
  async findTasksByProject(projectId: string, marker?: string): Promise<ProjectOnlineTask[]>;
  async findResourcesByMarker(marker: string): Promise<ProjectOnlineResource[]>;
  async findAssignmentsByProject(projectId: string): Promise<ProjectOnlineAssignment[]>;
  
  // Inventory building
  buildProjectInventory(projects: ProjectOnlineProject[]): Map<string, ProjectOnlineProject>;
  buildTaskInventory(tasks: ProjectOnlineTask[]): Map<string, ProjectOnlineTask>;
  buildResourceInventory(resources: ProjectOnlineResource[]): Map<string, ProjectOnlineResource>;
  buildAssignmentInventory(assignments: ProjectOnlineAssignment[]): Map<string, ProjectOnlineAssignment>;
}

interface TestDataInventoryReport {
  projects: Map<string, ProjectOnlineProject>;  // Key: project name
  tasks: Map<string, ProjectOnlineTask>;        // Key: project name + task name
  resources: Map<string, ProjectOnlineResource>; // Key: resource name
  assignments: Map<string, ProjectOnlineAssignment>; // Key: taskId + resourceId
  timestamp: string;
  totalProjects: number;
  totalTasks: number;
  totalResources: number;
  totalAssignments: number;
}
```

#### 3. DriftDetector

**Purpose**: Compare existing entities against expected state and detect drift.

**Key Methods:**

```typescript
class DriftDetector {
  // Drift detection
  detectProjectDrift(existing: ProjectOnlineProject, expected: ProjectOnlineProject): ProjectDrift | null;
  detectTaskDrift(existing: ProjectOnlineTask, expected: ProjectOnlineTask): TaskDrift | null;
  detectResourceDrift(existing: ProjectOnlineResource, expected: ProjectOnlineResource): ResourceDrift | null;
  detectAssignmentDrift(existing: ProjectOnlineAssignment, expected: ProjectOnlineAssignment): AssignmentDrift | null;
  
  // Batch drift detection
  detectAllDrift(inventory: TestDataInventoryReport, expectedData: TestDataDefinition): DriftReport;
}

interface ProjectDrift {
  projectId: string;
  projectName: string;
  driftedFields: Array<{
    field: keyof ProjectOnlineProject;
    existing: any;
    expected: any;
  }>;
}

interface DriftReport {
  projectDrifts: ProjectDrift[];
  taskDrifts: TaskDrift[];
  resourceDrifts: ResourceDrift[];
  assignmentDrifts: AssignmentDrift[];
  totalDriftCount: number;
  summary: string;
}
```

**Drift Detection Logic:**

```typescript
// Compare fields (ignore system-managed fields)
const IGNORED_PROJECT_FIELDS = ['Id', 'CreatedDate', 'ModifiedDate'];
const IGNORED_TASK_FIELDS = ['Id', 'ProjectId', 'TaskIndex', 'CreatedDate', 'ModifiedDate'];
const IGNORED_RESOURCE_FIELDS = ['Id', 'CreatedDate', 'ModifiedDate'];
const IGNORED_ASSIGNMENT_FIELDS = ['Id', 'ProjectId'];

// Drift detection example
function detectFieldDrift(existing: any, expected: any, ignoredFields: string[]): FieldDrift[] {
  const drifts: FieldDrift[] = [];
  
  for (const field of Object.keys(expected)) {
    if (ignoredFields.includes(field)) continue;
    
    const existingValue = existing[field];
    const expectedValue = expected[field];
    
    if (!deepEqual(existingValue, expectedValue)) {
      drifts.push({ field, existing: existingValue, expected: expectedValue });
    }
  }
  
  return drifts;
}
```

#### 4. OperationPlanner

**Purpose**: Decide which operations (CREATE/UPDATE/SKIP) to perform based on inventory and drift.

**Key Methods:**

```typescript
class OperationPlanner {
  // Planning
  planOperations(inventory: TestDataInventoryReport, expectedData: TestDataDefinition, driftReport: DriftReport): OperationPlan;
  
  // Execution order
  getExecutionOrder(plan: OperationPlan): ExecutionStep[];
}

interface OperationPlan {
  projectOperations: EntityOperation[];
  taskOperations: EntityOperation[];
  resourceOperations: EntityOperation[];
  assignmentOperations: EntityOperation[];
  summary: {
    totalCreate: number;
    totalUpdate: number;
    totalSkip: number;
  };
}

interface EntityOperation {
  type: 'CREATE' | 'UPDATE' | 'SKIP';
  entity: 'PROJECT' | 'TASK' | 'RESOURCE' | 'ASSIGNMENT';
  entityName: string;
  entityData: any;
  reason: string; // e.g., "Not found in inventory", "Drift detected in Priority field", "Already correct"
}

interface ExecutionStep {
  stepNumber: number;
  stepName: string;
  operations: EntityOperation[];
  dependencies: string[]; // IDs of entities that must be created first
}
```

**Operation Decision Logic:**

```typescript
function planEntityOperation(
  entityName: string,
  expected: any,
  existing: any | null,
  drift: any | null
): EntityOperation {
  // Not found → CREATE
  if (!existing) {
    return { type: 'CREATE', entityName, entityData: expected, reason: 'Not found in inventory' };
  }
  
  // Found with drift → UPDATE
  if (drift && drift.driftedFields.length > 0) {
    return {
      type: 'UPDATE',
      entityName,
      entityData: expected,
      reason: `Drift detected in fields: ${drift.driftedFields.map(d => d.field).join(', ')}`
    };
  }
  
  // Found without drift → SKIP
  return { type: 'SKIP', entityName, entityData: existing, reason: 'Already correct' };
}
```

### Main Script Flow

```typescript
// scripts/populate-project-online-test-data.ts

async function main() {
  const logger = new Logger('PopulateTestData');
  
  try {
    // Step 1: Initialize
    logger.info('Step 1: Initializing Project Online connection...');
    const writer = new ProjectOnlineWriter(config);
    await writer.testConnection();
    logger.success('✓ Connected to Project Online');
    
    // Step 2: Discover existing test data
    logger.info('Step 2: Discovering existing test data...');
    const inventory = new TestDataInventory(writer);
    const inventoryReport = await inventory.discoverExistingTestData();
    logger.info(`Found: ${inventoryReport.totalProjects} projects, ${inventoryReport.totalTasks} tasks, ${inventoryReport.totalResources} resources, ${inventoryReport.totalAssignments} assignments`);
    
    // Step 3: Load expected test data definitions
    logger.info('Step 3: Loading expected test data definitions...');
    const expectedData = await loadExpectedTestData();
    logger.info(`Expected: ${expectedData.projects.length} projects, ${expectedData.tasks.length} tasks, ${expectedData.resources.length} resources, ${expectedData.assignments.length} assignments`);
    
    // Step 4: Detect drift
    logger.info('Step 4: Detecting drift...');
    const driftDetector = new DriftDetector();
    const driftReport = driftDetector.detectAllDrift(inventoryReport, expectedData);
    logger.info(`Drift detected: ${driftReport.totalDriftCount} entities have drifted from expected state`);
    
    // Step 5: Plan operations
    logger.info('Step 5: Planning operations...');
    const planner = new OperationPlanner();
    const plan = planner.planOperations(inventoryReport, expectedData, driftReport);
    logger.info(`Planned: ${plan.summary.totalCreate} creates, ${plan.summary.totalUpdate} updates, ${plan.summary.totalSkip} skips`);
    
    // Step 6: Confirm execution (optional)
    if (config.confirmBeforeExecution) {
      const confirmed = await confirmExecution(plan);
      if (!confirmed) {
        logger.warn('Execution cancelled by user');
        return;
      }
    }
    
    // Step 7: Execute operations
    logger.info('Step 7: Executing operations...');
    const executor = new OperationExecutor(writer);
    const executionResult = await executor.execute(plan);
    
    // Step 8: Verify and report
    logger.info('Step 8: Verifying results...');
    const verifier = new TestDataVerifier(writer);
    const verificationReport = await verifier.verify(expectedData);
    
    // Step 9: Generate summary report
    logger.success('✓ Test data population complete!');
    generateSummaryReport(executionResult, verificationReport);
    
  } catch (error) {
    logger.error('Test data population failed:', error);
    throw error;
  }
}

// Execute
main().catch(console.error);
```

### Expected Test Data Definitions

**File**: `scripts/lib/test-data-definitions.ts`

```typescript
// Leverage existing test scenario builders
import { allProjectScenarios } from '../../test/integration/scenarios/project-scenarios';
import { allTaskScenarios } from '../../test/integration/scenarios/task-scenarios';
import { allResourceScenarios } from '../../test/integration/scenarios/resource-scenarios';
import { allAssignmentScenarios } from '../../test/integration/scenarios/assignment-scenarios';

export interface TestDataDefinition {
  projects: ProjectDefinition[];
  tasks: TaskDefinition[];
  resources: ResourceDefinition[];
  assignments: AssignmentDefinition[];
}

export interface ProjectDefinition {
  name: string; // e.g., "TEST_PROJECT_001_BasicProject"
  scenarioId: string; // e.g., "project-001-basic-creation"
  data: ProjectOnlineProject;
  marker: string; // "TEST_DATA_v1"
}

export async function loadExpectedTestData(): Promise<TestDataDefinition> {
  const projects: ProjectDefinition[] = [];
  const tasks: TaskDefinition[] = [];
  const resources: ResourceDefinition[] = [];
  const assignments: AssignmentDefinition[] = [];
  
  // Project 1: Basic Project
  const basicProject = allProjectScenarios().basic;
  basicProject.Name = 'TEST_PROJECT_001_BasicProject';
  basicProject.ProjectText30 = 'TEST_DATA_v1';
  projects.push({ name: basicProject.Name, scenarioId: 'project-001-basic-creation', data: basicProject, marker: 'TEST_DATA_v1' });
  
  // ... add all other test projects ...
  
  return { projects, tasks, resources, assignments };
}
```

## Idempotency Strategy

### Key Principles

1. **Query First, Then Decide**: Always query for existing entities before attempting CREATE
2. **Marker-Based Filtering**: Use custom field marker to filter queries (performance + safety)
3. **Name-Based Matching**: Primary key is entity name (e.g., project name, resource name)
4. **Drift Detection**: Compare existing vs. expected state to determine UPDATE needs
5. **Transaction Safety**: Wrap related operations in logical transactions where possible

### Implementation Patterns

#### Pattern 1: Create If Not Exists

```typescript
async function ensureProjectExists(projectDef: ProjectDefinition): Promise<string> {
  // Query for existing project by name and marker
  const existing = await inventory.findProjectByName(projectDef.name);
  
  if (existing && existing.ProjectText30 === projectDef.marker) {
    logger.info(`Project ${projectDef.name} already exists (ID: ${existing.Id})`);
    return existing.Id;
  }
  
  // Create new project
  logger.info(`Creating project ${projectDef.name}...`);
  const projectId = await writer.createProject(projectDef.data);
  logger.success(`✓ Created project ${projectDef.name} (ID: ${projectId})`);
  return projectId;
}
```

#### Pattern 2: Update If Drifted

```typescript
async function ensureProjectCorrect(projectDef: ProjectDefinition): Promise<void> {
  const existing = await inventory.findProjectByName(projectDef.name);
  
  if (!existing) {
    throw new Error(`Project ${projectDef.name} not found for drift check`);
  }
  
  // Detect drift
  const drift = driftDetector.detectProjectDrift(existing, projectDef.data);
  
  if (!drift || drift.driftedFields.length === 0) {
    logger.info(`Project ${projectDef.name} is correct (no drift)`);
    return;
  }
  
  // Update to resolve drift
  logger.warn(`Project ${projectDef.name} has drifted: ${drift.driftedFields.map(d => d.field).join(', ')}`);
  const updates = drift.driftedFields.reduce((acc, d) => ({ ...acc, [d.field]: d.expected }), {});
  await writer.updateProject(existing.Id, updates);
  logger.success(`✓ Updated project ${projectDef.name} to resolve drift`);
}
```

#### Pattern 3: Level-by-Level Task Hierarchy

```typescript
async function ensureTaskHierarchyExists(projectId: string, tasks: TaskDefinition[]): Promise<void> {
  // Group tasks by OutlineLevel
  const tasksByLevel = tasks.reduce((acc, task) => {
    const level = task.data.OutlineLevel;
    if (!acc[level]) acc[level] = [];
    acc[level].push(task);
    return acc;
  }, {} as Record<number, TaskDefinition[]>);
  
  // Create tasks level by level
  const maxLevel = Math.max(...Object.keys(tasksByLevel).map(Number));
  const createdTaskIds = new Map<string, string>(); // name → ID
  
  for (let level = 1; level <= maxLevel; level++) {
    const tasksAtLevel = tasksByLevel[level] || [];
    
    for (const taskDef of tasksAtLevel) {
      const existing = await inventory.findTaskByName(projectId, taskDef.name);
      
      if (existing) {
        createdTaskIds.set(taskDef.name, existing.Id);
        continue;
      }
      
      // Resolve parent task ID
      if (taskDef.data.ParentTaskId) {
        const parentName = findParentTaskName(taskDef, tasks);
        const parentId = createdTaskIds.get(parentName);
        
        if (!parentId) {
          throw new Error(`Parent task not found for ${taskDef.name}`);
        }
        
        taskDef.data.ParentTaskId = parentId;
      }
      
      // Create task
      const taskId = await writer.createTask(taskDef.data);
      createdTaskIds.set(taskDef.name, taskId);
      logger.success(`✓ Created task ${taskDef.name} at level ${level}`);
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# .env.test-data
PROJECT_ONLINE_TENANT_ID=your-tenant-id
PROJECT_ONLINE_CLIENT_ID=your-client-id
PROJECT_ONLINE_CLIENT_SECRET=your-client-secret
PROJECT_ONLINE_SITE_URL=https://your-tenant.sharepoint.com/sites/pwa

# Script configuration
TEST_DATA_MARKER=TEST_DATA_v1
CONFIRM_BEFORE_EXECUTION=true
DRY_RUN_MODE=false
BATCH_SIZE=50
RETRY_ON_FAILURE=true
MAX_RETRIES=3
```

### Script Arguments

```bash
# Full execution (default)
npm run populate-test-data

# Dry run (plan only, no execution)
npm run populate-test-data -- --dry-run

# Skip confirmation prompt
npm run populate-test-data -- --yes

# Specific scenarios only
npm run populate-test-data -- --scenarios project-001,task-002,resource-003

# Force recreate (delete and recreate all)
npm run populate-test-data -- --force-recreate

# Verify only (no create/update, only verification)
npm run populate-test-data -- --verify-only
```

## Error Handling

### Failure Modes

1. **Authentication Failure**: MSAL token acquisition fails
   - **Recovery**: Log error, provide troubleshooting steps, exit
   
2. **Network Failure**: API request times out or connection lost
   - **Recovery**: Retry with exponential backoff (use existing [`ExponentialBackoff`](../../../src/util/ExponentialBackoff.ts) class)
   
3. **Rate Limiting**: Too many API requests
   - **Recovery**: Respect `Retry-After` header, pause execution, resume automatically
   
4. **Data Validation Failure**: Entity creation fails validation
   - **Recovery**: Log detailed error, skip entity, continue with remaining entities
   
5. **Foreign Key Violation**: Reference to non-existent parent entity
   - **Recovery**: Ensure parent exists first, retry operation
   
6. **Partial Completion**: Script crashes mid-execution
   - **Recovery**: Idempotency ensures safe re-run from beginning

### Error Recovery Pattern

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  const backoff = new ExponentialBackoff({ maxRetries });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(`${operationName} failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      const waitMs = backoff.getNextDelay();
      logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${waitMs}ms...`);
      await backoff.wait();
    }
  }
  
  throw new Error('Unreachable');
}
```

## Verification

### Post-Execution Verification

After population completes, verify:

1. **Entity Counts**: Expected vs. actual for each entity type
2. **Marker Presence**: All entities have correct marker field
3. **Hierarchy Integrity**: Task parent-child relationships are correct
4. **Foreign Key Integrity**: All assignments reference valid tasks and resources
5. **Data Accuracy**: Spot-check critical fields against expected values

```typescript
class TestDataVerifier {
  async verify(expectedData: TestDataDefinition): Promise<VerificationReport> {
    const report: VerificationReport = {
      projects: { expected: expectedData.projects.length, actual: 0, valid: 0 },
      tasks: { expected: expectedData.tasks.length, actual: 0, valid: 0 },
      resources: { expected: expectedData.resources.length, actual: 0, valid: 0 },
      assignments: { expected: expectedData.assignments.length, actual: 0, valid: 0 },
      errors: [],
      warnings: []
    };
    
    // Verify projects
    const projects = await inventory.findProjectByMarker('TEST_DATA_v1');
    report.projects.actual = projects.length;
    
    for (const project of projects) {
      const expectedProject = expectedData.projects.find(p => p.name === project.Name);
      if (!expectedProject) {
        report.errors.push(`Unexpected project found: ${project.Name}`);
        continue;
      }
      
      // Verify critical fields
      if (project.Priority !== expectedProject.data.Priority) {
        report.warnings.push(`Project ${project.Name} priority mismatch: expected ${expectedProject.data.Priority}, got ${project.Priority}`);
      }
      
      report.projects.valid++;
    }
    
    // ... verify tasks, resources, assignments similarly ...
    
    return report;
  }
}
```

## Maintenance and Updates

### Updating Test Data

When test scenarios change (new scenarios added, existing modified):

1. **Update Scenario Files**: Modify [`test/integration/scenarios/`](../../../test/integration/scenarios/) files
2. **Update Test Data Definitions**: Modify [`scripts/lib/test-data-definitions.ts`](scripts/lib/test-data-definitions.ts)
3. **Run Script**: Execute `npm run populate-test-data` (idempotency handles updates)
4. **Verify**: Script detects drift and updates changed entities automatically

### Version Migration

When marker version changes (e.g., v1 → v2):

```bash
# Clean up old version
npm run populate-test-data -- --cleanup --marker TEST_DATA_v1

# Populate new version
npm run populate-test-data -- --marker TEST_DATA_v2
```

### Cleanup Operations

```bash
# Delete all test data (by marker)
npm run populate-test-data -- --cleanup

# Delete specific projects
npm run populate-test-data -- --cleanup --projects TEST_PROJECT_001,TEST_PROJECT_002

# Delete and recreate (full reset)
npm run populate-test-data -- --force-recreate
```

## Success Criteria

The script is successful when:

1. ✅ **All 31 scenarios covered**: Test data exists for all integration test scenarios
2. ✅ **Idempotent execution**: Re-running script produces same result (no duplicates)
3. ✅ **Drift resolution**: Script detects and fixes data that has changed
4. ✅ **Safe isolation**: Test data clearly marked and isolated from production
5. ✅ **Comprehensive verification**: Post-execution verification confirms data integrity
6. ✅ **Error resilience**: Script handles failures gracefully with retry logic
7. ✅ **Performance**: Completes within reasonable time (<5 minutes for full population)

## Related Documentation

- **Integration Test Spec**: [`test/integration/INTEGRATION_TEST_SPEC.md`](../../../test/integration/INTEGRATION_TEST_SPEC.md)
- **ETL Architecture**: [`sdlc/docs/architecture/etl-system-design.md`](../architecture/etl-system-design.md)
- **E2E Test Spec**: [`sdlc/docs/specs/Project-Online-E2E-Integration-Tests.md`](./Project-Online-E2E-Integration-Tests.md) (to be created)
- **Project Online Client**: [`src/lib/ProjectOnlineClient.ts`](../../../src/lib/ProjectOnlineClient.ts)

## Next Steps

1. **Implement ProjectOnlineWriter**: Add CREATE/UPDATE/DELETE methods to client
2. **Implement Core Classes**: TestDataInventory, DriftDetector, OperationPlanner
3. **Create Test Data Definitions**: Map 31 scenarios to concrete test projects
4. **Implement Main Script**: Wire together all components
5. **Add Unit Tests**: Test individual components (drift detection, operation planning)
6. **Add Documentation**: Usage guide, troubleshooting, examples
7. **Integration Testing**: Test against real Project Online instance