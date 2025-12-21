# System Patterns: Project Online to Smartsheet ETL

## Architectural Patterns

### ETL Pipeline Pattern
- **Extract**: API client with retry/backoff for Project Online oData
- **Transform**: Business logic layer for data mapping with validation
- **Load**: Smartsheet SDK integration with batch operations

### Configuration Pattern
- Environment-based configuration (.env)
- Git-ignored for security (API keys, credentials)
- Override capabilities for development/testing
- Per-customer configuration profiles

### Development Control Flow Pattern
- Incremental testing approach
- Configurable resource limits (e.g., fetch 1 item, then 10, then all)
- Position tracking in ETL loop
- Easy override for testing specific scenarios

## API Integration Patterns

### Project Online oData
- OAuth authentication (MSAL library)
- Pagination handling
- Rate limiting with exponential backoff
- Timeout management
- Recursive entity fetching (Projects → Tasks → Resources → Assignments)

### Smartsheet API
- Node.js SDK (TypeScript support)
- Batch operations where possible
- Error handling and retry logic
- Workspace/folder creation
- Sheet creation and data loading
- Rate limit: 300 requests/minute per token

## Data Transformation Patterns

### Entity Mapping Pattern
Workspace-based transformation preserving relationships:
```
Project → Workspace (1:1) + Optional Summary Sheet
Task → Project Sheet Row (with hierarchy via OutlineLevel, Gantt enabled)
Resource → Sheet Row (flat) with Contact objectValue
Assignment → MULTI_CONTACT_LIST columns in Tasks Sheet (embedded)
```

**Key Pattern Changes (2024-12-03)**:
- Project creates dedicated workspace (not folder)
- Tasks sheet is project sheet type (Gantt + dependencies)
- Assignments embedded as Contact List columns (not separate sheet)
- Resources provide contact objectValue for assignment columns

**Key Pattern Changes (2024-12-21) - Resource Type Separation**:
- Resources sheet separates resources by type into distinct columns
- Resource Name (TEXT_NUMBER, primary) - always populated for ALL resources
- Team Members (CONTACT_LIST, NOT primary) - for Work resources only
- Materials (TEXT_NUMBER) - for Material resources only
- Cost Resources (TEXT_NUMBER) - for Cost resources only
- Each resource populates Resource Name + exactly ONE type-specific column
- Tasks sheet assignment columns reference corresponding Resources columns

### Data Type Conversion Pattern
Standardized conversions for consistency:
- **Duration (Project Sheet)**: ISO 8601 → decimal days (e.g., `PT40H` → `5.0`)
- **Duration (Non-System)**: ISO 8601 → string with unit (e.g., `PT40H` → `"40h"`)
- **DateTime**: ISO 8601 → `YYYY-MM-DD` date format
- **Percentage**: Decimal (0-1) → percentage string (0-100%)
- **Priority**: Integer (0-1000) → picklist label (7 levels: Lowest/Very Low/Lower/Medium/Higher/Very High/Highest)
- **Currency**: Decimal → formatted currency string
- **Boolean**: true/false → human-readable labels (Active/Inactive, etc.)
- **Contact**: Name + Email → objectValue with both properties
- **GUID**: Preserve in hidden column + generate readable auto-number ID

### Relationship Preservation Pattern
Maintain entity relationships across transformation:
- **Parent-Child**: Task OutlineLevel → Smartsheet row hierarchy
- **Task Dependencies**: Parse predecessors → Smartsheet predecessor format
- **Resource Assignment**: Task.ResourceNames → Contact list with email lookup
- **Cross-References**: Store entity IDs for relationship mapping

### Naming Convention Pattern (REVISED 2024-12-03)
Consistent naming across all Smartsheet objects:
- **Workspaces**: `{ProjectName}` (sanitized, NO prefix, max 100 chars)
- **Sheets**: `{ProjectName} - {EntityType}` or `{EntityType}` (in workspace root, NO folders)
- **Auto-Number IDs**: `{PREFIX}-#####` where PREFIX is project name acronym (3-4 letters)
  - Special case: Project IDs use "Project" prefix
- **Columns**: Title Case with units in parentheses
- **Dual ID Columns**: "Project Online [Entity] ID" (hidden) + "[Entity] ID" (visible)
- **Contact Columns**: Single column with objectValue (not separate Name + Email)
- **Values**: Standardized formats (dates, currencies, percentages, durations)

**Sanitization Rules**:
- Remove invalid characters: `/\:*?"<>|` → `-`
- Consolidate multiple dashes to single dash
- Trim leading/trailing spaces and dashes
- Truncate if exceeds limits (workspace: 100 chars, sheets: 50 chars)

## Error Handling Patterns

### Transformation Error Pattern
- Missing required fields → Error with entity context
- Invalid data types → Warning + default value + continue
- Invalid references → Warning + null reference + continue
- String length exceeded → Truncate + log warning

### Validation Gate Pattern
Quality checks between ETL stages:
- **Post-Extract**: Verify all entities fetched, check required fields present
- **Post-Transform**: Validate transformed values, check relationships valid
- **Pre-Load**: Verify Smartsheet constraints, check column compatibility

### Resume Capability Pattern
Checkpoint-based recovery:
- Save state after each major operation
- Store entity counts and current position
- Include configuration snapshot
- Enable resume from any checkpoint

## Logging Patterns
- Progress indication (X of Y items processed)
- Current position in pipeline (stage, entity, batch)
- Performance metrics (time, throughput, API calls)
- Error logging with full context (entity ID, property, value)
- Debug mode for development (verbose transformation details)
- Transformation validation results

## Development Workflow Patterns
- Fast iteration cycle
- Test with minimal data first (1 entity)
- Gradually expand scope (10 entities → 100 entities → all)
- Override production limits for testing
- Clear separation of dev/test/prod configurations
- Validate transformations with sample data before full migration

## Quality Assurance Patterns

### Data Validation Pattern
Multi-stage validation approach:
1. Extract validation: Entity completeness, required fields
2. Transform validation: Data type conversions, value ranges
3. Load validation: Smartsheet constraints, relationship integrity

### Testing Pattern
Incremental validation strategy:
1. Unit tests: Individual transformation functions
2. Integration tests: End-to-end entity transformations
3. System tests: Full ETL pipeline with sample data
4. Production tests: Real customer data with PS team review

## New Patterns from Workspace Structure Revision (2024-12-03)

### Workspace-Per-Project Pattern
- Each Project Online project gets dedicated Smartsheet workspace
- Workspace name matches project name (sanitized, no prefix)
- Sheets placed directly in workspace root (no folders)
- Cleaner isolation and organization

### Project Sheet Configuration Pattern
- Tasks sheet must be configured as project sheet type
- System columns mapped via projectSettings payload
- Duration column uses decimal days (not string)
- Gantt and dependencies enabled by default
- Resource management disabled (using Contact List columns instead)

### Dual ID Column Pattern
- Preserve original GUID in hidden, locked column
- Generate human-readable auto-number ID with project prefix
- Prefix algorithm: acronym from project name (3-4 letters)
- Special handling for Project IDs (use "Project" prefix)

### Contact ObjectValue Pattern (Updated 2024-12-21)
- Combine Name + Email into contact objects
- Use objectValue property with email and name
- Multi-contact columns for Work resource assignments
- Eliminates need for separate Name and Email columns
- **Resource Type Separation**: Resources separated by type into distinct columns
  - Team Members column (CONTACT_LIST) for Work resources
  - Materials column (TEXT_NUMBER) for Material resources
  - Cost Resources column (TEXT_NUMBER) for Cost resources
  - Only ONE type-specific column populated per resource row

### Auto-Number Prefix Generation Pattern
Algorithm for generating project-specific prefixes:
1. Clean project name (remove special chars)
2. Split into words
3. Collect initials from words (up to 4)
4. If < 3 letters, supplement from first word
5. Uppercase all letters
6. Examples: "Website Redesign" → "WRE", "Q1 Planning" → "Q1P"

### Dual Date Column Pattern (System Columns)
Preserve original timestamps while leveraging Smartsheet system columns:
- **Project Online Created Date**: DATE column (user-settable, contains original PO timestamp)
- **Project Online Modified Date**: DATE column (user-settable, contains original PO timestamp)
- **Created Date**: CREATED_DATE system column (auto-populated by Smartsheet on row creation)
- **Modified Date**: MODIFIED_DATE system column (auto-populated by Smartsheet on row edit)
- **Created By**: CREATED_BY system column (auto-populated with creator contact)
- **Modified By**: MODIFIED_BY system column (auto-populated with last editor contact)

**Rationale**: System columns cannot be user-set, so dual columns preserve original Project Online timestamps while also tracking Smartsheet-native audit trail.

**Applies to**: All entity sheets (Projects, Tasks, Resources)

### Assignment Column Type Distinction Pattern (Updated 2024-12-21)
Differentiate column types based on resource category:

**Resources Sheet Structure**:
- **Team Members** (CONTACT_LIST, primary) → Work resources (people)
  - Contains contact objects with email and name properties
  - One column for all Work resources
  - Example: Alice Smith (alice@example.com)
- **Materials** (TEXT_NUMBER) → Material resources (equipment/consumables)
  - Contains resource names as plain text
  - One column for all Material resources
  - Example: Concrete Mix, Steel Beams
- **Cost Resources** (TEXT_NUMBER) → Cost resources (cost centers/budget)
  - Contains resource names as plain text
  - One column for all Cost resources
  - Example: Engineering Dept, Marketing Budget

**Tasks Sheet Assignment Columns**:
- **Assigned To** (MULTI_CONTACT_LIST) → references Team Members from Resources
  - Contains contact objects with email and name properties
  - Enables Smartsheet contact features (@mentions, notifications)
  - Sources from Team Members column in Resources sheet
- **Materials** (MULTI_PICKLIST) → references Materials from Resources
  - Contains resource names as strings
  - Multiple selection enabled
  - Sources from Materials column in Resources sheet
- **Cost Resources** (MULTI_PICKLIST) → references Cost Resources from Resources
  - Contains resource names as strings
  - Multiple selection enabled
  - Sources from Cost Resources column in Resources sheet

**Rationale**:
- Contact columns are specifically designed for people with email addresses
- Non-people resources use text columns in Resources sheet for simplicity
- Task assignment columns use picklists for Material/Cost resources for multi-selection
- Sheet references enable dropdown population from Resources sheet
- Mutually exclusive columns ensure each resource appears in only one column

**Cell Population**:
```typescript
// MULTI_CONTACT_LIST (Work resources)
cell.objectValue = {
    objectType: 'MULTI_CONTACT',
    values: [
        { email: 'john@example.com', name: 'John Doe' },
        { email: 'jane@example.com', name: 'Jane Smith' }
    ]
};

// MULTI_PICKLIST (Material/Cost resources)
cell.objectValue = {
    objectType: 'MULTI_PICKLIST',
    values: ['Crane A', 'Forklift B', 'Engineering Dept']
};
```

### Custom Field Discovery Pattern (2024-12-04)
Automated discovery and mapping of Project Online custom fields:

**Discovery Workflow**:
1. **Schema Discovery Phase**: Query metadata endpoint for custom field definitions
2. **Field Identification**: Pattern-based detection (Text1-30, Number1-20, Date1-10, Flag1-20, etc.)
3. **Display Name Retrieval**: Fetch human-readable names from configuration API
4. **Active Field Filtering**: Identify fields with actual data (skip empty fields)
5. **Column Generation**: Create Smartsheet columns with appropriate types

**Custom Field Type Mapping Pattern**:
```typescript
// Pattern-based type detection from field names
// 'ProjectText1' → TEXT_NUMBER (text field)
// 'TaskNumber1' → TEXT_NUMBER (number field)
// 'ProjectDate1' → DATE (date field)
// 'TaskFlag1' → CHECKBOX (boolean field)
// 'ProjectCost1' → TEXT_NUMBER (currency formatted)
// 'TaskDuration1' → TEXT_NUMBER (duration string)

// Picklist detection from data
const uniqueValues = discoverOptions(entities, fieldName);
if (isPicklist(uniqueValues)) {
    const columnType = 'PICKLIST' || 'MULTI_PICKLIST';
}
```

**Column Naming Pattern**:
- Display name if available: "Customer Name"
- Cleaned internal name if not: "Project Text 1"
- Add prefix for distinction: "Custom - Customer Name"
- Sanitize and truncate to 50 chars max

**Configuration Filtering Pattern**:
```typescript
// Filter custom fields by configuration
// - Exclude empty fields (all null values)
// - Apply regex include/exclude patterns
// - Limit to maximum fields per sheet
// - Prioritize by usage frequency
```

**Unsupported Custom Field Handling**:
- Formula fields: Store calculated value only (formula not preserved)
- Lookup fields: Store display value only (relationship not preserved)
- Rich text: Convert to plain text
- Cascading picklists: Flatten to single-level

**ETL Pipeline Integration**:
```
Schema Discovery → Custom Field Metadata
    ↓
Extraction → Entity Data + Custom Field Values
    ↓
Transformation → Type Conversion + Picklist Discovery
    ↓
Loading → Dynamic Column Creation + Data Population
```