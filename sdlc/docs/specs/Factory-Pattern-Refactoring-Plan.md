# Factory Pattern Refactoring Project Plan

## Executive Summary

This document outlines the project plan for refactoring the Smartsheet workspace creation functionality to use a Factory design pattern. This refactoring enables future support for multiple workspace creation strategies (StandaloneWorkspaces vs Portfolio) while maintaining clean, testable code.

## Background

### Current Implementation

The current workspace creation logic is tightly coupled within two main components:

1. **PMO Standards Workspace Creation** (`src/transformers/PMOStandardsTransformer.ts`)
   - Creates a centralized "PMO Standards" workspace
   - Contains reference sheets for picklist values
   - Shared across all project imports

2. **Project Workspace Creation** (`src/transformers/ProjectTransformer.ts`)
   - Creates individual project workspaces
   - Each contains 3 sheets: Summary, Tasks, Resources
   - Uses PMO Standards for picklist configuration

### New Requirement

Support two workspace creation strategies via `SOLUTION_TYPE` config flag:

- **StandaloneWorkspaces** (current implementation)
  - Creates independent PMO Standards workspace
  - Creates individual project workspaces
  - Current behavior - must remain functional

- **Portfolio** (future implementation)
  - Creates workspaces using alternative mechanism
  - Different organizational structure
  - To be implemented after this refactoring

### Goals

1. Extract workspace creation logic into a Factory pattern
2. Ensure all existing tests pass with minimal modifications
3. Pass all linting checks
4. Create clear extension points for Portfolio implementation
5. Document the new architecture

---

## Factory Design Architecture

### Interface Definition

```typescript
/**
 * Factory interface for creating Smartsheet workspaces
 * Supports multiple workspace creation strategies (StandaloneWorkspaces, Portfolio)
 */
interface WorkspaceFactory {
  /**
   * Create or get the PMO Standards workspace
   * @param client - Smartsheet client instance
   * @param existingWorkspaceId - Optional existing workspace ID to reuse
   * @param logger - Optional logger for debug output
   * @returns Promise with PMO Standards workspace information
   */
  createStandardsWorkspace(
    client: SmartsheetClient,
    existingWorkspaceId?: number,
    logger?: Logger
  ): Promise<PMOStandardsWorkspaceInfo>;

  /**
   * Create a project workspace with required sheets
   * @param client - Smartsheet client instance
   * @param project - Project Online project data
   * @param workspaceId - Optional existing workspace ID (for testing)
   * @returns Promise with workspace and sheet information
   */
  createProjectWorkspace(
    client: SmartsheetClient,
    project: ProjectOnlineProject,
    workspaceId?: number
  ): Promise<{
    workspace: SmartsheetWorkspace;
    sheets: {
      summarySheet: { id: number; name: string };
      taskSheet: { id: number; name: string };
      resourceSheet: { id: number; name: string };
    };
  }>;
}
```

### Implementation Classes

1. **StandaloneWorkspacesFactory** - Implements current functionality
2. **PortfolioFactory** - Placeholder for future implementation

### Factory Selection Logic

```typescript
/**
 * Get the appropriate workspace factory based on configuration
 */
function getWorkspaceFactory(solutionType: string): WorkspaceFactory {
  switch (solutionType) {
    case 'StandaloneWorkspaces':
      return new StandaloneWorkspacesFactory();
    case 'Portfolio':
      return new PortfolioFactory();
    default:
      throw new Error(`Unknown SOLUTION_TYPE: ${solutionType}`);
  }
}
```

---

## Implementation Plan

### Phase 1: Create Factory Interface and Types

**Files to Create:**
- `src/factories/WorkspaceFactory.ts` - Interface definition and types
- `src/factories/index.ts` - Barrel export

**Tasks:**
1. Define `WorkspaceFactory` interface with method signatures
2. Define return types for both methods
3. Export all types from barrel file
4. Add comprehensive JSDoc documentation

**Acceptance Criteria:**
- Interface compiles without errors
- All types are properly defined
- Documentation is complete

---

### Phase 2: Extract Current Logic to StandaloneWorkspacesFactory

**Files to Create:**
- `src/factories/StandaloneWorkspacesFactory.ts`

**Files to Modify:**
- `src/transformers/PMOStandardsTransformer.ts` - Extract and move logic
- `src/transformers/ProjectTransformer.ts` - Extract and move logic

**Tasks:**

#### 2.1: Create StandaloneWorkspacesFactory Class

1. Create new class implementing `WorkspaceFactory` interface
2. Move `createPMOStandardsWorkspace` logic from `PMOStandardsTransformer.ts`
3. Move workspace creation logic from `ProjectTransformer.transformProject()`
4. Preserve all helper functions as private methods
5. Maintain exact same behavior as current implementation

#### 2.2: Update PMOStandardsTransformer

1. Keep `PMOStandardsWorkspaceInfo` and `ReferenceSheetInfo` types (used elsewhere)
2. Keep `STANDARD_REFERENCE_SHEETS` constant (used in tests)
3. Keep helper functions like `ensureStandardReferenceSheet` and `findSheetInWorkspace`
4. Replace `createPMOStandardsWorkspace` with simple wrapper that uses factory
5. Update exports as needed

#### 2.3: Update ProjectTransformer

1. Keep column/row creation functions (used by other transformers)
2. Keep validation functions
3. Update `ProjectTransformer.transformProject()` to use factory
4. Update constructor to accept factory instance

**Acceptance Criteria:**
- Factory class implements all interface methods
- Original functions delegate to factory
- All existing functionality preserved

---

### Phase 3: Update ConfigManager for SOLUTION_TYPE

**Files to Modify:**
- `src/util/ConfigManager.ts`
- `.env.sample`

**Tasks:**

1. Add `solutionType` field to `ETLConfig` interface
2. Add `SOLUTION_TYPE` environment variable loading
3. Set default to `'StandaloneWorkspaces'`
4. Add validation for valid solution type values
5. Update `.env.sample` with new variable
6. Add to configuration summary output

**Acceptance Criteria:**
- Config loads SOLUTION_TYPE with proper default
- Validation rejects invalid values
- Documentation updated

---

### Phase 4: Create Factory Provider/Selector

**Files to Create:**
- `src/factories/WorkspaceFactoryProvider.ts`

**Tasks:**

1. Create factory provider class with static method
2. Implement solution type detection from config
3. Return appropriate factory instance
4. Add error handling for unknown types
5. Cache factory instances (singleton pattern)

**Implementation:**

```typescript
export class WorkspaceFactoryProvider {
  private static instances: Map<string, WorkspaceFactory> = new Map();

  static getFactory(configManager?: ConfigManager): WorkspaceFactory {
    const config = configManager?.get() ?? { solutionType: 'StandaloneWorkspaces' };
    const solutionType = config.solutionType ?? 'StandaloneWorkspaces';

    if (!this.instances.has(solutionType)) {
      const factory = this.createFactory(solutionType);
      this.instances.set(solutionType, factory);
    }

    return this.instances.get(solutionType)!;
  }

  private static createFactory(solutionType: string): WorkspaceFactory {
    switch (solutionType) {
      case 'StandaloneWorkspaces':
        return new StandaloneWorkspacesFactory();
      case 'Portfolio':
        throw new Error('Portfolio solution type not yet implemented');
      default:
        throw new Error(`Unknown SOLUTION_TYPE: ${solutionType}`);
    }
  }
}
```

**Acceptance Criteria:**
- Provider returns correct factory based on config
- Factory instances are cached
- Clear error messages for unsupported types

---

### Phase 5: Integrate Factory into Importer

**Files to Modify:**
- `src/lib/importer.ts`

**Tasks:**

1. Add `WorkspaceFactoryProvider` import
2. Add factory instance as class member
3. Initialize factory in constructor using ConfigManager
4. Update `getOrCreatePMOStandardsWorkspace()` to use factory
5. Update workspace creation calls to use factory
6. Remove direct calls to transformer functions
7. Maintain all existing error handling

**Key Changes:**

```typescript
export class ProjectOnlineImporter {
  private smartsheetClient?: SmartsheetClient;
  private projectOnlineClient?: ProjectOnlineClient;
  private pmoStandardsWorkspace?: PMOStandardsWorkspaceInfo;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private workspaceFactory: WorkspaceFactory; // NEW

  constructor(
    client?: SmartsheetClient, 
    logger?: Logger, 
    errorHandler?: ErrorHandler,
    configManager?: ConfigManager // NEW - optional for tests
  ) {
    this.smartsheetClient = client;
    this.logger = logger ?? new Logger();
    this.errorHandler = errorHandler ?? new ErrorHandler(this.logger);
    this.workspaceFactory = WorkspaceFactoryProvider.getFactory(configManager); // NEW
  }

  private async getOrCreatePMOStandardsWorkspace(): Promise<PMOStandardsWorkspaceInfo> {
    // ... existing code ...
    
    // CHANGE: Use factory instead of direct function call
    const pmoWorkspace = await this.workspaceFactory.createStandardsWorkspace(
      this.smartsheetClient!,
      workspaceIdNum && !isNaN(workspaceIdNum) ? workspaceIdNum : undefined,
      this.logger
    );
    
    // ... rest of method unchanged ...
  }
}
```

**Acceptance Criteria:**
- Importer uses factory for all workspace creation
- Tests can inject mock factory if needed
- All error handling preserved

---

### Phase 6: Create Portfolio Factory Stub

**Files to Create:**
- `src/factories/PortfolioFactory.ts`

**Tasks:**

1. Create class implementing `WorkspaceFactory` interface
2. Throw "not implemented" errors in both methods
3. Add comprehensive TODO comments
4. Document expected Portfolio behavior
5. Export from factory barrel

**Acceptance Criteria:**
- Class compiles successfully
- Clear error messages when called
- Documentation outlines future requirements
- Doesn't break factory provider

---

### Phase 7: Update Tests

**Files to Modify:**
- `test/importer.test.ts`
- `test/integration/pmo-standards-integration.test.ts`
- Any other tests that create workspaces

**Tasks:**

1. Review all existing tests
2. Update tests to pass ConfigManager or factory to importer
3. Add optional factory injection where beneficial
4. Document any test changes required
5. Ensure test coverage remains high

**Test Strategy:**
- Tests use StandaloneWorkspacesFactory (default)
- Tests can inject mock factory for isolation
- Integration tests verify end-to-end factory usage
- Unit tests verify factory selection logic

**Acceptance Criteria:**
- All existing tests pass with updates
- Test coverage maintained
- Clear test documentation

---

### Phase 8: Documentation and Code Quality

**Files to Create:**
- `sdlc/docs/architecture/Factory-Pattern-Design.md`

**Files to Modify:**
- `README.md` - Add SOLUTION_TYPE configuration
- `sdlc/docs/architecture/02-etl-system-design.md` - Document factory pattern

**Tasks:**

1. Run ESLint and fix any issues
2. Run Prettier and format code
3. Create architecture documentation
4. Update README with new config variable
5. Add JSDoc comments to all public methods
6. Create code examples for future Portfolio implementation

**Documentation Sections:**
- Factory pattern overview
- Interface and implementation details
- Configuration guide
- Extension guide for Portfolio

**Acceptance Criteria:**
- Zero linting errors
- Code properly formatted
- Comprehensive documentation
- Clear examples

---

### Phase 9: Integration Testing

**Tasks:**

1. Run full integration test suite
2. Test workspace creation end-to-end
3. Verify PMO Standards workspace reuse
4. Test error scenarios
5. Document test results

**Test Scenarios:**
- Create new project with StandaloneWorkspaces
- Reuse existing PMO Standards workspace
- Handle missing configuration
- Test with template workspace configured
- Test without template workspace
- Verify picklist configuration
- Test re-run scenarios

**Acceptance Criteria:**
- All integration tests pass
- End-to-end workflow verified
- Error handling works correctly
- Performance unchanged

---

### Phase 10: Final Validation and Cleanup

**Tasks:**

1. Run all test suites (unit + integration)
2. Run linting checks
3. Verify code coverage metrics
4. Review all modified files
5. Check for any TODOs or FIXMEs
6. Update CHANGELOG if needed

**Validation Checklist:**
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] Code coverage maintained
- [ ] Documentation complete
- [ ] Ready for Portfolio implementation

---

## File Structure After Refactoring

```
src/
├── factories/
│   ├── index.ts                          # Barrel exports
│   ├── WorkspaceFactory.ts               # Interface definition
│   ├── WorkspaceFactoryProvider.ts       # Factory selector
│   ├── StandaloneWorkspacesFactory.ts    # Current implementation
│   └── PortfolioFactory.ts               # Future implementation (stub)
├── lib/
│   └── importer.ts                       # Updated to use factory
├── transformers/
│   ├── PMOStandardsTransformer.ts        # Delegates to factory
│   └── ProjectTransformer.ts             # Delegates to factory
└── util/
    └── ConfigManager.ts                  # Added SOLUTION_TYPE support
```

---

## Risk Management

### Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Test updates needed | Medium | High | Update tests systematically, run frequently |
| Performance regression | Medium | Low | Keep same logic flow, no major architectural changes |
| Missing edge cases | Medium | Medium | Comprehensive test coverage, thorough code review |
| Incomplete refactoring | High | Low | Follow plan systematically, validate each phase |
| Configuration conflicts | Medium | Low | Default to current behavior, validate config |

### Rollback Plan

If issues arise:
1. All changes are in feature branch
2. Can revert to main branch
3. Factory pattern is opt-in via config

---

## Success Criteria

### Must Have (P0)
- [ ] All tests pass (with necessary updates)
- [ ] Zero linting errors
- [ ] Factory interface fully implemented for StandaloneWorkspaces
- [ ] Configuration support for SOLUTION_TYPE
- [ ] Documentation complete

### Should Have (P1)
- [ ] Portfolio factory stub created
- [ ] Architecture documentation written
- [ ] Code examples for Portfolio implementation
- [ ] Performance benchmarks show no regression

### Nice to Have (P2)
- [ ] Additional unit tests for factory selection
- [ ] Performance optimizations
- [ ] Enhanced error messages

---

## Timeline Estimate

| Phase | Estimated Time | Dependencies |
|-------|---------------|--------------|
| Phase 1: Interface | 1 hour | None |
| Phase 2: Extract Logic | 3-4 hours | Phase 1 |
| Phase 3: Config Updates | 1 hour | Phase 1 |
| Phase 4: Factory Provider | 1 hour | Phase 1, 2, 3 |
| Phase 5: Integrate Importer | 2 hours | Phase 2, 4 |
| Phase 6: Portfolio Stub | 0.5 hours | Phase 1 |
| Phase 7: Update Tests | 2 hours | Phase 5 |
| Phase 8: Documentation | 2 hours | All phases |
| Phase 9: Integration Testing | 1.5 hours | Phase 7 |
| Phase 10: Final Validation | 1 hour | All phases |
| **Total** | **15-16 hours** | |

---

## Next Steps After This Plan

Once this refactoring is complete and validated, we will proceed to:

1. **Portfolio Implementation Plan** - A separate project plan for:
   - Detailed Portfolio workspace creation requirements
   - Portfolio factory implementation
   - Conditional logic for Portfolio-specific behavior
   - Additional configuration options
   - Testing strategy for Portfolio mode

2. This plan will be documented in: `Factory-Pattern-Portfolio-Implementation-Plan.md`

---

## Appendix

### A. Key Design Decisions

1. **Why Factory Pattern?**
   - Encapsulates workspace creation logic
   - Easy to extend with new strategies
   - Testable and mockable
   - Single Responsibility Principle

2. **Why Keep Helper Functions?**
   - Reusable across factory implementations
   - Tested and proven logic
   - Can be refactored later if needed

3. **Why ConfigManager Integration?**
   - Centralized configuration
   - Type-safe config access
   - Environment variable support
   - Validation built-in

### B. Testing Strategy

1. **Unit Tests**
   - Factory selection logic
   - Configuration validation
   - Individual factory methods

2. **Integration Tests**
   - End-to-end workspace creation
   - PMO Standards reuse
   - Multi-project scenarios

3. **Factory Tests**
   - StandaloneWorkspacesFactory behavior
   - Error handling
   - Edge cases

### C. Code Review Checklist

- [ ] Interface properly defined
- [ ] All methods implemented
- [ ] Error handling comprehensive
- [ ] Logging appropriate
- [ ] Documentation complete
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] Code formatted
- [ ] No console.log statements

---

## Document Control

- **Version:** 1.1
- **Created:** 2025-12-15
- **Updated:** 2025-12-15
- **Status:** Draft - Pending Implementation
- **Next Review:** After Phase 5 completion