/**
 * Project Online OData Client
 * Handles HTTP requests to Project Online REST API
 * Matches MockODataClient API for seamless testing
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ProjectOnlineProject,
  ProjectOnlineTask,
  ProjectOnlineResource,
  ProjectOnlineAssignment,
  ODataQueryOptions,
  ODataCollectionResponse,
} from '../types/ProjectOnline';
import { MSALAuthHandler, AuthConfig } from './auth/MSALAuthHandler';
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';
import { tryWith as withBackoff } from '../util/ExponentialBackoff';

export interface ProjectOnlineClientConfig extends AuthConfig {
  timeout?: number; // Request timeout in milliseconds
  maxRetries?: number; // Maximum retry attempts
  rateLimitPerMinute?: number; // API rate limit
}

export class ProjectOnlineClient {
  private httpClient: AxiosInstance;
  private authHandler: MSALAuthHandler;
  private logger: Logger;
  private config: ProjectOnlineClientConfig;
  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();

  constructor(config: ProjectOnlineClientConfig, logger?: Logger) {
    this.config = {
      timeout: config.timeout ?? 30000, // 30 seconds default
      maxRetries: config.maxRetries ?? 3,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 300, // Conservative default
      ...config,
    };

    this.logger = logger ?? new Logger();
    this.authHandler = new MSALAuthHandler(config, this.logger);

    // Initialize Axios client
    this.httpClient = axios.create({
      baseURL: this.getApiBaseUrl(),
      timeout: this.config.timeout,
      headers: {
        Accept: 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      },
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        const token = await this.authHandler.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleHttpError(error)
    );

    this.logger.debug('Project Online client initialized');
  }

  /**
   * Get API base URL from Project Online URL
   */
  private getApiBaseUrl(): string {
    const url = this.config.projectOnlineUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${url}/_api/ProjectData`;
  }

  /**
   * Handle HTTP errors with retry logic
   */
  private async handleHttpError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const message = error.message;

    // Authentication errors
    if (status === 401) {
      this.authHandler.clearCache();
      throw ErrorHandler.authError(
        'Authentication failed (401 Unauthorized)',
        'Your access token may have expired. The client will attempt to refresh it on the next request.'
      );
    }

    // Authorization errors
    if (status === 403) {
      throw ErrorHandler.authError(
        'Access forbidden (403 Forbidden)',
        'Your Azure AD app may not have the required permissions (Sites.ReadWrite.All) or admin consent is not granted.'
      );
    }

    // Rate limiting
    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      throw ErrorHandler.rateLimitError(retryAfter ? parseInt(retryAfter) * 1000 : undefined);
    }

    // Server errors (5xx)
    if (status && status >= 500) {
      throw ErrorHandler.apiError(
        `Project Online server error (${status})`,
        'The Project Online server is experiencing issues. This may be temporary.'
      );
    }

    // Network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw ErrorHandler.networkError(
        'Request timed out',
        `Increase timeout or check network connectivity. Current timeout: ${this.config.timeout}ms`
      );
    }

    // Generic error
    throw ErrorHandler.apiError(
      `HTTP request failed: ${message}`,
      `Status: ${status ?? 'unknown'}`
    );
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute

    // Reset counter if window has passed
    if (now - this.requestWindowStart >= windowDuration) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // Check if we're over the limit
    if (this.requestCount >= this.config.rateLimitPerMinute!) {
      const waitMs = windowDuration - (now - this.requestWindowStart);
      this.logger.warn(`Rate limit reached. Waiting ${Math.ceil(waitMs / 1000)}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Build OData query string from options
   */
  private buildQueryString(options?: ODataQueryOptions): string {
    if (!options) return '';

    const params: string[] = [];

    if (options.$select && options.$select.length > 0) {
      params.push(`$select=${options.$select.join(',')}`);
    }

    if (options.$filter) {
      params.push(`$filter=${encodeURIComponent(options.$filter)}`);
    }

    if (options.$orderby) {
      params.push(`$orderby=${encodeURIComponent(options.$orderby)}`);
    }

    if (options.$top !== undefined) {
      params.push(`$top=${options.$top}`);
    }

    if (options.$skip !== undefined) {
      params.push(`$skip=${options.$skip}`);
    }

    if (options.$expand && options.$expand.length > 0) {
      params.push(`$expand=${options.$expand.join(',')}`);
    }

    return params.length > 0 ? `?${params.join('&')}` : '';
  }

  /**
   * Execute HTTP GET request with retry logic
   */
  private async executeGet<T>(url: string): Promise<T> {
    return withBackoff(
      async () => {
        await this.checkRateLimit();
        this.logger.debug(`GET ${url}`);
        const response = await this.httpClient.get<T>(url);
        return response.data;
      },
      undefined,
      undefined,
      this.logger
    );
  }

  /**
   * Handle paginated OData responses
   */
  private async fetchAllPages<T>(
    initialUrl: string,
    entityName: string
  ): Promise<ODataCollectionResponse<T>> {
    const allItems: T[] = [];
    let nextLink: string | undefined = initialUrl;
    let pageCount = 0;

    while (nextLink) {
      pageCount++;
      this.logger.debug(`Fetching ${entityName} page ${pageCount}...`);

      const response: ODataCollectionResponse<T> =
        await this.executeGet<ODataCollectionResponse<T>>(nextLink);

      if (response.value && response.value.length > 0) {
        allItems.push(...response.value);
        this.logger.debug(`  Retrieved ${response.value.length} items (total: ${allItems.length})`);
      }

      // Check for next page
      nextLink = response['@odata.nextLink'];

      // Handle relative URLs
      if (nextLink && !nextLink.startsWith('http')) {
        const baseUrl = this.config.projectOnlineUrl.replace(/\/$/, '');
        nextLink = `${baseUrl}${nextLink}`;
      }
    }

    this.logger.debug(
      `Completed fetching ${allItems.length} ${entityName} items in ${pageCount} page(s)`
    );

    return {
      value: allItems,
      '@odata.count': allItems.length,
    };
  }

  /**
   * Get all projects
   */
  async getProjects(
    options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineProject>> {
    const queryString = this.buildQueryString(options);
    const url = `/Projects${queryString}`;
    return this.fetchAllPages<ProjectOnlineProject>(url, 'Projects');
  }

  /**
   * Get single project by ID
   */
  async getProject(projectId: string): Promise<ProjectOnlineProject> {
    const url = `/Projects('${projectId}')`;
    const response: { d?: ProjectOnlineProject } | ProjectOnlineProject = await this.executeGet<
      { d: ProjectOnlineProject } | ProjectOnlineProject
    >(url);

    // OData verbose format wraps the result in a 'd' property
    if ('d' in response && response.d) {
      return response.d;
    }
    return response as ProjectOnlineProject;
  }

  /**
   * Get tasks for a project (or all tasks if no projectId)
   */
  async getTasks(
    projectId?: string,
    options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineTask>> {
    const filter = projectId ? `ProjectId eq guid'${projectId}'` : undefined;
    const mergedOptions: ODataQueryOptions = {
      ...options,
      $filter: filter
        ? options?.$filter
          ? `(${options.$filter}) and (${filter})`
          : filter
        : options?.$filter,
    };

    const queryString = this.buildQueryString(mergedOptions);
    const url = `/Tasks${queryString}`;
    return this.fetchAllPages<ProjectOnlineTask>(url, 'Tasks');
  }

  /**
   * Get all resources
   */
  async getResources(
    options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineResource>> {
    const queryString = this.buildQueryString(options);
    const url = `/Resources${queryString}`;
    return this.fetchAllPages<ProjectOnlineResource>(url, 'Resources');
  }

  /**
   * Get assignments for a project (or all assignments if no projectId)
   */
  async getAssignments(
    projectId?: string,
    options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineAssignment>> {
    const filter = projectId ? `ProjectId eq guid'${projectId}'` : undefined;
    const mergedOptions: ODataQueryOptions = {
      ...options,
      $filter: filter
        ? options?.$filter
          ? `(${options.$filter}) and (${filter})`
          : filter
        : options?.$filter,
    };

    const queryString = this.buildQueryString(mergedOptions);
    const url = `/Assignments${queryString}`;
    return this.fetchAllPages<ProjectOnlineAssignment>(url, 'Assignments');
  }

  /**
   * Extract complete project data (project + tasks + resources + assignments)
   */
  async extractProjectData(projectId: string): Promise<{
    project: ProjectOnlineProject;
    tasks: ProjectOnlineTask[];
    resources: ProjectOnlineResource[];
    assignments: ProjectOnlineAssignment[];
  }> {
    this.logger.info(`Extracting data for project: ${projectId}`);

    // Fetch project
    const project = await this.getProject(projectId);
    this.logger.debug(`✓ Project: ${project.Name}`);

    // Fetch tasks
    const tasksResponse = await this.getTasks(projectId);
    this.logger.debug(`✓ Tasks: ${tasksResponse.value.length}`);

    // Fetch resources
    const resourcesResponse = await this.getResources();
    this.logger.debug(`✓ Resources: ${resourcesResponse.value.length}`);

    // Fetch assignments
    const assignmentsResponse = await this.getAssignments(projectId);
    this.logger.debug(`✓ Assignments: ${assignmentsResponse.value.length}`);

    return {
      project,
      tasks: tasksResponse.value,
      resources: resourcesResponse.value,
      assignments: assignmentsResponse.value,
    };
  }

  /**
   * Test connection to Project Online
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing connection to Project Online...');

      // Test authentication
      const authSuccess = await this.authHandler.testAuthentication();
      if (!authSuccess) {
        return false;
      }

      // Try to fetch projects (with $top=1 to minimize data)
      await this.getProjects({ $top: 1 });

      this.logger.success('✓ Connection to Project Online successful');
      return true;
    } catch (error) {
      this.logger.error(
        `✗ Connection test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}
