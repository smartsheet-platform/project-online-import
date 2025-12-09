/**
 * Builder for Project Online Task test data
 * Supports all edge cases from test scenarios including hierarchy, durations, priorities, etc.
 */

import { ProjectOnlineTask } from '../../../src/types/ProjectOnline';
import { randomUUID } from 'crypto';

export class ODataTaskBuilder {
  private task: Partial<ProjectOnlineTask> = {
    Id: randomUUID(),
    ProjectId: '',
    TaskName: 'Test Task',
    TaskIndex: 1,
    OutlineLevel: 1,
    IsMilestone: false,
    IsActive: true,
  };

  /**
   * Set basic required fields only
   */
  withBasicFields(): this {
    this.task = {
      Id: randomUUID(),
      ProjectId: '',
      TaskName: 'Basic Test Task',
      TaskIndex: 1,
      OutlineLevel: 1,
      IsMilestone: false,
      IsActive: true,
    };
    return this;
  }

  /**
   * Set hierarchy information
   */
  withHierarchy(outlineLevel: number, parentId?: string): this {
    this.task.OutlineLevel = outlineLevel;
    this.task.ParentTaskId = parentId;
    return this;
  }

  /**
   * Set ISO8601 duration (e.g., "PT40H", "P5D", "PT480M")
   */
  withDuration(iso8601: string): this {
    this.task.Duration = iso8601;
    return this;
  }

  /**
   * Set priority level (0-1000)
   */
  withPriority(value: number): this {
    this.task.Priority = value;
    return this;
  }

  /**
   * Configure as milestone task
   */
  withMilestone(): this {
    this.task.IsMilestone = true;
    this.task.Duration = 'PT0H';
    return this;
  }

  /**
   * Set constraint type and date
   */
  withConstraint(type: string, date?: string): this {
    this.task.ConstraintType = type;
    this.task.ConstraintDate = date;
    return this;
  }

  /**
   * Set predecessors string (e.g., "5FS", "3SS+2d")
   */
  withPredecessors(predecessors: string): this {
    this.task.Predecessors = predecessors;
    return this;
  }

  /**
   * Set custom fields
   */
  withCustomFields(fields: Record<string, unknown>): this {
    Object.assign(this.task, fields);
    return this;
  }

  /**
   * Set task ID
   */
  withId(id: string): this {
    this.task.Id = id;
    return this;
  }

  /**
   * Set project ID
   */
  withProjectId(projectId: string): this {
    this.task.ProjectId = projectId;
    return this;
  }

  /**
   * Set task name
   */
  withName(name: string): this {
    this.task.TaskName = name;
    return this;
  }

  /**
   * Set task index for ordering
   */
  withTaskIndex(index: number): this {
    this.task.TaskIndex = index;
    return this;
  }

  /**
   * Set start and finish dates
   */
  withDates(start: string, finish: string): this {
    this.task.Start = start;
    this.task.Finish = finish;
    return this;
  }

  /**
   * Set work and actual work
   */
  withWork(work: string, actualWork?: string): this {
    this.task.Work = work;
    this.task.ActualWork = actualWork;
    return this;
  }

  /**
   * Set percent complete
   */
  withPercentComplete(percent: number): this {
    this.task.PercentComplete = percent;
    return this;
  }

  /**
   * Set task notes
   */
  withNotes(notes: string): this {
    this.task.TaskNotes = notes;
    return this;
  }

  /**
   * Set deadline
   */
  withDeadline(deadline: string): this {
    this.task.Deadline = deadline;
    return this;
  }

  /**
   * Set created and modified dates
   */
  withMetadataDates(created: string, modified: string): this {
    this.task.CreatedDate = created;
    this.task.ModifiedDate = modified;
    return this;
  }

  /**
   * Build the task object
   */
  build(): ProjectOnlineTask {
    return {
      Id: this.task.Id!,
      ProjectId: this.task.ProjectId!,
      TaskName: this.task.TaskName!,
      TaskIndex: this.task.TaskIndex!,
      OutlineLevel: this.task.OutlineLevel!,
      IsMilestone: this.task.IsMilestone!,
      IsActive: this.task.IsActive!,
      ParentTaskId: this.task.ParentTaskId,
      Start: this.task.Start,
      Finish: this.task.Finish,
      Duration: this.task.Duration,
      Work: this.task.Work,
      ActualWork: this.task.ActualWork,
      PercentComplete: this.task.PercentComplete,
      TaskType: this.task.TaskType,
      Priority: this.task.Priority,
      TaskNotes: this.task.TaskNotes,
      Predecessors: this.task.Predecessors,
      ConstraintType: this.task.ConstraintType,
      ConstraintDate: this.task.ConstraintDate,
      Deadline: this.task.Deadline,
      ResourceNames: this.task.ResourceNames,
      CreatedDate: this.task.CreatedDate,
      ModifiedDate: this.task.ModifiedDate,
    };
  }
}
