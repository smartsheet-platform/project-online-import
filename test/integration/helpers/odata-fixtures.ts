/**
 * Pre-built oData fixtures for integration tests
 * Uses builders and scenarios to create complete test data sets
 */

import { ODataProjectBuilder } from '../../unit/builders/ODataProjectBuilder';
import { ODataTaskBuilder } from '../../unit/builders/ODataTaskBuilder';
import { ODataResourceBuilder } from '../../unit/builders/ODataResourceBuilder';
import { ODataAssignmentBuilder } from '../../unit/builders/ODataAssignmentBuilder';
import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
} from '../../../src/types/ProjectOnline';

import * as projectScenarios from '../scenarios/project-scenarios';
import * as taskScenarios from '../scenarios/task-scenarios';
import * as resourceScenarios from '../scenarios/resource-scenarios';
import * as assignmentScenarios from '../scenarios/assignment-scenarios';

/**
 * Complete test data set for a simple project
 */
export interface SimpleProjectFixture {
  project: ProjectOnlineProject;
  tasks: ProjectOnlineTask[];
  resources: ProjectOnlineResource[];
  assignments: ProjectOnlineAssignment[];
}

/**
 * Complete test data set with all entity types and variations
 */
export interface CompleteProjectFixture {
  project: ProjectOnlineProject;
  tasks: ProjectOnlineTask[];
  resources: {
    work: ProjectOnlineResource[];
    material: ProjectOnlineResource[];
    cost: ProjectOnlineResource[];
  };
  assignments: ProjectOnlineAssignment[];
}

/**
 * Create a minimal valid project fixture
 */
export function createMinimalProject(): SimpleProjectFixture {
  const project = projectScenarios.basicProject();
  const tasks = taskScenarios.flatTaskList(project.Id, 3);
  const resources = [resourceScenarios.workResourceWithEmail()];
  const assignments = [assignmentScenarios.singleWorkAssignment(tasks[0].Id, resources[0].Id)];

  return { project, tasks, resources, assignments };
}

/**
 * Create a complete project fixture with all variations
 */
export function createCompleteProject(): CompleteProjectFixture {
  const project = projectScenarios.completeProject();

  // Create diverse task set
  const tasks = [
    ...taskScenarios.flatTaskList(project.Id, 3),
    ...taskScenarios.simpleHierarchy(project.Id),
    ...taskScenarios.milestoneTasks(project.Id),
  ];

  // Create diverse resource set
  const resources = resourceScenarios.mixedResourceTypes();

  // Create assignments linking tasks and resources
  const assignments: ProjectOnlineAssignment[] = [];

  // Assign work resources to first few tasks
  for (let i = 0; i < Math.min(3, tasks.length); i++) {
    for (const resource of resources.work) {
      assignments.push(
        new ODataAssignmentBuilder().asWorkAssignment(tasks[i].Id, resource.Id, 40, 1.0).build()
      );
    }
  }

  // Assign material resources to middle tasks
  if (tasks.length > 3) {
    for (let i = 3; i < Math.min(6, tasks.length); i++) {
      for (const resource of resources.material) {
        assignments.push(
          new ODataAssignmentBuilder()
            .asMaterialAssignment(tasks[i].Id, resource.Id, 1.0, 500)
            .build()
        );
      }
    }
  }

  // Assign cost resources to remaining tasks
  if (tasks.length > 6) {
    for (let i = 6; i < Math.min(9, tasks.length); i++) {
      for (const resource of resources.cost) {
        assignments.push(
          new ODataAssignmentBuilder().asCostAssignment(tasks[i].Id, resource.Id, 2000).build()
        );
      }
    }
  }

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing hierarchy
 */
export function createHierarchyProject(): SimpleProjectFixture {
  const project = new ODataProjectBuilder().withName('Hierarchy Test Project').build();

  const tasks = taskScenarios.complexHierarchy(project.Id);
  const resources = [resourceScenarios.workResourceWithEmail()];

  // Assign resource to leaf tasks only (tasks with highest OutlineLevel)
  const leafTasks = tasks.filter(
    (t) => t.OutlineLevel === Math.max(...tasks.map((t) => t.OutlineLevel || 1))
  );
  const assignments = leafTasks.map((task) =>
    assignmentScenarios.singleWorkAssignment(task.Id, resources[0].Id)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing priority levels
 */
export function createPriorityProject(): SimpleProjectFixture {
  const project = new ODataProjectBuilder()
    .withName('Priority Test Project')
    .withPriority(800) // Very High
    .build();

  const tasks = taskScenarios.tasksWithAllPriorities(project.Id);
  const resources = [resourceScenarios.workResourceWithEmail()];
  const assignments = tasks.map((task) =>
    assignmentScenarios.singleWorkAssignment(task.Id, resources[0].Id)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing duration variations
 */
export function createDurationProject(): SimpleProjectFixture {
  const project = new ODataProjectBuilder().withName('Duration Test Project').build();

  const tasks = taskScenarios.tasksWithDurationVariations(project.Id);
  const resources = [resourceScenarios.workResourceWithEmail()];
  const assignments = tasks.map((task) =>
    assignmentScenarios.singleWorkAssignment(task.Id, resources[0].Id)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing constraint types
 */
export function createConstraintProject(): SimpleProjectFixture {
  const project = new ODataProjectBuilder().withName('Constraint Test Project').build();

  const tasks = taskScenarios.tasksWithAllConstraints(project.Id);
  const resources = [resourceScenarios.workResourceWithEmail()];
  const assignments = tasks.map((task) =>
    assignmentScenarios.singleWorkAssignment(task.Id, resources[0].Id)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing predecessor relationships
 */
export function createPredecessorProject(): SimpleProjectFixture {
  const project = new ODataProjectBuilder().withName('Predecessor Test Project').build();

  const tasks = taskScenarios.tasksWithPredecessors(project.Id);
  const resources = [resourceScenarios.workResourceWithEmail()];
  const assignments = tasks.map((task) =>
    assignmentScenarios.singleWorkAssignment(task.Id, resources[0].Id)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing resource types
 * CRITICAL: Tests Work → MULTI_CONTACT_LIST vs Material/Cost → MULTI_PICKLIST
 */
export function createResourceTypeProject(): CompleteProjectFixture {
  const project = new ODataProjectBuilder().withName('Resource Type Test Project').build();

  // Create enough tasks for all assignment scenarios
  const tasks = taskScenarios.flatTaskList(project.Id, 10);

  // Create mixed resource types
  const resources = resourceScenarios.mixedResourceTypes();

  // Create assignments that test column type distinction
  const assignmentData = assignmentScenarios.assignmentsByResourceType(tasks, resources);
  const assignments = [
    ...assignmentData.workAssignments,
    ...assignmentData.materialAssignments,
    ...assignmentData.costAssignments,
    ...assignmentData.mixedAssignments,
  ];

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing department picklist discovery
 */
export function createDepartmentProject(): SimpleProjectFixture {
  const project = new ODataProjectBuilder().withName('Department Test Project').build();

  const tasks = taskScenarios.flatTaskList(project.Id, 5);
  const resources = resourceScenarios.resourcesWithDepartments();
  const assignments: ProjectOnlineAssignment[] = [];

  // Assign each resource to a different task
  for (let i = 0; i < Math.min(tasks.length, resources.length); i++) {
    assignments.push(assignmentScenarios.singleWorkAssignment(tasks[i].Id, resources[i].Id));
  }

  return { project, tasks, resources, assignments };
}

/**
 * Create a large project fixture for performance testing
 */
export function createLargeProject(
  taskCount: number = 1000,
  resourceCount: number = 100
): SimpleProjectFixture {
  const project = new ODataProjectBuilder().withName('Large Project Performance Test').build();

  const tasks = taskScenarios.largeFlatTaskList(project.Id, taskCount);
  const resources = resourceScenarios.largeResourceSet(resourceCount);

  // Only assign first 100 tasks to avoid excessive assignment creation
  const assignments = assignmentScenarios.largeAssignmentSet(
    tasks.slice(0, 100),
    resources.slice(0, 10)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing special characters
 */
export function createSpecialCharsProject(): SimpleProjectFixture {
  const project = projectScenarios.projectWithSpecialCharacters();

  const tasks = [
    new ODataTaskBuilder()
      .withProjectId(project.Id)
      .withName('Task with "quotes" & <brackets>')
      .build(),
    new ODataTaskBuilder().withProjectId(project.Id).withName('Task with émojis 🚀 and ñ').build(),
  ];

  const resources = [
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Resource with "special" chars')
      .withEmail('special@example.com')
      .build(),
  ];

  const assignments = tasks.map((task) =>
    assignmentScenarios.singleWorkAssignment(task.Id, resources[0].Id)
  );

  return { project, tasks, resources, assignments };
}

/**
 * Create a project fixture for testing edge case dates
 */
export function createEdgeDateProject(): SimpleProjectFixture {
  const project = projectScenarios.projectWithEdgeDates();

  const tasks = [
    new ODataTaskBuilder()
      .withProjectId(project.Id)
      .withName('Far future task')
      .withDates('2099-12-31T23:59:59Z', '2099-12-31T23:59:59Z')
      .build(),
    new ODataTaskBuilder().withProjectId(project.Id).withName('Task with null dates').build(),
  ];

  const resources = [resourceScenarios.workResourceWithEmail()];
  const assignments = [assignmentScenarios.singleWorkAssignment(tasks[0].Id, resources[0].Id)];

  return { project, tasks, resources, assignments };
}

/**
 * Get all fixture creators mapped by name
 */
export const fixtures = {
  minimal: createMinimalProject,
  complete: createCompleteProject,
  hierarchy: createHierarchyProject,
  priority: createPriorityProject,
  duration: createDurationProject,
  constraint: createConstraintProject,
  predecessor: createPredecessorProject,
  resourceType: createResourceTypeProject,
  department: createDepartmentProject,
  large: createLargeProject,
  specialChars: createSpecialCharsProject,
  edgeDate: createEdgeDateProject,
};

/**
 * Helper to get fixture by name
 */
export function getFixture(
  name: keyof typeof fixtures
): SimpleProjectFixture | CompleteProjectFixture {
  const creator = fixtures[name];
  if (!creator) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return creator();
}

/**
 * Export scenario modules as properties for test access
 */
export { projectScenarios, taskScenarios, resourceScenarios, assignmentScenarios };
