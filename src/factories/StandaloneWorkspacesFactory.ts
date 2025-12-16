/**
 * StandaloneWorkspacesFactory - Default workspace creation strategy
 *
 * Creates independent PMO Standards workspace and individual project workspaces.
 * This is the original implementation extracted from PMOStandardsTransformer
 * and ProjectTransformer.
 */

import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetSheet, SmartsheetRow, SmartsheetWorkspace } from '../types/Smartsheet';
import { ProjectOnlineProject } from '../types/ProjectOnline';
import { Logger } from '../util/Logger';
import { ConfigManager } from '../util/ConfigManager';
import {
  WorkspaceFactory,
  PMOStandardsWorkspaceInfo,
  ProjectWorkspaceResult,
  ReferenceSheetInfo,
} from './WorkspaceFactory';
import { sanitizeWorkspaceName, createSheetName } from '../transformers/utils';
import { getOrCreateSheet, copyWorkspace, addColumnsIfNotExist } from '../util/SmartsheetHelpers';
import { createProjectSummaryColumns, validateProject } from '../transformers/ProjectTransformer';
import { tryWith as withBackoff } from '../util/ExponentialBackoff';

/**
 * Standard reference sheets with predefined values
 * These are created in the PMO Standards workspace
 */
const STANDARD_REFERENCE_SHEETS: Record<string, string[]> = {
  'Project - Status': ['Active', 'Planning', 'Completed', 'On Hold', 'Cancelled'],
  'Project - Priority': ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'],
  'Task - Status': ['Not Started', 'In Progress', 'Complete'],
  'Task - Priority': ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'],
  'Task - Constraint Type': ['ASAP', 'ALAP', 'SNET', 'SNLT', 'FNET', 'FNLT', 'MSO', 'MFO'],
  'Resource - Type': ['Work', 'Material', 'Cost'],
};

/**
 * StandaloneWorkspacesFactory implementation
 * Creates workspaces independently without portfolio structure
 */
export class StandaloneWorkspacesFactory implements WorkspaceFactory {
  /**
   * Create or get existing PMO Standards workspace with all standard reference sheets
   */
  async createStandardsWorkspace(
    client: SmartsheetClient,
    existingWorkspaceId?: number,
    logger?: Logger
  ): Promise<PMOStandardsWorkspaceInfo> {
    let workspace;

    if (existingWorkspaceId) {
      // Use existing workspace - wrap in retry logic for eventual consistency
      logger?.debug(`Using existing PMO Standards workspace ID: ${existingWorkspaceId}`);
      if (!client.workspaces?.getWorkspace) {
        throw new Error('SmartsheetClient does not support getWorkspace');
      }
      const getWorkspace = client.workspaces.getWorkspace;
      const workspaceResponse = await withBackoff(
        () => getWorkspace({
          workspaceId: existingWorkspaceId,
        })
      );
      workspace = workspaceResponse.data || workspaceResponse.result;
      if (!workspace) {
        throw new Error(`Workspace ${existingWorkspaceId} not found`);
      }
    } else {
      // Create new workspace - wrap with retry for API resilience
      logger?.debug(`Creating new PMO Standards workspace`);
      if (!client.workspaces?.createWorkspace) {
        throw new Error('SmartsheetClient does not support createWorkspace');
      }
      const createWorkspace = client.workspaces.createWorkspace;
      const workspaceResponse = await withBackoff(
        () => createWorkspace({
          body: {
            name: 'PMO Standards',
          },
        })
      );
      workspace = workspaceResponse.data || workspaceResponse.result;
      if (!workspace) {
        throw new Error('Failed to create PMO Standards workspace');
      }
    }

    // Ensure all standard reference sheets exist
    const referenceSheets: Record<string, ReferenceSheetInfo> = {};

    for (const [sheetName, values] of Object.entries(STANDARD_REFERENCE_SHEETS)) {
      const sheetInfo = await this.ensureStandardReferenceSheet(
        client,
        workspace.id!,
        sheetName,
        values,
        logger
      );
      referenceSheets[sheetName] = sheetInfo;
    }

    return {
      workspaceId: workspace.id!,
      workspaceName: workspace.name,
      permalink: workspace.permalink || '',
      referenceSheets,
    };
  }

  /**
   * Create a project workspace with three required sheets
   */
  async createProjectWorkspace(
    client: SmartsheetClient,
    project: ProjectOnlineProject,
    configManager?: ConfigManager,
    workspaceId?: number
  ): Promise<ProjectWorkspaceResult> {
    // Validate project
    const validation = validateProject(project);
    if (!validation.valid) {
      throw new Error(`Invalid project: ${validation.errors.join(', ')}`);
    }

    // Transform to workspace structure
    const workspace: SmartsheetWorkspace = {
      name: sanitizeWorkspaceName(project.Name),
    };

    // Get template workspace ID from config if available
    // IMPORTANT: Only use template if explicitly provided via configManager
    // Do NOT fall back to environment variables to avoid test interference
    const templateWorkspaceId = configManager ? configManager.get().templateWorkspaceId : undefined;

    // Create or use existing workspace
    if (!workspaceId) {
      let newWorkspace: { id: number; permalink?: string };

      if (templateWorkspaceId && templateWorkspaceId > 0) {
        // Use template workspace if configured and valid
        try {
          newWorkspace = await copyWorkspace(client, templateWorkspaceId, workspace.name);
        } catch (error) {
          // If template copy fails, fall back to blank workspace creation
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to copy template workspace ${templateWorkspaceId}: ${errorMessage}. ` +
              `Ensure the template workspace exists and is accessible.`
          );
        }
      } else {
        // Create blank workspace if no template configured - wrap with retry for API resilience
        if (!client.workspaces?.createWorkspace) {
          throw new Error('Smartsheet client does not support workspace creation');
        }
        const createWorkspace = client.workspaces.createWorkspace;
        const created = await withBackoff(
          () => createWorkspace({
            body: {
              name: workspace.name,
            },
          })
        );
        const createdData = created?.result || created?.data;
        if (!createdData?.id) {
          throw new Error('Failed to create workspace - no ID returned');
        }
        newWorkspace = { id: createdData.id, permalink: createdData.permalink };
      }
      workspace.id = newWorkspace.id;
      workspace.permalink = newWorkspace.permalink;

      // Create the three sheets in the new workspace
      const summarySheet = await this.createSummarySheet(client, workspace.id, workspace.name);
      const taskSheet = await this.createTaskSheet(client, workspace.id, workspace.name);
      const resourceSheet = await this.createResourceSheet(client, workspace.id, workspace.name);

      return {
        workspace,
        sheets: {
          summarySheet,
          taskSheet,
          resourceSheet,
        },
      };
    }

    // If workspaceId provided (for testing), use it
    workspace.id = workspaceId;

    const summarySheet = await this.createSummarySheet(client, workspaceId, workspace.name);
    const taskSheet = await this.createTaskSheet(client, workspaceId, workspace.name);
    const resourceSheet = await this.createResourceSheet(client, workspaceId, workspace.name);

    return {
      workspace: { ...workspace, id: workspaceId },
      sheets: {
        summarySheet,
        taskSheet,
        resourceSheet,
      },
    };
  }

  /**
   * Create summary sheet with all required columns
   */
  private async createSummarySheet(
    client: SmartsheetClient,
    workspaceId: number,
    workspaceName: string
  ): Promise<{ id: number; name: string }> {
    const sheetName = createSheetName(workspaceName, 'Summary');

    // Create sheet with primary column
    const sheet = await getOrCreateSheet(client, workspaceId, {
      name: sheetName,
      columns: [
        {
          title: 'Project Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    });

    if (!sheet?.id) {
      throw new Error('Failed to create summary sheet');
    }

    // Add remaining columns (filter out system columns and primary column)
    const allColumns = createProjectSummaryColumns();
    const systemColumnTypes = ['CREATED_DATE', 'MODIFIED_DATE', 'CREATED_BY', 'MODIFIED_BY'];
    const columnsToAdd = allColumns
      .filter((col) => !systemColumnTypes.includes(col.type || ''))
      .filter((col) => col.title !== 'Project Name');

    await addColumnsIfNotExist(client, sheet.id, columnsToAdd);

    return {
      id: sheet.id,
      name: sheet.name!,
    };
  }

  /**
   * Create task sheet with primary column
   */
  private async createTaskSheet(
    client: SmartsheetClient,
    workspaceId: number,
    workspaceName: string
  ): Promise<{ id: number; name: string }> {
    const sheetName = createSheetName(workspaceName, 'Tasks');

    const sheet = await getOrCreateSheet(client, workspaceId, {
      name: sheetName,
      columns: [
        {
          title: 'Task Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    });

    if (!sheet?.id) {
      throw new Error('Failed to create task sheet');
    }

    return {
      id: sheet.id,
      name: sheet.name!,
    };
  }

  /**
   * Create resource sheet with primary column
   */
  private async createResourceSheet(
    client: SmartsheetClient,
    workspaceId: number,
    workspaceName: string
  ): Promise<{ id: number; name: string }> {
    const sheetName = createSheetName(workspaceName, 'Resources');

    const sheet = await getOrCreateSheet(client, workspaceId, {
      name: sheetName,
      columns: [
        {
          title: 'Resource Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    });

    if (!sheet?.id) {
      throw new Error('Failed to create resource sheet');
    }

    return {
      id: sheet.id,
      name: sheet.name!,
    };
  }

  /**
   * Create or verify a standard reference sheet with predefined values
   * Idempotent: checks if sheet exists, checks if values exist before adding
   */
  private async ensureStandardReferenceSheet(
    client: SmartsheetClient,
    workspaceId: number,
    sheetName: string,
    predefinedValues: string[],
    logger?: Logger
  ): Promise<ReferenceSheetInfo> {
    // Check if sheet already exists in workspace
    const existingSheet = await this.findSheetInWorkspace(client, workspaceId, sheetName);

    if (existingSheet) {
      logger?.debug(`Found existing PMO Standards sheet: ${sheetName} (ID: ${existingSheet.id})`);

      // Find the Name column (should be primary column)
      const nameColumn = existingSheet.columns?.find((c) => c.title === 'Name' || c.primary);
      if (!nameColumn?.id) {
        throw new Error(`Name column not found in existing sheet: ${sheetName}`);
      }

      // Get existing rows to check which values are already present - wrap in retry for eventual consistency
      if (!client.sheets?.getSheet) {
        throw new Error('SmartsheetClient does not support getSheet');
      }
      const getSheet = client.sheets.getSheet;
      const existingSheetResponse = await withBackoff(
        () => getSheet({ id: existingSheet.id! })
      );
      const existingSheetData = existingSheetResponse?.data || existingSheetResponse?.result;
      const existingValues = new Set<string>();
      if (existingSheetData?.rows) {
        for (const row of existingSheetData.rows) {
          const nameCell = row.cells?.find((c: any) => c.columnId === nameColumn.id);
          if (nameCell?.value) {
            existingValues.add(String(nameCell.value));
          }
        }
      }

      // Add missing values
      const missingValues = predefinedValues.filter((v) => !existingValues.has(v));
      if (missingValues.length > 0) {
        logger?.debug(
          `Adding ${missingValues.length} missing values to ${sheetName}: ${missingValues.join(', ')}`
        );
        const rows: SmartsheetRow[] = missingValues.map((value) => ({
          toBottom: true,
          cells: [
            {
              columnId: nameColumn.id!,
              value,
            },
          ],
        }));

        if (!client.sheets?.addRows) {
          throw new Error('SmartsheetClient does not support addRows');
        }
        const addRows = client.sheets.addRows;
        await withBackoff(
          () => addRows({
            sheetId: existingSheet.id!,
            body: rows,
          })
        );
      } else {
        logger?.debug(`All ${predefinedValues.length} values already present in ${sheetName}`);
      }

      return {
        sheetId: existingSheet.id!,
        sheetName: existingSheet.name,
        columnId: nameColumn.id,
        type: 'standard',
        values: predefinedValues,
      };
    }

    // Sheet doesn't exist, create it
    logger?.debug(
      `Creating new PMO Standards sheet: ${sheetName} with ${predefinedValues.length} values`
    );
    const sheet: SmartsheetSheet = {
      name: sheetName,
      columns: [
        {
          title: 'Name',
          type: 'TEXT_NUMBER',
          primary: true,
        },
      ],
    };

    if (!client.sheets?.createSheetInWorkspace) {
      throw new Error('SmartsheetClient does not support createSheetInWorkspace');
    }
    const createSheetInWorkspace = client.sheets.createSheetInWorkspace;
    const createSheetResponse = await withBackoff(
      () => createSheetInWorkspace({
        workspaceId,
        body: sheet,
      })
    );
    const createdSheet = createSheetResponse.data || createSheetResponse.result;
    if (!createdSheet) {
      throw new Error(`Failed to create sheet: ${sheetName}`);
    }
    const nameColumnId = createdSheet.columns![0].id!;

    // Add all predefined values as rows
    const rows: SmartsheetRow[] = predefinedValues.map((value) => ({
      toBottom: true,
      cells: [
        {
          columnId: nameColumnId,
          value,
        },
      ],
    }));

    if (!client.sheets?.addRows) {
      throw new Error('SmartsheetClient does not support addRows');
    }
    const addRows = client.sheets.addRows;
    await withBackoff(
      () => addRows({
        sheetId: createdSheet.id!,
        body: rows,
      })
    );

    return {
      sheetId: createdSheet.id!,
      sheetName: createdSheet.name,
      columnId: nameColumnId,
      type: 'standard',
      values: predefinedValues,
    };
  }

  /**
   * Find a sheet in a workspace by name
   *
   * IMPORTANT: Wrapped with retry logic to handle Smartsheet's eventual consistency.
   * After workspace or sheet creation, there can be brief periods where getWorkspaceChildren
   * returns 404 until the platform's consistency propagation completes.
   */
  private async findSheetInWorkspace(
    client: SmartsheetClient,
    workspaceId: number,
    sheetName: string
  ): Promise<SmartsheetSheet | undefined> {
    if (!client.workspaces?.getWorkspaceChildren) {
      throw new Error('SmartsheetClient does not support getWorkspaceChildren');
    }

    const getWorkspaceChildren = client.workspaces.getWorkspaceChildren;
    const childrenResponse = await withBackoff(
      () => getWorkspaceChildren({
        workspaceId,
        queryParameters: { includeAll: true },
      })
    );
    const children = childrenResponse?.data || [];

    // Filter for sheets and find by name
    const sheets = children.filter((item: any) => item.resourceType === 'sheet');
    const sheet = sheets.find((s: any) => s.name === sheetName);

    return sheet as SmartsheetSheet | undefined;
  }
}
