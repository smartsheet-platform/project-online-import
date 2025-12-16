# PMO Standards Test Failure Root Cause Analysis

**Created:** 2025-12-16
**Status:** 🔍 Critical Discovery - Parallel Execution Hypothesis Rejected
**Context:** Sporadic test failures in PMO Standards integration tests despite implementing factory pattern refactoring, exponential backoff with 404 retries, and singleton workspace approach.

## 🚨 CRITICAL DISCOVERY: Tests Already Run Sequentially!

**Finding:** [`jest.config.js:20`](../jest.config.js:20) explicitly sets `maxWorkers: 1`

```javascript
// Run integration tests serially to avoid API rate limiting and resource conflicts
// Integration tests create real Smartsheet resources and can conflict if run in parallel
maxWorkers: 1
```

**Impact:** This **completely eliminates** the parallel test execution hypothesis. All tests run **sequentially**, so inter-suite race conditions are **impossible**.

**New Focus:** The sporadic failures must be caused by:
1. **Intra-suite state leakage** between sequential tests
2. **Eventual consistency issues** not fully resolved by exponential backoff
3. **Cleanup/teardown timing problems** between tests
4. **Smartsheet API behavior** under sequential load patterns
5. **Test execution order sensitivity**

---

## Executive Summary

The PMO Standards integration test suite is experiencing **sporadic failures** despite:
- ✅ Exponential backoff with 404 retries implemented
- ✅ Singleton workspace creation pattern adopted
- ✅ Sequential test execution enforced (maxWorkers: 1)

This analysis now focuses on **sequential execution failure modes** and **state management issues** within and between test suites.

## Known Good Implementations ✅

### 1. Exponential Backoff with 404 Retries ✅
**Verified:** All Smartsheet client methods are wrapped with [`ExponentialBackoff.tryWith()`](../src/util/ExponentialBackoff.ts:202-234)
- **Lines 132-174**: `isRetryableError()` function explicitly includes 404 for eventual consistency
- **Implementation**: `StandaloneWorkspacesFactory` wraps critical calls:
  - [`getWorkspace` (line 60-64)](../src/factories/StandaloneWorkspacesFactory.ts:60-64)
  - [`createWorkspace` (line 76-81)](../src/factories/StandaloneWorkspacesFactory.ts:76-81)
  - [`getWorkspaceChildren` (line 460-465)](../src/factories/StandaloneWorkspacesFactory.ts:460-465)
  - [`getSheet` (line 336-339)](../src/factories/StandaloneWorkspacesFactory.ts:336-339)

### 2. Singleton Workspace Creation ✅
**Verified:** PMO Standards workspace created once per importer instance
- **Test Pattern** ([`pmo-standards-integration.test.ts:36-42`](../test/integration/pmo-standards-integration.test.ts:36-42)):
  ```typescript
  // CRITICAL FIX: Create ONE shared importer instance for all tests
  importer = new ProjectOnlineImporter(smartsheetClient);
  ```
- **Importer Caching** ([`importer.ts:54`](../src/lib/importer.ts:54)):
  ```typescript
  private pmoStandardsWorkspace?: PMOStandardsWorkspaceInfo;
  ```

### 3. Sequential Test Execution ✅
**Verified:** All tests run sequentially, no parallel execution
- **Configuration** ([`jest.config.js:20`](../jest.config.js:20)): `maxWorkers: 1`
- **Reason:** "Avoid API rate limiting and resource conflicts"

## Revised Problem Analysis

### Test Execution Timeline (Sequential)

```
Time    Suite                            Importer State
----    -----                            --------------
T0      [Load Phase Suite Starts]
T1      Load Phase Test 1 runs           (Different importer per test)
T2      Load Phase Test 1 cleanup
T3      Load Phase Test 2 runs           (New importer instance)
...
Tn      [Load Phase Suite Ends]
----    -------------------------------- --------------
Tn+1    [PMO Standards Suite Starts]     
T​n+2    beforeAll: Create shared importer pmoStandardsWorkspace = undefined
Tn+3    Test 1: First import starts      
Tn+4    → getOrCreatePMOStandardsWorkspace()
Tn+5    → Checks: pmoStandardsWorkspace ? (NO)
Tn+6    → Checks: PMO_STANDARDS_WORKSPACE_ID env var?
Tn+7    → Creates new PMO workspace      
Tn+8    → Caches in pmoStandardsWorkspace ← CRITICAL STATE
Tn+9    Test 1 completes
Tn+10   afterEach: Cleanup project workspace (NOT PMO!)
Tn+11   Test 2: Second import starts     pmoStandardsWorkspace = CACHED ✅
Tn+12   → Checks: pmoStandardsWorkspace ? (YES!)
Tn+13   → Reuses cached workspace ✅
Tn+14   Test 2 completes
...
```

### Potential Failure Vectors (Sequential Execution)

#### Vector 1: Shared Importer State Corruption 🔴 HIGH RISK
**Scenario:** The singleton importer's cached `pmoStandardsWorkspace` gets corrupted

**Mechanisms:**
1. **First test** creates and caches PMO workspace
2. **Cleanup** (`afterEach`) might accidentally affect PMO workspace
3. **Second test** uses cached reference to **deleted/modified workspace**
4. **Result:** 404 errors or unexpected workspace state

**Evidence Needed:**
- Does `afterEach` cleanup logic touch PMO Standards workspace?
- Does `TestWorkspaceManager.cleanup()` have scope creep?
- Could workspace deletion affect cached references?

#### Vector 2: Eventual Consistency Windows 🟡 MEDIUM RISK
**Scenario:** Smartsheet's eventual consistency takes longer than retry windows

**Timeline:**
```
T0   Create PMO workspace → Returns workspace ID immediately
T1   Add reference sheet 1 → Success
T2   Add reference sheet 2 → Success
T3   Query workspace children → May return incomplete list (eventual consistency)
T4   Retry with backoff (1000ms)
T5   Query again → Still incomplete
T6   Retry with backoff (2000ms)
T7   Query again → Complete ✅ (total delay: 3 seconds)
```

**Question:** Are our retry limits sufficient?
- Current: Default 5 retries, 1000ms initial delay
- Max delay: ~31 seconds (1000 + 2000 + 4000 + 8000 + 16000)
- Sufficient? Unknown - depends on Smartsheet's consistency guarantees

#### Vector 3: Test Execution Order Dependency 🟡 MEDIUM RISK
**Scenario:** Tests pass/fail based on execution order

**Patterns:**
1. **First test** in suite: Creates PMO workspace (high risk of consistency issues)
2. **Middle tests**: Reuse cached workspace (low risk)
3. **Last test**: "Full Integration" with most operations (highest stress)

**Analysis Needed:**
- Do early tests fail more often than late tests?
- Does the "Full Integration Workflow" test fail most frequently?
- Can we isolate failure to specific test positions?

#### Vector 4: Cleanup Timing Issues 🟡 MEDIUM RISK
**Scenario:** Workspace cleanup happens too quickly after test completion

**Flow:**
```
T0   Test completes
T1   afterEach: Delete project workspace → Initiated
T2   Smartsheet API returns 200 OK
T3   Next test starts immediately
T4   Next test queries workspace → 404 (deletion not propagated)
T5   Exponential backoff retries...
T6   Eventually succeeds (or times out)
```

**Question:** Should there be a delay between tests?

#### Vector 5: PMO Workspace Creation Race Within Test 🔴 HIGH RISK
**Scenario:** WITHIN a single test, multiple calls to `getOrCreatePMOStandardsWorkspace()`

**Code Path Analysis:**
```typescript
// importer.ts:213-216
if (!this.pmoStandardsWorkspace) {
  this.pmoStandardsWorkspace = await this.getOrCreatePMOStandardsWorkspace();
}
```

**Potential Issue:** What if this gets called multiple times before first call completes?

**Example Timeline:**
```
T0   Test starts
T1   importProject() called
T2   → Check: pmoStandardsWorkspace === undefined ✓
T3   → Call: getOrCreatePMOStandardsWorkspace() ← ASYNC, takes 5 seconds
T4   (Meanwhile, same test calls something else that needs PMO)
T5   → Check: pmoStandardsWorkspace === undefined ✓ (first call not done!)
T6   → Call: getOrCreatePMOStandardsWorkspace() ← DUPLICATE CALL!
T7   Both calls try to create workspace → RACE CONDITION
```

**Critical Question:** Can a SINGLE test make multiple concurrent calls to `importProject()`?
- Looking at test code... NO, each test waits for `await importer.importProject()`
- But what about the importer's internal operations?

#### Vector 6: Reference Sheet Creation Ordering 🟡 MEDIUM RISK
**Scenario:** Reference sheets created in non-deterministic order causes issues

**Code:** [`StandaloneWorkspacesFactory.ts:92-101`](../src/factories/StandaloneWorkspacesFactory.ts:92-101)
```typescript
for (const [sheetName, values] of Object.entries(STANDARD_REFERENCE_SHEETS)) {
  const sheetInfo = await this.ensureStandardReferenceSheet(...);
  referenceSheets[sheetName] = sheetInfo;
}
```

**Issue:** `Object.entries()` order is **not guaranteed** in older JS engines (though it is in modern ones)

**Impact:** LOW - Modern Node.js (v18+) guarantees insertion order

#### Vector 7: Smartsheet API Rate Limiting 🟢 LOW RISK
**Finding:** Tests run with `maxWorkers: 1` specifically to avoid rate limiting
**Status:** Unlikely to be the cause, but monitor for 429 errors

## Deep Dive: Test Cleanup Behavior

### Current Cleanup Pattern

```typescript
// pmo-standards-integration.test.ts:53-59
afterEach(async () => {
  if (workspaceManager) {
    const testPassed = expect.getState().currentTestName ? true : false;
    await workspaceManager.cleanup(testPassed);
  }
}, 60000);
```

### TestWorkspaceManager.cleanup() Analysis

```typescript
// smartsheet-setup.ts:388-403
async cleanup(testPassed: boolean = true): Promise<void> {
  const shouldCleanup = testPassed ? this.config.cleanupOnSuccess : this.config.cleanupOnFailure;

  if (!shouldCleanup) {
    console.log('Skipping workspace cleanup (preserving for inspection)');
    this.workspaces.forEach((ws) => {
      console.log(`  - ${ws.name}: ${ws.permalink}`);
    });
    return;
  }

  for (const workspace of this.workspaces) {
    await deleteTestWorkspace(this.client, workspace.id);
  }
  this.workspaces = [];
}
```

**Key Question:** What workspaces are tracked in `this.workspaces`?

```typescript
// smartsheet-setup.ts:376-386
trackWorkspace(workspaceId: number, workspaceName?: string): void {
  if (!this.workspaces.find((ws) => ws.id === workspaceId)) {
    this.workspaces.push({
      id: workspaceId,
      name: workspaceName || `Workspace ${workspaceId}`,
      permalink: '',
      createdAt: new Date(),
    });
  }
}
```

**Finding:** Tests explicitly call `workspaceManager.trackWorkspace(result.workspaceId)` for PROJECT workspaces only

**PMO Standards Workspace:** NOT tracked by TestWorkspaceManager (intentional design)

**Conclusion:** Cleanup should NOT be deleting PMO Standards workspace ✅

## Critical Missing Information

### What We DON'T Know (Need to Investigate):

1. **Actual Failure Patterns:**
   - Which specific tests fail most often?
   - What are the exact error messages?
   - Are there 404s? Timeouts? Data mismatches?

2. **Failure Frequency:**
   - How often do tests fail? (1%, 10%, 50%?)
   - Is it always the same test(s)?
   - Does failure rate increase with more tests in suite?

3. **Error Context:**
   - At what point in the test does failure occur?
   - During PMO workspace creation?
   - During project workspace creation?
   - During picklist configuration?

4. **Environment Variables:**
   - Is `PMO_STANDARDS_WORKSPACE_ID` set during test runs?
   - If yes, does it point to valid workspace?
   - If no, are tests creating fresh workspace each run?

5. **Smartsheet API Behavior:**
   - How long does eventual consistency actually take?
   - Are there any 429 rate limit responses?
   - Any workspace creation conflicts/failures?

## Diagnostic Action Plan

### Phase 1: Data Collection (DO THIS FIRST)
1. **Run PMO Standards suite 20 times** and collect:
   - Pass/fail for each test
   - Error messages for failures
   - Timestamps for each operation
   - Smartsheet API response times

2. **Add comprehensive logging** to importer:
```typescript
private async getOrCreatePMOStandardsWorkspace(): Promise<PMOStandardsWorkspaceInfo> {
  const startTime = Date.now();
  console.log(`[PMO] getOrCreatePMOStandardsWorkspace called at ${new Date().toISOString()}`);
  console.log(`[PMO] Current cached workspace: ${this.pmoStandardsWorkspace?.workspaceId || 'none'}`);
  console.log(`[PMO] ENV PMO_STANDARDS_WORKSPACE_ID: ${process.env.PMO_STANDARDS_WORKSPACE_ID || 'not set'}`);
  
  try {
    const result = await this.workspaceFactory.createStandardsWorkspace(...);
    console.log(`[PMO] Workspace ready in ${Date.now() - startTime}ms: ${result.workspaceId}`);
    return result;
  } catch (error) {
    console.error(`[PMO] Failed after ${Date.now() - startTime}ms:`, error);
    throw error;
  }
}
```

3. **Add test-level logging:**
```typescript
beforeEach(() => {
  console.log(`[TEST] Starting: ${expect.getState().currentTestName}`);
  console.log(`[TEST] Cached PMO workspace: ${importer['pmoStandardsWorkspace']?.workspaceId || 'none'}`);
  workspaceManager = new TestWorkspaceManager(smartsheetClient);
});

afterEach(async () => {
  console.log(`[TEST] Ending: ${expect.getState().currentTestName}`);
  console.log(`[TEST] Tracked workspaces for cleanup: ${workspaceManager.getWorkspaces().length}`);
  // ... existing cleanup
});
```

### Phase 2: Isolation Testing
1. **Run each test individually:**
```bash
npm test -- --testNamePattern="should create PMO Standards workspace"
npm test -- --testNamePattern="should reuse PMO Standards workspace"
# ... etc for all 8 tests
```

2. **Run tests in different orders:**
```bash
npm test -- --testNamePattern="Full Integration" # Last test first
npm test -- --testNamePattern="PMO Standards Workspace Creation" # First test
```

3. **Run with delays between tests:**
```typescript
afterEach(async () => {
  await workspaceManager.cleanup(testPassed);
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
});
```

### Phase 3: Hypothesis Validation

#### Test Hypothesis A: Eventual Consistency Limits
**Prediction:** Tests fail when Smartsheet takes > 31 seconds to propagate changes
**Test:** Increase retry limits temporarily:
```typescript
await withBackoff(
  () => operation(),
  10,  // 10 retries instead of 5
  2000 // 2 second initial delay instead of 1
);
```

#### Test Hypothesis B: Cleanup Timing
**Prediction:** Tests fail when cleanup completes < 2 seconds before next test
**Test:** Add mandatory delay in afterEach

#### Test Hypothesis C: State Corruption
**Prediction:** Cached workspace reference becomes invalid
**Test:** Add validation before using cached workspace:
```typescript
if (this.pmoStandardsWorkspace) {
  // Verify workspace still exists
  try {
    await this.smartsheetClient.workspaces.getWorkspace({
      workspaceId: this.pmoStandardsWorkspace.workspaceId
    });
  } catch (error) {
    console.error('[PMO] Cached workspace invalid, clearing cache');
    this.pmoStandardsWorkspace = undefined;
  }
}
```

### Phase 4: Implement Fix Based on Data

**Once we have failure data, implement targeted fix:**

#### Fix Option 1: Pre-create PMO Workspace for Tests
```typescript
// In test/setup.ts
beforeAll(async () => {
  // Create ONE PMO workspace for all test runs
  const pmoWorkspaceId = await createPMOWorkspaceForTests();
  process.env.PMO_STANDARDS_WORKSPACE_ID = String(pmoWorkspaceId);
});
```

#### Fix Option 2: Increase Retry Resilience
```typescript
// In ExponentialBackoff.ts
const testEnvironment = process.env.NODE_ENV === 'test';
const maxRetries = testEnvironment ? 10 : 5;
const initialDelay = testEnvironment ? 2000 : 1000;
```

#### Fix Option 3: Add Workspace Cache Validation
```typescript
private async getOrCreatePMOStandardsWorkspace(): Promise<PMOStandardsWorkspaceInfo> {
  if (this.pmoStandardsWorkspace) {
    // Validate cached workspace still exists
    if (await this.validateCachedWorkspace(this.pmoStandardsWorkspace)) {
      return this.pmoStandardsWorkspace;
    }
    // Cache invalid, clear and recreate
    this.pmoStandardsWorkspace = undefined;
  }
  // ... create new workspace
}
```

#### Fix Option 4: Force Inter-Test Delays
```typescript
// jest.config.js
testTimeout: 90000,  // 90 seconds per test
// + add delays in afterEach
```

## Immediate Next Steps

1. ✅ **Document current analysis** (this file)
2. 🔴 **Collect failure data** - Run suite 20 times with logging
3. 🔴 **Analyze failure patterns** - Which tests? What errors?
4. 🟡 **Test isolation** - Run tests individually
5. 🟡 **Hypothesis validation** - Test each hypothesis systematically
6. 🟢 **Implement fix** - Based on data, not speculation

## Critical Questions to Answer Before Implementing Any Fix

1. **Do tests actually fail sporadically, or do they pass reliably now?**
   - User says "tests still fail sporadically"
   - But have we quantified this? 1/10 runs? 5/10?

2. **Which specific test(s) fail?**
   - Is it always the same test?
   - Or random tests in the suite?

3. **What is the exact error message?**
   - 404 Not Found?
   - Timeout?
   - Data mismatch?
   - Something else?

4. **When do failures occur?**
   - During PMO workspace creation?
   - During project import?
   - During picklist configuration?
   - During assertions?

**WE CANNOT FIX WHAT WE CANNOT MEASURE.**

## References

- **Prior Factory Pattern Refactoring:** `sdlc/docs/specs/Factory-Pattern-Refactoring-Plan.md`
- **Exponential Backoff Implementation:** [`src/util/ExponentialBackoff.ts`](../src/util/ExponentialBackoff.ts)
- **Test Status:** [`memory-bank/integration-test-status.md`](./integration-test-status.md)
- **Test Architecture:** [`test/README.md`](../test/README.md)
- **Jest Configuration:** [`jest.config.js`](../jest.config.js)