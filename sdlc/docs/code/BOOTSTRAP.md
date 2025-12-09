# Project Online to Smartsheet ETL Tool - Bootstrap Guide

## Project Overview

This is a TypeScript/Node.js CLI application that performs Extract-Transform-Load (ETL) operations to migrate Microsoft Project Online data to Smartsheet workspaces. The tool extracts projects, tasks, resources, and assignments from Project Online's OData API and transforms them into structured Smartsheet workspaces with linked sheets and reference data.

**Core Purpose**: Automate migration of Project Online project data into Smartsheet's collaborative project management platform while preserving relationships, hierarchy, and metadata.

## Technology Stack

### Runtime & Language
- **Node.js**: >= 18.0.0 required
- **TypeScript**: 5.3.3 (compiled to ES2020, CommonJS modules)
- **Package Manager**: npm with package-lock.json

### Core Dependencies
- **@azure/msal-node** (2.6.0): Azure AD OAuth 2.0 authentication using MSAL (Microsoft Authentication Library)
- **axios** (1.6.7): HTTP client for Project Online OData API
- **commander** (12.0.0): CLI framework for command parsing and execution
- **smartsheet** (4.7.0): Official Smartsheet SDK for API operations
- **dotenv** (16.4.5): Environment variable management from .env files

### Development Dependencies
- **Jest** (29.7.0): Test framework with TypeScript support via ts-jest
- **ESLint** (8.56.0): Code linting with TypeScript parser
- **Prettier** (3.2.5): Code formatting
- **@types/***: Type definitions for all dependencies

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  (cli.ts - Command parsing, validation, execution)          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Orchestration Layer                        │
│  (importer.ts - Multi-stage ETL pipeline coordination)      │
└────┬─────────────┬──────────────┬──────────────────────────┘
     │             │              │
┌────▼────┐  ┌────▼─────┐  ┌─────▼────────────────────────────┐
│Transform│  │Transform │  │    Transformation Layer          │
│ Project │  │  Tasks   │  │  (ProjectTransformer, Task,      │
│         │  │          │  │   Resource, Assignment, PMO)     │
└────┬────┘  └────┬─────┘  └─────┬────────────────────────────┘
     │             │              │
┌────▼─────────────▼──────────────▼────────────────────────────┐
│                    API Client Layer                          │
│  (ProjectOnlineClient - OData, SmartsheetClient - REST)     │
└──────────────────────────────────────────────────────────────┘
```

### Component Organization

**`src/cli.ts`**: Entry point
- Command definitions (import, validate, config)
- Configuration initialization
- Error handling at top level

**`src/lib/importer.ts`**: ETL orchestrator
- Multi-stage progress reporting
- Sequential transformation: PMO Standards → Project → Tasks → Resources → Assignments
- Dependency injection for API clients

**`src/transformers/`**: Data transformation layer
- `ProjectTransformer`: Workspace and summary sheet creation
- `TaskTransformer`: Task sheet with hierarchy and dependencies
- `ResourceTransformer`: Resource sheet with contacts and types
- `AssignmentTransformer`: Dynamic assignment columns on task sheet
- `PMOStandardsTransformer`: Centralized reference sheets for picklists
- `utils.ts`: Shared transformation utilities

**`src/lib/`**: API clients
- `ProjectOnlineClient`: OData API with pagination, rate limiting, retry logic
- `auth/MSALAuthHandler`: Azure AD OAuth 2.0 token management

**`src/util/`**: Cross-cutting utilities
- `Logger`: Structured logging with levels
- `ErrorHandler`: Typed errors with actionable messages
- `ExponentialBackoff`: Retry logic with backoff
- `ConfigManager`: Environment variable management
- `ProgressReporter`: Multi-stage progress tracking
- `SmartsheetHelpers`: Re-run resiliency helpers

**`src/types/`**: Type definitions
- `ProjectOnline.ts`: OData entity types
- `Smartsheet.ts`: Smartsheet SDK types
- `SmartsheetClient.ts`: SDK interface types

## Key Design Patterns

### 1. ETL Pipeline Pattern
Multi-stage sequential processing with progress tracking:
1. **Extract**: Fetch data from Project Online OData API
2. **Transform**: Convert to Smartsheet structures
3. **Load**: Create workspaces, sheets, columns, rows

### 2. Dependency Injection
API clients and utilities are injected into classes:
```typescript
export class ProjectOnlineImporter {
  constructor(
    private smartsheetClient: SmartsheetClient,
    private projectOnlineClient: ProjectOnlineClient,
    private logger: Logger
  ) {}
}
```

### 3. Re-run Resiliency Pattern
All operations check for existing resources before creating:
- `getOrCreateSheet()`: Returns existing sheet or creates new
- `addColumnsIfNotExist()`: Skips columns that already exist
- `findSheetInWorkspace()`: Checks for sheet before creation
- `copyWorkspace()`: Template-based workspace creation
- `deleteAllRows()`: Clears data for fresh import while preserving structure

### 4. Template-Based Creation (Optional)
If `TEMPLATE_WORKSPACE_ID` environment variable is set:
- Copies pre-configured template workspace
- Template contains sheets with full column definitions
- Copy template, rename sheets, clear rows
- Faster and more reliable than creating from scratch

If `TEMPLATE_WORKSPACE_ID` is not set:
- Creates blank workspace from scratch
- Adds sheets and columns programmatically

### 5. Centralized PMO Standards
Single workspace contains reference sheets for all picklists:
- Project Status, Priority
- Task Status, Priority, Constraint Type
- Resource Type
- Strict picklists reference these sheets via CELL_LINK

### 6. Typed Error Handling
Custom error classes with actionable guidance:
- `ConfigurationError`: Configuration issues with resolution steps
- `ValidationError`: Data validation failures
- `ConnectionError`: Network/API issues
- `DataError`: Data transformation problems

### 7. Retry with Exponential Backoff
All API calls use retry logic:
- Configurable max retries (default: 3)
- Exponential delay with jitter
- Graceful degradation on permanent failures

## Data Flow

### Import Process Flow
```
1. Configuration Loading
   ↓
2. Authentication (Azure AD OAuth 2.0)
   ↓
3. PMO Standards Setup (create/verify reference sheets)
   ↓
4. Project Extraction (OData API)
   ↓
5. Workspace Creation (from template or new)
   ↓
6. Project Summary Sheet Population
   ↓
7. Task Import (with hierarchy via OutlineLevel)
   ↓
8. Resource Import (Work/Material/Cost types)
   ↓
9. Assignment Column Creation (dynamic based on resources)
   ↓
10. Picklist Configuration (link to PMO Standards)
```

### Data Transformations

**Priority Mapping** (0-1000 scale → 7 levels):
- 1000+: Highest
- 800-999: Very High
- 600-799: Higher
- 500-599: Medium
- 400-499: Lower
- 200-399: Very Low
- 0-199: Lowest

**Duration Conversion**:
- ISO 8601 Duration → Decimal days (8-hour workday)
- PT40H → 5.0 days
- P5D → 5.0 days

**Date Conversion**:
- ISO 8601 DateTime → YYYY-MM-DD (using UTC)

**Contact Objects**:
- Work resources → CONTACT_LIST with name and email
- Material/Cost → TEXT or PICKLIST values

**Constraint Types** (abbreviated):
- ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO

## Configuration

### Environment Variables (.env)
**Required:**
- `SMARTSHEET_API_TOKEN`: 26-character alphanumeric token
- `TENANT_ID`: Azure AD tenant ID (GUID)
- `CLIENT_ID`: Azure AD app registration ID (GUID)
- `CLIENT_SECRET`: Azure AD app secret

**Optional:**
- `PMO_STANDARDS_WORKSPACE_ID`: Existing PMO workspace (creates if not set)
- `LOG_LEVEL`: DEBUG, INFO, WARN, ERROR (default: INFO)
- `BATCH_SIZE`: API batch size (default: 100)
- `MAX_RETRIES`: Retry attempts (default: 3)
- `RETRY_DELAY`: Initial delay in ms (default: 1000)
- `DRY_RUN`: true/false (default: false)

### ProjectOnlineClient Defaults
- Timeout: 30000ms
- Max Retries: 3
- Rate Limit: 300 requests/minute
- Pagination: Automatic with `@odata.nextLink` support

## Testing Strategy

### Test Organization
- **Unit Tests**: `test/*.test.ts` - Individual transformer/utility tests
- **Integration Tests**: `test/integration/*.test.ts` - End-to-end scenarios
- **Mocks**: `test/unit/` - Mock API clients and builders
- **Fixtures**: `test/integration/helpers/` - OData and Smartsheet test data

### Test Patterns
1. **Builder Pattern**: ODataProjectBuilder, ODataTaskBuilder for test data
2. **Mock Clients**: MockODataClient, MockSmartsheetClient with spy tracking
3. **TDD Approach**: Test-first for integration tests (see `TDD_IMPLEMENTATION_PLAN.md`)
4. **Scenario-Based**: Realistic project scenarios (assignments, resources, tasks)

### Running Tests
```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests (requires .env.test)
```

## Common Workflows

### Adding a New Transformation
1. Define type in `src/types/ProjectOnline.ts`
2. Create transformer in `src/transformers/`
3. Add utilities to `src/transformers/utils.ts` if needed
4. Integrate into `src/lib/importer.ts` pipeline
5. Add tests in `test/unit/transformers/`
6. Update documentation in `sdlc/docs/project/`

### Adding a New API Client Method
1. Add method to `src/lib/ProjectOnlineClient.ts`
2. Implement with retry logic via ExponentialBackoff
3. Add rate limiting check
4. Add error handling with ErrorHandler
5. Add unit tests
6. Update type definitions if needed

### Debugging Import Issues
1. Enable debug logging: `LOG_LEVEL=DEBUG`
2. Check `.env` configuration with `npm run config`
3. Validate source data with `npm run validate`
4. Check Smartsheet API token permissions
5. Verify Azure AD authentication (check token expiration)
6. Review logs for specific error codes and actionable messages

## Performance Considerations

### Bottlenecks
- **API Rate Limits**: Smartsheet (300/min), Project Online (varies)
- **Network Latency**: Multiple API calls per entity
- **Large Datasets**: Batch operations for efficiency
- **Sheet Size Limits**: Smartsheet max 200,000 rows/sheet

### Optimizations
- Batch row creation (100 rows/request)
- Parallel sheet creation where possible
- Column map caching (avoid repeated API calls)
- Template workspace copying (vs creating from scratch)
- Re-run resiliency (skip existing resources)

## Security Considerations

### Credentials Management
- Never commit .env files
- Use environment variables in CI/CD
- Rotate API tokens and secrets regularly
- Azure AD app secret expiration monitoring

### API Token Permissions
- Smartsheet: Workspace creation, sheet management
- Project Online: Read access to Projects, Tasks, Resources, Assignments

### Logging
- Mask sensitive values in logs
- Token display: first 4 + last 4 characters only
- No passwords or secrets in error messages

## Troubleshooting

### Common Issues

**"Configuration Error: SMARTSHEET_API_TOKEN is required"**
- Copy `.env.sample` to `.env`
- Add valid 26-character token from Smartsheet

**"Authentication error: Failed to acquire token"**
- Check TENANT_ID, CLIENT_ID, CLIENT_SECRET
- Verify Azure AD app permissions
- Check client secret expiration

**"Rate limit exceeded"**
- Wait specified duration
- Reduce BATCH_SIZE
- Check rate limit status with API

**"Failed to create sheet"**
- Check workspace ID exists
- Verify API token has create permissions
- Check sheet name uniqueness

**Template workspace not found**
- Verify TEMPLATE_WORKSPACE_ID in .env is set to a valid workspace ID
- Ensure template has Summary, Tasks, Resources sheets
- Check API token has access to template workspace
- Or leave TEMPLATE_WORKSPACE_ID empty to create blank workspaces
- Check API token can access template

## Next Steps for New Developers

1. **Environment Setup**
   - Install Node.js 18+
   - Run `npm install`
   - Copy `.env.sample` to `.env` and configure
   
2. **Run Tests**
   - `npm test` to verify setup
   - Review test output for any failures

3. **Read Key Files**
   - `src/cli.ts` - Entry point
   - `src/lib/importer.ts` - Core orchestration
   - `src/transformers/ProjectTransformer.ts` - Example transformer

4. **Try Sample Import**
   - Use test data from `sample-workspace-info.json`
   - Run with `--dry-run` flag first
   - Check created workspace in Smartsheet

5. **Review Documentation**
   - Architecture: `sdlc/docs/architecture/`
   - Specifications: `sdlc/docs/specs/`
   - Project docs: `sdlc/docs/project/`

## References

- [Smartsheet API Documentation](https://smartsheet.redoc.ly/)
- [Project Online OData Reference](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/jj163015(v=office.15))
- [Azure MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Commander.js Documentation](https://github.com/tj/commander.js)

## Version Information

- **Project Version**: Check `package.json` version field
- **Node.js**: >= 18.0.0
- **TypeScript**: 5.3.3
- **Last Updated**: See git commit history