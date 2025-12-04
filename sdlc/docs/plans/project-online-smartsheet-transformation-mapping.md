# Project Online to Smartsheet - Transformation Mapping Specification

**Date**: 2024-12-03  
**Status**: Draft - Ready for Review  
**Related Document**: [Architecture Plan](./project-online-smartsheet-etl-architecture-plan.md)

---

## Overview

This document provides detailed mapping specifications for transforming Microsoft Project Online entities to Smartsheet structures. It includes object graph relationships, property-by-property mappings, data type conversions, and naming conventions.

### Purpose
- Define exact transformation rules for ETL implementation
- Document data type conversions and constraints
- Establish naming conventions for consistency
- Guide validation and quality checks

### Scope
This mapping covers the core Project Online entities:
1. **Projects** → Smartsheet Workspaces (one workspace per project)
2. **Tasks** → Smartsheet Project Sheet Rows (with Gantt, dependencies, embedded assignment columns)
3. **Resources** → Smartsheet Resource Sheet (source for assignment columns)
4. **Assignments** → Contact List columns in Tasks Sheet (sourced from Resources sheet)

---

## Project Online Object Model

### Entity Relationships

```
Project Online Object Graph
═══════════════════════════════════════

┌─────────────────────────────────────┐
│           Projects                  │
│  (Top-level container)              │
│  - Id (Guid)                        │
│  - Name                             │
│  - Start/Finish                     │
│  - Owner                            │
└─────────────┬───────────────────────┘
              │
              │ 1:N
              │
┌─────────────▼───────────────────────┐
│           Tasks                     │
│  (Work items)                       │
│  - Id (Guid)                        │
│  - Name                             │
│  - ProjectId (FK)                   │
│  - ParentTaskId (FK, self-ref)      │
│  - Start/Finish                     │
│  - Duration, Work                   │
│  - PercentComplete                  │
└─────────────┬───────────────────────┘
              │
              │ N:M (via Assignments)
              │
┌─────────────▼───────────────────────┐
│           Resources                 │
│  (People/Equipment)                 │
│  - Id (Guid)                        │
│  - Name                             │
│  - Email                            │
│  - ResourceType                     │
│  - MaxUnits                         │
└─────────────┬───────────────────────┘
              │
              │ N:M
              │
┌─────────────▼───────────────────────┐
│         Assignments                 │
│  (Task-Resource relationships)      │
│  - Id (Guid)                        │
│  - TaskId (FK)                      │
│  - ResourceId (FK)                  │
│  - Work, ActualWork                 │
│  - Start/Finish                     │
│  - PercentWorkComplete              │
└─────────────────────────────────────┘

Legend:
- FK = Foreign Key
- 1:N = One-to-Many relationship
- N:M = Many-to-Many relationship
```

### Key Entity Characteristics

#### Projects
- **Primary Key**: `Id` (Guid)
- **Natural Key**: `Name` (String)
- **Hierarchical**: No (top-level entities)
- **Relationships**: Has many Tasks, indirectly related to Resources via Tasks/Assignments

#### Tasks
- **Primary Key**: `Id` (Guid)
- **Foreign Keys**: `ProjectId` (to Projects), `ParentTaskId` (to Tasks, nullable)
- **Hierarchical**: Yes (parent-child via `ParentTaskId`)
- **Relationships**: Belongs to Project, optionally has parent Task, has many child Tasks, related to Resources via Assignments

#### Resources
- **Primary Key**: `Id` (Guid)
- **Natural Key**: `Email` or `Name`
- **Hierarchical**: No
- **Relationships**: Related to Tasks via Assignments

#### Assignments
- **Primary Key**: `Id` (Guid)
- **Foreign Keys**: `TaskId` (to Tasks), `ResourceId` (to Resources)
- **Hierarchical**: No (junction/relationship entity)
- **Relationships**: Belongs to Task and Resource

---

## Smartsheet Object Model

### Structure Hierarchy

```
Smartsheet Structure
═══════════════════════════════════════

┌─────────────────────────────────────┐
│         Workspace                   │
│  (Per-project container)            │
│  Name: "{ProjectName}"              │
│  (sanitized, no prefix)             │
└─────────────┬───────────────────────┘
              │
              │ 1:N (direct)
              │
┌─────────────▼───────────────────────┐
│          Sheets                     │
│  (In workspace root, NO folders)    │
│  - Tasks Sheet (project sheet type) │
│  - Resources Sheet (required)       │
│  - Project Summary (optional)       │
└─────────────┬───────────────────────┘
              │
              │ 1:N
              │
┌─────────────▼───────────────────────┐
│          Rows                       │
│  (Data records)                     │
│  - Each row = one entity            │
│  - Columns = properties             │
└─────────────┬───────────────────────┘
              │
              │ 1:N
              │
┌─────────────▼───────────────────────┐
│          Cells                      │
│  (Property values)                  │
│  - Column + Row = Cell              │
│  - Value + Type                     │
└─────────────────────────────────────┘
```

### Smartsheet Sheet Types

#### 1. Tasks Sheet (Primary)
**Purpose**: Main project schedule and task list with embedded assignments
**Row Hierarchy**: Supports parent-child relationships
**Columns**: Task properties + dynamic assignment columns (Contact List type)

#### 2. Resources Sheet (Required)
**Purpose**: Resource pool with all metadata - serves as source for assignment columns
**Row Hierarchy**: Flat (no hierarchy)
**Columns**: Resource properties (Name, Email, Type, Rates, Capacity, Department, etc.)

**Note**: NO separate Assignments Sheet. Assignments are represented as Contact List columns in the Tasks Sheet, with column options sourced from the Resources Sheet.

---

## Transformation Strategy

### Approach: Workspace-Based Mapping

```
Project Online Entity    →    Smartsheet Structure
══════════════════════════════════════════════════

Project                  →    Workspace (one per project)
                         →    Name matches Project Online exactly

Task (root)              →    Row in Tasks Sheet (level 0, project sheet)
  └─ Task (child)        →    Child Row (level 1, indented)
      └─ Task (grandchild) → Child Row (level 2, indented)

Resource                 →    Row in Resources Sheet
                         →    Contact object with name+email properties
                         →    Sources assignment column options

Assignment               →    Contact List column value in Tasks Sheet
                         →    Grouped by type/role
```

### Design Decisions

1. **Project → Workspace**: Each Project Online project becomes a Smartsheet workspace with matching name
2. **No Folders**: Sheets placed directly in workspace root
3. **Project Sheet Type**: Tasks sheet configured as project sheet (Gantt + dependencies enabled)
4. **Dual ID Pattern**: GUID preserved in locked "Project Online [Name]" column, plus readable ID in active column
5. **Contact Objects**: Name+Email pairs mapped to single Contact column with objectValue format
6. **Embedded Assignments**: Assignment relationships as Contact List columns sourced from Resources Sheet

---

## Entity Mapping Specifications

## 1. Project Mapping

### Project Online: Project Entity

**oData Endpoint**: `/_api/ProjectData/Projects`

**Entity Properties** (Selected Core Properties):

| Property Name | Data Type | Nullable | Description |
|--------------|-----------|----------|-------------|
| Id | Guid | No | Unique project identifier |
| Name | String(255) | No | Project name |
| Description | String | Yes | Project description |
| Owner | String | Yes | Project owner name |
| OwnerEmail | String | Yes | Project owner email |
| StartDate | DateTime | Yes | Project start date |
| FinishDate | DateTime | Yes | Project finish date |
| CreatedDate | DateTime | No | Project creation date |
| ModifiedDate | DateTime | No | Last modification date |
| ProjectStatus | String | Yes | Project status (e.g., "Active", "Completed") |
| ProjectType | String | Yes | Project type/template |
| Priority | Integer | Yes | Project priority (0-1000) |
| PercentComplete | Decimal | Yes | Overall completion percentage (0-100) |

### Smartsheet: Workspace + Project Summary Sheet

#### A. Workspace Mapping

**Smartsheet Object**: Workspace (dedicated per project)

| Smartsheet Property | Source | Transformation Rule | Example |
|-------------------|--------|---------------------|---------|
| `name` | `Project.Name` | Direct copy with sanitization only | "Website Redesign 2024" |

**Naming Convention**:
- **Pattern**: `{ProjectName}` (NO prefix)
- **Sanitization**: Remove/replace invalid characters only: `/\:*?"<>|` → `-`
- **Consolidation**: Replace multiple consecutive dashes with single dash
- **Trimming**: Remove leading/trailing spaces and dashes
- **Max Length**: 100 characters (Smartsheet workspace name limit)
- **Truncation**: If > 100 chars, truncate to 97 chars and append `"..."`

**Sanitization Implementation**:
```typescript
def sanitize_workspace_name(project_name: str) -> str:
    """
    Sanitize Project Online project name for Smartsheet workspace.
    Preserves original name as much as possible.
    """
    # Replace invalid characters with dash
    invalid_chars = r'[/\\:*?"<>|]'
    sanitized = re.sub(invalid_chars, '-', project_name)
    
    # Consolidate multiple dashes
    sanitized = re.sub(r'-+', '-', sanitized)
    
    # Trim leading/trailing spaces and dashes
    sanitized = sanitized.strip(' -')
    
    # Truncate if too long
    if len(sanitized) > 100:
        sanitized = sanitized[:97] + '...'
    
    return sanitized
```

**Example Transformations**:
```
"Website Redesign 2024"                    → "Website Redesign 2024"
"Q1/Q2 Planning & Execution"               → "Q1-Q2 Planning & Execution"
"Project: New Product Launch"              → "Project- New Product Launch"
"IT Infrastructure | Phase 1"              → "IT Infrastructure - Phase 1"
"Very Long Project Name That Exceeds The Character Limit For Workspaces By Being Too Verbose"
  → "Very Long Project Name That Exceeds The Character Limit For Workspaces By Being Too Verb..."
```

**Workspace Structure**:
- Each Project Online project → One dedicated Smartsheet workspace
- Workspace name matches Project Online project name (sanitized)
- Sheets placed directly in workspace root (NO folders)
- Consistent structure across all project migrations

#### B. Project Summary Sheet (Optional)

**Smartsheet Object**: Sheet (in project folder)

**Sheet Name**: `{ProjectName} - Summary`

**Sheet Structure**: Key-value pairs (Property | Value columns)

| Row | Column: Property | Column: Value | Source | Data Type |
|-----|-----------------|---------------|--------|-----------|
| 1 | Project Online Project ID | `{Guid}` | `Project.Id` | TEXT_NUMBER |
| 2 | Project Name | `{Name}` | `Project.Name` | TEXT_NUMBER |
| 3 | Description | `{Description}` | `Project.Description` | TEXT_NUMBER |
| 4 | Owner | `{Contact Object}` | `Project.Owner` + `Project.OwnerEmail` | CONTACT_LIST |
| 5 | Start Date | `{Date}` | `Project.StartDate` | DATE |
| 6 | Finish Date | `{Date}` | `Project.FinishDate` | DATE |
| 7 | Status | `{Status}` | `Project.ProjectStatus` | PICKLIST (sourced from PMO Standards/Project - Status) |
| 8 | Priority | `{Priority}` | `Project.Priority` | PICKLIST (sourced from PMO Standards/Project - Priority, 7 levels) |
| 9 | % Complete | `{Percentage}` | `Project.PercentComplete` | TEXT_NUMBER |
| 10 | Project Online Created Date | `{Date}` | `Project.CreatedDate` | DATE |
| 11 | Project Online Modified Date | `{Date}` | `Project.ModifiedDate` | DATE |
| 12 | Created Date | `{Date}` | System-generated | CREATED_DATE |
| 13 | Modified Date | `{Date}` | System-generated | MODIFIED_DATE |
| 14 | Created By | `{Contact}` | System-generated | CREATED_BY |
| 15 | Modified By | `{Contact}` | System-generated | MODIFIED_BY |

**Column Definitions**:

| Column Name | Column Type | Width | Options/Format |
|-------------|-------------|-------|----------------|
| Property | TEXT_NUMBER | 150px | Primary column |
| Value | ABSTRACT | 300px | Type varies by row |

---

## 2. Task Mapping

### Project Online: Task Entity

**oData Endpoint**: `/_api/ProjectData/Tasks`

**Entity Properties** (Core Properties):

| Property Name | Data Type | Nullable | Description |
|--------------|-----------|----------|-------------|
| Id | Guid | No | Unique task identifier |
| ProjectId | Guid | No | Parent project ID (FK) |
| TaskName | String(255) | No | Task name |
| ParentTaskId | Guid | Yes | Parent task ID (FK, self-reference) |
| TaskIndex | Integer | No | Task order in project |
| OutlineLevel | Integer | No | Task hierarchy level (0=root) |
| Start | DateTime | Yes | Task start date/time |
| Finish | DateTime | Yes | Task finish date/time |
| Duration | Duration | Yes | Task duration (e.g., "PT40H" = 40 hours) |
| Work | Duration | Yes | Total work (e.g., "PT80H" = 80 hours) |
| ActualWork | Duration | Yes | Actual work completed |
| PercentComplete | Integer | Yes | Task completion (0-100) |
| TaskType | String | Yes | Task type (Fixed Duration, Fixed Work, Fixed Units) |
| Priority | Integer | Yes | Task priority (0-1000, default 500) |
| IsMilestone | Boolean | No | Is this task a milestone? |
| IsActive | Boolean | No | Is task active? |
| TaskNotes | String | Yes | Task notes/description |
| Predecessors | String | Yes | Predecessor task IDs |
| ConstraintType | String | Yes | Constraint type (ASAP, ALAP, MSO, etc.) |
| ConstraintDate | DateTime | Yes | Constraint date |
| Deadline | DateTime | Yes | Task deadline |
| ResourceNames | String | Yes | Comma-separated resource names |

### Smartsheet: Tasks Sheet Row

**Smartsheet Object**: Row (in Tasks Sheet - Project Sheet Type)

**Sheet Name**: `{ProjectName} - Tasks`

**Sheet Type**: Project Sheet (Gantt enabled, dependencies enabled)

**Project Sheet Configuration**:
```typescript
project_settings = {
    "ganttEnabled": True,
    "dependenciesEnabled": True,
    "resourceManagementEnabled": False,
    "durationColumnName": "Duration",
    "startDateColumnName": "Start Date",
    "endDateColumnName": "End Date",
    "predecessorColumnName": "Predecessors",
    "displayColumnName": "Task Name"
}
```

#### Column Mapping Table

| Smartsheet Column | Type | Width | Source | Transformation Rule | Format/Options | Example |
|------------------|------|-------|--------|---------------------|----------------|---------|
| **Task Name** | TEXT_NUMBER | 300px | `Task.TaskName` | Direct copy | Primary column, Hierarchy enabled | "Design Homepage" |
| **Task ID** | AUTO_NUMBER | 80px | Auto-generated | Format: `{PREFIX}-#####` | Locked column, prefix from project name | "WEB-00001" |
| **Project Online Task ID** | TEXT_NUMBER | 150px | `Task.Id` | Convert Guid to string | Hidden, Locked column | "a1b2c3d4-e5f6-..." |
| **Start Date** | DATE | 120px | `Task.Start` | Convert DateTime to Date | System column for project sheet | "2024-03-15" |
| **End Date** | DATE | 120px | `Task.Finish` | Convert DateTime to Date | System column for project sheet | "2024-03-22" |
| **Duration** | DURATION | 80px | `Task.Duration` | Convert ISO8601 to decimal days | System column, decimal number (not string) | 5.0 |
| **% Complete** | TEXT_NUMBER | 100px | `Task.PercentComplete` | Direct copy (0-100) | Format: `0%` | "45%" |
| **Status** | PICKLIST | 120px | Calculated | Derive from % Complete | Sourced from PMO Standards/Task - Status, Options: Not Started, In Progress, Complete | "In Progress" |
| **Priority** | PICKLIST | 120px | `Task.Priority` | Map priority value to label | Sourced from PMO Standards/Task - Priority, Options: Lowest, Very Low, Lower, Medium, Higher, Very High, Highest | "Very High" |
| **Work (hrs)** | TEXT_NUMBER | 100px | `Task.Work` | Convert ISO8601 duration to hours | Unit: hours | "40h" |
| **Actual Work (hrs)** | TEXT_NUMBER | 100px | `Task.ActualWork` | Convert ISO8601 duration to hours | Unit: hours | "32h" |
| **Milestone** | CHECKBOX | 80px | `Task.IsMilestone` | Direct boolean | Checkbox | ☑ |
| **Notes** | TEXT_NUMBER | 250px | `Task.TaskNotes` | Direct copy | Multi-line text | "Review with team" |
| **Predecessors** | PREDECESSOR | 150px | `Task.Predecessors` | Parse and map task relationships | System column, Format: `{row}FS+2d` | "5FS" |
| **Constraint Type** | PICKLIST | 120px | `Task.ConstraintType` | Map constraint code to label | Sourced from PMO Standards/Task - Constraint Type, Options: ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO | "ASAP" |
| **Constraint Date** | DATE | 120px | `Task.ConstraintDate` | Convert DateTime to Date | Date format: `yyyy-MM-dd` | "2024-03-20" |
| **Deadline** | DATE | 120px | `Task.Deadline` | Convert DateTime to Date | Date format: `yyyy-MM-dd` | "2024-04-01" |
| **Project Online Created Date** | DATE | 120px | `Task.CreatedDate` | Convert DateTime to Date | User-settable, preserves original PO date | "2024-03-01" |
| **Project Online Modified Date** | DATE | 120px | `Task.ModifiedDate` | Convert DateTime to Date | User-settable, preserves original PO date | "2024-03-15" |
| **Created Date** | CREATED_DATE | 120px | System-generated | Auto-populated by Smartsheet | System column, cannot be user-set | "2024-12-03" |
| **Modified Date** | MODIFIED_DATE | 120px | System-generated | Auto-populated by Smartsheet | System column, cannot be user-set | "2024-12-04" |
| **Created By** | CREATED_BY | 150px | System-generated | Auto-populated by Smartsheet | System column, contact of creator | User contact |
| **Modified By** | MODIFIED_BY | 150px | System-generated | Auto-populated by Smartsheet | System column, contact of last editor | User contact |

**Note**: Assignment columns (Contact List type) are added dynamically based on resource types/roles. See Section 4 for details.

#### Data Type Conversions

##### Duration (ISO 8601 → Smartsheet)

**Project Online Format**: ISO 8601 Duration (e.g., `PT40H` = 40 hours)

**Smartsheet Project Sheet Duration**: Decimal days (e.g., `5` = 5 days)

**Conversion Rules**:
```typescript
# ISO 8601 Duration examples:
# PT40H = 40 hours
# P5D = 5 days
# PT480M = 480 minutes = 8 hours

def convert_duration_to_decimal_days(iso_duration: str) -> float:
    """
    Convert ISO 8601 duration to decimal days for Smartsheet project sheets.
    Project sheets require numeric duration (days), not string format.
    """
    # Parse ISO 8601 to get total hours
    hours = parse_hours_from_iso(iso_duration)
    
    # Convert to days (assume 8-hour workday)
    days = hours / 8
    
    # Return as decimal number (not string)
    return round(days, 2)

def convert_duration_to_hours_string(iso_duration: str) -> str:
    """Convert ISO 8601 duration to hours string for non-project sheets."""
    hours = parse_hours_from_iso(iso_duration)
    return f"{hours}h"
```

**Examples (Project Sheet Duration Column)**:
- `PT40H` → `5.0` (40 hours / 8 = 5 days, decimal)
- `P5D` → `5.0` (5 days direct, decimal)
- `PT480M` → `1.0` (480 minutes = 8 hours = 1 day, decimal)
- `PT36H` → `4.5` (36 hours / 8 = 4.5 days, decimal)

**Examples (Work/Actual Work Columns - Non-System)**:
- `PT40H` → `"40h"` (string format with unit)
- `PT80H` → `"80h"` (string format with unit)

##### DateTime (Project Online → Smartsheet)

**Project Online Format**: ISO 8601 DateTime with timezone (e.g., `2024-03-15T09:00:00Z`)

**Conversion Rules**:
```typescript
def convert_datetime_to_date(iso_datetime: str) -> str:
    """Convert ISO 8601 datetime to Smartsheet date."""
    # Parse datetime
    dt = datetime.fromisoformat(iso_datetime.replace('Z', '+00:00'))
    # Convert to local timezone (or keep UTC)
    # Format as Smartsheet date
    return dt.strftime('%Y-%m-%d')
```

**Examples**:
- `2024-03-15T09:00:00Z` → `"2024-03-15"`
- `2024-12-31T23:59:59-08:00` → `"2024-12-31"`

##### Priority (Integer → Picklist)

**Project Online Values**: Integer 0-1000 with 7 fixed levels (default: 500)

**Project Online Priority Levels**:
- `0` = Lowest
- `200` = Very Low
- `400` = Lower
- `500` = Medium (default)
- `600` = Higher
- `800` = Very High
- `1000` = Highest

**Smartsheet Values**: Picklist with matching labels

**Mapping Rules**:
```typescript
def map_priority(priority_value: int) -> str:
    """
    Map Project Online priority to Smartsheet picklist.
    Project Online uses fixed priority levels: 0, 200, 400, 500, 600, 800, 1000.
    This mapping preserves all 7 levels for maximum fidelity.
    
    Args:
        priority_value: Integer priority value (0-1000)
        
    Returns:
        Priority label matching Project Online's fixed levels
    """
    # Map to exact Project Online priority levels
    if priority_value >= 1000:
        return "Highest"
    elif priority_value >= 800:
        return "Very High"
    elif priority_value >= 600:
        return "Higher"
    elif priority_value >= 500:
        return "Medium"
    elif priority_value >= 400:
        return "Lower"
    elif priority_value >= 200:
        return "Very Low"
    else:
        return "Lowest"
```

**Picklist Options** (7 levels matching Project Online):
- `"Highest"` - Priority >= 1000
- `"Very High"` - Priority 800-999
- `"Higher"` - Priority 600-799
- `"Medium"` - Priority 500-599 (default)
- `"Lower"` - Priority 400-499
- `"Very Low"` - Priority 200-399
- `"Lowest"` - Priority 0-199

**Mapping Examples**:
- `0` → `"Lowest"`
- `200` → `"Very Low"`
- `400` → `"Lower"`
- `500` → `"Medium"` (default)
- `600` → `"Higher"`
- `800` → `"Very High"`
- `1000` → `"Highest"`

**Note**: This 7-level mapping maintains full fidelity with Project Online's priority system. If a simplified view is desired for users, the Smartsheet picklist can be consolidated post-migration (e.g., merge "Highest" and "Very High" into "Critical"), but the initial transformation preserves all granularity.

##### Status (Calculated → Picklist)

**Derivation Logic**:
```typescript
def derive_status(percent_complete: int) -> str:
    """Derive task status from completion percentage."""
    if percent_complete == 0:
        return "Not Started"
    elif percent_complete == 100:
        return "Complete"
    else:
        return "In Progress"
```

**Picklist Options**:
- `"Not Started"` - % Complete = 0
- `"In Progress"` - % Complete 1-99
- `"Complete"` - % Complete = 100

##### Auto-Number ID Prefix Generation

**Purpose**: Generate readable, project-specific prefixes for auto-number ID columns

**Project Online Source**: Project name
**Smartsheet Target**: Auto-number column format with project-derived prefix

**Transformation Strategy**:
```typescript
def generate_project_prefix(project_name: str) -> str:
    """
    Generate 3-4 letter prefix from project name for auto-number IDs.
    
    Algorithm:
    1. Split project name into words
    2. If single word: take first 3-4 letters (uppercase)
    3. If multiple words: take first letter of each word (up to 4 letters)
    4. Ensure minimum 3 letters, maximum 4 letters
    5. Uppercase all letters
    
    Args:
        project_name: The Project Online project name
        
    Returns:
        3-4 letter uppercase prefix
    """
    # Remove special characters and extra spaces
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', ' ', project_name)
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    # Split into words
    words = clean_name.split()
    
    if not words:
        return "PRJ"  # Default fallback
    
    if len(words) == 1:
        # Single word: take first 3-4 letters
        word = words[0].upper()
        if len(word) >= 4:
            return word[:4]
        elif len(word) >= 3:
            return word[:3]
        else:
            # Word too short, pad with 'X'
            return (word + "XXX")[:3]
    else:
        # Multiple words: take first letter of each (up to 4 words)
        prefix = ''.join(word[0].upper() for word in words[:4] if word)
        
        # Ensure minimum 3 letters
        if len(prefix) < 3:
            # Add letters from first word to meet minimum
            first_word = words[0].upper()
            prefix = (prefix + first_word)[:3]
        
        return prefix[:4]  # Maximum 4 letters

# Examples:
# generate_project_prefix("Website Redesign")       → "WR"   (needs 3rd letter)
# generate_project_prefix("Website Redesign 2024")  → "WR2"  (first letters)
# generate_project_prefix("Q1 Planning")            → "Q1P"  (first letters)
# generate_project_prefix("Infrastructure")         → "INFR" (first 4 letters)
# generate_project_prefix("IT")                     → "ITX"  (padded)
# generate_project_prefix("IT Infrastructure Upgrade") → "IIIU" (first 4 words)
```

**Revised Algorithm (More Intuitive)**:
```typescript
def generate_project_prefix(project_name: str) -> str:
    """
    Generate 3-4 letter acronym from project name.
    Prioritizes word initials over single-word abbreviation.
    """
    # Clean and split
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', ' ', project_name)
    words = [w for w in clean_name.split() if w]
    
    if not words:
        return "PRJ"
    
    # Collect first letters from all words
    initials = ''.join(w[0].upper() for w in words)
    
    if len(initials) >= 3:
        # Have enough initials, use first 3-4
        return initials[:4]
    
    # Not enough initials, supplement from first word
    first_word = words[0].upper()
    
    if len(initials) == 2:
        # 2 initials, add 1-2 more letters from first word
        return (initials + first_word[1:])[:4]
    elif len(initials) == 1:
        # 1 initial, add 2-3 more letters from first word
        return (initials + first_word[1:])[:4]
    else:
        # No initials (shouldn't happen), use first word
        return first_word[:4]
```

**Examples**:
```
"Website Redesign"              → "WR" + "E" → "WRE" (need 3rd)
"Website Redesign 2024"         → "WR2" (first 3 initials)
"Q1 Planning"                   → "QP" + "1" → "QP1" (supplement from "Q1")
"Infrastructure"                → "I" + "NFR" → "INFR" (single word)
"IT"                            → "I" + "T" → "IT" + "X" → "ITX" (padded)
"ACME Corp Redesign"            → "ACR" (first 3 initials)
"Web App Dev Q1"                → "WADQ" (first 4 initials)
```

**Special Cases**:
- **Project ID Column**: Use `"Project"` as prefix (not project name)
  - Format: `Project-#####`
  - Example: `Project-00001`, `Project-00042`
- **Empty/Invalid Names**: Use `"PRJ"` as default prefix
- **Numeric-Only Names**: Extract letters where possible, else use `"PRJ"`

**Column Configuration**:
```typescript
def create_autonumber_column(entity_type: str, project_name: str) -> dict:
    """Create auto-number column configuration."""
    if entity_type == "Project":
        prefix = "Project"
    else:
        prefix = generate_project_prefix(project_name)
    
    return {
        "type": "AUTO_NUMBER",
        "format": f"{prefix}-#####",
        "startingNumber": 1,
        "locked": True
    }
```

##### Contact Objects (Name + Email → Contact)

**Project Online Source**: Separate Name and Email fields (e.g., `Owner` + `OwnerEmail`, `ResourceName` + `Email`)

**Smartsheet Target**: Single CONTACT_LIST column with objectValue containing name and email properties

**Transformation Strategy**:
```typescript
def create_contact_object(name: str, email: str) -> dict:
    """
    Create Smartsheet contact object from name and email.
    
    Args:
        name: Contact name
        email: Contact email address
        
    Returns:
        Contact object suitable for cell.objectValue
    """
    if not email and not name:
        return None
    
    contact = {}
    if email:
        contact['email'] = email
    if name:
        contact['name'] = name
    
    return contact

def set_contact_cell_value(cell: dict, name: str, email: str):
    """
    Set cell value for a CONTACT_LIST column.
    Handles single contact (not multi-contact).
    """
    contact = create_contact_object(name, email)
    if contact:
        cell['objectValue'] = contact
    return cell

def set_multi_contact_cell_value(cell: dict, contacts: list):
    """
    Set cell value for a MULTI_CONTACT_LIST column.
    
    Args:
        cell: Cell dict to populate
        contacts: List of (name, email) tuples
    """
    if not contacts:
        return cell
    
    contact_objects = []
    for name, email in contacts:
        contact = create_contact_object(name, email)
        if contact:
            contact_objects.append(contact)
    
    if contact_objects:
        cell['objectValue'] = {
            'objectType': 'MULTI_CONTACT',
            'values': contact_objects
        }
    
    return cell
```

**Examples**:

Single Contact:
```typescript
# Project Owner
cell = {
    'columnId': 123,
    'objectValue': {
        'email': 'john.doe@example.com',
        'name': 'John Doe'
    }
}
```

Multi-Contact:
```typescript
# Task assignments
cell = {
    'columnId': 456,
    'objectValue': {
        'objectType': 'MULTI_CONTACT',
        'values': [
            {'email': 'john@example.com', 'name': 'John Doe'},
            {'email': 'jane@example.com', 'name': 'Jane Smith'}
        ]
    }
}
```

##### Assignments → Assignment Column Values

**Project Online Source**: Assignment entities linking Tasks to Resources

**Transformation Strategy**:
```typescript
def create_assignment_columns_for_task(task_id: str, assignments: list, resources: dict) -> dict:
    """
    Map assignments to dynamic Contact List columns grouped by type.
    Returns dict of column_name -> list of (name, email) tuples.
    """
    task_assignments = [a for a in assignments if a['TaskId'] == task_id]
    
    # Group assignments by resource type or role
    assignment_columns = {}
    
    for assignment in task_assignments:
        resource = resources.get(assignment['ResourceId'])
        if not resource:
            continue
        
        # Get name and email
        name = resource.get('Name')
        email = resource.get('Email')
        if not name and not email:
            continue
        
        # Determine column name based on resource type or custom role
        type_mapping = {
            'Work': 'Team Member',
            'Material': 'Equipment',
            'Cost': 'Cost Center'
        }
        column_name = type_mapping.get(resource.get('ResourceType'), 'Team Member')
        
        if column_name not in assignment_columns:
            assignment_columns[column_name] = []
        
        assignment_columns[column_name].append((name, email))
    
    return assignment_columns

# Example result for a task:
# {
#   'Team Member': [('John Doe', 'john@example.com'), ('Jane Smith', 'jane@example.com')],
#   'Equipment': [('Crane A', 'crane@equipment.com')],
#   'Cost Center': [('Engineering Dept', 'dept-123@finance.com')]
# }
```

**Column Creation Process**:
1. **Analysis Phase**: Scan all assignments to identify unique assignment types/roles
2. **Column Definition**: Create MULTI_CONTACT_LIST column for each unique type in Tasks Sheet
3. **Column Configuration**: Set each column to source options from Resources Sheet
4. **Value Population**: For each task, populate appropriate column(s) with contact objects (name + email)

**Cell Population Example**:
```typescript
def populate_task_assignment_columns(row: dict, task_id: str, assignments: list, resources: dict, column_map: dict):
    """Populate assignment columns for a task row."""
    assignment_data = create_assignment_columns_for_task(task_id, assignments, resources)
    
    for column_name, contacts in assignment_data.items():
        if column_name in column_map:
            column_id = column_map[column_name]
            cell = {'columnId': column_id}
            set_multi_contact_cell_value(cell, contacts)
            row['cells'].append(cell)
```

**Examples**:
- Task with 2 developers → "Team Member" column: Contact objects for John Doe and Jane Smith
- Task with PM + equipment → "Project Manager": PM contact object, "Equipment": Equipment contact object
- Task with no assignments → All assignment columns empty for that task row

##### Predecessors (String → Predecessor Column)

**Project Online Format**: Not directly available (requires task relationship traversal)

**Smartsheet Format**: Row number + dependency type + lag

**Conversion Rules**:
```typescript
def convert_predecessors(task_id: str, task_index_map: dict, relationships: list) -> str:
    """Convert task relationships to Smartsheet predecessor format."""
    # Find predecessor relationships for this task
    predecessor_tasks = [r for r in relationships if r['successor_id'] == task_id]
    
    predecessor_strings = []
    for pred in predecessor_tasks:
        # Get row number of predecessor task
        pred_row = task_index_map.get(pred['predecessor_id'])
        # Get relationship type (FS, SS, FF, SF)
        rel_type = pred.get('type', 'FS')
        # Get lag (e.g., +2d, -1d)
        lag = pred.get('lag', '')
        
        # Format: {row}{type}{lag}
        pred_str = f"{pred_row}{rel_type}"
        if lag:
            pred_str += lag
        
        predecessor_strings.append(pred_str)
    
    return ', '.join(predecessor_strings)
```

**Relationship Types**:
- `FS` - Finish-to-Start (default)
- `SS` - Start-to-Start
- `FF` - Finish-to-Finish
- `SF` - Start-to-Finish

**Examples**:
- `"5FS"` - Task 5 must finish before this task starts
- `"3SS+2d"` - Task 3 starts 2 days before this task starts
- `"7FF-1d"` - Task 7 finishes 1 day before this task finishes
- `"5FS, 8SS"` - Multiple predecessors

##### Constraint Type (Code → Label)

**Project Online Values**: Constraint type codes

**Smartsheet Values**: Picklist labels (same codes)

**Mapping**:
```typescript
CONSTRAINT_TYPES = {
    'ASAP': 'As Soon As Possible',
    'ALAP': 'As Late As Possible',
    'SNET': 'Start No Earlier Than',
    'SNLT': 'Start No Later Than',
    'FNET': 'Finish No Earlier Than',
    'FNLT': 'Finish No Later Than',
    'MSO': 'Must Start On',
    'MFO': 'Must Finish On'
}
```

**Picklist Options**: All constraint type codes above

#### Hierarchy Handling

**Project Online Hierarchy**: `OutlineLevel` property (0 = root, 1 = child, 2 = grandchild, etc.)

**Smartsheet Hierarchy**: Parent-child relationships via row indentation

**Conversion Strategy**:
1. Sort tasks by `TaskIndex` (maintains original order)
2. Track `OutlineLevel` for each task
3. When `OutlineLevel` increases, indent next row (child)
4. When `OutlineLevel` decreases, outdent (sibling or parent sibling)
5. Track parent row ID for each child

**Example**:
```
Project Online Tasks:
- Task 1 (OutlineLevel=0, TaskIndex=1)
- Task 1.1 (OutlineLevel=1, TaskIndex=2)
- Task 1.1.1 (OutlineLevel=2, TaskIndex=3)
- Task 1.2 (OutlineLevel=1, TaskIndex=4)
- Task 2 (OutlineLevel=0, TaskIndex=5)

Smartsheet Rows:
Row 1: Task 1 (level 0)
  Row 2: Task 1.1 (level 1, parent: Row 1)
    Row 3: Task 1.1.1 (level 2, parent: Row 2)
  Row 4: Task 1.2 (level 1, parent: Row 1)
Row 5: Task 2 (level 0)
```

---

## 3. Resource Mapping

### Project Online: Resource Entity

**oData Endpoint**: `/_api/ProjectData/Resources`

**Entity Properties** (Core Properties):

| Property Name | Data Type | Nullable | Description |
|--------------|-----------|----------|-------------|
| Id | Guid | No | Unique resource identifier |
| Name | String(255) | No | Resource name |
| Email | String | Yes | Resource email address |
| ResourceType | String | Yes | Resource type (Work, Material, Cost) |
| MaxUnits | Decimal | Yes | Maximum units (1.0 = 100%) |
| StandardRate | Decimal | Yes | Standard hourly rate |
| OvertimeRate | Decimal | Yes | Overtime hourly rate |
| CostPerUse | Decimal | Yes | Cost per use |
| BaseCalendar | String | Yes | Base calendar name |
| IsActive | Boolean | No | Is resource active? |
| IsGeneric | Boolean | No | Is generic/placeholder? |
| Department | String | Yes | Department/team |
| Code | String | Yes | Resource code |

### Smartsheet: Resources Sheet Row

**Smartsheet Object**: Row (in Resources Sheet)

**Sheet Name**: `{ProjectName} - Resources` or `Resources` (shared across projects)

**Sheet Type**: Sheet (no hierarchy)

#### Column Mapping Table

| Smartsheet Column | Type | Width | Source | Transformation Rule | Format/Options | Example |
|------------------|------|-------|--------|---------------------|----------------|---------|
| **Resource ID** | AUTO_NUMBER | 80px | Auto-generated | Format: `{PREFIX}-#####` | Locked column, prefix from project name | "WEB-00042" |
| **Project Online Resource ID** | TEXT_NUMBER | 150px | `Resource.Id` | Convert Guid to string | Hidden, Locked column | "a1b2c3d4-e5f6-..." |
| **Contact** | CONTACT_LIST | 200px | `Resource.Name` + `Resource.Email` | Create contact object | Primary column, objectValue format | John Doe (john@example.com) |
| **Resource Type** | PICKLIST | 120px | `Resource.ResourceType` | Direct copy | Sourced from PMO Standards/Resource - Type, Options: Work, Material, Cost | "Work" |
| **Max Units** | TEXT_NUMBER | 100px | `Resource.MaxUnits` | Convert decimal to percentage | Format: `0%` | "100%" |
| **Standard Rate** | TEXT_NUMBER | 120px | `Resource.StandardRate` | Direct copy as number | numberFormat: CURRENCY | 75.00 |
| **Overtime Rate** | TEXT_NUMBER | 120px | `Resource.OvertimeRate` | Direct copy as number | numberFormat: CURRENCY | 112.50 |
| **Cost Per Use** | TEXT_NUMBER | 120px | `Resource.CostPerUse` | Direct copy as number | numberFormat: CURRENCY | 50.00 |
| **Department** | PICKLIST | 150px | `Resource.Department` | Direct copy | Sourced from PMO Standards/Resource - Department (discovered values) | "Engineering" |
| **Code** | TEXT_NUMBER | 100px | `Resource.Code` | Direct copy | Text | "ENG-001" |
| **Is Active** | CHECKBOX | 80px | `Resource.IsActive` | Direct boolean | Checkbox column | ☑ |
| **Is Generic** | CHECKBOX | 80px | `Resource.IsGeneric` | Direct boolean | Checkbox column | ☐ |
| **Project Online Created Date** | DATE | 120px | `Resource.CreatedDate` | Convert DateTime to Date | User-settable, preserves original PO date | "2024-03-01" |
| **Project Online Modified Date** | DATE | 120px | `Resource.ModifiedDate` | Convert DateTime to Date | User-settable, preserves original PO date | "2024-03-15" |
| **Created Date** | CREATED_DATE | 120px | System-generated | Auto-populated by Smartsheet | System column, cannot be user-set | "2024-12-03" |
| **Modified Date** | MODIFIED_DATE | 120px | System-generated | Auto-populated by Smartsheet | System column, cannot be user-set | "2024-12-04" |
| **Created By** | CREATED_BY | 150px | System-generated | Auto-populated by Smartsheet | System column, contact of creator | User contact |
| **Modified By** | MODIFIED_BY | 150px | System-generated | Auto-populated by Smartsheet | System column, contact of last editor | User contact |

#### Data Type Conversions

##### Max Units (Decimal → Percentage)

**Project Online Format**: Decimal (e.g., `1.0` = 100%, `0.5` = 50%)

**Conversion Rules**:
```typescript
def convert_max_units(max_units: float) -> str:
    """Convert max units to percentage string."""
    percentage = int(max_units * 100)
    return f"{percentage}%"
```

**Examples**:
- `1.0` → `"100%"`
- `0.5` → `"50%"`
- `1.5` → `"150%"` (overallocated)

##### Rates and Costs (Decimal → Currency Format)

**Project Online Format**: Decimal (e.g., `75.00`)

**Smartsheet Approach**: Use TEXT_NUMBER column with CURRENCY numberFormat instead of string manipulation

**Column Configuration**:
```typescript
def create_currency_column(column_name: str) -> dict:
    """Create TEXT_NUMBER column with currency formatting."""
    return {
        'title': column_name,
        'type': 'TEXT_NUMBER',
        'format': 'CURRENCY',  # or numberFormat for API
        'symbol': '$',  # Currency symbol (locale-specific)
        'decimalCount': 2
    }
```

**Value Handling**:
```typescript
def set_currency_cell_value(cell: dict, value: float):
    """
    Set numeric value for currency-formatted column.
    Smartsheet applies formatting based on column configuration.
    """
    if value is not None:
        cell['value'] = float(value)  # Store as number, not string
    return cell
```

**Examples**:
- `75.0` → `75.0` (stored as number, displayed as "$75.00" by Smartsheet)
- `112.5` → `112.5` (stored as number, displayed as "$112.50" by Smartsheet)

**Key Principle**: Store rates/costs as numeric values and let Smartsheet's column formatting handle currency display. Do NOT convert to currency strings like `"$75.00"`.

##### Resource Type (String → Picklist)

**Project Online Values**: `"Work"`, `"Material"`, `"Cost"`

**Smartsheet Values**: Same options in picklist

**Picklist Options**:
- `"Work"` - Human resources
- `"Material"` - Material resources
- `"Cost"` - Cost resources

##### Boolean Fields (Boolean → Checkbox)

**Project Online Fields**: `IsActive` (boolean), `IsGeneric` (boolean)

**Smartsheet Approach**: Use CHECKBOX column type for direct boolean representation

**Column Configuration**:
```typescript
def create_checkbox_column(column_name: str) -> dict:
    """Create CHECKBOX column for boolean field."""
    return {
        'title': column_name,
        'type': 'CHECKBOX'
    }
```

**Value Handling**:
```typescript
def set_checkbox_cell_value(cell: dict, value: bool):
    """Set boolean value for checkbox column."""
    if value is not None:
        cell['value'] = bool(value)
    return cell
```

**Examples**:
- `IsActive = true` → `☑` (checked)
- `IsActive = false` → `☐` (unchecked)
- `IsGeneric = true` → `☑` (checked)
- `IsGeneric = false` → `☐` (unchecked)

**Key Principle**: Use native CHECKBOX columns for boolean values instead of converting to text picklists. This preserves data type and enables proper filtering/formulas.

---

## 4. Assignment Mapping (Embedded in Tasks Sheet)

### Project Online: Assignment Entity

**oData Endpoint**: `/_api/ProjectData/Assignments`

**Entity Properties** (Core Properties):

| Property Name | Data Type | Nullable | Description |
|--------------|-----------|----------|-------------|
| Id | Guid | No | Unique assignment identifier |
| TaskId | Guid | No | Task ID (FK) |
| ResourceId | Guid | No | Resource ID (FK) |
| ProjectId | Guid | No | Project ID (FK) |
| Start | DateTime | Yes | Assignment start |
| Finish | DateTime | Yes | Assignment finish |
| Work | Duration | Yes | Planned work |
| ActualWork | Duration | Yes | Actual work completed |
| RemainingWork | Duration | Yes | Remaining work |
| PercentWorkComplete | Integer | Yes | Work completion (0-100) |
| Units | Decimal | Yes | Assignment units (1.0 = 100%) |
| Cost | Decimal | Yes | Assignment cost |
| ActualCost | Decimal | Yes | Actual cost |
| RemainingCost | Decimal | Yes | Remaining cost |
| AssignmentNotes | String | Yes | Assignment notes |

### Smartsheet: Dynamic Contact List Columns in Tasks Sheet

**NO Separate Assignments Sheet** - Assignments are represented as Contact List columns embedded in the Tasks Sheet.

#### Assignment Column Strategy

**Approach**: Create dynamic columns in Tasks Sheet based on assignment types found in the project data, using appropriate column types based on whether resources are people or non-people.

**Critical Column Type Distinction**:
- **People Resources (Work type)** → MULTI_CONTACT_LIST columns (name + email contact objects)
- **Non-People Resources (Material/Cost types)** → MULTI_PICKLIST columns (text values only)

**Column Creation Steps**:
1. **Analysis**: Scan all Assignment entities to identify unique assignment categories/types
2. **Categorization**: Group by resource type based on people vs. non-people:
   - **Work Resources** (people/human resources) → MULTI_CONTACT_LIST columns
   - **Material Resources** (equipment, machines) → MULTI_PICKLIST columns
   - **Cost Resources** (cost centers, budgets) → MULTI_PICKLIST columns
3. **Column Generation**: Create appropriate column type per category in Tasks Sheet
4. **Source Configuration**:
   - Contact columns source from Resources Sheet (for Work/people resources only)
   - Picklist columns populated from resource names (for Material/Cost non-people resources)
5. **Population**: For each task, populate appropriate column(s) with assigned resources

**Example Assignment Columns**:

| Column Name | Type | Width | Source | Column Options Configuration |
|------------|------|-------|--------|------------------------------|
| **Team Members** | MULTI_CONTACT_LIST | 150px | Assignments (ResourceType='Work', people only) | Contact options from Resources Sheet |
| **Equipment** | MULTI_PICKLIST | 150px | Assignments (ResourceType='Material', non-people) | Picklist options from resource names |
| **Cost Centers** | MULTI_PICKLIST | 150px | Assignments (ResourceType='Cost', non-people) | Picklist options from resource names |

#### Smartsheet Column Options Configuration

**Contact Column Configuration (Work Resources)**:
```json
{
  "type": "MULTI_CONTACT_LIST",
  "contactOptions": [
    // Options populated from Resources Sheet
    // Each Work resource row becomes a selectable contact option
    {
      "email": "john@example.com",
      "name": "John Doe"
    },
    {
      "email": "jane@example.com",
      "name": "Jane Smith"
    }
    // ... more Work resources
  ],
  "validation": true
}
```

**Picklist Column Configuration (Material/Cost Resources)**:
```json
{
  "type": "MULTI_PICKLIST",
  "options": [
    // Options populated from resource names
    "Crane A",
    "Forklift B",
    "Engineering Dept",
    "Marketing Budget"
    // ... more Material/Cost resources
  ],
  "validation": true
}
```

**Key Configuration Properties**:
- **Work Resources (people)**: MULTI_CONTACT_LIST type with contact options from Resources Sheet
- **Material Resources (equipment, non-people)**: MULTI_PICKLIST type with options from resource names
- **Cost Resources (cost centers, non-people)**: MULTI_PICKLIST type with options from resource names
- **Validation**: true (enforces selection from predefined options)
- **Multi-Select**: Enabled (allows multiple assignments per column)

**Critical Distinction**: The column type is determined by whether the resource represents a person (Work type uses MULTI_CONTACT_LIST with email contact objects) or non-person entity like equipment or cost centers (Material/Cost types use MULTI_PICKLIST with text values only). This ensures proper data structure and Smartsheet functionality.

#### Transformation Logic

**Mapping Assignments to Columns**:
```typescript
def map_assignments_to_task_columns(task_id: str, assignments: list, resources: dict) -> dict:
    """
    Transform Project Online assignments into Smartsheet column values.
    
    CRITICAL: Column type distinction based on people vs. non-people resources:
    - Work resources (people) → MULTI_CONTACT_LIST (contact objects with email)
    - Material resources (equipment, non-people) → MULTI_PICKLIST (text values)
    - Cost resources (cost centers, non-people) → MULTI_PICKLIST (text values)
    
    Args:
        task_id: Task identifier
        assignments: All assignment entities
        resources: Resource lookup dict (id -> resource data)
    
    Returns:
        Dict mapping column names to dict with 'type' and 'values'
    """
    task_assignments = [a for a in assignments if a['TaskId'] == task_id]
    
    # Group assignments by resource type
    column_values = {}
    
    for assignment in task_assignments:
        resource = resources.get(assignment['ResourceId'])
        if not resource:
            continue
        
        resource_type = resource.get('ResourceType', 'Work')
        resource_name = resource.get('Name')
        resource_email = resource.get('Email')
        
        # Determine column name and type based on resource type
        # CRITICAL: Work = people = MULTI_CONTACT_LIST, Material/Cost = non-people = MULTI_PICKLIST
        if resource_type == 'Work':
            # Work resources are people - use MULTI_CONTACT_LIST with email
            column_name = 'Team Members'
            column_type = 'MULTI_CONTACT_LIST'
            value = {'email': resource_email, 'name': resource_name} if resource_email else None
        elif resource_type == 'Material':
            # Material resources are equipment/non-people - use MULTI_PICKLIST
            column_name = 'Equipment'
            column_type = 'MULTI_PICKLIST'
            value = resource_name if resource_name else None
        elif resource_type == 'Cost':
            # Cost resources are cost centers/non-people - use MULTI_PICKLIST
            column_name = 'Cost Centers'
            column_type = 'MULTI_PICKLIST'
            value = resource_name if resource_name else None
        else:
            continue
        
        if value is None:
            continue
        
        # Initialize column entry if not exists
        if column_name not in column_values:
            column_values[column_name] = {
                'type': column_type,
                'values': []
            }
        
        column_values[column_name]['values'].append(value)
    
    return column_values

# Example usage and result:
# task_columns = map_assignments_to_task_columns('task-123', all_assignments, resource_lookup)
# Result:
# {
#     'Team Members': {
#         'type': 'MULTI_CONTACT_LIST',
#         'values': [
#             {'email': 'john@example.com', 'name': 'John Doe'},
#             {'email': 'jane@example.com', 'name': 'Jane Smith'}
#         ]
#     },
#     'Equipment': {
#         'type': 'MULTI_PICKLIST',
#         'values': ['Crane A', 'Forklift B']
#     },
#     'Cost Centers': {
#         'type': 'MULTI_PICKLIST',
#         'values': ['Engineering Dept', 'Marketing Budget']
#     }
# }
```

**Populating Task Rows**:
```typescript
def populate_task_assignment_columns(task_row: dict, task_id: str, assignments: list, resources: dict):
    """
    Populate assignment columns for a task row.
    Handles both MULTI_CONTACT_LIST and MULTI_PICKLIST column types.
    """
    assignment_columns = map_assignments_to_task_columns(task_id, assignments, resources)
    
    # Add each column's values to the task row
    for column_name, column_data in assignment_columns.items():
        column_type = column_data['type']
        values = column_data['values']
        
        if column_type == 'MULTI_CONTACT_LIST':
            # Contact list format
            task_row[column_name] = {
                'objectValue': {
                    'objectType': 'MULTI_CONTACT',
                    'values': values  # Already in contact object format
                }
            }
        elif column_type == 'MULTI_PICKLIST':
            # Multi-picklist format
            task_row[column_name] = {
                'objectValue': {
                    'objectType': 'MULTI_PICKLIST',
                    'values': values  # List of string names
                }
            }
```

#### Advantages of Embedded Assignment Approach

1. **Simplified Structure**: Single Tasks Sheet instead of separate Assignments Sheet
2. **Better UX**: Assignments visible directly in task list
3. **Validated Data**: Column options sourced from Resources Sheet ensures data integrity
4. **Flexible Categorization**: Support for multiple assignment types/roles
5. **Native Smartsheet**: Leverages Smartsheet's Contact List column type properly
6. **Resource Integration**: Compatible with Smartsheet Resource Management features
7. **Reduced Complexity**: Fewer sheets to manage and maintain

#### Assignment Data Preservation

While assignments are embedded in Tasks Sheet for usability, the transformation maintains all critical assignment data:

**Preserved in Contact List Columns**:
- Resource assignments (who is assigned to each task)
- Assignment categorization (by type, role, or department)
- Multiple assignments per task (via multi-contact columns)

**Additional Assignment Metadata** (optional aggregate columns):

| Column Name | Type | Source | Transformation |
|------------|------|--------|----------------|
| **Total Allocation** | TEXT_NUMBER | Sum of Assignment.Units | Aggregated percentage (e.g., "200%") |
| **Total Work (hrs)** | TEXT_NUMBER | Sum of Assignment.Work | Aggregated hours (e.g., "80h") |
| **Assignment Notes** | TEXT_NUMBER | Concatenate Assignment.AssignmentNotes | Combined notes from all assignments |

**Detailed Assignment Tracking** (if needed):
- For detailed assignment-level tracking (work hours, costs, progress per resource), consider a separate reporting/analytics solution
- The embedded approach optimizes for task execution and assignment visibility, not granular assignment tracking

---

## 5. Custom Field Mapping

### Overview

Project Online supports extensive custom fields that organizations use to extend the standard schema. This section defines the strategy for discovering, mapping, and transforming custom fields from Project Online to Smartsheet.

### Custom Field Discovery Strategy

#### Phase 1: Schema Discovery
Before extracting entity data, discover all custom fields defined in the Project Online instance.

**oData Metadata Endpoint**: `/_api/ProjectData/$metadata`

**Discovery Process**:
```typescript
def discover_custom_fields(odata_client) -> dict:
    """
    Discover all custom fields from Project Online metadata.
    
    Returns:
        Dictionary mapping entity type to list of custom field definitions
        {
            'Projects': [...custom field objects...],
            'Tasks': [...custom field objects...],
            'Resources': [...custom field objects...],
            'Assignments': [...custom field objects...]
        }
    """
    # Fetch metadata XML
    metadata = odata_client.get('/_api/ProjectData/$metadata')
    
    # Parse custom fields for each entity type
    custom_fields = {
        'Projects': extract_custom_fields(metadata, 'Project'),
        'Tasks': extract_custom_fields(metadata, 'Task'),
        'Resources': extract_custom_fields(metadata, 'Resource'),
        'Assignments': extract_custom_fields(metadata, 'Assignment')
    }
    
    return custom_fields

def extract_custom_fields(metadata_xml, entity_type) -> list:
    """
    Extract custom field definitions from metadata XML.
    
    Custom fields typically have naming patterns like:
    - ProjectText1, ProjectText2, ... (text custom fields)
    - ProjectNumber1, ProjectNumber2, ... (number custom fields)
    - ProjectDate1, ProjectDate2, ... (date custom fields)
    - ProjectFlag1, ProjectFlag2, ... (boolean custom fields)
    
    Returns:
        List of custom field objects with type and metadata
    """
    custom_fields = []
    
    # Parse XML to find custom field properties
    for property in metadata_xml.find_all(f"{entity_type}Property"):
        field_name = property.get('Name')
        field_type = property.get('Type')
        
        # Identify custom fields by naming convention
        if is_custom_field(field_name):
            custom_fields.append({
                'name': field_name,
                'type': field_type,
                'entity': entity_type,
                'nullable': property.get('Nullable', 'true') == 'true'
            })
    
    return custom_fields

def is_custom_field(field_name: str) -> bool:
    """
    Determine if a field is a custom field based on naming patterns.
    
    Project Online custom field patterns:
    - ProjectText[1-30], TaskText[1-30], ResourceText[1-30]
    - ProjectNumber[1-20], TaskNumber[1-20], ResourceNumber[1-20]
    - ProjectDate[1-10], TaskDate[1-10], ResourceDate[1-10]
    - ProjectFlag[1-20], TaskFlag[1-20], ResourceFlag[1-20]
    - ProjectCost[1-10], TaskCost[1-10], ResourceCost[1-10]
    - ProjectDuration[1-10], TaskDuration[1-10]
    - Enterprise* fields (if configured)
    """
    patterns = [
        r'^(Project|Task|Resource|Assignment)(Text|Number|Date|Flag|Cost|Duration)\d+$',
        r'^Enterprise.*$'
    ]
    
    for pattern in patterns:
        if re.match(pattern, field_name):
            return True
    
    return False
```

#### Phase 2: Custom Field Value Discovery
For discovered custom fields, check which ones contain actual data (non-null values).

**Rationale**: Many organizations define 30 text fields but only use 5. Skip empty fields to reduce clutter.

```typescript
def discover_active_custom_fields(entities: list, custom_field_defs: list) -> list:
    """
    Identify which custom fields contain actual data across entities.
    
    Args:
        entities: List of entity objects (projects, tasks, resources, etc.)
        custom_field_defs: List of custom field definitions
        
    Returns:
        Filtered list of custom fields that have non-null values
    """
    active_fields = set()
    
    for entity in entities:
        for field_def in custom_field_defs:
            field_name = field_def['name']
            value = entity.get(field_name)
            
            # Consider field active if it has non-null value
            if value is not None and value != '':
                active_fields.add(field_name)
    
    # Return field definitions for active fields only
    return [f for f in custom_field_defs if f['name'] in active_fields]
```

#### Phase 3: Custom Field Naming Discovery
Retrieve human-readable names for custom fields from Project Online configuration.

**oData Endpoint**: `/_api/ProjectServer/CustomFields`

```typescript
def get_custom_field_names(odata_client) -> dict:
    """
    Fetch human-readable names for custom fields.
    
    Returns:
        Dictionary mapping internal field name to display name
        {
            'ProjectText1': 'Customer Name',
            'ProjectNumber1': 'Budget Amount',
            'TaskText1': 'Deliverable Type'
        }
    """
    custom_fields = odata_client.get('/_api/ProjectServer/CustomFields')
    
    name_mapping = {}
    for field in custom_fields:
        internal_name = field.get('InternalName')
        display_name = field.get('Name')
        
        if internal_name and display_name:
            name_mapping[internal_name] = display_name
    
    return name_mapping
```

### Custom Field Type Mapping

Map Project Online custom field types to Smartsheet column types.

#### Type Mapping Table

| Project Online Type | Example Field | Smartsheet Column Type | Transformation Rule |
|---------------------|---------------|------------------------|---------------------|
| **Text** | ProjectText1, TaskText1 | TEXT_NUMBER | Direct copy, max 4000 chars |
| **Number** | ProjectNumber1 | TEXT_NUMBER | Convert to string, preserve decimals |
| **Date** | ProjectDate1 | DATE | Convert DateTime to Date format |
| **Flag** | ProjectFlag1 | CHECKBOX | Boolean to checkbox |
| **Cost** | ProjectCost1 | TEXT_NUMBER | Format as currency string |
| **Duration** | ProjectDuration1 | TEXT_NUMBER | Convert ISO8601 to string with unit |
| **Picklist** | Custom dropdown | PICKLIST | Extract options, create picklist |
| **Multi-select** | Custom multi-value | MULTI_PICKLIST | Extract options, create multi-picklist |
| **Lookup** | Foreign key reference | TEXT_NUMBER | Convert to display text (not functional lookup) |
| **Formula** | Calculated field | TEXT_NUMBER | Store calculated value as static text |

#### Type Conversion Functions

```typescript
def map_custom_field_type(field_type: str, field_name: str) -> str:
    """
    Map Project Online custom field type to Smartsheet column type.
    
    Args:
        field_type: Project Online field type (from metadata)
        field_name: Field name (for pattern-based detection)
        
    Returns:
        Smartsheet column type constant
    """
    # Pattern-based type detection
    if 'Text' in field_name:
        return 'TEXT_NUMBER'
    elif 'Number' in field_name or 'Cost' in field_name:
        return 'TEXT_NUMBER'
    elif 'Date' in field_name:
        return 'DATE'
    elif 'Flag' in field_name:
        return 'CHECKBOX'
    elif 'Duration' in field_name:
        return 'TEXT_NUMBER'
    
    # Fallback type mapping from oData type
    type_mapping = {
        'Edm.String': 'TEXT_NUMBER',
        'Edm.Int32': 'TEXT_NUMBER',
        'Edm.Decimal': 'TEXT_NUMBER',
        'Edm.Double': 'TEXT_NUMBER',
        'Edm.DateTime': 'DATE',
        'Edm.Boolean': 'CHECKBOX',
        'Edm.Duration': 'TEXT_NUMBER'
    }
    
    return type_mapping.get(field_type, 'TEXT_NUMBER')

def convert_custom_field_value(value, field_type: str, field_name: str):
    """
    Convert custom field value to Smartsheet-compatible format.
    """
    if value is None or value == '':
        return None
    
    # Type-specific conversions
    if 'Date' in field_name:
        return convert_datetime_to_date(value)
    elif 'Cost' in field_name:
        return float(value)  # Return as number, column format handles currency display
    elif 'Duration' in field_name:
        return convert_duration_to_hours_string(value)
    elif 'Number' in field_name:
        return str(value)
    elif 'Flag' in field_name:
        return bool(value)
    else:
        # Text fields
        return str(value)[:4000]  # Truncate to Smartsheet limit
```

### Custom Field Column Naming

Generate Smartsheet column names from custom field definitions.

**Naming Strategy**:
1. **Prefer Display Name**: Use human-readable name from Project Online configuration
2. **Fallback to Internal Name**: If no display name, use internal name with cleanup
3. **Add Prefix**: Prepend "Custom - " to distinguish from standard columns
4. **Sanitize**: Remove invalid characters, ensure uniqueness

```typescript
def generate_custom_column_name(field_name: str, display_name: str = None) -> str:
    """
    Generate Smartsheet column name for custom field.
    
    Args:
        field_name: Internal field name (e.g., 'ProjectText1')
        display_name: Display name from configuration (e.g., 'Customer Name')
        
    Returns:
        Sanitized column name for Smartsheet
    """
    if display_name:
        # Use display name if available
        base_name = display_name
    else:
        # Clean up internal name
        # 'ProjectText1' → 'Project Text 1'
        base_name = re.sub(r'([a-z])([A-Z])', r'\1 \2', field_name)
        base_name = re.sub(r'(\D)(\d)', r'\1 \2', base_name)
    
    # Sanitize
    sanitized = re.sub(r'[^\w\s-]', '', base_name)
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    # Truncate to Smartsheet limit (50 chars with prefix)
    max_length = 50 - len('Custom - ')
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length-3] + '...'
    
    # Add prefix to distinguish custom fields
    return f"Custom - {sanitized}"

# Examples:
# generate_custom_column_name('ProjectText1', 'Customer Name')
#   → 'Custom - Customer Name'
# generate_custom_column_name('TaskNumber1', 'Story Points')
#   → 'Custom - Story Points'
# generate_custom_column_name('ProjectText5', None)
#   → 'Custom - Project Text 5'
```

### Custom Picklist Field Discovery

For custom dropdown/picklist fields, discover the valid options.

**Challenge**: Project Online doesn't store picklist options in entity metadata. Options are configured separately in Project Settings.

**Approach**:
1. **Option Discovery from Data**: Collect unique values across all entities
2. **Configuration API**: Query Project Online custom field configuration (if available)
3. **Validation**: Set Smartsheet picklist to validate against discovered options

```typescript
def discover_picklist_options(entities: list, field_name: str) -> list:
    """
    Discover picklist options by collecting unique values from entity data.
    
    Args:
        entities: List of entity objects
        field_name: Custom field name
        
    Returns:
        List of unique option values
    """
    options = set()
    
    for entity in entities:
        value = entity.get(field_name)
        if value is not None and value != '':
            # Handle single value
            if isinstance(value, str):
                options.add(value)
            # Handle multi-value (if comma-separated)
            elif isinstance(value, list):
                options.update(value)
    
    # Sort alphabetically
    return sorted(list(options))

def create_picklist_column(field_name: str, display_name: str, options: list) -> dict:
    """
    Create Smartsheet picklist column configuration for custom field.
    """
    return {
        'title': generate_custom_column_name(field_name, display_name),
        'type': 'PICKLIST',
        'options': options,
        'validation': True  # Enforce selection from options
    }
```

### Configuration Options

Provide configuration to control custom field behavior.

#### Configuration Parameters

```typescript
# .env configuration
CUSTOM_FIELDS_ENABLED=true              # Enable/disable custom field mapping
CUSTOM_FIELDS_FILTER_EMPTY=true         # Skip fields with all null values
CUSTOM_FIELDS_PREFIX="Custom - "        # Prefix for custom column names
CUSTOM_FIELDS_EXCLUDE_PATTERN="^Task(Text|Number)[1-5]$"  # Regex to exclude fields
CUSTOM_FIELDS_INCLUDE_PATTERN="^(Project|Task)(Text|Number).*$"  # Regex to include fields
CUSTOM_FIELDS_MAX_PER_SHEET=50         # Maximum custom fields per sheet
```

#### Filtering Logic

```typescript
def filter_custom_fields(custom_fields: list, config: dict) -> list:
    """
    Filter custom fields based on configuration.
    
    Applies:
    - Empty field filtering (if enabled)
    - Include/exclude pattern matching
    - Maximum field limit
    """
    filtered = custom_fields
    
    # Apply exclude pattern
    if config.get('exclude_pattern'):
        pattern = re.compile(config['exclude_pattern'])
        filtered = [f for f in filtered if not pattern.match(f['name'])]
    
    # Apply include pattern
    if config.get('include_pattern'):
        pattern = re.compile(config['include_pattern'])
        filtered = [f for f in filtered if pattern.match(f['name'])]
    
    # Apply maximum limit
    max_fields = config.get('max_per_sheet')
    if max_fields and len(filtered) > max_fields:
        # Prioritize by usage (fields with most non-null values)
        filtered = sorted(filtered, key=lambda f: f['usage_count'], reverse=True)
        filtered = filtered[:max_fields]
    
    return filtered
```

### Custom Field Integration with ETL Pipeline

#### Updated ETL Workflow

```
1. Schema Discovery Phase (NEW)
   ├─ Fetch Project Online metadata
   ├─ Identify custom fields per entity type
   ├─ Fetch custom field display names
   └─ Store custom field definitions

2. Data Extraction Phase
   ├─ Extract standard entities
   ├─ Include custom field values in queries
   └─ Track custom field usage

3. Custom Field Analysis Phase (NEW)
   ├─ Filter out empty custom fields
   ├─ Discover picklist options
   ├─ Apply configuration filters
   └─ Generate column definitions

4. Transformation Phase
   ├─ Transform standard fields (existing)
   ├─ Transform custom fields (NEW)
   └─ Validate all field values

5. Loading Phase
   ├─ Create sheets with standard columns
   ├─ Add custom field columns dynamically (NEW)
   ├─ Populate all cell values
   └─ Configure picklist options
```

#### Column Creation Order

To maintain consistent layout:

```typescript
def create_sheet_columns(standard_columns: list, custom_columns: list) -> list:
    """
    Create columns in logical order:
    1. Standard ID and identification columns
    2. Standard data columns
    3. Custom field columns
    4. System columns (Created Date, Modified Date, etc.)
    """
    all_columns = []
    
    # Primary columns first
    all_columns.extend([c for c in standard_columns if c.get('primary')])
    
    # Standard data columns
    all_columns.extend([c for c in standard_columns if not c.get('primary') and not c.get('system')])
    
    # Custom field columns (grouped together)
    all_columns.extend(custom_columns)
    
    # System columns last
    all_columns.extend([c for c in standard_columns if c.get('system')])
    
    return all_columns
```

### Unsupported Custom Field Types

Some Project Online custom field types cannot be fully replicated in Smartsheet:

#### Formula Fields - Static Values with Comprehensive Logging

**What Are Project Online Formula Fields?**
Project Online formula custom fields are calculated fields defined in Project Web App settings. They use Project Online's formula syntax to perform calculations, concatenations, date math, conditional logic, etc.

**oData Behavior:**
When querying Project Online via oData, formula fields return only the **calculated value** (the current result) based on the data at query time. The oData API does NOT expose the formula definitions, making automatic translation impossible.

**Example oData Response:**
```json
{
  "ProjectNumber1": 115000,     // Result of formula: Budget * 1.15
  "TaskText1": "High Priority",  // Result of formula: IF(Priority>700,"High","Normal")
  "ProjectDate1": "2024-06-30"   // Result of formula: [StartDate] + 90 days
}
```

**Smartsheet Mapping: Static Values with Logging**

Since formula definitions are not accessible via oData, the tool stores calculated values as static data. However, to support post-migration formula recreation, the tool generates comprehensive logging.

**Implementation:**

```typescript
def handle_formula_field(
    field_name: str,
    display_name: str,
    entity: dict,
    formula_log: list
) -> tuple:
    """
    Store formula result as static value and log for post-migration reference.
    
    Args:
        field_name: Internal field name (e.g., "ProjectNumber1")
        display_name: Human-readable name (e.g., "Budget with Markup")
        entity: Entity data containing calculated value
        formula_log: List to accumulate formula field records
        
    Returns:
        Tuple of (value, column_type)
    """
    calculated_value = entity.get(field_name)
    
    # Log formula field for post-migration report
    formula_log.append({
        'internal_name': field_name,
        'display_name': display_name,
        'calculated_value': calculated_value,
        'entity_type': entity.get('__entity_type'),
        'entity_id': entity.get('Id')
    })
    
    # Return static value
    return (calculated_value, infer_type_from_value(calculated_value))
```

**Post-Migration Formula Log Report**

At CLI completion, a comprehensive formula fields report is generated:

```typescript
def generate_formula_fields_report(
    formula_fields_data: list,
    output_file: str = "formula_fields_report.csv"
):
    """
    Generate comprehensive CSV report of all formula fields encountered.
    
    Report includes:
    - Workspace Name
    - Workspace ID
    - Sheet Name
    - Sheet ID
    - Column Name
    - Column ID
    - Internal Field Name
    - Display Name
    - Sample Values
    """
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'Workspace Name',
            'Workspace ID',
            'Sheet Name',
            'Sheet ID',
            'Column Name',
            'Column ID',
            'Internal Field Name',
            'Display Name',
            'Entity Type',
            'Sample Values'
        ])
        
        writer.writeheader()
        
        # Group by field and sheet
        fields_by_sheet = group_formula_fields_by_sheet(formula_fields_data)
        
        for sheet_info, fields in fields_by_sheet.items():
            for field_info in fields:
                writer.writerow({
                    'Workspace Name': sheet_info['workspace_name'],
                    'Workspace ID': sheet_info['workspace_id'],
                    'Sheet Name': sheet_info['sheet_name'],
                    'Sheet ID': sheet_info['sheet_id'],
                    'Column Name': field_info['column_name'],
                    'Column ID': field_info['column_id'],
                    'Internal Field Name': field_info['internal_name'],
                    'Display Name': field_info['display_name'],
                    'Entity Type': field_info['entity_type'],
                    'Sample Values': '; '.join(str(v) for v in field_info['sample_values'][:5])
                })
```

**Example Formula Fields Report (CSV):**

```csv
Workspace Name,Workspace ID,Sheet Name,Sheet ID,Column Name,Column ID,Internal Field Name,Display Name,Entity Type,Sample Values
Website Redesign 2024,123456789,Tasks,234567890,Custom - Adjusted Budget,345678901,ProjectNumber1,Budget with Markup,Project,115000; 92000; 138000
Website Redesign 2024,123456789,Tasks,234567890,Custom - Priority Label,456789012,TaskText1,Priority Level,Task,High Priority; Normal; High Priority; Critical
Website Redesign 2024,123456789,Project Summary,567890123,Custom - Contract End,678901234,ProjectDate1,Contract End Date,Project,2024-06-30
```

**CLI Output Example:**

```
========================================
FORMULA FIELDS REPORT
========================================

Formula fields were detected and stored as static values.
These fields contained calculated values from Project Online formulas.

The formula definitions are NOT available through the Project Online API
and cannot be automatically migrated to Smartsheet formulas.

If formula functionality is needed post-migration, formulas must be
manually recreated in Smartsheet using the migrated data as reference.

Formula Fields Summary:
  Total Formula Fields: 3
  - Projects: 2 fields
  - Tasks: 1 field
  - Resources: 0 fields
  - Assignments: 0 fields

Detailed Formula Fields Report:
  Saved to: ./formula_fields_report.csv
  
  This report contains:
    - Workspace and Sheet identifiers for locating columns
    - Column Names and IDs for creating Smartsheet formulas
    - Internal and Display names for reference
    - Sample values to understand calculation results

Action Required:
  Review the formula fields report and determine which formulas should be
  recreated in Smartsheet. Common formulas (IF, SUM, DATE calculations) can
  typically be recreated using Smartsheet's formula syntax.

========================================
```

**Benefits of This Approach:**

1. **Reliable Migration**: Static values ensure data accuracy
2. **Complete Audit Trail**: Every formula field logged with full context
3. **Post-Migration Support**: Clear identification of what needs manual recreation
4. **Business Continuity**: Current calculated values preserved
5. **Traceability**: Workspace/Sheet/Column IDs enable quick location

**Manual Formula Recreation Guide:**

For common formula patterns, users can reference this translation guide:

| Project Online Pattern | Smartsheet Recreation |
|------------------------|----------------------|
| Simple calculations | Direct translation (e.g., `[Budget] * 1.15`) |
| IF statements | Map to Smartsheet IF syntax |
| Date arithmetic | Use Smartsheet date functions |
| Text concatenation | Use Smartsheet JOIN or + operator |
| Lookup references | May require cell links or INDEX/MATCH |

**Note**: The formula fields report provides all necessary identifiers (Sheet ID, Column ID) for users to efficiently recreate formulas in Smartsheet post-migration.

#### Lookup Fields - PMO Standards Architecture

**What Are Project Online Lookup Fields?**
Project Online lookup custom fields reference predefined lookup tables (e.g., "Departments", "Customers", "Project Types"). These are NOT like Smartsheet cell links or VLOOKUP formulas - they're dropdown lists populated from centralized reference tables.

**oData Behavior:**
When querying Project Online via oData, lookup fields return only the **display value** (the selected text) as a simple string. The oData API does NOT expose the underlying lookup table structure.

**Example oData Response:**
```json
{
  "TaskText1": "Engineering",  // Display value from "Department" lookup table
  "ProjectText1": "Customer A"  // Display value from "Customer" lookup table
}
```

**Smartsheet Mapping: Centralized PMO Standards Workspace**

This tool implements a sophisticated, scalable architecture for lookup fields using a centralized "PMO Standards" workspace:

**Architecture Overview:**
```
PMO Standards Workspace (Centralized)
├── Standard Field Reference Sheets (Pre-populated at startup)
│   ├── Project - Status (Active, Planning, Completed, On Hold, Cancelled)
│   ├── Project - Priority (Lowest, Very Low, Lower, Medium, Higher, Very High, Highest)
│   ├── Task - Status (Not Started, In Progress, Complete)
│   ├── Task - Priority (Lowest, Very Low, Lower, Medium, Higher, Very High, Highest)
│   ├── Task - Constraint Type (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
│   └── Resource - Type (Work, Material, Cost)
│
├── Discovered Field Reference Sheets (Populated during migration)
│   ├── Resource - Department (discovered from data)
│   ├── Task - {CustomLookupFieldName} (discovered from data)
│   └── Project - {CustomLookupFieldName} (discovered from data)
│
└── All sheets have single "Name" column (Primary)

Project Workspace 1
├── Project Summary Sheet
│   ├── Status (PICKLIST sourced from PMO Standards/Project - Status)
│   └── Priority (PICKLIST sourced from PMO Standards/Project - Priority)
├── Tasks Sheet
│   ├── Status (PICKLIST sourced from PMO Standards/Task - Status)
│   ├── Priority (PICKLIST sourced from PMO Standards/Task - Priority)
│   ├── Constraint Type (PICKLIST sourced from PMO Standards/Task - Constraint Type)
│   └── Custom - Department (PICKLIST sourced from PMO Standards/Task - Department)
└── Resources Sheet
    ├── Resource Type (PICKLIST sourced from PMO Standards/Resource - Type)
    └── Department (PICKLIST sourced from PMO Standards/Resource - Department)

Project Workspace 2 (uses same PMO Standards reference sheets)
├── Project Summary Sheet (sources from same PMO Standards sheets)
├── Tasks Sheet (sources from same PMO Standards sheets)
└── Resources Sheet (sources from same PMO Standards sheets)
```

**Sheet Naming Convention:**
All PMO Standards reference sheets use namespaced naming to disambiguate fields with same property names across entity types:
- **Pattern**: `{EntityType} - {FieldName}`
- **Examples**:
  - `"Project - Status"` (not just "Status")
  - `"Project - Priority"` (not just "Priority")
  - `"Task - Status"` (distinct from Project Status)
  - `"Task - Priority"` (same values as Project Priority, but separate sheet)
  - `"Task - Constraint Type"`
  - `"Resource - Type"`
  - `"Resource - Department"`
  - `"Task - Department"` (custom lookup field)
  - `"Project - Customer"` (custom lookup field)

This namespacing ensures:
- Clear identification of which entity type a reference sheet applies to
- No naming conflicts when same property names exist across entities
- Intuitive organization for PMO teams managing reference data

**Implementation Workflow:**

1. **PMO Standards Workspace Initialization (Pre-Migration)**
   ```typescript
   # Standard field definitions with known values
   STANDARD_REFERENCE_SHEETS = {
       'Project - Status': ['Active', 'Planning', 'Completed', 'On Hold', 'Cancelled'],
       'Project - Priority': ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'],
       'Task - Status': ['Not Started', 'In Progress', 'Complete'],
       'Task - Priority': ['Lowest', 'Very Low', 'Lower', 'Medium', 'Higher', 'Very High', 'Highest'],
       'Task - Constraint Type': ['ASAP', 'ALAP', 'SNET', 'SNLT', 'FNET', 'FNLT', 'MSO', 'MFO'],
       'Resource - Type': ['Work', 'Material', 'Cost']
   }
   
   def initialize_pmo_standards_workspace(smartsheet_client) -> dict:
       """
       Create or verify PMO Standards workspace exists with owner access.
       Pre-populate with standard field reference sheets.
       This workspace is shared across all project migrations.
       
       Returns:
           Dictionary with workspace metadata including reference sheet IDs
       """
       workspace_name = "PMO Standards"
       
       # Search for existing workspace
       workspaces = smartsheet_client.Workspaces.list_workspaces()
       pmo_workspace = next(
           (w for w in workspaces.data if w.name == workspace_name),
           None
       )
       
       if not pmo_workspace:
           # Create new workspace
           pmo_workspace = smartsheet_client.Workspaces.create_workspace(
               Workspace({
                   'name': workspace_name
               })
           ).result
       
       # Verify owner access
       if pmo_workspace.access_level != 'OWNER':
           raise PermissionError(
               f"Insufficient permissions on '{workspace_name}' workspace. "
               "Owner access required for managing reference sheets."
           )
       
       # Create/verify standard field reference sheets
       reference_sheets = {}
       for sheet_name, values in STANDARD_REFERENCE_SHEETS.items():
           sheet_info = ensure_standard_reference_sheet(
               smartsheet_client,
               pmo_workspace.id,
               sheet_name,
               values
           )
           reference_sheets[sheet_name] = sheet_info
       
       return {
           'id': pmo_workspace.id,
           'name': pmo_workspace.name,
           'permalink': pmo_workspace.permalink,
           'reference_sheets': reference_sheets
       }
   
   def ensure_standard_reference_sheet(
       smartsheet_client,
       workspace_id: int,
       sheet_name: str,
       predefined_values: list
   ) -> dict:
       """
       Create or verify standard reference sheet with predefined values.
       
       Args:
           smartsheet_client: Smartsheet API client
           workspace_id: PMO Standards workspace ID
           sheet_name: Namespaced sheet name (e.g., "Project - Status")
           predefined_values: List of standard values to populate
           
       Returns:
           Dictionary with sheet metadata (id, name, column_id)
       """
       # Check if sheet exists
       workspace = smartsheet_client.Workspaces.get_workspace(
           workspace_id,
           include='sheets'
       )
       
       existing_sheet = next(
           (s for s in workspace.sheets if s.name == sheet_name),
           None
       )
       
       if existing_sheet:
           # Sheet exists, verify values are complete
           sheet = smartsheet_client.Sheets.get_sheet(existing_sheet.id)
           name_column = next(
               (c for c in sheet.columns if c.title == "Name"),
               None
           )
           
           if not name_column or not name_column.primary:
               raise ValueError(
                   f"Reference sheet '{sheet_name}' exists but missing "
                   "'Name' as primary column"
               )
           
           # Get existing values
           existing_values = {
               row.cells[0].value
               for row in sheet.rows
               if row.cells[0].value
           }
           
           # Add missing standard values
           missing_values = set(predefined_values) - existing_values
           if missing_values:
               rows_to_add = [
                   Row({
                       'to_bottom': True,
                       'cells': [
                           Cell({
                               'column_id': name_column.id,
                               'value': value
                           })
                       ]
                   })
                   for value in sorted(missing_values)
               ]
               smartsheet_client.Sheets.add_rows(sheet.id, rows_to_add)
           
           return {
               'sheet_id': sheet.id,
               'sheet_name': sheet.name,
               'column_id': name_column.id,
               'type': 'standard',
               'values': predefined_values
           }
       else:
           # Create new reference sheet with predefined values
           new_sheet = smartsheet_client.Home.create_sheet_in_workspace(
               workspace_id,
               Sheet({
                   'name': sheet_name,
                   'columns': [
                       Column({
                           'title': 'Name',
                           'type': 'TEXT_NUMBER',
                           'primary': True
                       })
                   ]
               })
           ).result
           
           # Add all predefined values as rows
           name_column_id = new_sheet.columns[0].id
           rows_to_add = [
               Row({
                   'to_bottom': True,
                   'cells': [
                       Cell({
                           'column_id': name_column_id,
                           'value': value
                       })
                   ]
               })
               for value in predefined_values
           ]
           
           smartsheet_client.Sheets.add_rows(new_sheet.id, rows_to_add)
           
           return {
               'sheet_id': new_sheet.id,
               'sheet_name': new_sheet.name,
               'column_id': name_column_id,
               'type': 'standard',
               'values': predefined_values
           }
   ```

2. **Lookup Reference Sheet Management (Per Lookup Field)**
   ```typescript
   def ensure_lookup_reference_sheet(
       smartsheet_client,
       pmo_workspace_id: int,
       lookup_field_name: str,
       values: set
   ) -> dict:
       """
       Create or update reference sheet for a lookup field in PMO Standards workspace.
       
       Args:
           smartsheet_client: Smartsheet API client
           pmo_workspace_id: PMO Standards workspace ID
           lookup_field_name: Display name of lookup field (e.g., "Department")
           values: Set of unique values encountered for this lookup field
           
       Returns:
           Dictionary with sheet metadata (id, name, column_id)
       """
       sheet_name = lookup_field_name  # Sheet name matches field name
       
       # Check if sheet exists in workspace
       workspace = smartsheet_client.Workspaces.get_workspace(
           pmo_workspace_id,
           include='sheets'
       )
       
       existing_sheet = next(
           (s for s in workspace.sheets if s.name == sheet_name),
           None
       )
       
       if existing_sheet:
           # Sheet exists, verify structure and add missing values
           sheet = smartsheet_client.Sheets.get_sheet(existing_sheet.id)
           
           # Verify "Name" column exists and is primary
           name_column = next(
               (c for c in sheet.columns if c.title == "Name"),
               None
           )
           
           if not name_column or not name_column.primary:
               raise ValueError(
                   f"Reference sheet '{sheet_name}' exists but missing "
                   "'Name' as primary column"
               )
           
           # Get existing values
           existing_values = {
               row.cells[0].value
               for row in sheet.rows
               if row.cells[0].value
           }
           
           # Add missing values
           new_values = values - existing_values
           if new_values:
               rows_to_add = [
                   Row({
                       'to_bottom': True,
                       'cells': [
                           Cell({
                               'column_id': name_column.id,
                               'value': value
                           })
                       ]
                   })
                   for value in sorted(new_values)
               ]
               smartsheet_client.Sheets.add_rows(sheet.id, rows_to_add)
           
           return {
               'sheet_id': sheet.id,
               'sheet_name': sheet.name,
               'column_id': name_column.id,
               'values_added': len(new_values)
           }
       else:
           # Create new reference sheet
           new_sheet = smartsheet_client.Home.create_sheet_in_workspace(
               pmo_workspace_id,
               Sheet({
                   'name': sheet_name,
                   'columns': [
                       Column({
                           'title': 'Name',
                           'type': 'TEXT_NUMBER',
                           'primary': True
                       })
                   ]
               })
           ).result
           
           # Add all values as rows
           name_column_id = new_sheet.columns[0].id
           rows_to_add = [
               Row({
                   'to_bottom': True,
                   'cells': [
                       Cell({
                           'column_id': name_column_id,
                           'value': value
                       })
                   ]
               })
               for value in sorted(values)
           ]
           
           if rows_to_add:
               smartsheet_client.Sheets.add_rows(new_sheet.id, rows_to_add)
           
           return {
               'sheet_id': new_sheet.id,
               'sheet_name': new_sheet.name,
               'column_id': name_column_id,
               'values_added': len(values)
           }
   ```

3. **Project Column Creation with Sheet-Sourced Picklist**
   ```typescript
   def create_lookup_column(
       smartsheet_client,
       sheet_id: int,
       column_name: str,
       reference_sheet_id: int,
       reference_column_id: int,
       is_multi_select: bool = False
   ) -> dict:
       """
       Create picklist column sourced from PMO Standards reference sheet.
       
       Args:
           sheet_id: Target project sheet ID
           column_name: Column name (e.g., "Custom - Department")
           reference_sheet_id: PMO Standards reference sheet ID
           reference_column_id: "Name" column ID in reference sheet
           is_multi_select: True for MULTI_PICKLIST, False for PICKLIST
       """
       column_type = 'MULTI_PICKLIST' if is_multi_select else 'PICKLIST'
       
       column = Column({
           'title': column_name,
           'type': column_type,
           'options': [
               PicklistOption({
                   'sheetId': reference_sheet_id,
                   'columnId': reference_column_id
               })
           ],
           'validation': True  # Strict validation enabled
       })
       
       result = smartsheet_client.Sheets.add_columns(
           sheet_id,
           [column]
       )
       
       return {
           'column_id': result.data[0].id,
           'column_name': column_name,
           'source_sheet_id': reference_sheet_id,
           'source_column_id': reference_column_id
       }
   ```

4. **Cell Value Population with Validation Bypass**
   ```typescript
   def set_lookup_cell_value(
       cell: dict,
       value: str,
       ignore_validation: bool = True
   ):
       """
       Set cell value for lookup field with optional validation bypass.
       
       Args:
           cell: Cell object to populate
           value: Lookup value from Project Online
           ignore_validation: Bypass validation for read-after-write latency
       """
       cell['value'] = value
       
       # Bypass validation to handle read-after-write latency
       # Reference sheet might not be fully indexed yet
       if ignore_validation:
           cell['strict'] = False
       
       return cell
   ```

**Benefits of PMO Standards Architecture:**

1. **Centralized Management**: PMO can maintain reference data in one place
2. **Cross-Project Consistency**: All projects use same validated values
3. **Easy Updates**: Update reference sheet once, affects all projects
4. **Data Governance**: Single source of truth for organizational standards
5. **Scalability**: Works across unlimited number of project migrations
6. **Automatic Discovery**: Tool automatically discovers and populates reference sheets

**Migration Flow:**

```
1. CLI Startup
   └─> Initialize/Verify PMO Standards workspace

2. Schema Discovery (Per Project)
   └─> Identify lookup custom fields
   └─> Collect unique values per field

3. PMO Standards Update (Per Unique Lookup Field)
   └─> Create/verify reference sheet
   └─> Add new values as rows

4. Project Workspace Creation
   └─> Create project workspace
   └─> Create sheets (Tasks, Resources, etc.)
   └─> Create columns sourced from PMO Standards reference sheets

5. Data Population
   └─> Set cell values with validation bypass for latency handling
```

**Example Output Log:**
```
PMO Standards Workspace Setup:
  Workspace: PMO Standards (ID: 123456789)
  
Lookup Reference Sheets Created/Updated:
  - Department (Sheet ID: 234567890, Column ID: 345678901)
    Values: Engineering, Marketing, Sales, Operations
    New Values Added: 4
  
  - Customer (Sheet ID: 456789012, Column ID: 567890123)
    Values: Customer A, Customer B, Customer C
    New Values Added: 2 (Customer B was new)

Project Workspace: Website Redesign 2024
  Tasks Sheet (ID: 789012345)
    Column "Custom - Department" (ID: 890123456)
      Sourced from: PMO Standards/Department (Sheet: 234567890, Column: 345678901)
      Validation: Strict
```

**Important Notes:**
- PMO Standards workspace created once, shared across all migrations
- Reference sheets accumulate values from all projects
- Project columns always source from latest PMO Standards reference data
- Validation bypass (`strict: False`) prevents read-after-write latency errors
- PMO team gains centralized control over organizational reference data

#### Multi-level Picklists
- **Challenge**: Project Online supports cascading/dependent picklists
- **Solution**: Flatten to single-level picklist with all options
- **Column Type**: PICKLIST or MULTI_PICKLIST
- **Note**: Cascading behavior not preserved

#### Rich Text Fields
- **Challenge**: Formatting and embedded objects
- **Solution**: Convert to plain text
- **Column Type**: TEXT_NUMBER
- **Note**: Formatting and embedded objects lost

### Custom Field Validation

Validate custom field transformations to ensure data quality.

```typescript
def validate_custom_field_transformation(
    source_value,
    target_value,
    field_type: str,
    field_name: str
) -> ValidationResult:
    """
    Validate custom field transformation.
    
    Checks:
    - Type compatibility
    - Value range
    - Character limits
    - Null handling
    """
    validation = ValidationResult()
    
    # Null value check
    if source_value is None:
        if target_value is not None:
            validation.add_warning(f"{field_name}: Null source but non-null target")
        return validation
    
    # Type-specific validation
    if field_type == 'DATE':
        if not is_valid_date(target_value):
            validation.add_error(f"{field_name}: Invalid date format")
    elif field_type == 'CHECKBOX':
        if not isinstance(target_value, bool):
            validation.add_error(f"{field_name}: Expected boolean value")
    elif field_type == 'TEXT_NUMBER':
        if len(str(target_value)) > 4000:
            validation.add_warning(f"{field_name}: Value truncated to 4000 chars")
    
    return validation
```

### Custom Field Documentation

Generate documentation for custom field mappings.

```typescript
def generate_custom_field_report(custom_fields: list) -> str:
    """
    Generate markdown report documenting all custom field mappings.
    
    Includes:
    - Custom field inventory
    - Type mappings
    - Column names
    - Usage statistics
    - Unsupported features
    """
    report = "# Custom Field Mapping Report\n\n"
    
    report += "## Summary\n\n"
    report += f"- Total custom fields discovered: {len(custom_fields)}\n"
    report += f"- Fields with data: {sum(1 for f in custom_fields if f.get('has_data'))}\n"
    report += f"- Fields excluded by filters: {sum(1 for f in custom_fields if f.get('excluded'))}\n\n"
    
    report += "## Custom Field Mappings\n\n"
    report += "| Internal Name | Display Name | Type | Smartsheet Column | Notes |\n"
    report += "|--------------|--------------|------|-------------------|-------|\n"
    
    for field in custom_fields:
        report += f"| {field['name']} "
        report += f"| {field.get('display_name', 'N/A')} "
        report += f"| {field['type']} "
        report += f"| {field['column_name']} "
        report += f"| {field.get('notes', '')} |\n"
    
    return report
```

### Implementation Considerations

#### Performance Impact
- **Schema Discovery**: One-time metadata query (minimal overhead)
- **Custom Field Extraction**: Included in entity queries (no additional API calls)
- **Column Creation**: Dynamic column addition per sheet (moderate overhead)
- **Overall Impact**: 10-15% increase in ETL time, one-time discovery cache

#### Complexity Impact
- **Code Complexity**: Significant increase (field discovery, dynamic mapping)
- **Testing Requirements**: Expanded (test various custom field configurations)
- **Error Handling**: More scenarios (unsupported types, invalid values)
- **Documentation**: Custom field report generation

#### User Experience
- **Pros**: Complete data migration, no manual field setup
- **Cons**: More columns to review, potential for cluttered sheets
- **Mitigation**: Configuration to filter fields, clear naming with "Custom - " prefix

### Custom Field Migration Checklist

Pre-migration checklist for custom field support:

- [ ] Verify access to Project Online metadata endpoint
- [ ] Test custom field discovery on sample project
- [ ] Validate custom field naming conventions
- [ ] Configure custom field filters (include/exclude patterns)
- [ ] Test picklist option discovery
- [ ] Verify Smartsheet column limit not exceeded (400 max)
- [ ] Review custom field report for accuracy
- [ ] Test transformation of all custom field types
- [ ] Validate data in migrated Smartsheet columns
- [ ] Document any unsupported custom field features

### Custom Field Examples

#### Example 1: Project Custom Fields
```typescript
# Discovered custom fields
custom_fields = [
    {
        'name': 'ProjectText1',
        'display_name': 'Customer Name',
        'type': 'Edm.String',
        'has_data': True
    },
    {
        'name': 'ProjectNumber1',
        'display_name': 'Budget Amount',
        'type': 'Edm.Decimal',
        'has_data': True
    },
    {
        'name': 'ProjectDate1',
        'display_name': 'Contract End Date',
        'type': 'Edm.DateTime',
        'has_data': True
    }
]

# Resulting Smartsheet columns
# - "Custom - Customer Name" (TEXT_NUMBER)
# - "Custom - Budget Amount" (TEXT_NUMBER, formatted as currency)
# - "Custom - Contract End Date" (DATE)
```

#### Example 2: Task Custom Fields with Picklist
```typescript
# Discovered custom field
custom_field = {
    'name': 'TaskText1',
    'display_name': 'Deliverable Type',
    'type': 'Edm.String',
    'has_data': True
}

# Discovered values across all tasks
values = ['Specification', 'Design', 'Code', 'Test', 'Documentation']

# Resulting Smartsheet column
# - "Custom - Deliverable Type" (PICKLIST with 5 options)
```

---

## Naming Conventions

### General Patterns

#### Workspace Names
- **Pattern**: `{ProjectName}` (NO prefix, sanitized only)
- **Sanitization**: Remove invalid chars `/\:*?"<>|` → `-`, consolidate dashes, trim
- **Examples**:
  - `"Website Redesign 2024"`
  - `"Q1-Q2 Planning & Execution"`
  - `"IT Infrastructure - Phase 1"`

#### Sheet Names
- **Pattern**: `{ProjectName} - {EntityType}` OR `{EntityType}` (in project workspace)
- **Examples**:
  - `"Website Redesign - Tasks"` or `"Tasks"`
  - `"Website Redesign - Resources"` or `"Resources"`
  - `"Website Redesign - Summary"` or `"Summary"`

**Note**: No folders used. All sheets placed directly in workspace root.

### Column Names

#### Standard Columns
- Use Title Case for all column names
- Separate words with spaces
- Include units in parentheses when applicable

**Examples**:
- `"Task Name"` (not "TaskName" or "task_name")
- `"Start Date"` (not "StartDate")
- `"Work (hrs)"` (not "Work" or "WorkHours")
- `"% Complete"` (not "PercentComplete" or "%complete")

#### ID Columns
- Always append " ID" to entity name
- Keep as hidden columns (not displayed to users)

**Examples**:
- `"Task ID"`
- `"Resource ID"`
- `"Project ID"`
- `"Assignment ID"`

### Value Patterns

#### Dates
- **Format**: ISO 8601 date format `YYYY-MM-DD`
- **Examples**: `"2024-03-15"`, `"2024-12-31"`

#### Durations
- **Format**: Number + unit abbreviation
- **Units**: `d` (days), `h` (hours), `w` (weeks), `m` (minutes)
- **Examples**: `"5d"`, `"40h"`, `"2w"`, `"480m"`

#### Percentages
- **Format**: Integer + `%` symbol
- **Examples**: `"0%"`, `"50%"`, `"100%"`, `"150%"`

#### Currency
- **Storage**: Numeric values (not strings with currency symbols)
- **Display**: Handled by Smartsheet column numberFormat (CURRENCY)
- **Examples**: `75.00`, `3000.00`, `112.50` (stored as numbers, displayed with "$" by Smartsheet)

#### Booleans
- Use CHECKBOX column type for direct boolean representation
- **Values**: `true` (checked ☑) or `false` (unchecked ☐)
- **Examples**: `IsActive = true`, `IsMilestone = false`, `IsGeneric = true`

#### Contact Lists
- Use email addresses for identification
- **Format**: `"email@domain.com"`
- **Multiple**: Comma-separated
- **Examples**: `"john@example.com"`, `"john@example.com, jane@example.com"`

---

## Validation Rules

### Data Quality Checks

#### During Extraction
- Verify all required fields are present
- Check for null/empty values in non-nullable fields
- Validate Guid formats
- Validate date/time formats

#### During Transformation
- Validate transformed values match target data types
- Check string lengths against Smartsheet limits (column names max 50 chars, cell values max 4000 chars)
- Verify hierarchical relationships (parent tasks exist)
- Validate foreign key references (ProjectId, TaskId, ResourceId)
- Check numerical ranges (percentages 0-100, priority 0-1000)

#### Before Loading
- Validate Smartsheet-specific constraints:
  - Sheet name uniqueness within folder
  - Column type compatibility
  - Row hierarchy consistency
  - Predecessor references (row numbers exist)
- Verify required columns exist
- Check for duplicate IDs

### Error Handling

#### Transformation Errors

**Missing Required Field**:
```typescript
if not task.get('TaskName'):
    raise TransformationError(f"Task {task.get('Id')} missing required field: TaskName")
```

**Invalid Data Type**:
```typescript
try:
    percent = int(task.get('PercentComplete'))
except (ValueError, TypeError):
    log.warning(f"Task {task.get('Id')}: Invalid PercentComplete, defaulting to 0")
    percent = 0
```

**Invalid Reference**:
```typescript
parent_id = task.get('ParentTaskId')
if parent_id and parent_id not in task_id_map:
    log.warning(f"Task {task.get('Id')}: Parent task {parent_id} not found, treating as root")
    parent_id = None
```

---

## Summary

This transformation mapping specification defines comprehensive rules for migrating Microsoft Project Online data to Smartsheet using the Python SDK.

### Scope Coverage

**Entity Types**: 4 core entities (Projects, Tasks, Resources, Assignments)
**Properties Mapped**: 50+ properties with detailed conversion rules
**Data Types**: 8 data type conversions (Guid, DateTime, Duration, etc.)
**Relationships**: 3 relationship types preserved (Project-Task hierarchy, Task dependencies, Resource assignments via Contact List columns)

### Sheet Structure

**Workspace Structure**:
- 1 Workspace per project (name matches Project Online project name, sanitized)
- Sheets placed directly in workspace root (NO folders)

**Sheets Created**:
- 1 Tasks sheet (project sheet type with Gantt, dependencies, embedded assignment columns)
- 1 Resources sheet (complete resource directory with all metadata)
- 1 Project Summary sheet (optional)

**Total**: 2-3 sheets per project migration (2 required: Tasks + Resources, 1 optional: Project Summary)

**No Separate Assignments Sheet**: Assignment relationships are represented as dynamic Contact List columns embedded in the Tasks sheet, with column options sourced from the Resources sheet.

### Mapping Overview

| Project Online Entity | Smartsheet Structure | Primary Key | Relationships |
|----------------------|---------------------|-------------|---------------|
| **Project** | Workspace (1:1) + Optional Summary Sheet | `Id` (Guid) | Has many Tasks |
| **Task** | Row in Tasks Sheet (project sheet with assignment columns) | `Id` (Guid) | Belongs to Project workspace, has parent Task, relates to Resources via Contact List columns |
| **Resource** | Row in Resources Sheet | `Id` (Guid) | Sources Contact List options for Task assignment columns |
| **Assignment** | Contact List column values in Tasks Sheet | `Id` (Guid) | Links Tasks to Resources via typed columns |

### Key Transformations

1. **Hierarchy**: Project Online OutlineLevel → Smartsheet row indentation
2. **Dates**: ISO 8601 DateTime → `YYYY-MM-DD` date strings
3. **Durations**: ISO 8601 Duration → hours or days with unit suffix
4. **Percentages**: Decimal (0-1) → percentage (0-100%)
5. **Priorities**: Integer (0-1000) → picklist labels (Low/Medium/High/Critical)
6. **Embedded Assignments**: Assignment entities → Contact List columns in Tasks sheet (no separate sheet)
7. **Column Options Sourcing**: Assignment columns validate against Resources sheet
8. **Dependencies**: Task relationships → predecessor column format

### Key Design Decisions

1. **Project → Workspace**: Each Project Online project → dedicated Smartsheet workspace (1:1 mapping)
2. **Workspace Naming**: Match Project Online name exactly (sanitized, NO prefix)
3. **No Folders**: Sheets placed directly in workspace root for simplicity
4. **Project Sheet Type**: Tasks sheet configured with Gantt and dependencies enabled
5. **Dual ID Pattern**: GUID in hidden "Project Online [Name]" column + readable auto-number ID
6. **Contact Objects**: Name+Email → single Contact column with objectValue format
7. **Decimal Duration**: ISO8601 → decimal days for project sheet Duration system column
8. **Embedded Assignments**: Contact List columns in Tasks sheet (no separate Assignments sheet)
9. **Column Options Sourcing**: Assignment columns validate against Resources sheet
10. **Hierarchy Preservation**: OutlineLevel → row indentation with parent tracking

### Naming Standards

- **Workspaces**: `{ProjectName}` (sanitized, NO prefix)
- **Sheets**: `{ProjectName} - {EntityType}` or `{EntityType}` (in workspace root)
- **Columns**: Title Case with units in parentheses
- **Auto-Number IDs**: `{PREFIX}-#####` where PREFIX is project name abbreviation
- **Values**: Consistent formats (dates, currencies, percentages, durations)

---

## Appendices

### Appendix A: Smartsheet Column Types

| Type | Description | Value Format | Example |
|------|-------------|--------------|---------|
| TEXT_NUMBER | Text or number | String or number | "Design", 42 |
| CONTACT_LIST | Email contacts | Email strings | "john@example.com" |
| DATE | Date values | ISO date string | "2024-03-15" |
| PICKLIST | Dropdown options | String from predefined list | "High" |
| CHECKBOX | Boolean values | true/false | ☑ |
| PREDECESSOR | Task dependencies | Row number + type + lag | "5FS+2d" |

### Appendix B: Project Online Duration Format

**ISO 8601 Duration Format**: `P[n]Y[n]M[n]DT[n]H[n]M[n]S`

**Components**:
- `P` - Period designator
- `Y` - Years
- `M` - Months (before T) or Minutes (after T)
- `D` - Days
- `T` - Time designator
- `H` - Hours
- `S` - Seconds

**Examples**:
- `PT40H` - 40 hours
- `P5D` - 5 days
- `P1W` - 1 week (note: not standard ISO 8601, may vary)
- `PT480M` - 480 minutes (8 hours)
- `P0DT8H0M0S` - 8 hours (verbose format)

### Appendix C: Smartsheet API Limits

| Limit Type | Value | Notes |
|-----------|-------|-------|
| Sheet name length | 50 characters | Truncate if longer |
| Column name length | 50 characters | Truncate if longer |
| Cell value length | 4,000 characters | Truncate notes if longer |
| Columns per sheet | 400 columns | Stay well under this limit |
| Rows per sheet | 500,000 rows | Typically not an issue |
| Rate limit | 300 requests/minute | Implement backoff |

---

**Document Status**: Ready for implementation review  
**Next Steps**: Validate mappings with sample data, implement transformation logic  
**Related Documents**: 
- [Architecture Plan](./project-online-smartsheet-etl-architecture-plan.md)
- Memory Bank files in [`memory-bank/`](../../memory-bank/)