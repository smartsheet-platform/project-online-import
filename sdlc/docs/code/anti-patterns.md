# Project Online Import - Anti-Patterns

This document identifies common mistakes, code smells, and anti-patterns to avoid. Learning what NOT to do is as important as learning best practices.

## Architecture Anti-Patterns

### 1. ❌ God Object / Swiss Army Knife Class

**Problem**: Single class that does too many things.

**Bad Example**:
```typescript
class ProjectManager {
  // Authentication
  authenticate() { }
  
  // API calls
  getProjects() { }
  getTasks() { }
  
  // Transformation
  transformProject() { }
  transformTasks() { }
  
  // Validation
  validateProject() { }
  
  // Logging
  logInfo() { }
  logError() { }
  
  // Configuration
  loadConfig() { }
  
  // 500+ more lines...
}
```

**Why It's Bad**:
- Difficult to test
- Hard to understand
- Violates Single Responsibility Principle
- Changes in one area affect everything
- Cannot reuse components independently

**Correct Approach**:
```typescript
// Separate concerns into focused classes
class AuthHandler { }
class ProjectOnlineClient { }
class ProjectTransformer { }
class Validator { }
class Logger { }
class ConfigManager { }

// Compose them together
class ProjectImporter {
  constructor(
    private client: ProjectOnlineClient,
    private transformer: ProjectTransformer,
    private logger: Logger
  ) {}
}
```

### 2. ❌ Tight Coupling to External Services

**Problem**: Directly instantiating dependencies instead of injecting them.

**Bad Example**:
```typescript
class ProjectTransformer {
  transform(project: Project) {
    // Hardcoded dependency
    const client = new SmartsheetClient(process.env.TOKEN);
    const logger = new Logger();
    
    // Now impossible to test without real API
    return client.createWorkspace(project.name);
  }
}
```

**Why It's Bad**:
- Cannot test without real Smartsheet API
- Cannot swap implementations
- Difficult to configure
- Hidden dependencies

**Correct Approach**:
```typescript
class ProjectTransformer {
  constructor(
    private client: SmartsheetClient,  // Injected
    private logger: Logger             // Injected
  ) {}
  
  transform(project: Project) {
    // Easy to mock in tests
    return this.client.createWorkspace(project.name);
  }
}

// Usage
const transformer = new ProjectTransformer(
  new SmartsheetClient(config.token),
  new Logger()
);
```

### 3. ❌ Leaky Abstractions

**Problem**: Implementation details leak through the interface.

**Bad Example**:
```typescript
// Exposes implementation detail (OData)
class ProjectClient {
  async getProjects(): Promise<ODataResponse<Project>> {
    // Returns OData-specific structure
  }
}

// Users must know about OData
const response = await client.getProjects();
const projects = response.value;  // OData structure leaked
```

**Why It's Bad**:
- Clients depend on implementation details
- Hard to change underlying technology
- Violates abstraction principle

**Correct Approach**:
```typescript
// Clean interface, hide implementation
class ProjectOnlineClient {
  async getProjects(): Promise<Project[]> {
    const response = await this.httpClient.get<ODataResponse<Project>>();
    // Handle OData internally
    return response.value;
  }
}

// Simple usage
const projects = await client.getProjects();  // Just get projects
```

## Data Transformation Anti-Patterns

### 4. ❌ Mutation of Input Data

**Problem**: Modifying input parameters instead of creating new objects.

**Bad Example**:
```typescript
function sanitizeWorkspaceName(project: Project): Project {
  // MUTATES input parameter
  project.Name = project.Name.trim()
    .replace(/[invalid]/g, '-');
  return project;  // Returns modified input
}

// Caller's data is changed!
const project = { Name: 'Test/Project' };
sanitizeWorkspaceName(project);
console.log(project.Name);  // 'Test-Project' (unexpected!)
```

**Why It's Bad**:
- Unexpected side effects
- Hard to debug
- Not composable
- Breaks referential transparency

**Correct Approach**:
```typescript
function sanitizeWorkspaceName(name: string): string {
  // Pure function, no mutation
  return name.trim().replace(/[invalid]/g, '-');
}

// Original unchanged
const project = { Name: 'Test/Project' };
const sanitizedName = sanitizeWorkspaceName(project.Name);
console.log(project.Name);  // 'Test/Project' (unchanged)
console.log(sanitizedName);  // 'Test-Project'
```

### 5. ❌ Silent Data Loss

**Problem**: Dropping data without warning when transformation fails.

**Bad Example**:
```typescript
function transformTasks(tasks: Task[]): SmartsheetRow[] {
  return tasks.map(task => {
    try {
      return createTaskRow(task);
    } catch (error) {
      // SILENTLY IGNORE ERROR
      return null;
    }
  }).filter(row => row !== null);  // Lost tasks!
}
```

**Why It's Bad**:
- Data loss is invisible
- Debugging is impossible
- Users don't know data is missing
- Violates fail-fast principle

**Correct Approach**:
```typescript
function transformTasks(tasks: Task[]): SmartsheetRow[] {
  const rows: SmartsheetRow[] = [];
  const errors: Array<{ task: Task; error: Error }> = [];
  
  for (const task of tasks) {
    try {
      rows.push(createTaskRow(task));
    } catch (error) {
      errors.push({ task, error: error as Error });
      logger.error(`Failed to transform task ${task.Id}`, error);
    }
  }
  
  if (errors.length > 0) {
    throw new DataError(
      `Failed to transform ${errors.length} of ${tasks.length} tasks`,
      'Review task data for validation errors'
    );
  }
  
  return rows;
}
```

### 6. ❌ Magic Numbers and Strings

**Problem**: Hardcoded values without explanation.

**Bad Example**:
```typescript
function mapPriority(priority: number): string {
  if (priority >= 1000) return 'Highest';
  if (priority >= 800) return 'Very High';  // Why 800?
  if (priority >= 600) return 'Higher';     // Why 600?
  // ...
}

// Hardcoded ID
const workspace = await copyWorkspace(9002412817049476, name);
```

**Why It's Bad**:
- No context for values
- Hard to maintain
- Easy to introduce errors
- Not self-documenting

**Correct Approach**:
```typescript
// Named constants with documentation
const PRIORITY_THRESHOLDS = {
  HIGHEST: 1000,
  VERY_HIGH: 800,
  HIGHER: 600,
  MEDIUM: 500,
  LOWER: 400,
  VERY_LOW: 200,
} as const;

function mapPriority(priority: number): string {
  if (priority >= PRIORITY_THRESHOLDS.HIGHEST) return 'Highest';
  if (priority >= PRIORITY_THRESHOLDS.VERY_HIGH) return 'Very High';
  // Clear intent
}

// Configuration constant
const TEMPLATE_WORKSPACE_ID = 9002412817049476;  // Standard project template
const workspace = await copyWorkspace(TEMPLATE_WORKSPACE_ID, name);
```

## Error Handling Anti-Patterns

### 7. ❌ Swallowing Exceptions

**Problem**: Catching errors and not handling them properly.

**Bad Example**:
```typescript
async function importProject(id: string) {
  try {
    const project = await client.getProject(id);
    return transform(project);
  } catch (error) {
    // SWALLOWED - user never knows what happened
    return null;
  }
}
```

**Why It's Bad**:
- Errors disappear
- Debugging is impossible
- User gets no feedback
- System continues in invalid state

**Correct Approach**:
```typescript
async function importProject(id: string) {
  try {
    const project = await client.getProject(id);
    return transform(project);
  } catch (error) {
    // Log error with context
    errorHandler.handle(error, `Import Project ${id}`);
    
    // Re-throw or return meaningful error
    throw ErrorHandler.dataError(
      `Failed to import project ${id}`,
      'Verify the project ID exists and you have access'
    );
  }
}
```

### 8. ❌ Generic Error Messages

**Problem**: Error messages that don't help users resolve the issue.

**Bad Example**:
```typescript
throw new Error('Import failed');
throw new Error('Invalid data');
throw new Error('Something went wrong');
```

**Why It's Bad**:
- No actionable information
- User can't fix the issue
- Support burden increases

**Correct Approach**:
```typescript
// Specific, actionable errors
throw ErrorHandler.validationError(
  'Project Name',
  'non-empty string',
  project.Name
);

throw ErrorHandler.configError(
  'SMARTSHEET_API_TOKEN',
  'Copy .env.sample to .env and add your 26-character API token'
);

throw ErrorHandler.connectionError(
  'Project Online',
  'Check network connectivity and verify PROJECT_ONLINE_URL is correct'
);
```

### 9. ❌ Catching Everything

**Problem**: Overly broad catch blocks that handle all errors the same way.

**Bad Example**:
```typescript
try {
  await operation1();
  await operation2();
  await operation3();
} catch (error) {
  // Which operation failed? Can't tell!
  logger.error('Operation failed');
}
```

**Why It's Bad**:
- Can't determine what failed
- Can't handle different errors appropriately
- Loses error context

**Correct Approach**:
```typescript
try {
  await operation1();
} catch (error) {
  errorHandler.handle(error, 'Operation 1');
  throw error;
}

try {
  await operation2();
} catch (error) {
  errorHandler.handle(error, 'Operation 2');
  throw error;
}

// Or handle specific error types differently
try {
  await apiCall();
} catch (error) {
  if (error instanceof RateLimitError) {
    await delay(error.retryAfterMs);
    return apiCall();  // Retry
  }
  if (error instanceof AuthError) {
    await refreshToken();
    return apiCall();  // Retry with new token
  }
  throw error;  // Other errors propagate
}
```

## API Integration Anti-Patterns

### 10. ❌ No Retry Logic

**Problem**: Failing immediately on transient errors.

**Bad Example**:
```typescript
async function getProjects(): Promise<Project[]> {
  // Single attempt - any network blip fails permanently
  const response = await httpClient.get('/api/projects');
  return response.data;
}
```

**Why It's Bad**:
- Transient failures cause permanent errors
- Poor user experience
- Unnecessary manual retries

**Correct Approach**:
```typescript
async function getProjects(): Promise<Project[]> {
  // Automatic retry with exponential backoff
  return this.backoff.execute(async () => {
    const response = await this.httpClient.get('/api/projects');
    return response.data;
  });
}
```

### 11. ❌ Ignoring Rate Limits

**Problem**: Making requests without considering API rate limits.

**Bad Example**:
```typescript
// Send 1000 requests as fast as possible
for (const task of tasks) {
  await client.createRow(sheetId, task);  // Quickly hit rate limit
}
```

**Why It's Bad**:
- Gets throttled by API
- Forces manual retry
- Wastes time and resources

**Correct Approach**:
```typescript
// Batch operations
await client.addRows(sheetId, tasks);  // Single API call

// Or implement rate limiting
await this.rateLimiter.checkLimit();
await client.createRow(sheetId, task);
```

### 12. ❌ Not Handling Pagination

**Problem**: Only processing first page of results.

**Bad Example**:
```typescript
async function getAllTasks(): Promise<Task[]> {
  const response = await client.get('/api/tasks');
  return response.data.value;  // Only first 100 tasks!
}
```

**Why It's Bad**:
- Missing data
- Silent truncation
- Incorrect totals

**Correct Approach**:
```typescript
async function getAllTasks(): Promise<Task[]> {
  const tasks: Task[] = [];
  let nextLink = '/api/tasks';
  
  while (nextLink) {
    const response = await client.get(nextLink);
    tasks.push(...response.data.value);
    nextLink = response.data['@odata.nextLink'];
  }
  
  return tasks;
}
```

## Testing Anti-Patterns

### 13. ❌ Testing Implementation Details

**Problem**: Tests that break when refactoring without behavior change.

**Bad Example**:
```typescript
it('should call sanitizeWorkspaceName', () => {
  const spy = jest.spyOn(utils, 'sanitizeWorkspaceName');
  transformer.transformProject(project);
  expect(spy).toHaveBeenCalled();  // Tests HOW, not WHAT
});
```

**Why It's Bad**:
- Brittle tests
- Prevents refactoring
- Doesn't test actual behavior

**Correct Approach**:
```typescript
it('should create workspace with sanitized name', () => {
  const project = { Name: 'Test/Project<Invalid>' };
  const result = transformer.transformProject(project);
  expect(result.workspace.name).toBe('Test-Project-Invalid');  // Tests behavior
});
```

### 14. ❌ No Assertions / Weak Assertions

**Problem**: Tests that don't actually verify anything.

**Bad Example**:
```typescript
it('should transform project', async () => {
  await transformer.transformProject(project);
  // No assertions! Test always passes!
});

it('should create workspace', async () => {
  const result = await transformer.transformProject(project);
  expect(result).toBeTruthy();  // Too weak - what about result?
});
```

**Why It's Bad**:
- False sense of coverage
- Doesn't catch bugs
- Wastes time

**Correct Approach**:
```typescript
it('should transform project', async () => {
  const result = await transformer.transformProject(project);
  
  // Verify specific expected outcomes
  expect(result.workspace.name).toBe('Test Project');
  expect(result.sheets.summarySheet).toBeDefined();
  expect(result.sheets.taskSheet).toBeDefined();
  expect(mockClient.createWorkspace).toHaveBeenCalledWith({
    name: 'Test Project',
  });
});
```

### 15. ❌ Test Interdependence

**Problem**: Tests that depend on execution order or shared state.

**Bad Example**:
```typescript
let sharedProject: Project;

it('should create project', () => {
  sharedProject = createProject();  // Sets shared state
});

it('should transform project', () => {
  // DEPENDS on previous test running first!
  const result = transform(sharedProject);
});
```

**Why It's Bad**:
- Tests can't run in isolation
- Order matters
- Parallel execution fails
- Hard to debug

**Correct Approach**:
```typescript
describe('ProjectTransformer', () => {
  let project: Project;
  
  beforeEach(() => {
    // Each test gets fresh state
    project = new ODataProjectBuilder().build();
  });
  
  it('should create project', () => {
    const result = createProject(project);
    expect(result).toBeDefined();
  });
  
  it('should transform project', () => {
    const result = transform(project);
    expect(result).toBeDefined();
  });
});
```

## Performance Anti-Patterns

### 16. ❌ N+1 Query Problem

**Problem**: Making N API calls when 1 would suffice.

**Bad Example**:
```typescript
// Get tasks
const tasks = await client.getTasks(projectId);

// Then get each task's details individually
for (const task of tasks) {
  const details = await client.getTask(task.Id);  // N API calls!
  processTask(details);
}
```

**Why It's Bad**:
- Extremely slow
- Wastes API quota
- Doesn't scale

**Correct Approach**:
```typescript
// Get all tasks with details in one call
const tasks = await client.getTasks(projectId, {
  $expand: 'Details',  // Include details in response
});

for (const task of tasks) {
  processTask(task);  // Already has details
}
```

### 17. ❌ Unnecessary Await in Loops

**Problem**: Sequential async operations that could be parallel.

**Bad Example**:
```typescript
// Sequential - takes 3 seconds total
for (const project of projects) {
  await processProject(project);  // 1 second each
}
```

**Why It's Bad**:
- Unnecessarily slow
- Doesn't utilize parallelism
- Poor user experience

**Correct Approach**:
```typescript
// Parallel - takes 1 second total (if independent)
await Promise.all(
  projects.map(project => processProject(project))
);

// Or controlled concurrency
const concurrency = 5;
for (let i = 0; i < projects.length; i += concurrency) {
  const batch = projects.slice(i, i + concurrency);
  await Promise.all(batch.map(p => processProject(p)));
}
```

### 18. ❌ Excessive Logging

**Problem**: Logging everything, including sensitive data.

**Bad Example**:
```typescript
logger.debug('API Token:', apiToken);  // Exposes credential!
logger.debug('Request:', JSON.stringify(hugeObject));  // 10MB log entry
logger.debug('Processing...', item, details, metadata, ...);  // Every iteration
```

**Why It's Bad**:
- Security risk
- Performance overhead
- Fills disk/log service
- Makes finding important logs harder

**Correct Approach**:
```typescript
logger.debug('API Token:', maskToken(apiToken));  // Masked
logger.debug('Request size:', getSize(object));  // Summary only
logger.info(`Processing ${items.length} items`);  // Aggregate info
logger.debug('Item processed', item.Id);  // Only IDs, not full objects
```

## Configuration Anti-Patterns

### 19. ❌ Hardcoded Configuration

**Problem**: Configuration values embedded in code.

**Bad Example**:
```typescript
const client = new SmartsheetClient('abc123token456');
const apiUrl = 'https://api.projectonline.microsoft.com';
const maxRetries = 3;
const timeout = 30000;
```

**Why It's Bad**:
- Can't change without code changes
- Different environments need different builds
- Credentials in source control
- No configuration management

**Correct Approach**:
```typescript
// Environment variables
const client = new SmartsheetClient(
  process.env.SMARTSHEET_API_TOKEN!
);
const apiUrl = process.env.PROJECT_ONLINE_URL!;
const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
const timeout = parseInt(process.env.TIMEOUT || '30000');

// Or ConfigManager
const config = configManager.get();
const client = new SmartsheetClient(config.smartsheetApiToken);
```

### 20. ❌ Missing Validation

**Problem**: Using configuration without validation.

**Bad Example**:
```typescript
const token = process.env.SMARTSHEET_API_TOKEN;
// Use token without checking if it exists or is valid
const client = new SmartsheetClient(token);
```

**Why It's Bad**:
- Runtime errors in production
- Confusing error messages
- Hard to diagnose

**Correct Approach**:
```typescript
const token = process.env.SMARTSHEET_API_TOKEN;

if (!token) {
  throw ErrorHandler.configError(
    'SMARTSHEET_API_TOKEN',
    'is required but not set in .env file'
  );
}

if (!/^[a-zA-Z0-9]{26}$/.test(token)) {
  throw ErrorHandler.configError(
    'SMARTSHEET_API_TOKEN',
    'must be a 26-character alphanumeric token'
  );
}

const client = new SmartsheetClient(token);
```

## Summary: Anti-Pattern Red Flags

🚩 **Watch for these warning signs**:
- Classes > 500 lines
- Functions > 50 lines
- Try-catch blocks without error handling
- No tests for "simple" code
- Commented-out code
- TODO comments left indefinitely
- Generic variable names (temp, data, obj)
- Copy-pasted code blocks
- console.log statements
- Hardcoded values
- Silent failures
- Type assertions (`as`)
- `any` types
- Disabled linter rules
- Skipped tests

## Refactoring Anti-Patterns

When you see anti-patterns:
1. **Don't ignore them** - Technical debt compounds
2. **Do refactor incrementally** - Small, safe changes
3. **Do add tests first** - Safety net for refactoring
4. **Do document why** - Explain the improvement
5. **Don't refactor and add features** - One thing at a time

## Questions or Concerns?

If you find yourself thinking:
- "This is just a quick hack" → It will become permanent
- "I'll fix it later" → You won't
- "It works, why change it?" → Maintainability matters
- "The tests are too hard" → Design issue, not test issue

Stop and refactor. Future you will thank you.