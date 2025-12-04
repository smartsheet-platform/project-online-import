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
 * Returns 18 columns per specification
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
      title: 'Contact',
      type: 'CONTACT_LIST',
      primary: true,
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

  // Column 2: Contact (primary column)
  const contact = createContactObject(resource.Name, resource.Email);
  if (contact) {
    cells.push({
      columnId: 2,
      objectValue: contact,
    });
  } else {
    cells.push({
      columnId: 2,
      value: '',
    });
  }

  // Column 3: Resource Type
  cells.push({
    columnId: 3,
    value: resource.ResourceType || '',
  });

  // Column 4: Max Units (convert decimal to percentage)
  cells.push({
    columnId: 4,
    value: resource.MaxUnits !== undefined ? convertMaxUnits(resource.MaxUnits) : '',
  });

  // Column 5: Standard Rate (numeric value)
  cells.push({
    columnId: 5,
    value: resource.StandardRate !== undefined ? resource.StandardRate : '',
  });

  // Column 6: Overtime Rate (numeric value)
  cells.push({
    columnId: 6,
    value: resource.OvertimeRate !== undefined ? resource.OvertimeRate : '',
  });

  // Column 7: Cost Per Use (numeric value)
  cells.push({
    columnId: 7,
    value: resource.CostPerUse !== undefined ? resource.CostPerUse : '',
  });

  // Column 8: Department
  cells.push({
    columnId: 8,
    value: resource.Department || '',
  });

  // Column 9: Code
  cells.push({
    columnId: 9,
    value: resource.Code || '',
  });

  // Column 10: Is Active (boolean)
  cells.push({
    columnId: 10,
    value: resource.IsActive,
  });

  // Column 11: Is Generic (boolean)
  cells.push({
    columnId: 11,
    value: resource.IsGeneric,
  });

  // Column 12: Project Online Created Date
  cells.push({
    columnId: 12,
    value: resource.CreatedDate ? convertDateTimeToDate(resource.CreatedDate) : '',
  });

  // Column 13: Project Online Modified Date
  cells.push({
    columnId: 13,
    value: resource.ModifiedDate ? convertDateTimeToDate(resource.ModifiedDate) : '',
  });

  // Columns 14-17: System-generated (Created Date, Modified Date, Created By, Modified By)
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
 * Discover unique department values from resources
 * Used to populate PMO Standards reference sheet
 */
export function discoverResourceDepartments(resources: ProjectOnlineResource[]): string[] {
  const departments = new Set<string>();

  for (const resource of resources) {
    if (resource.Department && resource.Department.trim() !== '') {
      departments.add(resource.Department);
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
  await client.updateColumn(sheetId, resourceTypeColumnId, {
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
  await client.updateColumn(sheetId, departmentColumnId, {
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
  if (resource.ResourceType === 'Work' && !resource.Email) {
    warnings.push('Work resource has no email address');
  }

  // Warnings for overallocation
  if (resource.MaxUnits !== undefined && resource.MaxUnits > 1.0) {
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
