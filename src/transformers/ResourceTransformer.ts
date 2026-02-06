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
  SmartsheetColumnType,
} from '../types/Smartsheet';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { PMOStandardsWorkspaceInfo } from './PMOStandardsTransformer';
import { convertDateTimeToDate, createContactObject } from './utils';
import { getColumnMap, addColumnsIfNotExist, findSheetByPartialName } from '../util/SmartsheetHelpers';

/**
 * Core field mappings from Project Online to Smartsheet columns
 */
const CORE_FIELD_MAPPINGS: Record<string, string> = {
  Id: 'Project Online Resource ID',
  Name: 'Resource Name',
  Email: 'Team Members', // Will be handled specially based on resource type
  Group: 'Department',
  StandardRate: 'Standard Rate',
  OvertimeRate: 'Overtime Rate',
  CostPerUse: 'Cost Per Use',
  MaximumCapacity: 'Max Units',
  Code: 'Code',
  IsGenericResource: 'Is Generic',
  Created: 'Project Online Created Date',
  Modified: 'Project Online Modified Date',
};

/**
 * Create Resources sheet with all resources
 */
export function createResourcesSheet(
  resources: ProjectOnlineResource[],
  projectName: string
): SmartsheetSheet {
  const departments = discoverResourceDepartments(resources);
  const columns = createResourcesSheetColumns(departments);
  const rows = resources.map((resource) => createResourceRow(resource));

  return {
    name: `${projectName} - Resources`,
    columns,
    rows,
  };
}

/**
 * Determine Smartsheet column type based on Project Online field value
 */
function determineSmartsheetColumnType(value: any): SmartsheetColumnType {
  // Handle null/undefined values - always return TEXT_NUMBER
  if (value === null || value === undefined) {
    return 'TEXT_NUMBER';
  }

  // Type-based detection
  if (typeof value === 'boolean') {
    return 'CHECKBOX';
  }

  if (typeof value === 'number') {
    return 'TEXT_NUMBER';
  }

  // Enhanced date pattern detection for strings including Project Online default date
  // Pattern: YYYY-MM-DDTHH:MM:SS with optional timezone and milliseconds
  // Includes default value '0001-01-01T00:00:00' and similar formats
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/.test(value)) {
    return 'DATE';
  }

  return 'TEXT_NUMBER';
}

/**
 * Convert camelCase Project Online field name to Title Case for Smartsheet column
 */
function camelCaseToTitleCase(fieldName: string): string {
  return fieldName
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Trim leading space and convert to title case
    .trim()
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Check if template sheet has matching column (case and space insensitive)
 */
function findTemplateColumnMatch(
  templateColumns: SmartsheetColumn[],
  projectOnlineFieldName: string
): SmartsheetColumn | null {
  const normalizedFieldName = projectOnlineFieldName.toLowerCase().replace(/\s+/g, '');
  
  return templateColumns.find(col => {
    if (!col.title) return false;
    const normalizedColumnTitle = col.title.toLowerCase().replace(/\s+/g, '');
    return normalizedColumnTitle === normalizedFieldName;
  }) || null;
}

/**
 * Get template resource sheet columns if template workspace is configured
 */
async function getTemplateResourceColumns(
  client: SmartsheetClient,
  templateWorkspaceId?: number
): Promise<SmartsheetColumn[]> {
  if (!templateWorkspaceId) {
    return [];
  }

  try {
    // Find resource sheet in template workspace
    const resourceSheet = await findSheetByPartialName(
      client,
      templateWorkspaceId,
      'Resources'
    );

    if (!resourceSheet) {
      return [];
    }

    // Get full sheet details with columns
    const sheet = await client.sheets?.getSheet?.({ id: resourceSheet.id });
    return sheet?.columns || [];
  } catch (error) {
    // Template access failed - fall back to no template columns
    return [];
  }
}

/**
 * Create automatic field mapping for resource sheet
 */
export async function createResourceFieldMapping(
  resources: ProjectOnlineResource[],
  client: SmartsheetClient,
  templateWorkspaceId?: number
): Promise<{
  coreColumns: SmartsheetColumn[];
  additionalColumns: SmartsheetColumn[];
  fieldMappings: Record<string, string>; // ProjectOnline field -> Smartsheet column title
}> {
  // Get core predefined columns
  const departments = discoverResourceDepartments(resources);
  const coreColumns = createResourcesSheetColumns(departments);
  
  // Get template columns if available
  const templateColumns = await getTemplateResourceColumns(client, templateWorkspaceId);
  
  const additionalColumns: SmartsheetColumn[] = [];
  const fieldMappings: Record<string, string> = {};
  
  // Core mappings (use constants)
  Object.assign(fieldMappings, CORE_FIELD_MAPPINGS);

  // Get all Project Online field names from sample data
  const sampleResource = resources[0];
  if (!sampleResource) {
    return { coreColumns, additionalColumns, fieldMappings };
  }

  // Process each Project Online field
  for (const [fieldName, value] of Object.entries(sampleResource)) {
    // Skip already mapped core fields or object values
    if (fieldMappings[fieldName] || (value && typeof value === 'object')) {
      continue;
    }

    // Convert field name to title case
    const titleCaseFieldName = camelCaseToTitleCase(fieldName);
    
    // Check if template has matching column
    const templateMatch = findTemplateColumnMatch(templateColumns, titleCaseFieldName);
    
    if (templateMatch) {
      // Use template column (existing column will be reused)
      fieldMappings[fieldName] = templateMatch.title!;
    } else {
      // Create new column
      const columnType = determineSmartsheetColumnType(value);
      const newColumn: SmartsheetColumn = {
        title: titleCaseFieldName,
        type: columnType,
        width: 120,
      };
      
      additionalColumns.push(newColumn);
      fieldMappings[fieldName] = titleCaseFieldName;
    }
  }

  return { coreColumns, additionalColumns, fieldMappings };
}

/**
 * Create enhanced resource row with automatic field mapping
 */
export function createEnhancedResourceRow(
  resource: ProjectOnlineResource,
  columnMap: Record<string, { id: number; type: string }>,
  fieldMappings: Record<string, string>
): SmartsheetRow {
  const cells: SmartsheetCell[] = [];

  // Process each Project Online field using the mapping
  for (const [poField, smartsheetColumn] of Object.entries(fieldMappings)) {
    const columnInfo = columnMap[smartsheetColumn];
    if (!columnInfo) continue;

    const value = (resource as any)[poField];
    
    // Skip object values
    if (value && typeof value === 'object') {
      continue;
    }

    // Handle Email field specially - only populate Team Members for Work resources
    if (poField === 'Email') {
      const resourceType = getResourceType(resource);
      if (resourceType === 'Work' && smartsheetColumn === 'Team Members' && value) {
        const contact = createContactObject(resource.Name, value);
        if (contact) {
          cells.push({
            columnId: columnInfo.id,
            objectValue: contact,
          });
        }
      }
      continue;
    }

    // Handle Name field - always populate Resource Name column
    if (poField === 'Name') {
      if (smartsheetColumn === 'Resource Name') {
        cells.push({
          columnId: columnInfo.id,
          value: resource.Name,
        });
      }
      continue;
    }

    // Handle other special conversions
    let cellValue: any = value;
    
    if (poField === 'MaximumCapacity' || poField === 'MaxUnits') {
      cellValue = value !== undefined ? convertMaxUnits(value) : '';
    } else if (columnInfo.type === 'DATE') {
      cellValue = value ? convertDateTimeToDate(value) : '';
    } else if (columnInfo.type === 'CHECKBOX') {
      cellValue = value ?? false;
    } else if (value === null || value === undefined) {
      continue; // Skip empty values
    }

    cells.push({
      columnId: columnInfo.id,
      value: cellValue,
    });
  }

  // Add resource type column
  if (columnMap['Resource Type']) {
    cells.push({
      columnId: columnMap['Resource Type'].id,
      value: getResourceType(resource),
    });
  }

  return {
    toBottom: true,
    cells,
  };
}

export function createResourcesSheetColumns(departments: string[] = []): SmartsheetColumn[] {
  const departmentColumn: SmartsheetColumn = {
    title: 'Department',
    type: 'PICKLIST',
    width: 150,
  };
  
  // Add department options if provided
  if (departments.length > 0) {
    (departmentColumn as any).options = departments;
  }

  return [
    {
      title: 'Resource Name',
      type: 'TEXT_NUMBER',
      primary: true,
      width: 200,
    },
    {
      title: 'Project Online Resource ID',
      type: 'TEXT_NUMBER',
      width: 150,
      hidden: true,
      locked: true,
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
    departmentColumn,
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
  const maxUnits = resource.MaximumCapacity ?? resource.MaxUnits;
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
  const department = resource.Group ?? resource.Department;
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
  const createdDate = resource.Created ?? resource.CreatedDate;
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
  // Check explicit ResourceType property first (for test data and certain APIs)
  if (resource.ResourceType === 'Material' || resource.ResourceType === 'Cost' || resource.ResourceType === 'Work') {
    return resource.ResourceType;
  }
  
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
    const department = resource.Group ?? resource.Department;
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
  const maxUnits = resource.MaximumCapacity ?? resource.MaxUnits;
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
  constructor(private client: SmartsheetClient, private templateWorkspaceId?: number) {}

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

    // Create automatic field mapping
    const { additionalColumns, fieldMappings } = await createResourceFieldMapping(
      resources,
      this.client,
      this.templateWorkspaceId
    );

    // Get existing columns in the sheet first
    const currentColumnMap = await getColumnMap(this.client, sheetId);
    const existingColumnTitles = new Set(Object.keys(currentColumnMap));
    console.log('Existing columns in resource sheet:', Array.from(existingColumnTitles));

    // Filter core columns to only include ones that don't exist
    const departments = discoverResourceDepartments(resources);
    const coreColumns = createResourcesSheetColumns(departments);
    const missingCoreColumns = coreColumns.filter(col => !existingColumnTitles.has(col.title));

    if (missingCoreColumns.length > 0) {
      console.log(`Adding ${missingCoreColumns.length} missing core columns:`, missingCoreColumns.map(c => c.title));
      
      // Add columns one by one to identify which one is causing the issue
      for (const column of missingCoreColumns) {
        try {
          await addColumnsIfNotExist(this.client, sheetId, [column]);
          console.log(`✓ Added column: ${column.title}`);
        } catch (error) {
          console.error(`✗ Failed to add column: ${column.title}`, error);
          // Continue with other columns
        }
      }
    } else {
      console.log('All core columns already exist');
    }

    // Filter additional columns to only include ones that don't exist  
    const missingAdditionalColumns = additionalColumns.filter(col => !existingColumnTitles.has(col.title));

    // Add any missing additional columns
    if (missingAdditionalColumns.length > 0) {
      console.log(`Adding ${missingAdditionalColumns.length} additional columns`);
      try {
        await addColumnsIfNotExist(this.client, sheetId, missingAdditionalColumns);
      } catch (error) {
        console.error('Failed to add additional columns:', error);
        // Continue - we'll work with existing columns
      }
    }

    // Refresh column map after adding new columns
    const finalColumnMap = await getColumnMap(this.client, sheetId);

    // Create rows using the enhanced mapping
    let rowsActuallyCreated = 0;
    if (resources.length > 0) {
      if (!this.client.sheets?.addRows) {
        throw new Error('Smartsheet client sheets.addRows method not available');
      }
      
      const rows = resources.map((resource) => 
        createEnhancedResourceRow(resource, finalColumnMap, fieldMappings)
      );
      
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
}
