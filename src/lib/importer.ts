import { SmartsheetClient } from '../types/SmartsheetClient';
import { SmartsheetColumn } from '../types/Smartsheet';
import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
} from '../types/ProjectOnline';
import { ProjectOnlineClient, ProjectOnlineClientConfig } from './ProjectOnlineClient';
import { configureProjectPicklistColumns, populateProjectSummary } from '../transformers/ProjectTransformer';
import { TaskTransformer } from '../transformers/TaskTransformer';
import { ResourceTransformer } from '../transformers/ResourceTransformer';
import { PMOStandardsWorkspaceInfo } from '../transformers/PMOStandardsTransformer';
import { WorkspaceFactory, WorkspaceFactoryProvider } from '../factories';
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';
import { MultiStageProgressReporter } from '../util/ProgressReporter';
import { ConfigManager } from '../util/ConfigManager';
import { tryWith as withBackoff } from '../util/ExponentialBackoff';

export interface ImportOptions {
  source: string;
  destination: string;
  dryRun?: boolean;
}

export interface BulkImportOptions {
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

export interface BulkImportResult {
  totalProjects: number;
  successfulImports: number;
  failedImports: number;
  results: ImportResult[];
  projectWorkspaceMapping: Array<{
    projectName: string;
    projectId: string;
    workspaceName?: string;
    workspaceId?: number;
    workspacePermalink?: string;
    success: boolean;
    error?: string;
  }>;
  errors?: string[];
}

export class ProjectOnlineImporter {
  private smartsheetClient?: SmartsheetClient;
  private projectOnlineClient?: ProjectOnlineClient;
  private pmoStandardsWorkspace?: PMOStandardsWorkspaceInfo;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private workspaceFactory: WorkspaceFactory;
  private configManager?: ConfigManager;

  /**
   * Initialize importer with Smartsheet client and optional configuration
   */
  constructor(
    client?: SmartsheetClient,
    logger?: Logger,
    errorHandler?: ErrorHandler,
    configManager?: ConfigManager
  ) {
    this.smartsheetClient = client;
    this.logger = logger ?? new Logger();
    this.errorHandler = errorHandler ?? new ErrorHandler(this.logger);
    this.configManager = configManager;
    this.workspaceFactory = WorkspaceFactoryProvider.getFactory(configManager);
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

    // Read configuration from environment (Device Code Flow)
    const config: ProjectOnlineClientConfig = {
      tenantId: process.env.TENANT_ID || '',
      clientId: process.env.CLIENT_ID || '',
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
    console.log(data?.tasks[0]?.CustomFields);
    
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

      // Step 2: Transform project and create workspace with 3 sheets using factory
      progress.startStage('Project Workspace Creation');
      const projectResult = await this.workspaceFactory.createProjectWorkspace(
        this.smartsheetClient!,
        data.project,
        this.configManager
      );
      progress.completeStage(`${projectResult.workspace.name} (ID: ${projectResult.workspace.id})`);

      // Step 3: Configure project summary sheet picklists
      progress.startStage('Summary Sheet Configuration');
      await this.configureProjectPicklists(
        projectResult.sheets.summarySheet.id,
        this.pmoStandardsWorkspace
      );
      progress.completeStage('Status and Priority picklists configured');

      // Step 3.5: Populate project data into summary sheet
      progress.startStage('Project Data Population');
      const templateWorkspaceId = this.configManager?.get().templateWorkspaceId;
      await populateProjectSummary(
        this.smartsheetClient,
        data.project,
        projectResult.sheets.summarySheet.id,
        templateWorkspaceId
      );
      progress.completeStage('Project data populated in summary sheet');

      // Step 4: Transform tasks
      let tasksImported = 0;
      let assignmentsImported = 0;
      if (data.tasks.length > 0) {
        progress.startStage('Task Import');
        
        // Get template workspace ID from config if available
        // const templateWorkspaceId = this.configManager?.get().templateWorkspaceId;
        
        const taskTransformer = new TaskTransformer(this.smartsheetClient, this.logger);
        const taskResult = await taskTransformer.transformTasks(
          data.tasks,
          projectResult.sheets.taskSheet.id
        );
        tasksImported = taskResult.rowsCreated;
        assignmentsImported = taskResult.assignmentsProcessed;
        progress.completeStage(`${tasksImported} tasks imported, ${assignmentsImported} assignments processed`);

        // Complete assignment column creation stage if it was defined
        if (data.assignments.length > 0 && data.resources.length > 0) {
          progress.startStage('Assignment Column Creation');
          progress.completeStage(`${assignmentsImported} assignment columns configured`);
        }

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
        
        // Get template workspace ID from config if available
        const templateWorkspaceId = this.configManager?.get().templateWorkspaceId;
        
        const resourceTransformer = new ResourceTransformer(
          this.smartsheetClient, 
          templateWorkspaceId
        );
        
        const resourceResult = await resourceTransformer.transformResources(
          data.resources,
          projectResult.sheets.resourceSheet.id
        );
        resourcesImported = resourceResult.rowsCreated;
        progress.completeStage(`${resourcesImported} resources imported`);
      }

      // Assignment data is now handled within task transformation

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
        assignmentsImported
      };
    } catch (error) {
      this.errorHandler.handle(error, 'Project Import');

      // Capture full error details for debugging
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Log stack trace for debugging
        this.logger.debug('Error stack:', error.stack);
      } else if (typeof error === 'object' && error !== null) {
        // Try to serialize the error object
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = String(error);
        }
      } else {
        errorMessage = String(error);
      }

      return {
        success: false,
        projectsImported: 0,
        tasksImported: 0,
        resourcesImported: 0,
        assignmentsImported: 0,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get or create PMO Standards workspace using factory
   * This workspace is created once and reused across all project imports
   *
   * Checks PMO_STANDARDS_WORKSPACE_ID environment variable first.
   * If provided, uses existing workspace. Otherwise creates new one.
   */
  private async getOrCreatePMOStandardsWorkspace(): Promise<PMOStandardsWorkspaceInfo> {
    const startTime = Date.now();
    const testDiagnostics = process.env.TEST_DIAGNOSTICS === 'true';

    if (testDiagnostics) {
      console.log(
        `\n[PMO DIAG] getOrCreatePMOStandardsWorkspace called at ${new Date().toISOString()}`
      );
      console.log(
        `[PMO DIAG] Current cached workspace: ${this.pmoStandardsWorkspace?.workspaceId || 'NONE'}`
      );
      console.log(
        `[PMO DIAG] ENV PMO_STANDARDS_WORKSPACE_ID: ${process.env.PMO_STANDARDS_WORKSPACE_ID || 'NOT SET'}`
      );
    }

    if (!this.smartsheetClient) {
      throw ErrorHandler.configError('Smartsheet client', 'not initialized');
    }

    // Check for existing workspace ID in environment
    const existingWorkspaceId = process.env.PMO_STANDARDS_WORKSPACE_ID;
    const workspaceIdNum = existingWorkspaceId ? parseInt(existingWorkspaceId, 10) : undefined;

    if (workspaceIdNum && !isNaN(workspaceIdNum)) {
      this.logger.debug(`Using existing PMO Standards workspace: ${workspaceIdNum}`);
      if (testDiagnostics) {
        console.log(`[PMO DIAG] Using existing workspace ID: ${workspaceIdNum}`);
      }
    } else if (existingWorkspaceId) {
      this.logger.warn(
        `Invalid PMO_STANDARDS_WORKSPACE_ID: "${existingWorkspaceId}". Creating new workspace.`
      );
      if (testDiagnostics) {
        console.log(`[PMO DIAG] Invalid workspace ID, will create new`);
      }
    } else if (testDiagnostics) {
      console.log(`[PMO DIAG] No workspace ID provided, will create new`);
    }

    try {
      // Use factory to create or get PMO Standards workspace
      if (testDiagnostics) {
        console.log(`[PMO DIAG] Calling factory.createStandardsWorkspace...`);
      }

      const pmoWorkspace = await this.workspaceFactory.createStandardsWorkspace(
        this.smartsheetClient,
        workspaceIdNum && !isNaN(workspaceIdNum) ? workspaceIdNum : undefined,
        this.logger
      );

      const elapsedMs = Date.now() - startTime;
      this.logger.debug(
        `PMO Standards workspace ready (ID: ${pmoWorkspace.workspaceId}) ` +
          `with ${Object.keys(pmoWorkspace.referenceSheets).length} reference sheets`
      );

      if (testDiagnostics) {
        console.log(`[PMO DIAG] ✅ Workspace ready in ${elapsedMs}ms`);
        console.log(`[PMO DIAG] Workspace ID: ${pmoWorkspace.workspaceId}`);
        console.log(
          `[PMO DIAG] Reference sheets: ${Object.keys(pmoWorkspace.referenceSheets).length}`
        );
        console.log(`[PMO DIAG] Sheets: ${Object.keys(pmoWorkspace.referenceSheets).join(', ')}\n`);
      }

      return pmoWorkspace;
    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      if (testDiagnostics) {
        console.error(`[PMO DIAG] ❌ Failed after ${elapsedMs}ms`);
        console.error(`[PMO DIAG] Error:`, error);
      }
      throw error;
    }
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

    // Get sheet to find Status and Priority column IDs - wrap with retry for eventual consistency
    console.log(`[DEBUG] Querying sheet ID ${summarySheetId} for Status and Priority columns`);
    if (!this.smartsheetClient.sheets?.getSheet) {
      throw new Error('SmartsheetClient does not support getSheet');
    }
    const getSheet = this.smartsheetClient.sheets.getSheet;
    const sheet = await withBackoff(() => getSheet({ id: summarySheetId }));
    console.log(`[DEBUG] Raw API response keys:`, Object.keys(sheet || {}));
    console.log(
      `[DEBUG] Response structure:`,
      JSON.stringify(sheet, null, 2).substring(0, 500)
    );

    if (!sheet) {
      throw ErrorHandler.dataError(
        `Failed to get summary sheet ${summarySheetId}`,
        'Verify the sheet exists and your API token has access to it'
      );
    }

    console.log(`[DEBUG] Sheet object keys:`, Object.keys(sheet || {}));
    console.log(
      `[DEBUG] Sheet has ${sheet.columns?.length || 0} columns:`,
      sheet.columns?.map((c: SmartsheetColumn) => c.title).join(', ')
    );

    const statusColumn = sheet.columns?.find((c: SmartsheetColumn) => c.title === 'Status');
    const priorityColumn = sheet.columns?.find((c: SmartsheetColumn) => c.title === 'Priority');

    console.log(
      `[DEBUG] Status column found:`,
      statusColumn ? `Yes (ID: ${statusColumn.id})` : 'No'
    );
    console.log(
      `[DEBUG] Priority column found:`,
      priorityColumn ? `Yes (ID: ${priorityColumn.id})` : 'No'
    );

    if (!statusColumn?.id || !priorityColumn?.id) {
      throw ErrorHandler.dataError(
        'Status or Priority column not found in summary sheet',
        'Ensure the project transformer created all required columns'
      );
    }

    // Configure the picklists
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

    // Get sheet to find column IDs - wrap with retry for eventual consistency
    if (!this.smartsheetClient.sheets?.getSheet) {
      throw new Error('SmartsheetClient does not support getSheet');
    }
    const getSheet = this.smartsheetClient.sheets.getSheet;
    const sheet = await withBackoff(() => getSheet({ id: taskSheetId }));

    if (!sheet) {
      throw ErrorHandler.dataError(
        `Failed to get task sheet ${taskSheetId}`,
        'Verify the sheet exists and your API token has access to it'
      );
    }

    const statusColumn = sheet.columns?.find((c: SmartsheetColumn) => c.title === 'Status');
    const priorityColumn = sheet.columns?.find((c: SmartsheetColumn) => c.title === 'Priority');
    const constraintColumn = sheet.columns?.find(
      (c: SmartsheetColumn) => c.title === 'Constraint Type'
    );

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

    // Check Project Online configuration (Device Code Flow - no client secret required)
    const poConfig = {
      tenantId: process.env.TENANT_ID,
      clientId: process.env.CLIENT_ID,
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

    if (!poConfig.projectOnlineUrl) {
      errors.push('PROJECT_ONLINE_URL environment variable is not set');
    } else {
      this.logger.success('✓ Project Online URL is configured');
    }

    this.logger.info('ℹ️  Authentication: Device Code Flow (interactive browser authentication)');

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
        errors.push(
          `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Import all accessible Project Online projects to Smartsheet
   */
  async importAllProjects(options: BulkImportOptions): Promise<BulkImportResult> {
    this.logger.info(`📥 Source: All accessible Project Online projects`);
    this.logger.info(`📤 Destination: Individual workspaces (one per project)`);

    this.initializeProjectOnlineClient();

    const result = this.initializeBulkImportResult();
    
    try {
      const allProjectsData = await this.discoverProjects();
      result.totalProjects = allProjectsData.length;

      if (allProjectsData.length === 0) {
        this.logger.warn('⚠️  No accessible projects found in Project Online');
        return result;
      }

      if (options.dryRun) {
        return this.handleDryRun(result, allProjectsData.length);
      }

      await this.processAllProjects(allProjectsData, result);
      this.logBulkImportSummary(result);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors!.push(`Bulk import failed: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Initialize bulk import result structure
   */
  private initializeBulkImportResult(): BulkImportResult {
    return {
      totalProjects: 0,
      successfulImports: 0,
      failedImports: 0,
      results: [],
      projectWorkspaceMapping: [],
      errors: [],
    };
  }

  /**
   * Discover all accessible projects
   */
  private async discoverProjects() {
    return await this.projectOnlineClient!.extractAllProjectsData();
  }

  /**
   * Handle dry run mode
   */
  private handleDryRun(result: BulkImportResult, projectCount: number): BulkImportResult {
    this.logger.warn('\n🚨 Dry run mode - no changes will be made\n');
    this.logger.info('In dry-run mode, the tool would:');
    this.logger.info('  • Extract data from each project');
    this.logger.info('  • Process data transformations');
    this.logger.info('  • Skip all Smartsheet write operations\n');
    
    this.logger.success(`\n✅ Dry run completed successfully!`);
    this.logger.info(`   Would process ${projectCount} projects\n`);
    return result;
  }

  /**
   * Process all projects for import
   */
  private async processAllProjects(
    allProjectsData: Array<{
      project: ProjectOnlineProject;
      tasks: ProjectOnlineTask[];
      resources: ProjectOnlineResource[];
      assignments: ProjectOnlineAssignment[];
    }>,
    result: BulkImportResult
  ): Promise<void> {
    for (let i = 0; i < allProjectsData.length; i++) {
      const projectData = allProjectsData[i];
      await this.processSingleProject(projectData, i + 1, allProjectsData.length, result);
    }
  }

  /**
   * Process a single project import
   */
  private async processSingleProject(
    projectData: {
      project: ProjectOnlineProject;
      tasks: ProjectOnlineTask[];
      resources: ProjectOnlineResource[];
      assignments: ProjectOnlineAssignment[];
    },
    currentIndex: number,
    totalCount: number,
    result: BulkImportResult
  ): Promise<void> {
    this.logger.info(`\n📦 Processing project ${currentIndex}/${totalCount}: ${projectData.project.Name}`);
    
    let mapping: BulkImportResult['projectWorkspaceMapping'][0] = {
      projectName: projectData.project.Name,
      projectId: projectData.project.Id,
      success: false,
    };
    
    try {
      const importResult = await this.importProject({
        project: projectData.project,
        tasks: projectData.tasks,
        resources: projectData.resources,
        assignments: projectData.assignments,
      });

      this.handleSuccessfulImport(importResult, mapping, result);
    } catch (error) {
      this.handleFailedImport(error, projectData.project.Name, mapping, result);
    }
    
    result.projectWorkspaceMapping.push(mapping);
  }

  /**
   * Handle successful project import
   */
  private handleSuccessfulImport(
    importResult: ImportResult,
    mapping: BulkImportResult['projectWorkspaceMapping'][0],
    result: BulkImportResult
  ): void {
    result.results.push(importResult);
    result.successfulImports++;
    
    mapping.success = true;
    mapping.workspaceName = importResult.workspaceName;
    mapping.workspaceId = importResult.workspaceId;
    mapping.workspacePermalink = importResult.workspacePermalink;
    
    this.logger.success(`✅ Successfully imported: ${mapping.projectName}`);
    if (importResult.workspacePermalink) {
      this.logger.info(`   Workspace: ${importResult.workspacePermalink}`);
    }
  }

  /**
   * Handle failed project import
   */
  private handleFailedImport(
    error: unknown,
    projectName: string,
    mapping: BulkImportResult['projectWorkspaceMapping'][0],
    result: BulkImportResult
  ): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.failedImports++;
    result.errors!.push(`Failed to import "${projectName}": ${errorMsg}`);
    
    mapping.error = errorMsg;
    this.logger.error(`❌ Failed to import "${projectName}": ${errorMsg}`);
  }

  /**
   * Log bulk import summary and results
   */
  private logBulkImportSummary(result: BulkImportResult): void {
    this.logger.info(`\n📊 Bulk Import Summary:`);
    this.logger.info(`   Total projects: ${result.totalProjects}`);
    this.logger.info(`   Successful imports: ${result.successfulImports}`);
    this.logger.info(`   Failed imports: ${result.failedImports}`);
    
    this.logProjectWorkspaceMapping(result.projectWorkspaceMapping);
    this.logDetailedErrors(result.errors);
  }

  /**
   * Log project to workspace mapping
   */
  private logProjectWorkspaceMapping(mapping: BulkImportResult['projectWorkspaceMapping']): void {
    if (mapping.length > 0) {
      this.logger.info(`\n🔗 Project → Workspace Mapping:`);
      mapping.forEach((item) => {
        if (item.success && item.workspacePermalink) {
          this.logger.success(`   ${item.projectName} → ${item.workspacePermalink}`);
        } else {
          this.logger.error(`   ${item.projectName} → ❌ Failed: ${item.error || 'Unknown error'}`);
        }
      });
    }
  }

  /**
   * Log detailed errors if any
   */
  private logDetailedErrors(errors?: string[]): void {
    if (errors && errors.length > 0) {
      this.logger.info(`\n⚠️  Detailed Errors:`);
      errors.forEach((error, index) => {
        this.logger.error(`   ${index + 1}. ${error}`);
      });
    }
  }
}
