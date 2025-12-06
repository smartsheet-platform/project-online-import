import { SmartsheetClient } from '../types/SmartsheetClient';
import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
} from '../types/ProjectOnline';
import { ProjectOnlineClient, ProjectOnlineClientConfig } from './ProjectOnlineClient';
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
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';
import { MultiStageProgressReporter } from '../util/ProgressReporter';

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
  private projectOnlineClient?: ProjectOnlineClient;
  private pmoStandardsWorkspace?: PMOStandardsWorkspaceInfo;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  /**
   * Initialize importer with Smartsheet client
   */
  constructor(client?: SmartsheetClient, logger?: Logger, errorHandler?: ErrorHandler) {
    this.smartsheetClient = client;
    this.logger = logger ?? new Logger();
    this.errorHandler = errorHandler ?? new ErrorHandler(this.logger);
  }

  /**
   * Set Smartsheet client (for dependency injection in tests)
   */
  setSmartsheetClient(client: SmartsheetClient): void {
    this.smartsheetClient = client;
  }

  /**
   * Set Project Online client (for dependency injection in tests)
   */
  setProjectOnlineClient(client: ProjectOnlineClient): void {
    this.projectOnlineClient = client;
  }

  /**
   * Initialize Project Online client from configuration
   */
  private initializeProjectOnlineClient(): void {
    if (this.projectOnlineClient) {
      return; // Already initialized (e.g., for testing)
    }

    // Read configuration from environment
    const config: ProjectOnlineClientConfig = {
      tenantId: process.env.TENANT_ID || '',
      clientId: process.env.CLIENT_ID || '',
      clientSecret: process.env.CLIENT_SECRET || '',
      projectOnlineUrl: process.env.PROJECT_ONLINE_URL || '',
    };

    this.projectOnlineClient = new ProjectOnlineClient(config, this.logger);
  }

  /**
   * Import data from Project Online to Smartsheet
   */
  async import(options: ImportOptions): Promise<void> {
    if (!options.source) {
      throw ErrorHandler.validationError('source', 'a valid Project Online project ID (GUID)');
    }

    if (!options.destination) {
      throw ErrorHandler.validationError('destination', 'a valid Smartsheet destination ID');
    }

    this.logger.info(`📥 Source: Project Online project ${options.source}`);
    this.logger.info(`📤 Destination: Smartsheet workspace ${options.destination}`);

    if (options.dryRun) {
      this.logger.warn('\n🚨 Dry run mode - no changes will be made\n');
      this.logger.info('In dry-run mode, the tool will:');
      this.logger.info('  • Validate configuration');
      this.logger.info('  • Connect to Project Online');
      this.logger.info('  • Extract project data');
      this.logger.info('  • Process data transformations');
      this.logger.info('  • Skip all Smartsheet write operations\n');
      
      // Initialize clients
      this.initializeProjectOnlineClient();
      
      // Test connection
      this.logger.info('Testing Project Online connection...');
      const connected = await this.projectOnlineClient!.testConnection();
      if (!connected) {
        throw ErrorHandler.connectionError('Failed to connect to Project Online');
      }
      
      // Extract data
      this.logger.info(`\nExtracting data for project ${options.source}...`);
      const data = await this.projectOnlineClient!.extractProjectData(options.source);
      
      this.logger.success(`\n✅ Dry run completed successfully!`);
      this.logger.info(`   Project: ${data.project.Name}`);
      this.logger.info(`   Tasks: ${data.tasks.length}`);
      this.logger.info(`   Resources: ${data.resources.length}`);
      this.logger.info(`   Assignments: ${data.assignments.length}\n`);
      return;
    }

    // Initialize clients
    this.initializeProjectOnlineClient();

    // Extract data from Project Online
    this.logger.info('\n📥 Extracting data from Project Online...\n');
    const data = await this.projectOnlineClient!.extractProjectData(options.source);

    // Import the extracted data
    await this.importProject({
      project: data.project,
      tasks: data.tasks,
      resources: data.resources,
      assignments: data.assignments,
    });
  }

  /**
   * Import a single project with its tasks, resources, and assignments
   * This is the main integration point for the ETL pipeline
   */
  async importProject(data: ProjectImportData): Promise<ImportResult> {
    if (!this.smartsheetClient) {
      throw ErrorHandler.configError(
        'Smartsheet client',
        'not initialized. Call setSmartsheetClient() first.'
      );
    }

    // Initialize progress reporter
    const progress = new MultiStageProgressReporter(this.logger);

    // Define stages based on what data we have
    const stages: { name: string; total: number }[] = [
      { name: 'PMO Standards Setup', total: 1 },
      { name: 'Project Workspace Creation', total: 1 },
      { name: 'Summary Sheet Configuration', total: 1 },
    ];

    if (data.tasks.length > 0) {
      stages.push({ name: 'Task Import', total: data.tasks.length });
      stages.push({ name: 'Task Sheet Configuration', total: 1 });
    }

    if (data.resources.length > 0) {
      stages.push({ name: 'Resource Import', total: data.resources.length });
    }

    if (data.assignments.length > 0 && data.resources.length > 0) {
      stages.push({ name: 'Assignment Column Creation', total: data.assignments.length });
    }

    progress.defineStages(stages);

    try {
      this.logger.info(`\n📦 Starting import for project: ${data.project.Name}\n`);

      // Step 1: Ensure PMO Standards workspace exists
      progress.startStage('PMO Standards Setup');
      if (!this.pmoStandardsWorkspace) {
        this.pmoStandardsWorkspace = await this.getOrCreatePMOStandardsWorkspace();
      }
      progress.completeStage(`Workspace ID: ${this.pmoStandardsWorkspace.workspaceId}`);

      // Step 2: Transform project and create workspace with 3 sheets
      progress.startStage('Project Workspace Creation');
      const projectTransformer = new ProjectTransformer(this.smartsheetClient);
      const projectResult = await projectTransformer.transformProject(data.project);
      progress.completeStage(`${projectResult.workspace.name} (ID: ${projectResult.workspace.id})`);

      // Step 3: Configure project summary sheet picklists
      progress.startStage('Summary Sheet Configuration');
      await this.configureProjectPicklists(
        projectResult.sheets.summarySheet.id,
        this.pmoStandardsWorkspace
      );
      progress.completeStage('Status and Priority picklists configured');

      // Step 4: Transform tasks
      let tasksImported = 0;
      if (data.tasks.length > 0) {
        progress.startStage('Task Import');
        const taskTransformer = new TaskTransformer(this.smartsheetClient, this.logger);
        const taskResult = await taskTransformer.transformTasks(
          data.tasks,
          projectResult.sheets.taskSheet.id
        );
        tasksImported = taskResult.rowsCreated;
        progress.completeStage(`${tasksImported} tasks imported`);

        // Step 5: Configure task sheet picklists
        progress.startStage('Task Sheet Configuration');
        await this.configureTaskPicklists(
          projectResult.sheets.taskSheet.id,
          this.pmoStandardsWorkspace
        );
        progress.completeStage('Status, Priority, and Constraint picklists configured');
      }

      // Step 6: Transform resources
      let resourcesImported = 0;
      if (data.resources.length > 0) {
        progress.startStage('Resource Import');
        const resourceTransformer = new ResourceTransformer(this.smartsheetClient);
        const resourceResult = await resourceTransformer.transformResources(
          data.resources,
          projectResult.sheets.resourceSheet.id
        );
        resourcesImported = resourceResult.rowsCreated;
        progress.completeStage(`${resourcesImported} resources imported`);
      }

      // Step 7: Transform assignments
      let assignmentsImported = 0;
      if (data.assignments.length > 0 && data.resources.length > 0) {
        progress.startStage('Assignment Column Creation');
        const assignmentTransformer = new AssignmentTransformer(this.smartsheetClient, this.logger);
        const assignmentResult = await assignmentTransformer.transformAssignments(
          data.assignments,
          data.resources,
          projectResult.sheets.taskSheet.id
        );
        assignmentsImported = assignmentResult.columnsCreated;
        progress.completeStage(`${assignmentsImported} assignment columns created`);
      }

      // Print summary
      progress.printSummary();

      this.logger.success(`\n✅ Import completed successfully!`);
      this.logger.info(`   Workspace: ${projectResult.workspace.permalink}\n`);

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
      this.errorHandler.handle(error, 'Project Import');
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
      throw ErrorHandler.configError('Smartsheet client', 'not initialized');
    }

    // Check for existing workspace ID in environment
    const existingWorkspaceId = process.env.PMO_STANDARDS_WORKSPACE_ID;
    const workspaceIdNum = existingWorkspaceId ? parseInt(existingWorkspaceId, 10) : undefined;

    if (workspaceIdNum && !isNaN(workspaceIdNum)) {
      this.logger.debug(`Using existing PMO Standards workspace: ${workspaceIdNum}`);
    } else if (existingWorkspaceId) {
      this.logger.warn(
        `Invalid PMO_STANDARDS_WORKSPACE_ID: "${existingWorkspaceId}". Creating new workspace.`
      );
    }

    const pmoWorkspace = await createPMOStandardsWorkspace(
      this.smartsheetClient,
      workspaceIdNum && !isNaN(workspaceIdNum) ? workspaceIdNum : undefined,
      this.logger
    );

    this.logger.debug(
      `PMO Standards workspace ready (ID: ${pmoWorkspace.workspaceId}) ` +
        `with ${Object.keys(pmoWorkspace.referenceSheets).length} reference sheets`
    );

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
      throw ErrorHandler.configError('Smartsheet client', 'not initialized');
    }

    // Get sheet to find Status and Priority column IDs
    const sheetResponse = await this.smartsheetClient.sheets?.getSheet?.({ sheetId: summarySheetId });
    const sheet = sheetResponse?.data || sheetResponse?.result;
    if (!sheet) {
      throw ErrorHandler.dataError(
        `Failed to get summary sheet ${summarySheetId}`,
        'Verify the sheet exists and your API token has access to it'
      );
    }

    const statusColumn = sheet.columns?.find((c: any) => c.title === 'Status');
    const priorityColumn = sheet.columns?.find((c: any) => c.title === 'Priority');

    if (!statusColumn?.id || !priorityColumn?.id) {
      throw ErrorHandler.dataError(
        'Status or Priority column not found in summary sheet',
        'Ensure the project transformer created all required columns'
      );
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
      throw ErrorHandler.configError('Smartsheet client', 'not initialized');
    }

    // Get sheet to find column IDs
    const sheetResponse = await this.smartsheetClient.sheets?.getSheet?.({ sheetId: taskSheetId });
    const sheet = sheetResponse?.data || sheetResponse?.result;
    if (!sheet) {
      throw ErrorHandler.dataError(
        `Failed to get task sheet ${taskSheetId}`,
        'Verify the sheet exists and your API token has access to it'
      );
    }

    const statusColumn = sheet.columns?.find((c: any) => c.title === 'Status');
    const priorityColumn = sheet.columns?.find((c: any) => c.title === 'Priority');
    const constraintColumn = sheet.columns?.find((c: any) => c.title === 'Constraint Type');

    if (!statusColumn?.id || !priorityColumn?.id || !constraintColumn?.id) {
      throw ErrorHandler.dataError(
        'Status, Priority, or Constraint Type column not found in task sheet',
        'Ensure the task transformer created all required columns'
      );
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
    const errors: string[] = [];

    this.logger.info(`Validating source: ${source}\n`);

    // Validate source is a GUID
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!source) {
      errors.push('Source project ID is required');
    } else if (!guidPattern.test(source)) {
      errors.push('Source must be a valid Project Online project ID (GUID format)');
    } else {
      this.logger.success('✓ Project ID format is valid');
    }

    // Check Project Online configuration
    const poConfig = {
      tenantId: process.env.TENANT_ID,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      projectOnlineUrl: process.env.PROJECT_ONLINE_URL,
    };

    if (!poConfig.tenantId) {
      errors.push('TENANT_ID environment variable is not set');
    } else {
      this.logger.success('✓ Azure AD Tenant ID is configured');
    }

    if (!poConfig.clientId) {
      errors.push('CLIENT_ID environment variable is not set');
    } else {
      this.logger.success('✓ Azure AD Client ID is configured');
    }

    if (!poConfig.clientSecret) {
      errors.push('CLIENT_SECRET environment variable is not set');
    } else {
      this.logger.success('✓ Azure AD Client Secret is configured');
    }

    if (!poConfig.projectOnlineUrl) {
      errors.push('PROJECT_ONLINE_URL environment variable is not set');
    } else {
      this.logger.success('✓ Project Online URL is configured');
    }

    // Check Smartsheet configuration
    if (!process.env.SMARTSHEET_API_TOKEN) {
      errors.push('SMARTSHEET_API_TOKEN environment variable is not set');
    } else {
      this.logger.success('✓ Smartsheet API token is configured');
    }

    // If all config is present, test connectivity
    if (errors.length === 0) {
      try {
        this.logger.info('\n🔌 Testing Project Online connection...');
        this.initializeProjectOnlineClient();
        const connected = await this.projectOnlineClient!.testConnection();
        
        if (!connected) {
          errors.push('Failed to connect to Project Online');
        }
      } catch (error) {
        errors.push(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
