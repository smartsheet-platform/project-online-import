# Project Online Test Data Verification and Maintenance Guide

## Document Information
- **Created**: 2024-12-08
- **Purpose**: Comprehensive guide for verifying test data accuracy and maintaining test data lifecycle
- **Related Specs**: 
  - [`sdlc/docs/specs/Project-Online-Test-Data-Population-Script.md`](./Project-Online-Test-Data-Population-Script.md) - Test data population
  - [`sdlc/docs/specs/Project-Online-E2E-Integration-Tests.md`](./Project-Online-E2E-Integration-Tests.md) - E2E integration tests
  - [`test/integration/INTEGRATION_TEST_SPEC.md`](../../../test/integration/INTEGRATION_TEST_SPEC.md) - Integration test scenarios

## Executive Summary

This guide defines **verification patterns** for validating ETL transformation accuracy and **maintenance procedures** for managing the lifecycle of Project Online test data. It ensures test data remains accurate, up-to-date, and properly isolated from production systems.

---

# Part 1: Data Verification Patterns

## Overview

Data verification validates that:
1. **Extraction Accuracy**: Data extracted from Project Online matches source
2. **Transformation Correctness**: Transformations applied per specification
3. **Loading Fidelity**: Data loaded to Smartsheet preserves all information
4. **Relationship Integrity**: Hierarchies, assignments, predecessors preserved
5. **Edge Case Handling**: Special characters, unicode, nulls handled correctly

## Verification Architecture

### Verification Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Entity Count Verification                         │
│  - Verify expected number of entities created                │
│  - Projects, Tasks, Resources, Assignments                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Field Value Verification                           │
│  - Compare field-by-field against expected values            │
│  - Verify data type conversions (ISO8601, priorities, etc.)  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Relationship Verification                          │
│  - Verify task hierarchy (OutlineLevel → parentId)           │
│  - Verify assignments (TaskId/ResourceId → columns)          │
│  - Verify predecessors preserved                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Transformation Rule Verification                   │
│  - Verify specific transformation rules applied              │
│  - Priority mapping (0-1000 → 7 levels)                      │
│  - Duration conversion (ISO8601 → decimal days)              │
│  - Assignment column types (Work→MULTI_CONTACT_LIST, etc.)   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Edge Case Verification                             │
│  - Special characters sanitized correctly                    │
│  - Unicode preserved                                         │
│  - Null/empty fields handled                                 │
│  - Edge dates (min/max) handled                              │
└─────────────────────────────────────────────────────────────┘
```

## Verification Patterns

### Pattern 1: Entity Count Verification

**Purpose**: Verify all entities extracted are loaded to Smartsheet.

```typescript
async function verifyEntityCounts(
  projectOnlineData: ExtractedProjectData,
  smartsheetWorkspace: SmartsheetWorkspace
): Promise<VerificationResult> {
  const errors: string[] = [];
  
  // Get Smartsheet sheets
  const tasksSheet = await getTasksSheet(smartsheetWorkspace);
  const resourcesSheet = await getResourcesSheet(smartsheetWorkspace);
  
  // Verify task count
  if (tasksSheet.rows.length !== projectOnlineData.tasks.length) {
    errors.push(
      `Task count mismatch: expected ${projectOnlineData.tasks.length}, got ${tasksSheet.rows.length}`
    );
  }
  
  // Verify resource count
  if (resourcesSheet.rows.length !== projectOnlineData.resources.length) {
    errors.push(
      `Resource count mismatch: expected ${projectOnlineData.resources.length}, got ${resourcesSheet.rows.length}`
    );
  }
  
  // Assignment verification (assignments → columns, not rows)
  const workAssignments = projectOnlineData.assignments.filter(
    a => projectOnlineData.resources.find(r => r.Id === a.ResourceId)?.ResourceType === 'Work'
  );
  
  const assignmentColumns = tasksSheet.columns.filter(
    c => c.type === 'MULTI_CONTACT_LIST' || c.type === 'MULTI_PICKLIST'
  );
  
  if (workAssignments.length > 0 && assignmentColumns.length === 0) {
    errors.push('Work assignments exist but no assignment columns created');
  }
  
  return {
    passed: errors.length === 0,
    errors,
    summary: `Entity counts: ${errors.length === 0 ? 'PASS' : 'FAIL'}`
  };
}
```

### Pattern 2: Field Value Verification

**Purpose**: Verify individual field values transformed correctly.

```typescript
interface FieldVerification {
  fieldName: string;
  projectOnlineValue: any;
  smartsheetValue: any;
  transformationRule?: string;
  passed: boolean;
  message?: string;
}

async function verifyTaskFieldValues(
  projectOnlineTask: ProjectOnlineTask,
  smartsheetRow: SmartsheetRow,
  smartsheetColumns: SmartsheetColumn[]
): Promise<FieldVerification[]> {
  const verifications: FieldVerification[] = [];
  
  // Verify Task Name
  const nameColumn = smartsheetColumns.find(c => c.title === 'Task Name' || c.primary);
  const nameCell = smartsheetRow.cells.find(c => c.columnId === nameColumn?.id);
  verifications.push({
    fieldName: 'TaskName',
    projectOnlineValue: projectOnlineTask.TaskName,
    smartsheetValue: nameCell?.value,
    passed: projectOnlineTask.TaskName === nameCell?.value,
    message: projectOnlineTask.TaskName === nameCell?.value ? undefined : 'Task name mismatch'
  });
  
  // Verify Priority (with transformation)
  const priorityColumn = smartsheetColumns.find(c => c.title === 'Priority');
  const priorityCell = smartsheetRow.cells.find(c => c.columnId === priorityColumn?.id);
  const expectedPriorityValue = mapPriorityToPicklist(projectOnlineTask.Priority);
  verifications.push({
    fieldName: 'Priority',
    projectOnlineValue: projectOnlineTask.Priority,
    smartsheetValue: priorityCell?.value,
    transformationRule: 'mapPriorityToPicklist(0-1000 → 7 levels)',
    passed: expectedPriorityValue === priorityCell?.value,
    message: expectedPriorityValue === priorityCell?.value ? undefined : `Expected ${expectedPriorityValue}, got ${priorityCell?.value}`
  });
  
  // Verify Start Date
  const startColumn = smartsheetColumns.find(c => c.title === 'Start');
  const startCell = smartsheetRow.cells.find(c => c.columnId === startColumn?.id);
  const expectedStartDate = projectOnlineTask.Start ? formatDateForSmartsheet(projectOnlineTask.Start) : null;
  verifications.push({
    fieldName: 'Start',
    projectOnlineValue: projectOnlineTask.Start,
    smartsheetValue: startCell?.value,
    transformationRule: 'ISO8601 → YYYY-MM-DD',
    passed: expectedStartDate === startCell?.value,
    message: expectedStartDate === startCell?.value ? undefined : `Date conversion mismatch`
  });
  
  // Verify Duration (NOTE: Smartsheet auto-calculates from Start/End)
  const durationColumn = smartsheetColumns.find(c => c.title === 'Duration');
  const durationCell = smartsheetRow.cells.find(c => c.columnId === durationColumn?.id);
  const expectedDuration = projectOnlineTask.Duration ? convertISO8601ToDays(projectOnlineTask.Duration) : null;
  verifications.push({
    fieldName: 'Duration',
    projectOnlineValue: projectOnlineTask.Duration,
    smartsheetValue: durationCell?.value,
    transformationRule: 'ISO8601 duration → decimal days (auto-calculated by Smartsheet)',
    passed: Math.abs((expectedDuration || 0) - (durationCell?.value as number || 0)) < 0.1, // Allow 0.1 day tolerance
    message: 'Duration auto-calculated by Smartsheet from Start/End dates'
  });
  
  // Verify Percent Complete
  const percentColumn = smartsheetColumns.find(c => c.title === '% Complete');
  const percentCell = smartsheetRow.cells.find(c => c.columnId === percentColumn?.id);
  const expectedPercent = projectOnlineTask.PercentComplete ? projectOnlineTask.PercentComplete / 100 : null;
  verifications.push({
    fieldName: 'PercentComplete',
    projectOnlineValue: projectOnlineTask.PercentComplete,
    smartsheetValue: percentCell?.value,
    transformationRule: '0-100 integer → 0-1 decimal',
    passed: expectedPercent === percentCell?.value,
    message: expectedPercent === percentCell?.value ? undefined : `Expected ${expectedPercent}, got ${percentCell?.value}`
  });
  
  // Verify IsMilestone
  const milestoneColumn = smartsheetColumns.find(c => c.title === 'Milestone');
  const milestoneCell = smartsheetRow.cells.find(c => c.columnId === milestoneColumn?.id);
  verifications.push({
    fieldName: 'IsMilestone',
    projectOnlineValue: projectOnlineTask.IsMilestone,
    smartsheetValue: milestoneCell?.value,
    transformationRule: 'boolean → CHECKBOX (true/false)',
    passed: projectOnlineTask.IsMilestone === Boolean(milestoneCell?.value),
    message: projectOnlineTask.IsMilestone === Boolean(milestoneCell?.value) ? undefined : 'Milestone flag mismatch'
  });
  
  return verifications;
}

// Helper: Map Project Online priority (0-1000) to Smartsheet picklist (7 levels)
function mapPriorityToPicklist(priority?: number): string | null {
  if (priority === undefined || priority === null) return null;
  
  if (priority <= 100) return 'Lowest';
  if (priority <= 300) return 'Very Low';
  if (priority <= 450) return 'Lower';
  if (priority <= 550) return 'Medium';
  if (priority <= 700) return 'Higher';
  if (priority <= 900) return 'Very High';
  return 'Highest';
}

// Helper: Convert ISO8601 duration to decimal days
function convertISO8601ToDays(duration: string): number {
  // PT40H → 5 days (assuming 8-hour workday)
  // P5D → 5 days
  const match = duration.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!match) return 0;
  
  const days = parseInt(match[1] || '0');
  const hours = parseInt(match[2] || '0');
  const minutes = parseInt(match[3] || '0');
  
  return days + (hours / 8) + (minutes / 480);
}

// Helper: Format date for Smartsheet (YYYY-MM-DD)
function formatDateForSmartsheet(isoDate: string): string {
  return isoDate.split('T')[0];
}
```

### Pattern 3: Relationship Verification

**Purpose**: Verify relationships (hierarchy, assignments, predecessors) preserved.

```typescript
async function verifyTaskHierarchy(
  projectOnlineTasks: ProjectOnlineTask[],
  smartsheetRows: SmartsheetRow[]
): Promise<VerificationResult> {
  const errors: string[] = [];
  
  // Build Task ID → Row ID mapping
  const taskToRowMap = new Map<string, number>();
  for (const row of smartsheetRows) {
    const taskIdCell = row.cells.find(c => c.columnId === getHiddenTaskIdColumnId());
    if (taskIdCell?.value) {
      taskToRowMap.set(taskIdCell.value as string, row.id);
    }
  }
  
  // Verify each task's hierarchy
  for (const poTask of projectOnlineTasks) {
    const smartsheetRowId = taskToRowMap.get(poTask.Id);
    if (!smartsheetRowId) {
      errors.push(`Task ${poTask.TaskName} not found in Smartsheet`);
      continue;
    }
    
    const smartsheetRow = smartsheetRows.find(r => r.id === smartsheetRowId);
    if (!smartsheetRow) continue;
    
    // Verify parent relationship
    if (poTask.ParentTaskId) {
      const expectedParentRowId = taskToRowMap.get(poTask.ParentTaskId);
      
      if (smartsheetRow.parentId !== expectedParentRowId) {
        errors.push(
          `Task ${poTask.TaskName} parent mismatch: expected row ${expectedParentRowId}, got ${smartsheetRow.parentId}`
        );
      }
      
      // Verify parent OutlineLevel is exactly 1 less than child
      const parentPoTask = projectOnlineTasks.find(t => t.Id === poTask.ParentTaskId);
      if (parentPoTask && parentPoTask.OutlineLevel !== poTask.OutlineLevel - 1) {
        errors.push(
          `Task ${poTask.TaskName} hierarchy level mismatch: parent OutlineLevel ${parentPoTask.OutlineLevel}, child ${poTask.OutlineLevel}`
        );
      }
    } else {
      // Root task (OutlineLevel = 1) should have no parent
      if (smartsheetRow.parentId) {
        errors.push(
          `Task ${poTask.TaskName} should be root (no parent) but has parentId ${smartsheetRow.parentId}`
        );
      }
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    summary: `Hierarchy verification: ${errors.length === 0 ? 'PASS' : 'FAIL'}`
  };
}

async function verifyAssignments(
  projectOnlineData: ExtractedProjectData,
  smartsheetTasksSheet: SmartsheetSheet
): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Build resource type map
  const resourceTypeMap = new Map<string, 'Work' | 'Material' | 'Cost'>();
  for (const resource of projectOnlineData.resources) {
    resourceTypeMap.set(resource.Id, resource.ResourceType || 'Work');
  }
  
  // Verify assignments for each task
  for (const task of projectOnlineData.tasks) {
    const taskAssignments = projectOnlineData.assignments.filter(a => a.TaskId === task.Id);
    
    if (taskAssignments.length === 0) continue;
    
    // Find Smartsheet row for this task
    const taskRow = findTaskRow(smartsheetTasksSheet, task.Id);
    if (!taskRow) {
      errors.push(`Task ${task.TaskName} not found in Smartsheet`);
      continue;
    }
    
    // Group assignments by resource type
    const workAssignments = taskAssignments.filter(a => resourceTypeMap.get(a.ResourceId) === 'Work');
    const materialAssignments = taskAssignments.filter(a => resourceTypeMap.get(a.ResourceId) === 'Material');
    const costAssignments = taskAssignments.filter(a => resourceTypeMap.get(a.ResourceId) === 'Cost');
    
    // Verify Work assignments → MULTI_CONTACT_LIST columns
    if (workAssignments.length > 0) {
      const workResources = workAssignments.map(a => 
        projectOnlineData.resources.find(r => r.Id === a.ResourceId)
      ).filter(Boolean);
      
      for (const resource of workResources) {
        const columnTitle = `Assigned - ${resource!.Name}`;
        const column = smartsheetTasksSheet.columns.find(c => c.title === columnTitle);
        
        if (!column) {
          errors.push(`MULTI_CONTACT_LIST column not found: ${columnTitle}`);
          continue;
        }
        
        // CRITICAL: Verify column type is MULTI_CONTACT_LIST
        if (column.type !== 'MULTI_CONTACT_LIST') {
          errors.push(
            `Column ${columnTitle} has wrong type: expected MULTI_CONTACT_LIST, got ${column.type}`
          );
        }
        
        // Verify cell contains contact with email
        const cell = taskRow.cells.find(c => c.columnId === column.id);
        if (cell?.objectValue) {
          const contacts = (cell.objectValue as any).values || [];
          const hasEmail = contacts.some((c: any) => c.email === resource!.Email);
          
          if (!hasEmail && resource!.Email) {
            warnings.push(
              `Task ${task.TaskName} missing contact for ${resource!.Name} (${resource!.Email})`
            );
          }
        }
      }
    }
    
    // Verify Material/Cost assignments → MULTI_PICKLIST columns
    const nonWorkAssignments = [...materialAssignments, ...costAssignments];
    if (nonWorkAssignments.length > 0) {
      const nonWorkResources = nonWorkAssignments.map(a =>
        projectOnlineData.resources.find(r => r.Id === a.ResourceId)
      ).filter(Boolean);
      
      for (const resource of nonWorkResources) {
        const columnTitle = `${resource!.ResourceType} - ${resource!.Name}`;
        const column = smartsheetTasksSheet.columns.find(c => c.title === columnTitle);
        
        if (!column) {
          errors.push(`MULTI_PICKLIST column not found: ${columnTitle}`);
          continue;
        }
        
        // CRITICAL: Verify column type is MULTI_PICKLIST
        if (column.type !== 'MULTI_PICKLIST') {
          errors.push(
            `Column ${columnTitle} has wrong type: expected MULTI_PICKLIST, got ${column.type}`
          );
        }
        
        // Verify cell contains resource name in picklist
        const cell = taskRow.cells.find(c => c.columnId === column.id);
        if (cell?.objectValue) {
          const values = (cell.objectValue as any).values || [];
          const hasValue = values.includes(resource!.Name);
          
          if (!hasValue) {
            warnings.push(
              `Task ${task.TaskName} missing picklist value for ${resource!.Name}`
            );
          }
        }
      }
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    summary: `Assignment verification: ${errors.length === 0 ? 'PASS' : 'FAIL'} (${warnings.length} warnings)`
  };
}

async function verifyPredecessors(
  projectOnlineTasks: ProjectOnlineTask[],
  smartsheetTasksSheet: SmartsheetSheet
): Promise<VerificationResult> {
  const errors: string[] = [];
  
  // Find predecessor column
  const predecessorColumn = smartsheetTasksSheet.columns.find(c => c.title === 'Predecessors');
  if (!predecessorColumn) {
    return {
      passed: false,
      errors: ['Predecessors column not found'],
      summary: 'Predecessor verification: FAIL'
    };
  }
  
  // Verify column type
  if (predecessorColumn.type !== 'PREDECESSOR') {
    errors.push(`Predecessors column has wrong type: expected PREDECESSOR, got ${predecessorColumn.type}`);
  }
  
  // Verify predecessor relationships
  for (const task of projectOnlineTasks) {
    if (!task.Predecessors) continue;
    
    const taskRow = findTaskRow(smartsheetTasksSheet, task.Id);
    if (!taskRow) continue;
    
    const predecessorCell = taskRow.cells.find(c => c.columnId === predecessorColumn.id);
    
    // Parse Project Online predecessors format: "2FS", "3SS+2d", etc.
    const poePredecessors = parsePredecessors(task.Predecessors);
    
    // Parse Smartsheet predecessors
    const smartsheetPredecessors = (predecessorCell?.value as string || '').split(',').map(p => p.trim()).filter(Boolean);
    
    if (poePredecessors.length !== smartsheetPredecessors.length) {
      errors.push(
        `Task ${task.TaskName} predecessor count mismatch: expected ${poePredecessors.length}, got ${smartsheetPredecessors.length}`
      );
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    summary: `Predecessor verification: ${errors.length === 0 ? 'PASS' : 'FAIL'}`
  };
}
```

### Pattern 4: Transformation Rule Verification

**Purpose**: Verify specific transformation rules applied correctly.

```typescript
interface TransformationRuleVerification {
  ruleName: string;
  description: string;
  passed: boolean;
  details: string;
}

async function verifyAllTransformationRules(
  projectOnlineData: ExtractedProjectData,
  smartsheetWorkspace: SmartsheetWorkspace
): Promise<TransformationRuleVerification[]> {
  const verifications: TransformationRuleVerification[] = [];
  
  // Rule 1: Priority Mapping (0-1000 → 7 levels)
  verifications.push(await verifyPriorityMapping(projectOnlineData, smartsheetWorkspace));
  
  // Rule 2: Duration Conversion (ISO8601 → decimal days)
  verifications.push(await verifyDurationConversion(projectOnlineData, smartsheetWorkspace));
  
  // Rule 3: Date Format Conversion (ISO8601 → YYYY-MM-DD)
  verifications.push(await verifyDateFormatConversion(projectOnlineData, smartsheetWorkspace));
  
  // Rule 4: Assignment Column Type Distinction (Work→MULTI_CONTACT_LIST, Material/Cost→MULTI_PICKLIST)
  verifications.push(await verifyAssignmentColumnTypes(projectOnlineData, smartsheetWorkspace));
  
  // Rule 5: Hierarchy Mapping (OutlineLevel → parentId)
  verifications.push(await verifyHierarchyMapping(projectOnlineData, smartsheetWorkspace));
  
  // Rule 6: Boolean Conversion (true/false → CHECKBOX)
  verifications.push(await verifyBooleanConversion(projectOnlineData, smartsheetWorkspace));
  
  // Rule 7: Special Character Sanitization
  verifications.push(await verifySpecialCharacterHandling(projectOnlineData, smartsheetWorkspace));
  
  // Rule 8: Unicode Preservation
  verifications.push(await verifyUnicodePreservation(projectOnlineData, smartsheetWorkspace));
  
  return verifications;
}
```

### Pattern 5: Edge Case Verification

**Purpose**: Verify edge cases and boundary conditions handled correctly.

```typescript
async function verifyEdgeCases(
  projectOnlineData: ExtractedProjectData,
  smartsheetWorkspace: SmartsheetWorkspace
): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Edge Case 1: Null/Empty Fields
  const tasksWithNulls = projectOnlineData.tasks.filter(t => !t.Description && !t.TaskNotes);
  if (tasksWithNulls.length > 0) {
    // Verify null fields don't cause errors
    for (const task of tasksWithNulls) {
      const taskRow = findTaskRow(await getTasksSheet(smartsheetWorkspace), task.Id);
      if (!taskRow) {
        errors.push(`Task with nulls not found: ${task.TaskName}`);
      }
    }
  }
  
  // Edge Case 2: Special Characters
  const tasksWithSpecialChars = projectOnlineData.tasks.filter(t => 
    /[<>"'&]/.test(t.TaskName)
  );
  if (tasksWithSpecialChars.length > 0) {
    for (const task of tasksWithSpecialChars) {
      const taskRow = findTaskRow(await getTasksSheet(smartsheetWorkspace), task.Id);
      if (!taskRow) {
        errors.push(`Task with special chars not found: ${task.TaskName}`);
      }
      
      // Verify special chars sanitized or escaped
      const nameCell = getPrimaryCell(taskRow);
      if (nameCell?.value && typeof nameCell.value === 'string') {
        // Check if special chars preserved or sanitized appropriately
        // (Exact behavior depends on Smartsheet API handling)
      }
    }
  }
  
  // Edge Case 3: Unicode Characters
  const tasksWithUnicode = projectOnlineData.tasks.filter(t => 
    /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(t.TaskName)
  );
  if (tasksWithUnicode.length > 0) {
    for (const task of tasksWithUnicode) {
      const taskRow = findTaskRow(await getTasksSheet(smartsheetWorkspace), task.Id);
      if (!taskRow) {
        errors.push(`Task with unicode not found: ${task.TaskName}`);
      }
      
      // Verify unicode preserved
      const nameCell = getPrimaryCell(taskRow);
      if (nameCell?.value !== task.TaskName) {
        errors.push(`Unicode not preserved in task: ${task.TaskName}`);
      }
    }
  }
  
  // Edge Case 4: Very Long Names (>255 chars)
  const tasksWithLongNames = projectOnlineData.tasks.filter(t => t.TaskName.length > 255);
  if (tasksWithLongNames.length > 0) {
    for (const task of tasksWithLongNames) {
      const taskRow = findTaskRow(await getTasksSheet(smartsheetWorkspace), task.Id);
      if (!taskRow) {
        errors.push(`Task with long name not found: ${task.TaskName}`);
      }
      
      // Verify truncation if required
      const nameCell = getPrimaryCell(taskRow);
      if (nameCell?.value && (nameCell.value as string).length > 255) {
        warnings.push(`Task name not truncated: ${task.TaskName}`);
      }
    }
  }
  
  // Edge Case 5: Edge Dates (min/max dates)
  const tasksWithEdgeDates = projectOnlineData.tasks.filter(t => 
    t.Start === '1900-01-01T00:00:00Z' || t.Finish === '2099-12-31T23:59:59Z'
  );
  if (tasksWithEdgeDates.length > 0) {
    for (const task of tasksWithEdgeDates) {
      const taskRow = findTaskRow(await getTasksSheet(smartsheetWorkspace), task.Id);
      if (!taskRow) {
        errors.push(`Task with edge dates not found: ${task.TaskName}`);
      }
    }
  }
  
  // Edge Case 6: Zero Duration Tasks (Milestones)
  const milestones = projectOnlineData.tasks.filter(t => t.IsMilestone || t.Duration === 'PT0H');
  if (milestones.length > 0) {
    for (const task of milestones) {
      const taskRow = findTaskRow(await getTasksSheet(smartsheetWorkspace), task.Id);
      if (!taskRow) {
        errors.push(`Milestone not found: ${task.TaskName}`);
      }
      
      // Verify Start === End for milestones
      const startCell = taskRow?.cells.find(c => c.columnId === getColumnId('Start'));
      const endCell = taskRow?.cells.find(c => c.columnId === getColumnId('End'));
      
      if (startCell?.value !== endCell?.value) {
        warnings.push(`Milestone ${task.TaskName} has Start !== End`);
      }
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    summary: `Edge case verification: ${errors.length === 0 ? 'PASS' : 'FAIL'} (${warnings.length} warnings)`
  };
}
```

## Automated Verification Script

**File**: `scripts/verify-test-data.ts`

```typescript
/**
 * Automated verification script
 * Verifies Project Online test data against expected state
 */

async function main() {
  const logger = new Logger('VerifyTestData');
  
  try {
    // Step 1: Initialize
    logger.info('Initializing Project Online client...');
    const client = new ProjectOnlineClient(config);
    await client.testConnection();
    
    // Step 2: Load expected test data definitions
    logger.info('Loading expected test data definitions...');
    const expectedData = await loadExpectedTestData();
    
    // Step 3: Fetch actual test data from Project Online
    logger.info('Fetching actual test data from Project Online...');
    const actualData = await fetchActualTestData(client);
    
    // Step 4: Run all verification layers
    logger.info('Running verification layers...');
    
    const results = {
      entityCounts: await verifyEntityCounts(expectedData, actualData),
      fieldValues: await verifyAllFieldValues(expectedData, actualData),
      relationships: await verifyAllRelationships(expectedData, actualData),
      transformationRules: await verifyAllTransformationRules(expectedData, actualData),
      edgeCases: await verifyEdgeCases(expectedData, actualData)
    };
    
    // Step 5: Generate verification report
    logger.info('Generating verification report...');
    const report = generateVerificationReport(results);
    
    // Step 6: Save report and exit
    await fs.promises.writeFile('test-data-verification-report.json', JSON.stringify(report, null, 2));
    logger.success(`✓ Verification complete! Report saved to test-data-verification-report.json`);
    
    if (report.overallStatus === 'FAIL') {
      logger.error(`❌ Verification FAILED: ${report.totalErrors} errors, ${report.totalWarnings} warnings`);
      process.exit(1);
    } else {
      logger.success(`✓ Verification PASSED: All checks successful`);
    }
    
  } catch (error) {
    logger.error('Verification failed:', error);
    throw error;
  }
}

main().catch(console.error);
```

---

# Part 2: Maintenance Procedures

## Overview

Test data maintenance ensures:
1. **Data Freshness**: Test data stays up-to-date with system changes
2. **Data Cleanliness**: Orphaned or corrupted data removed
3. **Data Accuracy**: Drift detected and resolved
4. **Safe Isolation**: Test data never interferes with production
5. **Version Control**: Test data schema versions managed

## Maintenance Operations

### Operation 1: Cleanup Test Data

**Purpose**: Remove test data from Project Online and Smartsheet.

#### Cleanup Strategies

**Strategy A: Marker-Based Cleanup (Recommended)**

```typescript
// scripts/cleanup-test-data.ts

async function cleanupProjectOnlineTestData(marker: string = 'TEST_DATA_v1'): Promise<CleanupResult> {
  const logger = new Logger('Cleanup');
  const client = new ProjectOnlineClient(config);
  const writer = new ProjectOnlineWriter(config);
  
  logger.info(`Starting cleanup for marker: ${marker}`);
  
  // Step 1: Find all test projects
  const testProjects = await client.getProjects({
    $filter: `ProjectText30 eq '${marker}'`
  });
  
  logger.info(`Found ${testProjects.value.length} test projects`);
  
  // Step 2: Delete projects (cascade deletes tasks, assignments)
  const deletedProjects: string[] = [];
  const errors: string[] = [];
  
  for (const project of testProjects.value) {
    try {
      await writer.deleteProject(project.Id);
      deletedProjects.push(project.Name);
      logger.info(`✓ Deleted project: ${project.Name}`);
    } catch (error) {
      errors.push(`Failed to delete project ${project.Name}: ${error}`);
      logger.error(`❌ Failed to delete project: ${project.Name}`);
    }
  }
  
  // Step 3: Find and delete test resources (not project-specific)
  const testResources = await client.getResources({
    $filter: `ResourceText30 eq '${marker}'`
  });
  
  logger.info(`Found ${testResources.value.length} test resources`);
  
  for (const resource of testResources.value) {
    try {
      await writer.deleteResource(resource.Id);
      logger.info(`✓ Deleted resource: ${resource.Name}`);
    } catch (error) {
      errors.push(`Failed to delete resource ${resource.Name}: ${error}`);
      logger.error(`❌ Failed to delete resource: ${resource.Name}`);
    }
  }
  
  return {
    marker,
    deletedProjectCount: deletedProjects.length,
    deletedResourceCount: testResources.value.length,
    errors,
    summary: `Cleaned up ${deletedProjects.length} projects, ${testResources.value.length} resources (${errors.length} errors)`
  };
}
```

**Strategy B: Selective Cleanup by Project**

```bash
# Cleanup specific test projects
npm run cleanup-test-data -- --projects TEST_PROJECT_001,TEST_PROJECT_002

# Cleanup all projects except specified
npm run cleanup-test-data -- --except TEST_PROJECT_022_Performance

# Cleanup orphaned resources only
npm run cleanup-test-data -- --resources-only

# Dry run (show what would be deleted)
npm run cleanup-test-data -- --dry-run
```

#### Smartsheet Workspace Cleanup

```typescript
async function cleanupSmartsheetTestWorkspaces(): Promise<CleanupResult> {
  const logger = new Logger('CleanupSmartsheet');
  const client = new SmartsheetClient(config);
  
  // Find all workspaces with "TEST_" prefix
  const workspaces = await client.listWorkspaces();
  const testWorkspaces = workspaces.data.filter(w => w.name.startsWith('TEST_'));
  
  logger.info(`Found ${testWorkspaces.length} test workspaces`);
  
  const deleted: string[] = [];
  const errors: string[] = [];
  
  for (const workspace of testWorkspaces) {
    try {
      await client.deleteWorkspace(workspace.id);
      deleted.push(workspace.name);
      logger.info(`✓ Deleted workspace: ${workspace.name}`);
    } catch (error) {
      errors.push(`Failed to delete workspace ${workspace.name}: ${error}`);
      logger.error(`❌ Failed to delete workspace: ${workspace.name}`);
    }
  }
  
  return {
    deletedCount: deleted.length,
    errors,
    summary: `Deleted ${deleted.length} workspaces (${errors.length} errors)`
  };
}
```

### Operation 2: Update Test Data (Handle Drift)

**Purpose**: Update test data when expected values change.

```typescript
// scripts/update-test-data.ts

async function updateTestData(options: UpdateOptions): Promise<UpdateResult> {
  const logger = new Logger('UpdateTestData');
  
  // Step 1: Discover existing test data
  const inventory = new TestDataInventory(client);
  const inventoryReport = await inventory.discoverExistingTestData();
  
  // Step 2: Load new expected test data
  const expectedData = await loadExpectedTestData();
  
  // Step 3: Detect drift
  const driftDetector = new DriftDetector();
  const driftReport = driftDetector.detectAllDrift(inventoryReport, expectedData);
  
  logger.info(`Drift detected: ${driftReport.totalDriftCount} entities`);
  
  // Step 4: Update drifted entities
  const writer = new ProjectOnlineWriter(config);
  const updated: string[] = [];
  const errors: string[] = [];
  
  for (const projectDrift of driftReport.projectDrifts) {
    try {
      const updates = projectDrift.driftedFields.reduce(
        (acc, field) => ({ ...acc, [field.field]: field.expected }),
        {}
      );
      
      await writer.updateProject(projectDrift.projectId, updates);
      updated.push(projectDrift.projectName);
      logger.info(`✓ Updated project: ${projectDrift.projectName}`);
    } catch (error) {
      errors.push(`Failed to update project ${projectDrift.projectName}: ${error}`);
      logger.error(`❌ Failed to update project: ${projectDrift.projectName}`);
    }
  }
  
  // ... update tasks, resources, assignments similarly ...
  
  return {
    updatedCount: updated.length,
    errors,
    summary: `Updated ${updated.length} entities (${errors.length} errors)`
  };
}
```

### Operation 3: Version Migration

**Purpose**: Migrate test data from old schema version to new version.

```typescript
// scripts/migrate-test-data-version.ts

async function migrateTestDataVersion(
  fromVersion: string,
  toVersion: string
): Promise<MigrationResult> {
  const logger = new Logger('MigrateTestData');
  
  logger.info(`Migrating test data from ${fromVersion} to ${toVersion}`);
  
  // Step 1: Find all entities with old version marker
  const client = new ProjectOnlineClient(config);
  const oldProjects = await client.getProjects({
    $filter: `ProjectText30 eq '${fromVersion}'`
  });
  
  // Step 2: Update marker to new version
  const writer = new ProjectOnlineWriter(config);
  const migrated: string[] = [];
  
  for (const project of oldProjects.value) {
    await writer.updateProject(project.Id, {
      ProjectText30: toVersion
    });
    
    migrated.push(project.Name);
    logger.info(`✓ Migrated project: ${project.Name}`);
  }
  
  // Step 3: Apply any schema changes (if needed)
  // ... schema update logic ...
  
  return {
    fromVersion,
    toVersion,
    migratedCount: migrated.length,
    summary: `Migrated ${migrated.length} entities from ${fromVersion} to ${toVersion}`
  };
}
```

### Operation 4: Health Check

**Purpose**: Verify test data health and detect issues.

```typescript
// scripts/health-check-test-data.ts

async function healthCheckTestData(): Promise<HealthCheckResult> {
  const logger = new Logger('HealthCheck');
  
  const issues: HealthIssue[] = [];
  
  // Check 1: Verify all expected test projects exist
  const expectedProjects = await loadExpectedTestData();
  const actualProjects = await fetchActualTestData();
  
  for (const expected of expectedProjects.projects) {
    const actual = actualProjects.projects.find(p => p.name === expected.name);
    if (!actual) {
      issues.push({
        severity: 'ERROR',
        type: 'MISSING_PROJECT',
        message: `Expected project not found: ${expected.name}`
      });
    }
  }
  
  // Check 2: Verify no orphaned tasks (tasks without projects)
  const allTasks = await client.getTasks({ $filter: "TaskText30 eq 'TEST_DATA_v1'" });
  const projectIds = new Set(actualProjects.projects.map(p => p.data.Id));
  
  for (const task of allTasks.value) {
    if (!projectIds.has(task.ProjectId)) {
      issues.push({
        severity: 'WARNING',
        type: 'ORPHANED_TASK',
        message: `Task without project found: ${task.TaskName} (ProjectId: ${task.ProjectId})`
      });
    }
  }
  
  // Check 3: Verify no broken hierarchy (tasks with invalid ParentTaskId)
  const taskIds = new Set(allTasks.value.map(t => t.Id));
  
  for (const task of allTasks.value) {
    if (task.ParentTaskId && !taskIds.has(task.ParentTaskId)) {
      issues.push({
        severity: 'ERROR',
        type: 'BROKEN_HIERARCHY',
        message: `Task has invalid ParentTaskId: ${task.TaskName} → ${task.ParentTaskId}`
      });
    }
  }
  
  // Check 4: Verify no assignments with invalid foreign keys
  const allAssignments = await client.getAssignments({ $filter: "AssignmentText30 eq 'TEST_DATA_v1'" });
  const resourceIds = new Set(actualProjects.resources.map(r => r.data.Id));
  
  for (const assignment of allAssignments.value) {
    if (!taskIds.has(assignment.TaskId)) {
      issues.push({
        severity: 'ERROR',
        type: 'INVALID_FK',
        message: `Assignment has invalid TaskId: ${assignment.TaskId}`
      });
    }
    
    if (!resourceIds.has(assignment.ResourceId)) {
      issues.push({
        severity: 'ERROR',
        type: 'INVALID_FK',
        message: `Assignment has invalid ResourceId: ${assignment.ResourceId}`
      });
    }
  }
  
  // Generate report
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  
  return {
    status: errorCount === 0 ? 'HEALTHY' : 'UNHEALTHY',
    issues,
    summary: `Health check: ${errorCount} errors, ${warningCount} warnings`
  };
}
```

## Maintenance Schedule

### Daily Tasks

- ✅ Run health check: `npm run health-check-test-data`
- ✅ Review health check report for issues

### Weekly Tasks

- ✅ Run verification script: `npm run verify-test-data`
- ✅ Review drift report and update if needed
- ✅ Cleanup orphaned Smartsheet workspaces

### Monthly Tasks

- ✅ Full test data refresh (delete and recreate all)
- ✅ Update test scenarios based on system changes
- ✅ Review and update verification patterns

### On-Demand Tasks

- ✅ **After system changes**: Update test data to reflect new schema
- ✅ **Before major releases**: Full verification and health check
- ✅ **After failed tests**: Investigate and fix data issues

## Maintenance Commands

```bash
# Health check
npm run health-check-test-data

# Verify test data
npm run verify-test-data

# Update test data (resolve drift)
npm run update-test-data

# Cleanup test data
npm run cleanup-test-data

# Full refresh (delete + recreate)
npm run refresh-test-data

# Version migration
npm run migrate-test-data -- --from TEST_DATA_v1 --to TEST_DATA_v2

# Cleanup Smartsheet workspaces
npm run cleanup-smartsheet-test-workspaces
```

## Best Practices

### 1. Always Use Markers

✅ **DO**: Use custom field markers to identify test data
```typescript
ProjectText30 = 'TEST_DATA_v1'
TaskText30 = 'TEST_DATA_v1'
ResourceText30 = 'TEST_DATA_v1'
```

❌ **DON'T**: Rely solely on naming conventions (prone to false positives)

### 2. Version Your Test Data

✅ **DO**: Include version in marker for schema changes
```typescript
// Old schema
ProjectText30 = 'TEST_DATA_v1'

// New schema (after migration)
ProjectText30 = 'TEST_DATA_v2'
```

### 3. Automate Verification

✅ **DO**: Run automated verification regularly
```yaml
# .github/workflows/verify-test-data.yml
schedule:
  - cron: '0 0 * * 0'  # Weekly on Sunday
```

❌ **DON'T**: Rely on manual verification (error-prone)

### 4. Preserve Test Data During Development

✅ **DO**: Use separate .env files for test vs. development
```bash
.env.test-data    # For test data population/maintenance
.env.development  # For development work
.env.production   # Never use for test data!
```

### 5. Document Schema Changes

✅ **DO**: Update test data definitions when schema changes
```markdown
# CHANGELOG.md
## v2.0.0 - 2024-12-15
- Added new custom field: ProjectText29 (Department)
- Test data updated to include Department values
- Marker version bumped to TEST_DATA_v2
```

## Troubleshooting

### Issue 1: Test Data Not Found

**Symptom**: E2E tests fail with "Test project not found"

**Diagnosis**:
```bash
npm run health-check-test-data
```

**Resolution**:
```bash
npm run populate-test-data
```

### Issue 2: Data Drift Detected

**Symptom**: Verification script reports drift

**Diagnosis**:
```bash
npm run verify-test-data
# Review drift report
```

**Resolution**:
```bash
# Auto-fix drift
npm run update-test-data

# Or manual recreation
npm run cleanup-test-data
npm run populate-test-data
```

### Issue 3: Orphaned Data

**Symptom**: Health check reports orphaned tasks/assignments

**Diagnosis**:
```bash
npm run health-check-test-data
# Review orphaned entities
```

**Resolution**:
```bash
# Cleanup orphaned data
npm run cleanup-test-data --orphaned-only

# Or full refresh
npm run refresh-test-data
```

### Issue 4: Version Mismatch

**Symptom**: Tests fail after schema change

**Diagnosis**:
```bash
# Check marker versions
npm run health-check-test-data
```

**Resolution**:
```bash
# Migrate to new version
npm run migrate-test-data -- --from TEST_DATA_v1 --to TEST_DATA_v2
```

## Success Metrics

Test data maintenance is successful when:

1. ✅ **Health checks pass**: No errors in daily health checks
2. ✅ **Verification passes**: Weekly verification shows no drift
3. ✅ **E2E tests pass**: All E2E tests use test data successfully
4. ✅ **Zero production impact**: Test data never interferes with production
5. ✅ **Quick recovery**: Issues resolved within 1 hour
6. ✅ **Automated processes**: 90%+ of maintenance automated

## Related Documentation

- **Test Data Population**: [`sdlc/docs/specs/Project-Online-Test-Data-Population-Script.md`](./Project-Online-Test-Data-Population-Script.md)
- **E2E Integration Tests**: [`sdlc/docs/specs/Project-Online-E2E-Integration-Tests.md`](./Project-Online-E2E-Integration-Tests.md)
- **Integration Test Spec**: [`test/integration/INTEGRATION_TEST_SPEC.md`](../../../test/integration/INTEGRATION_TEST_SPEC.md)