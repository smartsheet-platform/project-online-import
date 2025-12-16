# PMO Standards Test Diagnostics

## Overview

This directory contains diagnostic tools to systematically investigate sporadic failures in the PMO Standards integration test suite. The tools collect empirical data about test behavior to enable data-driven fixes rather than speculative changes.

## 🚨 Critical Discovery

**Tests already run sequentially** (`maxWorkers: 1` in [`jest.config.js`](../jest.config.js:20)), eliminating parallel execution as a cause. The diagnostics focus on sequential execution failure modes.

## What Was Implemented

### 1. Diagnostic Logging in Production Code

**File:** [`src/lib/importer.ts`](../src/lib/importer.ts)

Added comprehensive logging to `getOrCreatePMOStandardsWorkspace()` method (lines 337-398) controlled by `TEST_DIAGNOSTICS` environment variable:

- **Timestamps**: Precise timing of workspace operations
- **State Tracking**: Current cached workspace ID
- **Environment Variables**: PMO_STANDARDS_WORKSPACE_ID value
- **Operation Flow**: Step-by-step progress through workspace creation/retrieval
- **Error Context**: Detailed error information with timing

**Activation:** Set `TEST_DIAGNOSTICS=true` to enable logging without affecting production behavior.

### 2. Diagnostic Logging in Test Suite

**File:** [`test/integration/pmo-standards-integration.test.ts`](../test/integration/pmo-standards-integration.test.ts)

Added logging in test lifecycle hooks (beforeAll, beforeEach, afterEach):

- **Suite Initialization**: Process PID, environment state, timestamp
- **Per-Test Context**: Test name, cached workspace state, tracked workspaces
- **Cleanup Tracking**: Which workspaces are being cleaned up
- **Test Completion**: Success/failure indicators with timing

### 3. Automated Test Runner Script

**File:** [`scripts/run-pmo-standards-diagnostics.sh`](./run-pmo-standards-diagnostics.sh)

Bash script that:
- Runs PMO Standards suite multiple times (default: 20)
- Enables diagnostic logging automatically
- Captures individual test run logs
- Generates comprehensive summary report
- Analyzes failure patterns and error types
- Provides actionable recommendations based on failure rates

## How to Use

### Step 1: Run Diagnostics

```bash
# Run 20 iterations (recommended)
./scripts/run-pmo-standards-diagnostics.sh 20

# Or use default (also 20)
./scripts/run-pmo-standards-diagnostics.sh

# Quick test with fewer runs
./scripts/run-pmo-standards-diagnostics.sh 5
```

**Expected Duration:**
- 20 runs: ~20-30 minutes (depending on test suite execution time)
- Each run: ~60-90 seconds
- 2-second delay between runs to avoid API rate limiting

### Step 2: Review Results

The script creates a timestamped directory in `test-diagnostics/` with:

```
test-diagnostics/
└── run_20231216_143052/
    ├── summary.txt          # Main analysis report
    ├── run_1.log           # Individual test run logs
    ├── run_2.log
    └── ... (one per run)
```

**View summary:**
```bash
cat test-diagnostics/run_*/summary.txt
```

**Search for patterns:**
```bash
# Find all PMO diagnostic messages
grep "\[PMO DIAG\]" test-diagnostics/run_*/*.log

# Find specific errors
grep "Error:" test-diagnostics/run_*/run_*.log

# Find 404 errors
grep "404" test-diagnostics/run_*/run_*.log
```

### Step 3: Analyze Results

The summary report provides:

1. **Overall Statistics**
   - Pass/fail counts and percentages
   - Total runs and timestamps

2. **Failure Analysis** (if failures occurred)
   - Which tests failed most frequently
   - Error type breakdown (404s, timeouts, etc.)
   - Failure patterns and trends

3. **Recommendations**
   - **0 failures**: No issues detected ✅
   - **1-2 failures (≤10%)**: Possible transient issues ⚠️
   - **3-5 failures (≤25%)**: Investigate specific patterns ⚠️
   - **6+ failures (>25%)**: Systematic issue detected ❌

### Step 4: Share Results

If failures occur, share these files for analysis:

1. **Summary report:** `test-diagnostics/run_*/summary.txt`
2. **Sample failure logs:** 2-3 logs from runs that failed
3. **Failure pattern:** Which tests fail most often

## What to Look For

### In Individual Run Logs

**PMO Workspace Creation:**
```
[PMO DIAG] getOrCreatePMOStandardsWorkspace called at 2023-12-16T14:30:52.123Z
[PMO DIAG] Current cached workspace: NONE
[PMO DIAG] ENV PMO_STANDARDS_WORKSPACE_ID: NOT SET
[PMO DIAG] No workspace ID provided, will create new
[PMO DIAG] Calling factory.createStandardsWorkspace...
[PMO DIAG] ✅ Workspace ready in 2847ms
[PMO DIAG] Workspace ID: 1234567890
[PMO DIAG] Reference sheets: 6
```

**Test Lifecycle:**
```
================================================================================
[TEST SUITE] PMO Standards Integration Tests - beforeAll()
[TEST SUITE] Time: 2023-12-16T14:30:50.000Z
[TEST SUITE] Process PID: 12345
[TEST SUITE] PMO_STANDARDS_WORKSPACE_ID: NOT SET
================================================================================

[TEST] Starting: should create PMO Standards workspace
[TEST] Time: 2023-12-16T14:30:52.123Z
[TEST] Cached PMO workspace: NONE
```

### Red Flags to Watch For

1. **Cached workspace becomes NONE between tests**
   - Indicates state corruption
   - Should stay cached after first test

2. **Multiple workspace creations**
   - PMO workspace should only be created once
   - Multiple `Workspace ready` messages = problem

3. **Long operation times**
   - Workspace creation > 5 seconds = potential timeout risk
   - Operation times increasing over test run = resource leak

4. **404 errors on existing workspaces**
   - Eventual consistency taking too long
   - May need increased retry limits

5. **Consistent failure on same test(s)**
   - Test execution order dependency
   - Specific test design issue

## Potential Fixes (Based on Data)

### If Failures are Random (< 10%)
**Diagnosis:** Transient Smartsheet API issues

**Fix:** Increase exponential backoff limits
```typescript
// In ExponentialBackoff.ts or test-specific config
const maxRetries = 10;  // Instead of 5
const initialDelay = 2000;  // Instead of 1000ms
```

### If Failures are in First Test
**Diagnosis:** Workspace creation taking too long

**Fix:** Pre-create PMO workspace for tests
```bash
# In .env.test
PMO_STANDARDS_WORKSPACE_ID=<existing_workspace_id>
```

### If Cached Workspace Becomes Invalid
**Diagnosis:** Workspace cleanup affecting shared workspace

**Fix:** Add workspace validation before use
```typescript
// See memory-bank/pmo-standards-test-analysis.md - Fix Option 3
```

### If Failures Increase Over Time
**Diagnosis:** Resource leak or cumulative API load

**Fix:** Add inter-test delays
```typescript
afterEach(async () => {
  await workspaceManager.cleanup(testPassed);
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
});
```

## Disabling Diagnostics

Once data is collected and fixes implemented, disable diagnostics:

```bash
# Run without diagnostics (normal mode)
npm test -- test/integration/pmo-standards-integration.test.ts

# Or explicitly disable
TEST_DIAGNOSTICS=false npm test -- test/integration/pmo-standards-integration.test.ts
```

Diagnostic logging adds minimal overhead but should be disabled for production test runs.

## Additional Resources

- **Comprehensive Analysis:** [`memory-bank/pmo-standards-test-analysis.md`](../memory-bank/pmo-standards-test-analysis.md)
- **Test Status:** [`memory-bank/integration-test-status.md`](../memory-bank/integration-test-status.md)
- **Test Architecture:** [`test/README.md`](../test/README.md)
- **Jest Configuration:** [`jest.config.js`](../jest.config.js)

## Troubleshooting

### Script Doesn't Run
```bash
# Ensure script is executable
chmod +x scripts/run-pmo-standards-diagnostics.sh

# Run directly
bash scripts/run-pmo-standards-diagnostics.sh 20
```

### API Token Issues
```bash
# Verify token is set
echo $SMARTSHEET_API_TOKEN

# Or check .env.test
cat .env.test | grep SMARTSHEET_API_TOKEN
```

### Disk Space
Each run creates ~500KB-1MB of log data. 20 runs = ~10-20MB.

### Memory Issues
Sequential execution (`maxWorkers: 1`) prevents memory issues, but if problems occur:
```bash
# Reduce number of runs
./scripts/run-pmo-standards-diagnostics.sh 10
```

## Next Steps After Data Collection

1. **Review summary report** for failure patterns
2. **Identify most common failure type** (404, timeout, etc.)
3. **Check memory-bank/pmo-standards-test-analysis.md** for matching hypothesis
4. **Implement targeted fix** based on data, not speculation
5. **Re-run diagnostics** to validate fix
6. **Update test documentation** with findings

---

**Questions or Issues?**

See [`memory-bank/pmo-standards-test-analysis.md`](../memory-bank/pmo-standards-test-analysis.md) for detailed analysis and all proposed fixes with pros/cons.