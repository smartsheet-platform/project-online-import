/**
 * Pre-built Project test scenarios using ODataProjectBuilder
 * These correspond to test scenarios in load-phase-test-scenarios.md
 */

import { ODataProjectBuilder } from '../../unit/builders/ODataProjectBuilder';
import { ProjectOnlineProject } from '../../../src/types/ProjectOnline';

/**
 * Scenario 1: Basic project with required fields only
 */
export function basicProject(): ProjectOnlineProject {
  return new ODataProjectBuilder().withBasicFields().build();
}

/**
 * Scenario 2: Complete project with all optional fields populated
 */
export function completeProject(): ProjectOnlineProject {
  return new ODataProjectBuilder().withAllFields().build();
}

/**
 * Scenario 3: Project with special characters requiring sanitization
 */
export function projectWithSpecialCharacters(): ProjectOnlineProject {
  return new ODataProjectBuilder()
    .withSpecialCharactersInName('Test Project <with> "special" & chars')
    .build();
}

/**
 * Scenario 4: Project with very long name requiring truncation
 */
export function projectWithLongName(): ProjectOnlineProject {
  return new ODataProjectBuilder().withLongName(200).build();
}

/**
 * Scenario 5: Projects with all 7 priority levels
 */
export function projectsWithAllPriorities(): ProjectOnlineProject[] {
  const priorities = [
    { value: 0, label: 'Lowest' },
    { value: 200, label: 'Very Low' },
    { value: 400, label: 'Lower' },
    { value: 500, label: 'Medium' },
    { value: 600, label: 'Higher' },
    { value: 800, label: 'Very High' },
    { value: 1000, label: 'Highest' },
  ];

  return priorities.map((p) =>
    new ODataProjectBuilder().withName(`${p.label} Priority Project`).withPriority(p.value).build()
  );
}

/**
 * Scenario 6: Project with null/undefined optional fields
 */
export function projectWithNullOptionalFields(): ProjectOnlineProject {
  return new ODataProjectBuilder().withNullOptionalFields().build();
}

/**
 * Scenario 7: Project with edge case dates
 */
export function projectWithEdgeDates(): ProjectOnlineProject {
  return new ODataProjectBuilder().withEdgeDates().build();
}

/**
 * Helper: Create multiple projects for bulk testing
 */
export function multipleProjects(count: number): ProjectOnlineProject[] {
  const projects: ProjectOnlineProject[] = [];

  for (let i = 1; i <= count; i++) {
    projects.push(new ODataProjectBuilder().withName(`Test Project ${i}`).withAllFields().build());
  }

  return projects;
}

/**
 * All project scenarios combined
 */
export function allProjectScenarios(): {
  basic: ProjectOnlineProject;
  complete: ProjectOnlineProject;
  specialChars: ProjectOnlineProject;
  longName: ProjectOnlineProject;
  allPriorities: ProjectOnlineProject[];
  nullFields: ProjectOnlineProject;
  edgeDates: ProjectOnlineProject;
} {
  return {
    basic: basicProject(),
    complete: completeProject(),
    specialChars: projectWithSpecialCharacters(),
    longName: projectWithLongName(),
    allPriorities: projectsWithAllPriorities(),
    nullFields: projectWithNullOptionalFields(),
    edgeDates: projectWithEdgeDates(),
  };
}
