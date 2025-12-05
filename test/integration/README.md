# Integration Tests for Load Phase

This directory contains integration tests for the Load (L) phase of the ETL pipeline. These tests use **mock Project Online oData responses** with the **real Smartsheet SDK** to verify the complete transformation → loading workflow.

## Architecture

- **Mock**: Project Online oData client (using `MockODataClient` + builders)
- **Real**: Smartsheet SDK (actual API calls)
- **Verify**: Complete transformation and loading to Smartsheet

## Prerequisites

### 1. Smartsheet API Token

You must have a valid Smartsheet API token with workspace creation permissions.

Get your token from: https://app.smartsheet.com/apps/apps-directory

### 2. Environment Configuration

Create a `.env.test` file in the project root (or set environment variables):

```env
# Required
SMARTSHEET_API_TOKEN=your_token_here

# Optional (with defaults)
TEST_WORKSPACE_PREFIX="ETL Test -"
CLEANUP_TEST_WORKSPACES=true
CLEANUP_TEST_WORKSPACES_ON_FAILURE=false
```

### 3. Dependencies

Install required dependencies:

```bash
npm install
```

## Running the Tests

### Run all integration tests
```bash
npm test test/integration
```

### Run specific test suite
```bash
npm test test/integration/load-phase.test.ts
```

### Run with verbose output
```bash
npm test test/integration -- --verbose
```

### Run without cleanup (preserve workspaces for inspection)
```bash
CLEANUP_TEST_WORKSPACES=false npm test test/integration
```

## Test Organization

### Builders (`test/mocks/builders/`)
Fluent builders for creating test data with all edge cases:
- `ODataProjectBuilder.ts` - Project entities
- `ODataTaskBuilder.ts` - Task entities with hierarchy
- `ODataResourceBuilder.ts` - Resource entities (Work/Material/Cost)
- `ODataAssignmentBuilder.ts` - Assignment entities

### Scenarios (`test/integration/scenarios/`)
Pre-built test scenarios using builders:
- `project-scenarios.ts` - 7 project variations
- `task-scenarios.ts` - 14+ task variations
- `resource-scenarios.ts` - 10+ resource variations
- `assignment-scenarios.ts` - 9+ assignment variations

### Helpers (`test/integration/helpers/`)
Integration test utilities:
- `smartsheet-setup.ts` - Workspace lifecycle management
- `odata-fixtures.ts` - Complete test fixtures

### Test Suites

#### `load-phase.test.ts` (Main Integration Tests)

**Project Entity Tests** (7 scenarios)
- Basic project with required fields
- Special characters in names
- All 7 priority levels (0, 200, 400, 500, 600, 800, 1000)
- Null optional fields
- Edge case dates
- Very long names (truncation)
- Complete project with all fields

**Task Entity Tests** (14+ scenarios)
- Flat task lists
- Simple/deep/complex hierarchies
- Duration variations (PT0H, PT40H, P5D, PT480M, null)
- All 7 priority levels
- Milestone tasks
- All 8 constraint types (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
- Predecessor relationships (FS, SS, FF, SF with lag)
- System columns (dual date pattern)

**Resource Entity Tests** (10+ scenarios)
- Work resources with/without email
- Material resources
- Cost resources
- Rate variations (StandardRate, OvertimeRate, CostPerUse)
- MaxUnits variations (0%, 50%, 100%, 150%)
- Boolean fields (IsActive, IsGeneric)
- Department picklist discovery

**Assignment Tests** (9 scenarios)
- **CRITICAL**: Work resources → `MULTI_CONTACT_LIST` columns
- **CRITICAL**: Material resources → `MULTI_PICKLIST` columns
- **CRITICAL**: Cost resources → `MULTI_PICKLIST` columns
- Single/multiple assignments per type
- Mixed assignment types on same task
- Work/Units/Cost tracking

**Performance Tests**
- 1000+ tasks (< 5 minutes execution)

**Error Handling Tests**
- Missing required fields
- Invalid foreign keys
- Unicode and special characters

## Test Data Patterns

### Using Builders Directly
```typescript
import { ODataProjectBuilder } from '../mocks/builders/ODataProjectBuilder';

const project = new ODataProjectBuilder()
  .withName('Test Project')
  .withPriority(800)
  .build();
```

### Using Pre-built Scenarios
```typescript
import * as projectScenarios from './scenarios/project-scenarios';

const projects = projectScenarios.projectsWithAllPriorities();
```

### Using Complete Fixtures
```typescript
import * as fixtures from './helpers/odata-fixtures';

const fixture = fixtures.createCompleteProject();
// fixture.project, fixture.tasks, fixture.resources, fixture.assignments
```

### Loading Fixtures into Mock Client
```typescript
const odataClient = new MockODataClient();
odataClient.loadFixture(fixture);
```

## Workspace Management

Tests automatically create and cleanup workspaces:

```typescript
const workspaceManager = new TestWorkspaceManager(smartsheetClient);
const workspace = await workspaceManager.createWorkspace('Test Name');

// Workspace is automatically cleaned up after test
// (unless CLEANUP_TEST_WORKSPACES=false)
```

### Manual Cleanup

Clean up old test workspaces (>24 hours):
```typescript
import { cleanupOldTestWorkspaces } from './helpers/smartsheet-setup';

await cleanupOldTestWorkspaces(smartsheetClient, 24);
```

## Verification Helpers

### Verify Sheet Structure
```typescript
import { verifySheetColumns, verifySheetRowCount } from './helpers/smartsheet-setup';

const columnCheck = await verifySheetColumns(client, sheetId, [
  { title: 'Task Name', type: 'TEXT_NUMBER' },
  { title: 'Priority', type: 'PICKLIST' },
]);

const rowCheck = await verifySheetRowCount(client, sheetId, 10);
```

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

## Troubleshooting

### Tests fail with "SMARTSHEET_API_TOKEN is required"
Set the environment variable:
```bash
export SMARTSHEET_API_TOKEN="your_token_here"
```

Or create `.env.test` file with the token.

### Tests timeout
Increase Jest timeout in the test:
```typescript
test('large test', async () => {
  // test code
}, 300000); // 5 minutes
```

### Workspaces not cleaning up
Check the environment variables:
```env
CLEANUP_TEST_WORKSPACES=true
```

Or manually clean up:
```bash
# Run cleanup script (to be implemented)
npm run cleanup-test-workspaces
```

### Rate limiting from Smartsheet API
The Smartsheet SDK handles rate limiting automatically with exponential backoff.
If tests consistently hit rate limits, reduce parallelization or add delays between test suites.

## Test Execution Time

Expected execution times:
- Individual test: < 10 seconds
- Project tests (7): ~1 minute
- Task tests (14): ~2 minutes
- Resource tests (10): ~1 minute
- Assignment tests (9): ~1 minute
- Performance test (1000+ tasks): ~3-5 minutes
- **Total suite**: < 10 minutes

## Contributing

When adding new test scenarios:

1. Create builder method if new edge case
2. Add scenario function to appropriate scenarios file
3. Create fixture in `odata-fixtures.ts` if complete dataset needed
4. Add test case to `load-phase.test.ts`
5. Update this README with new test coverage

## References

- Test Scenarios: `test/integration/load-phase-test-scenarios.md`
- Transformation Spec: `sdlc/docs/plans/project-online-smartsheet-transformation-mapping.md`
- Smartsheet API: https://smartsheet-platform.github.io/api-docs/