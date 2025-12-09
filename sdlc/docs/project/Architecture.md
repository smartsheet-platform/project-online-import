# Project Online to Smartsheet ETL - Architecture

## Overview

This document describes the architecture of the Project Online to Smartsheet ETL tool - a TypeScript/Node.js command-line application that migrates Microsoft Project Online data to Smartsheet.

**Purpose**: Enable repeatable customer onboarding as Microsoft Project Online reaches end-of-life.

**Primary Users**: Smartsheet Professional Services team

**Last Updated**: 2024-12-08

---

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                   CLI Interface                          │
│  - Command parsing (Commander.js)                        │
│  - Import and Validate commands                          │
│  - Progress reporting                                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              ProjectOnlineImporter                       │
│  - Orchestrates ETL workflow                             │
│  - Error handling and validation                         │
│  - Dry-run support                                       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
┌───────▼────────┐        ┌─────────▼────────┐
│   Extractors   │        │   Transformers   │
│                │        │                  │
│ (Future)       │        │ - Project        │
│ - OData Client │        │ - Task           │
│ - Auth Handler │        │ - Resource       │
│ - Pagination   │        │ - Assignment     │
└────────────────┘        │ - PMOStandards   │
                          │ - Utils          │
                          └─────────┬────────┘
                                    │
                          ┌─────────▼────────┐
                          │   Smartsheet SDK │
                          │                  │
                          │ - Workspace mgmt │
                          │ - Sheet creation │
                          │ - Row operations │
                          │ - Column config  │
                          └──────────────────┘
```

---

## Core Components

### 1. CLI Interface (`src/cli.ts`)

**Purpose**: User-facing command-line interface

**Commands**:
- `import` - Import data from Project Online to Smartsheet
  - `--source <url>` - Project Online project ID (GUID)
  - `--destination <id>` - Smartsheet workspace ID
  - `--dry-run` - Preview mode without making changes
  - `-v, --verbose` - Enable verbose logging
  - `--config <path>` - Path to .env configuration file
  
- `validate` - Validate Project Online data before import
  - `--source <url>` - Project Online project ID (GUID)
  - `-v, --verbose` - Enable verbose logging
  - `--config <path>` - Path to .env configuration file

- `config` - Validate and display current configuration
  - `--config <path>` - Path to .env configuration file

**Technology**: Commander.js for argument parsing

### 2. Importer Core (`src/lib/importer.ts`)

**Purpose**: Orchestrate the ETL workflow

**Key Responsibilities**:
- Coordinate extraction, transformation, and loading
- Manage dry-run mode
- Provide validation interface
- Error handling and reporting

**Key Methods**:
- `import(options)` - Execute full import workflow
- `validate(source)` - Validate source data
- `performImport(options)` - Internal import execution

### 3. Project Online Client (`src/lib/ProjectOnlineClient.ts`)

**Purpose**: Extract data from Project Online oData API

**Implemented Components**:
- `ProjectOnlineClient` - HTTP client using Axios for Project Online API
- `MSALAuthHandler` - Microsoft MSAL authentication (`src/lib/auth/MSALAuthHandler.ts`)
- Automatic pagination handling with `@odata.nextLink`
- Rate limiting (300 requests/minute default)
- Exponential backoff retry logic

**Key Methods**:
- `getProjects(options)` - Fetch all projects with OData query options
- `getProject(projectId)` - Fetch single project by GUID
- `getTasks(projectId, options)` - Fetch tasks for a project
- `getResources(options)` - Fetch all resources
- `getAssignments(projectId, options)` - Fetch assignments for a project
- `extractProjectData(projectId)` - Extract complete project data (project + tasks + resources + assignments)
- `testConnection()` - Test API connectivity and authentication

**Entity Types Extracted**:
- Projects (single project by GUID)
- Tasks (all tasks for the project)
- Resources (all resources in organization)
- Assignments (all assignments for the project)

### 4. Transformers (`src/transformers/`)

**Purpose**: Convert Project Online entities to Smartsheet format

#### ProjectTransformer (`ProjectTransformer.ts`)

Converts Project Online projects to Smartsheet workspaces and summary sheets.

**Template-Based Workspace Creation**:
- Uses template workspace (ID: 9002412817049476) for efficient workspace creation
- Template contains pre-configured sheets with all columns defined
- Sheets are renamed and cleared of data after copying
- Falls back to manual sheet creation for testing scenarios

**Key Functions**:
- `transformProjectToWorkspace()` - Create workspace structure
- `createProjectSummarySheet()` - Generate project summary sheet (legacy)
- `validateProject()` - Validate project data
- `configureProjectPicklistColumns()` - Configure picklist references to PMO Standards

**Class-Based API**:
- `ProjectTransformer` class for integration with importer
- `transformProject(project, workspaceId?)` - Main transformation method

**Output**:
- Smartsheet workspace (one per project)
- Three sheets per workspace:
  - Summary sheet (project metadata, 15 columns)
  - Task sheet (task hierarchy with Gantt)
  - Resource sheet (resource list)

#### TaskTransformer (`TaskTransformer.ts`)

Converts Project Online tasks to Smartsheet task sheet rows with hierarchy.

**Key Functions**:
- `createTasksSheetColumns()` - Define 18 task sheet columns
- `createTaskRow()` - Build individual task row
- `deriveTaskStatus()` - Map % complete to status
- `mapTaskPriority()` - Map priority (0-1000 → 7 levels)
- `parseTaskPredecessors()` - Parse predecessor strings
- `configureTaskPicklistColumns()` - Configure picklist references to PMO Standards

**Class-Based API**:
- `TaskTransformer` class for integration with importer
- `transformTasks(tasks, sheetId)` - Main transformation method
- Re-run resiliency: skips existing columns, supports multiple runs

**Features**:
- Hierarchical task structure via `OutlineLevel` and `ParentTaskId`
- Automatic dependencies enablement
- Duration auto-calculated by Smartsheet (not set directly)
- Predecessor relationship mapping
- Constraint type handling (8 types: ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
- Parent-child relationships using `parentId` in row structure

#### ResourceTransformer (`ResourceTransformer.ts`)

Converts Project Online resources to Smartsheet resource sheet rows.

**Key Functions**:
- `createResourcesSheetColumns()` - Define 18 resource sheet columns
- `createResourceRow()` - Build individual resource row (legacy)
- `discoverResourceDepartments()` - Extract unique department values
- `validateResource()` - Validate resource data
- `configureResourcePicklistColumns()` - Configure picklist references to PMO Standards

**Class-Based API**:
- `ResourceTransformer` class for integration with importer
- `transformResources(resources, sheetId)` - Main transformation method
- Re-run resiliency: skips existing columns, supports multiple runs

**Features**:
- Email column (separate from name)
- Resource type handling (Work, Material, Cost)
- Rate management (Standard, Overtime, Cost Per Use)
- Department picklist population (discovered values)
- MaxUnits conversion (decimal → percentage string)

#### AssignmentTransformer (`AssignmentTransformer.ts`)

Creates assignment columns on task sheets based on resource types.

**Critical Feature**: Type-based column distinction
- **Work resources** → `MULTI_CONTACT_LIST` columns (enables Smartsheet collaboration)
- **Material/Cost resources** → `MULTI_PICKLIST` columns (text-based selection)

**Class-Based API**:
- `AssignmentTransformer` class for integration with importer
- `transformAssignments(assignments, resources, taskSheetId)` - Create assignment columns
- Re-run resiliency: skips existing columns using `getOrAddColumn` helper

**Key Functions**:
- Groups resources by type (Work vs Material/Cost)
- Creates one column per unique resource in assignments
- Dynamic column creation based on actual assignment data

#### PMOStandardsTransformer (`PMOStandardsTransformer.ts`)

Manages PMO Standards workspace containing reference sheets for picklist values.

**Reference Sheets**:
- Project - Status
- Project - Priority
- Task - Status
- Task - Priority
- Task - Constraint Type
- Resource - Type
- Resource - Department

**Purpose**: Enable strict picklists with cross-sheet references

### 5. Utility Functions (`src/transformers/utils.ts`)

**Common Transformations**:
- `sanitizeWorkspaceName()` - Clean workspace names
- `convertDateTimeToDate()` - ISO 8601 → YYYY-MM-DD
- `convertDurationToHoursString()` - ISO 8601 duration → hours
- `mapPriority()` - 0-1000 scale → 7-level picklist
- `createContactObject()` - Create Smartsheet contact object
- `createSheetName()` - Generate consistent sheet names

---

## Data Flow

### ETL Pipeline

```
┌──────────────────┐
│  Project Online  │
│   (oData API)    │
└────────┬─────────┘
         │
         │ Extract (Future)
         ▼
┌──────────────────┐
│  Raw PO Entities │
│ - Projects       │
│ - Tasks          │
│ - Resources      │
│ - Assignments    │
└────────┬─────────┘
         │
         │ Transform
         ▼
┌──────────────────┐
│ Smartsheet Data  │
│ - Workspaces     │
│ - Sheets         │
│ - Rows           │
│ - Columns        │
└────────┬─────────┘
         │
         │ Load
         ▼
┌──────────────────┐
│   Smartsheet     │
│   (SDK API)      │
└──────────────────┘
```

### Transformation Details

1. **Workspace Creation**
   - One workspace per Project Online project
   - Name derived from project name (sanitized)

2. **Sheet Creation**
   - Summary sheet: Project metadata (15 columns)
   - Task sheet: Task hierarchy with Gantt (18+ columns)
   - Resource sheet: Resource list (18 columns)

3. **Row Population**
   - Summary: Single row with project data
   - Tasks: Hierarchical rows based on `OutlineLevel`
   - Resources: Flat list of resources

4. **Column Configuration**
   - Dynamic columns based on assignment types
   - Cross-sheet picklist references to PMO Standards
   - System columns (Created Date, Modified Date, etc.)

---

## Type System

### Project Online Types (`src/types/ProjectOnline.ts`)

Core entity interfaces matching oData API schema:
- `ProjectOnlineProject` - Project entity (24 properties)
- `ProjectOnlineTask` - Task entity (26 properties)
- `ProjectOnlineResource` - Resource entity (15 properties)
- `ProjectOnlineAssignment` - Assignment entity (14 properties)

### Smartsheet Types (`src/types/Smartsheet.ts`)

Simplified SDK types for transformation:
- `SmartsheetWorkspace` - Workspace container
- `SmartsheetSheet` - Sheet with columns and rows
- `SmartsheetColumn` - Column definition (30+ types)
- `SmartsheetRow` - Row with cells
- `SmartsheetCell` - Cell with value or objectValue

**Column Types**:
- `TEXT_NUMBER` - Generic text/number
- `DATE` - Date values
- `CONTACT_LIST` - Single contact
- `MULTI_CONTACT_LIST` - Multiple contacts
- `PICKLIST` - Single selection
- `MULTI_PICKLIST` - Multiple selection
- `CHECKBOX` - Boolean
- `PREDECESSOR` - Task dependencies
- `DURATION` - Time duration
- `AUTO_NUMBER` - Auto-generated IDs
- System columns: `CREATED_DATE`, `MODIFIED_DATE`, `CREATED_BY`, `MODIFIED_BY`

---

## Configuration

### Environment Variables

Configuration via `.env` file (git-ignored):

```bash
# Project Online Connection
TENANT_ID=your-azure-tenant-id
CLIENT_ID=your-azure-app-client-id
CLIENT_SECRET=your-azure-app-client-secret
PROJECT_ONLINE_URL=https://your-tenant.sharepoint.com/sites/pwa

# Smartsheet Connection
SMARTSHEET_API_TOKEN=your-access-token

# Optional: Use existing PMO Standards workspace instead of creating new
PMO_STANDARDS_WORKSPACE_ID=1234567890123456

# Development Controls (optional)
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
```

**Required Variables**:
- `TENANT_ID` - Azure AD tenant ID
- `CLIENT_ID` - Azure AD app registration client ID
- `CLIENT_SECRET` - Azure AD app registration client secret
- `PROJECT_ONLINE_URL` - Project Online site URL
- `SMARTSHEET_API_TOKEN` - Smartsheet API access token

**Optional Variables**:
- `PMO_STANDARDS_WORKSPACE_ID` - Reuse existing PMO Standards workspace

### Testing Configuration

Test environment uses separate configuration:
- `.env.test` - Test credentials
- `CLEANUP_TEST_WORKSPACES=true` - Auto-cleanup test data
- `TEST_WORKSPACE_PREFIX="ETL Test -"` - Identify test workspaces

---

## Error Handling

### Validation Strategy

**Three-tier validation**:
1. **Pre-transformation**: Validate raw Project Online data
2. **Post-transformation**: Validate Smartsheet data structures
3. **Pre-load**: Validate API constraints and relationships

### Error Types

**Validation Errors**:
- Missing required fields → Hard error, stop processing
- Invalid data types → Warning, use default value
- Out-of-range values → Warning, clamp to valid range

**API Errors**:
- Rate limiting → Retry with exponential backoff
- Network failures → Retry with backoff
- Authentication failures → Report and exit

**Data Quality Warnings**:
- Missing optional fields → Log warning, continue
- Unusual values → Log warning, continue
- Reference integrity → Log warning, continue

### Retry Logic

Uses `ExponentialBackoff` utility (`src/util/ExponentialBackoff.ts`):
- Initial delay: 1 second (configurable)
- Max delay: 30 seconds (configurable in ProjectOnlineClient)
- Max attempts: 3-5 (configurable)
- Exponential increase: 2x per attempt
- Applied to all HTTP requests in ProjectOnlineClient

---

## Testing Strategy

### Unit Tests (`test/transformers/`)

Test individual transformer functions:
- Data type conversions
- Validation rules
- Edge case handling
- Null/undefined handling

### Integration Tests (`test/integration/`)

Test against real Smartsheet API:
- Full workspace creation
- Sheet structure validation
- Row hierarchy verification
- Column type validation
- Assignment column handling

**Test Scenarios** (60+ defined):
- Basic project creation
- Task hierarchy (2-level, 5+ level)
- Priority mappings (7 levels)
- Resource type distinction (Work, Material, Cost)
- Date edge cases
- Unicode handling
- Performance (1000+ tasks)

### Test Infrastructure

**MockODataClient** (`test/mocks/MockODataClient.ts`):
- Simulates Project Online API responses
- Provides test fixtures
- Builder pattern for flexible test data

**SmartsheetSetup** (`test/integration/helpers/smartsheet-setup.ts`):
- Workspace management for tests
- Automatic cleanup of test data
- Sheet verification utilities

---

## Performance Considerations

### Smartsheet API Rate Limits

- 300 requests/minute per access token
- Batch operations preferred for row creation
- Column operations must be sequential

### Re-run Resiliency

The tool supports running multiple times against the same workspace:
- `getOrCreateSheet()` - Reuses existing sheets by name
- `addColumnsIfNotExist()` - Skips columns that already exist
- `getOrAddColumn()` - Single column addition with existence check
- Idempotent PMO Standards workspace creation
- Template workspace copying only on first run

### Memory Management

- Batch processing for row creation (all at once per sheet)
- Level-by-level task hierarchy processing to establish parent-child relationships
- In-memory processing (suitable for typical project sizes)

### Network Resilience

- Exponential backoff on failures
- Connection pooling
- Timeout configuration

---

## Security

### Credential Management

- All credentials in `.env` file (git-ignored)
- `.env.sample` provides template without secrets
- API tokens never logged

### Data Handling

- No PII in logs
- Secure transmission (HTTPS only)
- Audit trail via system columns

---

## Deployment

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Smartsheet API token
- Project Online API access (future)

### Installation

```bash
npm install
npm run build
```

### Execution

```bash
# Development mode
npm run dev -- import --source <url> --destination <id>

# Production mode
npm start -- import --source <url> --destination <id>

# Validation only
npm start -- validate --source <url>
```

---

## Future Enhancements

### Planned Features

1. **Enhanced Template Management**
   - Template workspace configuration
   - Custom column templates
   - Template versioning

2. **Advanced Transformations**
   - Custom field mapping
   - Formula preservation
   - Attachment handling
   - Baseline data migration

3. **Performance Optimization**
   - Parallel sheet processing
   - Streaming for very large datasets (>10,000 tasks)
   - Connection pooling for API requests

4. **Monitoring & Logging**
   - Detailed progress reporting
   - Performance metrics
   - Migration summary reports

---

## References

### Documentation
- [Smartsheet API Reference](https://smartsheet.redoc.ly/)
- [Project Online REST API](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/jj163015(v=office.15))
- [Architecture Plan](../architecture/project-online-smartsheet-etl-architecture-plan.md)
- [Transformation Mapping](../architecture/project-online-smartsheet-transformation-mapping.md)

### Key Files
- CLI: [`src/cli.ts`](../src/cli.ts)
- Importer: [`src/lib/importer.ts`](../src/lib/importer.ts)
- Transformers: [`src/transformers/`](../src/transformers/)
- Types: [`src/types/`](../src/types/)
- Tests: [`test/`](../test/)

---

**Document Version**: 1.1
**Last Updated**: 2024-12-08
**Status**: Current Implementation - Reflects actual codebase state including template-based workspace creation, full Project Online client implementation, and re-run resiliency features