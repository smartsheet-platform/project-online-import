#!/usr/bin/env ts-node
/**
 * Creates a sample workspace with full structure for backup/testing
 * Does NOT delete the workspace - you must manually clean up
 * 
 * Usage: npm run create-sample-workspace
 */

import * as smartsheet from 'smartsheet';
import { SmartsheetClient } from '../src/types/SmartsheetClient';
import { ProjectTransformer } from '../src/transformers/ProjectTransformer';
import { TaskTransformer } from '../src/transformers/TaskTransformer';
import { ResourceTransformer } from '../src/transformers/ResourceTransformer';
import { AssignmentTransformer } from '../src/transformers/AssignmentTransformer';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test (where SMARTSHEET_API_TOKEN is configured)
const result = dotenv.config({ path: '.env.test' });
if (result.error) {
  // Try .env as fallback
  dotenv.config({ path: '.env' });
}

interface SampleData {
  project: any;
  tasks: any[];
  resources: any[];
  assignments: any[];
}

function createSampleData(): SampleData {
  const projectId = 'sample-project-001';
  const project = {
    Id: projectId,
    Name: 'Sample Project - DO NOT DELETE',
    Description: 'This is a sample project created for backup/testing purposes',
    Start: '2024-01-15T08:00:00Z',
    Finish: '2024-06-30T17:00:00Z',
    Status: 'Active',
    Priority: 500,
    Owner: 'Project Manager',
    OwnerEmail: 'pm@example.com',
    PercentComplete: 35,
    CreatedDate: '2024-01-01T08:00:00Z',
    ModifiedDate: '2024-01-15T10:00:00Z',
  };

  const tasks = [
    {
      Id: 'task-001',
      ProjectId: projectId,
      TaskName: 'Phase 1: Planning',
      TaskIndex: 1,
      OutlineLevel: 1,
      Start: '2024-01-15T08:00:00Z',
      Finish: '2024-02-15T17:00:00Z',
      Duration: 'PT160H', // 20 days * 8 hours
      Work: 'PT320H',
      ActualWork: 'PT128H',
      PercentComplete: 40,
      TaskType: 'Fixed Duration',
      Priority: 800,
      IsMilestone: false,
      IsActive: true,
      TaskNotes: 'Initial planning phase including requirements gathering',
      Predecessors: '',
      ConstraintType: 'ASAP',
      Deadline: '2024-02-20T17:00:00Z',
      ResourceNames: 'Project Manager, Business Analyst',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-15T10:00:00Z',
    },
    {
      Id: 'task-002',
      ProjectId: projectId,
      TaskName: 'Requirements Gathering',
      TaskIndex: 2,
      OutlineLevel: 2,
      ParentTaskId: 'task-001',
      Start: '2024-01-15T08:00:00Z',
      Finish: '2024-01-29T17:00:00Z',
      Duration: 'PT80H',
      Work: 'PT160H',
      ActualWork: 'PT80H',
      PercentComplete: 50,
      TaskType: 'Fixed Work',
      Priority: 800,
      IsMilestone: false,
      IsActive: true,
      TaskNotes: 'Gather and document all project requirements',
      Predecessors: '',
      ConstraintType: 'ASAP',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-15T10:00:00Z',
    },
    {
      Id: 'task-003',
      ProjectId: projectId,
      TaskName: 'Design Review',
      TaskIndex: 3,
      OutlineLevel: 2,
      ParentTaskId: 'task-001',
      Start: '2024-02-01T08:00:00Z',
      Finish: '2024-02-15T17:00:00Z',
      Duration: 'PT80H',
      Work: 'PT160H',
      ActualWork: 'PT48H',
      PercentComplete: 30,
      TaskType: 'Fixed Work',
      Priority: 800,
      IsMilestone: false,
      IsActive: true,
      TaskNotes: 'Review and approve system design',
      Predecessors: '2FS',
      ConstraintType: 'ASAP',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-15T10:00:00Z',
    },
    {
      Id: 'task-004',
      ProjectId: projectId,
      TaskName: 'Phase 1 Complete',
      TaskIndex: 4,
      OutlineLevel: 1,
      Start: '2024-02-15T17:00:00Z',
      Finish: '2024-02-15T17:00:00Z',
      Duration: 'PT0H',
      PercentComplete: 0,
      TaskType: 'Fixed Duration',
      Priority: 1000,
      IsMilestone: true,
      IsActive: true,
      Predecessors: '3FS',
      ConstraintType: 'ASAP',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-15T10:00:00Z',
    },
    {
      Id: 'task-005',
      ProjectId: projectId,
      TaskName: 'Phase 2: Development',
      TaskIndex: 5,
      OutlineLevel: 1,
      Start: '2024-02-16T08:00:00Z',
      Finish: '2024-05-15T17:00:00Z',
      Duration: 'PT600H',
      Work: 'PT1200H',
      ActualWork: 'PT400H',
      PercentComplete: 33,
      TaskType: 'Fixed Work',
      Priority: 600,
      IsMilestone: false,
      IsActive: true,
      TaskNotes: 'Main development phase',
      Predecessors: '4FS',
      ConstraintType: 'ASAP',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-15T10:00:00Z',
    },
  ];

  const resources = [
    {
      Id: 'res-001',
      Name: 'Project Manager',
      Email: 'pm@example.com',
      ResourceType: 'Work',
      Department: 'PMO',
      MaxUnits: 1.0,
      StandardRate: 150.0,
      OvertimeRate: 225.0,
      CostPerUse: 0,
      IsActive: true,
      IsGeneric: false,
      Code: 'PM-001',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-05T10:00:00Z',
    },
    {
      Id: 'res-002',
      Name: 'Business Analyst',
      Email: 'ba@example.com',
      ResourceType: 'Work',
      Department: 'Business Analysis',
      MaxUnits: 1.0,
      StandardRate: 120.0,
      OvertimeRate: 180.0,
      CostPerUse: 0,
      IsActive: true,
      IsGeneric: false,
      Code: 'BA-001',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-05T10:00:00Z',
    },
    {
      Id: 'res-003',
      Name: 'Senior Developer',
      Email: 'dev1@example.com',
      ResourceType: 'Work',
      Department: 'Engineering',
      MaxUnits: 1.0,
      StandardRate: 140.0,
      OvertimeRate: 210.0,
      CostPerUse: 0,
      IsActive: true,
      IsGeneric: false,
      Code: 'DEV-001',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-05T10:00:00Z',
    },
    {
      Id: 'res-004',
      Name: 'Development Workstation',
      ResourceType: 'Material',
      Department: 'IT Assets',
      MaxUnits: 5.0,
      StandardRate: 50.0,
      CostPerUse: 1000.0,
      IsActive: true,
      IsGeneric: false,
      Code: 'WS-001',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-05T10:00:00Z',
    },
    {
      Id: 'res-005',
      Name: 'Cloud Infrastructure',
      ResourceType: 'Cost',
      Department: 'IT Operations',
      MaxUnits: 1.0,
      StandardRate: 500.0,
      CostPerUse: 0,
      IsActive: true,
      IsGeneric: false,
      Code: 'CLOUD-001',
      CreatedDate: '2024-01-01T08:00:00Z',
      ModifiedDate: '2024-01-05T10:00:00Z',
    },
  ];

  const assignments = [
    {
      Id: 'assign-001',
      TaskId: 'task-002',
      ResourceId: 'res-001',
      ProjectId: projectId,
      Work: 'PT80H',
      ActualWork: 'PT40H',
      PercentWorkComplete: 50,
    },
    {
      Id: 'assign-002',
      TaskId: 'task-002',
      ResourceId: 'res-002',
      ProjectId: projectId,
      Work: 'PT80H',
      ActualWork: 'PT40H',
      PercentWorkComplete: 50,
    },
    {
      Id: 'assign-003',
      TaskId: 'task-003',
      ResourceId: 'res-001',
      ProjectId: projectId,
      Work: 'PT40H',
      ActualWork: 'PT12H',
      PercentWorkComplete: 30,
    },
    {
      Id: 'assign-004',
      TaskId: 'task-005',
      ResourceId: 'res-003',
      ProjectId: projectId,
      Work: 'PT600H',
      ActualWork: 'PT200H',
      PercentWorkComplete: 33,
    },
    {
      Id: 'assign-005',
      TaskId: 'task-005',
      ResourceId: 'res-004',
      ProjectId: projectId,
      Work: 'PT600H',
      ActualWork: 'PT200H',
      PercentWorkComplete: 33,
    },
  ];

  return { project, tasks, resources, assignments };
}

async function main() {
  console.log('🚀 Creating sample workspace with full structure...\n');

  // Verify environment
  if (!process.env.SMARTSHEET_API_TOKEN) {
    throw new Error(
      'SMARTSHEET_API_TOKEN environment variable is required.\n' +
      'Please set it in your .env file.'
    );
  }

  // Initialize Smartsheet client
  const client = smartsheet.createClient({
    accessToken: process.env.SMARTSHEET_API_TOKEN,
  }) as SmartsheetClient;

  console.log('✓ Smartsheet client initialized\n');

  // Create sample data
  const data = createSampleData();
  console.log('✓ Sample data created');
  console.log(`  - Project: ${data.project.Name}`);
  console.log(`  - Tasks: ${data.tasks.length}`);
  console.log(`  - Resources: ${data.resources.length}`);
  console.log(`  - Assignments: ${data.assignments.length}\n`);

  // Create workspace
  console.log('📁 Creating workspace...');
  const workspaceResult = await client.workspaces?.createWorkspace?.({
    body: {
      name: data.project.Name,
    },
  });

  const workspace = workspaceResult?.result || workspaceResult;
  if (!workspace || !workspace.id) {
    throw new Error('Failed to create workspace');
  }

  console.log(`✓ Workspace created: "${workspace.name}" (ID: ${workspace.id})\n`);

  // Transform project (creates Summary, Tasks, and Resources sheets)
  console.log('📊 Creating project structure...');
  const projectTransformer = new ProjectTransformer(client);
  const projectResult = await projectTransformer.transformProject(
    data.project,
    workspace.id
  );

  console.log('✓ Project structure created:');
  console.log(`  - Summary Sheet (ID: ${projectResult.sheets.summarySheet.id})`);
  console.log(`  - Tasks Sheet (ID: ${projectResult.sheets.taskSheet.id})`);
  console.log(`  - Resources Sheet (ID: ${projectResult.sheets.resourceSheet.id})\n`);

  // Transform tasks (adds columns and rows to Tasks sheet)
  console.log('📝 Adding tasks...');
  const taskTransformer = new TaskTransformer(client);
  const taskResult = await taskTransformer.transformTasks(
    data.tasks,
    projectResult.sheets.taskSheet.id
  );

  console.log(`✓ Tasks added: ${taskResult.rowsCreated} rows created\n`);

  // Transform resources (adds columns and rows to Resources sheet)
  console.log('👥 Adding resources...');
  const resourceTransformer = new ResourceTransformer(client);
  const resourceResult = await resourceTransformer.transformResources(
    data.resources,
    projectResult.sheets.resourceSheet.id
  );

  console.log(`✓ Resources added: ${resourceResult.rowsCreated} rows created\n`);

  // Transform assignments (adds assignment columns to Tasks sheet)
  console.log('🔗 Configuring assignments...');
  const assignmentTransformer = new AssignmentTransformer(client);
  await assignmentTransformer.transformAssignments(
    data.assignments,
    data.resources,
    projectResult.sheets.taskSheet.id
  );

  console.log('✓ Assignment columns configured\n');

  // Print summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ WORKSPACE CREATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Workspace Name: ${workspace.name}`);
  console.log(`Workspace ID:   ${workspace.id}`);
  console.log(`\nWorkspace URL: https://app.smartsheet.com/folders/${workspace.id}`);
  console.log('\n⚠️  IMPORTANT: This workspace will NOT be automatically deleted.');
  console.log('   You must manually delete it when you are done with it.');
  console.log('═══════════════════════════════════════════════════════\n');

  // Save workspace info to file for reference
  const fs = require('fs');
  const workspaceInfo = {
    timestamp: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      url: `https://app.smartsheet.com/folders/${workspace.id}`,
    },
    sheets: {
      summary: {
        id: projectResult.sheets.summarySheet.id,
        name: projectResult.sheets.summarySheet.name,
      },
      tasks: {
        id: projectResult.sheets.taskSheet.id,
        name: projectResult.sheets.taskSheet.name,
      },
      resources: {
        id: projectResult.sheets.resourceSheet.id,
        name: projectResult.sheets.resourceSheet.name,
      },
    },
    stats: {
      tasks: taskResult.rowsCreated,
      resources: resourceResult.rowsCreated,
    },
  };

  const outputPath = './sample-workspace-info.json';
  fs.writeFileSync(outputPath, JSON.stringify(workspaceInfo, null, 2));
  console.log(`📄 Workspace info saved to: ${outputPath}\n`);
}

main()
  .then(() => {
    console.log('✨ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error creating sample workspace:', error);
    process.exit(1);
  });