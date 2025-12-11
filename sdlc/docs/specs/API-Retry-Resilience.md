# API Retry Resilience Specification

## Overview

This specification defines the implementation of comprehensive retry logic using [`ExponentialBackoff`](../../../src/util/ExponentialBackoff.ts) for all external API calls in the Project Online to Smartsheet migration tool. Currently, retry logic is only partially implemented for OData calls and completely missing for Smartsheet SDK calls.

**Jira Issue**: TBD  
**Status**: Draft  
**Created**: 2025-12-11  
**Last Updated**: 2025-12-11

## Problem Statement

### Current State

The codebase has [`ExponentialBackoff`](../../../src/util/ExponentialBackoff.ts) utility implemented and unit tested, but it's not consistently applied:

**✅ IMPLEMENTED:**
- [`ProjectOnlineClient.executeGet()`](../../../src/lib/ProjectOnlineClient.ts:205-212) correctly wraps HTTP GET requests to OData API with retry logic using `this.backoff.execute()`
- ExponentialBackoff class supports both `.execute()` method and standalone `tryWith()` function

**❌ MISSING:**
- All Smartsheet SDK API calls in [`SmartsheetHelpers.ts`](../../../src/util/SmartsheetHelpers.ts) lack retry logic (22+ API calls)
- Transformer Smartsheet SDK calls lack retry logic
- No retry configuration for Smartsheet-specific rate limits (300 requests/minute)

### Gaps Identified

1. **SmartsheetHelpers.ts** - No retry wrapping on:
   - `client.workspaces.getWorkspaceChildren()` (lines 29-32, 514-516)
   - `client.sheets.getSheet()` (lines 75-77, 117-119, etc.)
   - `client.sheets.createSheetInWorkspace()` (lines 89-92)
   - `client.sheets.addColumn()` (lines 184-187, 336-339)
   - `client.sheets.updateSheet()` (lines 433-438)
   - `client.sheets.deleteRows()` (lines 484-490)
   - `client.workspaces.createWorkspace()` (lines 395-399)

2. **Transformers** - Likely missing retry on:
   - Sheet creation/update operations
   - Row insertion operations
   - Column configuration operations

3. **Rate Limit Handling** - Smartsheet API has 300 req/min limit but no retry configuration exists

## Requirements

### Functional Requirements

1. **FR-1**: All OData API calls MUST be wrapped with exponential backoff retry logic
2. **FR-2**: All Smartsheet SDK API calls MUST be wrapped with exponential backoff retry logic using `tryWith()` from ExponentialBackoff
3. **FR-3**: Retry configuration MUST be consistent per API type (OData vs Smartsheet)
4. **FR-4**: Rate limit errors (429) MUST trigger appropriate backoff delays
5. **FR-5**: Transient errors (network timeouts, 5xx) MUST trigger retries
6. **FR-6**: Non-retryable errors (401, 403, 4xx) MUST NOT trigger retries (handled by ExponentialBackoff naturally)
7. **FR-7**: Retry attempts MUST be logged for debugging when logger is provided
8. **FR-8**: Maximum retry attempts MUST be configurable

### Non-Functional Requirements

1. **NFR-1**: Performance - Retry logic MUST NOT add latency to successful calls
2. **NFR-2**: Observability - Retry attempts should be logged at ERROR level when max retries exceeded
3. **NFR-3**: Maintainability - Use existing ExponentialBackoff utility, no custom wrappers needed
4. **NFR-4**: Testing - All retry paths MUST be unit tested

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Call Sites                          │
│  (Transformers, SmartsheetHelpers, ProjectOnlineClient)    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Wrap calls with tryWith() or .execute()
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         ExponentialBackoff (src/util/ExponentialBackoff.ts) │
│  • tryWith() function for inline wrapping                   │
│  • .execute() method for class-based retry                  │
│  • Configurable retry parameters                            │
│  • Automatic exponential backoff delays                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Delegates to
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   External APIs                             │
│  • Project Online OData API                                 │
│  • Smartsheet REST API (via SDK)                            │
└─────────────────────────────────────────────────────────────┘
```

### Retry Configuration

The `tryWith()` function will read default parameter values from environment variables:

```bash
# .env configuration (optional)
RETRY_MAX_RETRIES=5              # Default max retries (default: 5)
RETRY_INITIAL_DELAY_MS=1000      # Default initial delay (default: 1000)
```

**Current `tryWith()` signature:**
```typescript
export async function tryWith<T>(
  operationFunction: () => Promise<T>,
  maximumNumberOfTries: number = 5,      // Hardcoded default
  initialBackoffMilliseconds: number = 1000,  // Hardcoded default
  logger?: Logger
): Promise<T>
```

**Updated `tryWith()` signature:**
```typescript
export async function tryWith<T>(
  operationFunction: () => Promise<T>,
  maximumNumberOfTries: number = parseInt(process.env.RETRY_MAX_RETRIES || '5', 10),
  initialBackoffMilliseconds: number = parseInt(process.env.RETRY_INITIAL_DELAY_MS || '1000', 10),
  logger?: Logger
): Promise<T>
```

This allows configuration via environment variables while maintaining backward compatibility.

### Error Classification

**Retryable Errors:**
- Network timeouts (ETIMEDOUT, ECONNABORTED)
- Server errors (500, 502, 503)
- Rate limits (429) with appropriate backoff
- Connection refused (ECONNREFUSED)

**Non-Retryable Errors:**
- Authentication errors (401)
- Authorization errors (403)
- Client errors (400, 404, 422)
- Invalid data errors

> **Note**: ExponentialBackoff retries ALL errors. Error classification should be implemented at the API client level if needed (e.g., in error interceptors).

### Implementation Approach

#### SmartsheetHelpers.ts Wrapping Pattern

**Current (No Retry):**
```typescript
export async function findSheetInWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string
): Promise<{ id: number; name: string } | null> {
  try {
    const response = await client.workspaces?.getWorkspaceChildren?.({
      workspaceId,
      queryParameters: { includeAll: true },
    });
    // ... rest of logic
  } catch (error) {
    throw new Error(
      `Failed to search for sheet: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

**Proposed (With Retry using tryWithBackoff):**
```typescript
import { tryWith as tryWithBackoff } from './ExponentialBackoff';
import { Logger } from './Logger';

export async function findSheetInWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string,
  logger?: Logger
): Promise<{ id: number; name: string } | null> {
  try {
    // Uses env vars RETRY_MAX_RETRIES and RETRY_INITIAL_DELAY_MS, or hardcoded defaults
    const response = await tryWithBackoff(
      () => client.workspaces?.getWorkspaceChildren?.({
        workspaceId,
        queryParameters: { includeAll: true },
      }),
      undefined,  // Uses default (from env or fallback to 5)
      undefined,  // Uses default (from env or fallback to 1000)
      logger
    );
    // ... rest of logic
  } catch (error) {
    throw new Error(
      `Failed to search for sheet: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

**Or even simpler (omit optional parameters):**
```typescript
// All optional parameters use defaults (from env or fallback)
const response = await tryWithBackoff(
  () => client.sheets.getSheet({ id: sheetId })
);
```

**Can still override with explicit values if needed:**
```typescript
const response = await tryWithBackoff(
  () => client.sheets.getSheet({ id: sheetId }),
  3,      // Override maxRetries
  500,    // Override initialDelayMs
  logger
);
```

#### ProjectOnlineClient - Can Be Simplified

[`ProjectOnlineClient.executeGet()`](../../../src/lib/ProjectOnlineClient.ts:205-212) currently uses `.execute()` method:

**Current Implementation:**
```typescript
// Constructor
constructor(config: ProjectOnlineClientConfig, logger?: Logger) {
  this.backoff = new ExponentialBackoff({
    maxRetries: this.config.maxRetries!,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  });
}

// executeGet method
private async executeGet<T>(url: string): Promise<T> {
  return this.backoff.execute(async () => {
    await this.checkRateLimit();
    this.logger.debug(`GET ${url}`);
    const response = await this.httpClient.get<T>(url);
    return response.data;
  });
}
```

**Recommended Simplification (Use tryWithBackoff):**
```typescript
import { tryWith as tryWithBackoff } from '../util/ExponentialBackoff';

// No need to create backoff instance in constructor
// Remove: this.backoff = new ExponentialBackoff(...)

// executeGet method using tryWithBackoff
private async executeGet<T>(url: string): Promise<T> {
  return tryWithBackoff(
    async () => {
      await this.checkRateLimit();
      this.logger.debug(`GET ${url}`);
      const response = await this.httpClient.get<T>(url);
      return response.data;
    },
    this.config.maxRetries,  // Optional: can use env default instead
    1000,                     // Or use env default
    this.logger
  );
}
```

**Benefits of using tryWithBackoff():**
- More consistent with SmartsheetHelpers pattern
- Simpler - no need to store `this.backoff` instance
- Can leverage environment variable configuration
- Cleaner, more functional approach

## Implementation Plan

### Phase 1: SmartsheetHelpers.ts (Priority: HIGH)

**Files to Modify:**
- [`src/util/SmartsheetHelpers.ts`](../../../src/util/SmartsheetHelpers.ts)

**Functions Requiring Retry Wrapping:**
1. `findSheetInWorkspace()` - Line 22
2. `getOrCreateSheet()` - Lines 65, 75, 89
3. `findColumnInSheet()` - Line 111
4. `getOrAddColumn()` - Lines 155, 184
5. `getColumnMap()` - Line 213
6. `addColumnsIfNotExist()` - Lines 249, 336
7. `copyWorkspace()` - Line 388
8. `renameSheet()` - Line 427
9. `deleteAllRows()` - Lines 460, 484
10. `findSheetByPartialName()` - Line 508

**Approach:**
1. Update `tryWith()` function default parameters to read from environment variables
2. Import `tryWith as tryWithBackoff` from ExponentialBackoff at top of SmartsheetHelpers
3. Add optional `logger` parameter to all functions
4. Wrap each `client.` API call with `tryWithBackoff()` using default parameters
5. Pass logger through when available

### Phase 2: ProjectOnlineClient Simplification (Priority: MEDIUM)

**Files to Modify:**
- [`src/lib/ProjectOnlineClient.ts`](../../../src/lib/ProjectOnlineClient.ts)

**Changes:**
1. Remove `private backoff: ExponentialBackoff;` field from class
2. Remove backoff instantiation from constructor
3. Import `tryWith as tryWithBackoff` from ExponentialBackoff
4. Update `executeGet()` to use `tryWithBackoff()` instead of `this.backoff.execute()`
5. Either use `this.config.maxRetries` or rely on env var defaults

**Optional Enhancement:**
Since ProjectOnlineClient already has `maxRetries` in config, could pass it explicitly:
```typescript
return tryWithBackoff(
  operation,
  this.config.maxRetries ?? undefined,  // Use config or env default
  undefined,                             // Use env default
  this.logger
);
```

### Phase 3: Transformer Improvements (Priority: MEDIUM)

**Files to Audit:**
- [`src/transformers/ProjectTransformer.ts`](../../../src/transformers/ProjectTransformer.ts)
- [`src/transformers/TaskTransformer.ts`](../../../src/transformers/TaskTransformer.ts)
- [`src/transformers/ResourceTransformer.ts`](../../../src/transformers/ResourceTransformer.ts)
- [`src/transformers/AssignmentTransformer.ts`](../../../src/transformers/AssignmentTransformer.ts)
- [`src/transformers/PMOStandardsTransformer.ts`](../../../src/transformers/PMOStandardsTransformer.ts)

**Action:**
- Audit each transformer for direct `client.` SDK calls
- Verify they delegate to SmartsheetHelpers (which will have retry after Phase 1)
- If any make direct SDK calls, wrap with `tryWithBackoff()` using same pattern

### Phase 4: Testing (Priority: HIGH)

**Test Coverage Required:**
1. Unit tests verifying retry on transient failures in SmartsheetHelpers
2. Unit tests verifying successful retry after transient errors
3. Integration tests for rate limit handling

**Test Files to Create/Update:**
- `test/util/SmartsheetHelpers.test.ts` - Add retry behavior tests
- Update existing transformer tests to verify retry behavior

### Phase 5: ExponentialBackoff Enhancement (Priority: HIGH)

**Files to Modify:**
- [`src/util/ExponentialBackoff.ts`](../../../src/util/ExponentialBackoff.ts)

**Changes Required:**

Update `tryWith()` function to read default parameter values from environment variables:

**Current Implementation:**
```typescript
export async function tryWith<T>(
  operationFunction: () => Promise<T>,
  maximumNumberOfTries: number = 5,
  initialBackoffMilliseconds: number = 1000,
  logger?: Logger
): Promise<T> {
  const backoff = new ExponentialBackoff(maximumNumberOfTries, initialBackoffMilliseconds, logger);
  // ... rest of implementation
}
```

**Updated Implementation:**
```typescript
export async function tryWith<T>(
  operationFunction: () => Promise<T>,
  maximumNumberOfTries: number = parseInt(process.env.RETRY_MAX_RETRIES || '5', 10),
  initialBackoffMilliseconds: number = parseInt(process.env.RETRY_INITIAL_DELAY_MS || '1000', 10),
  logger?: Logger
): Promise<T> {
  const backoff = new ExponentialBackoff(maximumNumberOfTries, initialBackoffMilliseconds, logger);
  // ... rest of implementation
}
```

**Environment Variables:**
Document in `.env.sample`:
```bash
# API Retry Configuration (optional)
# Default retry behavior for all APIs
RETRY_MAX_RETRIES=5              # Maximum retry attempts (default: 5)
RETRY_INITIAL_DELAY_MS=1000      # Initial backoff delay in ms (default: 1000)
```

## API Changes

### SmartsheetHelpers Functions

All exported functions will gain an optional `logger` parameter:

**Before:**
```typescript
export async function findSheetInWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string
): Promise<{ id: number; name: string } | null>
```

**After:**
```typescript
export async function findSheetInWorkspace(
  client: SmartsheetClient,
  workspaceId: number,
  sheetName: string,
  logger?: Logger
): Promise<{ id: number; name: string } | null>
```

This is a **backward-compatible change** - existing callers without logger parameter will continue to work.

## Testing Strategy

### Unit Tests

1. **ExponentialBackoff (Already Tested in [`test/util/ExponentialBackoff.test.ts`](../../../test/util/ExponentialBackoff.test.ts)):**
   - ✅ Successful operation on first attempt
   - ✅ Retry on failure with exponential backoff
   - ⚠️ Error after exhausting retries (skipped due to Jest timing issue - documented in test file)

2. **SmartsheetHelpers (Update [`test/util/SmartsheetHelpers.test.ts`](../../../test/util/SmartsheetHelpers.test.ts)):**
   - Verify retry on network timeouts (mock client to throw ETIMEDOUT)
   - Verify retry on 5xx errors
   - Verify retry on 429 rate limits
   - Verify successful completion after transient failures
   - Mock successful response after 2 failures to verify retry works

### Integration Tests

1. **Rate Limit Simulation:**
   - Simulate 429 response with Retry-After header
   - Verify proper backoff timing
   - Verify successful retry after backoff

2. **Network Resilience:**
   - Simulate intermittent network failures
   - Verify retry and eventual success
   - Verify failure after max retries

### Manual Testing

1. Test with actual Smartsheet API rate limiting
2. Test with actual Project Online rate limiting
3. Verify log output shows retry attempts when logger provided
4. Verify performance impact is minimal

## Error Handling

### Error Wrapping

Maintain existing error handling patterns - retry logic is transparent:

```typescript
try {
  const result = await tryWithBackoff(
    () => client.sheets.getSheet({ id: sheetId }),
    5,      // maxRetries
    1000,   // initialDelayMs
    logger
  );
  return result;
} catch (error) {
  // Error is rethrown after all retries exhausted
  throw new Error(
    `Failed to get sheet ${sheetId}: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

### Logging

Retry attempts are logged when a Logger is passed to `tryWithBackoff()` or `ExponentialBackoff` constructor. The [`ExponentialBackoff.evalStop()`](../../../src/util/ExponentialBackoff.ts:101-112) method logs errors when max retries are exceeded.

## Performance Considerations

### Latency

- **Successful calls**: No additional latency (wrapping is minimal function call overhead)
- **Failed calls**: Exponential backoff delays (1s, 2s, 4s, 8s, 16s, up to maxDelayMs)
- **Rate limits**: May delay up to 60 seconds based on configuration

### Throughput

- Retry logic is per-call, not global
- Multiple operations can retry independently
- Rate limiting is enforced globally via existing `checkRateLimit()` in ProjectOnlineClient

## Migration Guide

### For Callers of SmartsheetHelpers

**No breaking changes** - optional logger parameter is backward compatible:

```typescript
// Still works (no logger)
const sheet = await findSheetInWorkspace(client, workspaceId, 'Sheet Name');

// Enhanced (with logger for retry visibility)
const sheet = await findSheetInWorkspace(client, workspaceId, 'Sheet Name', logger);
```

### For New Code

**Preferred (Use environment-aware defaults):**
```typescript
import { tryWith as tryWithBackoff } from '../util/ExponentialBackoff';

// Uses RETRY_MAX_RETRIES and RETRY_INITIAL_DELAY_MS env vars (or defaults)
const response = await tryWithBackoff(
  () => client.sheets.getSheet({ id: sheetId })
);

// With logger for visibility
const response = await tryWithBackoff(
  () => client.sheets.getSheet({ id: sheetId }),
  undefined,  // Use env default
  undefined,  // Use env default
  logger
);
```

**Override defaults when needed:**
```typescript
// Explicit parameters override env vars
const response = await tryWithBackoff(
  () => client.sheets.getSheet({ id: sheetId }),
  3,      // Override max retries
  500,    // Override initial delay
  logger
);
```

## Success Criteria

1. ✅ `tryWith()` function reads default parameters from environment variables
2. ✅ Configuration fallback to sensible defaults when env vars not set
3. ✅ All Smartsheet SDK API calls wrapped with `tryWithBackoff()` (imported as alias)
4. ✅ ProjectOnlineClient simplified to use `tryWithBackoff()` instead of class instance
5. ✅ All OData API calls wrapped with retry logic using consistent pattern
6. ✅ Unit tests for retry behavior and configuration loading passing
7. ✅ Integration tests demonstrating rate limit handling
8. ✅ Documentation updated with retry configuration
9. ✅ Zero breaking changes to existing APIs

## References

- [ExponentialBackoff Implementation](../../../src/util/ExponentialBackoff.ts)
- [ExponentialBackoff.tryWith() Function](../../../src/util/ExponentialBackoff.ts:135-155)
- [ExponentialBackoff.execute() Method](../../../src/util/ExponentialBackoff.ts:66-80)
- [ProjectOnlineClient executeGet Pattern](../../../src/lib/ProjectOnlineClient.ts:205-212)
- [SmartsheetHelpers Functions](../../../src/util/SmartsheetHelpers.ts)
- [ConfigManager for Environment Variables](../../../src/util/ConfigManager.ts)
- [API Services Catalog - Retry Logic](../api-reference/api-services-catalog.md#retry-logic)
- [ETL System Design - Network Resilience](../architecture/02-etl-system-design.md#network-resilience)
- [Smartsheet API Rate Limits](https://smartsheet.redoc.ly/#section/API-Basics/Rate-Limiting)

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-11 | Roo Code | Initial specification created |
| 2025-12-11 | Roo Code | Simplified to use ExponentialBackoff.tryWith() directly, removed unnecessary wrapper concept |
| 2025-12-11 | Roo Code | Updated tryWith() to read default parameters from env vars (RETRY_MAX_RETRIES, RETRY_INITIAL_DELAY_MS) |
| 2025-12-11 | Roo Code | Added ProjectOnlineClient simplification to use tryWith() for consistency across all API clients |
| 2025-12-11 | Roo Code | Updated to use import alias `tryWithBackoff` for better code clarity |