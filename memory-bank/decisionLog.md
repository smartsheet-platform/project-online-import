# Decision Log: Project Online to Smartsheet ETL

## 2024-12-04: Language Change Decision

### Decision: TypeScript as Implementation Language
**Rationale**:
- User requested language change from Python to TypeScript
- TypeScript provides strong typing and better maintainability
- Excellent Node.js ecosystem for CLI tools
- Smartsheet SDK available for Node.js/TypeScript
- Modern async/await patterns for API operations
- Strong community support and tooling

**Previous Decision**: Python (2024-12-03)

**Status**: Approved - All documentation updated (2024-12-04)

**Reference**: Architecture Plan and Transformation Mapping updated with TypeScript code samples

---

## 2024-12-03: Initial Architectural Decisions (Superseded by TypeScript Decision)

### Decision: Python as Implementation Language (SUPERSEDED)
**Rationale**:
- Smartsheet provides official Python SDK
- Strong API client libraries available (MSAL for OAuth, requests for oData)
- Excellent for ETL and data transformation
- PS team may have Python familiarity
- Rich ecosystem for CLI tools (click, rich, structlog)

**Alternatives Considered**:
- Node.js (good API support but less mature Smartsheet SDK)
- Java (more heavyweight for CLI tool use case)

**Status**: Superseded by TypeScript decision (2024-12-04)

**Reference**: Architecture Plan Section 3.2

---

### Decision: Command-Line Interface
**Rationale**:
- PS team needs repeatable, scriptable migrations
- Simple deployment (no server infrastructure)
- Easy to integrate into existing workflows
- Lower maintenance overhead
- Supports automation and batch processing

**Alternatives Considered**:
- Web-based UI (more complexity, not needed for PS team)
- Desktop application (overkill for the use case)

**Status**: Approved

**Reference**: Architecture Plan Section 4 (CLI User Experience Design)

---

### Decision: .env File for Configuration
**Rationale**:
- Simple configuration management
- Security via .gitignore (no credentials in version control)
- Standard pattern in Python ecosystem (python-dotenv)
- Easy for PS team to manage per-customer
- Supports multiple environment profiles

**Alternatives Considered**:
- Command-line arguments (less secure for credentials)
- Config files (similar to .env but less standard)
- Environment variables only (harder to manage per-customer)

**Status**: Approved

**Reference**: Architecture Plan Section 4.2 (Configuration File)

---

### Decision: Component-Based Architecture (6 Layers)
**Rationale**:
- Clear separation of concerns
- Each component has single responsibility
- Easier to test and maintain
- Allows parallel development
- Facilitates future enhancements

**Components**:
1. CLI Interface Module
2. Orchestration Layer
3. Extractor Module
4. Transformer Module
5. Loader Module
6. Data Flow Layer

**Status**: Approved

**Reference**: Architecture Plan Section 3 (Proposed Architecture)

---

### Decision: Checkpoint/Resume Capability
**Rationale**:
- Migrations can take significant time
- Network interruptions possible
- API rate limits may cause delays
- PS team needs reliability
- Reduces re-work on failures

**Implementation**:
- JSON-based checkpoint files
- State saved at key stages
- Position tracking in ETL pipeline
- Resume from any checkpoint

**Status**: Approved

**Reference**: Architecture Plan Section 4.3 (Position Tracking and Resume)

---

### Decision: Development Control Flow with Incremental Testing
**Rationale**:
- Fast development iteration
- Test with small data sets first (1 item → 10 items → all items)
- Gradually expand to full production
- Reduce API costs during development
- Configurable via .env settings

**Implementation**:
- EXTRACT_LIMIT configuration (1, 10, 100, all)
- TEST_PROJECT_IDS for specific project testing
- DEV_MODE flag for development profiles
- Override capabilities for testing specific scenarios

**Status**: Approved

**Reference**: Architecture Plan Section 3.2.3 (Extractor Module - Development Control Flow)

---

### Decision: Retry Logic with Exponential Backoff
**Rationale**:
- Both APIs may have rate limits
- Network issues require graceful handling
- Temporary failures should not fail entire migration
- Standard pattern for API reliability

**Implementation**:
- tenacity library for retry logic
- Configurable retry attempts (default: 3)
- Exponential backoff (default: 5 seconds)
- Different strategies for different error types

**Status**: Approved

**Reference**: Architecture Plan Section 3.2.2 (Orchestration Layer)

---

### Decision: 6-Week Phased Implementation
**Rationale**:
- Complex project requiring structured approach
- Each phase builds on previous
- Allows for iterative testing and feedback
- Manageable milestones for tracking

**Phases**:
1. Week 1: Foundation
2. Week 2: Extraction
3. Week 3: Transformation
4. Week 4: Loading
5. Week 5: Orchestration & Resume
6. Week 6: Testing & Documentation

**Status**: Approved - Pending timeline confirmation

**Reference**: Architecture Plan Section 5 (Implementation Phases)

---

### Decision: Smartsheet Workspace Structure (MAJOR REVISION - 2024-12-03)
**Rationale**:
- **Original**: Customer-level workspace with project folders
- **Revised**: One workspace per project (1:1 mapping)
- Simpler organization and navigation
- Better isolation between projects
- Cleaner structure without nested folders
- Matches Project Online project-centric model

**Structure**:
```
Workspace: {ProjectName} (sanitized, NO prefix)
├── Sheet: Tasks (project sheet type)
├── Sheet: Resources
└── Sheet: Summary (optional)
```

**Key Changes**:
1. Each Project Online project → Dedicated Smartsheet workspace
2. Workspace name matches project name (sanitized only, no "Project-" prefix)
3. Sheets placed directly in workspace root (NO folders)
4. Tasks sheet configured as project sheet (Gantt + dependencies)

**Status**: Approved - Final specification

**Reference**: Transformation Mapping Section 1 (Project Mapping)

---

### Decision: Specification-First Approach
**Rationale**:
- Complex integration requiring clear design
- PS team needs to understand the tool before implementation
- Reduce implementation rework
- Enable thorough review before coding
- Better risk assessment and planning

**Status**: Approved - Architecture Complete

**Reference**: Complete architecture plan at [`sdlc/docs/architecture/project-online-smartsheet-etl-architecture-plan.md`](../sdlc/docs/architecture/project-online-smartsheet-etl-architecture-plan.md)

---

## 2024-12-03: Major Workspace Structure Revision

### Decision: Project → Workspace (1:1 Mapping)
**Context**: User feedback on initial architecture design

**Rationale**:
- Simpler structure without nested folders
- Each project gets dedicated workspace
- Better isolation and organization
- Matches Project Online's project-centric model
- Cleaner for customers receiving migrated data

**Impact**:
- Workspace naming changed from `"{Customer} Migration"` to `"{ProjectName}"`
- No prefix (was "Project-", now removed)
- Sheets placed directly in workspace root
- No folder creation needed

**Status**: Approved - Specification Updated

**Reference**: Transformation Mapping Section 1.A (Workspace Mapping)

---

### Decision: Project Sheet Type with Gantt Configuration
**Rationale**:
- Tasks sheet needs proper Gantt and dependency support
- Smartsheet "project sheet" type provides system columns
- Duration must be decimal days (not string)
- Enables proper project management features

**Configuration**:
```python
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

**Status**: Approved

**Reference**: Transformation Mapping Section 2 (Task Mapping)

---

### Decision: Dual ID Column Pattern
**Rationale**:
- Preserve original GUIDs for data integrity
- Provide human-readable IDs for usability
- Enable cross-referencing if needed
- Support reporting and analysis

**Implementation**:
- **Column 1**: "Project Online [Entity] ID" - Hidden, locked, contains GUID
- **Column 2**: "[Entity] ID" - Auto-number with format `{PREFIX}-#####`
- Prefix generation from project name (3-4 letter acronym)
- Special case: Project IDs use "Project" prefix

**Prefix Algorithm**:
```python
def generate_project_prefix(project_name: str) -> str:
    # Collect initials from all words
    # If < 3 letters, supplement from first word
    # Examples: "Website Redesign" → "WRE", "Q1 Planning" → "Q1P"
```

**Status**: Approved

**Reference**: Transformation Mapping Section 2 (Auto-Number ID Prefix Generation)

---

### Decision: Contact Object Pattern for Name+Email
**Rationale**:
- Project Online separates Name and Email fields
- Smartsheet Contact columns expect objectValue format
- Single column cleaner than Name + Email columns
- Native support for contact lists and multi-contact

**Implementation**:
```python
cell['objectValue'] = {
    'email': 'john@example.com',
    'name': 'John Doe'
}
```

**For Multi-Contact**:
```python
cell['objectValue'] = {
    'objectType': 'MULTI_CONTACT',
    'values': [
        {'email': 'john@example.com', 'name': 'John Doe'},
        {'email': 'jane@example.com', 'name': 'Jane Smith'}
    ]
}
```

**Status**: Approved

**Reference**: Transformation Mapping Section 2 (Contact Objects)

---

### Decision: Decimal Duration for Project Sheets
**Rationale**:
- Project sheet Duration system column requires numeric value
- Cannot use string format like "5d"
- Must convert ISO 8601 to decimal days
- Non-system columns (Work, Actual Work) can use string format

**Conversion**:
- ISO 8601 → hours → divide by 8 → decimal days
- Example: `PT40H` → 40 hours → 5.0 days
- Round to 2 decimal places

**Status**: Approved

**Reference**: Transformation Mapping Section 2 (Duration Conversion)

---

### Decision: Dual Date Column Pattern for System Columns
**Rationale**:
- Smartsheet system columns (Created Date, Modified Date, Created By, Modified By) are auto-populated and cannot be user-set
- Need to preserve original Project Online timestamps
- Dual column approach maintains both original and Smartsheet-native audit trails
- Provides complete historical tracking

**Implementation**:
- **Project Online Created Date**: DATE column (user-settable, contains original PO created timestamp)
- **Project Online Modified Date**: DATE column (user-settable, contains original PO modified timestamp)
- **Created Date**: CREATED_DATE system column (auto-populated by Smartsheet when row created)
- **Modified Date**: MODIFIED_DATE system column (auto-populated by Smartsheet when row edited)
- **Created By**: CREATED_BY system column (auto-populated with creator's contact)
- **Modified By**: MODIFIED_BY system column (auto-populated with last editor's contact)

**Applies to**: All entity sheets (Project Summary, Tasks, Resources)

**Benefits**:
- Preserves original Project Online audit trail
- Provides Smartsheet-native audit trail for changes post-migration
- Complete timestamp history for compliance and reporting
- No data loss during migration

**Status**: Approved - Specification Updated (2024-12-03)

**Reference**: Transformation Mapping Sections 1.B, 2, 3 (All entity column mappings)

---

### Decision: Single Contact Column for Owner (Project Summary)
**Rationale**:
- Consistent with Contact object pattern used elsewhere
- Cleaner than separate "Owner" and "Owner Email" columns
- Proper use of Smartsheet CONTACT_LIST column type
- Enables Smartsheet contact features (notifications, @mentions, etc.)

**Implementation**:
```python
# Single "Owner" column with CONTACT_LIST type
cell['objectValue'] = {
    'email': project.get('OwnerEmail'),
    'name': project.get('Owner')
}
```

**Status**: Approved - Specification Updated (2024-12-03)

**Reference**: Transformation Mapping Section 1.B (Project Summary Sheet)

---

### Decision: Assignment Column Types by Resource Type
**Context**: Assignment columns initially specified as CONTACT_LIST or MULTI_CONTACT_LIST for all resource types

**Rationale**:
- Contact columns are specifically for people with email addresses
- Non-people resources (Material, Cost) should not use contact columns
- MULTI_PICKLIST with multiple selection is more appropriate for equipment and cost centers
- Maintains data integrity and proper column type usage

**Implementation**:
- **Work Resources** (people) → MULTI_CONTACT_LIST columns with contact objects
  - Format: `{'email': 'john@example.com', 'name': 'John Doe'}`
  - Enables Smartsheet contact features (@mentions, notifications, etc.)
- **Material Resources** (equipment) → MULTI_PICKLIST columns with resource names
  - Format: List of string names (e.g., `['Crane A', 'Forklift B']`)
  - Multiple selection enabled
- **Cost Resources** (cost centers) → MULTI_PICKLIST columns with resource names
  - Format: List of string names (e.g., `['Engineering Dept', 'Marketing Budget']`)
  - Multiple selection enabled

**Transformation Logic**:
```python
def map_assignments_to_task_columns(task_id, assignments, resources):
    # Determine column type based on resource type
    if resource_type == 'Work':
        column_type = 'MULTI_CONTACT_LIST'
        value = {'email': email, 'name': name}
    elif resource_type == 'Material':
        column_type = 'MULTI_PICKLIST'
        value = resource_name
    elif resource_type == 'Cost':
        column_type = 'MULTI_PICKLIST'
        value = resource_name
```

**Example Assignment Columns**:
- **Team Members** (MULTI_CONTACT_LIST): John Doe, Jane Smith (with email addresses)
- **Equipment** (MULTI_PICKLIST): Crane A, Forklift B
- **Cost Centers** (MULTI_PICKLIST): Engineering Dept, Marketing Budget

**Status**: Approved - Final Specification (2024-12-03)

**Reference**: Transformation Mapping Section 4 (Assignment Mapping)

---

## 2024-12-04: Priority Mapping Granularity Correction

### Decision: 7-Level Priority Mapping (Full Fidelity)
**Context**: Initial specification mapped Project Online priorities to 4 levels (Low/Medium/High/Critical), but Project Online actually uses 7 fixed priority levels.

**Rationale**:
- Project Online has 7 predefined priority levels with specific integer values:
  - 0 = Lowest
  - 200 = Very Low
  - 400 = Lower
  - 500 = Medium (default)
  - 600 = Higher
  - 800 = Very High
  - 1000 = Highest
- Full fidelity mapping preserves all granularity from source system
- Users can consolidate post-migration if simplified view desired
- Maintains data accuracy and supports detailed project prioritization
- No information loss during transformation

**Previous Mapping** (4 levels):
- Critical: >= 800
- High: 600-799
- Medium: 400-599
- Low: < 400

**Revised Mapping** (7 levels):
- Highest: >= 1000
- Very High: 800-999
- Higher: 600-799
- Medium: 500-599 (default)
- Lower: 400-499
- Very Low: 200-399
- Lowest: 0-199

**Implementation**:
```python
def map_priority(priority_value: int) -> str:
    """Map Project Online priority to Smartsheet picklist (7 levels)."""
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

**Benefits**:
- Complete data fidelity with Project Online priority system
- No information loss during migration
- Users can later consolidate if simplified priority view desired
- Supports organizations using detailed priority hierarchies

**Applies to**:
- Task Priority column in Tasks Sheet
- Project Priority in Project Summary Sheet

**Status**: Approved - Specification Updated (2024-12-04)

**Reference**: Transformation Mapping Section 2 (Task Mapping - Priority conversion)

---

## 2024-12-04: Custom Field Discovery and Mapping Strategy

### Decision: Auto-Discover All Custom Fields
**Context**: User selected comprehensive approach: "Standard fields + all custom fields - Auto-discover and map all custom fields (most complete, but complex and time-consuming)"

**Rationale**:
- Organizations use extensive custom fields in Project Online for domain-specific data
- Manual field mapping would be time-consuming and error-prone per customer
- Automatic discovery ensures complete data migration without information loss
- Supports various custom field types (text, number, date, flag, cost, duration, picklist)
- Enables flexible migration across different customer configurations

**Architecture Impact**:
- Added Schema Discovery Phase to ETL pipeline (before Extraction)
- New MetadataExtractor class in Extractor module
- New CustomFieldMapper class in Transformer module
- Dynamic column creation in Loader module
- Extended implementation timeline from 6 weeks to 10 weeks (+67%)

**Schema Discovery Process**:
1. Fetch Project Online metadata from `/_api/ProjectData/$metadata`
2. Parse custom field definitions per entity type (Projects, Tasks, Resources, Assignments)
3. Identify custom fields by naming patterns (Text1-30, Number1-20, Date1-10, Flag1-20, etc.)
4. Fetch human-readable display names from `/_api/ProjectServer/CustomFields`
5. Filter out empty/unused custom fields during extraction
6. Store custom field schema for transformation

**Type Mapping Strategy**:
| Project Online Type | Smartsheet Column Type | Notes |
|---------------------|------------------------|-------|
| Text fields | TEXT_NUMBER | Direct copy, max 4000 chars |
| Number/Cost fields | TEXT_NUMBER | Formatted as appropriate |
| Date fields | DATE | DateTime to Date conversion |
| Flag fields | CHECKBOX | Boolean to checkbox |
| Duration fields | TEXT_NUMBER | ISO8601 to string with unit |
| Picklist fields | PICKLIST | Options discovered from data |
| Multi-select fields | MULTI_PICKLIST | Multiple options from data |
| Formula fields | TEXT_NUMBER | Static value (formula not preserved) |
| Lookup fields | TEXT_NUMBER | Display value (relationship not preserved) |

**Column Naming**:
- Prefer display names from Project Online configuration
- Fallback to cleaned internal names (e.g., "ProjectText1" → "Project Text 1")
- Add "Custom - " prefix to distinguish from standard columns
- Sanitize and truncate to Smartsheet 50-char limit

**Configuration Options**:
```bash
CUSTOM_FIELDS_ENABLED=true              # Enable/disable custom field mapping
CUSTOM_FIELDS_FILTER_EMPTY=true         # Skip fields with all null values
CUSTOM_FIELDS_PREFIX="Custom - "        # Prefix for custom column names
CUSTOM_FIELDS_MAX_PER_SHEET=50         # Maximum custom fields per sheet
CUSTOM_FIELDS_EXCLUDE_PATTERN=""        # Regex to exclude specific fields
CUSTOM_FIELDS_INCLUDE_PATTERN=""        # Regex to include only specific fields
```

**Unsupported Features**:
- Formula fields: Only calculated value stored (formula not preserved)
- Lookup fields: Display value stored (functional lookup not preserved)
- Cascading picklists: Flattened to single-level picklist
- Rich text formatting: Converted to plain text

**Benefits**:
- Complete data migration without manual field mapping
- Supports diverse customer configurations
- Reduces migration preparation time
- Maintains data fidelity
- Generates custom field documentation automatically

**Tradeoffs**:
- Increased implementation complexity (+67% timeline)
- More columns in Smartsheet (potential clutter)
- Performance impact (10-15% slower ETL)
- Additional testing requirements
- Some field features not fully preserved

**Timeline Impact**:
- Original: 6 weeks
- With Custom Fields: 10 weeks
- Phase 2 extended: +1 week (schema discovery implementation)
- Phase 3 extended: +1 week (custom field transformation)
- Phase 4 extended: +1 week (dynamic column creation)
- Phase 6 extended: +1 week (custom field testing)

**Status**: Approved - Major Feature Addition (2024-12-04)

**References**:
- Transformation Mapping Section 5 (Custom Field Mapping)
- Architecture Plan Phase Updates (10-week timeline)