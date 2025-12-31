#!/usr/bin/env node

import { Command } from 'commander';
import { ProjectOnlineImporter } from './lib/importer';
import { Logger, LogLevel } from './util/Logger';
import { ErrorHandler } from './util/ErrorHandler';
import { ConfigManager } from './util/ConfigManager';
import * as smartsheet from 'smartsheet';


const program = new Command();

program
  .name('project-online-import')
  .description('CLI tool for importing Project Online data to Smartsheet')
  .version('1.0.0');

program
  .command('import')
  .description('Import data from Project Online to Smartsheet')
  .option('-s, --source <url>', 'Project Online source URL')
  .option('-d, --destination <id>', 'Smartsheet destination ID')
  .option('--dry-run', 'Run without making changes', false)
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--config <path>', 'Path to .env configuration file')
  .action(async (options) => {
    // Initialize logger
    const logger = new Logger({
      level: options.verbose ? LogLevel.DEBUG : LogLevel.INFO,
      timestamps: false,
      colors: true,
    });

    const errorHandler = new ErrorHandler(logger);

    try {
      logger.info('\n🚀 Project Online to Smartsheet ETL\n');

      // Check for first-time setup
      if (!ConfigManager.checkSetup()) {
        process.exit(1);
      }

      // Load configuration
      const configManager = new ConfigManager(logger);
      const config = configManager.load(options.config);

      // Override dry-run from command line if specified
      if (options.dryRun) {
        config.dryRun = true;
      }

      // Override verbose from command line if specified
      if (options.verbose) {
        config.verbose = true;
        logger.setLevel(LogLevel.DEBUG);
      }

      // Print configuration summary
      configManager.printSummary();

      // Initialize importer
      const smartsheetClient = smartsheet.createClient({
        accessToken: process.env.SMARTSHEET_API_TOKEN,
      })
      const importer = new ProjectOnlineImporter(smartsheetClient, logger, errorHandler);

      if (config.dryRun) {
        logger.warn('\n🚨 DRY RUN MODE: No changes will be made\n');
      }

      // Perform import
      await importer.import({
        source: options.source,
        destination: options.destination,
        dryRun: config.dryRun,
      });

      logger.success('\n✅ Import completed successfully!\n');
    } catch (error) {
      errorHandler.handle(error, 'Import');
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate Project Online data before import')
  .option('-s, --source <url>', 'Project Online source URL')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--config <path>', 'Path to .env configuration file')
  .action(async (options) => {
    // Initialize logger
    const logger = new Logger({
      level: options.verbose ? LogLevel.DEBUG : LogLevel.INFO,
      timestamps: false,
      colors: true,
    });

    const errorHandler = new ErrorHandler(logger);

    try {
      logger.info('\n🔍 Validating Project Online data\n');

      // Check for first-time setup
      if (!ConfigManager.checkSetup()) {
        process.exit(1);
      }

      // Load configuration
      const configManager = new ConfigManager(logger);
      configManager.load(options.config);

      // Initialize importer
      const smartsheetClient = smartsheet.createClient({
        accessToken: process.env.SMARTSHEET_API_TOKEN,
      })
      const importer = new ProjectOnlineImporter(smartsheetClient, logger, errorHandler);

      const result = await importer.validate(options.source);

      if (result.valid) {
        logger.success('\n✅ Validation passed\n');
      } else {
        logger.error('\n❌ Validation failed:\n');
        result.errors?.forEach((error) => {
          logger.error(`  • ${error}`);
        });
        logger.info('\n💡 Fix the validation errors above and try again.\n');
        process.exit(1);
      }
    } catch (error) {
      errorHandler.handle(error, 'Validation');
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Validate and display current configuration')
  .option('--config <path>', 'Path to .env configuration file')
  .action(async (options) => {
    const logger = new Logger();
    const errorHandler = new ErrorHandler(logger);

    try {
      logger.info('\n⚙️  Configuration Validator\n');

      // Check for first-time setup
      if (!ConfigManager.checkSetup()) {
        process.exit(1);
      }

      // Load and validate configuration
      const configManager = new ConfigManager(logger);
      configManager.load(options.config);

      // Print configuration summary
      configManager.printSummary();

      logger.success('\n✅ Configuration is valid\n');
    } catch (error) {
      errorHandler.handle(error, 'Config');
      process.exit(1);
    }
  });

program.parse();
