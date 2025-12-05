import { SmartsheetClient } from '../types/SmartsheetClient';
import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
} from '../types/ProjectOnline';
import {
  ProjectTransformer,
  configureProjectPicklistColumns,
} from '../transformers/ProjectTransformer';
import { TaskTransformer } from '../transformers/TaskTransformer';
import { ResourceTransformer } from '../transformers/ResourceTransformer';
import { AssignmentTransformer } from '../transformers/AssignmentTransformer';
import {
  createPMOStandardsWorkspace,
  PMOStandardsWorkspaceInfo,
} from '../transformers/PMOStandardsTransformer';

export interface ImportOptions {
  source: string;
  destination: string;
  dryRun?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ProjectImportData {
  project: ProjectOnlineProject;
  tasks: ProjectOnlineTask[];
  resources: ProjectOnlineResource[];
  assignments: ProjectOnlineAssignment[];
}

export interface ImportResult {
  success: boolean;
  workspaceId?: number;
  workspaceName?: string;
  workspacePermalink?: string;
  projectsImported: number;
  tasksImported: number;
  resourcesImported: number;
  assignmentsImported: number;
  errors?: string[];
}

export class ProjectOnlineImporter {
  private smartsheetClient?: SmartsheetClient;
  private pmoStandardsWorkspace?: PMOStandardsWorkspaceInfo;

  /**
   * Initialize importer with Smartsheet client
   */
  constructor(client?: SmartsheetClient) {
    this.smartsheetClient = client;
  }

  /**
   * Set Smartsheet client (for dependency injection in tests)
   */
  setSmartsheetClient(client: SmartsheetClient): void {
    this.smartsheetClient = client;
  }

  /**
   * Import data from Project Online to Smartsheet
   */
  async import(options: ImportOptions): Promise<void> {
    if (!options.source) {
      throw new Error('Source URL is required');
    }

    if (!options.destination) {
      throw new Error('Destination ID is required');
    }

    // TODO: Implement actual import logic
    console.log(`Importing from ${options.source} to ${options.destination}`);

    if (options.dryRun) {
      console.log('(Dry run - no changes made)');
      return;
    }

    // Placeholder for actual implementation
    await this.performImport(options);
  }

  /**
   * Import a single project with its tasks, resources, and assignments
   * This is the main integration point for the ETL pipeline
   */
  async importProject(data: ProjectImportData): Promise<ImportResult> {
    if (!this.smartsheetClient) {
      throw new Error('Smartsheet client not initialized. Call setSmartsheetClient() first.');
    }

    try {
      console.log(`[PMO Standards] Initializing PMO Standards workspace...`);

      // Step 1: Ensure PMO Standards workspace exists (creates once, reuses for all projects)
      if (!this.pmoStandardsWorkspace) {
        this.pmoStandardsWorkspace = await this.getOrCreatePMOStandardsWorkspace();
        console.log(
          `[PMO Standards] ✓ PMO Standards workspace ready (ID: ${this.pmoStandardsWorkspace.workspaceId})`
        );
      }

      console.log(`[Project Import] Starting import for project: ${data.project.Name}`);

      // Step 2: Transform project and create workspace with 3 sheets
      const projectTransformer = new ProjectTransformer(this.smartsheetClient);
      const projectResult = await projectTransformer.transformProject(data.project);

      console.log(
        `[Project Import] ✓ Created workspace: ${projectResult.workspace.name} (ID: ${projectResult.workspace.id})`
      );

      // Step 3: Configure project summary sheet picklists (Status, Priority)
      await this.configureProjectPicklists(
        projectResult.sheets.summarySheet.id,
        this.pmoStandardsWorkspace
      );
      console.log(`[Project Import] ✓ Configured summary sheet picklists`);

      // Step 4: Transform tasks
      let tasksImported = 0;
      if (data.tasks.length > 0) {
        const taskTransformer = new TaskTransformer(this.smartsheetClient);
        const taskResult = await taskTransformer.transformTasks(
          data.tasks,
          projectResult.sheets.taskSheet.id
        );
        tasksImported = taskResult.rowsCreated;
        console.log(`[Project Import] ✓ Imported ${tasksImported} tasks`);

        // Step 5: Configure task sheet picklists (Status, Priority, Constraint Type)
        await this.configureTaskPicklists(
          projectResult.sheets.taskSheet.id,
          this.pmoStandardsWorkspace
        );
        console.log(`[Project Import] ✓ Configured task sheet picklists`);
      }

      // Step 6: Transform resources
      let resourcesImported = 0;
      if (data.resources.length > 0) {
        const resourceTransformer = new ResourceTransformer(this.smartsheetClient);
        const resourceResult = await resourceTransformer.transformResources(
          data.resources,
          projectResult.sheets.resourceSheet.id
        );
        resourcesImported = resourceResult.rowsCreated;
        console.log(`[Project Import] ✓ Imported ${resourcesImported} resources`);
      }

      // Step 7: Transform assignments (creates assignment columns on task sheet)
      let assignmentsImported = 0;
      if (data.assignments.length > 0 && data.resources.length > 0) {
        const assignmentTransformer = new AssignmentTransformer(this.smartsheetClient);
        const assignmentResult = await assignmentTransformer.transformAssignments(
          data.assignments,
          data.resources,
          projectResult.sheets.taskSheet.id
        );
        assignmentsImported = assignmentResult.columnsCreated;
        console.log(`[Project Import] ✓ Created ${assignmentsImported} assignment columns`);
      }

      console.log(`[Project Import] ✓ Import completed successfully`);

      return {
        success: true,
        workspaceId: projectResult.workspace.id,
        workspaceName: projectResult.workspace.name,
        workspacePermalink: projectResult.workspace.permalink,
        projectsImported: 1,
        tasksImported,
        resourcesImported,
        assignmentsImported,
      };
    } catch (error) {
      console.error(`[Project Import] ✗ Import failed:`, error);
      return {
        success: false,
        projectsImported: 0,
        tasksImported: 0,
        resourcesImported: 0,
        assignmentsImported: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Get or create PMO Standards workspace
   * This workspace is created once and reused across all project imports
   *
   * Checks PMO_STANDARDS_WORKSPACE_ID environment variable first.
   * If provided, uses existing workspace. Otherwise creates new one.
   */
  private async getOrCreatePMOStandardsWorkspace(): Promise<PMOStandardsWorkspaceInfo> {
    if (!this.smartsheetClient) {
      throw new Error('Smartsheet client not initialized');
    }

    // Check for existing workspace ID in environment
    const existingWorkspaceId = process.env.PMO_STANDARDS_WORKSPACE_ID;
    const workspaceIdNum = existingWorkspaceId ? parseInt(existingWorkspaceId, 10) : undefined;

    if (workspaceIdNum && !isNaN(workspaceIdNum)) {
      console.log(
        `[PMO Standards] Using existing workspace ID from environment: ${workspaceIdNum}`
      );
    } else if (existingWorkspaceId) {
      console.warn(
        `[PMO Standards] Invalid PMO_STANDARDS_WORKSPACE_ID: "${existingWorkspaceId}". Creating new workspace.`
      );
    }

    const pmoWorkspace = await createPMOStandardsWorkspace(
      this.smartsheetClient,
      workspaceIdNum && !isNaN(workspaceIdNum) ? workspaceIdNum : undefined
    );

    console.log(
      `[PMO Standards] PMO Standards workspace ready (ID: ${pmoWorkspace.workspaceId}) with ${Object.keys(pmoWorkspace.referenceSheets).length} reference sheets:`
    );
    for (const [name, info] of Object.entries(pmoWorkspace.referenceSheets)) {
      console.log(
        `[PMO Standards]   - ${name}: ${info.values.length} values (Sheet ID: ${info.sheetId})`
      );
    }

    return pmoWorkspace;
  }

  /**
   * Configure project summary sheet picklists to reference PMO Standards
   */
  private async configureProjectPicklists(
    summarySheetId: number,
    pmoStandards: PMOStandardsWorkspaceInfo
  ): Promise<void> {
    if (!this.smartsheetClient) {
      throw new Error('Smartsheet client not initialized');
    }

    // Get sheet to find Status and Priority column IDs
    const sheet = await this.smartsheetClient.sheets?.getSheet?.({ sheetId: summarySheetId });
    if (!sheet) {
      throw new Error(`Failed to get summary sheet ${summarySheetId}`);
    }

    const statusColumn = sheet.columns?.find((c) => c.title === 'Status');
    const priorityColumn = sheet.columns?.find((c) => c.title === 'Priority');

    if (!statusColumn?.id || !priorityColumn?.id) {
      throw new Error('Status or Priority column not found in summary sheet');
    }

    await configureProjectPicklistColumns(
      this.smartsheetClient,
      summarySheetId,
      statusColumn.id,
      priorityColumn.id,
      pmoStandards
    );
  }

  /**
   * Configure task sheet picklists to reference PMO Standards
   */
  private async configureTaskPicklists(
    taskSheetId: number,
    pmoStandards: PMOStandardsWorkspaceInfo
  ): Promise<void> {
    if (!this.smartsheetClient) {
      throw new Error('Smartsheet client not initialized');
    }

    // Get sheet to find column IDs
    const sheet = await this.smartsheetClient.sheets?.getSheet?.({ sheetId: taskSheetId });
    if (!sheet) {
      throw new Error(`Failed to get task sheet ${taskSheetId}`);
    }

    const statusColumn = sheet.columns?.find((c) => c.title === 'Status');
    const priorityColumn = sheet.columns?.find((c) => c.title === 'Priority');
    const constraintColumn = sheet.columns?.find((c) => c.title === 'Constraint Type');

    if (!statusColumn?.id || !priorityColumn?.id || !constraintColumn?.id) {
      throw new Error('Status, Priority, or Constraint Type column not found in task sheet');
    }

    // Import the configure function from TaskTransformer
    const { configureTaskPicklistColumns } = await import('../transformers/TaskTransformer');

    await configureTaskPicklistColumns(
      this.smartsheetClient,
      taskSheetId,
      statusColumn.id,
      priorityColumn.id,
      constraintColumn.id,
      pmoStandards
    );
  }

  /**
   * Validate Project Online data before import
   */
  async validate(source: string): Promise<ValidationResult> {
    if (!source) {
      return {
        valid: false,
        errors: ['Source URL is required'],
      };
    }

    // TODO: Implement actual validation logic
    console.log(`Validating source: ${source}`);

    // Placeholder validation
    const errors: string[] = [];

    if (!source.startsWith('http://') && !source.startsWith('https://')) {
      errors.push('Source must be a valid URL');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Perform the actual import operation
   */
  private async performImport(_options: ImportOptions): Promise<void> {
    // TODO: Implement actual import logic
    // This is a placeholder for the real implementation
    console.log('Performing import...');
  }
}
