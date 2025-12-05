# TDD Implementation Plan for Integration Tests

## Current Status
- **Test Suite**: 31 tests defined in [`INTEGRATION_TEST_SPEC.md`](./INTEGRATION_TEST_SPEC.md:1)
- **Phase 1 Complete**: Basic project creation test passing ✅
- **Current Phase**: Phase 2 - Project Entity Tests (6 remaining tests)

## Immediate Issue to Fix

### Workspace Name Length Violation
**Error**: Smartsheet workspace name limit is 50 characters, but test workspace names are 56 characters

**Location**: [`test/integration/helpers/smartsheet-setup.ts`](../../test/integration/helpers/smartsheet-setup.ts:46)

**Fix Required**:
```typescript
// Line 46-47: Current code generates names that are too long
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const workspaceName = `${config.prefix}${testName} ${timestamp}`;

// Problem: "ETL Test -" (11) + "Special Chars Project" (21) + " " (1) + "2025-12-05T00-13-16-181Z" (24) = 57 chars

// Solution: Truncate to fit within 50 characters while preserving uniqueness
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const maxNameLength = 50;
const prefixLength = config.prefix.length;
const timestampLength = timestamp.length + 1; // +1 for space
const maxTestNameLength = maxNameLength - prefixLength - timestampLength;

let truncatedTestName = testName;
if (testName.length > maxTestNameLength) {
  truncatedTestName = testName.substring(0, maxTestNameLength - 3) + '...';
}

const workspaceName = `${config.prefix}${truncatedTestName} ${timestamp}`;
```

## TDD Workflow for Each Test

### Step 1: Run Test (RED)
```bash
npm test -- test/integration/load-phase.test.ts --testNamePattern="<test name>"
```

### Step 2: Identify Failure Cause
- Missing fixture function?
- Missing transformer method?
- Incorrect validation?
- Environment issue?

### Step 3: Implement Minimum to Pass (GREEN)
- Add missing fixtures
- Implement transformer methods
- Fix validation logic

### Step 4: Verify Test Passes
```bash
npm test -- test/integration/load-phase.test.ts --testNamePattern="<test name>"
```

### Step 5: Document Result
Update [`INTEGRATION_TEST_SPEC.md`](./INTEGRATION_TEST_SPEC.md:1) with status:
- ✅ PASSING - Test passes all assertions
- ⚠️ PARTIAL - Test passes but with known limitations
- ❌ FAILING (Reason) - Test fails with explanation
- 🚫 IGNORED (Reason) - Test skipped after 10 attempts

### Step 6: Move to Next Test
Repeat cycle for next test in priority order

## Phase 2: Project Entity Tests (6 tests)

### Test 2.1: project-002-special-chars ⏳
**Status**: Blocked by workspace name length issue

**Test Name**: `should handle project with special characters in name`

**Prerequisites**:
1. Fix workspace name truncation in [`smartsheet-setup.ts`](../../test/integration/helpers/smartsheet-setup.ts:46)
2. Verify [`createSpecialCharsProject()`](./helpers/odata-fixtures.ts:263) exists ✅
3. Verify [`projectWithSpecialCharacters()`](./scenarios/project-scenarios.ts:26) exists ✅

**Expected Behavior**:
- Project name with special characters: `Test Project <with> "special" & chars`
- Workspace created with sanitized name (removes `< > : " \ | ? *`)
- No API errors

**Implementation Required**:
- [`ProjectTransformer.transformProject()`](../../src/transformers/ProjectTransformer.ts:1) must sanitize workspace names

**Validation**:
```typescript
expect(result.workspace.name).toBeDefined();
expect(result.workspace.name).not.toMatch(/[<>:"\\|?*]/);
```

### Test 2.2: project-003-priorities ⏳
**Test Name**: `should handle all 7 priority levels`

**Prerequisites**:
1. [`projectScenarios.projectsWithAllPriorities()`](./scenarios/project-scenarios.ts:42) exists ✅
2. Creates 7 projects with priorities: 0, 200, 400, 500, 600, 800, 1000

**Expected Behavior**:
- Each project creates workspace successfully
- Priority values mapped to Smartsheet picklist (if summary sheet populated)

**Implementation Required**:
- May need priority mapping logic in [`ProjectTransformer`](../../src/transformers/ProjectTransformer.ts:1)

**Validation**:
```typescript
for (const project of projects) {
  const result = await transformer.transformProject(project, workspace.id);
  expect(result.workspace).toBeDefined();
}
```

### Test 2.3: project-004-null-fields ⏳
**Test Name**: `should handle project with null optional fields`

**Prerequisites**:
1. [`fixtures.getFixture('minimal')`](./helpers/odata-fixtures.ts:336) exists ✅
2. Creates project with only required fields

**Expected Behavior**:
- No exceptions thrown for null/undefined fields
- Workspace created successfully

**Implementation Required**:
- [`ProjectTransformer`](../../src/transformers/ProjectTransformer.ts:1) must handle null fields gracefully

**Validation**:
```typescript
expect(result.workspace).toBeDefined();
// Should not throw any errors
```

### Test 2.4: project-005-edge-dates ⏳
**Test Name**: `should handle project with edge case dates`

**Prerequisites**:
1. [`createEdgeDateProject()`](./helpers/odata-fixtures.ts:292) exists ✅
2. [`projectWithEdgeDates()`](./scenarios/project-scenarios.ts:68) exists ✅
3. Creates dates: 1900-01-01, 2100-12-31, 1950-06-15

**Expected Behavior**:
- Dates correctly parsed and stored
- No timezone conversion errors

**Implementation Required**:
- Date parsing in [`ProjectTransformer`](../../src/transformers/ProjectTransformer.ts:1)

**Validation**:
```typescript
expect(result.workspace).toBeDefined();
// Dates should be handled without errors
```

### Test 2.5: project-006-long-name ⏳
**Test Name**: `should truncate very long project names`

**Prerequisites**:
1. [`projectScenarios.projectWithLongName()`](./scenarios/project-scenarios.ts:35) exists ✅
2. Creates project with 200+ character name

**Expected Behavior**:
- Workspace name truncated to ≤ 100 characters
- Name remains recognizable

**Implementation Required**:
- Name truncation in [`ProjectTransformer`](../../src/transformers/ProjectTransformer.ts:1)

**Validation**:
```typescript
expect(result.workspace.name.length).toBeLessThanOrEqual(100);
```

### Test 2.6: project-007-complete ⏳
**Test Name**: `should create complete project with all optional fields`

**Prerequisites**:
1. [`projectScenarios.completeProject()`](./scenarios/project-scenarios.ts:19) exists ✅
2. Creates project with ALL optional fields

**Expected Behavior**:
- All fields successfully transformed
- No data loss

**Implementation Required**:
- Complete implementation of [`ProjectTransformer`](../../src/transformers/ProjectTransformer.ts:1)
- Summary sheet population with all fields

**Validation**:
```typescript
expect(result.workspace).toBeDefined();
// All fields should be present in summary sheet (if populated)
```

## Phase 3-7: Remaining Tests

See [`INTEGRATION_TEST_SPEC.md`](./INTEGRATION_TEST_SPEC.md:1) for complete specifications of:
- Phase 3: Task Entity - Basic (5 tests)
- Phase 4: Task Entity - Advanced (5 tests)
- Phase 5: Resource Entity (7 tests)
- Phase 6: CRITICAL Assignment Tests (3 tests)
- Phase 7: Performance & Error Handling (4 tests)

## Success Criteria

### Per Test
- [ ] Test runs without setup errors
- [ ] Test assertions pass
- [ ] Data correctly transformed
- [ ] Edge cases handled

### Per Phase
- [ ] All tests in phase passing
- [ ] No regressions in previous phases
- [ ] Documentation updated

### Overall
- [ ] All 31 tests passing
- [ ] Average test time < 10 seconds (except performance test)
- [ ] No API rate limit errors
- [ ] Test workspaces cleaned up properly

## Commands Reference

### Run Single Test
```bash
npm test -- test/integration/load-phase.test.ts --testNamePattern="<pattern>"
```

### Run All Integration Tests
```bash
npm test -- test/integration/load-phase.test.ts
```

### Run with Verbose Output
```bash
VERBOSE_TESTS=true npm test -- test/integration/load-phase.test.ts
```

### Preserve Failed Workspaces
```bash
CLEANUP_TEST_WORKSPACES=false npm test -- test/integration/load-phase.test.ts
```

## Delegation to Code Mode

This TDD process requires:
1. Code changes to transformers and helpers
2. Running tests iteratively
3. Debugging failures
4. Implementing fixes

**Delegate to [`Code mode`](../../../.roo/rules-code/1_code_role.xml) for:**
- Fixing workspace name truncation issue
- Implementing transformer methods
- Running TDD cycles for each test
- Updating test status in [`INTEGRATION_TEST_SPEC.md`](./INTEGRATION_TEST_SPEC.md:1)