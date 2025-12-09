/**
 * Builder for Project Online Project test data
 * Supports all edge cases from test scenarios
 */

import { ProjectOnlineProject } from '../../../src/types/ProjectOnline';
import { randomUUID } from 'crypto';

export class ODataProjectBuilder {
  private project: Partial<ProjectOnlineProject> = {
    Id: randomUUID(),
    Name: 'Test Project',
    CreatedDate: new Date().toISOString(),
    ModifiedDate: new Date().toISOString(),
  };

  /**
   * Set basic required fields only
   */
  withBasicFields(): this {
    this.project = {
      Id: randomUUID(),
      Name: 'Basic Test Project',
      CreatedDate: '2024-01-01T09:00:00Z',
      ModifiedDate: '2024-01-01T09:00:00Z',
    };
    return this;
  }

  /**
   * Set all optional fields with complete data
   */
  withAllFields(): this {
    this.project.Description = 'Complete project description with all fields populated';
    this.project.Owner = 'John Doe';
    this.project.OwnerEmail = 'john.doe@example.com';
    this.project.StartDate = '2024-01-15T09:00:00Z';
    this.project.FinishDate = '2024-06-30T17:00:00Z';
    this.project.ProjectStatus = 'Active';
    this.project.ProjectType = 'Internal';
    this.project.Priority = 500;
    this.project.PercentComplete = 45;
    return this;
  }

  /**
   * Set name with special characters requiring sanitization
   */
  withSpecialCharactersInName(name: string): this {
    this.project.Name = name;
    return this;
  }

  /**
   * Set very long name exceeding length limit
   */
  withLongName(length: number): this {
    this.project.Name = 'A'.repeat(length);
    return this;
  }

  /**
   * Set specific priority level (0-1000)
   */
  withPriority(value: number): this {
    this.project.Priority = value;
    return this;
  }

  /**
   * Set all optional fields to null/undefined
   */
  withNullOptionalFields(): this {
    this.project.Description = undefined;
    this.project.Owner = undefined;
    this.project.OwnerEmail = undefined;
    this.project.StartDate = undefined;
    this.project.FinishDate = undefined;
    this.project.ProjectStatus = undefined;
    this.project.ProjectType = undefined;
    this.project.Priority = undefined;
    this.project.PercentComplete = undefined;
    return this;
  }

  /**
   * Set edge date values (very old or future dates)
   */
  withEdgeDates(): this {
    this.project.StartDate = '1900-01-01T00:00:00Z';
    this.project.FinishDate = '2100-12-31T23:59:59Z';
    this.project.CreatedDate = '1950-06-15T12:00:00Z';
    return this;
  }

  /**
   * Set custom ID
   */
  withId(id: string): this {
    this.project.Id = id;
    return this;
  }

  /**
   * Set custom name
   */
  withName(name: string): this {
    this.project.Name = name;
    return this;
  }

  /**
   * Set owner information
   */
  withOwner(name: string, email?: string): this {
    this.project.Owner = name;
    this.project.OwnerEmail = email;
    return this;
  }

  /**
   * Set dates
   */
  withDates(start: string, finish: string): this {
    this.project.StartDate = start;
    this.project.FinishDate = finish;
    return this;
  }

  /**
   * Set completion percentage
   */
  withPercentComplete(percent: number): this {
    this.project.PercentComplete = percent;
    return this;
  }

  /**
   * Build the project object
   */
  build(): ProjectOnlineProject {
    return {
      Id: this.project.Id!,
      Name: this.project.Name!,
      CreatedDate: this.project.CreatedDate!,
      ModifiedDate: this.project.ModifiedDate!,
      Description: this.project.Description,
      Owner: this.project.Owner,
      OwnerEmail: this.project.OwnerEmail,
      StartDate: this.project.StartDate,
      FinishDate: this.project.FinishDate,
      ProjectStatus: this.project.ProjectStatus,
      ProjectType: this.project.ProjectType,
      Priority: this.project.Priority,
      PercentComplete: this.project.PercentComplete,
    };
  }
}
