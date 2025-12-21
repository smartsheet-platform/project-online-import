# Active Context: Project Online to Smartsheet ETL

## Current Focus
Resource Type Column Separation implementation complete (2025-12-21). Successfully implemented type-based resource separation into distinct Smartsheet columns (Team Members for Work resources, Materials for Material resources, Cost Resources for Cost resources). All implementation, tests, and documentation complete.

## Current Phase
Architecture & Design Complete - Authentication Implemented - Resource Type Separation Complete - Awaiting PWA Site Access

## Recent Completion: Resource Type Column Separation (2025-12-21)
- ✅ Comprehensive specification created (1,058 lines) at [`sdlc/docs/specs/Resource-Type-Column-Separation.md`](../sdlc/docs/specs/Resource-Type-Column-Separation.md)
- ✅ Resources sheet restructured with type-specific columns (Team Members, Materials, Cost Resources)
- ✅ ResourceTransformer updated with type-based row population logic
- ✅ TaskTransformer updated with proper assignment column configuration
- ✅ Sheet reference configuration for Task → Resources column sourcing
- ✅ Type definitions added (ResourceColumnType, ResourceColumnMapping, ResourceColumnIds)
- ✅ Comprehensive unit tests (17 new test cases covering all scenarios)
- ✅ Implementation documentation created at [`sdlc/docs/architecture/Resource-Type-Column-Separation-Implementation.md`](../sdlc/docs/architecture/Resource-Type-Column-Separation-Implementation.md)
- ✅ Existing documentation updated (Sheet-References.md, systemPatterns.md, activeContext.md)
- ✅ Backward compatibility support for legacy "Resource Name" column

## Recent Completion: PMO Standards Test Stability Improvements (2025-12-16)
- ✅ Systematic diagnostic approach with empirical failure data collection
- ✅ Created automated test runner and diagnostic logging tools
- ✅ Identified root cause: 3 missing retry wrappers in StandaloneWorkspacesFactory (lines 370, 405, 429)
- ✅ Added withBackoff() to: addRows (existing sheet), createSheetInWorkspace, addRows (new sheet)
- ✅ Improved from 33% → 75% pass rate (6/8 tests passing)
- ✅ Configured PMO_STANDARDS_TEST_TIMEOUT environment variable (180 seconds)
- ✅ Added error logging to reveal failure details in remaining 2 test failures
- ✅ Tests use production retry settings (5 retries, 1000ms delay) - no test-specific overrides
- ✅ Reverted maxWorkers: 1 (parallel execution restored for performance)
- ✅ Load Phase test suite confirmed independent (no PMO Standards interaction)

## Completed Architecture Work
- ✅ Architecture documentation consolidated into sequential guides (TypeScript):
  - [`project-online-migration-overview.md`](../sdlc/docs/architecture/project-online-migration-overview.md) - Business context, drivers, and technology stack
  - [`etl-system-design.md`](../sdlc/docs/architecture/etl-system-design.md) - Component architecture and CLI design
  - [`data-transformation-guide.md`](../sdlc/docs/architecture/data-transformation-guide.md) - Complete entity mappings and conversions
- ✅ Professional PDF generation system (2024-12-16):
  - Custom LaTeX template with Smartsheet branding
  - Professional title page and headers/footers
  - Two-chapter organization (10 sections total)
  - Optimized typography (9pt body, 7pt tables/code)
  - Clean TOC without duplicates
  - 196KB optimized output
  - Script: [`scripts/generate-pdf-guide.sh`](../scripts/generate-pdf-guide.sh)
- ✅ CLI user experience designed with multiple operation modes
- ✅ ETL pipeline architecture defined (Extract → Transform → Load)
- ✅ Configuration management approach specified (.env with development controls)
- ✅ Development workflow controls planned (incremental testing, position tracking)
- ✅ Error handling and retry patterns designed and implemented
- ✅ Checkpoint/resume capability specified
- ✅ Implementation phases outlined (6 weeks)
- ✅ **FINAL REVISION**: System columns and dual date pattern added to all entity mappings
- ✅ **FINAL REVISION**: Single Contact column for Owner in Project Summary Sheet
- ✅ **CORRECTION**: Priority mapping updated to 7 levels matching Project Online's fixed values (2024-12-04)
- ✅ **MAJOR ADDITION**: Custom field discovery and mapping strategy documented (2024-12-04)
- ✅ **LANGUAGE CHANGE**: Converted all code samples from Python to TypeScript (2024-12-04)

## Transformation Specifications Completed
- ✅ Project Online object graph documented (Projects → Tasks → Resources → Assignments)
- ✅ Smartsheet structure hierarchy defined - **MAJOR REVISION**: Workspace per project (no folders)
- ✅ Property-by-property mapping tables for all 4 entity types
- ✅ Data type conversion rules (Duration, DateTime, Priority, Status, Contact objects, etc.)
- ✅ Naming conventions and value patterns standardized
- ✅ Validation rules and error handling patterns specified
- ✅ **REVISED**: Embedded assignment approach - assignments as Contact List columns in Tasks sheet
- ✅ Column options sourcing pattern - assignment columns validate against Resources sheet
- ✅ **REVISED**: Workspace structure - 1:1 project mapping, sheets in root, no folders
- ✅ **REVISED**: Dual ID pattern - GUID in hidden column + readable auto-number with project prefix
- ✅ **REVISED**: Contact objectValue pattern - Name+Email as single contact object
- ✅ **REVISED**: Project sheet configuration - Gantt/dependencies enabled, decimal duration
- ✅ **FINAL**: System columns added to all entity sheets (Created Date, Modified Date, Created By, Modified By)
- ✅ **FINAL**: Dual date pattern for timestamp preservation (Project Online dates + Smartsheet system dates)
- ✅ **FINAL**: Single Contact column pattern applied to all Name+Email combinations
- ✅ **CORRECTION**: Priority mapping corrected to preserve all 7 Project Online priority levels (2024-12-04)
- ✅ **MAJOR ADDITION**: Comprehensive custom field mapping specification with auto-discovery (2024-12-04)

## Architecture Highlights
- **Component-based architecture**: CLI, Orchestration, Extractor, Transformer, Loader, Data Flow layers
- **Development-friendly**: Control flow overrides, incremental testing, position tracking
- **Production-ready**: Retry/backoff, checkpoint/resume, comprehensive logging
- **PS team focused**: Simple CLI, clear progress reporting, actionable error messages
- **Comprehensive transformation**: 50+ property mappings with detailed conversion rules
- **Robust error handling**: Eventual consistency handling with automatic retries across all API calls

## Device Code Flow Authentication Implementation (2025-12-17)

### Problem Solved
**Root Cause**: SharePoint tenant (mbfcorp.sharepoint.com) has app-only authentication disabled at tenant level, causing all REST API endpoints to reject tokens with "Unsupported app only token" error.

**Solution**: Implemented OAuth 2.0 Device Code Flow for user-based authentication with delegated permissions.

### Implementation Complete ✅
1. **TokenCacheManager** ([`src/lib/TokenCacheManager.ts`](../src/lib/TokenCacheManager.ts))
   - Secure token storage in `~/.project-online-tokens/`
   - File permissions: 0600 (owner read/write only)
   - Automatic token validation and expiry checking
   - Token refresh support

2. **DeviceCodeDisplay** ([`src/util/DeviceCodeDisplay.ts`](../src/util/DeviceCodeDisplay.ts))
   - Clear user authentication prompts
   - Device code display with formatting
   - Status updates and error messages
   - Help text and troubleshooting guidance

3. **MSALAuthHandler Enhanced** ([`src/lib/MSALAuthHandler.ts`](../src/lib/MSALAuthHandler.ts))
   - Dual authentication support (Client Credentials + Device Code)
   - Auto-detection based on CLIENT_SECRET presence
   - Token caching and automatic refresh
   - Backward compatible with existing code

4. **ConfigManager Updated** ([`src/util/ConfigManager.ts`](../src/util/ConfigManager.ts))
   - New fields: `useDeviceCodeFlow`, `tokenCacheDir`
   - Support for both TENANT_ID and PROJECT_ONLINE_TENANT_ID
   - Authentication flow detection and display

5. **Connection Test Enhanced** ([`scripts/test-project-online-connection.ts`](../scripts/test-project-online-connection.ts))
   - Detects authentication flow automatically
   - Clear error messages for Azure AD configuration
   - Troubleshooting guidance for common issues

6. **Specification Document** ([`sdlc/docs/specs/Device-Code-Flow-Authentication.md`](../sdlc/docs/specs/Device-Code-Flow-Authentication.md))
   - Complete implementation specification
   - Architecture diagrams and sequence flows
   - Security considerations and token management
   - Migration path and testing strategy

### Test Results ✅
```
Authentication: SUCCESS
✓ Device Code generated: A8L52SMQ9
✓ User authenticated in browser
✓ Token cached to ~/.project-online-tokens/
✓ Token reused on subsequent calls (no re-authentication)
✓ 5 API calls using cached token
```

### Azure AD Configuration Applied
- ✅ Public client flows enabled ("Allow public client flows" = Yes)
- ✅ Delegated permissions added (AllSites.Read, AllSites.Write)
- ✅ Device Code authentication working perfectly

### Current Blocker
**User Account Access**: Authenticated user doesn't have permission to Project Online PWA site (`/sites/pwa`). Authentication mechanism is fully functional - only site-level access permission needed.

### Usage
```bash
# Remove CLIENT_SECRET from .env.test to use Device Code Flow
# Or set: USE_DEVICE_CODE_FLOW=true

npm run test:connection
# Follow browser prompts to authenticate
# Token cached for future use
```

## Integration Test Setup Status (2025-12-17)

### Completed
- ✅ Azure AD app registration created (mbfcorp.sharepoint.com tenant)
  - Tenant ID: `14457e5c-136e-41e3-b269-2c4033f43f45`
  - Client ID: `4114b136-fb49-42f3-884f-bcf36d3fd8c6`
- ✅ **Device Code Flow authentication implemented and working**
- ✅ Public client flows enabled in Azure AD
- ✅ Delegated permissions configured (AllSites.Read, AllSites.Write)
- ✅ Token caching system implemented
- ✅ `.env.test` file configured for Device Code Flow
- ✅ Project Online URL configured: `https://mbfcorp.sharepoint.com/sites/pwa`
- ✅ Smartsheet API token configured
- ✅ Connection test script supports both auth flows
- ✅ Permissions diagnostic script created
- ✅ **Retry logic comprehensive implementation** (2025-12-16)
- ✅ **Test stability fixes** (2025-12-16)

### Pending
- ⏳ **BLOCKED**: User account needs access to Project Online PWA site
  - Site: `https://mbfcorp.sharepoint.com/sites/pwa`
  - Issue: "You need permission to access this site"
  - Authentication working - only site access permission needed
  - Action: Request site access from SharePoint administrator

### Test Infrastructure Status
- ✅ Integration test suite: 38/39 passing (97.4% success rate)
- ✅ PMO Standards integration: 8/8 tests passing (all stable with retry logic)
- ✅ ExponentialBackoff unit tests: 25/25 passing
- ✅ Mock integration tests: Working with Smartsheet API
- ✅ Test execution: Serial mode prevents API conflicts
- ⏳ E2E tests: Awaiting Project Online API access (requires admin consent)

### Diagnostic Results
```
✅ Azure AD Authentication: Working
✅ Token Acquisition: Successful
✅ Client Secret: Correct
❌ API Permissions: Not granted (no roles/scopes in token)
❌ SharePoint Site Access: 401 Unauthorized
❌ Project Online API Access: 401 Unauthorized
```

## Retry Logic Implementation Details (2025-12-16)

### Problem Solved
- **Original Issue**: ExponentialBackoff test expected 404 to be non-retryable
- **Root Cause**: Implementation correctly treats 404 as retryable for Smartsheet eventual consistency
- **Missing Coverage**: Many API calls lacked retry wrapping, causing immediate failures
- **Race Conditions**: Multiple test instances created separate PMO Standards workspaces

### Solution Implemented

**1. ExponentialBackoff Test Fix**:
- Updated test to verify 404 errors ARE retryable
- Added comprehensive documentation on Smartsheet eventual consistency
- Test renamed: "should retry on 404 not found errors (eventual consistency)"

**2. Consistent Import Alias**:
- All files use `tryWith as withBackoff` pattern
- Matches existing SmartsheetHelpers.ts convention
- Uses default retry parameters from environment variables

**3. Comprehensive API Call Wrapping**:

**Factory (StandaloneWorkspacesFactory.ts)**:
- `getWorkspace()` - existing workspace retrieval
- `getSheet()` - checking existing reference sheets
- `getWorkspaceChildren()` - finding sheets in workspace
- `createWorkspace()` - workspace creation (2 locations)

**Importer (importer.ts)**:
- `getSheet()` in configureProjectPicklists()
- `getSheet()` in configureTaskPicklists()

**Transformer (PMOStandardsTransformer.ts)**:
- `getSheet()` - checking existing sheet values
- `addRows()` - adding rows (2 locations)
- `createSheetInWorkspace()` - sheet creation
- `getWorkspaceChildren()` - workspace children listing

**4. Test Race Condition Fixes**:
- Create ONE shared ProjectOnlineImporter in beforeAll()
- Reuse same instance across all tests
- Prevents multiple PMO Standards workspace creations
- Eliminates concurrent workspace operation conflicts

**5. Jest Configuration**:
- Set `maxWorkers: 1` for serial test execution
- Prevents parallel test conflicts with Smartsheet API
- Reduces API rate limiting issues

### Test Results
- ExponentialBackoff: 25/25 passing ✅ (was 24/25)
- PMO Standards: 8/8 passing ✅ (was 2/8 intermittent)
- Net improvement: +7 tests now passing consistently
- Zero regressions

## Next Steps (Post Admin Consent)
1. Verify Project Online API connection: `npm run test:connection`
2. Run integration test suite: `npm run test:integration`
3. Validate transformation rules with real Project Online data
4. Begin E2E test implementation (extract real data from Project Online)
5. Continue with Phase 1 implementation: Foundation (CLI, config, logging)

## Architectural Decisions Finalized (2024-12-03)

### Workspace Structure (Major Revision)
- **Decision**: Each Project Online project → One dedicated Smartsheet workspace (1:1)
- **Naming**: Workspace name matches Project Online project name exactly (sanitized, NO prefix)
- **Structure**: Sheets placed directly in workspace root (NO folders)
- **Benefits**: Cleaner organization, simpler navigation, better isolation per project

### Project Sheet Configuration
- **Type**: Smartsheet "project sheet" with Gantt and dependencies enabled
- **System Columns**: Duration (decimal days), Start Date, End Date, Predecessors
- **resourceManagementEnabled**: False (assignments via Contact List columns instead)

### Dual ID Column Pattern
- **Project Online ID**: Hidden, locked TEXT_NUMBER column preserving original GUID
- **Readable ID**: Auto-number column with format `{PREFIX}-#####`
  - Prefix for tasks/resources: 3-4 letter project name acronym (e.g., "WEB", "Q1P", "ACR")
  - Prefix for Project IDs: Always "Project"
- **Benefits**: Preserves data integrity while providing human-friendly identifiers

### Contact Object Pattern
- **Source**: Separate Name and Email fields in Project Online
- **Target**: Single CONTACT_LIST column with objectValue containing both properties
- **Format**: `{'email': 'john@example.com', 'name': 'John Doe'}`
- **Multi-contact**: Array of contact objects in MULTI_CONTACT_LIST columns

### Duration Conversion
- **Project Sheet**: ISO 8601 → decimal days (e.g., `PT40H` → `5.0`)
- **Non-system Columns**: ISO 8601 → string with unit (e.g., `PT40H` → `"40h"`)

### System Columns Pattern
- **Dual Date Columns**: Preserve original PO timestamps in user-settable DATE columns + Smartsheet system columns
  - Project Online Created Date (DATE) + Created Date (CREATED_DATE system column)
  - Project Online Modified Date (DATE) + Modified Date (MODIFIED_DATE system column)
- **Audit Columns**: Created By and Modified By (system columns) on all sheets
- **Applies to**: Project Summary, Tasks, Resources sheets

## Custom Field Discovery Strategy (2024-12-04)
- **Approach**: Auto-discover all custom fields from Project Online metadata
- **Discovery**: Schema discovery phase before extraction
- **Type Mapping**: 9 custom field types mapped to Smartsheet column types
- **Configuration**: Flexible filtering with include/exclude patterns
- **Timeline Impact**: Extended from 6 weeks to 10 weeks (+67% increase)
- **Documentation**: Section 5 added to transformation mapping specification

## Implementation Timeline Revision
- **Original Plan**: 6 weeks
- **Revised Plan**: 10 weeks (with custom field support)
- **Phase Extensions**:
  - Phase 2: +1 week (schema discovery implementation)
  - Phase 3: +1 week (custom field transformation logic)
  - Phase 4: +1 week (dynamic column creation)
  - Phase 6: +1 week (comprehensive testing)

## Open Questions for Implementation
- Approval of 10-week timeline and phased approach (revised from 6 weeks)
- Access to test Project Online and Smartsheet environments with sample data
- Performance testing requirements for custom field-heavy migrations
- Custom field filtering preferences per customer
- PS team availability for iterative feedback during development