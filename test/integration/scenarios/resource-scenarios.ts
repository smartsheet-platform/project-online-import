/**
 * Pre-built Resource test scenarios using ODataResourceBuilder
 * These correspond to test scenarios in load-phase-test-scenarios.md
 */

import { ODataResourceBuilder } from '../../mocks/builders/ODataResourceBuilder';
import { ProjectOnlineResource } from '../../../src/types/ProjectOnline';

/**
 * Scenario 1: Work resource (person) with email
 */
export function workResourceWithEmail(): ProjectOnlineResource {
  return new ODataResourceBuilder()
    .asWorkResource()
    .withName('John Doe')
    .withEmail('john.doe@example.com')
    .withMaxUnits(1.0) // 100% availability
    .build();
}

/**
 * Scenario 2: Work resource (person) without email
 */
export function workResourceWithoutEmail(): ProjectOnlineResource {
  return new ODataResourceBuilder()
    .asWorkResource()
    .withName('Jane Smith')
    .withMaxUnits(1.0)
    .build();
}

/**
 * Scenario 3: Material resource (equipment)
 */
export function materialResource(): ProjectOnlineResource {
  return new ODataResourceBuilder()
    .asMaterialResource()
    .withName('Excavator')
    .withRates(0, 0, 500)
    .build();
}

/**
 * Scenario 4: Cost resource
 */
export function costResource(): ProjectOnlineResource {
  return new ODataResourceBuilder().asCostResource().withName('Travel Expenses').build();
}

/**
 * Scenario 5: Resources with various rate structures
 */
export function resourcesWithRates(): ProjectOnlineResource[] {
  return [
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Standard Rate Only')
      .withRates(75, 0, 0)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Standard + Overtime')
      .withRates(75, 112.5, 0)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('All Rates')
      .withRates(75, 112.5, 1000)
      .build(),
    new ODataResourceBuilder()
      .asMaterialResource()
      .withName('Material with Cost Per Use')
      .withRates(0, 0, 250)
      .build(),
  ];
}

/**
 * Scenario 6: Resources with MaxUnits variations
 */
export function resourcesWithMaxUnitsVariations(): ProjectOnlineResource[] {
  return [
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('0% Available (on leave)')
      .withMaxUnits(0.0)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('50% Available (part-time)')
      .withMaxUnits(0.5)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('100% Available (full-time)')
      .withMaxUnits(1.0)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('150% Available (team of 1.5)')
      .withMaxUnits(1.5)
      .build(),
  ];
}

/**
 * Scenario 7: Resources with boolean field variations
 */
export function resourcesWithBooleanFields(): ProjectOnlineResource[] {
  return [
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Active, Non-Generic')
      .withIsActive(true)
      .withIsGeneric(false)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Active, Generic')
      .withIsActive(true)
      .withIsGeneric(true)
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Inactive, Non-Generic')
      .withIsActive(false)
      .withIsGeneric(false)
      .build(),
  ];
}

/**
 * Scenario 8: Resources with department values for picklist discovery
 */
export function resourcesWithDepartments(): ProjectOnlineResource[] {
  return [
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Engineering Resource 1')
      .withDepartment('Engineering')
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Engineering Resource 2')
      .withDepartment('Engineering')
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Marketing Resource')
      .withDepartment('Marketing')
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Sales Resource')
      .withDepartment('Sales')
      .build(),
    new ODataResourceBuilder()
      .asWorkResource()
      .withName('Operations Resource')
      .withDepartment('Operations')
      .build(),
  ];
}

/**
 * Scenario 9: Resources with complete metadata
 */
export function resourceWithCompleteMetadata(): ProjectOnlineResource {
  return new ODataResourceBuilder()
    .asWorkResource()
    .withName('Complete Resource')
    .withEmail('complete@example.com')
    .withCode('RES-001')
    .withDepartment('Engineering')
    .withMaxUnits(1.0)
    .withRates(100, 150, 0)
    .withBaseCalendar('Standard')
    .withIsActive(true)
    .withIsGeneric(false)
    .withMetadataDates('2024-01-01T00:00:00Z', '2024-01-15T00:00:00Z')
    .build();
}

/**
 * Scenario 10: Mixed resource types for assignment testing
 */
export function mixedResourceTypes(): {
  work: ProjectOnlineResource[];
  material: ProjectOnlineResource[];
  cost: ProjectOnlineResource[];
} {
  return {
    work: [
      new ODataResourceBuilder()
        .asWorkResource()
        .withName('Developer')
        .withEmail('dev@example.com')
        .withId('work-1')
        .build(),
      new ODataResourceBuilder()
        .asWorkResource()
        .withName('Designer')
        .withEmail('designer@example.com')
        .withId('work-2')
        .build(),
    ],
    material: [
      new ODataResourceBuilder()
        .asMaterialResource()
        .withName('Server')
        .withId('material-1')
        .build(),
      new ODataResourceBuilder()
        .asMaterialResource()
        .withName('License')
        .withId('material-2')
        .build(),
    ],
    cost: [
      new ODataResourceBuilder().asCostResource().withName('Training').withId('cost-1').build(),
      new ODataResourceBuilder().asCostResource().withName('Travel').withId('cost-2').build(),
    ],
  };
}

/**
 * Helper: Large resource set for performance testing
 */
export function largeResourceSet(count: number = 100): ProjectOnlineResource[] {
  const resources: ProjectOnlineResource[] = [];

  for (let i = 1; i <= count; i++) {
    resources.push(
      new ODataResourceBuilder()
        .asWorkResource()
        .withName(`Resource ${i}`)
        .withEmail(`resource${i}@example.com`)
        .withMaxUnits(1.0)
        .build()
    );
  }

  return resources;
}

/**
 * All resource scenarios combined
 */
export function allResourceScenarios(): {
  workWithEmail: ProjectOnlineResource;
  workWithoutEmail: ProjectOnlineResource;
  material: ProjectOnlineResource;
  cost: ProjectOnlineResource;
  withRates: ProjectOnlineResource[];
  maxUnitsVariations: ProjectOnlineResource[];
  booleanFields: ProjectOnlineResource[];
  withDepartments: ProjectOnlineResource[];
  completeMetadata: ProjectOnlineResource;
  mixedTypes: {
    work: ProjectOnlineResource[];
    material: ProjectOnlineResource[];
    cost: ProjectOnlineResource[];
  };
} {
  return {
    workWithEmail: workResourceWithEmail(),
    workWithoutEmail: workResourceWithoutEmail(),
    material: materialResource(),
    cost: costResource(),
    withRates: resourcesWithRates(),
    maxUnitsVariations: resourcesWithMaxUnitsVariations(),
    booleanFields: resourcesWithBooleanFields(),
    withDepartments: resourcesWithDepartments(),
    completeMetadata: resourceWithCompleteMetadata(),
    mixedTypes: mixedResourceTypes(),
  };
}
