
**Date**: 2024-12-03  
**Status**: Draft - Ready for Review  
**Context**: Main Application Architecture

---

## Overview

### Purpose
Design and specify a command-line ETL tool for migrating Microsoft Project Online data to Smartsheet, enabling Smartsheet Professional Services teams to perform repeatable customer onboarding as Project Online reaches end-of-life.

### Business Context
- **Driver**: Microsoft Project Online EOL requiring customer migration
- **Primary Users**: Smartsheet Professional Services team
- **Use Case**: Repeatable, reliable data migration for multiple customers
- **Success Metric**: PS team can independently migrate customers with minimal technical support

### Technical Approach
TypeScript-based CLI tool implementing Extract-Transform-Load pattern:
- **Extract**: Project Online oData API with comprehensive entity fetching
- **Transform**: Configurable business logic for data mapping and transformation
- **Load**: Smartsheet SDK for workspace/sheet creation and data loading

---

## Requirements Analysis

### Functional Requirements

#### FR1: Data Extraction
- Authenticate to Project Online oData API
- Recursively fetch all relevant entities (projects, tasks, resources, assignments)
- Handle pagination and API limitations
- Support incremental/partial extraction for testing
- Resume capability on interruption

#### FR2: Data Transformation
- Map Project Online entities to Smartsheet structure
- Handle data type conversions
- Validate data integrity during transformation
- Support configurable transformation rules
- Preserve relationships between entities

#### FR3: Data Loading
- Create Smartsheet workspaces/folders per customer
- Create sheets with appropriate structure
- Batch-load data efficiently
- Maintain data relationships in Smartsheet
- Handle Smartsheet API rate limits

#### FR4: Configuration Management
- Support per-customer configuration via .env files
- Secure credential storage (git-ignored)
- Development vs. production configuration profiles
- Override capabilities for testing specific scenarios

#### FR5: Development Controls
- Limit data extraction during development (e.g., 1 item, 10 items, all items)
- Position tracking in ETL pipeline
- Easy override of production limits
- Fast iteration cycle for development

#### FR6: Operational Excellence
- Comprehensive logging at all stages
- Progress indication (X of Y items processed)
- Clear error messages for PS team
- Retry logic with exponential backoff
- Timeout handling

### Non-Functional Requirements

#### NFR1: Reliability
- Graceful error handling and recovery
- Resume capability on failure
- Data validation at each stage
- Transaction-like semantics where possible

#### NFR2: Performance
- Efficient API usage (batching, parallel requests where safe)
- Streaming/chunked processing for large datasets
- Minimal memory footprint
- Reasonable completion time for typical customer data volumes

#### NFR3: Security
- No credentials in source code or version control
- Secure storage of API tokens
- Audit logging of data access
- Compliance with data handling policies

#### NFR4: Maintainability
- Clear code organization
- Comprehensive documentation
- Easy configuration updates
- Extensible architecture for future enhancements

#### NFR5: Usability (for PS Team)
- Simple command-line interface
- Clear progress feedback
- Self-documenting configuration
- Troubleshooting guidance in error messages

---

## Proposed Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface                           │
│  - Argument parsing                                         │
│  - Configuration loading                                    │
│  - Progress reporting                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Orchestration Layer                        │
│  - ETL workflow coordination                                │
│  - Error handling and retry logic                           │
│  - Checkpoint/resume management                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼──────────┐  ┌──────────────────┐
│   Extractor    │  │   Transformer     │  │     Loader       │
│                │  │                   │  │                  │
│ - PO Auth      │  │ - Data mapping    │  │ - SS SDK client  │
│ - oData client │  │ - Validation      │  │ - Batch ops      │
│ - Pagination   │  │ - Rules engine    │  │ - Workspace mgmt │
│ - Retry/backoff│  │ - Relationship    │  │ - Error handling │
└───────┬────────┘  └────────┬──────────┘  └──────────┬───────┘
        │                    │                        │
┌───────▼────────────────────▼────────────────────────▼───────┐
│                    Data Flow Layer                           │
│  - In-memory or disk-based intermediate storage             │
│  - Data validation and quality checks                        │
│  - State management for resume capability                   │
└──────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. CLI Interface Module
**Responsibilities**:
- Parse command-line arguments
- Load and validate configuration
- Initialize logging
- Coordinate with orchestration layer
- Display progress and status

**Key Classes**:
- `CLIApp`: Main entry point
- `ConfigLoader`: Configuration management
- `ProgressReporter`: User feedback

**Configuration via CLI Args**:
```bash
node dist/index.js \
  --env-file .env.customer1 \
  --mode [full|test|validate] \
  --limit 10 \
  --log-level [DEBUG|INFO|WARNING|ERROR] \
  --resume-from checkpoint.json
```

#### 2. Orchestration Layer
**Responsibilities**:
- Coordinate Extract → Transform → Load workflow
- Implement retry logic with exponential backoff
- Manage checkpoints for resume capability
- Handle cross-cutting concerns (logging, error handling)

**Key Classes**:
- `ETLOrchestrator`: Main workflow coordinator
- `CheckpointManager`: State persistence
- `RetryHandler`: Retry logic with backoff

**Workflow States**:
1. Initialization → Configuration validation
2. Schema Discovery → Fetch custom field metadata (NEW)
3. Extraction → Fetch entity data from Project Online
4. Transformation → Data mapping and validation (including custom fields)
5. Loading → Write to Smartsheet (with dynamic columns)
6. Completion → Cleanup and reporting

#### 3. Extractor Module
**Responsibilities**:
- Authenticate to Project Online oData API
- Fetch metadata for custom field discovery (NEW)
- Fetch entities with pagination
- Handle rate limits and timeouts
- Support incremental extraction

**Key Classes**:
- `ProjectOnlineClient`: oData API client
- `OAuthHandler`: Authentication management
- `MetadataExtractor`: Custom field schema discovery (NEW)
- `EntityExtractor`: Entity-specific extraction logic
- `PaginationHandler`: Page-based data retrieval

**Extraction Strategy**:
```typescript
// Configurable entity extraction order
const extractionOrder: string[] = [
    'Projects',      // Top-level projects
    'Tasks',         // Tasks within projects
    'Resources',     // Resource pool
    'Assignments'    // Task-resource assignments
];
```

**Development Control Flow**:
```typescript
// Configuration examples
const EXTRACT_LIMIT = process.env.EXTRACT_LIMIT || 'all';  // 'all', '1', '10', '100'
const EXTRACT_PROJECTS = process.env.EXTRACT_PROJECTS || 'all';  // 'all' or specific IDs

// Custom field configuration (NEW)
const CUSTOM_FIELDS_ENABLED = process.env.CUSTOM_FIELDS_ENABLED || 'true';
const CUSTOM_FIELDS_FILTER_EMPTY = process.env.CUSTOM_FIELDS_FILTER_EMPTY || 'true';
const CUSTOM_FIELDS_MAX_PER_SHEET = process.env.CUSTOM_FIELDS_MAX_PER_SHEET || '50';
```

**Custom Field Discovery** (NEW):
```typescript
// Schema discovery phase
// 1. Fetch Project Online metadata (/_api/ProjectData/$metadata)
// 2. Parse custom field definitions per entity type
// 3. Fetch custom field display names (/_api/ProjectServer/CustomFields)
// 4. Filter out empty/unused custom fields
// 5. Store custom field schema for transformation
```

#### 4. Transformer Module
**Responsibilities**:
- Map Project Online entities to Smartsheet structure
- Map custom fields to Smartsheet columns (NEW)
- Validate and sanitize data (standard + custom fields)
- Apply transformation rules
- Preserve entity relationships

**Key Classes**:
- `DataMapper`: Entity-to-entity mapping
- `CustomFieldMapper`: Custom field transformation (NEW)
- `ValidationEngine`: Data quality checks
- `RelationshipManager`: Maintain entity relationships
- `TransformationRules`: Configurable transformation logic

**Mapping Examples**:
```typescript
// Standard field mappings
const projectMapping: Record<string, string> = {
    'Id': 'project_id',
    'Name': 'sheet_name',
    'StartDate': 'start_date',
    'FinishDate': 'end_date',
    // ... additional standard mappings
};

const taskMapping: Record<string, string> = {
    'Id': 'task_id',
    'Name': 'task_name',
    'Start': 'start_date',
    'Finish': 'end_date',
    'PercentComplete': 'percent_complete',
    // ... additional standard mappings
};

// Custom field mappings (NEW - dynamically generated)
interface CustomFieldMapping {
    column: string;
    type: string;
}

const customFieldMapping: Record<string, CustomFieldMapping> = {
    'ProjectText1': { column: 'Custom - Customer Name', type: 'TEXT_NUMBER' },
    'TaskNumber1': { column: 'Custom - Story Points', type: 'TEXT_NUMBER' },
    'ProjectDate1': { column: 'Custom - Contract End', type: 'DATE' },
    // ... additional custom mappings based on discovery
};
```

#### 5. Loader Module
**Responsibilities**:
- Initialize Smartsheet SDK client
- Create workspace/folder structure
- Create sheets with proper columns (standard + custom)
- Configure dynamic columns for custom fields (NEW)
- Batch-load data to sheets
- Handle Smartsheet API constraints

**Key Classes**:
- `SmartsheetClient`: SDK wrapper
- `WorkspaceManager`: Workspace/folder operations
- `SheetBuilder`: Sheet structure creation (with dynamic columns)
- `ColumnManager`: Dynamic column creation for custom fields (NEW)
- `DataLoader`: Batch data insertion

**Loading Strategy**:
```typescript
// Hierarchical creation with custom fields
// 1. Create workspace (if needed)
// 2. Create folders per project (if needed)
// 3. Create sheets with standard columns
// 4. Add dynamic custom field columns (NEW)
// 5. Configure picklist options for custom dropdown fields (NEW)
// 6. Batch-insert rows with all data
// 7. Update relationships/formulas
```

#### 6. Data Flow Layer
**Responsibilities**:
- Intermediate data storage (memory or disk)
- Data validation between stages
- State management for checkpoints
- Quality gates between ETL stages

**Key Classes**:
- `DataStore`: Intermediate storage abstraction
- `QualityGate`: Validation between stages
- `StateManager`: Checkpoint/resume state

---

## CLI User Experience Design

### Command Structure

#### Basic Usage
```bash
# Full migration with default settings
node dist/index.js --env-file .env.customer1

# Test mode with limited data
node dist/index.js --env-file .env.test --mode test --limit 1

# Validate configuration without running migration
node dist/index.js --env-file .env.customer1 --mode validate

# Resume from checkpoint
node dist/index.js --env-file .env.customer1 --resume-from checkpoint.json
```

#### Advanced Usage
```bash
# Extract only (for testing transformation logic separately)
node dist/index.js --env-file .env --stage extract --output extracted_data.json

# Transform only (using previously extracted data)
node dist/index.js --env-file .env --stage transform --input extracted_data.json --output transformed_data.json

# Load only (using previously transformed data)
node dist/index.js --env-file .env --stage load --input transformed_data.json

# Debug mode with verbose logging
node dist/index.js --env-file .env --log-level DEBUG --log-file migration.log
```

### Configuration File (.env)

```bash
# Project Online Connection
PROJECT_ONLINE_TENANT_ID=your-tenant-id
PROJECT_ONLINE_CLIENT_ID=your-client-id
PROJECT_ONLINE_CLIENT_SECRET=your-client-secret
PROJECT_ONLINE_SITE_URL=https://your-tenant.sharepoint.com/sites/pwa

# Smartsheet Connection
SMARTSHEET_ACCESS_TOKEN=your-access-token
SMARTSHEET_WORKSPACE_NAME=Customer Migration - ACME Corp
SMARTSHEET_FOLDER_PREFIX=Project-

# Migration Settings
EXTRACT_LIMIT=all  # 'all', '1', '10', '100', or specific number
EXTRACT_BATCH_SIZE=100
LOAD_BATCH_SIZE=50
RETRY_ATTEMPTS=3
RETRY_BACKOFF_SECONDS=5

# Custom Field Settings (NEW)
CUSTOM_FIELDS_ENABLED=true  # Enable/disable custom field discovery and mapping
CUSTOM_FIELDS_FILTER_EMPTY=true  # Skip custom fields with all null values
CUSTOM_FIELDS_PREFIX=Custom -  # Prefix for custom field column names
CUSTOM_FIELDS_MAX_PER_SHEET=50  # Maximum custom fields per sheet (Smartsheet limit: 400 total)
CUSTOM_FIELDS_EXCLUDE_PATTERN=  # Regex pattern to exclude specific custom fields
CUSTOM_FIELDS_INCLUDE_PATTERN=  # Regex pattern to include only specific custom fields

# Development Controls
DEV_MODE=false  # Set to true for development with limited extraction
TEST_PROJECT_IDS=  # Comma-separated project IDs for testing specific projects
SKIP_VALIDATION=false  # Skip validation gates (not recommended for production)

# Logging
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
LOG_FILE=migration.log
PROGRESS_UPDATE_INTERVAL=10  # Update progress every N items
```

### Console Output Design

#### Progress Reporting
```
[2024-12-03 10:30:00] INFO: Starting Project Online to Smartsheet Migration
[2024-12-03 10:30:01] INFO: Configuration loaded: .env.customer1
[2024-12-03 10:30:01] INFO: Mode: full | Extract Limit: all | Custom Fields: enabled

[2024-12-03 10:30:02] INFO: ========== SCHEMA DISCOVERY PHASE ==========
[2024-12-03 10:30:03] INFO: Authenticating to Project Online...
[2024-12-03 10:30:05] INFO: ✓ Authentication successful
[2024-12-03 10:30:05] INFO: Discovering custom fields...
[2024-12-03 10:30:08] INFO: ✓ Discovered 47 custom fields (23 Projects, 15 Tasks, 6 Resources, 3 Assignments)
[2024-12-03 10:30:08] INFO: Fetching custom field display names...
[2024-12-03 10:30:10] INFO: ✓ Retrieved display names for 42 fields
[2024-12-03 10:30:10] INFO: Schema discovery completed in 8s

[2024-12-03 10:30:11] INFO: ========== EXTRACTION PHASE ==========
[2024-12-03 10:30:11] INFO: Extracting Projects...
[2024-12-03 10:30:16] INFO: ✓ Extracted 15 projects (15/15)
[2024-12-03 10:30:16] INFO: Extracting Tasks...
[2024-12-03 10:31:51] INFO: ✓ Extracted 487 tasks (487/487)
[2024-12-03 10:31:51] INFO: Extracting Resources...
[2024-12-03 10:32:18] INFO: ✓ Extracted 23 resources (23/23)
[2024-12-03 10:32:18] INFO: Extracting Assignments...
[2024-12-03 10:33:34] INFO: ✓ Extracted 1,245 assignments (1,245/1,245)
[2024-12-03 10:33:34] INFO: Extraction phase completed in 3m 23s

[2024-12-03 10:33:29] INFO: ========== TRANSFORMATION PHASE ==========
[2024-12-03 10:33:29] INFO: Validating extracted data...
[2024-12-03 10:33:30] INFO: ✓ Data validation passed
[2024-12-03 10:33:30] INFO: Mapping projects...
[2024-12-03 10:33:31] INFO: ✓ Mapped 15 projects
[2024-12-03 10:33:31] INFO: Mapping tasks...
[2024-12-03 10:33:45] INFO: ✓ Mapped 487 tasks
[2024-12-03 10:33:45] INFO: Building relationships...
[2024-12-03 10:33:50] INFO: ✓ Relationships established
[2024-12-03 10:33:50] INFO: Transformation phase completed in 21s

[2024-12-03 10:33:51] INFO: ========== LOADING PHASE ==========
[2024-12-03 10:33:51] INFO: Connecting to Smartsheet...
[2024-12-03 10:33:52] INFO: ✓ Smartsheet connection established
[2024-12-03 10:33:52] INFO: Creating workspace: Customer Migration - ACME Corp
[2024-12-03 10:33:55] INFO: ✓ Workspace created (ID: 1234567890)
[2024-12-03 10:33:55] INFO: Creating project sheets...
[2024-12-03 10:34:30] INFO: ✓ Created 15 sheets (15/15)
[2024-12-03 10:34:30] INFO: Loading data to sheets...
[2024-12-03 10:36:15] INFO: ✓ Loaded 487 tasks (487/487)
[2024-12-03 10:36:15] INFO: Loading phase completed in 2m 24s

[2024-12-03 10:36:16] INFO: ========== MIGRATION COMPLETE ==========
[2024-12-03 10:36:16] INFO: Total time: 6m 11s
[2024-12-03 10:36:16] INFO: Summary:
[2024-12-03 10:36:16] INFO:   - Projects: 15
[2024-12-03 10:36:16] INFO:   - Tasks: 487
[2024-12-03 10:36:16] INFO:   - Resources: 23
[2024-12-03 10:36:16] INFO:   - Assignments: 1,245
[2024-12-03 10:36:16] INFO: Smartsheet workspace: https://app.smartsheet.com/workspaces/1234567890
[2024-12-03 10:36:16] INFO: Checkpoint saved: checkpoint_20241203_103616.json
```

#### Error Handling Output
```
[2024-12-03 10:35:42] ERROR: Failed to load data to sheet "Project Alpha"
[2024-12-03 10:35:42] ERROR: Error: Rate limit exceeded (429 Too Many Requests)
[2024-12-03 10:35:42] INFO: Retrying in 5 seconds... (Attempt 1/3)
[2024-12-03 10:35:47] INFO: Retry attempt 1...
[2024-12-03 10:35:49] INFO: ✓ Retry successful

# If retries exhausted:
[2024-12-03 10:36:30] ERROR: Failed to load data after 3 attempts
[2024-12-03 10:36:30] ERROR: Checkpoint saved: checkpoint_error_20241203_103630.json
[2024-12-03 10:36:30] ERROR: To resume: python po_to_smartsheet.py --env-file .env --resume-from checkpoint_error_20241203_103630.json
```

### Position Tracking and Resume

**Checkpoint Format** (JSON):
```json
{
  "timestamp": "2024-12-03T10:35:42Z",
  "stage": "load",
  "progress": {
    "projects_extracted": 15,
    "tasks_extracted": 487,
    "resources_extracted": 23,
    "assignments_extracted": 1245,
    "sheets_created": 12,
    "tasks_loaded": 350
  },
  "current_position": {
    "stage": "load",
    "entity": "tasks",
    "sheet_id": "5678901234",
    "last_successful_batch": 7
  },
  "config_snapshot": {
    "env_file": ".env.customer1",
    "extract_limit": "all"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Deliverables**:
- Project structure and dependencies
- Configuration management system
- Logging infrastructure
- CLI argument parsing
- Basic test framework

**Validation**:
- CLI accepts arguments correctly
- Configuration loads from .env
- Logging outputs to console and file

### Phase 2: Extraction (Week 2)
**Deliverables**:
- Project Online oData client
- OAuth authentication handler
- Pagination logic
- Entity extraction (Projects, Tasks, Resources, Assignments)
- Retry/backoff implementation
- Development control flow

**Validation**:
- Authenticate to Project Online successfully
- Extract single project with tasks
- Extract limited number of entities (test mode)
- Handle API errors gracefully

### Phase 3: Transformation (Week 3)
**Deliverables**:
- Data mapping engine
- Validation rules
- Relationship management
- Transformation rules configuration
- Data quality checks

**Validation**:
- Map Project Online entities to Smartsheet format
- Validate transformed data
- Preserve entity relationships
- Handle edge cases and data quality issues

### Phase 4: Loading (Week 4)
**Deliverables**:
- Smartsheet SDK integration
- Workspace/folder creation
- Sheet structure builder
- Batch data loader
- Rate limit handling

**Validation**:
- Create workspace and folders
- Create sheets with proper structure
- Load data in batches
- Handle Smartsheet API constraints

### Phase 5: Orchestration & Resume (Week 5)
**Deliverables**:
- ETL orchestrator
- Checkpoint/resume capability
- Progress reporting
- Error recovery
- End-to-end workflow

**Validation**:
- Complete migration workflow
- Resume from interruption
- Accurate progress reporting
- Proper error handling

### Phase 6: Testing & Documentation (Week 6)
**Deliverables**:
- Unit tests for all modules
- Integration tests for ETL workflow
- User documentation for PS team
- Configuration examples
- Troubleshooting guide

**Validation**:
- All tests pass
- Documentation reviewed by PS team
- Successful test migration with real customer data

---

## Dependencies and Integration Points

### External Dependencies

#### Node.js Packages
```json
{
  "dependencies": {
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "@azure/msal-node": "^2.6.0",
    "axios": "^1.6.0",
    "smartsheet": "^3.0.0",
    "dotenv": "^16.3.0",
    "commander": "^11.1.0",
    "winston": "^3.11.0",
    "chalk": "^5.3.0",
    "cli-progress": "^3.12.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "@types/cli-progress": "^3.11.5"
  }
}
```

**Package Explanations**:
- `axios`: HTTP client for oData API
- `dotenv`: .env configuration management
- `smartsheet`: Official Smartsheet SDK
- `@azure/msal-node`: Microsoft Authentication Library
- `commander`: CLI argument parsing
- `winston`: Structured logging
- `chalk`: Terminal text formatting
- `cli-progress`: Progress bars
- `zod`: Runtime data validation

#### External APIs

**Project Online oData API**:
- **Authentication**: OAuth 2.0 (Microsoft Identity Platform)
- **Endpoint**: `https://{tenant}.sharepoint.com/sites/pwa/_api/ProjectData`
- **Rate Limits**: Unknown - implement defensive retry logic
- **Documentation**: [Microsoft Project Online REST API Reference](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/jj163015(v=office.15))

**Smartsheet API**:
- **Authentication**: Access Token (Bearer auth)
- **SDK**: Official Python SDK
- **Rate Limits**: 300 requests per minute per access token
- **Documentation**: [Smartsheet API Documentation](https://smartsheet-platform.github.io/api-docs/)

### Integration Patterns

#### Authentication Flow
```
1. Load credentials from .env
2. Authenticate to Microsoft Identity Platform
3. Obtain access token for Project Online
4. Validate Smartsheet access token
5. Proceed with ETL workflow
```

#### Data Flow
```
Project Online → Extracted JSON → Transformed JSON → Smartsheet
                 (checkpoint)      (checkpoint)
```

#### Error Recovery
```
Error Detected → Log Error → Retry with Backoff → 
  Success: Continue
  Failure: Save Checkpoint → Report to User
```

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Project Online API changes or deprecation | High | Medium | Document API version, implement version detection, plan for alternatives |
| Project Online authentication complexity | Medium | High | Use established MSAL library, comprehensive testing, clear documentation |
| Project Online rate limiting | Medium | Medium | Implement exponential backoff, batch requests efficiently, respect API limits |
| Smartsheet rate limiting | High | High | Use SDK's built-in rate limit handling, implement batching, monitor usage |
| Data mapping complexity | High | High | Iterative testing, configurable mappings, validation at each stage |
| Large dataset memory issues | Medium | Medium | Stream/chunk processing, disk-based intermediate storage option |
| Network interruptions | Medium | Medium | Checkpoint/resume capability, idempotent operations where possible |
| Data quality issues | High | Medium | Comprehensive validation, quality gates, detailed error reporting |

### Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| PS team unfamiliar with CLI tools | Medium | Low | Clear documentation, simple interface, training session |
| Configuration errors | High | Medium | Validation on startup, clear error messages, example configs |
| Customer credential management | High | Medium | Secure .env pattern, documentation on credential handling |
| Support burden on engineering | Medium | Medium | Comprehensive documentation, troubleshooting guide, PS team training |

### Mitigation Strategies

1. **Comprehensive Testing**: Unit tests, integration tests, end-to-end tests with real data
2. **Clear Documentation**: User guide, troubleshooting guide, configuration examples
3. **Defensive Programming**: Validate inputs, handle errors gracefully, log comprehensively
4. **Incremental Rollout**: Test with small customers first, gather feedback, iterate
5. **Monitoring**: Log all operations, track success rates, identify common issues

---

## Success Criteria

### Technical Success Criteria
- [ ] Successfully authenticate to both Project Online and Smartsheet APIs
- [ ] Extract all relevant entities from Project Online with proper pagination
- [ ] Transform data accurately maintaining relationships
- [ ] Load data to Smartsheet creating proper structure
- [ ] Handle errors gracefully with retry logic
- [ ] Resume capability works after interruption
- [ ] Complete migration within reasonable time (< 1 hour for typical customer)
- [ ] All tests pass (unit, integration, end-to-end)

### User Experience Success Criteria
- [ ] PS team can run tool with minimal training
- [ ] Configuration is straightforward with clear examples
- [ ] Progress reporting provides confidence during migration
- [ ] Error messages are actionable and clear
- [ ] Documentation covers common scenarios and troubleshooting
- [ ] Tool operates reliably for various customer data profiles

### Business Success Criteria
- [ ] Reduce customer onboarding time by 80%
- [ ] PS team can perform migrations independently
- [ ] Migration success rate > 95%
- [ ] Customer data accurately migrated
- [ ] Minimal post-migration support required

---

## Next Steps

### Immediate Actions
1. **Review & Approval**: Present this architecture to stakeholders for feedback
2. **Technical Validation**: Validate assumptions about APIs with quick prototypes
3. **Resource Planning**: Assign development resources and timeline
4. **Environment Setup**: Prepare dev/test environments with API access

### Pre-Implementation Checklist
- [ ] Architecture reviewed and approved
- [ ] Project Online API access configured
- [ ] Smartsheet API access token obtained
- [ ] Development environment setup
- [ ] Test customer data identified
- [ ] Success criteria agreed upon

### Transition to Implementation
Once architecture is approved:
1. Create implementation plan breaking down into sprints
2. Delegate to `code` mode for Python development
3. Follow TDD approach with tests first
4. Iterative development: foundation → extraction → transformation → loading
5. Regular demos with PS team for feedback

---

## Appendices

### Appendix A: Project Online oData Entity Model

Key entities to extract:
- **Projects**: Top-level project containers
- **Tasks**: Individual work items within projects
- **Resources**: People/equipment available for work
- **Assignments**: Relationships between tasks and resources
- **Timephased Data**: Time-series data for tasks/assignments (optional)
- **Custom Fields**: Project-specific metadata

### Appendix B: Smartsheet Structure Mapping

Recommended Smartsheet structure:
```
Workspace: {Customer Name} Migration
├── Folder: Project-{ProjectName1}
│   ├── Sheet: Tasks
│   ├── Sheet: Resources
│   └── Sheet: Assignments
├── Folder: Project-{ProjectName2}
│   └── ...
└── Sheet: Migration Summary
```

### Appendix C: Development Environment Setup

```bash
# Install Node.js dependencies
npm install

# Copy example config
cp .env.sample .env

# Configure .env with test credentials
# (Instructions in README.md)

# Build TypeScript
npm run build

# Run in test mode
node dist/index.js --env-file .env --mode test --limit 1

# Or use ts-node for development
npm run dev -- --env-file .env --mode test --limit 1
```

### Appendix D: API Authentication Details

**Project Online OAuth Flow**:
1. Register app in Azure AD
2. Grant API permissions (Project Online)
3. Use client credentials flow
4. Cache and refresh tokens

**Smartsheet Authentication**:
1. Generate API access token in Smartsheet UI
2. Store in .env file
3. Use as Bearer token in all requests

---

**Document Status**: Ready for stakeholder review  
**Next Review Date**: After stakeholder feedback  
**Implementation Start**: After approval