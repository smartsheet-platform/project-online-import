#!/usr/bin/env ts-node
/**
 * Create Enterprise Test Project in Project Online
 *
 * Generates a realistic enterprise-level Microsoft Project with:
 * - Multi-phase structure (Initiation, Planning, Execution, Closure)
 * - Deep task hierarchy (3-4 levels)
 * - Diverse resource pool (PM, Developers, QA, Business Analysts)
 * - Resource assignments with varying allocations
 * - Task dependencies (Finish-to-Start, Start-to-Start)
 * - Milestones at key points
 * - Realistic durations and costs
 *
 * This creates test data INDEPENDENT of the codebase to validate
 * the extraction and transformation logic against real-world structures.
 *
 * Usage:
 *   npm run create-test-project
 */

import * as dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';
import { MSALAuthHandler } from '../src/lib/MSALAuthHandler';
import { Logger } from '../src/util/Logger';

// Load environment
dotenv.config({ path: '.env.test' });

interface ProjectMetadata {
  name: string;
  description: string;
  startDate: string;
  owner: string;
}

interface TaskDefinition {
  name: string;
  duration: number; // in days
  parentName?: string; // if undefined, it's a top-level task
  isMilestone?: boolean;
  predecessors?: string[]; // task names
  notes?: string;
}

interface ResourceDefinition {
  name: string;
  email: string;
  role: string;
  standardRate: number; // per hour
  group: string;
  maxUnits: number; // percentage (100 = full-time)
}

interface AssignmentDefinition {
  taskName: string;
  resourceName: string;
  units: number; // percentage allocation
}

/**
 * Enterprise Project Template
 *
 * Represents a typical Software Platform Modernization project
 */
const ENTERPRISE_PROJECT: ProjectMetadata = {
  name: 'Enterprise Software Platform Modernization',
  description: 'Complete modernization of legacy enterprise software platform including architecture redesign, cloud migration, and system integration',
  startDate: new Date('2024-02-01').toISOString(),
  owner: 'Program Management Office',
};

/**
 * Project Task Structure
 *
 * Realistic 4-phase project with deep hierarchy
 */
const TASKS: TaskDefinition[] = [
  // ========================================
  // PHASE 1: PROJECT INITIATION (30 days)
  // ========================================
  { name: 'Project Initiation', duration: 30 },
  { name: 'Stakeholder Identification', duration: 3, parentName: 'Project Initiation' },
  { name: 'Identify executive sponsors', duration: 1, parentName: 'Stakeholder Identification' },
  { name: 'Map business unit stakeholders', duration: 2, parentName: 'Stakeholder Identification' },
  { name: 'Project Charter Development', duration: 5, parentName: 'Project Initiation', predecessors: ['Stakeholder Identification'] },
  { name: 'Define business objectives', duration: 2, parentName: 'Project Charter Development' },
  { name: 'Establish success criteria', duration: 2, parentName: 'Project Charter Development', predecessors: ['Define business objectives'] },
  { name: 'Risk assessment workshop', duration: 1, parentName: 'Project Charter Development', predecessors: ['Establish success criteria'] },
  { name: 'Charter Approval', duration: 0, parentName: 'Project Initiation', isMilestone: true, predecessors: ['Project Charter Development'], notes: 'Executive sign-off required' },
  { name: 'Initial Requirements Gathering', duration: 15, parentName: 'Project Initiation', predecessors: ['Charter Approval'] },
  { name: 'Business process analysis', duration: 5, parentName: 'Initial Requirements Gathering' },
  { name: 'Technical requirements workshop', duration: 5, parentName: 'Initial Requirements Gathering', predecessors: ['Business process analysis'] },
  { name: 'Integration requirements analysis', duration: 3, parentName: 'Initial Requirements Gathering', predecessors: ['Business process analysis'] },
  { name: 'Requirements documentation', duration: 2, parentName: 'Initial Requirements Gathering', predecessors: ['Technical requirements workshop', 'Integration requirements analysis'] },
  { name: 'Phase 1 Gate Review', duration: 0, parentName: 'Project Initiation', isMilestone: true, predecessors: ['Initial Requirements Gathering'], notes: 'Steering committee approval' },

  // ========================================
  // PHASE 2: PLANNING & DESIGN (60 days)
  // ========================================
  { name: 'Planning and Design', duration: 60, predecessors: ['Phase 1 Gate Review'] },
  { name: 'Architecture Design', duration: 25, parentName: 'Planning and Design' },
  { name: 'Current state architecture documentation', duration: 5, parentName: 'Architecture Design' },
  { name: 'Future state architecture design', duration: 10, parentName: 'Architecture Design', predecessors: ['Current state architecture documentation'] },
  { name: 'Cloud infrastructure design', duration: 5, parentName: 'Architecture Design', predecessors: ['Future state architecture design'] },
  { name: 'Security architecture review', duration: 3, parentName: 'Architecture Design', predecessors: ['Cloud infrastructure design'] },
  { name: 'Architecture approval', duration: 2, parentName: 'Architecture Design', predecessors: ['Security architecture review'] },
  { name: 'Detailed Design', duration: 30, parentName: 'Planning and Design', predecessors: ['Architecture Design'] },
  { name: 'Database schema design', duration: 8, parentName: 'Detailed Design' },
  { name: 'API design and documentation', duration: 10, parentName: 'Detailed Design' },
  { name: 'User interface design', duration: 10, parentName: 'Detailed Design' },
  { name: 'Integration interface specifications', duration: 8, parentName: 'Detailed Design', predecessors: ['API design and documentation'] },
  { name: 'Design review and approval', duration: 2, parentName: 'Detailed Design', predecessors: ['Database schema design', 'API design and documentation', 'User interface design', 'Integration interface specifications'] },
  { name: 'Project Planning', duration: 20, parentName: 'Planning and Design' },
  { name: 'Detailed work breakdown structure', duration: 5, parentName: 'Project Planning' },
  { name: 'Resource allocation planning', duration: 5, parentName: 'Project Planning', predecessors: ['Detailed work breakdown structure'] },
  { name: 'Risk management plan', duration: 4, parentName: 'Project Planning' },
  { name: 'Quality assurance plan', duration: 3, parentName: 'Project Planning' },
  { name: 'Communication plan', duration: 3, parentName: 'Project Planning' },
  { name: 'Design Complete Milestone', duration: 0, parentName: 'Planning and Design', isMilestone: true, predecessors: ['Detailed Design', 'Project Planning'], notes: 'Design freeze - proceed to development' },

  // ========================================
  // PHASE 3: EXECUTION (120 days)
  // ========================================
  { name: 'Execution', duration: 120, predecessors: ['Design Complete Milestone'] },
  { name: 'Infrastructure Setup', duration: 15, parentName: 'Execution' },
  { name: 'Cloud environment provisioning', duration: 5, parentName: 'Infrastructure Setup' },
  { name: 'CI/CD pipeline setup', duration: 5, parentName: 'Infrastructure Setup', predecessors: ['Cloud environment provisioning'] },
  { name: 'Monitoring and logging configuration', duration: 3, parentName: 'Infrastructure Setup', predecessors: ['CI/CD pipeline setup'] },
  { name: 'Security controls implementation', duration: 2, parentName: 'Infrastructure Setup', predecessors: ['Monitoring and logging configuration'] },
  { name: 'Development Sprint 1', duration: 20, parentName: 'Execution', predecessors: ['Infrastructure Setup'] },
  { name: 'Core framework development', duration: 10, parentName: 'Development Sprint 1' },
  { name: 'Authentication module', duration: 8, parentName: 'Development Sprint 1' },
  { name: 'Data access layer', duration: 10, parentName: 'Development Sprint 1' },
  { name: 'Sprint 1 testing', duration: 5, parentName: 'Development Sprint 1', predecessors: ['Core framework development', 'Authentication module', 'Data access layer'] },
  { name: 'Development Sprint 2', duration: 20, parentName: 'Execution', predecessors: ['Development Sprint 1'] },
  { name: 'Business logic implementation', duration: 12, parentName: 'Development Sprint 2' },
  { name: 'API endpoints development', duration: 10, parentName: 'Development Sprint 2' },
  { name: 'UI component development', duration: 12, parentName: 'Development Sprint 2' },
  { name: 'Sprint 2 testing', duration: 5, parentName: 'Development Sprint 2', predecessors: ['Business logic implementation', 'API endpoints development', 'UI component development'] },
  { name: 'Development Sprint 3', duration: 20, parentName: 'Execution', predecessors: ['Development Sprint 2'] },
  { name: 'Integration development', duration: 15, parentName: 'Development Sprint 3' },
  { name: 'Reporting module', duration: 10, parentName: 'Development Sprint 3' },
  { name: 'Performance optimization', duration: 8, parentName: 'Development Sprint 3', predecessors: ['Integration development'] },
  { name: 'Sprint 3 testing', duration: 5, parentName: 'Development Sprint 3', predecessors: ['Integration development', 'Reporting module', 'Performance optimization'] },
  { name: 'System Integration Testing', duration: 25, parentName: 'Execution', predecessors: ['Development Sprint 3'] },
  { name: 'Integration test environment setup', duration: 3, parentName: 'System Integration Testing' },
  { name: 'Integration test execution', duration: 15, parentName: 'System Integration Testing', predecessors: ['Integration test environment setup'] },
  { name: 'Defect resolution', duration: 10, parentName: 'System Integration Testing', predecessors: ['Integration test execution'] },
  { name: 'Integration sign-off', duration: 2, parentName: 'System Integration Testing', predecessors: ['Defect resolution'] },
  { name: 'User Acceptance Testing', duration: 30, parentName: 'Execution', predecessors: ['System Integration Testing'] },
  { name: 'UAT environment preparation', duration: 5, parentName: 'User Acceptance Testing' },
  { name: 'UAT test case execution', duration: 15, parentName: 'User Acceptance Testing', predecessors: ['UAT environment preparation'] },
  { name: 'Business validation', duration: 8, parentName: 'User Acceptance Testing', predecessors: ['UAT test case execution'] },
  { name: 'UAT defect resolution', duration: 5, parentName: 'User Acceptance Testing', predecessors: ['Business validation'] },
  { name: 'UAT sign-off', duration: 2, parentName: 'User Acceptance Testing', predecessors: ['UAT defect resolution'] },
  { name: 'Production Ready Milestone', duration: 0, parentName: 'Execution', isMilestone: true, predecessors: ['User Acceptance Testing'], notes: 'System approved for production deployment' },

  // ========================================
  // PHASE 4: CLOSURE (30 days)
  // ========================================
  { name: 'Project Closure', duration: 30, predecessors: ['Production Ready Milestone'] },
  { name: 'Production Deployment', duration: 10, parentName: 'Project Closure' },
  { name: 'Production deployment planning', duration: 3, parentName: 'Production Deployment' },
  { name: 'Production cutover execution', duration: 2, parentName: 'Production Deployment', predecessors: ['Production deployment planning'] },
  { name: 'Post-deployment verification', duration: 3, parentName: 'Production Deployment', predecessors: ['Production cutover execution'] },
  { name: 'Hypercare support', duration: 5, parentName: 'Production Deployment', predecessors: ['Post-deployment verification'] },
  { name: 'Knowledge Transfer', duration: 15, parentName: 'Project Closure', predecessors: ['Production Deployment'] },
  { name: 'Technical documentation finalization', duration: 5, parentName: 'Knowledge Transfer' },
  { name: 'Operations team training', duration: 8, parentName: 'Knowledge Transfer' },
  { name: 'Support documentation handoff', duration: 3, parentName: 'Knowledge Transfer', predecessors: ['Operations team training'] },
  { name: 'Project Closeout', duration: 10, parentName: 'Project Closure', predecessors: ['Knowledge Transfer'] },
  { name: 'Lessons learned session', duration: 2, parentName: 'Project Closeout' },
  { name: 'Final project report', duration: 5, parentName: 'Project Closeout', predecessors: ['Lessons learned session'] },
  { name: 'Contract closeout', duration: 3, parentName: 'Project Closeout', predecessors: ['Final project report'] },
  { name: 'Project Complete', duration: 0, parentName: 'Project Closure', isMilestone: true, predecessors: ['Project Closeout'], notes: 'Project officially closed' },
];

/**
 * Enterprise Resource Pool
 *
 * Realistic mix of roles and rates
 */
const RESOURCES: ResourceDefinition[] = [
  // Program Management
  { name: 'Jennifer Martinez', email: 'j.martinez@enterprise.com', role: 'Program Manager', standardRate: 150, group: 'PMO', maxUnits: 50 },
  { name: 'David Thompson', email: 'd.thompson@enterprise.com', role: 'Project Manager', standardRate: 125, group: 'PMO', maxUnits: 100 },
  { name: 'Emily Chen', email: 'e.chen@enterprise.com', role: 'Business Analyst', standardRate: 95, group: 'Business Analysis', maxUnits: 100 },

  // Architecture & Design
  { name: 'Robert Anderson', email: 'r.anderson@enterprise.com', role: 'Enterprise Architect', standardRate: 140, group: 'Architecture', maxUnits: 50 },
  { name: 'Maria Garcia', email: 'm.garcia@enterprise.com', role: 'Solution Architect', standardRate: 130, group: 'Architecture', maxUnits: 100 },
  { name: 'James Wilson', email: 'j.wilson@enterprise.com', role: 'Security Architect', standardRate: 135, group: 'Architecture', maxUnits: 50 },

  // Development Team
  { name: 'Sarah Johnson', email: 's.johnson@enterprise.com', role: 'Senior Developer', standardRate: 110, group: 'Development', maxUnits: 100 },
  { name: 'Michael Brown', email: 'm.brown@enterprise.com', role: 'Senior Developer', standardRate: 110, group: 'Development', maxUnits: 100 },
  { name: 'Jessica Lee', email: 'j.lee@enterprise.com', role: 'Full Stack Developer', standardRate: 95, group: 'Development', maxUnits: 100 },
  { name: 'Christopher Davis', email: 'c.davis@enterprise.com', role: 'Full Stack Developer', standardRate: 95, group: 'Development', maxUnits: 100 },
  { name: 'Amanda White', email: 'a.white@enterprise.com', role: 'Frontend Developer', standardRate: 85, group: 'Development', maxUnits: 100 },
  { name: 'Daniel Miller', email: 'd.miller@enterprise.com', role: 'Backend Developer', standardRate: 90, group: 'Development', maxUnits: 100 },

  // Quality Assurance
  { name: 'Lisa Taylor', email: 'l.taylor@enterprise.com', role: 'QA Lead', standardRate: 100, group: 'Quality Assurance', maxUnits: 100 },
  { name: 'Kevin Moore', email: 'k.moore@enterprise.com', role: 'QA Engineer', standardRate: 80, group: 'Quality Assurance', maxUnits: 100 },
  { name: 'Rachel Martinez', email: 'r.martinez@enterprise.com', role: 'Test Automation Engineer', standardRate: 90, group: 'Quality Assurance', maxUnits: 100 },

  // Infrastructure
  { name: 'Thomas Jackson', email: 't.jackson@enterprise.com', role: 'DevOps Engineer', standardRate: 105, group: 'Infrastructure', maxUnits: 75 },
  { name: 'Patricia Harris', email: 'p.harris@enterprise.com', role: 'Cloud Engineer', standardRate: 110, group: 'Infrastructure', maxUnits: 50 },
];

/**
 * Resource Assignments
 *
 * Maps resources to tasks with realistic allocations
 */
const ASSIGNMENTS: AssignmentDefinition[] = [
  // Phase 1: Initiation
  { taskName: 'Identify executive sponsors', resourceName: 'Jennifer Martinez', units: 50 },
  { taskName: 'Identify executive sponsors', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Map business unit stakeholders', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Map business unit stakeholders', resourceName: 'Emily Chen', units: 100 },
  { taskName: 'Define business objectives', resourceName: 'Jennifer Martinez', units: 50 },
  { taskName: 'Define business objectives', resourceName: 'Emily Chen', units: 100 },
  { taskName: 'Establish success criteria', resourceName: 'Emily Chen', units: 100 },
  { taskName: 'Risk assessment workshop', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Business process analysis', resourceName: 'Emily Chen', units: 100 },
  { taskName: 'Technical requirements workshop', resourceName: 'Robert Anderson', units: 50 },
  { taskName: 'Technical requirements workshop', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Integration requirements analysis', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Requirements documentation', resourceName: 'Emily Chen', units: 100 },

  // Phase 2: Planning & Design
  { taskName: 'Current state architecture documentation', resourceName: 'Robert Anderson', units: 50 },
  { taskName: 'Current state architecture documentation', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Future state architecture design', resourceName: 'Robert Anderson', units: 50 },
  { taskName: 'Future state architecture design', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Cloud infrastructure design', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Cloud infrastructure design', resourceName: 'Patricia Harris', units: 50 },
  { taskName: 'Security architecture review', resourceName: 'James Wilson', units: 50 },
  { taskName: 'Database schema design', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Database schema design', resourceName: 'Daniel Miller', units: 100 },
  { taskName: 'API design and documentation', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'API design and documentation', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'User interface design', resourceName: 'Amanda White', units: 100 },
  { taskName: 'Integration interface specifications', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Detailed work breakdown structure', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Resource allocation planning', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Risk management plan', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Quality assurance plan', resourceName: 'Lisa Taylor', units: 100 },

  // Phase 3: Execution
  { taskName: 'Cloud environment provisioning', resourceName: 'Patricia Harris', units: 50 },
  { taskName: 'Cloud environment provisioning', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'CI/CD pipeline setup', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'Monitoring and logging configuration', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'Security controls implementation', resourceName: 'James Wilson', units: 50 },
  { taskName: 'Core framework development', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Core framework development', resourceName: 'Michael Brown', units: 100 },
  { taskName: 'Authentication module', resourceName: 'Michael Brown', units: 100 },
  { taskName: 'Data access layer', resourceName: 'Daniel Miller', units: 100 },
  { taskName: 'Sprint 1 testing', resourceName: 'Kevin Moore', units: 100 },
  { taskName: 'Business logic implementation', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Business logic implementation', resourceName: 'Jessica Lee', units: 100 },
  { taskName: 'API endpoints development', resourceName: 'Michael Brown', units: 100 },
  { taskName: 'API endpoints development', resourceName: 'Daniel Miller', units: 100 },
  { taskName: 'UI component development', resourceName: 'Amanda White', units: 100 },
  { taskName: 'UI component development', resourceName: 'Christopher Davis', units: 100 },
  { taskName: 'Sprint 2 testing', resourceName: 'Kevin Moore', units: 100 },
  { taskName: 'Sprint 2 testing', resourceName: 'Rachel Martinez', units: 100 },
  { taskName: 'Integration development', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Integration development', resourceName: 'Michael Brown', units: 100 },
  { taskName: 'Reporting module', resourceName: 'Jessica Lee', units: 100 },
  { taskName: 'Performance optimization', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Sprint 3 testing', resourceName: 'Lisa Taylor', units: 100 },
  { taskName: 'Sprint 3 testing', resourceName: 'Rachel Martinez', units: 100 },
  { taskName: 'Integration test environment setup', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'Integration test execution', resourceName: 'Lisa Taylor', units: 100 },
  { taskName: 'Integration test execution', resourceName: 'Kevin Moore', units: 100 },
  { taskName: 'Integration test execution', resourceName: 'Rachel Martinez', units: 100 },
  { taskName: 'Defect resolution', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Defect resolution', resourceName: 'Michael Brown', units: 100 },
  { taskName: 'UAT environment preparation', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'UAT test case execution', resourceName: 'Emily Chen', units: 100 },
  { taskName: 'UAT test case execution', resourceName: 'Lisa Taylor', units: 100 },
  { taskName: 'Business validation', resourceName: 'Emily Chen', units: 100 },
  { taskName: 'UAT defect resolution', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'UAT defect resolution', resourceName: 'Michael Brown', units: 100 },

  // Phase 4: Closure
  { taskName: 'Production deployment planning', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Production deployment planning', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'Production cutover execution', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'Production cutover execution', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Post-deployment verification', resourceName: 'Lisa Taylor', units: 100 },
  { taskName: 'Hypercare support', resourceName: 'Sarah Johnson', units: 50 },
  { taskName: 'Hypercare support', resourceName: 'Michael Brown', units: 50 },
  { taskName: 'Technical documentation finalization', resourceName: 'Maria Garcia', units: 100 },
  { taskName: 'Operations team training', resourceName: 'Sarah Johnson', units: 100 },
  { taskName: 'Operations team training', resourceName: 'Thomas Jackson', units: 75 },
  { taskName: 'Lessons learned session', resourceName: 'David Thompson', units: 100 },
  { taskName: 'Final project report', resourceName: 'David Thompson', units: 100 },
];

/**
 * Project Creation Service
 */
class EnterpriseProjectCreator {
  private httpClient: AxiosInstance;
  private authHandler: MSALAuthHandler;
  private logger: Logger;
  private baseUrl: string;

  constructor() {
    this.logger = new Logger();
    this.baseUrl = process.env.PROJECT_ONLINE_URL!.replace(/\/$/, '');

    // Initialize auth handler
    this.authHandler = new MSALAuthHandler(
      {
        tenantId: process.env.TENANT_ID!,
        clientId: process.env.CLIENT_ID!,
        projectOnlineUrl: process.env.PROJECT_ONLINE_URL!,
      },
      this.logger
    );

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: `${this.baseUrl}/_api/ProjectServer`,
      timeout: 60000,
      headers: {
        Accept: 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      },
    });

    // Add auth interceptor
    this.httpClient.interceptors.request.use(async (config) => {
      const token = await this.authHandler.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Main orchestration: Create the complete enterprise project
   */
  async createEnterpriseProject(): Promise<void> {
    this.logger.info('\n' + '='.repeat(80));
    this.logger.info('Creating Enterprise Test Project in Project Online');
    this.logger.info('='.repeat(80) + '\n');

    this.logger.info(`Project: ${ENTERPRISE_PROJECT.name}`);
    this.logger.info(`Tasks: ${TASKS.length}`);
    this.logger.info(`Resources: ${RESOURCES.length}`);
    this.logger.info(`Assignments: ${ASSIGNMENTS.length}\n`);

    try {
      // Step 1: Create project
      this.logger.info('Step 1: Creating project...');
      const projectId = await this.createProject();
      this.logger.success(`✓ Project created: ${projectId}\n`);

      // Step 2: Add tasks with hierarchy
      this.logger.info('Step 2: Creating task structure...');
      const taskMap = await this.createTasks(projectId);
      this.logger.success(`✓ ${TASKS.length} tasks created\n`);

      // Step 3: Add resources to enterprise resource pool
      this.logger.info('Step 3: Adding resources to enterprise pool...');
      const resourceMap = await this.createResources();
      this.logger.success(`✓ ${RESOURCES.length} resources added\n`);

      // Step 4: Build project team
      this.logger.info('Step 4: Building project team...');
      await this.buildProjectTeam(projectId, Array.from(resourceMap.values()));
      this.logger.success(`✓ Project team built\n`);

      // Step 5: Create assignments
      this.logger.info('Step 5: Creating resource assignments...');
      await this.createAssignments(projectId, taskMap, resourceMap);
      this.logger.success(`✓ ${ASSIGNMENTS.length} assignments created\n`);

      // Step 6: Publish project
      this.logger.info('Step 6: Publishing project...');
      await this.publishProject(projectId);
      this.logger.success(`✓ Project published\n`);

      this.logger.success('='.repeat(80));
      this.logger.success('✓ Enterprise project created successfully!');
      this.logger.success('='.repeat(80) + '\n');

      this.logger.info(`View your project at:`);
      this.logger.info(`${this.baseUrl}/Projects.aspx\n`);

      this.logger.info(`Extract the data with:`);
      this.logger.info(`npm run extract-real-data ${projectId}\n`);
    } catch (error: any) {
      this.logger.error(`\n✗ Project creation failed: ${error}`);

      // Log detailed error information for debugging
      if (error.response) {
        this.logger.error(`\nHTTP Status: ${error.response.status}`);
        this.logger.error(`Response Headers:`, JSON.stringify(error.response.headers, null, 2));
        this.logger.error(`Response Data:`, JSON.stringify(error.response.data, null, 2));
      }

      if (error instanceof Error && error.stack) {
        this.logger.error(`\nStack trace:\n${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Create the project entity
   * Note: Creates a draft project, not a published one
   */
  private async createProject(): Promise<string> {
    // Create a draft project (not published)
    const response = await this.httpClient.post('/Projects/Add', {
      parameters: {
        Name: ENTERPRISE_PROJECT.name,
      }
    });

    const projectId = response.data.d.Id;
    this.logger.debug(`Draft project created with ID: ${projectId}`);

    // Check out the project for editing
    await this.httpClient.post(`/Projects('${projectId}')/checkOut`);
    this.logger.debug(`Project checked out`);

    // Update project properties
    await this.httpClient.post(`/Projects('${projectId}')/Draft`, {
      __metadata: { type: 'PS.DraftProject' },
      Description: ENTERPRISE_PROJECT.description,
      Start: ENTERPRISE_PROJECT.startDate,
    });
    this.logger.debug(`Project properties updated`);

    return projectId;
  }

  /**
   * Create all tasks with proper hierarchy and dependencies
   */
  private async createTasks(projectId: string): Promise<Map<string, string>> {
    const taskMap = new Map<string, string>();
    const taskIdMap = new Map<string, number>(); // name -> sequential ID

    // Project is already checked out from createProject()
    // Create tasks in order (parent tasks must be created before children)
    let taskId = 1;
    for (const task of TASKS) {
      taskIdMap.set(task.name, taskId);

      const taskData: any = {
        __metadata: { type: 'PS.DraftTask' },
        Name: task.name,
        Duration: `P${task.duration}D`, // ISO 8601 duration
        Id: taskId,
      };

      // Set parent if specified
      if (task.parentName) {
        const parentId = taskIdMap.get(task.parentName);
        if (parentId) {
          taskData.ParentTaskId = parentId;
        }
      }

      // Set milestone flag
      if (task.isMilestone) {
        taskData.IsMilestone = true;
        taskData.Duration = 'P0D';
      }

      // Set notes
      if (task.notes) {
        taskData.Notes = task.notes;
      }

      const response = await this.httpClient.post(`/Projects('${projectId}')/Draft/Tasks`, taskData);

      taskMap.set(task.name, response.data.d.Id);
      taskId++;
    }

    // TODO: Add predecessors (requires separate API call after all tasks created)
    // This would use the task links API: /Projects('{id}')/Draft/TaskLinks

    return taskMap;
  }

  /**
   * Add resources to enterprise resource pool
   */
  private async createResources(): Promise<Map<string, string>> {
    const resourceMap = new Map<string, string>();

    for (const resource of RESOURCES) {
      const response = await this.httpClient.post('/EnterpriseResources', {
        __metadata: { type: 'PS.EnterpriseResource' },
        Name: resource.name,
        Email: resource.email,
        ResourceType: 1, // Work resource
        StandardRate: resource.standardRate,
        Group: resource.group,
        MaxUnits: resource.maxUnits / 100, // Convert percentage to decimal
      });

      resourceMap.set(resource.name, response.data.d.Id);
    }

    return resourceMap;
  }

  /**
   * Build project team from enterprise resources
   */
  private async buildProjectTeam(projectId: string, resourceIds: string[]): Promise<void> {
    await this.httpClient.post(`/Projects('${projectId}')/Draft/TeamResources/Add`, {
      ResourceIds: { results: resourceIds },
    });
  }

  /**
   * Create resource assignments
   */
  private async createAssignments(
    projectId: string,
    taskMap: Map<string, string>,
    resourceMap: Map<string, string>
  ): Promise<void> {
    for (const assignment of ASSIGNMENTS) {
      const taskId = taskMap.get(assignment.taskName);
      const resourceId = resourceMap.get(assignment.resourceName);

      if (!taskId || !resourceId) {
        this.logger.warn(`Skipping assignment: ${assignment.taskName} -> ${assignment.resourceName}`);
        continue;
      }

      await this.httpClient.post(`/Projects('${projectId}')/Draft/Assignments`, {
        __metadata: { type: 'PS.DraftAssignment' },
        TaskId: taskId,
        ResourceId: resourceId,
        Units: assignment.units / 100, // Convert percentage to decimal
      });
    }
  }

  /**
   * Publish the project to make it visible
   */
  private async publishProject(projectId: string): Promise<void> {
    await this.httpClient.post(`/Projects('${projectId}')/Draft/Publish(true)`);
  }
}

/**
 * Main execution
 */
async function main() {
  const creator = new EnterpriseProjectCreator();
  await creator.createEnterpriseProject();
}

// Run
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
