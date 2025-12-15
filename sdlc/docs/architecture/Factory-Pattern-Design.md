# Factory Pattern Design - Workspace Creation

## Overview

The Smartsheet workspace creation functionality has been refactored to use the Factory design pattern, enabling support for multiple workspace creation strategies while maintaining clean, testable code.

## Architecture

### Factory Pattern Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                  WorkspaceFactoryProvider                    │
│                    (Factory Selector)                        │
│                                                              │
│  getFactory(configManager?) → WorkspaceFactory              │
│                                                              │
│  Based on SOLUTION_TYPE configuration:                      │
│  - "StandaloneWorkspaces" → StandaloneWorkspacesFactory    │
│  - "Portfolio" → PortfolioFactory                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │    WorkspaceFactory          │
              │      (Interface)             │
              │                              │
              │  + createStandardsWorkspace()│
              │  + createProjectWorkspace()  │
              └───────────────────────────────┘
                      │              │
           ┌──────────┴──────────┐   │
           ▼                     ▼   │
┌──────────────────────┐  ┌──────────────────────┐
│StandaloneWorkspaces  │  │  PortfolioFactory    │
│      Factory         │  │   (Future Impl)      │
│                      │  │                      │
│ Current              │  │ Creates workspaces   │
│ implementation:      │  │ within portfolio     │
│                      │  │ structure            │
│ - Creates PMO        │  │                      │
│   Standards          │  │ NOT YET IMPLEMENTED  │
│   workspace          │  │                      │
│ - Creates project    │  │                      │
│   workspaces         │  │                      │
│ - Idempotent         │  │                      │
│   operations         │  │                      │
└──────────────────────┘  └──────────────────────┘
```

### Component Responsibilities

#### WorkspaceFactory Interface
- **Location**: `src/factories/WorkspaceFactory.ts`
- **Purpose**: Defines the contract for workspace creation strategies
- **Methods**:
  - `createStandardsWorkspace()`: Create or retrieve PMO Standards workspace
  - `createProjectWorkspace()`: Create project workspace with required sheets

#### WorkspaceFactoryProvider
- **Location**: `src/factories/WorkspaceFactoryProvider.ts`
- **Purpose**: Selects and caches appropriate factory based on configuration
- **Features**:
  - Singleton pattern for factory instances
  - Configuration-driven factory selection
  - Cache management for performance

#### StandaloneWorkspacesFactory
- **Location**: `src/factories/StandaloneWorkspacesFactory.ts`
- **Purpose**: Default implementation for standalone workspace creation
- **Behavior**:
  - Creates independent PMO Standards workspace
  - Creates individual project workspaces
  - Handles template workspace copying (if configured)
  - Idempotent sheet and value creation

#### PortfolioFactory
- **Location**: `src/factories/PortfolioFactory.ts`
- **Status**: Stub implementation (not yet functional)
- **Future Purpose**: Create workspaces within portfolio structure

## Configuration

### Environment Variables

```bash
# Solution Type (optional, defaults to StandaloneWorkspaces)
SOLUTION_TYPE=StandaloneWorkspaces  # or Portfolio

# PMO Standards Workspace ID (optional)
PMO_STANDARDS_WORKSPACE_ID=1234567890

# Template Workspace ID (optional, for StandaloneWorkspaces)
TEMPLATE_WORKSPACE_ID=9876543210
```

### Configuration Flow

1. User sets `SOLUTION_TYPE` in `.env` file (or defaults to `StandaloneWorkspaces`)
2. `ConfigManager` loads and validates the configuration
3. `ProjectOnlineImporter` initializes with `ConfigManager`
4. `WorkspaceFactoryProvider.getFactory()` selects appropriate factory
5. Factory creates workspaces according to its strategy

## Integration Points

### ProjectOnlineImporter

The importer integrates with the factory pattern through:

```typescript
export class ProjectOnlineImporter {
  private workspaceFactory: WorkspaceFactory;
  
  constructor(
    client?: SmartsheetClient,
    logger?: Logger,
    errorHandler?: ErrorHandler,
    configManager?: ConfigManager
  ) {
    // ... other initialization
    this.workspaceFactory = WorkspaceFactoryProvider.getFactory(configManager);
  }
  
  private async getOrCreatePMOStandardsWorkspace() {
    return this.workspaceFactory.createStandardsWorkspace(
      this.smartsheetClient!,
      workspaceIdNum,
      this.logger
    );
  }
  
  async importProject(data: ProjectImportData) {
    const projectResult = await this.workspaceFactory.createProjectWorkspace(
      this.smartsheetClient!,
      data.project,
      this.configManager
    );
  }
}
```

## Extension Guide

### Adding a New Factory Implementation

To implement a new workspace creation strategy (e.g., Portfolio):

1. **Implement the WorkspaceFactory interface**:

```typescript
// src/factories/PortfolioFactory.ts
export class PortfolioFactory implements WorkspaceFactory {
  async createStandardsWorkspace(
    client: SmartsheetClient,
    existingWorkspaceId?: number,
    logger?: Logger
  ): Promise<PMOStandardsWorkspaceInfo> {
    // Your portfolio-specific PMO Standards creation logic
  }
  
  async createProjectWorkspace(
    client: SmartsheetClient,
    project: ProjectOnlineProject,
    configManager?: ConfigManager,
    workspaceId?: number
  ): Promise<ProjectWorkspaceResult> {
    // Your portfolio-specific project workspace creation logic
  }
}
```

2. **Update WorkspaceFactoryProvider**:

```typescript
private static createFactory(solutionType: string): WorkspaceFactory {
  switch (solutionType) {
    case 'StandaloneWorkspaces':
      return new StandaloneWorkspacesFactory();
    case 'Portfolio':
      return new PortfolioFactory(); // Already done!
    // Add new cases here
    default:
      throw new Error(`Unknown SOLUTION_TYPE: "${solutionType}"`);
  }
}
```

3. **Update ConfigManager validation** (if needed):

```typescript
const validSolutionTypes = ['StandaloneWorkspaces', 'Portfolio', 'YourNewType'];
```

4. **Add configuration support** in `.env.sample`

5. **Create tests** for your factory implementation

## Testing Strategy

### Unit Tests

- Factory selection logic: `WorkspaceFactoryProvider.getFactory()`
- Configuration validation: `ConfigManager.getSolutionType()`
- Individual factory methods (mock Smartsheet client)

### Integration Tests

- End-to-end workspace creation with StandaloneWorkspacesFactory
- PMO Standards reuse across multiple projects
- Template workspace copying (if configured)

### Testing Example

```typescript
describe('WorkspaceFactoryProvider', () => {
  it('should return StandaloneWorkspacesFactory by default', () => {
    const factory = WorkspaceFactoryProvider.getFactory();
    expect(factory).toBeInstanceOf(StandaloneWorkspacesFactory);
  });
  
  it('should cache factory instances', () => {
    const factory1 = WorkspaceFactoryProvider.getFactory();
    const factory2 = WorkspaceFactoryProvider.getFactory();
    expect(factory1).toBe(factory2); // Same instance
  });
});
```

## Migration Guide

### From Direct Function Calls to Factory

**Before (deprecated):**
```typescript
import { createPMOStandardsWorkspace } from '../transformers/PMOStandardsTransformer';

const pmoWorkspace = await createPMOStandardsWorkspace(client, workspaceId, logger);
```

**After (current):**
```typescript
import { WorkspaceFactoryProvider } from '../factories';

const factory = WorkspaceFactoryProvider.getFactory(configManager);
const pmoWorkspace = await factory.createStandardsWorkspace(client, workspaceId, logger);
```

### Configuration Migration

No configuration changes required. The factory pattern is fully backward compatible:
- Defaults to `StandaloneWorkspaces` if `SOLUTION_TYPE` not specified
- Respects existing `PMO_STANDARDS_WORKSPACE_ID` and `TEMPLATE_WORKSPACE_ID`

## Benefits

### Extensibility
- Easy to add new workspace creation strategies
- No changes to calling code when adding new strategies

### Testability
- Factory interface enables easy mocking
- Individual factories can be tested in isolation

### Maintainability
- Clear separation of concerns
- Single Responsibility Principle
- Each factory handles one strategy

### Flexibility
- Configuration-driven strategy selection
- Runtime factory switching (if needed)

## Performance Considerations

### Factory Caching
The `WorkspaceFactoryProvider` caches factory instances to avoid repeated object creation:

```typescript
private static instances: Map<string, WorkspaceFactory> = new Map();
```

### Workspace Reuse
Factories implement idempotent operations:
- PMO Standards workspace checked before creation
- Sheets checked before creation
- Values checked before addition

## Future Enhancements

### Portfolio Implementation
The Portfolio factory stub provides a starting point for:
- Portfolio-level workspace hierarchy
- Cross-project references and dependencies
- Portfolio-level reporting and rollup sheets
- Shared PMO Standards within portfolio context

See `src/factories/PortfolioFactory.ts` for detailed implementation notes.

### Additional Strategies
The pattern supports additional strategies such as:
- **TemplateBasedFactory**: Always use templates (no blank workspaces)
- **SharedResourceFactory**: Shared resource pools across projects
- **HierarchicalFactory**: Parent-child project relationships

## Troubleshooting

### Factory Selection Issues

**Problem**: Wrong factory selected
**Solution**: Check `SOLUTION_TYPE` in `.env` file. Verify `ConfigManager` loading.

**Problem**: Factory not found error
**Solution**: Ensure `SOLUTION_TYPE` value is valid. Check `WorkspaceFactoryProvider` switch statement.

### Implementation Issues

**Problem**: Portfolio not implemented error
**Solution**: Expected - Portfolio is a stub. Use `SOLUTION_TYPE=StandaloneWorkspaces`

**Problem**: Type errors with factory interface
**Solution**: Ensure factory implements all `WorkspaceFactory` methods with correct signatures

## References

- [Project Plan](../specs/Factory-Pattern-Refactoring-Plan.md)
- [ETL System Design](./02-etl-system-design.md)
- [WorkspaceFactory Interface](../../src/factories/WorkspaceFactory.ts)
- [StandaloneWorkspacesFactory](../../src/factories/StandaloneWorkspacesFactory.ts)

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-15  
**Status**: Complete - Refactoring Implemented