/**
 * Configuration management with validation and .env support
 * Handles loading and validating configuration from environment variables
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorHandler, ConfigurationError } from './ErrorHandler';
import { Logger } from './Logger';

export interface ETLConfig {
  // Smartsheet Configuration
  smartsheetApiToken: string;
  pmoStandardsWorkspaceId?: number;
  templateWorkspaceId?: number;

  // Solution Type Configuration
  solutionType?: 'StandaloneWorkspaces' | 'Portfolio';

  // Project Online Configuration
  projectOnlineUrl?: string;
  projectOnlineTenantId?: string;
  projectOnlineClientId?: string;
  projectOnlineClientSecret?: string;
  useDeviceCodeFlow?: boolean;
  tokenCacheDir?: string;

  // Logging Configuration
  logLevel?: string;
  logFile?: string;

  // Performance Configuration
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;

  // Feature Flags
  dryRun?: boolean;
  verbose?: boolean;
}

export class ConfigManager {
  private config: ETLConfig | null = null;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger();
  }

  /**
   * Load configuration from .env file and environment variables
   */
  load(envPath?: string): ETLConfig {
    // Load .env file if it exists
    const resolvedPath = envPath ?? path.join(process.cwd(), '.env');

    if (fs.existsSync(resolvedPath)) {
      this.logger.debug(`Loading configuration from ${resolvedPath}`);
      dotenv.config({ path: resolvedPath });
    } else {
      this.logger.debug('No .env file found, using environment variables only');
    }

    // Build configuration object
    this.config = {
      // Required: Smartsheet API Token
      smartsheetApiToken: this.getRequired('SMARTSHEET_API_TOKEN'),

      // Optional: PMO Standards Workspace ID
      pmoStandardsWorkspaceId: this.getOptionalNumber('PMO_STANDARDS_WORKSPACE_ID'),

      // Optional: Template Workspace ID (no default - creates blank workspace if not specified)
      templateWorkspaceId: this.getOptionalNumber('TEMPLATE_WORKSPACE_ID'),

      // Optional: Solution Type (defaults to StandaloneWorkspaces)
      solutionType: this.getSolutionType(),

      // Optional: Project Online Configuration
      projectOnlineUrl: this.getOptional('PROJECT_ONLINE_URL'),
      projectOnlineTenantId: this.getOptional('PROJECT_ONLINE_TENANT_ID') || this.getOptional('TENANT_ID'),
      projectOnlineClientId: this.getOptional('PROJECT_ONLINE_CLIENT_ID') || this.getOptional('CLIENT_ID'),
      projectOnlineClientSecret: this.getOptional('PROJECT_ONLINE_CLIENT_SECRET') || this.getOptional('CLIENT_SECRET'),
      useDeviceCodeFlow: this.getOptionalBoolean('USE_DEVICE_CODE_FLOW'),
      tokenCacheDir: this.getOptional('TOKEN_CACHE_DIR'),

      // Optional: Logging Configuration
      logLevel: this.getOptional('LOG_LEVEL', 'INFO'),
      logFile: this.getOptional('LOG_FILE'),

      // Optional: Performance Configuration
      batchSize: this.getOptionalNumber('BATCH_SIZE', 100),
      maxRetries: this.getOptionalNumber('MAX_RETRIES', 3),
      retryDelay: this.getOptionalNumber('RETRY_DELAY', 1000),

      // Feature Flags
      dryRun: this.getOptionalBoolean('DRY_RUN', false),
      verbose: this.getOptionalBoolean('VERBOSE', false),
    };

    this.validate();
    return this.config;
  }

  /**
   * Get current configuration
   */
  get(): ETLConfig {
    if (!this.config) {
      throw new ConfigurationError(
        'Configuration not loaded',
        'Call ConfigManager.load() before accessing configuration'
      );
    }
    return this.config;
  }

  /**
   * Validate configuration
   */
  private validate(): void {
    if (!this.config) return;

    // Validate Smartsheet API token format (starts with specific prefix)
    if (!this.config.smartsheetApiToken.match(/^[a-zA-Z0-9]{26}$/)) {
      this.logger.warn(
        'SMARTSHEET_API_TOKEN format may be invalid. ' +
          'Expected a 26-character alphanumeric token.'
      );
    }

    // Validate PMO Standards Workspace ID if provided
    if (
      this.config.pmoStandardsWorkspaceId !== undefined &&
      this.config.pmoStandardsWorkspaceId <= 0
    ) {
      throw ErrorHandler.configError('PMO_STANDARDS_WORKSPACE_ID', 'must be a positive number');
    }

    // Validate Template Workspace ID if provided
    if (this.config.templateWorkspaceId !== undefined && this.config.templateWorkspaceId <= 0) {
      throw ErrorHandler.configError('TEMPLATE_WORKSPACE_ID', 'must be a positive number');
    }

    // Validate Solution Type
    const validSolutionTypes = ['StandaloneWorkspaces', 'Portfolio'];
    if (this.config.solutionType && !validSolutionTypes.includes(this.config.solutionType)) {
      throw ErrorHandler.configError(
        'SOLUTION_TYPE',
        `must be one of: ${validSolutionTypes.join(', ')} (got: "${this.config.solutionType}")`
      );
    }

    // Validate batch size
    if (this.config.batchSize !== undefined && this.config.batchSize <= 0) {
      throw ErrorHandler.configError('BATCH_SIZE', 'must be a positive number');
    }

    // Validate max retries
    if (this.config.maxRetries !== undefined && this.config.maxRetries < 0) {
      throw ErrorHandler.configError('MAX_RETRIES', 'must be non-negative');
    }

    // Validate retry delay
    if (this.config.retryDelay !== undefined && this.config.retryDelay < 0) {
      throw ErrorHandler.configError('RETRY_DELAY', 'must be non-negative');
    }
  }

  /**
   * Get required environment variable
   */
  private getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw ErrorHandler.configError(key, 'is required but not set in environment or .env file');
    }
    return value;
  }

  /**
   * Get optional environment variable
   */
  private getOptional(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue;
  }

  /**
   * Get optional number environment variable
   */
  private getOptionalNumber(key: string, defaultValue?: number): number | undefined {
    const value = process.env[key];
    if (!value) return defaultValue;

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw ErrorHandler.configError(key, `must be a number (got: "${value}")`);
    }
    return num;
  }

  /**
   * Get optional boolean environment variable
   */
  private getOptionalBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;

    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }

    throw ErrorHandler.configError(
      key,
      `must be a boolean value (true/false, 1/0, yes/no) (got: "${value}")`
    );
  }

  /**
   * Get solution type from environment with validation
   */
  private getSolutionType(): 'StandaloneWorkspaces' | 'Portfolio' {
    const value = process.env.SOLUTION_TYPE;
    if (!value) return 'StandaloneWorkspaces';

    if (value === 'StandaloneWorkspaces' || value === 'Portfolio') {
      return value;
    }

    throw ErrorHandler.configError(
      'SOLUTION_TYPE',
      `must be either 'StandaloneWorkspaces' or 'Portfolio' (got: "${value}")`
    );
  }

  /**
   * Print configuration summary (with sensitive values masked)
   */
  printSummary(): void {
    if (!this.config) {
      this.logger.warn('Configuration not loaded');
      return;
    }

    this.logger.info('\n⚙️  Configuration:');
    this.logger.info(`  Smartsheet API Token: ${this.maskToken(this.config.smartsheetApiToken)}`);

    if (this.config.pmoStandardsWorkspaceId) {
      this.logger.info(`  PMO Standards Workspace ID: ${this.config.pmoStandardsWorkspaceId}`);
    }

    if (this.config.templateWorkspaceId) {
      this.logger.info(`  Template Workspace ID: ${this.config.templateWorkspaceId}`);
    }

    this.logger.info(`  Solution Type: ${this.config.solutionType || 'StandaloneWorkspaces'}`);

    if (this.config.projectOnlineUrl) {
      this.logger.info(`  Project Online URL: ${this.config.projectOnlineUrl}`);
      
      // Determine authentication flow
      const useDeviceCode = this.config.useDeviceCodeFlow ?? !this.config.projectOnlineClientSecret;
      const authFlow = useDeviceCode ? 'Device Code Flow (user authentication)' : 'Client Credentials Flow (app-only)';
      this.logger.info(`  Authentication: ${authFlow}`);
      
      if (this.config.tokenCacheDir) {
        this.logger.info(`  Token Cache: ${this.config.tokenCacheDir}`);
      }
    }

    this.logger.info(`  Log Level: ${this.config.logLevel}`);

    if (this.config.logFile) {
      this.logger.info(`  Log File: ${this.config.logFile}`);
    }

    this.logger.info(`  Batch Size: ${this.config.batchSize}`);
    this.logger.info(`  Max Retries: ${this.config.maxRetries}`);

    if (this.config.dryRun) {
      this.logger.warn('  🚨 DRY RUN MODE: No changes will be made');
    }
  }

  /**
   * Mask sensitive token for display
   */
  private maskToken(token: string): string {
    if (token.length <= 8) return '****';
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }

  /**
   * Check if .env.sample exists and .env doesn't (first-time setup)
   */
  static checkSetup(): boolean {
    const envPath = path.join(process.cwd(), '.env');
    const samplePath = path.join(process.cwd(), '.env.sample');

    if (!fs.existsSync(envPath) && fs.existsSync(samplePath)) {
      console.error('\n❌ Configuration Error: .env file not found\n');
      console.error('📋 First-time setup required:\n');
      console.error('  1. Copy .env.sample to .env:');
      console.error('     cp .env.sample .env\n');
      console.error('  2. Edit .env and fill in required values:');
      console.error('     - SMARTSHEET_API_TOKEN (required)');
      console.error('     - PMO_STANDARDS_WORKSPACE_ID (optional)\n');
      console.error('  3. Run the command again\n');
      return false;
    }

    return true;
  }
}
