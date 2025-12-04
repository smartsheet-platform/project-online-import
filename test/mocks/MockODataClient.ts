/**
 * Mock OData client for testing transformation logic
 * Simulates Project Online oData API without requiring network calls
 */

import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
  ODataQueryOptions,
  ODataCollectionResponse,
} from '../../src/types/ProjectOnline';

export class MockODataClient {
  private projects: Map<string, ProjectOnlineProject> = new Map();
  private tasks: Map<string, ProjectOnlineTask> = new Map();
  private resources: Map<string, ProjectOnlineResource> = new Map();
  private assignments: Map<string, ProjectOnlineAssignment> = new Map();
  private callCount: Map<string, number> = new Map();
  private shouldFail: boolean = false;
  private failureCount: number = 0;

  /**
   * Add mock project data
   */
  addProject(project: ProjectOnlineProject): void {
    this.projects.set(project.Id, project);
  }

  /**
   * Add mock task data
   */
  addTask(task: ProjectOnlineTask): void {
    this.tasks.set(task.Id, task);
  }

  /**
   * Add mock resource data
   */
  addResource(resource: ProjectOnlineResource): void {
    this.resources.set(resource.Id, resource);
  }

  /**
   * Add mock assignment data
   */
  addAssignment(assignment: ProjectOnlineAssignment): void {
    this.assignments.set(assignment.Id, assignment);
  }

  /**
   * Configure client to fail for testing exponential backoff
   */
  setFailureMode(shouldFail: boolean, failureCount: number = 1): void {
    this.shouldFail = shouldFail;
    this.failureCount = failureCount;
  }

  /**
   * Get call count for a specific endpoint
   */
  getCallCount(endpoint: string): number {
    return this.callCount.get(endpoint) || 0;
  }

  /**
   * Reset all mock data and state
   */
  reset(): void {
    this.projects.clear();
    this.tasks.clear();
    this.resources.clear();
    this.assignments.clear();
    this.callCount.clear();
    this.shouldFail = false;
    this.failureCount = 0;
  }

  /**
   * Simulate API failure for testing retry logic
   */
  private checkFailure(endpoint: string): void {
    const count = this.getCallCount(endpoint);
    this.callCount.set(endpoint, count + 1);

    if (this.shouldFail && count < this.failureCount) {
      throw new Error(`Mock API failure for ${endpoint} (attempt ${count + 1})`);
    }
  }

  /**
   * Get projects from mock data
   */
  async getProjects(
    _options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineProject>> {
    const endpoint = 'Projects';
    this.checkFailure(endpoint);

    return {
      value: Array.from(this.projects.values()),
      '@odata.count': this.projects.size,
    };
  }

  /**
   * Get single project by ID
   */
  async getProject(projectId: string): Promise<ProjectOnlineProject> {
    const endpoint = `Projects('${projectId}')`;
    this.checkFailure(endpoint);

    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }

  /**
   * Get tasks for a project
   */
  async getTasks(
    projectId?: string,
    _options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineTask>> {
    const endpoint = 'Tasks';
    this.checkFailure(endpoint);

    let tasks = Array.from(this.tasks.values());

    if (projectId) {
      tasks = tasks.filter((t) => t.ProjectId === projectId);
    }

    // Sort by TaskIndex to maintain order
    tasks.sort((a, b) => a.TaskIndex - b.TaskIndex);

    return {
      value: tasks,
      '@odata.count': tasks.length,
    };
  }

  /**
   * Get resources
   */
  async getResources(
    _options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineResource>> {
    const endpoint = 'Resources';
    this.checkFailure(endpoint);

    return {
      value: Array.from(this.resources.values()),
      '@odata.count': this.resources.size,
    };
  }

  /**
   * Get assignments for a project
   */
  async getAssignments(
    projectId?: string,
    _options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineAssignment>> {
    const endpoint = 'Assignments';
    this.checkFailure(endpoint);

    let assignments = Array.from(this.assignments.values());

    if (projectId) {
      assignments = assignments.filter((a) => a.ProjectId === projectId);
    }

    return {
      value: assignments,
      '@odata.count': assignments.length,
    };
  }
}
