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
    Name: 'Test Task',
    TaskIndex: 1,
    OutlinePosition: '1',
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
      Name: 'Basic Test Task',
      TaskIndex: 1,
      OutlinePosition: '1',
      OutlineLevel: 1,
      IsMilestone: false,
      IsActive: true,
    };
    return this;
  }

  /**
   * Set hierarchy information
   */
  withHierarchy(outlineLevel: number, outlinePosition?: string): this {
    this.task.OutlineLevel = outlineLevel;
    this.task.OutlinePosition = outlinePosition || outlineLevel.toString();
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
   * Set predecessors as TaskLink objects
   */
  withPredecessors(predecessors: any[]): this {
    this.task.Predecessors = { results: predecessors };
    return this;
  }

  /**
   * Set predecessors from string format (helper for backward compatibility)
   */
  withPredecessorString(predecessorStr: string): this {
    // For test purposes, create a simple TaskLink structure
    // In real usage, this would come from Project Online API
    if (!predecessorStr) {
      this.task.Predecessors = { results: [] };
      return this;
    }
    
    // Simple parser for test data like "1FS,2SS+1d"
    const predecessorLinks = predecessorStr.split(',').map(pred => {
      const match = pred.trim().match(/^(\d+)(\w{2})([+-]\d+[dhm])?$/);
      if (match) {
        const [, taskNum, type, lag] = match;
        const dependencyTypeMap: Record<string, number> = {
          'FF': 0, 'FS': 1, 'SF': 2, 'SS': 3
        };
        return {
          PredecessorTaskId: `task-${taskNum}`,
          SuccessorTaskId: this.task.Id || 'unknown',
          DependencyType: dependencyTypeMap[type] || 1,
          LinkLag: lag ? parseInt(lag.slice(1)) : 0,
          LinkLagDuration: lag ? `PT${Math.abs(parseInt(lag.slice(1)))}D` : undefined
        };
      }
      return null;
    }).filter((link): link is NonNullable<typeof link> => link !== null);
    
    this.task.Predecessors = { results: predecessorLinks };
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
    this.task.Name = name;
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
      Name: this.task.Name!,
      TaskIndex: this.task.TaskIndex!,
      OutlinePosition: this.task.OutlinePosition!,
      OutlineLevel: this.task.OutlineLevel,
      IsMilestone: this.task.IsMilestone!,
      IsActive: this.task.IsActive!,
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
