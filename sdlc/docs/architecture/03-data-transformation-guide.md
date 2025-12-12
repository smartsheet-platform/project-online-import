**📚 Implementation Guide Series**

<div align="center">

| [← Previous: ETL System Design](./02-etl-system-design.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Template-Based Workspace Creation →](../project/Template-Based-Workspace-Creation.md) |
|:---|:---:|---:|

</div>

---

# Data Transformation Guide

**Status**: Production Implementation  
**Last Updated**: 2024-12-08

This guide provides detailed specifications for transforming Microsoft Project Online entities to Smartsheet structures, including property mappings, data type conversions, and naming conventions.

## Table of Contents

1. [Transformation Strategy](#transformation-strategy)
2. [Entity Mappings](#entity-mappings)
   - [Project Mapping](#1-project-mapping)
   - [Task Mapping](#2-task-mapping)
   - [Resource Mapping](#3-resource-mapping)
   - [Assignment Mapping](#4-assignment-mapping)
3. [Data Type Conversions](#data-type-conversions)
4. [Naming Conventions](#naming-conventions)
5. [PMO Standards Architecture](#pmo-standards-architecture)

## Transformation Strategy

### Approach: Workspace-Based Mapping

```
Project Online Entity    →    Smartsheet Structure
══════════════════════════════════════════════════

Project                  →    Workspace (one per project)
                         →    Name matches Project Online exactly

Task (root)              →    Row in Tasks Sheet (level 0)
  └─ Task (child)        →    Child Row (level 1, indented)
      └─ Task (grandchild) → Child Row (level 2, indented)

Resource                 →    Row in Resources Sheet
                         →    Contact object with name+email
                         →    Sources assignment column options

Assignment               →    Contact List column in Tasks Sheet
                         →    Grouped by type/role
```

### Design Decisions

1. **Project → Workspace**: Each Project Online project becomes a Smartsheet workspace with matching name
2. **No Folders**: Sheets placed directly in workspace root
3. **Project Sheet Type**: Tasks sheet configured as project sheet (Gantt + dependencies enabled)
4. **Dual ID Pattern**: GUID preserved in hidden column, plus readable auto-number ID
5. **Contact Objects**: Name+Email pairs mapped to single Contact column with objectValue format
6. **Embedded Assignments**: Assignment relationships as Contact List columns sourced from Resources Sheet

## Entity Mappings

## 1. Project Mapping

### Project Online → Smartsheet Workspace

**Source**: Project Online `Project` entity  
**Target**: Smartsheet `Workspace` (dedicated per project)

**Workspace Naming**:
- **Pattern**: `{ProjectName}` (NO prefix)
- **Sanitization**: Remove invalid chars `/\:*?"<>|` → `-`, consolidate dashes, trim
- **Max Length**: 100 characters
- **Truncation**: If > 100 chars, truncate to 97 chars and append `"..."`

**Examples**:
```
"Website Redesign 2024"                    → "Website Redesign 2024"
"Q1/Q2 Planning & Execution"               → "Q1-Q2 Planning & Execution"
"IT Infrastructure | Phase 1"              → "IT Infrastructure - Phase 1"
```

### Project Summary Sheet (Optional)

**Sheet Name**: `{ProjectName} - Summary`

**Column Definitions** (15 columns, single row):

| Column Name | Type | Source | Format | Example |
|-------------|------|--------|--------|---------|
| Project Online Project ID | TEXT_NUMBER | `Project.Id` | Hidden, Locked | "a1b2c3d4-e5f6..." |
| Project Name | TEXT_NUMBER | `Project.Name` | Primary | "Website Redesign 2024" |
| Description | TEXT_NUMBER | `Project.Description` | Multi-line | "Complete redesign..." |
| Owner | CONTACT_LIST | `Project.Owner` + `OwnerEmail` | objectValue | John Doe (john@example.com) |
| Start Date | DATE | `Project.StartDate` | YYYY-MM-DD | "2024-03-15" |
| Finish Date | DATE | `Project.FinishDate` | YYYY-MM-DD | "2024-06-30" |
| Status | PICKLIST | `Project.ProjectStatus` | From PMO Standards | "Active" |
| Priority | PICKLIST | `Project.Priority` | 7 levels, from PMO Standards | "High" |
| % Complete | TEXT_NUMBER | `Project.PercentComplete` | 0-100% | "45%" |
| Project Online Created Date | DATE | `Project.CreatedDate` | User-settable | "2024-03-01" |
| Project Online Modified Date | DATE | `Project.ModifiedDate` | User-settable | "2024-03-15" |
| Created Date | CREATED_DATE | System | Auto | "2024-12-03" |
| Modified Date | MODIFIED_DATE | System | Auto | "2024-12-04" |
| Created By | CREATED_BY | System | Auto | User contact |
| Modified By | MODIFIED_BY | System | Auto | User contact |

## 2. Task Mapping

### Project Online Task → Smartsheet Task Sheet Row

**Sheet Name**: `{ProjectName} - Tasks`

**Sheet Type**: Project Sheet (Gantt enabled, dependencies enabled)

**Column Definitions** (18+ columns, multiple rows):

| Column Name | Type | Source | Format | Example |
|-------------|------|--------|--------|---------|
| Task Name | TEXT_NUMBER | `Task.TaskName` | Primary, Hierarchy | "Design Homepage" |
| Task ID | AUTO_NUMBER | Auto | `{PREFIX}-#####` | "WEB-00001" |
| Project Online Task ID | TEXT_NUMBER | `Task.Id` | Hidden, Locked | "a1b2c3d4..." |
| Start Date | DATE | `Task.Start` | System column | "2024-03-15" |
| End Date | DATE | `Task.Finish` | System column | "2024-03-22" |
| Duration | DURATION | `Task.Duration` | Decimal days | 5.0 |
| % Complete | TEXT_NUMBER | `Task.PercentComplete` | 0-100% | "45%" |
| Status | PICKLIST | Calculated | From PMO Standards | "In Progress" |
| Priority | PICKLIST | `Task.Priority` | 7 levels | "Very High" |
| Work (hrs) | TEXT_NUMBER | `Task.Work` | Hours string | "40h" |
| Actual Work (hrs) | TEXT_NUMBER | `Task.ActualWork` | Hours string | "32h" |
| Milestone | CHECKBOX | `Task.IsMilestone` | Boolean | ☑ |
| Notes | TEXT_NUMBER | `Task.TaskNotes` | Multi-line | "Review with team" |
| Predecessors | PREDECESSOR | `Task.Predecessors` | Row relationships | "5FS" |
| Constraint Type | PICKLIST | `Task.ConstraintType` | From PMO Standards | "ASAP" |
| Constraint Date | DATE | `Task.ConstraintDate` | YYYY-MM-DD | "2024-03-20" |
| Deadline | DATE | `Task.Deadline` | YYYY-MM-DD | "2024-04-01" |
| **Dynamic Assignment Columns** | MULTI_CONTACT_LIST or MULTI_PICKLIST | See Assignment Mapping | Varies | Multiple resources |

### Task Hierarchy Handling

**Source**: `OutlineLevel` property (0 = root, 1 = child, 2 = grandchild, etc.)  
**Target**: Smartsheet parent-child relationships via row indentation

**Conversion Strategy**:
1. Sort tasks by `TaskIndex` (maintains original order)
2. Track `OutlineLevel` for each task
3. When `OutlineLevel` increases, create child relationship
4. When `OutlineLevel` decreases, return to parent level
5. Use `parentId` in row structure to establish hierarchy

**Example**:
```
Project Online:                  Smartsheet:
- Task 1 (Level 0)      →       Row 1: Task 1 (no parent)
- Task 1.1 (Level 1)    →         Row 2: Task 1.1 (parent: Row 1)
- Task 1.1.1 (Level 2)  →           Row 3: Task 1.1.1 (parent: Row 2)
- Task 1.2 (Level 1)    →         Row 4: Task 1.2 (parent: Row 1)
- Task 2 (Level 0)      →       Row 5: Task 2 (no parent)
```

## 3. Resource Mapping

### Project Online Resource → Smartsheet Resource Sheet Row

**Sheet Name**: `{ProjectName} - Resources`

**Sheet Type**: Standard sheet (no hierarchy)

**Column Definitions** (18 columns, multiple rows):

| Column Name | Type | Source | Format | Example |
|-------------|------|--------|--------|---------|
| Resource ID | AUTO_NUMBER | Auto | `{PREFIX}-#####` | "WEB-00042" |
| Project Online Resource ID | TEXT_NUMBER | `Resource.Id` | Hidden, Locked | "a1b2c3d4..." |
| Contact | CONTACT_LIST | `Resource.Name` + `Email` | Primary, objectValue | John Doe (john@example.com) |
| Resource Type | PICKLIST | `Resource.ResourceType` | From PMO Standards | "Work" |
| Max Units | TEXT_NUMBER | `Resource.MaxUnits` | Percentage | "100%" |
| Standard Rate | TEXT_NUMBER | `Resource.StandardRate` | Currency format | 75.00 |
| Overtime Rate | TEXT_NUMBER | `Resource.OvertimeRate` | Currency format | 112.50 |
| Cost Per Use | TEXT_NUMBER | `Resource.CostPerUse` | Currency format | 50.00 |
| Department | PICKLIST | `Resource.Department` | Discovered values | "Engineering" |
| Code | TEXT_NUMBER | `Resource.Code` | Text | "ENG-001" |
| Is Active | CHECKBOX | `Resource.IsActive` | Boolean | ☑ |
| Is Generic | CHECKBOX | `Resource.IsGeneric` | Boolean | ☐ |

## 4. Assignment Mapping

### Assignments → Dynamic Contact List Columns in Tasks Sheet

**NO Separate Assignments Sheet** - Assignments are embedded as columns in the Tasks Sheet.

**Critical Column Type Distinction**:
- **People Resources (Work type)** → `MULTI_CONTACT_LIST` columns (name + email)
- **Non-People Resources (Material/Cost)** → `MULTI_PICKLIST` columns (text only)

**Example Assignment Columns**:

| Column Name | Type | Source | Configuration |
|------------|------|--------|---------------|
| Team Members | MULTI_CONTACT_LIST | Work resources | Options from Resources Sheet |
| Equipment | MULTI_PICKLIST | Material resources | Options from resource names |
| Cost Centers | MULTI_PICKLIST | Cost resources | Options from resource names |

**Benefits**:
- Assignments visible directly in task list
- Validated data (sourced from Resources Sheet)
- Native Smartsheet collaboration features (@mentions)
- Simpler structure (fewer sheets to manage)

## Data Type Conversions

### Duration Conversion

**Source**: ISO 8601 Duration (e.g., `PT40H` = 40 hours)

**Target for Project Sheet Duration Column**: Decimal days

```typescript
// PT40H → 5.0 (40 hours / 8-hour workday = 5 days)
// P5D → 5.0 (5 days direct)
// PT480M → 1.0 (480 minutes = 8 hours = 1 day)
```

**Target for Work/Actual Work Columns**: Hours string

```typescript
// PT40H → "40h"
// PT80H → "80h"
```

### DateTime Conversion

**Source**: ISO 8601 DateTime (e.g., `2024-03-15T09:00:00Z`)

**Target**: Date string `YYYY-MM-DD`

```typescript
// 2024-03-15T09:00:00Z → "2024-03-15"
// 2024-12-31T23:59:59-08:00 → "2024-12-31"
```

### Priority Mapping

**Source**: Integer 0-1000 (7 fixed levels)

**Target**: Picklist with 7 matching labels

| Project Online Value | Smartsheet Picklist |
|---------------------|---------------------|
| 1000+ | Highest |
| 800-999 | Very High |
| 600-799 | Higher |
| 500-599 | Medium (default) |
| 400-499 | Lower |
| 200-399 | Very Low |
| 0-199 | Lowest |

### Status Derivation

**Source**: Calculated from `PercentComplete`

**Logic**:
- `0%` → "Not Started"
- `1-99%` → "In Progress"
- `100%` → "Complete"

### Contact Objects

**Source**: Separate Name and Email fields

**Target**: Single CONTACT_LIST column with objectValue

```typescript
// Project Online
Owner: "John Doe"
OwnerEmail: "john@example.com"

// Smartsheet Cell Value
{
  "objectValue": {
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### Currency Conversion

**Source**: Decimal (e.g., `75.00`)

**Target**: Numeric value (NOT string)

```typescript
// Store as number, let Smartsheet format as currency
75.0 → 75.0 (displayed as "$75.00" by Smartsheet)
112.5 → 112.5 (displayed as "$112.50" by Smartsheet)
```

**Key Principle**: Store rates/costs as numeric values and let Smartsheet's column formatting handle currency display.

### Boolean to Checkbox

**Source**: Boolean (true/false)

**Target**: CHECKBOX column

```typescript
// IsActive = true → ☑ (checked)
// IsActive = false → ☐ (unchecked)
```

**Key Principle**: Use native CHECKBOX columns for boolean values instead of text picklists.

### Percentage Conversion

**Source**: Decimal (e.g., `1.0` = 100%)

**Target**: Percentage string

```typescript
// 1.0 → "100%"
// 0.5 → "50%"
// 1.5 → "150%" (overallocated)
```

## Naming Conventions

### Workspace Names

- **Pattern**: `{ProjectName}` (NO prefix, sanitized only)
- **Sanitization**: Remove invalid chars `/\:*?"<>|` → `-`, consolidate, trim
- **Examples**:
  - `"Website Redesign 2024"`
  - `"Q1-Q2 Planning & Execution"`
  - `"IT Infrastructure - Phase 1"`

### Sheet Names

- **Pattern**: `{ProjectName} - {EntityType}` OR `{EntityType}` (in workspace)
- **Examples**:
  - `"Website Redesign - Tasks"` or `"Tasks"`
  - `"Website Redesign - Resources"` or `"Resources"`
  - `"Website Redesign - Summary"` or `"Summary"`

**Note**: No folders. All sheets in workspace root.

### Column Names

**Standard Columns**:
- Use Title Case
- Separate words with spaces
- Include units in parentheses

**Examples**:
- `"Task Name"` (not "TaskName")
- `"Start Date"` (not "StartDate")
- `"Work (hrs)"` (not "WorkHours")
- `"% Complete"` (not "PercentComplete")

**ID Columns**:
- Always append " ID" to entity name
- Keep as hidden columns

**Examples**:
- `"Task ID"`
- `"Resource ID"`
- `"Project ID"`

### Value Formats

**Dates**: `YYYY-MM-DD` (e.g., `"2024-03-15"`)

**Durations**: Number + unit (e.g., `"5d"`, `"40h"`, `"2w"`)

**Percentages**: Integer + `%` (e.g., `"0%"`, `"50%"`, `"100%"`)

**Currency**: Numeric (e.g., `75.00`, `112.50`) - formatted by Smartsheet

**Booleans**: Checkbox (`☑` or `☐`)

## PMO Standards Architecture

### Centralized Reference Data Workspace

A single "PMO Standards" workspace contains reference sheets for all picklist values used across all project migrations.

```
PMO Standards Workspace (Centralized)
├── Standard Field Reference Sheets
│   ├── Project - Status
│   ├── Project - Priority
│   ├── Task - Status
│   ├── Task - Priority
│   ├── Task - Constraint Type
│   └── Resource - Type
│
└── Discovered Field Reference Sheets
    └── Resource - Department (values discovered from data)
```

### Sheet Naming Convention

**Pattern**: `{EntityType} - {FieldName}`

**Examples**:
- `"Project - Status"` (not just "Status")
- `"Task - Priority"` (separate from Project Priority)
- `"Resource - Type"`
- `"Resource - Department"`

**Purpose**: Disambiguate fields with same property names across entity types

### Reference Sheet Structure

Each reference sheet has a simple structure:
- **Column 1**: "Name" (primary column)
- **Rows**: One per valid option value

**Example - Task Priority Reference**:

| Name |
|------|
| Highest |
| Very High |
| Higher |
| Medium |
| Lower |
| Very Low |
| Lowest |

### Project Column Configuration

Project sheets reference PMO Standards sheets for picklist values:

```typescript
// Example: Task Priority Column
{
  "title": "Priority",
  "type": "PICKLIST",
  "options": [{
    "sheetId": 234567890,      // PMO Standards/Task - Priority sheet
    "columnId": 345678901       // "Name" column in that sheet
  }],
  "validation": true            // Strict validation
}
```

### Benefits

1. **Centralized Management**: PMO maintains reference data in one place
2. **Cross-Project Consistency**: All projects use same validated values
3. **Easy Updates**: Update reference sheet once, affects all projects
4. **Data Governance**: Single source of truth for standards
5. **Scalability**: Works across unlimited project migrations
6. **Automatic Discovery**: Tool discovers and populates reference sheets

### Migration Flow

```
1. CLI Startup
   └─> Initialize/Verify PMO Standards workspace

2. Per Project Migration
   └─> Create project workspace
   └─> Create sheets (Tasks, Resources, Summary)
   └─> Configure columns with PMO Standards references
   └─> Populate data with validation

3. PMO Standards Evolution
   └─> New values automatically added to reference sheets
   └─> Existing projects reference updated values
```

## Validation Rules

### During Extraction
- Verify required fields present (Id, Name, etc.)
- Check null/empty values in non-nullable fields
- Validate Guid formats
- Validate date/time formats

### During Transformation
- Validate transformed values match target data types
- Check string lengths (column names max 50 chars, cell values max 4000 chars)
- Verify hierarchical relationships (parent tasks exist)
- Validate foreign key references (ProjectId, TaskId, ResourceId)
- Check numerical ranges (percentages 0-100, priority 0-1000)

### Before Loading
- Sheet name uniqueness within workspace
- Column type compatibility
- Row hierarchy consistency
- Predecessor references valid (row numbers exist)
- Required columns exist
- No duplicate IDs

## Summary

This transformation guide provides the complete mapping specifications for migrating Project Online data to Smartsheet. Key points:

**Entity Coverage**: 4 core entities (Projects, Tasks, Resources, Assignments)

**Properties Mapped**: 50+ properties with detailed conversion rules

**Data Types**: 8 major conversions (Guid, DateTime, Duration, Priority, Status, Contact, Currency, Boolean)

**Relationships Preserved**: 
- Project-Task hierarchy
- Task parent-child relationships
- Task dependencies (predecessors)
- Resource assignments (via Contact List columns)

**Sheet Structure**:
- 1 Workspace per project
- 2-3 sheets per project (Tasks, Resources, optional Summary)
- Sheets in workspace root (no folders)
- Embedded assignments (no separate sheet)

**Key Design Patterns**:
1. Workspace-per-project mapping
2. Name preservation (sanitized)
3. Dual ID pattern (GUID + auto-number)
4. Contact objects (name + email)
5. Embedded assignments
6. PMO Standards integration
7. Re-run resiliency

## Related Documentation

For system architecture and component details:
- [ETL System Design](./02-etl-system-design.md) - Component architecture

For system architecture and overview:
- [Project Online Migration Overview](./01-project-online-migration-overview.md) - Business context
- [ETL System Design](./02-etl-system-design.md) - Component architecture and implementation

---

<div align="center">

| [← Previous: ETL System Design](./02-etl-system-design.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Template-Based Workspace Creation →](../project/Template-Based-Workspace-Creation.md) |
|:---|:---:|---:|

</div>