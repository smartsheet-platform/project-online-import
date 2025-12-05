/**
 * Pre-built Assignment test scenarios using ODataAssignmentBuilder
 * These correspond to test scenarios in load-phase-test-scenarios.md
 *
 * CRITICAL: Assignment column type distinction
 * - Work resources (people) → MULTI_CONTACT_LIST columns
 * - Material/Cost resources (non-people) → MULTI_PICKLIST columns
 */

import { ODataAssignmentBuilder } from '../../mocks/builders/ODataAssignmentBuilder';
import {
  ProjectOnlineAssignment,
  ProjectOnlineResource,
  ProjectOnlineTask,
} from '../../../src/types/ProjectOnline';

/**
 * Scenario 1: Single Work resource assignment (→ MULTI_CONTACT_LIST)
 */
export function singleWorkAssignment(taskId: string, resourceId: string): ProjectOnlineAssignment {
  return new ODataAssignmentBuilder().asWorkAssignment(taskId, resourceId, 40, 1.0).build();
}

/**
 * Scenario 2: Multiple Work resource assignments on same task (→ MULTI_CONTACT_LIST)
 */
export function multipleWorkAssignments(
  taskId: string,
  resourceIds: string[]
): ProjectOnlineAssignment[] {
  return resourceIds.map((resourceId, index) =>
    new ODataAssignmentBuilder()
      .asWorkAssignment(taskId, resourceId, 20 + index * 10, 0.5 + index * 0.25)
      .build()
  );
}

/**
 * Scenario 3: Single Material resource assignment (→ MULTI_PICKLIST)
 */
export function singleMaterialAssignment(
  taskId: string,
  resourceId: string
): ProjectOnlineAssignment {
  return new ODataAssignmentBuilder().asMaterialAssignment(taskId, resourceId, 2.0, 1000).build();
}

/**
 * Scenario 4: Multiple Material resource assignments on same task (→ MULTI_PICKLIST)
 */
export function multipleMaterialAssignments(
  taskId: string,
  resourceIds: string[]
): ProjectOnlineAssignment[] {
  return resourceIds.map((resourceId, index) =>
    new ODataAssignmentBuilder()
      .asMaterialAssignment(taskId, resourceId, 1.0 + index, 500 * (index + 1))
      .build()
  );
}

/**
 * Scenario 5: Single Cost resource assignment (→ MULTI_PICKLIST)
 */
export function singleCostAssignment(taskId: string, resourceId: string): ProjectOnlineAssignment {
  return new ODataAssignmentBuilder().asCostAssignment(taskId, resourceId, 5000).build();
}

/**
 * Scenario 6: Multiple Cost resource assignments on same task (→ MULTI_PICKLIST)
 */
export function multipleCostAssignments(
  taskId: string,
  resourceIds: string[]
): ProjectOnlineAssignment[] {
  return resourceIds.map((resourceId, index) =>
    new ODataAssignmentBuilder().asCostAssignment(taskId, resourceId, 2000 * (index + 1)).build()
  );
}

/**
 * Scenario 7: Mixed assignment types on same task (CRITICAL TEST)
 * - Work → MULTI_CONTACT_LIST column
 * - Material → MULTI_PICKLIST column (different from Work!)
 * - Cost → MULTI_PICKLIST column (different from Work!)
 */
export function mixedAssignmentsOnTask(
  taskId: string,
  workResourceId: string,
  materialResourceId: string,
  costResourceId: string
): ProjectOnlineAssignment[] {
  return [
    new ODataAssignmentBuilder().asWorkAssignment(taskId, workResourceId, 40, 1.0).build(),
    new ODataAssignmentBuilder().asMaterialAssignment(taskId, materialResourceId, 1.0, 500).build(),
    new ODataAssignmentBuilder().asCostAssignment(taskId, costResourceId, 2000).build(),
  ];
}

/**
 * Scenario 8: Assignment with work/cost tracking
 */
export function assignmentWithTracking(
  taskId: string,
  resourceId: string
): ProjectOnlineAssignment {
  return new ODataAssignmentBuilder()
    .asWorkAssignment(taskId, resourceId, 40, 1.0)
    .withActualWork(20)
    .withRemainingWork(20)
    .withPercentWorkComplete(50)
    .withActualCost(1500)
    .withCost(3000)
    .build();
}

/**
 * Scenario 9: Assignment with dates
 */
export function assignmentWithDates(taskId: string, resourceId: string): ProjectOnlineAssignment {
  return new ODataAssignmentBuilder()
    .asWorkAssignment(taskId, resourceId, 40, 1.0)
    .withStart('2024-01-01T08:00:00Z')
    .withFinish('2024-01-05T17:00:00Z')
    .withMetadataDates('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z')
    .build();
}

/**
 * Helper: Create assignments for resource type testing
 * This scenario validates the CRITICAL column type distinction:
 * - Work resources must create MULTI_CONTACT_LIST columns
 * - Material/Cost resources must create MULTI_PICKLIST columns
 */
export function assignmentsByResourceType(
  tasks: ProjectOnlineTask[],
  resources: {
    work: ProjectOnlineResource[];
    material: ProjectOnlineResource[];
    cost: ProjectOnlineResource[];
  }
): {
  workAssignments: ProjectOnlineAssignment[];
  materialAssignments: ProjectOnlineAssignment[];
  costAssignments: ProjectOnlineAssignment[];
  mixedAssignments: ProjectOnlineAssignment[];
} {
  if (tasks.length < 4) {
    throw new Error('Need at least 4 tasks for assignment scenarios');
  }

  return {
    // Task 1: Work resource only → MULTI_CONTACT_LIST
    workAssignments: resources.work.map((r) =>
      new ODataAssignmentBuilder().asWorkAssignment(tasks[0].Id, r.Id, 40, 1.0).build()
    ),

    // Task 2: Material resource only → MULTI_PICKLIST
    materialAssignments: resources.material.map((r) =>
      new ODataAssignmentBuilder().asMaterialAssignment(tasks[1].Id, r.Id, 1.0, 500).build()
    ),

    // Task 3: Cost resource only → MULTI_PICKLIST
    costAssignments: resources.cost.map((r) =>
      new ODataAssignmentBuilder().asCostAssignment(tasks[2].Id, r.Id, 2000).build()
    ),

    // Task 4: Mixed types → BOTH column types needed
    mixedAssignments: [
      new ODataAssignmentBuilder()
        .asWorkAssignment(tasks[3].Id, resources.work[0].Id, 40, 1.0)
        .build(),
      new ODataAssignmentBuilder()
        .asMaterialAssignment(tasks[3].Id, resources.material[0].Id, 1.0, 500)
        .build(),
      new ODataAssignmentBuilder()
        .asCostAssignment(tasks[3].Id, resources.cost[0].Id, 2000)
        .build(),
    ],
  };
}

/**
 * Helper: Large assignment set for performance testing
 */
export function largeAssignmentSet(
  tasks: ProjectOnlineTask[],
  resources: ProjectOnlineResource[]
): ProjectOnlineAssignment[] {
  const assignments: ProjectOnlineAssignment[] = [];

  // Assign each resource to each task
  for (const task of tasks) {
    for (const resource of resources) {
      assignments.push(
        new ODataAssignmentBuilder()
          .forTask(task.Id)
          .forResource(resource.Id)
          .withWork(40)
          .withUnits(1.0)
          .build()
      );
    }
  }

  return assignments;
}

/**
 * All assignment scenarios combined
 */
export function allAssignmentScenarios(
  tasks: ProjectOnlineTask[],
  resources: {
    work: ProjectOnlineResource[];
    material: ProjectOnlineResource[];
    cost: ProjectOnlineResource[];
  }
): {
  singleWork: ProjectOnlineAssignment;
  multipleWork: ProjectOnlineAssignment[];
  singleMaterial: ProjectOnlineAssignment;
  multipleMaterial: ProjectOnlineAssignment[];
  singleCost: ProjectOnlineAssignment;
  multipleCost: ProjectOnlineAssignment[];
  mixedTypes: ProjectOnlineAssignment[];
  withTracking: ProjectOnlineAssignment;
  withDates: ProjectOnlineAssignment;
  byResourceType: {
    workAssignments: ProjectOnlineAssignment[];
    materialAssignments: ProjectOnlineAssignment[];
    costAssignments: ProjectOnlineAssignment[];
    mixedAssignments: ProjectOnlineAssignment[];
  };
} {
  if (
    tasks.length < 10 ||
    resources.work.length < 3 ||
    resources.material.length < 2 ||
    resources.cost.length < 2
  ) {
    throw new Error('Insufficient tasks/resources for all assignment scenarios');
  }

  return {
    singleWork: singleWorkAssignment(tasks[0].Id, resources.work[0].Id),
    multipleWork: multipleWorkAssignments(tasks[1].Id, [
      resources.work[0].Id,
      resources.work[1].Id,
    ]),
    singleMaterial: singleMaterialAssignment(tasks[2].Id, resources.material[0].Id),
    multipleMaterial: multipleMaterialAssignments(tasks[3].Id, [
      resources.material[0].Id,
      resources.material[1].Id,
    ]),
    singleCost: singleCostAssignment(tasks[4].Id, resources.cost[0].Id),
    multipleCost: multipleCostAssignments(tasks[5].Id, [
      resources.cost[0].Id,
      resources.cost[1].Id,
    ]),
    mixedTypes: mixedAssignmentsOnTask(
      tasks[6].Id,
      resources.work[0].Id,
      resources.material[0].Id,
      resources.cost[0].Id
    ),
    withTracking: assignmentWithTracking(tasks[7].Id, resources.work[0].Id),
    withDates: assignmentWithDates(tasks[8].Id, resources.work[0].Id),
    byResourceType: assignmentsByResourceType(tasks, resources),
  };
}
