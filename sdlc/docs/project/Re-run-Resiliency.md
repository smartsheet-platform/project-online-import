# Re-run Resiliency

## Overview

The Project Online to Smartsheet ETL implements re-run resiliency to handle scenarios where the import process is run multiple times for the same data. This prevents duplicate sheets, duplicate columns, and API errors when operations are retried.

**Last Updated**: 2025-12-05

---

## Why Re-run Resiliency Is Needed

### Common Re-run Scenarios

1. **Partial Failures**: The import process fails partway through (network issues, API limits, crashes)
2. **Data Updates**: Running the import again to update existing data
3. **Testing/Development**: Running imports multiple times during development
4. **Manual Re-runs**: Operators manually re-running imports after fixing issues

### Problems Without Resiliency

Without resiliency checks, re-running the import would cause:

- **Duplicate Sheets**: Attempting to create sheets that already exist
- **Duplicate Columns**: Adding columns that already exist in sheets
- **API Errors**: Smartsheet API rejecting duplicate creations
- **Data Integrity Issues**: Multiple versions of the same data
- **Wasted API Calls**: Unnecessary calls consuming rate limits

---

## How Resiliency Works

### Sheet-Level Resiliency

Before creating a sheet, the system checks if a sheet with the same name already exists in the workspace. If it does, the existing sheet is reused instead of creating a new one.

**Helper Function**: [`getOrCreateSheet()`](../src/util/SmartsheetHelpers.ts)

```typescript
// Usage example
const sheet = await getOrCreateSheet(client, workspaceId, {
  name: 'Project Tasks',
  columns: [
    { title: 'Task Name', type: 'TEXT_NUMBER', primary: true }
  ]
});

// Result:
// - If sheet exists: Returns existing sheet
// - If sheet doesn't exist: Creates and returns new sheet
```

### Column-Level Resiliency

Before adding a column to a sheet, the system checks if a column with the same title already exists. If it does, the existing column is reused instead of adding a duplicate.

**Helper Functions**:
- [`getOrAddColumn()`](../src/util/SmartsheetHelpers.ts) - Add single column with existence check
- [`addColumnsIfNotExist()`](../src/util/SmartsheetHelpers.ts) - Add multiple columns, skipping existing ones

```typescript
// Single column example
const column = await getOrAddColumn(client, sheetId, {
  title: 'Status',
  type: 'PICKLIST',
  width: 120
});

// Multiple columns example
const results = await addColumnsIfNotExist(client, sheetId, [
  { title: 'Start Date', type: 'DATE', width: 120 },
  { title: 'End Date', type: 'DATE', width: 120 },
  { title: 'Status', type: 'PICKLIST', width: 100 }
]);

// Results indicate which columns were created vs. existing:
// [
//   { title: 'Start Date', id: 123, wasCreated: true },
//   { title: 'End Date', id: 124, wasCreated: true },
//   { title: 'Status', id: 125, wasCreated: false }  // Already existed
// ]
```

---

## Implementation Details

### Helper Utilities

All resiliency helpers are located in [`src/util/SmartsheetHelpers.ts`](../src/util/SmartsheetHelpers.ts):

| Function | Purpose | Returns |
|----------|---------|---------|
| `findSheetInWorkspace()` | Check if sheet exists by name | Sheet info or null |
| `getOrCreateSheet()` | Get existing or create new sheet | Sheet object |
| `findColumnInSheet()` | Check if column exists by title | Column info or null |
| `getOrAddColumn()` | Get existing or add new column | Column object |
| `getColumnMap()` | Get all columns as a map | Map of title → column info |
| `addColumnsIfNotExist()` | Add multiple columns, skip existing | Array of results |

### Transformer Integration

The resiliency helpers are integrated into all transformers:

#### ProjectTransformer

[`src/transformers/ProjectTransformer.ts`](../src/transformers/ProjectTransformer.ts)

Uses `getOrCreateSheet()` for:
- Summary sheet creation
- Task sheet creation  
- Resource sheet creation

```typescript
// Before resiliency:
const summaryResponse = await client.sheets?.createSheetInWorkspace?.({ ... });

// After resiliency:
const summarySheet = await getOrCreateSheet(client, workspaceId, { ... });
```

#### TaskTransformer

[`src/transformers/TaskTransformer.ts`](../src/transformers/TaskTransformer.ts)

Uses `addColumnsIfNotExist()` for adding task columns:
- Start Date, End Date, Duration
- Status, Priority, Constraint Type
- Work hours, Notes, Predecessors
- Project Online metadata columns

```typescript
// Before resiliency:
for (const column of columnsToAdd) {
  await client.sheets?.addColumn?.({ sheetId, body: column });
}

// After resiliency:
const results = await addColumnsIfNotExist(client, sheetId, columnsToAdd);
```

#### ResourceTransformer

[`src/transformers/ResourceTransformer.ts`](../src/transformers/ResourceTransformer.ts)

Uses `addColumnsIfNotExist()` for adding resource columns:
- Email, Resource Type, Max Units
- Rates (Standard, Overtime, Cost Per Use)
- Department, Code, Active/Generic flags
- Project Online metadata columns

#### AssignmentTransformer

[`src/transformers/AssignmentTransformer.ts`](../src/transformers/AssignmentTransformer.ts)

Uses `getOrAddColumn()` for adding assignment columns:
- MULTI_CONTACT_LIST columns for Work resources
- MULTI_PICKLIST columns for Material/Cost resources

---

## Testing

Comprehensive tests verify resiliency behavior in [`test/util/SmartsheetHelpers.test.ts`](../test/util/SmartsheetHelpers.test.ts).

### Test Coverage

1. **Sheet Existence Checks**
   - Finding existing sheets
   - Returning null for non-existent sheets
   - Creating new sheets when needed
   - Reusing existing sheets

2. **Column Existence Checks**
   - Finding existing columns
   - Returning null for non-existent columns
   - Adding new columns when needed
   - Reusing existing columns

3. **Batch Operations**
   - Adding multiple new columns
   - Skipping some existing, adding some new
   - Handling complete re-runs (all columns exist)

4. **Integration Scenarios**
   - Full re-run of sheet and column creation
   - Verifying no duplicates created
   - Confirming same resources reused

### Running Tests

```bash
# Run all resiliency tests
npm test -- test/util/SmartsheetHelpers.test.ts

# Run specific test suite
npm test -- test/util/SmartsheetHelpers.test.ts -t "getOrCreateSheet"
```

---

## Usage Guidelines

### When to Use Resiliency Helpers

✅ **Always use resiliency helpers for:**
- Creating sheets in workspaces
- Adding columns to sheets
- Any operation that could be re-run

❌ **Don't use resiliency helpers for:**
- Adding rows (rows are always new data)
- Updating existing data (updates are idempotent)
- One-time setup operations

### Best Practices

1. **Sheet Creation**: Always use `getOrCreateSheet()` instead of direct creation
   ```typescript
   // ✅ Good
   const sheet = await getOrCreateSheet(client, workspaceId, config);
   
   // ❌ Bad
   const sheet = await client.sheets.createSheetInWorkspace({ ... });
   ```

2. **Column Addition**: Always use `addColumnsIfNotExist()` for multiple columns
   ```typescript
   // ✅ Good
   const results = await addColumnsIfNotExist(client, sheetId, columns);
   
   // ❌ Bad
   for (const col of columns) {
     await client.sheets.addColumn({ sheetId, body: col });
   }
   ```

3. **Error Handling**: Resiliency helpers throw errors for actual failures
   ```typescript
   try {
     const sheet = await getOrCreateSheet(client, workspaceId, config);
   } catch (error) {
     // Handle real errors (network, auth, etc.)
     // Not duplicate errors - those are handled internally
   }
   ```

4. **Logging**: Helpers include debug logging for troubleshooting
   ```typescript
   // Console output shows:
   // - Which sheets were found vs. created
   // - Which columns were found vs. added
   // - Helps debug re-run scenarios
   ```

---

## Benefits

### Operational Benefits

- **Safer Re-runs**: Can safely re-run imports without creating duplicates
- **Faster Recovery**: Partial failures can resume from where they left off
- **Cost Efficiency**: Reduces unnecessary API calls and rate limit usage
- **Better UX**: No manual cleanup of duplicate sheets/columns needed

### Development Benefits

- **Easier Testing**: Can run tests multiple times without cleanup
- **Simpler Debugging**: Can re-run specific parts during development
- **Cleaner Code**: Encapsulates existence checks in reusable helpers
- **Better Reliability**: Handles edge cases consistently

---

## Migration Notes

If updating existing code to use resiliency helpers:

1. Replace direct sheet creation with `getOrCreateSheet()`
2. Replace direct column addition with `addColumnsIfNotExist()` or `getOrAddColumn()`
3. Update tests to verify resiliency behavior
4. Add logging to track which resources were reused vs. created

See the implementation in:
- [`src/transformers/ProjectTransformer.ts`](../src/transformers/ProjectTransformer.ts) (lines 1-434)
- [`src/transformers/TaskTransformer.ts`](../src/transformers/TaskTransformer.ts) (lines 698-762)
- [`src/transformers/ResourceTransformer.ts`](../src/transformers/ResourceTransformer.ts) (lines 382-420)
- [`src/transformers/AssignmentTransformer.ts`](../src/transformers/AssignmentTransformer.ts) (lines 56-101)

---

## Related Documentation

- [Architecture Document](Architecture.md) - Overall system design
- [Smartsheet Structure](Smartsheet-Structure.md) - Sheet and column organization
- [Transformation Mapping](../architecture/project-online-smartsheet-transformation-mapping.md) - Data transformation rules

---

**Version**: 1.0  
**Status**: Implemented and Tested