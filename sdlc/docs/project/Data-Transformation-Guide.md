<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🏗️ How it Works</h1>

[🎯 Migrating](./Project-Online-Migration-Overview.md) · 🏗️ How it Works · [🛠️ Contributing](../code/Conventions.md)

</div>

<div align="center">

[← Previous: System Design](./ETL-System-Design.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Workspace Creation Strategies →](./Factory-Pattern-Design.md)

</div>

---

# How Your Data Transforms

This guide explains how your Project Online data converts to Smartsheet format, including field mappings, data type conversions, and naming patterns.

## Table of Contents

1. [Transformation Approach](#transformation-approach)
2. [Field Mappings](#field-mappings)
   - [Project Information](#1-project-information)
   - [Tasks](#2-tasks)
   - [Resources](#3-resources)
   - [Assignments](#4-assignments)
3. [Data Type Conversions](#data-type-conversions)
4. [Naming Patterns](#naming-patterns)
5. [Standards Architecture](#standards-architecture)

## Transformation Approach

### How Your Data Maps

```
Your Project Online Data    →    What You Get in Smartsheet
═══════════════════════════════════════════════════════════

Project                     →    Workspace (one per project)
                            →    Name matches your project name

Task (top level)            →    Row in Tasks Sheet (level 0)
  └─ Task (subtask)         →    Indented Row (level 1)
      └─ Task (sub-subtask) →    Indented Row (level 2)

Resource                    →    Row in Resources Sheet
                            →    Contact with name and email
                            →    Available for assignment selection

Assignment                  →    Column in Tasks Sheet
                            →    Shows who's assigned to each task
```

### Design Approach

1. **One Project = One Workspace**: Each Project Online project becomes its own Smartsheet workspace
2. **Direct Placement**: Sheets are placed directly in the workspace (no folders)
3. **Project Sheet Features**: Tasks sheet includes Gantt chart and dependency tracking
4. **Dual Identifiers**: Original identifier preserved plus readable auto-number
5. **Contact Integration**: Names and email addresses work together
6. **Embedded Assignments**: Assignments appear as columns in your task list

## Field Mappings

## 1. Project Information

### From Project Online to Smartsheet Workspace

**What Happens**: Your Project Online project becomes a dedicated Smartsheet workspace

**Workspace Name**:
- Uses your exact project name
- Removes characters that aren't allowed: `/\:*?"<>|` become `-`
- Multiple dashes are consolidated to one
- Limited to 100 characters maximum
- If longer, truncates to 97 characters and adds `"..."`

**Examples**:
```
"Website Redesign 2024"           → "Website Redesign 2024"
"Q1/Q2 Planning & Execution"      → "Q1-Q2 Planning & Execution"
"IT Infrastructure | Phase 1"     → "IT Infrastructure - Phase 1"
```

### Project Summary Sheet

**Sheet Name**: `{Your Project Name} - Summary`

**Columns Created** (15 columns, one row with your project information):

| Column Name | What It Stores | Source | Example |
|-------------|----------------|--------|---------|
| Project Online Project ID | Original identifier | `Project.Id` | Hidden column |
| Project Name | Your project name | `Project.Name` | "Website Redesign 2024" |
| Description | Project description | `Project.Description` | "Complete redesign..." |
| Owner | Project owner with email | `Project.Owner` + Email | John Doe (john@example.com) |
| Start Date | When project starts | `Project.StartDate` | "2024-03-15" |
| Finish Date | When project completes | `Project.FinishDate` | "2024-06-30" |
| Status | Current status | `Project.ProjectStatus` | "Active" |
| Priority | Project priority | `Project.Priority` | "High" |
| % Complete | Completion percentage | `Project.PercentComplete` | "45%" |
| Project Online Created Date | When created in Project Online | `Project.CreatedDate` | "2024-03-01" |
| Project Online Modified Date | When last changed in Project Online | `Project.ModifiedDate` | "2024-03-15" |
| Created Date | When created in Smartsheet | System | Automatic |
| Modified Date | When last changed in Smartsheet | System | Automatic |
| Created By | Who created in Smartsheet | System | Automatic |
| Modified By | Who last changed in Smartsheet | System | Automatic |

## 2. Tasks

### From Project Online Tasks to Smartsheet Task Rows

**Sheet Name**: `{Your Project Name} - Tasks`

**Sheet Features**: Includes Gantt chart view and dependency tracking

**Columns Created** (18+ columns for each task):

| Column Name | What It Stores | Source | Example |
|-------------|----------------|--------|---------|
| Task Name | Your task name | `Task.TaskName` | "Design Homepage" |
| Task ID | Auto-generated identifier | Automatic | "WEB-00001" |
| Project Online Task ID | Original identifier | `Task.Id` | Hidden column |
| Start Date | When task starts | `Task.Start` | "2024-03-15" |
| End Date | When task finishes | `Task.Finish` | "2024-03-22" |
| Duration | How long task takes | `Task.Duration` | 5.0 days |
| % Complete | Task completion | `Task.PercentComplete` | "45%" |
| Status | Current status | Calculated | "In Progress" |
| Priority | Task priority | `Task.Priority` | "Very High" |
| Work (hrs) | Planned hours | `Task.Work` | "40h" |
| Actual Work (hrs) | Hours completed | `Task.ActualWork` | "32h" |
| Milestone | Is this a milestone? | `Task.IsMilestone` | Checkmark or empty |
| Notes | Task notes | `Task.TaskNotes` | "Review with team" |
| Predecessors | Dependencies | `Task.Predecessors` | "5FS" (finish-to-start) |
| Constraint Type | Schedule constraint | `Task.ConstraintType` | "As Soon As Possible" |
| Constraint Date | Constraint date | `Task.ConstraintDate` | "2024-03-20" |
| Deadline | Must finish by | `Task.Deadline` | "2024-04-01" |
| **Assignments** | Who's assigned | Dynamic | Your team members |

### How Task Hierarchy Works

**Your Project Online Structure**: Tasks have outline levels (0 = top, 1 = subtask, 2 = sub-subtask, etc.)  
**In Smartsheet**: Parent-child relationships show as indentation

**How It Converts**:
1. Tasks are sorted by their original order
2. The tool tracks each task's outline level
3. When the outline level increases, a child relationship is created
4. When the outline level decreases, the tool returns to the parent level
5. Parent-child relationships are established in the row structure

**Example**:
```
Your Project Online:             In Smartsheet:
- Task 1 (Level 0)      →       Row 1: Task 1 (top level)
- Task 1.1 (Level 1)    →         Row 2: Task 1.1 (indented under Row 1)
- Task 1.1.1 (Level 2)  →           Row 3: Task 1.1.1 (indented under Row 2)
- Task 1.2 (Level 1)    →         Row 4: Task 1.2 (indented under Row 1)
- Task 2 (Level 0)      →       Row 5: Task 2 (top level)
```

## 3. Resources

### From Project Online Resources to Smartsheet Resource Rows

**Sheet Name**: `{Your Project Name} - Resources`

**Sheet Type**: Flat list (no hierarchy)

**Columns Created** (21 columns total with type-specific separation):

| Column Name | What It Stores | Source | Example |
|-------------|----------------|--------|---------|
| Resource ID | Auto-generated identifier | Automatic | "WEB-00042" |
| Project Online Resource ID | Original identifier | `Resource.Id` | Hidden column |
| **Resource Name** | Resource name (primary, all resources) | `Resource.Name` | "Alice Smith" (all types) |
| **Team Members** | Contact for Work resources only | `Resource.Name` + `Email` | Alice Smith (alice@example.com) |
| **Materials** | Material resource name only | `Resource.Name` | "Concrete Mix" (Material only) |
| **Cost Resources** | Cost resource name only | `Resource.Name` | "Engineering Dept" (Cost only) |
| Resource Type | Work, Material, or Cost | `Resource.ResourceType` | "Work" |
| Max Units | Availability percentage | `Resource.MaxUnits` | "100%" |
| Standard Rate | Regular hourly rate | `Resource.StandardRate` | 75.00 |
| Overtime Rate | Overtime hourly rate | `Resource.OvertimeRate` | 112.50 |
| Cost Per Use | One-time cost | `Resource.CostPerUse` | 50.00 |
| Department | Department assignment | `Resource.Department` | "Engineering" |
| Code | Resource code | `Resource.Code` | "ENG-001" |
| Is Active | Currently active? | `Resource.IsActive` | Checkmark or empty |
| Is Generic | Generic resource? | `Resource.IsGeneric` | Checkmark or empty |
| Project Online Created Date | When created in PO | `Resource.CreatedDate` | "2024-03-01" |
| Project Online Modified Date | When last changed in PO | `Resource.ModifiedDate` | "2024-03-15" |
| Created Date | When created in SS | System | Automatic |
| Modified Date | When last changed in SS | System | Automatic |
| Created By | Who created in SS | System | Automatic |
| Modified By | Who last changed in SS | System | Automatic |

**Key Pattern**: Resource Name (primary) is always populated. Each resource also populates exactly ONE type-specific column (Team Members, Materials, or Cost Resources) based on ResourceType.

## 4. Assignments

### From Project Online Assignments to Task Sheet Columns

**Important**: There is no separate Assignments sheet - assignments appear as columns in your Tasks sheet.

**How It Works**:
- **Work resources (people)** → Multi-contact columns with collaboration features
- **Material resources** → Multi-select picklists with text-based selection
- **Cost resources** → Multi-select picklists with text-based selection

**Assignment Columns by Resource Type**:

| Column Name | Type | Contains | Sources From Resources Sheet |
|------------|------|----------|------------------------------|
| Assigned To | Multi-Contact List | Work resources (people) | Team Members (CONTACT_LIST) column |
| Materials | Multi-Picklist | Material resources | Materials (TEXT_NUMBER) column |
| Cost Resources | Multi-Picklist | Cost resources | Cost Resources (TEXT_NUMBER) column |

**Benefits**:
- See assignments directly in your task list
- Dropdown options sourced from Resources sheet
- Enable collaboration features for people (@mentions, notifications)
- Proper column types for different resource categories
- Simpler structure with fewer sheets

## Data Type Conversions

### Duration Conversion

**From Project Online**: ISO 8601 Duration format (e.g., `PT40H` means 40 hours)

**To Smartsheet Duration Column**: Decimal days

```typescript
// PT40H → 5.0 (40 hours ÷ 8-hour day = 5 days)
// P5D → 5.0 (5 days)
// PT480M → 1.0 (480 minutes = 8 hours = 1 day)
```

**To Work Hour Columns**: Hours with "h" suffix

```typescript
// PT40H → "40h"
// PT80H → "80h"
```

### Date and Time Conversion

**From Project Online**: ISO 8601 DateTime (e.g., `2024-03-15T09:00:00Z`)

**To Smartsheet**: Date in `YYYY-MM-DD` format

```typescript
// 2024-03-15T09:00:00Z → "2024-03-15"
// 2024-12-31T23:59:59-08:00 → "2024-12-31"
```

### Priority Conversion

**From Project Online**: Number from 0 to 1000

**To Smartsheet**: Text label from dropdown list

| Your Project Online Value | Becomes in Smartsheet |
|---------------------------|----------------------|
| 1000 or higher | Highest |
| 800-999 | Very High |
| 600-799 | Higher |
| 500-599 | Medium |
| 400-499 | Lower |
| 200-399 | Very Low |
| 0-199 | Lowest |

### Status Conversion

**From Project Online**: Calculated from completion percentage

**Conversion Rules**:
- `0%` → "Not Started"
- `1-99%` → "In Progress"
- `100%` → "Complete"

### Contact Information

**From Project Online**: Separate name and email fields

**To Smartsheet**: Single contact field with both

```typescript
// Project Online
Owner: "John Doe"
OwnerEmail: "john@example.com"

// Smartsheet (stored as one contact)
{
  "email": "john@example.com",
  "name": "John Doe"
}
```

### Currency Values

**From Project Online**: Decimal number (e.g., `75.00`)

**To Smartsheet**: Numeric value (Smartsheet formats it as currency)

```typescript
// Store as number, Smartsheet displays with currency symbol
75.0 → Displayed as "$75.00" in Smartsheet
112.5 → Displayed as "$112.50" in Smartsheet
```

### Yes/No Fields

**From Project Online**: Boolean (true/false)

**To Smartsheet**: Checkbox column

```typescript
// IsActive = true → ☑ (checked box)
// IsActive = false → ☐ (empty box)
```

### Percentage Values

**From Project Online**: Decimal where 1.0 = 100%

**To Smartsheet**: Percentage with "%" symbol

```typescript
// 1.0 → "100%"
// 0.5 → "50%"
// 1.5 → "150%" (overallocated)
```

## Naming Patterns

### Workspace Names

- **Pattern**: Uses your project name directly
- **Cleaning**: Removes characters that aren't allowed: `/\:*?"<>|` become `-`
- **Examples**:
  - `"Website Redesign 2024"` stays as `"Website Redesign 2024"`
  - `"Q1/Q2 Planning & Execution"` becomes `"Q1-Q2 Planning & Execution"`
  - `"IT Infrastructure | Phase 1"` becomes `"IT Infrastructure - Phase 1"`

### Sheet Names

- **Pattern**: `{Your Project Name} - {Sheet Type}`
- **Examples**:
  - `"Website Redesign - Tasks"`
  - `"Website Redesign - Resources"`
  - `"Website Redesign - Summary"`

**Note**: All sheets are placed directly in the workspace (no folders).

### Column Names

**Standard Format**:
- Each Word Starts With Capital Letter
- Words are separated by spaces
- Units are shown in parentheses

**Examples**:
- `"Task Name"` (not "TaskName")
- `"Start Date"` (not "StartDate")
- `"Work (hrs)"` (not "WorkHours")
- `"% Complete"` (not "PercentComplete")

**Identifier Columns**:
- Always include " ID" in the name
- Hidden by default

**Examples**:
- `"Task ID"`
- `"Resource ID"`
- `"Project ID"`

### Value Formats

**Dates**: Year-Month-Day (e.g., `"2024-03-15"`)

**Durations**: Number + unit (e.g., `"5d"`, `"40h"`, `"2w"`)

**Percentages**: Number + `%` symbol (e.g., `"0%"`, `"50%"`, `"100%"`)

**Currency**: Numeric value (e.g., `75.00`, `112.50`) - Smartsheet formats it with currency symbol

**Yes/No**: Checkbox (☑ checked or ☐ empty)

## Standards Architecture

### Centralized Reference Values

A single "Standards" workspace contains reference sheets with all the dropdown list values used across your projects.

```
Standards Workspace (Centralized)
├── Standard Reference Sheets
│   ├── Project - Status (Active, Planning, etc.)
│   ├── Project - Priority (Highest, High, Medium, etc.)
│   ├── Task - Status (Not Started, In Progress, Complete)
│   ├── Task - Priority (same levels as project priority)
│   ├── Task - Constraint Type (8 different types)
│   └── Resource - Type (People, Equipment, Cost)
│
└── Discovered Reference Sheets
    └── Resource - Department (departments found in your data)
```

### Reference Sheet Names

**Pattern**: `{Data Type} - {Field Name}`

**Examples**:
- `"Project - Status"` (clearly indicates it's for projects)
- `"Task - Priority"` (separate from project priority)
- `"Resource - Type"`
- `"Resource - Department"`

**Why**: Prevents confusion when the same field name appears in different contexts

### Reference Sheet Structure

Each reference sheet is simple:
- **First Column**: "Name" (main column)
- **Rows**: One row for each valid option

**Example - Task Priority Reference Sheet**:

| Name |
|------|
| Highest |
| Very High |
| Higher |
| Medium |
| Lower |
| Very Low |
| Lowest |

### How Dropdown Lists Work

Your project sheets reference the standards workspace for dropdown values:

```typescript
// Example: Task Priority Column Setup
{
  "title": "Priority",
  "type": "PICKLIST",
  "options": [{
    "sheetId": 234567890,      // Standards workspace Task - Priority sheet
    "columnId": 345678901       // "Name" column in that sheet
  }],
  "validation": true            // Only values from list are allowed
}
```

### Benefits of This Approach

1. **Centralized Management**: Update values in one place, affects all projects
2. **Consistency Across Projects**: All projects use the same validated values
3. **Easy Updates**: Change a reference sheet once, all projects reflect the change
4. **Single Source of Truth**: One place for your organization's standard values
5. **Unlimited Scale**: Works no matter how many projects you migrate
6. **Automatic Discovery**: The tool finds and populates reference sheets for you

### Migration Process

```
1. When You Start
   └─> Tool sets up or verifies the Standards workspace exists

2. For Each Project You Migrate
   └─> Creates your project workspace
   └─> Creates sheets (Tasks, Resources, Summary)
   └─> Connects dropdown lists to Standards workspace
   └─> Loads your data with validation

3. As You Migrate More Projects
   └─> New values automatically added to reference sheets
   └─> Existing projects reference the updated values
```

## Data Validation

### When Extracting from Project Online
- Checks that required fields have values
- Validates that identifiers are in the correct format
- Confirms dates and times are valid
- Ensures no critical data is missing

### When Converting Your Data
- Validates converted values match expected formats
- Checks text doesn't exceed column limits (4000 characters max)
- Verifies parent tasks exist for child tasks
- Validates all references between tasks, projects, and resources
- Confirms numeric values are within acceptable ranges

### Before Creating in Smartsheet
- Ensures each sheet has a unique name in the workspace
- Checks column types are compatible
- Verifies task hierarchy is consistent
- Validates all predecessor (dependency) references
- Confirms all required columns exist
- Prevents duplicate identifiers

## Summary of Your Migration

**What Gets Migrated**: 4 main types of data (Projects, Tasks, Resources, Assignments)

**Fields Mapped**: 50+ individual pieces of information with detailed conversion rules

**Data Conversions**: 8 major types (Identifiers, Dates, Durations, Priority, Status, Contacts, Currency, Yes/No)

**Relationships Maintained**: 
- Your project-task connections
- Task parent-child relationships (hierarchy)
- Task dependencies (what must finish before what starts)
- Resource assignments (who's assigned to what)

**Result Structure**:
- 1 Workspace for each project
- 2-3 sheets per project (Tasks, Resources, and optional Summary)
- All sheets in workspace root (no folders)
- Assignments embedded in task list (no separate sheet)

**Key Patterns**:
1. One workspace per project
2. Names preserved (with minor cleaning)
3. Two identifiers (original + auto-number)
4. Contacts with names and emails together
5. Assignments embedded in tasks
6. Standards workspace for consistency
7. Safe to re-run if needed

---

<div align="center">

[← Previous: System Design](./ETL-System-Design.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Workspace Creation Strategies →](./Factory-Pattern-Design.md)

</div>