/**
 * Pre-built Task test scenarios using ODataTaskBuilder
 * These correspond to test scenarios in load-phase-test-scenarios.md
 */

import { ODataTaskBuilder } from '../../unit/builders/ODataTaskBuilder';
import { ProjectOnlineTask } from '../../../src/types/ProjectOnline';

/**
 * Scenario 1: Flat task list (no hierarchy)
 */
export function flatTaskList(projectId: string, count: number = 5): ProjectOnlineTask[] {
  const tasks: ProjectOnlineTask[] = [];

  for (let i = 1; i <= count; i++) {
    tasks.push(
      new ODataTaskBuilder().withProjectId(projectId).withName(`Task ${i}`).withHierarchy(1).build()
    );
  }

  return tasks;
}

/**
 * Scenario 2: Simple 2-level hierarchy
 */
export function simpleHierarchy(projectId: string): ProjectOnlineTask[] {
  const parentTask = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Parent Task 1')
    .withHierarchy(1)
    .withId('parent-1')
    .withDuration('PT40H') // 5 days
    .build();

  return [
    parentTask,
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Child Task 1.1')
      .withHierarchy(2, 'parent-1')
      .withId('child-1-1')
      .withDuration('PT16H') // 2 days
      .withParent(parentTask)
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Child Task 1.2')
      .withHierarchy(2, 'parent-1')
      .withId('child-1-2')
      .withDuration('PT24H') // 3 days
      .withParent(parentTask)
      .build(),
  ];
}

/**
 * Scenario 3: Deep hierarchy (5+ levels)
 */
export function deepHierarchy(projectId: string): ProjectOnlineTask[] {
  const level1 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Level 1')
    .withHierarchy(1)
    .withId('level-1')
    .withDuration('PT40H') // 5 days
    .build();
    
  const level2 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Level 2')
    .withHierarchy(2, 'level-1')
    .withId('level-2')
    .withDuration('PT32H') // 4 days
    .withParent(level1)
    .build();
    
  const level3 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Level 3')
    .withHierarchy(3, 'level-2')
    .withId('level-3')
    .withDuration('PT24H') // 3 days
    .withParent(level2)
    .build();
    
  const level4 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Level 4')
    .withHierarchy(4, 'level-3')
    .withId('level-4')
    .withDuration('PT16H') // 2 days
    .withParent(level3)
    .build();

  return [
    level1,
    level2,
    level3,
    level4,
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Level 5')
      .withHierarchy(5, 'level-4')
      .withDuration('PT8H') // 1 day
      .withParent(level4)
      .build(),
  ];
}

/**
 * Scenario 4: Complex multi-branch hierarchy
 */
export function complexHierarchy(projectId: string): ProjectOnlineTask[] {
  // Create parent tasks first
  const phase1 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Phase 1')
    .withHierarchy(1)
    .withId('phase-1')
    .build();
    
  const phase2 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Phase 2')
    .withHierarchy(1)
    .withId('phase-2')
    .build();

  // Create second-level tasks
  const task11 = new ODataTaskBuilder()
    .withProjectId(projectId)
    .withName('Task 1.1')
    .withHierarchy(2, 'phase-1')
    .withId('task-1-1')
    .withParent(phase1)
    .build();

  return [
    phase1,
    task11,
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Subtask 1.1.1')
      .withHierarchy(3, 'task-1-1')
      .withParent(task11)
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task 1.2')
      .withHierarchy(2, 'phase-1')
      .withParent(phase1)
      .build(),
    phase2,
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task 2.1')
      .withHierarchy(2, 'phase-2')
      .withParent(phase2)
      .build(),
  ];
}

/**
 * Scenario 5: Tasks with all duration variations
 * NOTE: Duration in Smartsheet is auto-calculated from Start/End dates
 * We provide dates that match the expected durations
 */
export function tasksWithDurationVariations(projectId: string): ProjectOnlineTask[] {
  return [
    // Zero duration = milestone (same start and end)
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Zero duration')
      .withDuration('PT0H')
      .withDates('2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z')
      .build(),
    // 40 hours = 5 days (8 hour workday)
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('40 hours')
      .withDuration('PT40H')
      .withDates('2024-01-02T08:00:00Z', '2024-01-08T17:00:00Z')
      .build(),
    // 5 days explicit
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('5 days')
      .withDuration('P5D')
      .withDates('2024-01-09T08:00:00Z', '2024-01-15T17:00:00Z')
      .build(),
    // 480 minutes = 8 hours = 1 day
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('480 minutes')
      .withDuration('PT480M')
      .withDates('2024-01-16T08:00:00Z', '2024-01-16T17:00:00Z')
      .build(),
    // Null duration with dates (Smartsheet will calculate)
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Null duration')
      .withDates('2024-01-17T08:00:00Z', '2024-01-19T17:00:00Z')
      .build(),
  ];
}

/**
 * Scenario 6: Tasks with all 7 priority levels
 * NOTE: Tasks include dates for proper Smartsheet project sheet behavior
 */
export function tasksWithAllPriorities(projectId: string): ProjectOnlineTask[] {
  const priorities = [
    { value: 0, label: 'Lowest' },
    { value: 200, label: 'Very Low' },
    { value: 400, label: 'Lower' },
    { value: 500, label: 'Medium' },
    { value: 600, label: 'Higher' },
    { value: 800, label: 'Very High' },
    { value: 1000, label: 'Highest' },
  ];

  return priorities.map((p, index) =>
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName(`${p.label} Priority Task`)
      .withPriority(p.value)
      .withDates(
        `2024-01-${String(index + 1).padStart(2, '0')}T08:00:00Z`,
        `2024-01-${String(index + 5).padStart(2, '0')}T17:00:00Z`
      )
      .build()
  );
}

/**
 * Scenario 7: Milestone tasks (zero duration)
 */
export function milestoneTasks(projectId: string): ProjectOnlineTask[] {
  return [
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Project Kickoff')
      .withMilestone()
      .withDates('2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z')
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Phase 1 Complete')
      .withMilestone()
      .withDates('2024-02-01T08:00:00Z', '2024-02-01T08:00:00Z')
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Project Complete')
      .withMilestone()
      .withDates('2024-06-01T08:00:00Z', '2024-06-01T08:00:00Z')
      .build(),
  ];
}

/**
 * Scenario 8: Tasks with all 8 constraint types
 */
export function tasksWithAllConstraints(projectId: string): ProjectOnlineTask[] {
  return [
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('ASAP Task')
      .withConstraint(0) // ASAP
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('ALAP Task')
      .withConstraint(1) // ALAP
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('SNET Task')
      .withConstraint(4, '2024-03-01T08:00:00Z') // SNET
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('SNLT Task')
      .withConstraint(5, '2024-03-15T08:00:00Z') // SNLT
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('FNET Task')
      .withConstraint(6, '2024-04-01T08:00:00Z') // FNET
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('FNLT Task')
      .withConstraint(7, '2024-04-15T08:00:00Z') // FNLT
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('MSO Task')
      .withConstraint(2, '2024-05-01T08:00:00Z') // MSO
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('MFO Task')
      .withConstraint(3, '2024-05-15T08:00:00Z') // MFO
      .build(),
  ];
}

/**
 * Scenario 9: Tasks with predecessor relationships
 */
export function tasksWithPredecessors(projectId: string): ProjectOnlineTask[] {
  return [
    new ODataTaskBuilder().withProjectId(projectId).withName('Task A').withId('task-a').build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task B (FS from A)')
      .withId('task-b')
      .withPredecessorString('2FS')
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task C (SS from A, +2d lag)')
      .withId('task-c')
      .withPredecessorString('2SS+2d')
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task D (FF from B)')
      .withId('task-d')
      .withPredecessorString('3FF')
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task E (SF from C, -1d lag)')
      .withPredecessorString('4SF-1d')
      .build(),
  ];
}

/**
 * Scenario 10: Tasks with custom fields
 */
export function tasksWithCustomFields(projectId: string): ProjectOnlineTask[] {
  return [
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task with custom text')
      .withCustomFields({ CustomText01: 'Custom value' })
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task with custom number')
      .withCustomFields({ CustomNumber01: 42 })
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task with custom date')
      .withCustomFields({ CustomDate01: '2024-03-15T00:00:00Z' })
      .build(),
    new ODataTaskBuilder()
      .withProjectId(projectId)
      .withName('Task with custom flag')
      .withCustomFields({ CustomFlag01: true })
      .build(),
  ];
}

/**
 * Helper: Large task set for performance testing
 */
export function largeFlatTaskList(projectId: string, count: number = 1000): ProjectOnlineTask[] {
  const tasks: ProjectOnlineTask[] = [];

  for (let i = 1; i <= count; i++) {
    tasks.push(
      new ODataTaskBuilder()
        .withProjectId(projectId)
        .withName(`Task ${i}`)
        .withHierarchy(1)
        .withDates('2024-01-01T08:00:00Z', '2024-01-05T17:00:00Z')
        .withDuration('P5D')
        .build()
    );
  }

  return tasks;
}

/**
 * Scenario 11: Complete task with all possible fields
 * Tests maximum field coverage to ensure no data loss
 */
export function completeTask(projectId: string): ProjectOnlineTask {
  return new ODataTaskBuilder()
    .withProjectId(projectId)
    .withId('complete-task-1')
    .withName('Complete Task with All Fields - Testing Maximum Coverage 🚀')
    .withHierarchy(1) // Level 1 task
    .withDates('2024-03-15T08:00:00Z', '2024-03-22T17:00:00Z') // 1 week
    .withDuration('P5D') // 5 business days
    .withPriority(600) // Higher priority
    .withPercentComplete(45) // 45% complete
    .withConstraint(4, '2024-03-15T08:00:00Z') // Start No Earlier Than (SNET)
    .withPredecessorString('1FS+2d') // Predecessor with lag
    .withWork('PT80H', 'PT36H') // 80 hours of work, 36 hours actual
    .withNotes(
      'This is a comprehensive task with detailed notes.\nMulti-line text.\n\nSpecial characters: & < > " \' / \\ | ? * : 日本語 🎯'
    )
    .withDeadline('2024-03-25T17:00:00Z') // Deadline after finish date
    .withMetadataDates('2024-03-01T09:00:00Z', '2024-03-14T15:30:00Z') // Created and modified dates
    .withCustomFields({
      CustomText01: 'Custom text value with special chars: <>&"\'',
      CustomNumber01: 42.5,
      CustomDate01: '2024-04-01T00:00:00Z',
      CustomFlag01: true,
      CustomText02: 'Another custom field',
      CustomNumber02: 999.99,
    })
    .build();
}

/**
 * All task scenarios combined
 */
export function allTaskScenarios(projectId: string): {
  flat: ProjectOnlineTask[];
  simpleHierarchy: ProjectOnlineTask[];
  deepHierarchy: ProjectOnlineTask[];
  complexHierarchy: ProjectOnlineTask[];
  durationVariations: ProjectOnlineTask[];
  allPriorities: ProjectOnlineTask[];
  milestones: ProjectOnlineTask[];
  allConstraints: ProjectOnlineTask[];
  predecessors: ProjectOnlineTask[];
  customFields: ProjectOnlineTask[];
} {
  return {
    flat: flatTaskList(projectId),
    simpleHierarchy: simpleHierarchy(projectId),
    deepHierarchy: deepHierarchy(projectId),
    complexHierarchy: complexHierarchy(projectId),
    durationVariations: tasksWithDurationVariations(projectId),
    allPriorities: tasksWithAllPriorities(projectId),
    milestones: milestoneTasks(projectId),
    allConstraints: tasksWithAllConstraints(projectId),
    predecessors: tasksWithPredecessors(projectId),
    customFields: tasksWithCustomFields(projectId),
  };
}
