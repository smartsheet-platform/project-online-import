#!/usr/bin/env ts-node
/**
 * Extract Real Project Online Data for Integration Tests
 *
 * This script extracts actual data from Project Online to:
 * 1. Analyze the real schema and data structure
 * 2. Compare against our mock fixtures
 * 3. Identify any schema mismatches
 * 4. Generate realistic test fixtures
 *
 * Usage:
 *   npm run extract-real-data           # Extract first available project
 *   npm run extract-real-data --list    # List available projects
 *   npm run extract-real-data <id>      # Extract specific project by ID
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectOnlineClient } from '../src/lib/ProjectOnlineClient';
import { Logger } from '../src/util/Logger';
import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
} from '../src/types/ProjectOnline';

// Load test environment
dotenv.config({ path: '.env.test' });

interface ExtractedData {
  project: ProjectOnlineProject;
  tasks: ProjectOnlineTask[];
  resources: ProjectOnlineResource[];
  assignments: ProjectOnlineAssignment[];
}

interface SchemaAnalysis {
  projectFields: string[];
  taskFields: string[];
  resourceFields: string[];
  assignmentFields: string[];
  sampleSizes: {
    tasks: number;
    resources: number;
    assignments: number;
  };
}

class RealDataExtractor {
  private client: ProjectOnlineClient;
  private logger: Logger;
  private outputDir: string;

  constructor() {
    this.logger = new Logger();
    this.outputDir = path.join(__dirname, '..', 'test', 'integration', 'fixtures', 'real-data');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize Project Online client
    this.client = new ProjectOnlineClient(
      {
        tenantId: process.env.TENANT_ID!,
        clientId: process.env.CLIENT_ID!,
        projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
      },
      this.logger
    );
  }

  /**
   * List available projects
   */
  async listProjects(): Promise<ProjectOnlineProject[]> {
    this.logger.info(`\n${'='.repeat(80)}`);
    this.logger.info(`Listing Available Projects`);
    this.logger.info(`${'='.repeat(80)}\n`);

    const response = await this.client.getProjects({ $top: 10 });
    const projects = response.value;

    this.logger.info(`Found ${projects.length} project(s):\n`);
    projects.forEach((project, index) => {
      this.logger.info(`${index + 1}. ${project.Name}`);
      this.logger.info(`   ID: ${project.Id}`);
      this.logger.info(`   Created: ${project.CreatedDate || 'N/A'}`);
      this.logger.info('');
    });

    return projects;
  }

  /**
   * Extract project data from Project Online
   */
  async extractProjectData(projectId: string): Promise<ExtractedData> {
    this.logger.info(`\n${'='.repeat(80)}`);
    this.logger.info(`Extracting Project Data`);
    this.logger.info(`${'='.repeat(80)}\n`);

    const data = await this.client.extractProjectData(projectId);

    this.logger.info(`\n✓ Extraction Complete:`);
    this.logger.info(`  Project: ${data.project.Name} (${data.project.Id})`);
    this.logger.info(`  Tasks: ${data.tasks.length}`);
    this.logger.info(`  Resources: ${data.resources.length}`);
    this.logger.info(`  Assignments: ${data.assignments.length}`);

    return data;
  }

  /**
   * Analyze schema of extracted data
   */
  analyzeSchema(data: ExtractedData): SchemaAnalysis {
    this.logger.info(`\n${'='.repeat(80)}`);
    this.logger.info(`Schema Analysis`);
    this.logger.info(`${'='.repeat(80)}\n`);

    const analysis: SchemaAnalysis = {
      projectFields: Object.keys(data.project).sort(),
      taskFields: data.tasks.length > 0 ? Object.keys(data.tasks[0]).sort() : [],
      resourceFields: data.resources.length > 0 ? Object.keys(data.resources[0]).sort() : [],
      assignmentFields: data.assignments.length > 0 ? Object.keys(data.assignments[0]).sort() : [],
      sampleSizes: {
        tasks: data.tasks.length,
        resources: data.resources.length,
        assignments: data.assignments.length,
      },
    };

    this.logger.info(`Project Fields (${analysis.projectFields.length}):`);
    analysis.projectFields.forEach((field) => this.logger.info(`  - ${field}`));

    this.logger.info(`\nTask Fields (${analysis.taskFields.length}):`);
    analysis.taskFields.forEach((field) => this.logger.info(`  - ${field}`));

    this.logger.info(`\nResource Fields (${analysis.resourceFields.length}):`);
    analysis.resourceFields.forEach((field) => this.logger.info(`  - ${field}`));

    this.logger.info(`\nAssignment Fields (${analysis.assignmentFields.length}):`);
    analysis.assignmentFields.forEach((field) => this.logger.info(`  - ${field}`));

    return analysis;
  }

  /**
   * Save extracted data to files
   */
  saveData(data: ExtractedData, analysis: SchemaAnalysis): void {
    this.logger.info(`\n${'='.repeat(80)}`);
    this.logger.info(`Saving Data Files`);
    this.logger.info(`${'='.repeat(80)}\n`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const projectSlug = data.project.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
    const prefix = `${timestamp}-${projectSlug}`;

    // Save complete data
    const dataFile = path.join(this.outputDir, `${prefix}-complete.json`);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    this.logger.success(`✓ Complete data: ${dataFile}`);

    // Save schema analysis
    const schemaFile = path.join(this.outputDir, `${prefix}-schema.json`);
    fs.writeFileSync(schemaFile, JSON.stringify(analysis, null, 2));
    this.logger.success(`✓ Schema analysis: ${schemaFile}`);

    // Save individual entity samples (first 3 of each)
    const samplesDir = path.join(this.outputDir, `${prefix}-samples`);
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true });
    }

    // Project sample
    fs.writeFileSync(
      path.join(samplesDir, 'project.json'),
      JSON.stringify(data.project, null, 2)
    );

    // Task samples (first 3)
    const taskSamples = data.tasks.slice(0, Math.min(3, data.tasks.length));
    fs.writeFileSync(
      path.join(samplesDir, 'tasks.json'),
      JSON.stringify(taskSamples, null, 2)
    );

    // Resource samples (first 3)
    const resourceSamples = data.resources.slice(0, Math.min(3, data.resources.length));
    fs.writeFileSync(
      path.join(samplesDir, 'resources.json'),
      JSON.stringify(resourceSamples, null, 2)
    );

    // Assignment samples (first 3)
    const assignmentSamples = data.assignments.slice(0, Math.min(3, data.assignments.length));
    fs.writeFileSync(
      path.join(samplesDir, 'assignments.json'),
      JSON.stringify(assignmentSamples, null, 2)
    );

    this.logger.success(`✓ Entity samples: ${samplesDir}`);

    // Create a README for the extracted data
    const readme = this.generateReadme(data, analysis, prefix);
    fs.writeFileSync(path.join(this.outputDir, `${prefix}-README.md`), readme);
    this.logger.success(`✓ Documentation: ${prefix}-README.md`);
  }

  /**
   * Generate README documentation for extracted data
   */
  private generateReadme(data: ExtractedData, analysis: SchemaAnalysis, prefix: string): string {
    return `# Real Project Online Data Extract

**Project:** ${data.project.Name}
**Extracted:** ${new Date().toISOString()}
**Project ID:** ${data.project.Id}

## Summary

- **Tasks:** ${analysis.sampleSizes.tasks}
- **Resources:** ${analysis.sampleSizes.resources}
- **Assignments:** ${analysis.sampleSizes.assignments}

## Files

- \`${prefix}-complete.json\` - Full project data (all entities)
- \`${prefix}-schema.json\` - Schema analysis with all field names
- \`${prefix}-samples/\` - Sample entities for quick review

## Schema Overview

### Project Fields (${analysis.projectFields.length})
${analysis.projectFields.map((f) => `- ${f}`).join('\n')}

### Task Fields (${analysis.taskFields.length})
${analysis.taskFields.map((f) => `- ${f}`).join('\n')}

### Resource Fields (${analysis.resourceFields.length})
${analysis.resourceFields.map((f) => `- ${f}`).join('\n')}

### Assignment Fields (${analysis.assignmentFields.length})
${analysis.assignmentFields.map((f) => `- ${f}`).join('\n')}

## Next Steps

1. Compare this schema against mock fixtures in \`test/integration/helpers/odata-fixtures.ts\`
2. Identify missing fields or incorrect types in mock data
3. Update test fixtures to match real schema
4. Run integration tests with real data structure

## Usage in Tests

To use this data in integration tests:

\`\`\`typescript
import realData from './fixtures/real-data/${prefix}-complete.json';

// Use real project structure
const project = realData.project;
const tasks = realData.tasks;
// ...
\`\`\`
`;
  }

  /**
   * Compare real data schema against TypeScript type definitions
   */
  compareAgainstTypes(analysis: SchemaAnalysis): void {
    this.logger.info(`\n${'='.repeat(80)}`);
    this.logger.info(`Type Definition Comparison`);
    this.logger.info(`${'='.repeat(80)}\n`);

    this.logger.info('Checking src/types/ProjectOnline.ts for schema alignment...');
    
    // Read the TypeScript type definitions
    const typesFile = path.join(__dirname, '..', 'src', 'types', 'ProjectOnline.ts');
    if (fs.existsSync(typesFile)) {
      const typesContent = fs.readFileSync(typesFile, 'utf-8');
      
      // Extract interface definitions (simple regex - not perfect but good enough)
      const projectInterface = this.extractInterface(typesContent, 'ProjectOnlineProject');
      const taskInterface = this.extractInterface(typesContent, 'ProjectOnlineTask');
      const resourceInterface = this.extractInterface(typesContent, 'ProjectOnlineResource');
      const assignmentInterface = this.extractInterface(typesContent, 'ProjectOnlineAssignment');

      // Compare
      this.logger.info('\n📊 Field Coverage Analysis:\n');
      this.compareFields('Project', analysis.projectFields, projectInterface);
      this.compareFields('Task', analysis.taskFields, taskInterface);
      this.compareFields('Resource', analysis.resourceFields, resourceInterface);
      this.compareFields('Assignment', analysis.assignmentFields, assignmentInterface);
    } else {
      this.logger.warn('Type definitions file not found');
    }
  }

  /**
   * Extract interface field names from TypeScript code
   */
  private extractInterface(content: string, interfaceName: string): string[] {
    const interfaceRegex = new RegExp(
      `export interface ${interfaceName}\\s*{([^}]*)}`,
      's'
    );
    const match = content.match(interfaceRegex);
    
    if (!match) return [];

    const interfaceBody = match[1];
    const fieldRegex = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\??:/gm;
    const fields: string[] = [];
    
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(interfaceBody)) !== null) {
      fields.push(fieldMatch[1]);
    }
    
    return fields.sort();
  }

  /**
   * Compare real fields against type definition fields
   */
  private compareFields(entityType: string, realFields: string[], typeFields: string[]): void {
    const missingInType = realFields.filter((f) => !typeFields.includes(f));
    const extraInType = typeFields.filter((f) => !realFields.includes(f));
    const matching = realFields.filter((f) => typeFields.includes(f));

    this.logger.info(`${entityType}:`);
    this.logger.info(`  ✓ Matching fields: ${matching.length}`);
    
    if (missingInType.length > 0) {
      this.logger.warn(`  ⚠ Fields in real data but NOT in type definition: ${missingInType.length}`);
      missingInType.slice(0, 5).forEach((f) => this.logger.warn(`    - ${f}`));
      if (missingInType.length > 5) {
        this.logger.warn(`    ... and ${missingInType.length - 5} more`);
      }
    }
    
    if (extraInType.length > 0) {
      this.logger.info(`  ℹ Fields in type definition but not in real data: ${extraInType.length}`);
      extraInType.slice(0, 5).forEach((f) => this.logger.info(`    - ${f}`));
      if (extraInType.length > 5) {
        this.logger.info(`    ... and ${extraInType.length - 5} more`);
      }
    }
    
    this.logger.info('');
  }
}

/**
 * Main execution
 */
async function main() {
  const extractor = new RealDataExtractor();
  const logger = new Logger();

  // Check if we should just list projects
  const listOnly = process.argv[2] === '--list' || process.argv[2] === '-l';

  try {
    // List available projects
    const projects = await extractor.listProjects();

    if (projects.length === 0) {
      logger.error('No projects found in Project Online');
      process.exit(1);
    }

    if (listOnly) {
      logger.success(`\n✓ Found ${projects.length} project(s)`);
      logger.info('\nTo extract a project, run:');
      logger.info(`  npm run extract-real-data <project-id>`);
      process.exit(0);
    }

    // Get project ID from command line or use first available project
    let projectId = process.argv[2];
    
    if (!projectId) {
      logger.info(`No project ID specified, using first project: ${projects[0].Name}`);
      projectId = projects[0].Id;
    } else {
      // Verify the project exists
      const projectExists = projects.some(p => p.Id === projectId);
      if (!projectExists) {
        logger.warn(`\n⚠ Project ID ${projectId} not found in the first 10 projects.`);
        logger.info(`Available project IDs:`);
        projects.forEach((p) => logger.info(`  - ${p.Id} (${p.Name})`));
        logger.info(`\nProceeding with extraction anyway...`);
      }
    }

    // Extract data
    const data = await extractor.extractProjectData(projectId);

    // Analyze schema
    const analysis = extractor.analyzeSchema(data);

    // Compare against type definitions
    extractor.compareAgainstTypes(analysis);

    // Save all data
    extractor.saveData(data, analysis);

    logger.success(`\n${'='.repeat(80)}`);
    logger.success(`✓ Data extraction complete!`);
    logger.success(`${'='.repeat(80)}\n`);

    process.exit(0);
  } catch (error) {
    logger.error(`\n✗ Extraction failed: ${error}`);
    if (error instanceof Error) {
      logger.error(`  ${error.message}`);
      if (error.stack) {
        logger.error(`\nStack trace:\n${error.stack}`);
      }
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
