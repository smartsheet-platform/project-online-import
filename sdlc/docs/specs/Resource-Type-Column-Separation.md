# Resource Type Column Separation Specification

## Document Information

**Feature**: Resource Type Column Separation  
**Version**: 1.0  
**Status**: Draft  
**Created**: 2025-12-21  
**Last Updated**: 2025-12-21

---

## Executive Summary

This specification defines how Project Online resources should be separated into distinct Smartsheet columns based on resource type (Work, Material, Cost), enabling better data organization, accurate assignment tracking, and proper sheet reference configuration between Resources and Tasks sheets.

**Key Changes:**
- Resources sheet will have separate columns for each resource type
- Only one column will be populated per row (based on resource type)
- Tasks sheet will have matching columns that reference Resources sheet columns
- Proper column types (CONTACT_LIST vs MULTI_PICKLIST) based on resource category

---

## Table of Contents

1. [Background](#background)
2. [Requirements](#requirements)
3. [Current Implementation Analysis](#current-implementation-analysis)
4. [Proposed Solution](#proposed-solution)
5. [Resources Sheet Design](#resources-sheet-design)
6. [Tasks Sheet Design](#tasks-sheet-design)
7. [Data Transformation Logic](#data-transformation-logic)
8. [Sheet Reference Configuration](#sheet-reference-configuration)
9. [Implementation Plan](#implementation-plan)
10. [Testing Requirements](#testing-requirements)
11. [Migration Considerations](#migration-considerations)

---

## Background

### Problem Statement

Currently, the Project Online import system places all resources (regardless of type) into a single "Contact" column in the Resources sheet. This approach has several limitations:

1. **Mixed Resource Types**: Work resources (people), Material resources (consumables), and Cost resources are all mixed in one column
2. **Incorrect Data Types**: Material and Cost resources are stored as contacts when they should be plain text
3. **Sheet Reference Challenges**: Task assignments cannot properly reference different resource types from the Resources sheet
4. **Data Clarity**: Users cannot easily filter or distinguish resource types without checking a separate "Resource Type" column

### Business Value

Separating resources by type provides:

- **Improved Data Organization**: Clear separation of people, materials, and cost centers
- **Accurate Data Types**: Contact columns for people, picklist columns for materials/equipment/costs
- **Better Sheet References**: Task columns can source values from correct Resources sheet columns
- **Enhanced Reporting**: Easier filtering and analysis by resource category
- **Smartsheet Best Practices**: Aligns with recommended patterns for resource management

### Project Online Resource Types

Project Online defines three resource types:

| Type | Description | Examples | Smartsheet Column Type |
|------|-------------|----------|----------------------|
| **Work** | People resources that perform work | Team members, contractors, stakeholders | `CONTACT_LIST` |
| **Material** | Consumable resources used in tasks | Materials, supplies, equipment | `MULTI_PICKLIST` (text) |
| **Cost** | Financial resources or cost centers | Budget codes, departments, overhead | `MULTI_PICKLIST` (text) |

---

## Requirements

### Functional Requirements

#### FR-1: Resources Sheet Column Structure

**Requirement**: Resources sheet MUST have separate columns for each resource type

**Acceptance Criteria**:
- Column for Work resources (people) using CONTACT_LIST type
- Column for Material resources using TEXT_NUMBER type (displayed as plain text)
- Column for Cost resources using TEXT_NUMBER type (displayed as plain text)
- Each resource row MUST populate exactly ONE type-specific column
- Empty columns for other types on each row

#### FR-2: Resource Data Population

**Requirement**: Resource transformer MUST populate the correct column based on `ResourceType` property

**Acceptance Criteria**:
- Work resources populate "Team Members" column with contact object
- Material resources populate "Materials" column with resource name (text)
- Cost resources populate "Cost Resources" column with resource name (text)
- Default to Work type if `ResourceType` is null or undefined
- Maintain all other resource attributes in their respective columns

#### FR-3: Tasks Sheet Column Structure

**Requirement**: Tasks sheet MUST have assignment columns matching each resource type

**Acceptance Criteria**:
- "Assigned To" column (MULTI_CONTACT_LIST) for Work resource assignments
- "Materials" column (MULTI_PICKLIST) for Material resource assignments  
- "Cost Resources" column (MULTI_PICKLIST) for Cost resource assignments
- Column creation is dynamic based on presence of each resource type in data

#### FR-4: Sheet Reference Configuration

**Requirement**: Task sheet columns MUST reference corresponding Resources sheet columns

**Acceptance Criteria**:
- "Assigned To" column sources from Resources sheet "Team Members" column
- "Materials" column sources from Resources sheet "Materials" column
- "Cost Resources" column sources from Resources sheet "Cost Resources" column
- References configured via Smartsheet's column options API
- Users can select from Resources sheet values when editing Tasks

### Non-Functional Requirements

#### NFR-1: Backward Compatibility

**Requirement**: Maintain compatibility with existing column structure during transition

**Impact**: Existing "Contact" column should be deprecated gracefully

#### NFR-2: Performance

**Requirement**: Resource type separation MUST NOT significantly impact import performance

**Target**: < 5% increase in total import time

#### NFR-3: Data Integrity

**Requirement**: No resource data MUST be lost during transformation

**Validation**: All resources imported, all attributes preserved

---

## Current Implementation Analysis

### Resources Sheet Current Structure

**File**: [`src/transformers/ResourceTransformer.ts`](../../src/transformers/ResourceTransformer.ts)

**Current Columns** (lines 39-135):
```typescript
{
  title: 'Resource ID',           // AUTO_NUMBER
  title: 'Project Online Resource ID',  // TEXT_NUMBER (hidden)
  title: 'Contact',               // CONTACT_LIST (primary) ← CURRENT SINGLE COLUMN
  title: 'Resource Type',         // PICKLIST
  title: 'Max Units',             // TEXT_NUMBER
  // ... other columns
}
```

**Current Row Creation Logic** (lines 140-238):
- Creates contact object for ALL resources regardless of type
- Places contact in single "Contact" column
- Resource Type stored separately in "Resource Type" column

### Tasks Sheet Current Structure

**File**: [`src/transformers/TaskTransformer.ts`](../../src/transformers/TaskTransformer.ts)

**Current Assignment Discovery** (lines 589-618):
- Function `discoverAssignmentColumns()` already exists
- Returns definitions for:
  - `Team Members` (MULTI_CONTACT_LIST) for Work resources
  - `Equipment` (MULTI_PICKLIST) for Material resources
  - `Cost Centers` (MULTI_PICKLIST) for Cost resources

**Current Assignment Configuration** (lines 620-655):
- Function `configureAssignmentColumns()` exists but is not fully implemented
- Has placeholder logic for MULTI_CONTACT_LIST and MULTI_PICKLIST

### Key Observations

✅ **Good Foundation**: Task transformer already has structure for multiple assignment types  
✅ **Pattern Established**: Multi-type pattern already partially implemented  
❌ **Gap**: Resources sheet doesn't match the multi-column pattern  
❌ **Gap**: Resources row creation doesn't separate by type  
❌ **Gap**: Sheet references not properly configured

---

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Resources Sheet                          │
├──────────────────┬──────────────┬──────────────────────────┤
│ Team Members     │ Materials    │ Cost Resources          │
│ (CONTACT_LIST)   │ (TEXT)       │ (TEXT)                  │
├──────────────────┼──────────────┼──────────────────────────┤
│ Alice Smith      │              │                          │ ← Work
│                  │ Concrete     │                          │ ← Material
│                  │              │ Engineering-Dept         │ ← Cost
└──────────────────┴──────────────┴──────────────────────────┘
                    ↓              ↓              ↓
              (Sheet References)
                    ↓              ↓              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Tasks Sheet                             │
├──────────────────┬──────────────┬──────────────────────────┤
│ Assigned To      │ Materials    │ Cost Resources          │
│ (MULTI_CONTACT)  │ (MULTI_PICK) │ (MULTI_PICKLIST)        │
├──────────────────┼──────────────┼──────────────────────────┤
│ Alice, Bob       │ Concrete     │ Engineering-Dept         │
└──────────────────┴──────────────┴──────────────────────────┘
```

### Design Principles

1. **Single Responsibility**: Each column represents one resource type
2. **Explicit Over Implicit**: Column names clearly indicate resource category
3. **Type Safety**: Column types match data semantics (contacts vs text)
4. **Sheet References**: Enable dropdown population from Resources sheet
5. **Mutually Exclusive**: Only one type column populated per resource row

---

## Resources Sheet Design

### Column Structure

**New Columns** (replace single "Contact" column):

```typescript
// Column 2: Team Members (Work resources)
{
  title: 'Team Members',
  type: 'CONTACT_LIST',
  primary: true,  // Primary column
  width: 200,
}

// Column 3: Materials (Material resources)
{
  title: 'Materials',
  type: 'TEXT_NUMBER',
  width: 200,
}

// Column 4: Cost Resources (Cost resources)
{
  title: 'Cost Resources',
  type: 'TEXT_NUMBER',
  width: 200,
}

// Column 5: Resource Type (keep for reference)
{
  title: 'Resource Type',
  type: 'PICKLIST',
  width: 120,
}

// ... rest of columns (Max Units, Standard Rate, etc.)
```

### Primary Column Selection

**Decision**: Use "Team Members" as primary column

**Rationale**:
- Work resources (people) are most common resource type
- Contact columns provide better user experience (email, profile pics)
- Aligns with Smartsheet best practices for people-centric projects

**Alternative**: Use first non-empty type column
- More complex logic
- Less predictable for users
- Not recommended

### Column Order Rationale

1. **Resource ID** (auto-number) - system identifier
2. **Team Members** (contact, primary) - most important/common
3. **Materials** (text) - second most common
4. **Cost Resources** (text) - least common
5. **Resource Type** (picklist) - metadata for filtering
6. **Other attributes** (rates, units, etc.) - detailed properties

---

## Tasks Sheet Design

### Column Structure

**Assignment Columns** (insert after "Notes" column):

```typescript
// Column: Assigned To (Work resource assignments)
{
  title: 'Assigned To',
  type: 'MULTI_CONTACT_LIST',
  width: 200,
}

// Column: Materials (Material resource assignments)
{
  title: 'Materials',
  type: 'MULTI_PICKLIST',
  width: 200,
}

// Column: Cost Resources (Cost resource assignments)
{
  title: 'Cost Resources',
  type: 'MULTI_PICKLIST',
  width: 200,
}
```

### Column Visibility Rules

**Dynamic Creation**: Only create columns for resource types that exist in the data

**Logic**:
```typescript
if (hasWorkResources) {
  createColumn('Assigned To', 'MULTI_CONTACT_LIST');
}
if (hasMaterialResources) {
  createColumn('Materials', 'MULTI_PICKLIST');
}
if (hasCostResources) {
  createColumn('Cost Resources', 'MULTI_PICKLIST');
}
```

**Rationale**: Avoid empty columns for unused resource types

---

## Data Transformation Logic

### Resource Type Detection

**Source Property**: `resource.ResourceType` from Project Online

**Type Values**:
- `"Work"` → Work resource (person)
- `"Material"` → Material resource (consumable)
- `"Cost"` → Cost resource (budget/overhead)
- `null` or `undefined` → Default to `"Work"`

### Resource Row Cell Population

**Pseudo-code**:
```typescript
function createResourceRow(resource: ProjectOnlineResource): SmartsheetRow {
  const cells: SmartsheetCell[] = [];
  
  // Determine resource type (default to Work)
  const resourceType = resource.ResourceType || 'Work';
  
  // Populate type-specific column
  if (resourceType === 'Work') {
    // Team Members column (CONTACT_LIST)
    const contact = createContactObject(resource.Name, resource.Email);
    cells.push({
      columnId: columnMap['Team Members'],
      objectValue: contact,  // Use objectValue for contacts
    });
    // Leave Materials and Cost Resources empty
  } 
  else if (resourceType === 'Material') {
    // Materials column (TEXT)
    cells.push({
      columnId: columnMap['Materials'],
      value: resource.Name,  // Plain text, no email
    });
    // Leave Team Members and Cost Resources empty
  } 
  else if (resourceType === 'Cost') {
    // Cost Resources column (TEXT)
    cells.push({
      columnId: columnMap['Cost Resources'],
      value: resource.Name,  // Plain text, no email
    });
    // Leave Team Members and Materials empty
  }
  
  // Always populate Resource Type column for filtering
  cells.push({
    columnId: columnMap['Resource Type'],
    value: resourceType,
  });
  
  // ... populate other columns (Max Units, rates, etc.)
  
  return { toBottom: true, cells };
}
```

### Email Handling for Non-Work Resources

**Rule**: Email field is only relevant for Work resources

**Implementation**:
- Work resources: Use email for contact object creation
- Material/Cost resources: Ignore email field (not applicable)
- Email column can be removed or hidden as it's redundant with contact data

---

## Sheet Reference Configuration

### Reference Flow

```
Resources Sheet Columns  →  Tasks Sheet Columns
─────────────────────────────────────────────────
Team Members            →  Assigned To
  (CONTACT_LIST)           (MULTI_CONTACT_LIST sources from Team Members)

Materials               →  Materials
  (TEXT_NUMBER)            (MULTI_PICKLIST sources from Materials)

Cost Resources          →  Cost Resources
  (TEXT_NUMBER)            (MULTI_PICKLIST sources from Cost Resources)
```

### Configuration API Calls

**For Contact Lists** (Work resources):

```typescript
await client.columns?.updateColumn?.({
  sheetId: tasksSheetId,
  columnId: assignedToColumnId,
  body: {
    type: 'MULTI_CONTACT_LIST',
    contactOptions: [{
      sheetId: resourcesSheetId,
      columnId: teamMembersColumnId,
    }],
  },
});
```

**For Picklists** (Material/Cost resources):

```typescript
await client.columns?.updateColumn?.({
  sheetId: tasksSheetId,
  columnId: materialsColumnId,
  body: {
    type: 'MULTI_PICKLIST',
    options: [{
      value: {
        objectType: 'CELL_LINK',
        sheetId: resourcesSheetId,
        columnId: materialsColumnId,
      },
    }],
  },
});
```

### Configuration Timing

**When**: After both sheets are created and populated

**Order**:
1. Create Resources sheet with columns
2. Populate Resources sheet with data
3. Create Tasks sheet with columns
4. Configure Tasks sheet column references
5. Populate Tasks sheet with data

---

## Implementation Plan

### Phase 1: Resources Sheet Column Restructuring

**Files to Modify**:
- [`src/transformers/ResourceTransformer.ts`](../../src/transformers/ResourceTransformer.ts)

**Changes**:

1. **Update `createResourcesSheetColumns()`** (lines 39-135)
   - Replace single "Contact" column with three type-specific columns
   - Update column indices accordingly
   - Keep "Resource Type" column for filtering

2. **Update `createResourceRow()`** (lines 140-238)
   - Add resource type detection logic
   - Populate appropriate column based on type
   - Leave other type columns empty

3. **Update `ResourceTransformer.buildResourceRow()`** (lines 453-575)
   - Add type-based column population logic
   - Handle contact vs text value types
   - Update column map keys

4. **Remove/deprecate email column** (optional)
   - Email is now embedded in contact objects
   - Can be hidden or removed entirely

**Estimated Effort**: 4-6 hours

### Phase 2: Tasks Sheet Column Configuration

**Files to Modify**:
- [`src/transformers/TaskTransformer.ts`](../../src/transformers/TaskTransformer.ts)

**Changes**:

1. **Update `createTasksSheetColumns()`** (lines 114-215)
   - Add assignment columns for each resource type
   - Use naming: "Assigned To", "Materials", "Cost Resources"
   - Set appropriate types (MULTI_CONTACT_LIST vs MULTI_PICKLIST)

2. **Implement dynamic column creation**
   - Call `discoverAssignmentColumns()` to determine which types exist
   - Only create columns for present resource types

3. **Complete `configureAssignmentColumns()`** (lines 620-655)
   - Implement contact options configuration for "Assigned To"
   - Implement cell link configuration for "Materials" and "Cost Resources"
   - Pass Resources sheet column IDs for each type

**Estimated Effort**: 4-6 hours

### Phase 3: Integration and Column Reference Setup

**Files to Modify**:
- Factory files (where sheets are created and configured)
- Integration points between Resource and Task transformers

**Changes**:

1. **Pass Resources sheet column IDs to Task transformer**
   - Return column IDs from ResourceTransformer
   - Pass to TaskTransformer configuration method

2. **Configure sheet references after both sheets populated**
   - Call configureAssignmentColumns with correct IDs
   - Verify references work correctly

3. **Update factory workflow**
   - Ensure correct sequencing
   - Handle errors in reference configuration

**Estimated Effort**: 3-4 hours

### Phase 4: Type Definitions and Interfaces

**Files to Modify**:
- [`src/types/ProjectOnline.ts`](../../src/types/ProjectOnline.ts)
- [`src/types/Smartsheet.ts`](../../src/types/Smartsheet.ts)

**Changes**:

1. **Add type definitions**
   ```typescript
   export type ResourceColumnType = 'Work' | 'Material' | 'Cost';
   
   export interface ResourceColumnMapping {
     Work: { columnId: number; columnTitle: 'Team Members' };
     Material: { columnId: number; columnTitle: 'Materials' };
     Cost: { columnId: number; columnTitle: 'Cost Resources' };
   }
   ```

2. **Update transformer interfaces**
   - Add return types for column ID mappings
   - Update configuration method signatures

**Estimated Effort**: 1-2 hours

### Phase 5: Testing

**Test Files to Create/Update**:
- [`test/unit/transformers/ResourceTransformer.test.ts`](../../test/unit/transformers/ResourceTransformer.test.ts)
- [`test/unit/transformers/TaskTransformer.test.ts`](../../test/unit/transformers/TaskTransformer.test.ts)
- [`test/integration/scenarios/resource-scenarios.ts`](../../test/integration/scenarios/resource-scenarios.ts)

**Test Cases**: See [Testing Requirements](#testing-requirements)

**Estimated Effort**: 6-8 hours

### Total Estimated Effort

**Development**: 18-26 hours  
**Testing**: 6-8 hours  
**Total**: 24-34 hours (3-4 days)

---

## Testing Requirements

### Unit Tests

#### ResourceTransformer Tests

**File**: [`test/unit/transformers/ResourceTransformer.test.ts`](../../test/unit/transformers/ResourceTransformer.test.ts)

**Test Cases**:

1. **Resource Type Column Structure**
   ```typescript
   describe('createResourcesSheetColumns', () => {
     it('should create Team Members column as primary', () => {
       const columns = createResourcesSheetColumns();
       const teamMembersCol = columns.find(c => c.title === 'Team Members');
       expect(teamMembersCol).toBeDefined();
       expect(teamMembersCol?.type).toBe('CONTACT_LIST');
       expect(teamMembersCol?.primary).toBe(true);
     });
     
     it('should create Materials column as TEXT_NUMBER', () => {
       const columns = createResourcesSheetColumns();
       const materialsCol = columns.find(c => c.title === 'Materials');
       expect(materialsCol).toBeDefined();
       expect(materialsCol?.type).toBe('TEXT_NUMBER');
     });
     
     it('should create Cost Resources column as TEXT_NUMBER', () => {
       const columns = createResourcesSheetColumns();
       const costCol = columns.find(c => c.title === 'Cost Resources');
       expect(costCol).toBeDefined();
       expect(costCol?.type).toBe('TEXT_NUMBER');
     });
   });
   ```

2. **Resource Row Type Separation**
   ```typescript
   describe('createResourceRow', () => {
     it('should populate Team Members column for Work resources', () => {
       const resource = buildWorkResource({ Name: 'Alice', Email: 'alice@example.com' });
       const row = createResourceRow(resource, columnMap);
       
       const teamMembersCell = row.cells.find(c => c.columnId === columnMap['Team Members']);
       expect(teamMembersCell?.objectValue).toBeDefined();
       expect(teamMembersCell?.objectValue?.name).toBe('Alice');
     });
     
     it('should populate Materials column for Material resources', () => {
       const resource = buildMaterialResource({ Name: 'Concrete', ResourceType: 'Material' });
       const row = createResourceRow(resource, columnMap);
       
       const materialsCell = row.cells.find(c => c.columnId === columnMap['Materials']);
       expect(materialsCell?.value).toBe('Concrete');
       
       const teamMembersCell = row.cells.find(c => c.columnId === columnMap['Team Members']);
       expect(teamMembersCell).toBeUndefined();
     });
     
     it('should populate Cost Resources column for Cost resources', () => {
       const resource = buildCostResource({ Name: 'Engineering', ResourceType: 'Cost' });
       const row = createResourceRow(resource, columnMap);
       
       const costCell = row.cells.find(c => c.columnId === columnMap['Cost Resources']);
       expect(costCell?.value).toBe('Engineering');
       
       const teamMembersCell = row.cells.find(c => c.columnId === columnMap['Team Members']);
       expect(teamMembersCell).toBeUndefined();
     });
     
     it('should default to Work type if ResourceType is undefined', () => {
       const resource = { ...buildWorkResource(), ResourceType: undefined };
       const row = createResourceRow(resource, columnMap);
       
       const teamMembersCell = row.cells.find(c => c.columnId === columnMap['Team Members']);
       expect(teamMembersCell?.objectValue).toBeDefined();
     });
   });
   ```

#### TaskTransformer Tests

**File**: [`test/unit/transformers/TaskTransformer.test.ts`](../../test/unit/transformers/TaskTransformer.test.ts)

**Test Cases**:

1. **Assignment Column Discovery**
   ```typescript
   describe('discoverAssignmentColumns', () => {
     it('should include Assigned To for Work resources', () => {
       const resources = [{ ResourceType: 'Work' }];
       const columns = discoverAssignmentColumns(resources);
       
       expect(columns['Assigned To']).toBeDefined();
       expect(columns['Assigned To'].type).toBe('MULTI_CONTACT_LIST');
     });
     
     it('should include Materials for Material resources', () => {
       const resources = [{ ResourceType: 'Material' }];
       const columns = discoverAssignmentColumns(resources);
       
       expect(columns['Materials']).toBeDefined();
       expect(columns['Materials'].type).toBe('MULTI_PICKLIST');
     });
     
     it('should only include columns for present resource types', () => {
       const resources = [{ ResourceType: 'Work' }];
       const columns = discoverAssignmentColumns(resources);
       
       expect(columns['Assigned To']).toBeDefined();
       expect(columns['Materials']).toBeUndefined();
       expect(columns['Cost Resources']).toBeUndefined();
     });
   });
   ```

2. **Column Reference Configuration**
   ```typescript
   describe('configureAssignmentColumns', () => {
     it('should configure contact options for Assigned To column', async () => {
       const mockClient = createMockSmartsheetClient();
       
       await configureAssignmentColumns(
         mockClient,
         tasksSheetId,
         { 'Assigned To': assignedToColumnId },
         resourcesSheetId,
         teamMembersColumnId,
         { 'Assigned To': { type: 'MULTI_CONTACT_LIST', resourceType: 'Work' } }
       );
       
       expect(mockClient.columns.updateColumn).toHaveBeenCalledWith(
         expect.objectContaining({
           body: expect.objectContaining({
             contactOptions: [{ sheetId: resourcesSheetId, columnId: teamMembersColumnId }]
           })
         })
       );
     });
   });
   ```

### Integration Tests

**File**: [`test/integration/scenarios/resource-scenarios.ts`](../../test/integration/scenarios/resource-scenarios.ts)

**Test Scenarios**:

1. **Multi-Type Resource Import**
   ```typescript
   describe('Resource Type Separation', () => {
     it('should create separate columns for each resource type', async () => {
       const resources = [
         buildWorkResource({ Name: 'Alice', Email: 'alice@example.com' }),
         buildMaterialResource({ Name: 'Concrete' }),
         buildCostResource({ Name: 'Engineering' }),
       ];
       
       const result = await transformer.transformResources(resources, sheetId);
       
       const sheet = await client.sheets.getSheet({ sheetId });
       expect(sheet.columns).toContainEqual(expect.objectContaining({ title: 'Team Members' }));
       expect(sheet.columns).toContainEqual(expect.objectContaining({ title: 'Materials' }));
       expect(sheet.columns).toContainEqual(expect.objectContaining({ title: 'Cost Resources' }));
     });
     
     it('should populate correct columns based on resource type', async () => {
       const resources = [
         buildWorkResource({ Name: 'Alice', Email: 'alice@example.com', ResourceType: 'Work' }),
         buildMaterialResource({ Name: 'Concrete', ResourceType: 'Material' }),
       ];
       
       await transformer.transformResources(resources, sheetId);
       const sheet = await client.sheets.getSheet({ sheetId });
       
       const aliceRow = sheet.rows?.find(r => 
         r.cells?.some(c => c.displayValue === 'Alice' || c.value === 'Alice')
       );
       const concreteRow = sheet.rows?.find(r => 
         r.cells?.some(c => c.value === 'Concrete')
       );
       
       // Alice should be in Team Members, not Materials
       expect(aliceRow?.cells).toContainEqual(
         expect.objectContaining({ 
           columnId: teamMembersColumnId,
           objectValue: expect.objectContaining({ name: 'Alice' })
         })
       );
       
       // Concrete should be in Materials, not Team Members
       expect(concreteRow?.cells).toContainEqual(
         expect.objectContaining({ 
           columnId: materialsColumnId,
           value: 'Concrete'
         })
       );
     });
   });
   ```

2. **Task Sheet Reference Configuration**
   ```typescript
   describe('Task Assignment Columns', () => {
     it('should configure Assigned To to reference Resources Team Members', async () => {
       const resources = [buildWorkResource()];
       const tasks = [buildTaskWithAssignments()];
       
       await resourceTransformer.transformResources(resources, resourcesSheetId);
       await taskTransformer.transformTasks(tasks, tasksSheetId);
       
       const tasksSheet = await client.sheets.getSheet({ sheetId: tasksSheetId });
       const assignedToColumn = tasksSheet.columns?.find(c => c.title === 'Assigned To');
       
       expect(assignedToColumn?.contactOptions).toContainEqual({
         sheetId: resourcesSheetId,
         columnId: teamMembersColumnId
       });
     });
   });
   ```

### Manual Testing Checklist

- [ ] Create Resources sheet with mixed resource types
- [ ] Verify Work resources appear in Team Members column only
- [ ] Verify Material resources appear in Materials column only
- [ ] Verify Cost resources appear in Cost Resources column only
- [ ] Verify empty type columns for each row
- [ ] Create Tasks sheet with assignment columns
- [ ] Verify Assigned To dropdown shows Team Members from Resources sheet
- [ ] Verify Materials dropdown shows Materials from Resources sheet
- [ ] Verify Cost Resources dropdown shows Cost Resources from Resources sheet
- [ ] Test multi-select functionality in Task assignment columns
- [ ] Verify filtering by Resource Type column works correctly

---

## Migration Considerations

### Breaking Changes

**Impact**: This is a BREAKING CHANGE for existing implementations

**Reason**: Column structure changes from single "Contact" to multiple type-specific columns

### Migration Strategy

**Option 1: Clean Slate** (Recommended)
- Users re-import projects with new structure
- Old workspaces/sheets remain unchanged
- Clear cutover date

**Option 2: Dual Support**
- Support both old and new column structures temporarily
- Feature flag: `ENABLE_RESOURCE_TYPE_SEPARATION`
- Gradual migration over time

**Option 3: Automated Migration**
- Script to transform existing sheets
- Read old "Contact" column and "Resource Type" column
- Populate new type-specific columns
- Hide/remove old columns
- Complex and risky

**Recommendation**: Option 1 (Clean Slate)
- Simplest implementation
- No migration complexity
- Clear behavior for users
- Can be communicated as "Version 2.0" of import structure

### User Communication

**Key Messages**:
1. Resources are now organized by type for better clarity
2. Re-import required for new structure
3. Task assignments now properly reference resource types
4. Improved dropdown experience in Tasks sheet

**Documentation Updates Needed**:
- README.md - mention new resource structure
- User Guide - update screenshots and descriptions
- Migration Guide - explain transition process

---

## Success Metrics

### Functional Metrics

- ✅ 100% of resources correctly placed in type-specific columns
- ✅ 0 resources in incorrect type columns
- ✅ Sheet references properly configured for all resource types
- ✅ All unit tests passing
- ✅ All integration tests passing

### Performance Metrics

- ⏱️ Import time increase < 5% compared to current implementation
- ⏱️ Sheet reference configuration completes within 2 seconds per sheet

### Quality Metrics

- 🧪 Unit test coverage > 90% for new code
- 🧪 Integration test coverage for all resource type scenarios
- 📝 Specification approved and complete before implementation
- 📝 Code review passed with no major issues

---

## Open Questions

### Q1: Should Resource Type column remain visible?

**Options**:
- Keep visible for filtering/reporting
- Hide since redundant with type-specific columns
- Make configurable

**Recommendation**: Keep visible but move to end of column list

**Rationale**: Useful for filtering, supports legacy workflows, minimal cost

### Q2: What if Project Online returns unknown resource types?

**Options**:
- Error and reject import
- Default to Work type with warning
- Create "Other" column

**Recommendation**: Default to Work type with warning logged

**Rationale**: Graceful degradation, unlikely scenario, maintains import success

### Q3: Should we support custom resource type names?

**Scenario**: User wants "Consultants" instead of "Team Members"

**Options**:
- Hardcode standard names (current approach)
- Make configurable via environment variables
- Support column name mapping file

**Recommendation**: Hardcode for v1, consider configuration in v2

**Rationale**: Simplicity, consistency, YAGNI principle

### Q4: How to handle resources with no type specified?

**Current Logic**: Default to Work type

**Alternative**: Create "Untyped" column

**Recommendation**: Keep default to Work type

**Rationale**: Most resources are people, simple fallback, matches Project Online behavior

---

## Appendices

### Appendix A: Related Code Files

**Primary Files**:
- [`src/transformers/ResourceTransformer.ts`](../../src/transformers/ResourceTransformer.ts) - Resource sheet creation
- [`src/transformers/TaskTransformer.ts`](../../src/transformers/TaskTransformer.ts) - Task sheet creation
- [`src/transformers/utils.ts`](../../src/transformers/utils.ts) - Shared transformation utilities
- [`src/types/ProjectOnline.ts`](../../src/types/ProjectOnline.ts) - Type definitions
- [`src/types/Smartsheet.ts`](../../src/types/Smartsheet.ts) - Smartsheet column types

**Test Files**:
- [`test/unit/transformers/ResourceTransformer.test.ts`](../../test/unit/transformers/ResourceTransformer.test.ts)
- [`test/unit/transformers/TaskTransformer.test.ts`](../../test/unit/transformers/TaskTransformer.test.ts)
- [`test/integration/scenarios/resource-scenarios.ts`](../../test/integration/scenarios/resource-scenarios.ts)
- [`test/integration/scenarios/task-scenarios.ts`](../../test/integration/scenarios/task-scenarios.ts)

**Factory Files**:
- [`src/factories/StandaloneWorkspacesFactory.ts`](../../src/factories/StandaloneWorkspacesFactory.ts)
- [`src/factories/PortfolioFactory.ts`](../../src/factories/PortfolioFactory.ts)

### Appendix B: Smartsheet API References

**Column Types**:
- [Column Types Documentation](https://smartsheet.redoc.ly/tag/columnsRelated#section/Column-Types)
- [Contact List Columns](https://smartsheet.redoc.ly/tag/contactsRelated)
- [Picklist Columns](https://smartsheet.redoc.ly/tag/columnsRelated#section/Picklist-Column-Type)

**Column References**:
- [Cell Links](https://smartsheet.redoc.ly/tag/cellRelated#section/Cell-Link)
- [Column Options](https://smartsheet.redoc.ly/tag/columnsRelated#section/Update-Column)

### Appendix C: Example Project Online Data

**Sample Resources**:
```json
[
  {
    "Id": "550e8400-e29b-41d4-a716-446655440001",
    "Name": "Alice Smith",
    "Email": "alice.smith@example.com",
    "ResourceType": "Work",
    "MaxUnits": 1.0
  },
  {
    "Id": "550e8400-e29b-41d4-a716-446655440002",
    "Name": "Concrete Mix",
    "Email": null,
    "ResourceType": "Material",
    "MaxUnits": null
  },
  {
    "Id": "550e8400-e29b-41d4-a716-446655440003",
    "Name": "Engineering Department",
    "Email": null,
    "ResourceType": "Cost",
    "MaxUnits": null
  }
]
```

**Expected Smartsheet Resources Sheet**:
```
| Team Members     | Materials     | Cost Resources          | Resource Type |
|------------------|---------------|-------------------------|---------------|
| Alice Smith      |               |                         | Work          |
|                  | Concrete Mix  |                         | Material      |
|                  |               | Engineering Department  | Cost          |
```

**Expected Smartsheet Tasks Sheet** (after configuration):
```
| Task Name    | Assigned To   | Materials     | Cost Resources          |
|--------------|---------------|---------------|-------------------------|
| Foundation   | Alice Smith   | Concrete Mix  | Engineering Department  |
```

---

## Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Spec Mode | Initial specification created |

---

## Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |

---

**End of Specification**
