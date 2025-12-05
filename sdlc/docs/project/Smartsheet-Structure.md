# Smartsheet Asset Structure

## Overview

This document describes the Smartsheet workspace and sheet structure created by the Project Online to Smartsheet ETL tool.

**Last Updated**: 2024-12-05

---

## Workspace Organization

### Per-Project Structure

Each Project Online project is transformed into a **dedicated Smartsheet workspace** containing three sheets:

```
Workspace: {ProjectName}
├── Sheet: {ProjectName} - Summary
├── Sheet: {ProjectName} - Tasks
└── Sheet: {ProjectName} - Resources
```

**Example**:
```
Workspace: Website Redesign Q1
├── Sheet: Website Redesign Q1 - Summary
├── Sheet: Website Redesign Q1 - Tasks
└── Sheet: Website Redesign Q1 - Resources
```

### Naming Conventions

**Workspace Names**:
- Direct use of Project Online project name
- Sanitized to remove invalid characters: `/\:*?"<>|` → `-`
- Multiple dashes consolidated to single dash
- Trimmed of leading/trailing spaces and dashes
- Maximum length: 100 characters

**Sheet Names**:
- Format: `{ProjectName} - {EntityType}`
- EntityType: "Summary", "Tasks", or "Resources"
- Sanitized using same rules as workspace names
- Maximum length: 50 characters

---

## PMO Standards Workspace

A centralized workspace containing reference sheets for picklist values across all projects.

```
Workspace: PMO Standards
├── Sheet: Project - Status
├── Sheet: Project - Priority
├── Sheet: Task - Status
├── Sheet: Task - Priority
├── Sheet: Task - Constraint Type
├── Sheet: Resource - Type
└── Sheet: Resource - Department
```

### Purpose

These reference sheets enable **strict picklists** with cross-sheet references, ensuring:
- Data consistency across all projects
- Centralized value management
- Easy updates without modifying individual project sheets

### Reference Sheet Structure

Each reference sheet has a simple two-column structure:
- Column 1: Value (primary column)
- Column 2: Description (optional)

**Example - Task Priority Reference**:
| Priority | Description |
|----------|-------------|
| Highest  | Critical priority (1000-858) |
| Very High| High priority (857-715) |
| Higher   | Above medium (714-572) |
| Medium   | Normal priority (571-429) |
| Lower    | Below medium (428-286) |
| Very Low | Low priority (285-143) |
| Lowest   | Minimal priority (142-0) |

---

## Sheet Structures

### 1. Summary Sheet

**Purpose**: Contains project-level metadata in a single row

**Column Structure** (15 columns):

| # | Column Name | Type | Width | Properties | Source |
|---|-------------|------|-------|------------|--------|
| 1 | Project Online Project ID | TEXT_NUMBER | 150 | Hidden, Locked | PO: Id (GUID) |
| 2 | Project Name | TEXT_NUMBER | 200 | Primary | PO: Name |
| 3 | Description | TEXT_NUMBER | 300 | - | PO: Description |
| 4 | Owner | CONTACT_LIST | 150 | - | PO: Owner + OwnerEmail |
| 5 | Start Date | DATE | 120 | - | PO: StartDate |
| 6 | Finish Date | DATE | 120 | - | PO: FinishDate |
| 7 | Status | PICKLIST | 120 | Strict, Cross-sheet | PO: ProjectStatus |
| 8 | Priority | PICKLIST | 120 | Strict, Cross-sheet | PO: Priority (mapped) |
| 9 | % Complete | TEXT_NUMBER | 100 | - | PO: PercentComplete |
| 10 | Project Online Created Date | DATE | 120 | - | PO: CreatedDate |
| 11 | Project Online Modified Date | DATE | 120 | - | PO: ModifiedDate |
| 12 | Created Date | CREATED_DATE | 120 | System | Auto-populated |
| 13 | Modified Date | MODIFIED_DATE | 120 | System | Auto-populated |
| 14 | Created By | CREATED_BY | 150 | System | Auto-populated |
| 15 | Modified By | MODIFIED_BY | 150 | System | Auto-populated |

**Data Pattern**:
- Single row containing all project metadata
- System columns track Smartsheet-specific audit trail
- Original Project Online dates preserved in dedicated columns

**Picklist References**:
- Status → `PMO Standards/Project - Status`
- Priority → `PMO Standards/Project - Priority`

### 2. Task Sheet

**Purpose**: Contains task hierarchy with Gantt chart enabled

**Column Structure** (18+ columns):

| # | Column Name | Type | Width | Properties | Source |
|---|-------------|------|-------|------------|--------|
| 1 | Task Name | TEXT_NUMBER | 300 | Primary | PO: TaskName |
| 2 | Project Online Task ID | TEXT_NUMBER | 150 | Hidden, Locked | PO: Id (GUID) |
| 3 | Start Date | DATE | 120 | Gantt | PO: Start |
| 4 | End Date | DATE | 120 | Gantt | PO: Finish |
| 5 | Duration | DURATION | 80 | Gantt, Auto-calc | Calculated from dates |
| 6 | % Complete | TEXT_NUMBER | 100 | - | PO: PercentComplete |
| 7 | Status | PICKLIST | 120 | Strict, Cross-sheet | Derived from % Complete |
| 8 | Priority | PICKLIST | 120 | Strict, Cross-sheet | PO: Priority (mapped) |
| 9 | Work (hrs) | TEXT_NUMBER | 100 | - | PO: Work (converted) |
| 10 | Actual Work (hrs) | TEXT_NUMBER | 100 | - | PO: ActualWork (converted) |
| 11 | Milestone | CHECKBOX | 80 | - | PO: IsMilestone |
| 12 | Notes | TEXT_NUMBER | 250 | - | PO: TaskNotes |
| 13 | Predecessors | PREDECESSOR | 150 | Gantt | PO: Predecessors |
| 14 | Constraint Type | PICKLIST | 120 | Strict, Cross-sheet | PO: ConstraintType |
| 15 | Constraint Date | DATE | 120 | - | PO: ConstraintDate |
| 16 | Deadline | DATE | 120 | - | PO: Deadline |
| 17 | Project Online Created Date | DATE | 120 | - | PO: CreatedDate |
| 18 | Project Online Modified Date | DATE | 120 | - | PO: ModifiedDate |
| 19+ | Assignment Columns | MULTI_CONTACT_LIST or MULTI_PICKLIST | 200 | Dynamic | See Assignment Columns |

**Sheet Settings**:
- **Gantt Enabled**: Yes
- **Dependencies Enabled**: Yes
- **Project Sheet**: Yes
- **Resource Management**: No (using Contact List columns instead)

**Data Pattern**:
- Multiple rows, one per task
- Hierarchical structure via parent-child relationships
- Hierarchy based on `OutlineLevel` from Project Online:
  - OutlineLevel 1 → Top-level tasks (no parent)
  - OutlineLevel 2 → First-level children
  - OutlineLevel 3+ → Deeper hierarchy

**Picklist References**:
- Status → `PMO Standards/Task - Status`
- Priority → `PMO Standards/Task - Priority`
- Constraint Type → `PMO Standards/Task - Constraint Type`

#### Assignment Columns (Dynamic)

Assignment columns are **dynamically created** based on resources found in assignments:

**Work Resources** (People):
- Column Type: `MULTI_CONTACT_LIST`
- Column Name: Resource name (e.g., "John Doe")
- Purpose: Enable collaboration features (@mentions, notifications)
- Contact source: References Resource sheet Contact column
- Example: John Doe (john@example.com), Jane Smith (jane@example.com)

**Material Resources** (Equipment):
- Column Type: `MULTI_PICKLIST`
- Column Name: Resource name (e.g., "Crane A")
- Purpose: Track equipment usage
- Example: Crane A, Forklift B

**Cost Resources** (Cost Centers):
- Column Type: `MULTI_PICKLIST`
- Column Name: Resource name (e.g., "Engineering Dept")
- Purpose: Track cost allocations
- Example: Engineering Dept, Marketing Budget

### 3. Resource Sheet

**Purpose**: Contains flat list of all resources

**Column Structure** (18 columns):

| # | Column Name | Type | Width | Properties | Source |
|---|-------------|------|-------|------------|--------|
| 1 | Resource Name | TEXT_NUMBER | 200 | Primary | PO: Name |
| 2 | Project Online Resource ID | TEXT_NUMBER | 150 | Hidden, Locked | PO: Id (GUID) |
| 3 | Email | TEXT_NUMBER | 200 | - | PO: Email |
| 4 | Resource Type | PICKLIST | 120 | Strict, Cross-sheet | PO: ResourceType |
| 5 | Max Units | TEXT_NUMBER | 100 | - | PO: MaxUnits (as %) |
| 6 | Standard Rate | TEXT_NUMBER | 120 | - | PO: StandardRate |
| 7 | Overtime Rate | TEXT_NUMBER | 120 | - | PO: OvertimeRate |
| 8 | Cost Per Use | TEXT_NUMBER | 120 | - | PO: CostPerUse |
| 9 | Department | PICKLIST | 150 | Strict, Cross-sheet | PO: Department |
| 10 | Code | TEXT_NUMBER | 100 | - | PO: Code |
| 11 | Is Active | CHECKBOX | 80 | - | PO: IsActive |
| 12 | Is Generic | CHECKBOX | 80 | - | PO: IsGeneric |
| 13 | Project Online Created Date | DATE | 120 | - | PO: CreatedDate |
| 14 | Project Online Modified Date | DATE | 120 | - | PO: ModifiedDate |
| 15 | Created Date | CREATED_DATE | 120 | System | Auto-populated |
| 16 | Modified Date | MODIFIED_DATE | 120 | System | Auto-populated |
| 17 | Created By | CREATED_BY | 150 | System | Auto-populated |
| 18 | Modified By | MODIFIED_BY | 150 | System | Auto-populated |

**Data Pattern**:
- Flat list (no hierarchy)
- One row per resource
- Resources can be Work, Material, or Cost type

**Picklist References**:
- Resource Type → `PMO Standards/Resource - Type`
- Department → `PMO Standards/Resource - Department` (dynamic, discovered from data)

---

## Data Type Mappings

### Date Handling

**Project Online Format**: ISO 8601 DateTime
```
2024-01-15T14:30:00Z
```

**Smartsheet Format**: Date string (YYYY-MM-DD)
```
2024-01-15
```

**Dual Date Pattern**:
- Original PO timestamps → User-settable DATE columns ("Project Online Created Date")
- Smartsheet audit trail → System columns (CREATED_DATE, MODIFIED_DATE)

### Duration Conversion

**Project Online Format**: ISO 8601 Duration
```
PT40H  (40 hours)
P5D    (5 days)
PT480M (480 minutes)
```

**Smartsheet Task Sheet**: Decimal days (auto-calculated from Start/End dates)
```
5.0 days
```

**Smartsheet Non-System Columns**: Hours string
```
40h
```

### Priority Mapping

**Project Online**: Integer scale (0-1000)

**Smartsheet**: 7-level picklist
- 1000-858 → Highest
- 857-715 → Very High
- 714-572 → Higher
- 571-429 → Medium
- 428-286 → Lower
- 285-143 → Very Low
- 142-0 → Lowest

### Percentage Handling

**Project Online**: Decimal (0.0 to 1.0) or Integer (0 to 100)
```
0.75 or 75
```

**Smartsheet**: Percentage string
```
75%
```

### Contact Objects

**Project Online**: Separate Name and Email fields
```
Name: "John Doe"
Email: "john@example.com"
```

**Smartsheet**: Contact objectValue
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Multi-Contact Lists (Work Resources)

**Smartsheet objectValue**:
```json
{
  "objectType": "MULTI_CONTACT",
  "values": [
    { "name": "John Doe", "email": "john@example.com" },
    { "name": "Jane Smith", "email": "jane@example.com" }
  ]
}
```

### Multi-Picklists (Material/Cost Resources)

**Smartsheet objectValue**:
```json
{
  "objectType": "MULTI_PICKLIST",
  "values": ["Crane A", "Forklift B", "Engineering Dept"]
}
```

---

## Column Type Reference

### Standard Column Types

| Type | Purpose | Example |
|------|---------|---------|
| TEXT_NUMBER | Generic text/number | "Project Alpha", "100" |
| DATE | Date values | "2024-01-15" |
| CONTACT_LIST | Single contact | John Doe (john@example.com) |
| MULTI_CONTACT_LIST | Multiple contacts | Multiple team members |
| PICKLIST | Single selection | "High", "In Progress" |
| MULTI_PICKLIST | Multiple selection | Multiple equipment items |
| CHECKBOX | Boolean | Checked/Unchecked |
| PREDECESSOR | Task dependencies | "5FS+2d" |
| DURATION | Time duration | "5 days" |
| AUTO_NUMBER | Auto-generated IDs | "WRE-00001" |

### System Column Types

| Type | Purpose | Behavior |
|------|---------|----------|
| CREATED_DATE | Row creation date | Auto-populated by Smartsheet |
| MODIFIED_DATE | Row modification date | Auto-updated by Smartsheet |
| CREATED_BY | Row creator | Auto-populated by Smartsheet |
| MODIFIED_BY | Last editor | Auto-updated by Smartsheet |

**Note**: System columns cannot be user-set during import, hence the dual date pattern.

---

## Relationship Patterns

### Task Hierarchy

**Implementation**: Parent-child relationships via `parentId`

**Source**: Project Online `OutlineLevel` field
- OutlineLevel 1 → Top-level task (no parent)
- OutlineLevel 2 → Child of previous level 1 task
- OutlineLevel 3+ → Nested children

**Smartsheet Rendering**:
```
Task A (Level 1)
├── Task B (Level 2)
│   ├── Task C (Level 3)
│   └── Task D (Level 3)
└── Task E (Level 2)
Task F (Level 1)
```

### Task Dependencies

**Source**: Project Online `Predecessors` field (comma-separated string)

**Format**: `{TaskNumber}{Type}{Lag}`
- TaskNumber: Row number of predecessor task
- Type: FS (Finish-Start), SS (Start-Start), FF (Finish-Finish), SF (Start-Finish)
- Lag: Optional offset (e.g., "+2d", "-1w")

**Example**: `"5FS+2d, 8SS-1d"`

### Resource Assignments

**Implementation**: MULTI_CONTACT_LIST or MULTI_PICKLIST columns on Task sheet

**Type Determination**:
- Work resources → MULTI_CONTACT_LIST (requires email)
- Material/Cost resources → MULTI_PICKLIST (text-based)

**Column Source**:
- MULTI_CONTACT_LIST columns can reference Resource sheet Contact column
- MULTI_PICKLIST columns are standalone

---

## Workspace Limits and Constraints

### Smartsheet Limits

- **Maximum columns per sheet**: 400
- **Maximum rows per sheet**: 20,000
- **Maximum cells per sheet**: 500,000
- **Maximum hierarchy depth**: 12 levels
- **API rate limit**: 300 requests/minute per token

### Design Considerations

**Column Count**:
- Summary sheet: 15 fixed columns
- Task sheet: 18 fixed columns + dynamic assignment columns
- Resource sheet: 18 fixed columns

**Assignment Columns**:
- One column per unique resource in assignments
- Dynamically created based on actual data
- Grouped by type (Work vs Material/Cost)

**Hierarchy**:
- Unlimited in Project Online
- Limited to 12 levels in Smartsheet
- Deep hierarchies may need flattening

---

## Example Complete Structure

### Small Project Example

```
Workspace: Marketing Campaign Q1
├── Sheet: Marketing Campaign Q1 - Summary
│   └── 1 row (project metadata)
│
├── Sheet: Marketing Campaign Q1 - Tasks
│   ├── 25 rows (tasks)
│   ├── Hierarchy: 3 levels deep
│   ├── Assignment columns: 5 (3 Work, 2 Material)
│   └── Gantt enabled with dependencies
│
└── Sheet: Marketing Campaign Q1 - Resources
    └── 8 rows (5 Work, 2 Material, 1 Cost)

PMO Standards Workspace
├── Project - Status (Active, On Hold, Complete)
├── Project - Priority (7 levels)
├── Task - Status (Not Started, In Progress, Complete)
├── Task - Priority (7 levels)
├── Task - Constraint Type (8 types)
├── Resource - Type (Work, Material, Cost)
└── Resource - Department (Discovered from data)
```

### Large Project Example

```
Workspace: Enterprise System Migration
├── Sheet: Enterprise System Migration - Summary
│   └── 1 row
│
├── Sheet: Enterprise System Migration - Tasks
│   ├── 487 rows
│   ├── Hierarchy: 5 levels deep
│   ├── Assignment columns: 23 (18 Work, 3 Material, 2 Cost)
│   └── Multiple predecessor chains
│
└── Sheet: Enterprise System Migration - Resources
    └── 23 rows (18 Work, 3 Material, 2 Cost)
```

---

## Best Practices

### Workspace Organization

1. **One workspace per project** - Clear isolation and ownership
2. **Consistent naming** - Use project name throughout
3. **PMO Standards centralization** - Single source of truth for picklists

### Sheet Design

1. **Hidden columns for IDs** - Preserve GUIDs but keep interface clean
2. **System columns for audit** - Leverage Smartsheet-native tracking
3. **Original dates preserved** - Maintain Project Online timestamps
4. **Dynamic assignment columns** - Scale with actual resource usage

### Data Quality

1. **Strict picklists** - Enforce data consistency
2. **Contact integration** - Enable collaboration for Work resources
3. **Hierarchy validation** - Ensure proper parent-child relationships
4. **Gantt configuration** - Enable dependencies for project tracking

---

## References

- [Architecture Document](Architecture.md)
- [Sheet References Document](Sheet-References.md)
- [Smartsheet API Documentation](https://smartsheet.redoc.ly/)
- [Transformation Mapping Spec](../sdlc/docs/plans/project-online-smartsheet-transformation-mapping.md)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-05  
**Status**: Current Implementation