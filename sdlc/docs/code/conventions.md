# Project Online Import - Code Conventions

This document describes coding standards, naming conventions, file organization patterns, and development workflows used in this project.

## Language & Style

### TypeScript Configuration

**Target**: ES2020
**Module System**: CommonJS
**Strict Mode**: Enabled
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### ESLint & Prettier

**ESLint**: TypeScript-aware linting
**Prettier**: Consistent code formatting
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run format      # Format all code
```

## Naming Conventions

### Files and Directories

**Source Files**: PascalCase for classes, camelCase for utilities
- `ProjectTransformer.ts` - Class exports
- `SmartsheetHelpers.ts` - Utility functions
- `utils.ts` - Shared utilities
- `index.ts` - Barrel exports

**Test Files**: Match source filename with `.test.ts` suffix
- `ProjectTransformer.test.ts`
- `SmartsheetHelpers.test.ts`

**Directory Structure**: Lowercase with hyphens for multi-word
- `src/lib/auth/` - Lowercase singular/plural as appropriate
- `src/transformers/` - Plural for collections
- `test/integration/` - Kebab-case for multi-word
- `test/mocks/builders/` - Nested organization

### Variables and Functions

**Variables**: camelCase
```typescript
const projectName = 'Sample Project';
const isActive = true;
const maxRetries = 3;
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const TEMPLATE_WORKSPACE_ID = 9002412817049476;
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30000;
```

**Functions**: camelCase with verb prefix
```typescript
// Good
function getProject(id: string): Promise<Project>
function createWorkspace(name: string): Promise<Workspace>
function validateTask(task: Task): ValidationResult
function transformProject(project: Project): Workspace

// Avoid
function project(id: string)  // Missing verb
function workspace(name: string)  // Unclear action
```

**Boolean Variables**: Use `is`, `has`, `should` prefixes
```typescript
const isActive = true;
const hasChildren = false;
const shouldRetry = true;
const canCreate = user.hasPermission();
```

### Classes and Interfaces

**Classes**: PascalCase, singular nouns
```typescript
class ProjectTransformer { }
class ErrorHandler { }
class ExponentialBackoff { }
class Logger { }
```

**Interfaces**: PascalCase, often with descriptive suffix
```typescript
interface ProjectOnlineProject { }
interface SmartsheetClient { }
interface ValidationResult { }
interface ProgressOptions { }
```

**Type Aliases**: PascalCase
```typescript
type SmartsheetColumnType = 'TEXT_NUMBER' | 'DATE' | 'CONTACT_LIST';
type ODataQueryOptions = { $select?: string[]; $filter?: string };
```

### Enums

**Enum Names**: PascalCase
**Enum Values**: UPPER_SNAKE_CASE
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}
```

## File Organization

### Source Code Structure

```
src/
├── cli.ts                      # CLI entry point
├── index.ts                    # Library entry point
├── lib/                        # Core libraries
│   ├── importer.ts            # Main ETL orchestrator
│   ├── ProjectOnlineClient.ts # OData API client
│   └── auth/                  # Authentication
│       └── MSALAuthHandler.ts
├── transformers/              # Data transformers
│   ├── ProjectTransformer.ts
│   ├── TaskTransformer.ts
│   ├── ResourceTransformer.ts
│   ├── AssignmentTransformer.ts
│   ├── PMOStandardsTransformer.ts
│   └── utils.ts              # Shared transformation utilities
├── types/                     # Type definitions
│   ├── ProjectOnline.ts      # Source types
│   ├── Smartsheet.ts         # Destination types
│   └── SmartsheetClient.ts   # Client interface types
└── util/                      # Cross-cutting utilities
    ├── ConfigManager.ts
    ├── ErrorHandler.ts
    ├── ExponentialBackoff.ts
    ├── Logger.ts
    ├── ProgressReporter.ts
    └── SmartsheetHelpers.ts
```

### Test Structure

```
test/
├── setup.ts                   # Jest setup
├── importer.test.ts          # Unit tests (match src/)
├── lib/
│   └── ProjectOnlineClient.test.ts
├── transformers/
│   ├── ProjectTransformer.test.ts
│   ├── TaskTransformer.test.ts
│   └── utils.test.ts
├── util/
│   ├── ExponentialBackoff.test.ts
│   └── SmartsheetHelpers.test.ts
├── integration/               # E2E integration tests
│   ├── load-phase.test.ts
│   ├── pmo-standards-integration.test.ts
│   ├── helpers/              # Test helpers
│   │   ├── odata-fixtures.ts
│   │   └── smartsheet-setup.ts
│   └── scenarios/            # Test scenarios
│       ├── assignment-scenarios.ts
│       ├── project-scenarios.ts
│       ├── resource-scenarios.ts
│       └── task-scenarios.ts
└── mocks/                    # Mock implementations
    ├── MockODataClient.ts
    ├── MockSmartsheetClient.ts
    └── builders/             # Test data builders
        ├── ODataAssignmentBuilder.ts
        ├── ODataProjectBuilder.ts
        ├── ODataResourceBuilder.ts
        └── ODataTaskBuilder.ts
```

### Import Organization

**Order**: External → Internal → Types → Relative
```typescript
// 1. External dependencies (Node.js built-ins first)
import * as fs from 'fs';
import * as path from 'path';

// 2. External packages (alphabetical)
import axios from 'axios';
import { Command } from 'commander';

// 3. Internal absolute imports (by category)
import { ProjectOnlineProject, ProjectOnlineTask } from '../types/ProjectOnline';
import { SmartsheetClient } from '../types/SmartsheetClient';
import { Logger } from '../util/Logger';
import { ErrorHandler } from '../util/ErrorHandler';

// 4. Relative imports (closest first)
import { sanitizeWorkspaceName, convertDateTimeToDate } from './utils';
import { getOrCreateSheet } from '../util/SmartsheetHelpers';
```

**Barrel Exports**: Use `index.ts` for clean imports
```typescript
// src/transformers/index.ts
export { ProjectTransformer } from './ProjectTransformer';
export { TaskTransformer } from './TaskTransformer';
export { ResourceTransformer } from './ResourceTransformer';
export * from './utils';

// Usage elsewhere
import { ProjectTransformer, sanitizeWorkspaceName } from './transformers';
```

## Code Style

### Function Declarations

**Prefer explicit return types for public APIs**:
```typescript
// Good - Clear contract
export function createWorkspace(name: string): Promise<Workspace> {
  // ...
}

// Acceptable - Simple/obvious return type
function sanitizeName(name: string) {
  return name.trim().toLowerCase();
}
```

**Use async/await over Promises**:
```typescript
// Good
async function loadProject(id: string): Promise<Project> {
  const data = await client.getProject(id);
  return transformProject(data);
}

// Avoid
function loadProject(id: string): Promise<Project> {
  return client.getProject(id)
    .then(data => transformProject(data));
}
```

### Error Handling

**Always handle errors explicitly**:
```typescript
// Good
try {
  await operation();
} catch (error) {
  errorHandler.handle(error, 'Operation Context');
  throw error;  // Re-throw after handling
}

// Avoid
await operation();  // Unhandled promise rejection
```

**Use typed errors**:
```typescript
// Good
throw ErrorHandler.configError('SMARTSHEET_API_TOKEN', 'is required');

// Avoid
throw new Error('Missing token');  // No guidance
```

### Comments

**Use JSDoc for public APIs**:
```typescript
/**
 * Transform Project Online project to Smartsheet workspace
 * 
 * @param project - Project Online project entity
 * @param workspaceId - Optional existing workspace ID
 * @returns Transformed workspace with sheet information
 * @throws {ValidationError} If project data is invalid
 */
export async function transformProject(
  project: ProjectOnlineProject,
  workspaceId?: number
): Promise<WorkspaceResult> {
  // Implementation
}
```

**Use inline comments for complex logic**:
```typescript
// Convert Project Online priority (0-1000) to 7-level picklist
// Ranges: 1000+: Highest, 800-999: Very High, 600-799: Higher,
//         500-599: Medium, 400-499: Lower, 200-399: Very Low, 0-199: Lowest
export function mapPriority(priority: number): string {
  if (priority >= 1000) return 'Highest';
  // ... rest of mapping
}
```

**Avoid obvious comments**:
```typescript
// Bad
const name = project.Name;  // Get the name

// Good - No comment needed
const name = project.Name;
```

### Variable Declarations

**Prefer `const`, use `let` only for reassignment**:
```typescript
// Good
const projectName = 'Sample';
let retryCount = 0;

// Avoid
var projectName = 'Sample';  // Never use var
let projectName = 'Sample';  // Use const if not reassigned
```

**Destructure for clarity**:
```typescript
// Good
const { Name, Description, Priority } = project;

// Acceptable
const projectName = project.Name;
const projectDescription = project.Description;
```

**Use meaningful names**:
```typescript
// Good
const maxRetryAttempts = 3;
const resourcesByType = groupBy(resources, r => r.ResourceType);

// Avoid
const n = 3;  // What is n?
const temp = groupBy(resources, r => r.ResourceType);  // Temporary what?
```

## Type Safety

### Strict Type Checking

**Enable all strict checks**:
- `strict: true` in tsconfig.json
- No `any` types (use `unknown` if needed)
- Explicit return types for public functions
- Non-null assertions only when guaranteed

**Avoid type assertions**:
```typescript
// Good - Type guard
function isProject(data: unknown): data is Project {
  return typeof data === 'object' && 
         data !== null && 
         'Name' in data;
}

if (isProject(data)) {
  console.log(data.Name);  // Type safe
}

// Avoid
const project = data as Project;  // Unsafe
```

### Interface vs Type

**Prefer interfaces for object shapes**:
```typescript
// Good
interface ProjectOnlineProject {
  Id: string;
  Name: string;
  Priority?: number;
}

// Use type for unions/intersections
type Result = Success | Failure;
type EnhancedProject = ProjectOnlineProject & { metadata: Metadata };
```

### Optional vs Undefined

**Use optional parameters consistently**:
```typescript
// Good
function createSheet(
  name: string,
  columns?: SmartsheetColumn[]
): Promise<Sheet>

// Avoid mixing
function createSheet(
  name: string,
  columns: SmartsheetColumn[] | undefined
): Promise<Sheet>
```

## Testing Conventions

### Test Structure

**Follow AAA pattern** (Arrange-Act-Assert):
```typescript
describe('ProjectTransformer', () => {
  it('should transform project to workspace', async () => {
    // Arrange
    const mockClient = new MockSmartsheetClient();
    const transformer = new ProjectTransformer(mockClient);
    const project = new ODataProjectBuilder()
      .withName('Test Project')
      .build();
    
    // Act
    const result = await transformer.transformProject(project);
    
    // Assert
    expect(result.workspace.name).toBe('Test Project');
    expect(mockClient.createWorkspaceCalls).toHaveLength(1);
  });
});
```

### Test Naming

**Describe behavior, not implementation**:
```typescript
// Good
it('should create workspace with sanitized name')
it('should throw ValidationError for invalid project')
it('should retry failed API calls up to 3 times')

// Avoid
it('calls createWorkspace()')  // Implementation detail
it('test project transformer')  // Too vague
```

### Test Organization

**Group related tests**:
```typescript
describe('ProjectTransformer', () => {
  describe('transformProject', () => {
    it('should create workspace for valid project');
    it('should throw for invalid project');
    it('should handle missing optional fields');
  });
  
  describe('validateProject', () => {
    it('should pass validation for complete project');
    it('should fail validation for missing required fields');
  });
});
```

### Mock Usage

**Use mocks for external dependencies only**:
```typescript
// Good - Mock external service
const mockSmartsheetClient = new MockSmartsheetClient();

// Avoid - Don't mock pure functions
const mockSanitizer = jest.fn(sanitizeWorkspaceName);  // Test real function
```

## Git Workflow

### Commit Messages

**Format**: `type(scope): description`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/modifications
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build/tooling changes

**Examples**:
```
feat(transformer): add support for Material resources
fix(api): handle pagination for large result sets
docs(readme): update authentication setup instructions
test(integration): add scenario for complex project hierarchy
refactor(util): extract common validation logic
```

### Branch Naming

**Format**: `type/short-description`
- `feature/add-resource-transformer`
- `fix/rate-limiting-bug`
- `docs/update-api-reference`
- `test/integration-scenarios`

### Pull Request Guidelines

**Title**: Same format as commit messages
**Description**: Include:
- What changed
- Why it changed
- How to test
- Related issues

## Documentation

### Code Documentation

**Public APIs**: Always document with JSDoc
**Private functions**: Document if complex
**Types**: Document non-obvious fields
**Configuration**: Document all options

### README Updates

**When to update**:
- New dependencies added
- New commands added
- Configuration changes
- Breaking changes
- Installation steps change

### Changelog

**Keep `CHANGELOG.md` current**:
- Document all user-facing changes
- Group by version
- Include migration guides for breaking changes

## Performance Guidelines

### Async Operations

**Prefer parallel over sequential when safe**:
```typescript
// Good - Parallel when independent
const [tasks, resources] = await Promise.all([
  client.getTasks(projectId),
  client.getResources(),
]);

// Good - Sequential when dependent
const project = await client.getProject(id);
const tasks = await client.getTasks(project.Id);
```

### API Calls

**Batch operations**:
```typescript
// Good - Single batch call
await client.addRows(sheetId, allRows);

// Avoid - Individual calls
for (const row of allRows) {
  await client.addRow(sheetId, row);  // N API calls
}
```

**Cache expensive operations**:
```typescript
// Good - Cache column map
const columnMap = await getColumnMap(client, sheetId);
for (const task of tasks) {
  const row = createTaskRow(task, columnMap);  // Reuse cached map
}

// Avoid - Repeated lookups
for (const task of tasks) {
  const columnMap = await getColumnMap(client, sheetId);  // N lookups
}
```

## Security

### Credential Handling

**Never log credentials**:
```typescript
// Good - Mask in logs
logger.info(`Token: ${maskToken(token)}`);

// Avoid
logger.info(`Token: ${token}`);  // Exposes credential
```

**Use environment variables**:
```typescript
// Good
const apiToken = process.env.SMARTSHEET_API_TOKEN;

// Avoid
const apiToken = 'abc123...';  // Hardcoded
```

### Input Validation

**Validate all external input**:
```typescript
// Good
if (!project.Name || project.Name.trim() === '') {
  throw ErrorHandler.validationError('Project Name', 'non-empty string');
}

// Avoid
const workspaceName = project.Name;  // Assumes valid
```

## Best Practices Summary

### Do ✅

- Use TypeScript strict mode
- Write tests for new code
- Handle errors explicitly
- Document public APIs
- Use meaningful variable names
- Follow the style guide
- Run linter before committing
- Keep functions focused and small
- Use dependency injection
- Log at appropriate levels

### Don't ❌

- Use `any` type
- Ignore TypeScript errors
- Commit commented-out code
- Use `var` declarations
- Write functions > 50 lines
- Catch errors without handling
- Hardcode configuration values
- Commit console.log statements
- Mix async/sync patterns
- Skip tests for "simple" code

## Code Review Checklist

Before submitting PR:
- [ ] All tests pass
- [ ] Linter passes (no warnings)
- [ ] New code has tests
- [ ] Public APIs have JSDoc
- [ ] Error handling is present
- [ ] No hardcoded values
- [ ] No debugging statements
- [ ] Follows naming conventions
- [ ] TypeScript strict mode satisfied
- [ ] Documentation updated if needed

## Questions?

If you're unsure about any convention:
1. Check existing code for examples
2. Review this guide and the patterns guide
3. Ask in PR comments
4. Discuss in team meeting

When in doubt, consistency with existing code takes precedence.