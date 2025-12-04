#!/usr/bin/env node

import { Command } from 'commander';
import { ProjectOnlineImporter } from './lib/importer';

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
  .action(async (options) => {
    try {
      const importer = new ProjectOnlineImporter();

      if (options.dryRun) {
        console.log('Running in dry-run mode...');
      }

      await importer.import({
        source: options.source,
        destination: options.destination,
        dryRun: options.dryRun,
      });

      console.log('Import completed successfully!');
    } catch (error) {
      console.error('Import failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate Project Online data before import')
  .option('-s, --source <url>', 'Project Online source URL')
  .action(async (options) => {
    try {
      const importer = new ProjectOnlineImporter();
      const result = await importer.validate(options.source);

      if (result.valid) {
        console.log('✓ Validation passed');
      } else {
        console.error('✗ Validation failed:', result.errors);
        process.exit(1);
      }
    } catch (error) {
      console.error('Validation error:', error);
      process.exit(1);
    }
  });

program.parse();
