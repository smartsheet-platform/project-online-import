/**
 * Resource transformer - converts Project Online resources to Smartsheet rows
 * Based on transformation mapping specification Section 3
 */

import { ProjectOnlineResource } from '../types/ProjectOnline';
import {
  SmartsheetSheet,
  SmartsheetColumn,
  SmartsheetRow,
  SmartsheetCell,
} from '../types/Smartsheet';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { PMOStandardsWorkspaceInfo } from './PMOStandardsTransformer';
import { convertDateTimeToDate, createContactObject } from './utils';
import { getColumnMap, addColumnsIfNotExist } from '../util/SmartsheetHelpers';

/**
 * Create Resources sheet with all resources
 */
export function createResourcesSheet(
  resources: ProjectOnlineResource[],
  projectName: string
): SmartsheetSheet {
  const columns = createResourcesSheetColumns();
  const rows = resources.map((resource) => createResourceRow(resource));

  return {
    name: `${projectName} - Resources`,
    columns,
    rows,
  };
}

/**
 * Create columns for Resources sheet
 * Returns 21 columns total (includes Resource Name primary + 3 type-specific columns)
 */
export function createResourcesSheetColumns(): SmartsheetColumn[] {
  return [
    {
      title: 'Resource ID',
      type: 'AUTO_NUMBER',
      width: 80,
    },
    {
      title: 'Project Online Resource ID',
      type: 'TEXT_NUMBER',
      width: 150,
      hidden: true,
      locked: true,
    },
    {
      title: 'Resource Name',
      type: 'TEXT_NUMBER',
      primary: true,
      width: 200,
    },
    {
      title: 'Team Members',
      type: 'CONTACT_LIST',
      width: 200,
    },
    {
      title: 'Materials',
      type: 'TEXT_NUMBER',
      width: 200,
    },
    {
      title: 'Cost Resources',
      type: 'TEXT_NUMBER',
      width: 200,
    },
    {
      title: 'Resource Type',
      type: 'PICKLIST',
      width: 120,
    },
    {
      title: 'Max Units',
      type: 'TEXT_NUMBER',
      width: 100,
    },
    {
      title: 'Standard Rate',
      type: 'TEXT_NUMBER',
      width: 120,
    },
    {
      title: 'Overtime Rate',
      type: 'TEXT_NUMBER',
      width: 120,
    },
    {
      title: 'Cost Per Use',
      type: 'TEXT_NUMBER',
      width: 120,
    },
    {
      title: 'Department',
      type: 'PICKLIST',
      width: 150,
    },
    {
      title: 'Code',
      type: 'TEXT_NUMBER',
      width: 100,
    },
    {
      title: 'Is Active',
      type: 'CHECKBOX',
      width: 80,
    },
    {
      title: 'Is Generic',
      type: 'CHECKBOX',
      width: 80,
    },
    {
      title: 'Project Online Created Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Project Online Modified Date',
      type: 'DATE',
      width: 120,
    },
    {
      title: 'Created Date',
      type: 'CREATED_DATE',
      width: 120,
    },
    {
      title: 'Modified Date',
      type: 'MODIFIED_DATE',
      width: 120,
    },
    {
      title: 'Created By',
      type: 'CREATED_BY',
      width: 150,
    },
    {
      title: 'Modified By',
      type: 'MODIFIED_BY',
      width: 150,
    },
  ];
}

/**
 * Create single row for Resources sheet
 */
export function createResourceRow(resource: ProjectOnlineResource): SmartsheetRow {
  const cells: SmartsheetCell[] = [];

  // Column 0: Resource ID (AUTO_NUMBER - no value needed)

  // Column 1: Project Online Resource ID
  cells.push({
    columnId: 1,
    value: resource.Id,
  });

  // Column 2: Resource Name (PRIMARY column - always populated)
  cells.push({
    columnId: 2,
    value: resource.Name,
  });

  // Determine resource type (handle both OData and CSOM formats)
  const resourceType = getResourceType(resource);

  // Populate type-specific column based on resource type
  if (resourceType === 'Work') {
    // Column 3: Team Members (CONTACT_LIST for Work resources)
    const contact = createContactObject(resource.Name, resource.Email);
    if (contact) {
      cells.push({
        columnId: 3,
        objectValue: contact,
      });
    }
    // Columns 4-5: Materials and Cost Resources left empty
  } else if (resourceType === 'Material') {
    // Column 3: Team Members left empty
    // Column 4: Materials (Material resources)
    cells.push({
      columnId: 4,
      value: resource.Name,
    });
    // Column 5: Cost Resources left empty
  } else if (resourceType === 'Cost') {
    // Columns 3-4: Team Members and Materials left empty
    // Column 5: Cost Resources (Cost resources)
    cells.push({
      columnId: 5,
      value: resource.Name,
    });
  }

  // Column 6: Resource Type
  cells.push({
    columnId: 6,
    value: resourceType,
  });

  // Column 7: Max Units (handle both OData and CSOM formats)
  const maxUnits = resource.MaximumCapacity
  cells.push({
    columnId: 7,
    value: maxUnits !== undefined ? convertMaxUnits(maxUnits) : '',
  });

  // Column 8: Standard Rate (numeric value)
  cells.push({
    columnId: 8,
    value: resource.StandardRate !== undefined ? resource.StandardRate : '',
  });

  // Column 9: Overtime Rate (numeric value)
  cells.push({
    columnId: 9,
    value: resource.OvertimeRate !== undefined ? resource.OvertimeRate : '',
  });

  // Column 10: Cost Per Use (numeric value)
  cells.push({
    columnId: 10,
    value: resource.CostPerUse !== undefined ? resource.CostPerUse : '',
  });

  // Column 11: Department (handle both OData and CSOM formats)
  const department = resource.Group;
  cells.push({
    columnId: 11,
    value: department || '',
  });

  // Column 12: Code
  cells.push({
    columnId: 12,
    value: resource.Code || '',
  });

  // Column 13: Is Active (handle both OData and CSOM formats)
  const isActive = true;
  cells.push({
    columnId: 13,
    value: isActive,
  });

  // Column 14: Is Generic (handle both OData and CSOM formats)
  const isGeneric = resource.IsGenericResource ?? false;
  cells.push({
    columnId: 14,
    value: isGeneric,
  });

  // Column 15: Project Online Created Date (handle both formats)
  const createdDate = resource.Created;
  cells.push({
    columnId: 15,
    value: createdDate ? convertDateTimeToDate(createdDate) : '',
  });

  // Column 16: Project Online Modified Date (handle both formats)
  const modifiedDate = resource.Modified;
  cells.push({
    columnId: 16,
    value: modifiedDate ? convertDateTimeToDate(modifiedDate) : '',
  });

  // Columns 17-20: System-generated (Created Date, Modified Date, Created By, Modified By)
  // These are populated by Smartsheet automatically, no values needed

  return {
    toBottom: true,
    cells,
  };
}

/**
 * Convert MaxUnits decimal to percentage string
 * Per specification Section 3: 1.0 = 100%, 0.5 = 50%
 */
function convertMaxUnits(maxUnits: number): string {
  const percentage = Math.round(maxUnits * 100);
  return `${percentage}%`;
}

/**
 * Get resource type from CSOM DefaultBookingType and additional material/cost indicators
 */
function getResourceType(resource: ProjectOnlineResource): 'Work' | 'Material' | 'Cost' {
  // Check for Material resource indicators
  if (resource.MaterialLabel && resource.MaterialLabel !== null) {
    return 'Material';
  }
  
  // Check for Cost resource indicators
  const isNotMaterial = !resource.MaterialLabel || resource.MaterialLabel === null;
  
  // Not a typical Work resource (no email, can't be leveled)
  const isNotWorkResource = !resource.Email && !resource.CanLevel;
  
  // May have IsBudgeted flag set
  // Cost resources often have zero rates and no work values
  if (isNotMaterial && isNotWorkResource) {
    return 'Cost';
  }
  
  // CSOM format - DefaultBookingType: 1=Work, 2=Material, 3=Cost
  return 'Work';
}

/**
 * Discover unique department values from resources
 * Used to populate PMO Standards reference sheet
 */
export function discoverResourceDepartments(resources: ProjectOnlineResource[]): string[] {
  const departments = new Set<string>();

  for (const resource of resources) {
    const department = resource.Group;
    if (department && department.trim() !== '') {
      departments.add(department);
    }
  }

  return Array.from(departments).sort();
}

/**
 * Configure Resource Type and Department columns to reference PMO Standards
 * Must be called after sheet creation
 */
export async function configureResourcePicklistColumns(
  client: SmartsheetClient,
  sheetId: number,
  resourceTypeColumnId: number,
  departmentColumnId: number,
  pmoStandards: PMOStandardsWorkspaceInfo
): Promise<void> {
  // Configure Resource Type column
  const resourceTypeRef = pmoStandards.referenceSheets['Resource - Type'];
  await client.updateColumn?.(sheetId, resourceTypeColumnId, {
    type: 'PICKLIST',
    options: {
      strict: true,
      options: [
        {
          value: {
            objectType: 'CELL_LINK',
            sheetId: resourceTypeRef.sheetId,
            columnId: resourceTypeRef.columnId,
          },
        },
      ],
    },
  });

  // Configure Department column
  const departmentRef = pmoStandards.referenceSheets['Resource - Department'];
  await client.updateColumn?.(sheetId, departmentColumnId, {
    type: 'PICKLIST',
    options: {
      strict: true,
      options: [
        {
          value: {
            objectType: 'CELL_LINK',
            sheetId: departmentRef.sheetId,
            columnId: departmentRef.columnId,
          },
        },
      ],
    },
  });
}

/**
 * Validation result interface
 */
export interface ResourceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate resource data before transformation
 */
export function validateResource(resource: ProjectOnlineResource): ResourceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!resource.Id) {
    errors.push('Resource ID is required');
  }

  if (!resource.Name || resource.Name.trim() === '') {
    errors.push('Resource Name is required');
  }

  // Warnings for Work resources without email
  if (getResourceType(resource) === 'Work' && !resource.Email) {
    warnings.push('Work resource has no email address');
  }

  // Warnings for overallocation
  const maxUnits = resource.MaximumCapacity;
  if (maxUnits !== undefined && maxUnits > 1.0) {
    warnings.push('Resource is overallocated (MaxUnits > 1.0)');
  }

  // Warnings for negative rates
  if (
    (resource.StandardRate !== undefined && resource.StandardRate < 0) ||
    (resource.OvertimeRate !== undefined && resource.OvertimeRate < 0) ||
    (resource.CostPerUse !== undefined && resource.CostPerUse < 0)
  ) {
    warnings.push('Resource has negative rate value');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Class-based wrapper for integration tests
 * Provides the expected API while using the functional implementation
 */
export class ResourceTransformer {
  constructor(private client: SmartsheetClient) {}

  async transformResources(
    resources: ProjectOnlineResource[],
    sheetId: number
  ): Promise<{ rowsCreated: number; sheetId: number }> {
    // Validate all resources
    for (const resource of resources) {
      const validation = validateResource(resource);
      if (!validation.valid) {
        throw new Error(`Invalid resource ${resource.Name}: ${validation.errors.join(', ')}`);
      }
    }

    // Build columnMap: Start by fetching the existing primary column
    // For re-run resiliency, we check if columns exist before adding
    const columnMap: Record<string, number> = {};

    // Get existing columns from sheet
    const existingColumnMap = await getColumnMap(this.client, sheetId);

    // Check for "Resource Name" primary column
    if (existingColumnMap['Resource Name']) {
      columnMap['Resource Name'] = existingColumnMap['Resource Name'].id;
    }

    // Discover unique department values for picklist
    const uniqueDepartments = discoverResourceDepartments(resources);

    // Define additional columns to add (excluding primary which already exists)
    // Don't specify index - let Smartsheet append columns to end of sheet
    const additionalColumns = [
      {
        title: 'Project Online Resource ID',
        type: 'TEXT_NUMBER',
        width: 150,
        hidden: true,
        locked: true,
      },
      { title: 'Team Members', type: 'CONTACT_LIST', width: 200 },
      { title: 'Materials', type: 'TEXT_NUMBER', width: 200 },
      { title: 'Cost Resources', type: 'TEXT_NUMBER', width: 200 },
      { title: 'Resource Type', type: 'PICKLIST', width: 120 },
      { title: 'Max Units', type: 'TEXT_NUMBER', width: 100 },
      { title: 'Standard Rate', type: 'TEXT_NUMBER', width: 120 },
      { title: 'Overtime Rate', type: 'TEXT_NUMBER', width: 120 },
      { title: 'Cost Per Use', type: 'TEXT_NUMBER', width: 120 },
      { title: 'Department', type: 'PICKLIST', width: 150, options: uniqueDepartments },
      { title: 'Code', type: 'TEXT_NUMBER', width: 100 },
      { title: 'Is Active', type: 'CHECKBOX', width: 80 },
      { title: 'Is Generic', type: 'CHECKBOX', width: 80 },
      { title: 'Project Online Created Date', type: 'DATE', width: 120 },
      { title: 'Project Online Modified Date', type: 'DATE', width: 120 },
    ];

    // Use resiliency helper to add columns (skips existing ones)
    const addedColumns = await addColumnsIfNotExist(
      this.client,
      sheetId,
      additionalColumns as SmartsheetColumn[]
    );

    // Add results to column map
    for (const result of addedColumns) {
      columnMap[result.title] = result.id;
    }

    // Now create rows using the columnMap
    let rowsActuallyCreated = 0;
    if (resources.length > 0) {
      if (!this.client.sheets?.addRows) {
        throw new Error('Smartsheet client sheets.addRows method not available');
      }
      const rows = resources.map((resource) => this.buildResourceRow(resource, columnMap));
      const addRowsResponse = await this.client.sheets.addRows({ sheetId, body: rows });

      // Extract the actual created rows from the response
      const createdRows = addRowsResponse?.result || addRowsResponse?.data || addRowsResponse || [];
      const rowsArray = Array.isArray(createdRows) ? createdRows : [];
      rowsActuallyCreated = rowsArray.length;
    }

    return {
      rowsCreated: rowsActuallyCreated,
      sheetId,
    };
  }

  private buildResourceRow(
    resource: ProjectOnlineResource,
    columnMap: Record<string, number>
  ): SmartsheetRow {
    const cells: Array<{
      columnId: number;
      value?: string | number | boolean;
      objectValue?:
        | { objectType: 'CONTACT'; name?: string; email?: string }
        | { name?: string; email?: string };
    }> = [];

    // Resource Name (PRIMARY column - always populated)
    if (columnMap['Resource Name']) {
      cells.push({
        columnId: columnMap['Resource Name'],
        value: resource.Name,
      });
    }

    // Determine resource type (default to Work)
    const resourceType = getResourceType(resource);

    // Populate type-specific column based on resource type
    // Per Smartsheet SDK: Omit columnId from cells array for empty values
    if (resourceType === 'Work') {
      // Team Members column (CONTACT_LIST for Work resources)
      if (columnMap['Team Members']) {
        const contact = createContactObject(resource.Name, resource.Email);
        if (contact) {
          // CONTACT_LIST column - createContactObject already includes objectType
          cells.push({
            columnId: columnMap['Team Members'],
            objectValue: contact,
          });
        }
        // If no contact, omit the cell entirely (Smartsheet treats as empty)
      }
      // Materials and Cost Resources: omit cells (empty)
    } else if (resourceType === 'Material') {
      // Materials column (Material resources)
      if (columnMap['Materials']) {
        cells.push({
          columnId: columnMap['Materials'],
          value: resource.Name,
        });
      }
      // Team Members and Cost Resources: omit cells (empty)
    } else if (resourceType === 'Cost') {
      // Cost Resources column (Cost resources)
      if (columnMap['Cost Resources']) {
        cells.push({
          columnId: columnMap['Cost Resources'],
          value: resource.Name,
        });
      }
      // Team Members and Materials: omit cells (empty)
    }

    // Project Online Resource ID
    if (columnMap['Project Online Resource ID']) {
      cells.push({
        columnId: columnMap['Project Online Resource ID'],
        value: resource.Id,
      });
    }

    // Resource Type
    if (columnMap['Resource Type']) {
      cells.push({
        columnId: columnMap['Resource Type'],
        value: resourceType,
      });
    }

    // Max Units (convert decimal to percentage) - only add if value exists
    if (columnMap['Max Units']) {
      const maxUnits = resource.MaximumCapacity;
      if (maxUnits !== undefined) {
        cells.push({
          columnId: columnMap['Max Units'],
          value: convertMaxUnits(maxUnits),
        });
      }
    }

    // Standard Rate - only add if value exists
    if (columnMap['Standard Rate'] && resource.StandardRate !== undefined) {
      cells.push({
        columnId: columnMap['Standard Rate'],
        value: resource.StandardRate,
      });
    }

    // Overtime Rate - only add if value exists
    if (columnMap['Overtime Rate'] && resource.OvertimeRate !== undefined) {
      cells.push({
        columnId: columnMap['Overtime Rate'],
        value: resource.OvertimeRate,
      });
    }

    // Cost Per Use - only add if value exists
    if (columnMap['Cost Per Use'] && resource.CostPerUse !== undefined) {
      cells.push({
        columnId: columnMap['Cost Per Use'],
        value: resource.CostPerUse,
      });
    }

    // Department - only add if value exists
    if (columnMap['Department']) {
      const department = resource.Group;
      if (department) {
        cells.push({
          columnId: columnMap['Department'],
          value: department,
        });
      }
    }

    // Code - only add if value exists
    if (columnMap['Code'] && resource.Code) {
      cells.push({
        columnId: columnMap['Code'],
        value: resource.Code,
      });
    }

    // Is Active
    if (columnMap['Is Active']) {
      cells.push({
        columnId: columnMap['Is Active'],
        value: true,
      });
    }

    // Is Generic
    if (columnMap['Is Generic']) {
      cells.push({
        columnId: columnMap['Is Generic'],
        value: resource.IsGenericResource ?? false,
      });
    }

    // Project Online Created Date - only add if value exists
    if (columnMap['Project Online Created Date']) {
      const createdDate = resource.Created;
      if (createdDate) {
        cells.push({
          columnId: columnMap['Project Online Created Date'],
          value: convertDateTimeToDate(createdDate),
        });
      }
    }

    // Project Online Modified Date - only add if value exists
    if (columnMap['Project Online Modified Date']) {
      const modifiedDate = resource.Modified;
      if (modifiedDate) {
        cells.push({
          columnId: columnMap['Project Online Modified Date'],
          value: convertDateTimeToDate(modifiedDate),
        });
      }
    }

    return {
      toBottom: true,
      cells,
    };
  }
}
