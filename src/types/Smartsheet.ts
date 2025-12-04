/**
 * Type definitions for Smartsheet SDK entities
 * Simplified types focusing on what we need for transformation
 */

/**
 * Smartsheet Workspace
 */
export interface SmartsheetWorkspace {
  id?: number;
  name: string;
  accessLevel?: string;
  permalink?: string;
}

/**
 * Smartsheet Sheet
 */
export interface SmartsheetSheet {
  id?: number;
  name: string;
  columns?: SmartsheetColumn[];
  rows?: SmartsheetRow[];
  accessLevel?: string;
  permalink?: string;
}

/**
 * Smartsheet Column Types
 */
export type SmartsheetColumnType =
  | 'TEXT_NUMBER'
  | 'CONTACT_LIST'
  | 'MULTI_CONTACT_LIST'
  | 'DATE'
  | 'PICKLIST'
  | 'MULTI_PICKLIST'
  | 'CHECKBOX'
  | 'PREDECESSOR'
  | 'DURATION'
  | 'AUTO_NUMBER'
  | 'CREATED_DATE'
  | 'MODIFIED_DATE'
  | 'CREATED_BY'
  | 'MODIFIED_BY';

/**
 * Contact Options for MULTI_CONTACT_LIST columns
 */
export interface SmartsheetContactOptions {
  sheetId: number;
  columnId: number;
}

/**
 * Smartsheet Column
 */
export interface SmartsheetColumn {
  id?: number;
  title: string;
  type: SmartsheetColumnType;
  primary?: boolean;
  locked?: boolean;
  hidden?: boolean;
  width?: number;
  options?: SmartsheetColumnOptions;
  contactOptions?: SmartsheetContactOptions[];
  validation?: boolean;
  format?: string;
  symbol?: string;
  systemColumnType?: string;
}

/**
 * Smartsheet Cell Link for cross-sheet picklist references
 */
export interface SmartsheetCellLinkValue {
  objectType: 'CELL_LINK';
  sheetId: number;
  columnId: number;
}

/**
 * Smartsheet Picklist Option (for sheet-sourced picklists)
 */
export interface SmartsheetPicklistOption {
  value: SmartsheetCellLinkValue;
}

/**
 * Smartsheet Column Options Configuration
 */
export interface SmartsheetColumnOptions {
  strict?: boolean;
  options?: string[] | SmartsheetPicklistOption[];
}

/**
 * Smartsheet Row
 */
export interface SmartsheetRow {
  id?: number;
  sheetId?: number;
  rowNumber?: number;
  expanded?: boolean;
  parentId?: number;
  indent?: number;
  cells?: SmartsheetCell[];
  toTop?: boolean;
  toBottom?: boolean;
  parentRowId?: number;
  siblingId?: number;
}

/**
 * Smartsheet Cell
 */
export interface SmartsheetCell {
  columnId: number;
  value?: string | number | boolean;
  displayValue?: string;
  objectValue?: SmartsheetObjectValue;
  strict?: boolean;
  hyperlink?: SmartsheetHyperlink;
  linkInFromCell?: SmartsheetCellLink;
}

/**
 * Smartsheet Contact Object
 */
export interface SmartsheetContact {
  name?: string;
  email?: string;
}

/**
 * Smartsheet Multi-Contact Object
 */
export interface SmartsheetMultiContact {
  objectType: 'MULTI_CONTACT';
  values: SmartsheetContact[];
}

/**
 * Smartsheet Multi-Picklist Object
 */
export interface SmartsheetMultiPicklist {
  objectType: 'MULTI_PICKLIST';
  values: string[];
}

/**
 * Smartsheet Object Value (for CONTACT_LIST, MULTI_CONTACT_LIST, MULTI_PICKLIST)
 */
export type SmartsheetObjectValue =
  | SmartsheetContact
  | SmartsheetMultiContact
  | SmartsheetMultiPicklist;

/**
 * Smartsheet Hyperlink
 */
export interface SmartsheetHyperlink {
  url: string;
}

/**
 * Smartsheet Cell Link
 */
export interface SmartsheetCellLink {
  sheetId: number;
  rowId: number;
  columnId: number;
}

/**
 * Project Sheet Settings (for Gantt-enabled sheets)
 */
export interface ProjectSheetSettings {
  workingDays?: string[];
  nonWorkingDays?: string[];
  projectSettings?: {
    workingDays?: string[];
    nonWorkingDays?: string[];
    lengthOfDay?: number;
  };
}
