**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Project Online Migration Overview](./01-project-online-migration-overview.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Data Transformation Guide →](./03-data-transformation-guide.md) |
|:---|:---:|---:|

</div>

---

# ETL System Design

**Status**: Production Implementation  
**Last Updated**: 2024-12-08

## Component Architecture

The ETL system is organized into six primary layers, each with specific responsibilities and clear boundaries.

### 1. CLI Interface Layer

**File**: [`src/cli.ts`](../../../src/cli.ts)

**Purpose**: User-facing command-line interface

**Commands**:

```bash
# Import command - Execute full migration
po-import import \
  --source <project-guid> \
  --destination <workspace-id> \
  [--dry-run] \
  [--verbose] \
  [--config <path>]

# Validate command - Check source data before migration
po-import validate \
  --source <project-guid> \
  [--verbose] \
  [--config <path>]

# Config command - Display current configuration
po-import config \
  [--config <path>]
```

**Key Responsibilities**:
- Parse command-line arguments (Commander.js)
- Load and validate configuration from .env files
- Initialize logging infrastructure
- Coordinate with importer layer
- Display progress and status to user
- Handle errors gracefully with actionable messages

**Technology**: Commander.js for argument parsing

### 2. Orchestration Layer

**File**: [`src/lib/importer.ts`](../../../src/lib/importer.ts)

**Purpose**: Orchestrate the complete ETL workflow

**Key Class**: `ProjectOnlineImporter`

**Key Methods**:
- `import(options)` - Execute full import workflow
- `validate(source)` - Validate source data
- `performImport(options)` - Internal import execution with error handling

**Workflow States**:
```
1. Initialization → Configuration validation
2. Extraction → Fetch entity data from Project Online
3. Transformation → Data mapping and validation
4. Loading → Write to Smartsheet
5. Completion → Cleanup and reporting
```

**Responsibilities**:
- Coordinate Extract → Transform → Load workflow
- Implement retry logic with exponential backoff
- Provide validation interface for pre-flight checks
- Error handling and reporting
- Dry-run mode support (preview without changes)

### 3. Extractor Layer

**File**: [`src/lib/ProjectOnlineClient.ts`](../../../src/lib/ProjectOnlineClient.ts)

**Purpose**: Extract data from Project Online oData API

**Key Class**: `ProjectOnlineClient`

**Authentication**:
- **Handler**: [`src/lib/auth/MSALAuthHandler.ts`](../../../src/lib/auth/MSALAuthHandler.ts)
- **Method**: Microsoft MSAL (OAuth 2.0)
- **Token Management**: Automatic caching and refresh

**Core Capabilities**:
- HTTP client using Axios for Project Online API
- Automatic pagination handling with `@odata.nextLink`
- Rate limiting (300 requests/minute default)
- Exponential backoff retry logic
- Connection testing and validation

**Key Methods**:
- `getProjects(options)` - Fetch all projects with OData query options
- `getProject(projectId)` - Fetch single project by GUID
- `getTasks(projectId, options)` - Fetch tasks for a project
- `getResources(options)` - Fetch all resources
- `getAssignments(projectId, options)` - Fetch assignments for a project
- `extractProjectData(projectId)` - Extract complete project data bundle
- `testConnection()` - Test API connectivity and authentication

**Entity Types Extracted**:
- Projects (single project by GUID)
- Tasks (all tasks for the project)
- Resources (all resources in organization)
- Assignments (all assignments for the project)

**Error Handling**:
- Retry with exponential backoff on transient failures
- Rate limit detection and automatic throttling
- Detailed error logging for troubleshooting
- Graceful degradation on partial failures

### 4. Transformer Layer

**Directory**: [`src/transformers/`](../../../src/transformers/)

**Purpose**: Convert Project Online entities to Smartsheet-compatible structures

**Transformer Classes**:

#### ProjectTransformer
**File**: [`ProjectTransformer.ts`](../../../src/transformers/ProjectTransformer.ts)

**Responsibilities**:
- Create workspace structure (using template or manual creation)
- Generate project summary sheet with metadata
- Validate project data
- Configure picklist references to PMO Standards

**Key Features**:
- Template-based workspace creation (efficient)
- Falls back to manual creation for testing
- Workspace name sanitization
- Cross-sheet picklist configuration

#### TaskTransformer
**File**: [`TaskTransformer.ts`](../../../src/transformers/TaskTransformer.ts)

**Responsibilities**:
- Define 18 task sheet columns
- Build individual task rows with proper hierarchy
- Map task status, priority, and constraints
- Parse and format predecessor relationships
- Configure picklist references to PMO Standards

**Key Features**:
- Hierarchical task structure via `OutlineLevel` and `ParentTaskId`
- Automatic Gantt and dependencies enablement
- Duration auto-calculated by Smartsheet
- Constraint type handling (8 types: ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
- Parent-child relationships using `parentId` in row structure
- Re-run resiliency (skips existing columns)

#### ResourceTransformer
**File**: [`ResourceTransformer.ts`](../../../src/transformers/ResourceTransformer.ts)

**Responsibilities**:
- Define 18 resource sheet columns
- Build individual resource rows
- Discover and populate department values
- Validate resource data
- Configure picklist references to PMO Standards

**Key Features**:
- Email column (separate from name)
- Resource type handling (Work, Material, Cost)
- Rate management (Standard, Overtime, Cost Per Use)
- Department picklist with discovered values
- MaxUnits conversion (decimal → percentage string)
- Re-run resiliency (skips existing columns)

#### AssignmentTransformer
**File**: [`AssignmentTransformer.ts`](../../../src/transformers/AssignmentTransformer.ts)

**Responsibilities**:
- Create assignment columns on task sheets based on resource types
- Group resources by type (Work vs Material/Cost)
- Generate one column per unique resource in assignments

**Critical Feature**: Type-based column distinction
- **Work resources** → `MULTI_CONTACT_LIST` columns (enables Smartsheet collaboration)
- **Material/Cost resources** → `MULTI_PICKLIST` columns (text-based selection)

**Key Features**:
- Dynamic column creation based on actual assignment data
- Re-run resiliency using `getOrAddColumn` helper
- Proper column type for people vs non-people resources

#### PMOStandardsTransformer
**File**: [`PMOStandardsTransformer.ts`](../../../src/transformers/PMOStandardsTransformer.ts)

**Purpose**: Manage PMO Standards workspace containing reference sheets for picklist values

**Reference Sheets Created/Managed**:
- Project - Status
- Project - Priority
- Task - Status
- Task - Priority
- Task - Constraint Type
- Resource - Type
- Resource - Department (discovered values)

**Benefits**:
- Enable strict picklists with cross-sheet references
- Centralized value management across all projects
- Single source of truth for organizational standards

#### Utility Functions
**File**: [`utils.ts`](../../../src/transformers/utils.ts)

**Common Transformations**:
- `sanitizeWorkspaceName()` - Clean workspace names
- `convertDateTimeToDate()` - ISO 8601 → YYYY-MM-DD
- `convertDurationToHoursString()` - ISO 8601 duration → hours
- `mapPriority()` - 0-1000 scale → 7-level picklist
- `createContactObject()` - Create Smartsheet contact object
- `createSheetName()` - Generate consistent sheet names

### 5. Smartsheet SDK Layer

**Integration**: Official Smartsheet SDK v3.0+

**Core Operations**:
- Workspace creation and management
- Sheet creation with column definitions
- Batch row insertion
- Column configuration (types, formats, references)
- Cross-sheet picklist references

**Rate Limiting**:
- SDK handles 300 requests/minute limit automatically
- Implements exponential backoff on rate limit responses
- Batch operations preferred for efficiency

**Error Handling**:
- Automatic retry on transient failures
- Rate limit detection and throttling
- Detailed error reporting for troubleshooting

### 6. Utility Layer

**Directory**: [`src/util/`](../../../src/util/)

**Key Utilities**:

- **ConfigManager** ([`ConfigManager.ts`](../../../src/util/ConfigManager.ts))
  - Load and validate .env configuration
  - Provide typed configuration access
  - Validate required credentials

- **Logger** ([`Logger.ts`](../../../src/util/Logger.ts))
  - Winston-based structured logging
  - Multiple output targets (console, file)
  - Configurable log levels (DEBUG, INFO, WARNING, ERROR)

- **ProgressReporter** ([`ProgressReporter.ts`](../../../src/util/ProgressReporter.ts))
  - Real-time progress feedback for CLI
  - Phase-based progress tracking
  - Estimated time remaining

- **ErrorHandler** ([`ErrorHandler.ts`](../../../src/util/ErrorHandler.ts))
  - Centralized error handling
  - Error categorization (validation, API, transformation)
  - User-friendly error messages

- **ExponentialBackoff** ([`ExponentialBackoff.ts`](../../../src/util/ExponentialBackoff.ts))
  - Configurable retry logic
  - Initial delay: 1 second (configurable)
  - Max delay: 30 seconds (configurable)
  - Max attempts: 3-5 (configurable)
  - Applied to all HTTP requests

- **SmartsheetHelpers** ([`SmartsheetHelpers.ts`](../../../src/util/SmartsheetHelpers.ts))
  - Re-run resiliency utilities
  - `getOrCreateSheet()` - Reuse existing sheets by name
  - `addColumnsIfNotExist()` - Skip columns that already exist
  - `getOrAddColumn()` - Single column addition with existence check

## CLI User Experience

### Command Structure

#### Basic Migration
```bash
# Full migration with default settings
npm start -- import --source <project-guid> --destination <workspace-id>

# With configuration file
npm start -- import --source <project-guid> --destination <workspace-id> --config .env.customer1

# Dry-run mode (preview without changes)
npm start -- import --source <project-guid> --destination <workspace-id> --dry-run

# Verbose logging for troubleshooting
npm start -- import --source <project-guid> --destination <workspace-id> --verbose
```

#### Validation
```bash
# Validate Project Online data before migration
npm start -- validate --source <project-guid>

# With verbose output
npm start -- validate --source <project-guid> --verbose
```

#### Configuration
```bash
# Display current configuration (validates .env)
npm start -- config

# With custom config file
npm start -- config --config .env.customer1
```

### Console Output Design

#### Successful Migration
```
[2024-12-08 10:30:00] INFO: Starting Project Online to Smartsheet Migration
[2024-12-08 10:30:01] INFO: Configuration loaded: .env
[2024-12-08 10:30:01] INFO: Mode: full | Dry Run: false

[2024-12-08 10:30:02] INFO: ========== EXTRACTION PHASE ==========
[2024-12-08 10:30:03] INFO: Authenticating to Project Online...
[2024-12-08 10:30:05] INFO: ✓ Authentication successful
[2024-12-08 10:30:05] INFO: Extracting project data...
[2024-12-08 10:30:08] INFO: ✓ Extracted project metadata
[2024-12-08 10:30:08] INFO: ✓ Extracted 25 tasks
[2024-12-08 10:30:09] INFO: ✓ Extracted 8 resources
[2024-12-08 10:30:10] INFO: ✓ Extracted 45 assignments
[2024-12-08 10:30:10] INFO: Extraction completed in 8s

[2024-12-08 10:30:11] INFO: ========== TRANSFORMATION PHASE ==========
[2024-12-08 10:30:11] INFO: Validating extracted data...
[2024-12-08 10:30:12] INFO: ✓ Data validation passed
[2024-12-08 10:30:12] INFO: Transforming project structure...
[2024-12-08 10:30:13] INFO: ✓ Project transformed
[2024-12-08 10:30:13] INFO: ✓ 25 tasks transformed
[2024-12-08 10:30:14] INFO: ✓ 8 resources transformed
[2024-12-08 10:30:14] INFO: Transformation completed in 3s

[2024-12-08 10:30:15] INFO: ========== LOADING PHASE ==========
[2024-12-08 10:30:15] INFO: Connecting to Smartsheet...
[2024-12-08 10:30:16] INFO: ✓ Smartsheet connection established
[2024-12-08 10:30:16] INFO: Creating workspace: Marketing Campaign Q1
[2024-12-08 10:30:18] INFO: ✓ Workspace created (ID: 1234567890)
[2024-12-08 10:30:18] INFO: Creating sheets...
[2024-12-08 10:30:22] INFO: ✓ Created 3 sheets
[2024-12-08 10:30:22] INFO: Loading data...
[2024-12-08 10:30:35] INFO: ✓ Loaded 25 tasks
[2024-12-08 10:30:35] INFO: Loading completed in 20s

[2024-12-08 10:30:36] INFO: ========== MIGRATION COMPLETE ==========
[2024-12-08 10:30:36] INFO: Total time: 31s
[2024-12-08 10:30:36] INFO: Summary:
[2024-12-08 10:30:36] INFO:   - Tasks: 25
[2024-12-08 10:30:36] INFO:   - Resources: 8
[2024-12-08 10:30:36] INFO:   - Assignments: 45
[2024-12-08 10:30:36] INFO: Workspace: https://app.smartsheet.com/workspaces/1234567890
```

#### Error Handling
```
[2024-12-08 10:35:42] ERROR: Failed to load data to sheet "Tasks"
[2024-12-08 10:35:42] ERROR: Error: Rate limit exceeded (429 Too Many Requests)
[2024-12-08 10:35:42] INFO: Retrying in 5 seconds... (Attempt 1/3)
[2024-12-08 10:35:47] INFO: Retry attempt 1...
[2024-12-08 10:35:49] INFO: ✓ Retry successful

# If retries exhausted:
[2024-12-08 10:36:30] ERROR: Failed to load data after 3 attempts
[2024-12-08 10:36:30] ERROR: Operation failed: Rate limit exceeded
[2024-12-08 10:36:30] ERROR: Please wait and retry the migration
```

## Dependencies and Integration Points

### External Dependencies

#### Node.js Packages
```json
{
  "dependencies": {
    "@azure/msal-node": "^2.6.0",
    "axios": "^1.6.0",
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "dotenv": "^16.3.0",
    "smartsheet": "^3.0.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0"
  }
}
```

**Key Package Purposes**:
- `axios` - HTTP client for oData API requests
- `dotenv` - .env configuration file management
- `smartsheet` - Official Smartsheet SDK
- `@azure/msal-node` - Microsoft Authentication Library
- `commander` - CLI argument parsing and command structure
- `winston` - Structured logging framework
- `chalk` - Terminal text formatting and colors
- `zod` - Runtime data validation and type safety

#### External APIs

**Project Online oData API**:
- **Authentication**: OAuth 2.0 (Microsoft Identity Platform)
- **Endpoint**: `https://{tenant}.sharepoint.com/sites/pwa/_api/ProjectData`
- **Rate Limits**: Varies by tenant, implement defensive retry logic
- **Documentation**: [Microsoft Project Online REST API Reference](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/jj163015(v=office.15))

**Smartsheet API**:
- **Authentication**: Access Token (Bearer auth)
- **SDK**: Official Node.js SDK v3.0+
- **Rate Limits**: 300 requests per minute per access token
- **Documentation**: [Smartsheet API Documentation](https://smartsheet.redoc.ly/)

### Integration Patterns

#### Authentication Flow
```
1. Load credentials from .env file
2. Authenticate to Microsoft Identity Platform (MSAL)
3. Obtain access token for Project Online
4. Validate Smartsheet access token
5. Test connectivity to both APIs
6. Proceed with ETL workflow
```

#### Data Flow with Checkpoints
```
Project Online → Extracted JSON → Transformed Data → Smartsheet
                  (in-memory)      (in-memory)
```

**Note**: Current implementation uses in-memory processing (suitable for typical project sizes). Checkpoint/resume capability planned for future enhancement.

#### Error Recovery
```
Error Detected → Log Error → Retry with Exponential Backoff → 
  Success: Continue workflow
  Failure: Report to user with actionable message
```

## Performance Considerations

### Smartsheet API Rate Limits

**Limit**: 300 requests/minute per access token

**Mitigation Strategies**:
- Batch operations for row creation (all rows at once per sheet)
- Sequential column operations (required by API)
- SDK automatic rate limit handling
- Exponential backoff on 429 responses

### Memory Management

**Current Approach**: In-memory processing
- Suitable for typical project sizes (< 1000 tasks)
- Fast and simple implementation
- No intermediate file I/O overhead

**For Large Projects** (> 1000 tasks):
- Level-by-level task hierarchy processing
- Batch row insertion to minimize memory footprint
- Considered acceptable for target use cases

### Network Resilience

**Implemented Patterns**:
- Exponential backoff on failures (ExponentialBackoff utility)
- Connection pooling (via Axios)
- Configurable timeout settings
- Automatic retry with increasing delays
- Rate limit detection and automatic throttling

### Re-run Resiliency

**Pattern**: Idempotent operations support running multiple times against same workspace

**Implementation**:
- `getOrCreateSheet()` - Reuses existing sheets by name
- `addColumnsIfNotExist()` - Skips columns that already exist
- `getOrAddColumn()` - Single column addition with existence check
- PMO Standards workspace creation is idempotent
- Template workspace copying only on first run

**Benefits**:
- Safe to re-run migrations if interrupted
- Can add new columns to existing sheets
- No data duplication or corruption
- Enables iterative development and testing

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Project Online API changes | High | Medium | Document API version, implement version detection |
| Smartsheet rate limiting | High | High | Use SDK rate limit handling, implement batching |
| Data mapping complexity | High | High | Comprehensive validation, quality gates |
| Network interruptions | Medium | Medium | Exponential backoff, idempotent operations |
| Large dataset memory | Medium | Low | Batch processing, level-by-level hierarchy |

### Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Configuration errors | High | Medium | Validation on startup, clear error messages |
| Credential management | High | Medium | Secure .env pattern, documentation |
| Support burden | Medium | Low | Comprehensive documentation, troubleshooting guides |

### Mitigation Strategies

1. **Comprehensive Testing**: Unit tests, integration tests, end-to-end tests
2. **Clear Documentation**: User guide, troubleshooting guide, configuration examples
3. **Defensive Programming**: Validate inputs, handle errors gracefully, log comprehensively
4. **Iterative Validation**: Test with sample projects, gather feedback, refine
5. **Monitoring**: Log all operations, track success rates, identify patterns

## Security

### Credential Management

**Best Practices**:
- All credentials in `.env` file (git-ignored via `.gitignore`)
- `.env.sample` provides template without secrets
- API tokens never logged or displayed
- Configuration validation on startup

### Data Handling

**Compliance**:
- No PII in logs (only entity counts and IDs)
- Secure transmission via HTTPS only
- Audit trail via Smartsheet system columns
- Read-only access to Project Online (no modifications)

### Access Control

**Requirements**:
- **Project Online**: Read access to ProjectData endpoint
- **Smartsheet**: API token with workspace creation permissions
- **PMO Standards**: Owner access to PMO Standards workspace (for picklist management)

## Next Steps

For detailed entity mapping specifications and transformation rules, see:
- **Next Document**: [Data Transformation Guide](./03-data-transformation-guide.md) - Complete mappings and output structure

---

<div align="center">

| [← Previous: Project Online Migration Overview](./01-project-online-migration-overview.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Data Transformation Guide →](./03-data-transformation-guide.md) |
|:---|:---:|---:|

</div>