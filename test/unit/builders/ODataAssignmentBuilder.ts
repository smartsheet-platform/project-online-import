/**
 * Builder for Project Online Assignment test data
 * Supports all edge cases including Work/Material/Cost assignments with proper type handling
 */

import { ProjectOnlineAssignment } from '../../../src/types/ProjectOnline';
import { randomUUID } from 'crypto';

export class ODataAssignmentBuilder {
  private assignment: Partial<ProjectOnlineAssignment> = {
    Id: randomUUID(),
    ProjectId: '', // Will be set via forProject or inherited from task context
  };

  /**
   * Link assignment to a project
   */
  forProject(projectId: string): this {
    this.assignment.ProjectId = projectId;
    return this;
  }

  /**
   * Link assignment to a task
   */
  forTask(taskId: string): this {
    this.assignment.TaskId = taskId;
    return this;
  }

  /**
   * Link assignment to a resource
   */
  forResource(resourceId: string): this {
    this.assignment.ResourceId = resourceId;
    return this;
  }

  /**
   * Set work amount (in hours)
   */
  withWork(hours: number): this {
    // Convert hours to ISO8601 duration format (e.g., PT40H)
    this.assignment.Work = `PT${hours}H`;
    return this;
  }

  /**
   * Set units (percentage, 1.0 = 100%)
   */
  withUnits(units: number): this {
    this.assignment.Units = units;
    return this;
  }

  /**
   * Set cost
   */
  withCost(cost: number): this {
    this.assignment.Cost = cost;
    return this;
  }

  /**
   * Set actual work (in hours)
   */
  withActualWork(hours: number): this {
    this.assignment.ActualWork = `PT${hours}H`;
    return this;
  }

  /**
   * Set actual cost
   */
  withActualCost(cost: number): this {
    this.assignment.ActualCost = cost;
    return this;
  }

  /**
   * Set remaining work (in hours)
   */
  withRemainingWork(hours: number): this {
    this.assignment.RemainingWork = `PT${hours}H`;
    return this;
  }

  /**
   * Set percent work complete
   */
  withPercentWorkComplete(percent: number): this {
    this.assignment.PercentWorkComplete = percent;
    return this;
  }

  /**
   * Set start date
   */
  withStart(date: string): this {
    this.assignment.Start = date;
    return this;
  }

  /**
   * Set finish date
   */
  withFinish(date: string): this {
    this.assignment.Finish = date;
    return this;
  }

  /**
   * Set assignment ID
   */
  withId(id: string): this {
    this.assignment.Id = id;
    return this;
  }

  /**
   * Set created and modified dates
   * Note: ProjectOnlineAssignment type doesn't include these fields
   */
  withMetadataDates(_created: string, _modified: string): this {
    // These fields don't exist in ProjectOnlineAssignment type
    // Keeping method for API compatibility but not setting fields
    return this;
  }

  /**
   * Create a typical Work resource assignment (person doing work)
   */
  asWorkAssignment(
    taskId: string,
    resourceId: string,
    hours: number = 40,
    units: number = 1.0
  ): this {
    return this.forTask(taskId).forResource(resourceId).withWork(hours).withUnits(units);
  }

  /**
   * Create a typical Material resource assignment (equipment usage)
   */
  asMaterialAssignment(
    taskId: string,
    resourceId: string,
    units: number = 1.0,
    cost: number = 0
  ): this {
    return this.forTask(taskId).forResource(resourceId).withUnits(units).withCost(cost);
  }

  /**
   * Create a typical Cost resource assignment (fixed cost item)
   */
  asCostAssignment(taskId: string, resourceId: string, cost: number): this {
    return this.forTask(taskId).forResource(resourceId).withCost(cost).withUnits(1.0); // Cost resources typically have 1 unit
  }

  /**
   * Build the assignment object
   */
  build(): ProjectOnlineAssignment {
    if (!this.assignment.TaskId || !this.assignment.ResourceId) {
      throw new Error('Assignment must have both TaskId and ResourceId');
    }

    return {
      Id: this.assignment.Id!,
      TaskId: this.assignment.TaskId,
      ResourceId: this.assignment.ResourceId,
      ProjectId: this.assignment.ProjectId!,
      Work: this.assignment.Work,
      Units: this.assignment.Units,
      Cost: this.assignment.Cost,
      ActualWork: this.assignment.ActualWork,
      ActualCost: this.assignment.ActualCost,
      RemainingWork: this.assignment.RemainingWork,
      PercentWorkComplete: this.assignment.PercentWorkComplete,
      Start: this.assignment.Start,
      Finish: this.assignment.Finish,
    };
  }
}
