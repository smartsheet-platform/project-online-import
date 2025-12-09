**📚 Implementation Guide Series**

**Previous**: [← Code Conventions](./conventions.md)

📍 **Current**: Code Patterns

**Next**: [Anti-Patterns →](./anti-patterns.md)

**Complete Series**:
1. [Project Online Migration Overview](../architecture/01-project-online-migration-overview.md)
2. [ETL System Design](../architecture/02-etl-system-design.md)
3. [Data Transformation Guide](../architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](../project/Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](../project/Re-run-Resiliency.md)
6. [Sheet References](../project/Sheet-References.md)
7. [Authentication Setup](../project/Authentication-Setup.md)
8. [CLI Usage Guide](../project/CLI-Usage-Guide.md)
9. [Troubleshooting Playbook](../code/troubleshooting-playbook.md)
10. [Code Conventions](../code/conventions.md)
11. [Code Patterns](../code/patterns.md)
12. [Anti-Patterns](../code/anti-patterns.md)
13. [API Services Catalog](../code/api-services-catalog.md)
14. [Test Suite Guide](../../test/README.md)

---

# Project Online Import - Code Patterns

This document catalogs recurring code patterns used throughout the project. Understanding these patterns will help you write code that's consistent with the existing codebase.

## Architectural Patterns

### 1. ETL Pipeline Pattern

**Context**: Multi-stage data transformation from source (Project Online) to destination (Smartsheet).

**Implementation**:
```typescript
// src/lib/importer.ts
export class ProjectOnlineImporter {
  async importProject(data: ProjectImportData): Promise<ImportResult> {
    // Stage 1: Setup
    const pmoStandards = await this.setupPMOStandards();
    
    // Stage 2: Extract & Transform Project
    const workspace = await this.transformProject(data.project);
    
    // Stage 3: Load Tasks
    const tasks = await this.loadTasks(data.tasks, workspace);
    
    // Stage 4: Load Resources
    const resources = await this.loadResources(data.resources, workspace);
    
    // Stage 5: Load Assignments
    await this.loadAssignments(data.assignments, tasks, resources);
    
    return { workspace, tasks, resources };
  }
}
```

**When to use**: Any multi-step data processing workflow that requires ordered execution.

### 2. Dependency Injection Pattern

**Context**: Decouple classes from their dependencies for testability and flexibility.

**Implementation**:
```typescript
// Class receives dependencies via constructor
export class TaskTransformer {
  constructor(
    private client: SmartsheetClient,
    private logger?: Logger
  ) {}
}

// Usage
const transformer = new TaskTransformer(
  smartsheetClient,
  logger
);
```

**Benefits**:
- Easy to mock dependencies in tests
- Explicit dependency declarations
- Flexible configuration

**When to use**: Any class that depends on external services or utilities.

### 3. Template Method Pattern

**Context**: Define algorithm skeleton in base class, let subclasses implement specific steps.

**Implementation**:
```typescript
// Base pattern for transformers
export abstract class BaseTransformer<TSource, TTarget> {
  async transform(source: TSource): Promise<TTarget> {
    this.validate(source);
    const target = this.convert(source);
    await this.load(target);
    return target;
  }
  
  protected abstract validate(source: TSource): void;
  protected abstract convert(source: TSource): TTarget;
  protected abstract load(target: TTarget): Promise<void>;
}
```

**When to use**: Multiple classes share common workflow but differ in implementation details.

## Data Transformation Patterns

### 4. Builder Pattern for Test Data

**Context**: Create complex test objects with fluent API.

**Implementation**:
```typescript
// test/unit/builders/ODataProjectBuilder.ts
export class ODataProjectBuilder {
  private project: Partial<ProjectOnlineProject> = {};
  
  withName(name: string): this {
    this.project.Name = name;
    return this;
  }
  
  withPriority(priority: number): this {
    this.project.Priority = priority;
    return this;
  }
  
  build(): ProjectOnlineProject {
    return {
      Id: this.project.Id || uuid(),
      Name: this.project.Name || 'Test Project',
      ...this.project,
    } as ProjectOnlineProject;
  }
}

// Usage
const project = new ODataProjectBuilder()
  .withName('Sample Project')
  .withPriority(800)
  .build();
```

**When to use**: Creating test data with many optional fields.

### 5. Functional Transformation Pattern

**Context**: Transform data through pure functions without side effects.

**Implementation**:
```typescript
// src/transformers/utils.ts
export function sanitizeWorkspaceName(projectName: string): string {
  return projectName
    .replace(/[/\\:*?"<>|]/g, '-')  // Replace invalid chars
    .replace(/-+/g, '-')             // Consolidate dashes
    .trim()                          // Remove leading/trailing spaces
    .replace(/^-+|-+$/g, '')         // Remove leading/trailing dashes
    .substring(0, 100);              // Truncate to limit
}

export function convertDateTimeToDate(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**Benefits**:
- Easy to test (no dependencies)
- Composable
- Predictable output

**When to use**: Data format conversions, sanitization, mapping.

### 6. Mapping Pattern

**Context**: Convert between different data models (OData ↔ Smartsheet).

**Implementation**:
```typescript
// Priority mapping: 0-1000 scale → 7 text levels
export function mapTaskPriority(priority: number): string {
  if (priority >= 1000) return 'Highest';
  if (priority >= 800) return 'Very High';
  if (priority >= 600) return 'Higher';
  if (priority >= 500) return 'Medium';
  if (priority >= 400) return 'Lower';
  if (priority >= 200) return 'Very Low';
  return 'Lowest';
}
```

**Pattern**: Range-based mapping with clear boundaries.

**When to use**: Converting between incompatible value systems.

## API Integration Patterns

### 7. Retry with Exponential Backoff

**Context**: Handle transient failures in API calls gracefully.

**Implementation**:
```typescript
// src/util/ExponentialBackoff.ts
export class ExponentialBackoff {
  constructor(
    private maxTries: number,
    private backoffTime: number,
    private maxDelayMs: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.maxTries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxTries - 1) {
          const delay = Math.min(
            this.backoffTime * Math.pow(2, attempt),
            this.maxDelayMs
          );
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }
}

// Usage
const backoff = new ExponentialBackoff(3, 1000);
const result = await backoff.execute(() => client.getProjects());
```

**When to use**: Any external API call that might fail transiently.

### 8. Rate Limiting Pattern

**Context**: Respect API rate limits to avoid throttling.

**Implementation**:
```typescript
// src/lib/ProjectOnlineClient.ts
export class ProjectOnlineClient {
  private requestTimestamps: number[] = [];
  private rateLimitPerMinute: number;
  
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      t => t > oneMinuteAgo
    );
    
    // Wait if at limit
    if (this.requestTimestamps.length >= this.rateLimitPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestTimestamp);
      await delay(waitTime);
    }
    
    this.requestTimestamps.push(now);
  }
}
```

**When to use**: High-volume API interactions with known rate limits.

### 9. Pagination Pattern

**Context**: Handle paginated API responses automatically.

**Implementation**:
```typescript
// src/lib/ProjectOnlineClient.ts
async fetchAllPages<T>(initialUrl: string): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  
  while (nextUrl) {
    const response = await this.httpClient.get<ODataCollectionResponse<T>>(
      nextUrl
    );
    
    results.push(...response.data.value);
    nextUrl = response.data['@odata.nextLink'];
  }
  
  return results;
}

// Usage
const allTasks = await client.fetchAllPages<Task>('/api/tasks');
```

**When to use**: APIs that return paginated results with continuation tokens.

## Error Handling Patterns

### 10. Typed Error with Actionable Messages

**Context**: Provide clear, actionable guidance when errors occur.

**Implementation**:
```typescript
// src/util/ErrorHandler.ts
export class ImportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly actionable: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

// Factory methods for common errors
export class ErrorHandler {
  static configError(field: string, issue: string): ConfigurationError {
    return new ConfigurationError(
      `Configuration error: ${field} - ${issue}`,
      `Update your .env file to set ${field} correctly. ` +
      `Copy .env.sample to .env if you haven't already.`
    );
  }
  
  static rateLimitError(retryAfterMs?: number): ConnectionError {
    const waitTime = retryAfterMs 
      ? `Wait ${Math.ceil(retryAfterMs / 1000)} seconds`
      : 'Wait a few minutes';
    
    return new ConnectionError(
      'API rate limit exceeded',
      `${waitTime} before retrying. Consider reducing batch size.`,
      { retryAfterMs }
    );
  }
}
```

**Benefits**:
- Users know exactly what went wrong
- Clear next steps for resolution
- Consistent error messaging

**When to use**: All error scenarios, especially user-facing errors.

### 11. Error Context Pattern

**Context**: Add context to errors as they bubble up the call stack.

**Implementation**:
```typescript
export class ErrorHandler {
  handle(error: unknown, context?: string): void {
    const prefix = context ? `[${context}] ` : '';
    
    if (error instanceof ImportError) {
      this.logger.error(`${prefix}${error.message}`);
      this.logger.info(`💡 What to do: ${error.actionable}`);
    } else if (error instanceof Error) {
      this.logger.error(`${prefix}${error.message}`);
      const guidance = this.inferActionableGuidance(error);
      if (guidance) {
        this.logger.info(`💡 What to do: ${guidance}`);
      }
    }
  }
}

// Usage
try {
  await operation();
} catch (error) {
  errorHandler.handle(error, 'Task Import');
  throw error;
}
```

**When to use**: Multi-layer applications where knowing the operation context helps debugging.

## Resiliency Patterns

### 12. Get-or-Create Pattern

**Context**: Support re-running operations without errors or duplicates.

**Implementation**:
```typescript
// src/util/SmartsheetHelpers.ts
export async function getOrCreateSheet(
  client: SmartsheetClient,
  workspaceId: number,
  sheetConfig: { name: string; columns: SmartsheetColumn[] }
): Promise<SmartsheetSheet> {
  // Check if sheet already exists
  const existingSheet = await findSheetInWorkspace(
    client,
    workspaceId,
    sheetConfig.name
  );
  
  if (existingSheet) {
    // Return existing sheet
    const fullSheet = await client.sheets.getSheet({ 
      id: existingSheet.id 
    });
    return fullSheet.data;
  }
  
  // Sheet doesn't exist - create it
  const createdSheet = await client.sheets.createSheetInWorkspace({
    workspaceId,
    body: sheetConfig,
  });
  
  return createdSheet.data;
}
```

**Benefits**:
- Idempotent operations
- Safe to retry failed imports
- No duplicate resource creation

**When to use**: Any create operation that might be retried.

### 13. Existence Check Before Creation

**Context**: Verify resource doesn't exist before attempting creation.

**Implementation**:
```typescript
// Pattern: Check → Create if missing
const existingColumn = await findColumnInSheet(
  client,
  sheetId,
  columnTitle
);

if (!existingColumn) {
  const newColumn = await client.sheets.addColumn({
    sheetId,
    body: columnConfig,
  });
  return newColumn;
}

return existingColumn;
```

**When to use**: Operations that fail if resource already exists.

### 14. Template Copy Pattern

**Context**: Create pre-configured resources faster and more reliably.

**Implementation**:
```typescript
// src/transformers/ProjectTransformer.ts
// Template workspace ID is configured via TEMPLATE_WORKSPACE_ID environment variable
// If not set, creates blank workspace from scratch
constructor(private client: SmartsheetClient, configManager?: ConfigManager) {
  this.templateWorkspaceId = configManager?.get().templateWorkspaceId;
}

async transformProject(project: ProjectOnlineProject): Promise<Workspace> {
  if (this.templateWorkspaceId) {
    // Copy from template if configured
    const workspace = await copyWorkspace(
      this.client,
      this.templateWorkspaceId,
      project.Name
    );
  } else {
    // Create blank workspace from scratch
    const workspace = await this.client.workspaces.createWorkspace({
      name: project.Name,
    });
  }
  
  // Find and rename pre-existing sheets
  const summarySheet = await findSheetByPartialName(
    this.client,
    workspace.id,
    'Summary'
  );
  await renameSheet(this.client, summarySheet.id, `${project.Name} - Summary`);
  
  // Clear template data
  await deleteAllRows(this.client, summarySheet.id);
  
  return workspace;
}
```

**Benefits**:
- Faster than creating from scratch
- Consistent structure
- Fewer API calls

**When to use**: Creating complex resources with standard structures.

## Logging Patterns

### 15. Structured Logging with Levels

**Context**: Provide appropriate logging detail for different audiences.

**Implementation**:
```typescript
// src/util/Logger.ts
export enum LogLevel {
  DEBUG = 0,   // Detailed diagnostic information
  INFO = 1,    // General information
  WARN = 2,    // Warning conditions
  ERROR = 3,   // Error conditions
  SILENT = 4,  // No logging
}

export class Logger {
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, args, '\x1b[90m');
    }
  }
  
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, args, '\x1b[36m');
    }
  }
  
  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('SUCCESS', message, args, '\x1b[32m');
    }
  }
}
```

**Usage Guidelines**:
- **DEBUG**: Implementation details, variable values
- **INFO**: Progress updates, major milestones
- **WARN**: Recoverable issues, deprecated usage
- **ERROR**: Failures, exceptions
- **SUCCESS**: Successful completion of operations

**When to use**: All significant operations, especially long-running ones.

### 16. Progress Reporting Pattern

**Context**: Provide user feedback during long-running operations.

**Implementation**:
```typescript
// src/util/ProgressReporter.ts
export class MultiStageProgressReporter {
  defineStages(stages: { name: string; total: number }[]): void {
    this.stages = stages.map(s => ({
      name: s.name,
      total: s.total,
      completed: 0,
    }));
  }
  
  startStage(stageName: string): void {
    this.currentStage = stageName;
    this.logger.info(`\n📋 Stage: ${stageName} (0/${stage.total})`);
  }
  
  updateStage(count: number = 1, message?: string): void {
    const stage = this.stages.get(this.currentStage);
    stage.completed += count;
    
    const percentage = Math.round((stage.completed / stage.total) * 100);
    this.logger.info(`  ${stage.completed}/${stage.total} (${percentage}%)${message}`);
  }
}

// Usage in importer
const progress = new MultiStageProgressReporter(logger);
progress.defineStages([
  { name: 'PMO Standards', total: 1 },
  { name: 'Project Setup', total: 1 },
  { name: 'Task Import', total: tasks.length },
  { name: 'Resource Import', total: resources.length },
]);

progress.startStage('Task Import');
for (const task of tasks) {
  await processTask(task);
  progress.updateStage(1, task.name);
}
```

**When to use**: Operations that process multiple items or take significant time.

## Testing Patterns

### 17. Mock with Spy Pattern

**Context**: Track method calls while providing canned responses.

**Implementation**:
```typescript
// test/unit/MockSmartsheetClient.ts
export class MockSmartsheetClient implements SmartsheetClient {
  public createSheetInWorkspaceCalls: any[] = [];
  
  createSheetInWorkspace = jest.fn(async (workspaceId, sheet) => {
    this.createSheetInWorkspaceCalls.push({ workspaceId, sheet });
    return {
      id: this.nextId++,
      name: sheet.name,
      columns: sheet.columns,
    };
  });
}

// Usage in tests
const mockClient = new MockSmartsheetClient();
const transformer = new ProjectTransformer(mockClient);

await transformer.transform(project);

expect(mockClient.createSheetInWorkspace).toHaveBeenCalledTimes(3);
expect(mockClient.createSheetInWorkspaceCalls[0].sheet.name)
  .toBe('Test Project - Summary');
```

**When to use**: Testing classes that depend on external services.

### 18. Scenario-Based Test Pattern

**Context**: Test realistic end-to-end workflows.

**Implementation**:
```typescript
// test/integration/scenarios/project-scenarios.ts
export const scenarios = {
  simpleProject: {
    project: new ODataProjectBuilder()
      .withName('Simple Project')
      .withPriority(500)
      .build(),
    tasks: [
      new ODataTaskBuilder().withName('Task 1').build(),
      new ODataTaskBuilder().withName('Task 2').build(),
    ],
    resources: [
      new ODataResourceBuilder().withName('John Doe').build(),
    ],
  },
  
  complexProject: {
    // ... complex scenario
  },
};

// Usage in integration tests
describe('Project Import', () => {
  it('should import simple project', async () => {
    const { project, tasks, resources } = scenarios.simpleProject;
    const result = await importer.importProject({
      project,
      tasks,
      resources,
    });
    
    expect(result.workspace.name).toBe('Simple Project');
    expect(result.tasksCreated).toBe(2);
  });
});
```

**When to use**: Integration tests validating complete workflows.

## Best Practices

### Pattern Selection Guidelines

1. **ETL Pipeline**: Use for multi-stage data transformations
2. **Dependency Injection**: Use for all classes with dependencies
3. **Retry/Backoff**: Use for all external API calls
4. **Get-or-Create**: Use for resource creation that might retry
5. **Typed Errors**: Use for all error conditions
6. **Progress Reporting**: Use for operations > 5 seconds
7. **Logging**: Use at all significant decision points
8. **Builders**: Use for complex test data creation

### Anti-Patterns to Avoid

- ❌ Creating resources without checking existence
- ❌ Direct API calls without retry logic
- ❌ Generic errors without actionable messages
- ❌ Hardcoding values that should be configurable
- ❌ Mutations in transformation functions
- ❌ Synchronous operations for I/O
- ❌ Test data inline in test files
- ❌ Missing error context in logs

### Pattern Evolution

When you need to add a new pattern:

1. Implement it in one place first
2. Refine based on real usage
3. Extract to reusable utility
4. Document with examples
5. Add tests
6. Update this guide

---

**📚 Implementation Guide Series**

**Previous**: [← Code Conventions](./conventions.md)

📍 **Current**: Code Patterns

**Next**: [Anti-Patterns →](./anti-patterns.md)

**Complete Series**:
1. [Project Online Migration Overview](../architecture/01-project-online-migration-overview.md)
2. [ETL System Design](../architecture/02-etl-system-design.md)
3. [Data Transformation Guide](../architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](../project/Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](../project/Re-run-Resiliency.md)
6. [Sheet References](../project/Sheet-References.md)
7. [Authentication Setup](../project/Authentication-Setup.md)
8. [CLI Usage Guide](../project/CLI-Usage-Guide.md)
9. [Troubleshooting Playbook](./troubleshooting-playbook.md)
10. [Code Conventions](./conventions.md)
11. **Code Patterns** (You are here)
12. [Anti-Patterns](./anti-patterns.md)
13. [API Services Catalog](../api-reference/api-services-catalog.md)
14. [Test Suite Guide](../../test/README.md)

**🔗 Related Documentation**:
- [Code Conventions](./conventions.md) - Coding standards and naming conventions
- [Anti-Patterns](./anti-patterns.md) - Common mistakes to avoid
- [ETL System Design](../architecture/02-etl-system-design.md) - Component architecture details

---