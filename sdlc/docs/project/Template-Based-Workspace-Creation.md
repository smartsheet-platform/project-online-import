**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Data Transformation Guide](../architecture/03-data-transformation-guide.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Re-run Resiliency →](./Re-run-Resiliency.md) |
|:---|:---:|---:|

</div>

---


# Template-Based Workspace Creation

## Overview

The Project Online to Smartsheet ETL system uses a **template workspace** approach to create new project workspaces. Instead of creating sheets and columns from scratch, the system copies a pre-configured template workspace and then customizes it for each project.

## Benefits

1. **Faster Creation**: Copying a workspace with all sheets and columns is much faster than creating sheets and adding columns individually
2. **Consistency**: All project workspaces have identical structure, column configurations, and formatting
3. **Column Configurations Preserved**: Complex column settings (picklists, contact lists, formulas) are preserved from the template
4. **Reduced API Calls**: One copy operation instead of dozens of create/add operations

## Template Workspace

**Template Workspace ID**: Configurable via `TEMPLATE_WORKSPACE_ID` environment variable in `.env`

**Example Template**: `9002412817049476` (https://app.smartsheet.com/folders/9002412817049476)

**Behavior**:
- If `TEMPLATE_WORKSPACE_ID` is set: Copies the specified template workspace
- If `TEMPLATE_WORKSPACE_ID` is not set: Creates a blank workspace from scratch

**Contents**:
- **Summary Sheet**: Contains all 15 project summary columns with proper types and configurations
- **Tasks Sheet**: Contains all 18 task columns including DURATION, PREDECESSOR, system columns
- **Resources Sheet**: Contains all 18 resource columns including picklists, contact lists, checkboxes

## How It Works

### 1. Template Copy (if configured)

When `transformProject()` is called without a `workspaceId` parameter:

```typescript
const transformer = new ProjectTransformer(smartsheetClient, configManager);
const result = await transformer.transformProject(project); // No workspaceId
```

The system behavior depends on `TEMPLATE_WORKSPACE_ID` configuration:

**With Template ID set** (e.g., in `.env`: `TEMPLATE_WORKSPACE_ID=9002412817049476`):
1. Copies the specified template workspace
2. Names the new workspace using the project name
3. Returns the new workspace ID

**Without Template ID** (variable not set or empty):
1. Creates a blank workspace
2. Creates sheets from scratch with columns
3. Returns the new workspace ID

### 2. Sheet Renaming

After copying, the sheets are renamed to match the project naming convention:

- `Tasks` → `{ProjectName} - Tasks`
- `Resources` → `{ProjectName} - Resources`  
- `Summary` → `{ProjectName} - Summary`

### 3. Row Deletion

All rows from the template are deleted, leaving only the column structure:

```typescript
await deleteAllRows(client, summarySheet.id);
await deleteAllRows(client, taskSheet.id);
await deleteAllRows(client, resourceSheet.id);
```

### 4. Data Population

Subsequent transformer calls populate the cleaned sheets with actual data:

```typescript
// Add project summary data
await taskTransformer.transformTasks(tasks, taskSheetId);
await resourceTransformer.transformResources(resources, resourceSheetId);
```

## Backward Compatibility

The implementation maintains backward compatibility for testing:

```typescript
// NEW: Template-based (production)
const result = await transformer.transformProject(project);

// OLD: Manual creation (testing)
const testWorkspace = await createWorkspace('Test Project');
const result = await transformer.transformProject(project, testWorkspace.id);
```

When a `workspaceId` is provided, the system falls back to the old behavior of creating sheets with `getOrCreateSheet()`.

## Implementation

### Key Functions

**`copyWorkspace(client, sourceWorkspaceId, newWorkspaceName)`**
- Copies entire workspace including all sheets, columns, and configurations
- Returns new workspace ID and permalink

**`findSheetByPartialName(client, workspaceId, partialName)`**
- Finds sheet by partial name match (e.g., "Tasks", "Summary", "Resources")
- Used to locate sheets in the copied workspace

**`renameSheet(client, sheetId, newName)`**
- Renames a sheet to match project naming convention
- Returns updated sheet info

**`deleteAllRows(client, sheetId)`**
- Deletes all rows from a sheet
- Preserves column structure and configurations
- Returns count of deleted rows

### Code Location

**Implementation**: [`src/transformers/ProjectTransformer.ts`](../../../src/transformers/ProjectTransformer.ts)

**Helper Functions**: [`src/util/SmartsheetHelpers.ts`](../../../src/util/SmartsheetHelpers.ts)

**Configuration**: [`src/util/ConfigManager.ts`](../../../src/util/ConfigManager.ts)

**Template Workspace ID**: Configured via `TEMPLATE_WORKSPACE_ID` environment variable (no default - creates blank workspace if not set)

## Maintaining the Template

### When to Update Template

Update the template workspace when:
- Column definitions change (new column, type change)
- Column order needs to change
- Column formatting needs to change
- New sheets need to be added

### How to Update Template

1. Make changes to your template workspace
2. Test the changes with a copy operation
3. Update `TEMPLATE_WORKSPACE_ID` in `.env` if using a different template
4. No code changes needed - the system automatically uses the configured template

### Creating a New Template

If you need to replace the template:

1. Create a new workspace with desired structure
2. Add all sheets with proper column configurations
3. Add sample data (will be deleted on copy)
4. Set `TEMPLATE_WORKSPACE_ID` environment variable in `.env`:
   ```bash
   # Template Workspace ID (optional)
   # Leave empty to create blank workspaces from scratch
   TEMPLATE_WORKSPACE_ID=your_new_template_id_here
   ```
5. Run tests to verify

## Testing

### Unit Tests

The existing unit tests continue to work because they pass a `workspaceId`:

```typescript
const workspace = await workspaceManager.createWorkspace('Test Project');
const result = await transformer.transformProject(project, workspace.id);
```

### Integration Testing

To test the template-based approach:

```typescript
const transformer = new ProjectTransformer(smartsheetClient);
const result = await transformer.transformProject(project); // No workspaceId

// Verify:
// - New workspace was created
// - Sheets have correct names
// - Sheets have correct columns
// - Sheets have no data rows
```

### Creating Test Templates

Use the `create-sample-workspace.ts` script to create test templates:

```bash
npm run create-sample-workspace
```

This creates a complete workspace that can be used as a template.

## Re-run Resiliency

The template-based approach is **idempotent** by design:

1. Each project creates a NEW workspace (not reusing existing)
2. Sheet and column existence is still checked (via `getOrCreateSheet` in test mode)
3. If running multiple times, each run creates a separate workspace copy

This is intentional - each import should create a fresh workspace from the template.

## Performance

### Before (Manual Creation)

- Create workspace: ~500ms
- Create Summary sheet: ~500ms
- Add 15 columns: ~7500ms (500ms each)
- Create Tasks sheet: ~500ms
- Add 18 columns: ~9000ms (500ms each)
- Create Resources sheet: ~500ms
- Add columns: ~variable
- **Total: ~18+ seconds**

### After (Template Copy)

- Copy workspace (with 3 sheets + 50+ columns): ~2000ms
- Rename 3 sheets: ~1500ms (500ms each)
- Delete rows: ~1500ms (500ms each)
- **Total: ~5 seconds**

**Improvement**: ~70% faster (18 seconds → 5 seconds)

## Troubleshooting

### Template Not Found Error

```
Error: Failed to copy workspace [TEMPLATE_WORKSPACE_ID]
```

**Solution**:
1. Verify the template workspace exists and is accessible with your API token
2. Check that `TEMPLATE_WORKSPACE_ID` in `.env` is set to a valid workspace ID
3. Ensure your API token has access to the specified template workspace
4. Or leave `TEMPLATE_WORKSPACE_ID` empty to create blank workspaces from scratch

### Sheets Not Found After Copy

```
Error: Failed to find required sheets in workspace after copy from template
```

**Solution**: Verify the template contains sheets with "Summary", "Tasks", and "Resources" in their names.

### Permission Errors

```
Error: Insufficient permissions to copy workspace
```

**Solution**: Verify your API token has workspace creation permissions.

## Related Documentation

- [Re-run Resiliency](./Re-run-Resiliency.md) - Sheet and column existence checking
- [ETL System Design](../architecture/02-etl-system-design.md) - Overall system architecture and implementation
- [Data Transformation Guide](../architecture/03-data-transformation-guide.md) - Complete sheet and column details

---

<div align="center">

| [← Previous: Data Transformation Guide](../architecture/03-data-transformation-guide.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Re-run Resiliency →](./Re-run-Resiliency.md) |
|:---|:---:|---:|

</div>