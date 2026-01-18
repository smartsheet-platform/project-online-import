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
import { MSALAuthHandler, AuthConfig } from './MSALAuthHandler';
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';
import { tryWith as withBackoff } from '../util/ExponentialBackoff';

/**
 * OData verbose format response (used by Project Server API)
 * Collections can be in 'results' property with '__next' for pagination
 * Or in 'value' property with '@odata.nextLink' for modern format
 */
interface ODataVerboseCollectionResponse<T> {
  results?: T[];
  value?: T[];
  __next?: string;
  '@odata.nextLink'?: string;
}

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
   * Using ProjectServer (CSOM) instead of ProjectData (legacy OData) for OAuth support
   */
  private getApiBaseUrl(): string {
    const url = this.config.projectOnlineUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${url}/_api/ProjectServer`;
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
        'Your Azure AD app may not have the required delegated permissions (AllSites.Read, AllSites.Write) or your user account does not have access to this Project Online site.'
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
   * Handles OData verbose format where responses are wrapped in 'd' property
   */
  private async executeGet<T>(url: string): Promise<T> {
    return withBackoff(
      async () => {
        await this.checkRateLimit();

        // Log the full URL being requested
        const fullUrl = url.startsWith('http') ? url : `${this.getApiBaseUrl()}${url}`;
        this.logger.debug(`GET ${fullUrl}`);

        const response = await this.httpClient.get(url);

        // Debug: Log response structure
        this.logger.debug(`Response keys: ${Object.keys(response.data || {}).join(', ')}`);

        // OData verbose format wraps everything in 'd' property
        if (response.data && typeof response.data === 'object' && 'd' in response.data) {
          this.logger.debug(`Unwrapping 'd' property`);
          return response.data.d as T;
        }

        this.logger.debug(`No 'd' wrapper found, returning data directly`);
        return response.data as T;
      },
      undefined,
      undefined,
      this.logger
    );
  }

  /**
   * Handle paginated OData responses
   * Supports both modern OData (value/@odata.nextLink) and verbose format (results/__next)
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

      // Get raw response (already unwrapped from 'd' by executeGet)
      const response: ODataVerboseCollectionResponse<T> =
        await this.executeGet<ODataVerboseCollectionResponse<T>>(nextLink);

      // Handle OData verbose format where collection is in 'results' property
      let items: T[] = [];
      if (response.results && Array.isArray(response.results)) {
        // OData verbose format (v2/v3): { results: [...], __next: "..." }
        items = response.results;
      } else if (response.value && Array.isArray(response.value)) {
        // Modern OData format (v4): { value: [...], @odata.nextLink: "..." }
        items = response.value;
      } else if (Array.isArray(response)) {
        // Direct array (no wrapper)
        items = response;
      }

      if (items.length > 0) {
        allItems.push(...items);
        this.logger.debug(`  Retrieved ${items.length} items (total: ${allItems.length})`);
      }

      // Check for next page - support both verbose and modern formats
      nextLink = response.__next || response['@odata.nextLink'] || undefined;

      // Handle relative URLs - must include /_api/ prefix
      if (nextLink && !nextLink.startsWith('http')) {
        const baseUrl = this.config.projectOnlineUrl.replace(/\/$/, '');
        // If nextLink doesn't start with /, prepend it
        if (!nextLink.startsWith('/')) {
          nextLink = '/' + nextLink;
        }
        // If nextLink doesn't include /_api/, we need to add it
        if (!nextLink.startsWith('/_api/')) {
          nextLink = `${baseUrl}/_api/${nextLink.replace(/^\//, '')}`;
        } else {
          nextLink = `${baseUrl}${nextLink}`;
        }
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
   * Note: executeGet already unwraps the 'd' property from verbose responses
   */
  async getProject(projectId: string): Promise<ProjectOnlineProject> {
    // OData requires 'guid' prefix for GUID values
    const url = `/Projects(guid'${projectId}')`;
    return this.executeGet<ProjectOnlineProject>(url);
  }

  /**
   * Get tasks for a project (or all tasks if no projectId)
   * Note: Tasks must be accessed via Projects navigation property, not as standalone collection
   */
  async getTasks(
    projectId?: string,
    options?: ODataQueryOptions
  ): Promise<ODataCollectionResponse<ProjectOnlineTask>> {
    if (!projectId) {
      // If no project ID, we cannot fetch tasks (no standalone /Tasks endpoint)
      this.logger.warn(
        'Cannot fetch tasks without projectId - Tasks endpoint requires project context'
      );
      return { value: [], '@odata.count': 0 };
    }

    // Access tasks via project navigation property: /Projects(guid'...')/Tasks
    const queryString = this.buildQueryString(options);
    const url = `/Projects(guid'${projectId}')/Tasks${queryString}`;
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

    // Fetch project with expanded related entities using $expand
    // This avoids navigation property issues where endpoints like /Projects(guid'...')/Tasks return 404
    this.logger.info('Fetching project with related entities using $expand...');

    try {
      const projectsResponse = await this.getProjects({
        $filter: `Id eq guid'${projectId}'`,
        $expand: ['Assignments',  'Tasks/Parent', 'Tasks/Predecessors', 'Tasks/Assignments/Resource', 'ProjectResources', 'Owner'], // Expand Resource and Task within Assignments
        $top: 1,
      });

      if (projectsResponse.value.length === 0) {
        throw ErrorHandler.apiError(
          `Project not found: ${projectId}`,
          'The project may have been deleted or you may not have permission to access it.'
        );
      }

      // Get project with expanded entities (Tasks, Assignments, and Resources may be in 'results' or direct array)
      const projectWithExpanded = projectsResponse.value[0] as ProjectOnlineProject & {
        Tasks?: { results?: ProjectOnlineTask[] } | ProjectOnlineTask[];
        Assignments?: { results?: ProjectOnlineAssignment[] } | ProjectOnlineAssignment[];
        ProjectResources?: { results?: ProjectOnlineResource[] } | ProjectOnlineResource[];
        Owner?: any;
      };
      const project = projectWithExpanded;
      project.OwnerEmail = projectWithExpanded.Owner?.UserPrincipalName;
      project.Owner = projectWithExpanded.Owner?.Title || '';
      
      this.logger.success(`✓ Project: ${project.Name}`);
      
      // Extract expanded entities - handle both verbose format (with 'results') and direct arrays
      const tasks =
        (projectWithExpanded.Tasks &&
          'results' in projectWithExpanded.Tasks &&
          projectWithExpanded.Tasks.results) ||
        (Array.isArray(projectWithExpanded.Tasks) ? projectWithExpanded.Tasks : []);
      

      console.log(tasks[1]?.Predecessors?.results);

      const assignments =
        (projectWithExpanded.Assignments &&
          'results' in projectWithExpanded.Assignments &&
          projectWithExpanded.Assignments.results) ||
        (Array.isArray(projectWithExpanded.Assignments) ? projectWithExpanded.Assignments : []);

      // Try to extract resources from $expand first
      const resources =
        (projectWithExpanded.ProjectResources &&
          'results' in projectWithExpanded.ProjectResources &&
          projectWithExpanded.ProjectResources.results) ||
        (Array.isArray(projectWithExpanded.ProjectResources) ? projectWithExpanded.ProjectResources : []);

      this.logger.success(`✓ Tasks: ${tasks.length} (via $expand)`);
      this.logger.success(`✓ Assignments: ${assignments.length} (via $expand)`);
      this.logger.success(`✓ Resources: ${resources.length} (via $expand)`);

      return {
        project,
        tasks,
        resources,
        assignments,
      };
    } catch (error) {
      // If $expand fails, fall back to separate calls (will likely fail but provides better error messages)
      this.logger.warn('$expand failed, trying separate entity fetches...');
      throw error;
    }
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
