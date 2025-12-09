---
**📚 Implementation Guide Series**

**Previous**: [← API Services Catalog](sdlc/docs/api-reference/api-services-catalog.md)

📍 **Current**: Test Suite Guide

**Complete Series** - Final Document:
1. [Project Online Migration Overview](sdlc/docs/architecture/01-project-online-migration-overview.md)
2. [ETL System Design](sdlc/docs/architecture/02-etl-system-design.md)
3. [Data Transformation Guide](sdlc/docs/architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](sdlc/docs/project/Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](sdlc/docs/project/Re-run-Resiliency.md)
6. [Sheet References](sdlc/docs/project/Sheet-References.md)
7. [Authentication Setup](sdlc/docs/project/Authentication-Setup.md)
8. [CLI Usage Guide](sdlc/docs/project/CLI-Usage-Guide.md)
9. [Troubleshooting Playbook](sdlc/docs/code/troubleshooting-playbook.md)
10. [Code Conventions](sdlc/docs/code/conventions.md)
11. [Code Patterns](sdlc/docs/code/patterns.md)
12. [Anti-Patterns](sdlc/docs/code/anti-patterns.md)
13. [API Services Catalog](sdlc/docs/api-reference/api-services-catalog.md)
14. **Test Suite Guide** (You are here)

**🔗 Related Documentation**:
- [Data Transformation Guide](sdlc/docs/architecture/03-data-transformation-guide.md) - Validation requirements and mapping rules
- [Code Patterns](sdlc/docs/code/patterns.md) - Builder pattern and mock implementations
- [Integration Tests Specification](sdlc/docs/specs/E2E-Integration-Tests.md) - Detailed test scenarios

---

# Project Online Import - Test Suite

This directory contains the complete test suite for the Project Online to Smartsheet ETL tool, including both **unit tests** (using mocks) and **integration tests** (using real Smartsheet API).

## Test Organization

```
test/
├── README.md                          # This file
├── setup.ts                           # Jest configuration and .env.test loading
├── importer.test.ts                   # Importer validation tests
├── unit/                              # Unit tests (mocks only, no API calls)
│   ├── MockSmartsheetClient.ts       # Mock Smartsheet SDK
│   ├── MockODataClient.ts            # Mock Project Online oData client
│   ├── builders/                     # Fluent test data builders
│   │   ├── ODataProjectBuilder.ts
│   │   ├── ODataTaskBuilder.ts
│   │   ├── ODataResourceBuilder.ts
│   │   └── ODataAssignmentBuilder.ts
│   └── transformers/                 # Transformer unit tests
│       ├── PMOStandardsTransformer.test.ts
│       ├── ProjectTransformer.test.ts
│       ├── ResourceTransformer.test.ts
│       ├── TaskTransformer.test.ts
│       └── utils.test.ts
├── integration/                       # Integration tests (real Smartsheet API)
│   ├── load-phase.test.ts            # Main ETL integration tests
│   ├── pmo-standards-integration.test.ts
│   ├── helpers/                      # Integration test utilities
│   │   ├── smartsheet-setup.ts      # Workspace lifecycle management
│   │   └── odata-fixtures.ts        # Complete test fixtures
│   └── scenarios/                    # Pre-built test scenarios
│       ├── project-scenarios.ts
│       ├── task-scenarios.ts
│       ├── resource-scenarios.ts
│       └── assignment-scenarios.ts
├── lib/                              # Library tests
│   └── ProjectOnlineClient.test.ts
└── util/                             # Utility tests
    ├── ExponentialBackoff.test.ts
    └── SmartsheetHelpers.test.ts
```

---

## Unit Tests

### Overview

Unit tests use **mock implementations** of API clients to test transformation logic in isolation. No network calls are made, making these tests fast and reliable.

**Key Characteristics:**
- **Fast**: Run in seconds (131 tests in ~2 seconds)
- **Isolated**: No external dependencies
- **Mocked**: Use `MockSmartsheetClient` and `MockODataClient`
- **Focus**: Data transformation, validation, edge cases

### Location

- **Transformer Tests**: [`test/unit/transformers/`](./unit/transformers/)
- **Mock Implementations**: [`test/unit/MockSmartsheetClient.ts`](./unit/MockSmartsheetClient.ts), [`test/unit/MockODataClient.ts`](./unit/MockODataClient.ts)
- **Test Builders**: [`test/unit/builders/`](./unit/builders/)

### Running Unit Tests

```bash
# Run all unit tests
npm test -- test/unit

# Run specific transformer tests
npm test -- test/unit/transformers/ProjectTransformer.test.ts

# Run with coverage
npm test -- test/unit --coverage

# Watch mode for development
npm test -- test/unit --watch
```

### Unit Test Coverage

**Transformer Tests** (131 tests):
- **PMOStandardsTransformer** (18 tests)
  - Standard reference sheet definitions
  - Workspace creation
  - Sheet population with predefined values
  
- **ProjectTransformer** (17 tests)
  - Workspace name sanitization
  - Summary sheet creation (15 columns)
  - Project validation
  - Picklist column configuration
  
- **ResourceTransformer** (37 tests)
  - Resource sheet columns (18 columns)
  - Contact object creation
  - Resource type handling (Work/Material/Cost)
  - Department discovery
  - MaxUnits conversion
  
- **TaskTransformer** (34 tests)
  - Task sheet columns (18 columns)
  - Task hierarchy (OutlineLevel)
  - Status derivation from % complete
  - Priority mapping (7 levels)
  - Predecessor parsing
  - Constraint types (8 types)
  
- **Utils** (25 tests)
  - Name sanitization
  - Date conversion (ISO 8601 → YYYY-MM-DD)
  - Duration conversion (ISO 8601 → decimal days/hours)
  - Priority mapping
  - Contact object creation

### Mock Implementations

**MockSmartsheetClient** ([`test/unit/MockSmartsheetClient.ts`](./unit/MockSmartsheetClient.ts)):
- Simulates Smartsheet SDK behavior
- Tracks all API calls for verification
- Returns realistic mock data with auto-generated IDs
- Supports workspace, sheet, column, and row operations

**MockODataClient** ([`test/unit/MockODataClient.ts`](./unit/MockODataClient.ts)):
- Simulates Project Online oData API
- Uses builder pattern for flexible test data
- Supports fixture loading for complete scenarios

### Test Data Builders

Fluent builders in [`test/unit/builders/`](./unit/builders/) for creating test data:

```typescript
import { ODataProjectBuilder } from '../unit/builders/ODataProjectBuilder';

const project = new ODataProjectBuilder()
  .withName('Test Project')
  .withPriority(800)
  .withStartDate('2024-03-15')
  .build();
```

Available builders:
- `ODataProjectBuilder` - Project entities with all fields
- `ODataTaskBuilder` - Tasks with hierarchy support
- `ODataResourceBuilder` - Resources (Work/Material/Cost)
- `ODataAssignmentBuilder` - Assignment relationships

---

## Integration Tests

### Overview

Integration tests use **mock Project Online responses** with the **real Smartsheet SDK** to verify the complete ETL workflow against actual Smartsheet API.

**Key Characteristics:**
- **Real API**: Makes actual Smartsheet API calls
- **Mock Source**: Uses `MockODataClient` for Project Online data
- **End-to-End**: Tests complete transformation → loading workflow
- **Cleanup**: Automatically removes test workspaces
- **Slow**: Takes several minutes (requires network + API processing)

### Location

- **Main Tests**: [`test/integration/load-phase.test.ts`](./integration/load-phase.test.ts)
- **PMO Standards**: [`test/integration/pmo-standards-integration.test.ts`](./integration/pmo-standards-integration.test.ts)
- **Helpers**: [`test/integration/helpers/`](./integration/helpers/)
- **Scenarios**: [`test/integration/scenarios/`](./integration/scenarios/)

### Prerequisites

#### 1. Smartsheet API Token

You must have a valid Smartsheet API token with workspace creation permissions.

Get your token from: https://app.smartsheet.com/apps/apps-directory

#### 2. Environment Configuration

Create a `.env.test` file in the project root:

```env
# Required
SMARTSHEET_API_TOKEN=your_token_here

# Optional (with defaults)
TEST_WORKSPACE_PREFIX="ETL Test -"
CLEANUP_TEST_WORKSPACES=true
CLEANUP_TEST_WORKSPACES_ON_FAILURE=false
```

#### 3. Dependencies

```bash
npm install
```

### Running Integration Tests

```bash
# Run all integration tests
npm test test/integration

# Run specific test suite
npm test test/integration/load-phase.test.ts

# Run with verbose output
npm test test/integration -- --verbose

# Run without cleanup (preserve workspaces for inspection)
CLEANUP_TEST_WORKSPACES=false npm test test/integration
```

### Integration Test Coverage

**Project Entity Tests** (7 scenarios):
- Basic project with required fields
- Special characters in names
- All 7 priority levels (0, 200, 400, 500, 600, 800, 1000)
- Null optional fields
- Edge case dates
- Very long names (truncation)
- Complete project with all fields

**Task Entity Tests** (14+ scenarios):
- Flat task lists
- Simple/deep/complex hierarchies
- Duration variations (PT0H, PT40H, P5D, PT480M, null)
- All 7 priority levels
- Milestone tasks
- All 8 constraint types (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
- Predecessor relationships (FS, SS, FF, SF with lag)
- System columns (dual date pattern)

**Resource Entity Tests** (10+ scenarios):
- Work resources with/without email
- Material resources
- Cost resources
- Rate variations (StandardRate, OvertimeRate, CostPerUse)
- MaxUnits variations (0%, 50%, 100%, 150%)
- Boolean fields (IsActive, IsGeneric)
- Department picklist discovery

**Assignment Tests** (9 scenarios):
- **CRITICAL**: Work resources → `MULTI_CONTACT_LIST` columns
- **CRITICAL**: Material resources → `MULTI_PICKLIST` columns
- **CRITICAL**: Cost resources → `MULTI_PICKLIST` columns
- Single/multiple assignments per type
- Mixed assignment types on same task
- Work/Units/Cost tracking

**Performance Tests**:
- 1000+ tasks (< 5 minutes execution)

**Error Handling Tests**:
- Missing required fields
- Invalid foreign keys
- Unicode and special characters

### Test Data Patterns

#### Using Pre-built Scenarios

```typescript
import * as projectScenarios from './scenarios/project-scenarios';

const projects = projectScenarios.projectsWithAllPriorities();
```

#### Using Complete Fixtures

```typescript
import * as fixtures from './helpers/odata-fixtures';

const fixture = fixtures.createCompleteProject();
// fixture.project, fixture.tasks, fixture.resources, fixture.assignments
```

#### Loading Fixtures into Mock Client

```typescript
const odataClient = new MockODataClient();
odataClient.loadFixture(fixture);
```

### Workspace Management

Tests automatically create and cleanup workspaces:

```typescript
const workspaceManager = new TestWorkspaceManager(smartsheetClient);
const workspace = await workspaceManager.createWorkspace('Test Name');

// Workspace is automatically cleaned up after test
// (unless CLEANUP_TEST_WORKSPACES=false)
```

### Verification Helpers

```typescript
import { verifySheetColumns, verifySheetRowCount } from './helpers/smartsheet-setup';

const columnCheck = await verifySheetColumns(client, sheetId, [
  { title: 'Task Name', type: 'TEXT_NUMBER' },
  { title: 'Priority', type: 'PICKLIST' },
]);

const rowCheck = await verifySheetRowCount(client, sheetId, 10);
```

---

## Running All Tests

```bash
# Run entire test suite (unit + integration)
npm test

# Run only unit tests (fast)
npm test -- test/unit

# Run only integration tests (slow, requires API token)
npm test -- test/integration

# Run specific test file
npm test -- ProjectTransformer.test.ts

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

---

## Critical Implementation Requirements

### 1. Assignment Column Type Distinction (MUST BE CORRECT)

```typescript
// Work resources (people) → MULTI_CONTACT_LIST
if (resource.ResourceType === 'Work') {
  columnType = 'MULTI_CONTACT_LIST';
  cellValue = {
    objectType: 'MULTI_CONTACT',
    values: [{ email: '...', name: '...' }]
  };
}

// Material/Cost resources (non-people) → MULTI_PICKLIST
if (resource.ResourceType === 'Material' || resource.ResourceType === 'Cost') {
  columnType = 'MULTI_PICKLIST';
  cellValue = {
    objectType: 'MULTI_PICKLIST',
    values: ['Resource Name']
  };
}
```

### 2. Priority Mapping (7 levels, full fidelity)

- 0 → "Lowest"
- 200 → "Very Low"
- 400 → "Lower"
- 500 → "Medium"
- 600 → "Higher"
- 800 → "Very High"
- 1000 → "Highest"

### 3. Duration Conversion (context-dependent)

- Project sheet Duration column: ISO8601 → decimal days (5.0)
- Non-system columns: ISO8601 → string with unit ("40h")

### 4. System Columns Pattern (dual dates)

- "Project Online Created Date" (DATE, user-settable)
- "Created Date" (CREATED_DATE, system column)
- Same for Modified Date

---

## Troubleshooting

### Unit Tests

**Import path errors after refactoring:**
- Verify relative paths are correct (e.g., `'../MockSmartsheetClient'` not `'../unit/MockSmartsheetClient'`)
- Run `npm test -- test/unit` to verify all unit tests pass

**Mock client issues:**
- Check that mock methods return expected data structures
- Verify mock IDs are being auto-generated correctly

### Integration Tests

**Tests fail with "SMARTSHEET_API_TOKEN is required":**
```bash
export SMARTSHEET_API_TOKEN="your_token_here"
```

Or create `.env.test` file with the token.

**Tests timeout:**
```typescript
test('large test', async () => {
  // test code
}, 300000); // 5 minutes
```

**Workspaces not cleaning up:**
```env
CLEANUP_TEST_WORKSPACES=true
```

**Rate limiting from Smartsheet API:**
The Smartsheet SDK handles rate limiting automatically. If tests consistently hit limits, reduce parallelization.

---

## Test Execution Time

**Unit Tests:**
- All unit tests: ~2 seconds
- Single transformer suite: < 1 second

**Integration Tests:**
- Individual test: < 10 seconds
- Project tests (7): ~1 minute
- Task tests (14): ~2 minutes
- Resource tests (10): ~1 minute
- Assignment tests (9): ~1 minute
- Performance test (1000+ tasks): ~3-5 minutes
- **Total integration suite**: < 10 minutes

**Full Suite:**
- Unit + Integration: ~10-12 minutes

---

## Contributing

### Adding Unit Tests

1. Create test file in appropriate directory (e.g., `test/unit/transformers/`)
2. Use mock clients (`MockSmartsheetClient`, `MockODataClient`)
3. Use builders for test data
4. Test edge cases, validation, and error handling
5. Run `npm test -- test/unit` to verify

### Adding Integration Tests

1. Create scenario in `test/integration/scenarios/` if needed
2. Create fixture in `test/integration/helpers/odata-fixtures.ts` if complete dataset needed
3. Add test case to `test/integration/load-phase.test.ts`
4. Verify cleanup works correctly
5. Update this README with new coverage

---

## References

- **Project Documentation**: `sdlc/docs/project/`
- **Architecture**: `sdlc/docs/architecture/`
- **Test Scenarios**: `test/integration/load-phase-test-scenarios.md`
- **Transformation Spec**: `sdlc/docs/architecture/03-data-transformation-guide.md`
- **Smartsheet API**: https://smartsheet-platform.github.io/api-docs/

---

**Last Updated**: 2024-12-08
**Test Suite Version**: 1.0
**Total Tests**: 131 unit tests + 60+ integration tests

---

**📚 Implementation Guide Series**

**Previous**: [← API Services Catalog](sdlc/docs/api-reference/api-services-catalog.md)

📍 **Current**: Test Suite Guide

**Complete Series** - Final Document:
1. [Project Online Migration Overview](sdlc/docs/architecture/01-project-online-migration-overview.md)
2. [ETL System Design](sdlc/docs/architecture/02-etl-system-design.md)
3. [Data Transformation Guide](sdlc/docs/architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](sdlc/docs/project/Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](sdlc/docs/project/Re-run-Resiliency.md)
6. [Sheet References](sdlc/docs/project/Sheet-References.md)
7. [Authentication Setup](sdlc/docs/project/Authentication-Setup.md)
8. [CLI Usage Guide](sdlc/docs/project/CLI-Usage-Guide.md)
9. [Troubleshooting Playbook](sdlc/docs/code/troubleshooting-playbook.md)
10. [Code Conventions](sdlc/docs/code/conventions.md)
11. [Code Patterns](sdlc/docs/code/patterns.md)
12. [Anti-Patterns](sdlc/docs/code/anti-patterns.md)
13. [API Services Catalog](sdlc/docs/api-reference/api-services-catalog.md)
14. **Test Suite Guide** (You are here)

**🔗 Related Documentation**:
- [Data Transformation Guide](sdlc/docs/architecture/03-data-transformation-guide.md) - Validation requirements and mapping rules
- [Code Patterns](sdlc/docs/code/patterns.md) - Builder pattern and mock implementations
- [Integration Tests Specification](sdlc/docs/specs/E2E-Integration-Tests.md) - Detailed test scenarios

---