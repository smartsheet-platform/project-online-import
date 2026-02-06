/**
 * CustomFieldHandler - Processes Project Online custom fields and manages their mapping to Smartsheet columns
 * 
 * This class handles:
 * - Detection of custom fields in Project Online entities
 * - Resolution of lookup table values
 * - Column creation in Smartsheet for custom fields
 * - Value formatting for different custom field types
 */

import { SmartsheetColumnType } from '../types/Smartsheet';
import { ProjectOnlineProject, ProjectOnlineTask, ProjectOnlineResource } from '../types/ProjectOnline';
import { Logger } from '../util/Logger';

export type ProjectOnlineEntity = ProjectOnlineProject | ProjectOnlineTask | ProjectOnlineResource;

// Project Online CustomField structure
export interface ProjectOnlineCustomField {
  __metadata: any;
  EntityType: any;
  LookupEntries: any;
  LookupTable: any;
  AppAlternateId: string;
  DepartmentId: string;
  Description: string | null;
  FieldType: number;
  Formula: string | null;
  GraphicalIndicatorNonSummary: any;
  GraphicalIndicatorProjectSummary: any;
  GraphicalIndicatorSummary: any;
  Id: string;
  InternalName: string;
  IsEditableInVisibility: boolean;
  IsLeafOnly: boolean;
  IsMultilineText: boolean;
  IsRequired: boolean;
  IsWorkflowControlled: boolean;
  LookupAllowMultiSelect: boolean;
  LookupDefaultValue: string;
  Name: string;
  RollsDownToAssignments: boolean;
  RollupType: number;
  ShowToolTip: boolean;
  UseFieldForMatching: boolean;
}

export interface CustomFieldDefinition {
  propertyName: string;          // e.g., "Custom_x005f_8bb94672e801f11189de00155d184421"
  fieldGuid: string;             // e.g., "8bb94672e801f11189de00155d184421"
  displayName: string;           // e.g., "Department"
  columnType: SmartsheetColumnType;
  isCollection: boolean;         // true for lookup/multi-select fields
  lookupValues?: Map<string, string>; // Entry ID -> Display Value mapping
}

export interface ProcessedCustomField {
  definition: CustomFieldDefinition;
  value: string;                 // Processed/formatted value ready for Smartsheet
}

export class CustomFieldHandler {
  private entities: ProjectOnlineEntity[];
  public extractNewColumns: { title: string; type: SmartsheetColumnType; width: number }[] = [];

  constructor(
    entities: ProjectOnlineEntity[],
    _logger?: Logger
  ) {
    // Parameters kept for future use
    this.entities = entities;
  }

  /**
   * Extract unique custom field definitions from project entities
   * Iterates through entities -> CustomFields.results to find all unique custom fields
   */
  public extractUniqueCustomFields(): ProjectOnlineCustomField[] {
    const uniqueCustomFields = new Map<string, ProjectOnlineCustomField>();

    // Iterate through all entities using forEach
    this.entities.forEach((entity) => {
      // Cast to any to access CustomFields property (not in type definitions)
      const entityWithCustomFields = entity as any;
      
      // Check if entity has CustomFields property
      if (entityWithCustomFields.CustomFields && 
          entityWithCustomFields.CustomFields.results && 
          Array.isArray(entityWithCustomFields.CustomFields.results)) {
        
        // Iterate through each custom field in the results array using forEach
        entityWithCustomFields.CustomFields.results.forEach((customField: ProjectOnlineCustomField) => {
          // Use the Id as the unique key to avoid duplicates
          if (customField.Id && !uniqueCustomFields.has(customField.Id)) {
            uniqueCustomFields.set(customField.Id, customField);
          }
        });
      }
    });

    // Convert Map values to array and return
    return Array.from(uniqueCustomFields.values());
  }

  /**
   * Determine the appropriate Smartsheet column type for a Project Online custom field
   * Based on FieldType and other properties of the custom field
   */
  public static determineCustomFieldColumnType(customField: ProjectOnlineCustomField): SmartsheetColumnType {
    const fieldType = customField.FieldType;
    const hasLookupTable = Boolean(customField.LookupTable && customField.LookupEntries && 
                          customField.LookupEntries.results && customField.LookupEntries.results.length > 0);
    const isMultilineText = customField.IsMultilineText;
    const hasFormula = customField.Formula != null;

    // Project Online FieldType mapping:
    // 1 = Text (single line)
    // 2 = Start Date  
    // 3 = Finish Date
    // 4 = Duration
    // 5 = Cost
    // 6 = Number
    // 7 = Flag (Yes/No)
    // 21 = Text with lookup table
    // 22 = Number with lookup table
    // Additional types may exist

    switch (fieldType) {
      case 2: // Start Date
      case 3: // Finish Date
        return 'DATE';
        
      case 4: // Duration  
        return 'TEXT_NUMBER'; // Duration stored as text (e.g., "5d", "2w")
        
      case 5: // Cost
      case 6: // Number
      case 22: // Number with lookup table
        return 'TEXT_NUMBER'; // Use TEXT_NUMBER for flexibility with formatting
        
      case 7: // Flag (Yes/No)
        return 'CHECKBOX';
        
      case 1: // Text (single line)
        if (isMultilineText) {
          return 'TEXT_NUMBER'; // Multi-line text
        }
        return 'TEXT_NUMBER'; // Single line text
        
      case 21: // Text with lookup table
        if (hasLookupTable) {
          // For lookup fields, determine if single or multi-select
          if (customField.LookupAllowMultiSelect) {
            return 'MULTI_PICKLIST'; // Multi-select lookup
          } else {
            return 'PICKLIST'; // Single-select lookup
          }
        }
        return 'TEXT_NUMBER';
        
      default:
        // Unknown field type - check for other indicators
        if (hasFormula) {
          return 'TEXT_NUMBER'; // Calculated fields stored as text
        }
        
        if (hasLookupTable) {
          // For lookup fields with unknown field types
          if (customField.LookupAllowMultiSelect) {
            return 'MULTI_PICKLIST'; // Multi-select lookup
          } else {
            return 'PICKLIST'; // Single-select lookup
          }
        }
        
        // Default to text for unknown types
        return 'TEXT_NUMBER';
    }
  }

  /**
   * Format internal name to match the property name on the entity object
   * Converts underscores to _x005f_ format to match entity property names
   * Example: Custom_0000e8d965f147699bd2819d38036fcc -> Custom_x005f_0000e8d965f147699bd2819d38036fcc
   */
  private formatInternalNameForEntity(internalName: string): string {
    // Replace the first underscore after 'Custom' with '_x005f_'
    return internalName.replace(/^Custom_/, 'Custom_x005f_');
  }

  /**
   * Map custom field values for each entity and identify empty fields
   */
  private mapCustomFieldValues(
    processedFields: (ProjectOnlineCustomField & { columnType: SmartsheetColumnType })[]
  ): {
    taskCustomFieldValues: { [entityId: string]: { [internalName: string]: any } };
    emptyFields: string[];
  } {
    // Create mapping: {[EntityId]: {[InternalName]: value}}
    const taskCustomFieldValues: { [entityId: string]: { [internalName: string]: any } } = {};
    const fieldValueCounts: { [internalName: string]: { total: number; empty: number } } = {};
    
    // Initialize field counts
    processedFields.forEach((customField) => {
      fieldValueCounts[customField.InternalName] = { total: 0, empty: 0 };
    });
    
    // Iterate through each entity (task/project/resource)
    this.entities.forEach((entity) => {
      const entityWithId = entity as any;
      const entityId = entityWithId.Id;
      
      if (!entityId) return; // Skip if no ID
      
      // Initialize mapping for this entity
      taskCustomFieldValues[entityId] = {};
      
      // Check each processed custom field for this entity
      processedFields.forEach((customField) => {
        const internalName = customField.InternalName;
        const formattedPropertyName = this.formatInternalNameForEntity(internalName);
        const rawValue = entityWithId[formattedPropertyName];
        
        // Format the value based on column type
        const formattedValue = this.formatCustomFieldValue(rawValue, customField);
        
        // Store the formatted value
        taskCustomFieldValues[entityId][internalName] = formattedValue;
        
        // Count total and empty values for this field (check raw value for emptiness)
        fieldValueCounts[internalName].total++;
        if (rawValue === '' || rawValue === null || rawValue === undefined || 
            (rawValue && typeof rawValue === 'object' && rawValue.results && rawValue.results.length === 0)) {
          fieldValueCounts[internalName].empty++;
        }
      });
    });
    
    // Find custom fields that are empty for ALL entities
    const emptyFields: string[] = [];
    Object.entries(fieldValueCounts).forEach(([internalName, counts]) => {
      if (counts.total > 0 && counts.empty === counts.total) {
        emptyFields.push(internalName);
      }
    });
    
    return {
      taskCustomFieldValues,
      emptyFields
    };
  }

  /**
   * Format custom field value based on column type
   */
  private formatCustomFieldValue(rawValue: any, customField: ProjectOnlineCustomField & { columnType: SmartsheetColumnType }): any {
    // Handle null/undefined values
    if (rawValue === null || rawValue === undefined) {
      return null;
    }

    const columnType = customField.columnType;

    switch (columnType) {
      case 'TEXT_NUMBER':
        // Handle text, number, cost, duration fields
        if (rawValue === '' || rawValue === 0) {
          return null;
        }
        return String(rawValue);

      case 'DATE':
        // Handle date fields
        if (!rawValue) {
          return null;
        }
        // Convert to ISO date string if it's a Date object
        if (rawValue instanceof Date) {
          return rawValue.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        // If it's already a string, return as is (assuming it's properly formatted)
        return rawValue;

      case 'CHECKBOX':
        // Handle boolean/flag fields
        return Boolean(rawValue);

      case 'PICKLIST':
        // Handle single lookup fields
        if (!rawValue || rawValue === '') {
          return null;
        }
        // Handle Collection structure (rawValue.results array)
        if (rawValue.results && Array.isArray(rawValue.results)) {
          if (rawValue.results.length === 0) {
            return null;
          }
          // Resolve lookup values and return first one
          const resolvedValues = rawValue.results.map((entryId: string) => 
            this.resolveLookupValue(entryId, customField)
          ).filter(Boolean);
          return resolvedValues.length > 0 ? resolvedValues[0] : null;
        }
        // Handle direct string values or Entry_ IDs
        if (typeof rawValue === 'string' && rawValue.startsWith('Entry_')) {
          return this.resolveLookupValue(rawValue, customField);
        }
        return String(rawValue);

      case 'MULTI_PICKLIST':
        // Handle multi-lookup fields with Collection structure
        if (!rawValue || !rawValue.results || !Array.isArray(rawValue.results)) {
          return null;
        }
        if (rawValue.results.length === 0) {
          return null;
        }
        // Resolve multiple lookup values and return just the first one as string
        const resolvedValues = rawValue.results.map((entryId: string) => 
          this.resolveLookupValue(entryId, customField)
        ).filter(Boolean); // Remove null/undefined values
        
        if (resolvedValues.length === 0) {
          return null;
        }
        
        // Return just the first resolved value as a string (same as PICKLIST)
        return resolvedValues[0];

      default:
        // Default case - return as string
        if (rawValue === '' || rawValue === 0) {
          return null;
        }
        return String(rawValue);
    }
  }

  /**
   * Resolve lookup entry ID to display value using LookupEntries
   */
  private resolveLookupValue(entryId: string, customField: ProjectOnlineCustomField): string | null {
    if (!customField.LookupEntries || !customField.LookupEntries.results) {
      return entryId; // Return raw value if no lookup entries available
    }

    const lookupEntry = customField.LookupEntries.results.find(
      (entry: any) => entry.InternalName === entryId
    );
    return lookupEntry ? lookupEntry.Value : entryId; // Return display value or fallback to raw ID
  }

  /**
   * Process custom fields by extracting unique fields and adding column type information
   * Creates mapping of entity custom field values and tracks empty fields
   */
  public customColumns(): { title: string; type: SmartsheetColumnType; width: number }[] {
    // 1. Call extractUniqueCustomFields method
    const uniqueCustomFields = this.extractUniqueCustomFields();
    
    // 2. Iterate through all objects and add columnType key-value pair
    const processedFields = uniqueCustomFields.map((customField) => {
      const columnType = CustomFieldHandler.determineCustomFieldColumnType(customField);
      
      return {
        ...customField,
        columnType
      };
    });
    
    // Store in variable for now, will be used later
    // TODO: Define what to do with processedFields
    
    // Map custom field values for each entity and get empty fields
    const {  emptyFields } = this.mapCustomFieldValues(processedFields);
    // Remove empty fields from processed fields
    const filteredProcessedFields = processedFields.filter(field => 
      !emptyFields.includes(field.InternalName)
    );
    
    // Create columns payload for Smartsheet
    this.extractNewColumns = filteredProcessedFields.map(field => ({
      title: field.Name,
      type: field.columnType,
      width: 150
    }));
    
    // Return only the columns payload
    return this.extractNewColumns;
  }

  /**
   * Create cell payload for custom fields using column name to ID mapping
   * @param columnMap - Mapping of column names to their IDs and types
   * @returns Object with entityId as key and array of cell objects as value
   */
  public cellPayload(columnMap: Record<string, { id: number; type: string }>): { [entityId: string]: Array<{ columnId: number; value?: any; objectValue?: any }> } {
    const result: { [entityId: string]: Array<{ columnId: number; value?: any; objectValue?: any }> } = {};
    
    // Get the processed fields and their mappings
    const uniqueCustomFields = this.extractUniqueCustomFields();
    const processedFields = uniqueCustomFields.map((customField) => {
      const columnType = CustomFieldHandler.determineCustomFieldColumnType(customField);
      return {
        ...customField,
        columnType
      };
    });
    
    // Get custom field values mapping
    const { taskCustomFieldValues, emptyFields } = this.mapCustomFieldValues(processedFields);
    
    // Filter out empty fields
    const filteredFields = processedFields.filter(field => 
      !emptyFields.includes(field.InternalName)
    );
    
    // Build cell payload for each entity
    for (const [entityId, fieldValues] of Object.entries(taskCustomFieldValues)) {
      const cells: Array<{ columnId: number; value?: any; objectValue?: any }> = [];
      
      // Process each non-empty custom field
      for (const field of filteredFields) {
        const columnInfo = columnMap[field.Name];
        if (!columnInfo) continue; // Skip if column doesn't exist in mapping
        
        const value = fieldValues[field.InternalName];
        if (value !== null && value !== undefined) {
          // Check if this is an object value (like MULTI_PICKLIST)
          if (typeof value === 'object' && value.objectType) {
            cells.push({
              columnId: columnInfo.id,
              objectValue: value
            });
          } else {
            cells.push({
              columnId: columnInfo.id,
              value: value
            });
          }
        }
      }
      
      result[entityId] = cells;
    }
    
    return result;
  }
}