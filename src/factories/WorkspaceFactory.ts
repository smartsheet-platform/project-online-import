/**
 * Factory interface for creating Smartsheet workspaces
 *
 * This interface defines the contract for workspace creation strategies.
 * Different implementations support different solution types:
 * - StandaloneWorkspaces: Creates independent PMO Standards and project workspaces
 * - Portfolio: Creates workspaces within a portfolio structure (future)
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetWorkspace } from '../types/Smartsheet';
import { ProjectOnlineProject } from '../types/ProjectOnline';
import { Logger } from '../util/Logger';

/**
 * Reference sheet metadata returned after creation
 */
export interface ReferenceSheetInfo {
  sheetId: number;
  sheetName: string;
  columnId: number;
  type: 'standard' | 'discovered';
  values: string[];
}

/**
 * PMO Standards workspace metadata
 * Contains centralized reference sheets for picklist values
 */
export interface PMOStandardsWorkspaceInfo {
  workspaceId: number;
  workspaceName: string;
  permalink: string;
  referenceSheets: Record<string, ReferenceSheetInfo>;
}

/**
 * Project workspace creation result
 * Contains the workspace and its three required sheets
 */
export interface ProjectWorkspaceResult {
  workspace: SmartsheetWorkspace;
  sheets: {
    summarySheet: { id: number; name: string };
    taskSheet: { id: number; name: string };
    resourceSheet: { id: number; name: string };
  };
}

/**
 * Factory interface for creating Smartsheet workspaces
 *
 * Implementations must provide methods to:
 * 1. Create or retrieve PMO Standards workspace
 * 2. Create project workspaces with required sheets
 */
export interface WorkspaceFactory {
  /**
   * Create or get the PMO Standards workspace
   *
   * The PMO Standards workspace contains reference sheets that provide
   * picklist values for project and task sheets. This workspace is shared
   * across all project imports.
   *
   * @param client - Smartsheet client instance for API operations
   * @param existingWorkspaceId - Optional existing workspace ID to reuse
   * @param logger - Optional logger for debug output
   * @returns Promise resolving to PMO Standards workspace information
   * @throws Error if workspace creation fails or workspace doesn't exist
   */
  createStandardsWorkspace(
    client: SmartsheetClient,
    existingWorkspaceId?: number,
    logger?: Logger
  ): Promise<PMOStandardsWorkspaceInfo>;

  /**
   * Create a project workspace with required sheets
   *
   * Creates a new Smartsheet workspace for a Project Online project
   * with three required sheets:
   * - Summary sheet: Single-row project metadata
   * - Task sheet: Multi-row task details
   * - Resource sheet: Resource allocation information
   *
   * @param client - Smartsheet client instance for API operations
   * @param project - Project Online project data to transform
   * @param configManager - Configuration manager for template workspace ID
   * @param workspaceId - Optional existing workspace ID (primarily for testing)
   * @returns Promise resolving to workspace and sheet information
   * @throws Error if workspace creation fails or required data is invalid
   */
  createProjectWorkspace(
    client: SmartsheetClient,
    project: ProjectOnlineProject,
    configManager?: any, // ConfigManager - avoiding circular dependency
    workspaceId?: number
  ): Promise<ProjectWorkspaceResult>;
}
