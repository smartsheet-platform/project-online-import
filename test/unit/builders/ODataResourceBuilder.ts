/**
 * Builder for Project Online Resource test data
 * Supports all edge cases including Work/Material/Cost resources, rates, and departments
 */

import { ProjectOnlineResource } from '../../../src/types/ProjectOnline';
import { randomUUID } from 'crypto';

export class ODataResourceBuilder {
  private resource: Partial<ProjectOnlineResource> = {
    Id: randomUUID(),
    Name: 'Test Resource',
    IsActive: true,
    IsGeneric: false,
  };

  /**
   * Configure as Work resource (person/people)
   */
  asWorkResource(): this {
    this.resource.ResourceType = 'Work';
    this.resource.Email = 'test.resource@example.com'; // Work resources have email
    this.resource.CanLevel = true; // Work resources can be leveled
    this.resource.MaterialLabel = undefined; // Work resources don't have material label
    return this;
  }

  /**
   * Configure as Material resource (equipment)
   */
  asMaterialResource(): this {
    this.resource.ResourceType = 'Material';
    this.resource.Email = undefined; // Material resources don't have email
    this.resource.CanLevel = false; // Material resources can't be leveled
    this.resource.MaterialLabel = 'units'; // Material resources have a material label
    return this;
  }

  /**
   * Configure as Cost resource
   */
  asCostResource(): this {
    this.resource.ResourceType = 'Cost';
    this.resource.Email = undefined; // Cost resources don't have email
    this.resource.CanLevel = false; // Cost resources can't be leveled
    this.resource.MaterialLabel = undefined; // Cost resources don't have material label
    return this;
  }

  /**
   * Set email address
   */
  withEmail(email: string): this {
    this.resource.Email = email;
    return this;
  }

  /**
   * Set resource name
   */
  withName(name: string): this {
    this.resource.Name = name;
    return this;
  }

  /**
   * Set all rate types
   */
  withRates(standard: number, overtime: number, costPerUse: number): this {
    this.resource.StandardRate = standard;
    this.resource.OvertimeRate = overtime;
    this.resource.CostPerUse = costPerUse;
    return this;
  }

  /**
   * Set max units (1.0 = 100%)
   */
  withMaxUnits(units: number): this {
    this.resource.MaxUnits = units;
    return this;
  }

  /**
   * Set department
   */
  withDepartment(dept: string): this {
    this.resource.Department = dept;
    return this;
  }

  /**
   * Set group (alternative to department for certain Project Online setups)
   */
  withGroup(group: string): this {
    this.resource.Group = group;
    return this;
  }

  /**
   * Set resource code
   */
  withCode(code: string): this {
    this.resource.Code = code;
    return this;
  }

  /**
   * Set active status
   */
  withIsActive(isActive: boolean): this {
    this.resource.IsActive = isActive;
    return this;
  }

  /**
   * Set generic status
   */
  withIsGeneric(isGeneric: boolean): this {
    this.resource.IsGeneric = isGeneric;
    return this;
  }

  /**
   * Set base calendar
   */
  withBaseCalendar(calendar: string): this {
    this.resource.BaseCalendar = calendar;
    return this;
  }

  /**
   * Set resource ID
   */
  withId(id: string): this {
    this.resource.Id = id;
    return this;
  }

  /**
   * Set created and modified dates
   */
  withMetadataDates(created: string, modified: string): this {
    this.resource.CreatedDate = created;
    this.resource.Modified = modified;
    return this;
  }

  /**
   * Build the resource object
   */
  build(): ProjectOnlineResource {
    return {
      Id: this.resource.Id!,
      Name: this.resource.Name!,
      IsActive: this.resource.IsActive!,
      IsGeneric: this.resource.IsGeneric!,
      Email: this.resource.Email,
      ResourceType: this.resource.ResourceType,
      MaxUnits: this.resource.MaxUnits,
      StandardRate: this.resource.StandardRate,
      OvertimeRate: this.resource.OvertimeRate,
      CostPerUse: this.resource.CostPerUse,
      BaseCalendar: this.resource.BaseCalendar,
      Department: this.resource.Department,
      Code: this.resource.Code,
      CreatedDate: this.resource.CreatedDate,
      Modified: this.resource.Modified,
    };
  }
}
