# Active Context: Project Online to Smartsheet ETL

## Current Focus
Architecture and transformation specifications COMPLETE with TypeScript language conversion (2024-12-04). All code samples converted from Python to TypeScript. All user feedback incorporated including 7-level Priority mapping, assignment column type distinction, PMO Standards workspace for lookup fields, and auto-discovery of all custom fields. Specifications ready for stakeholder review. Implementation timeline: 10 weeks.

## Current Phase
Architecture & Design - Specification Complete

## Completed Architecture Work
- ✅ Architecture documentation consolidated into sequential guides (TypeScript):
  - [`01-project-online-migration-overview.md`](../sdlc/docs/architecture/01-project-online-migration-overview.md) - Business context, drivers, and technology stack
  - [`02-etl-system-design.md`](../sdlc/docs/architecture/02-etl-system-design.md) - Component architecture and CLI design
  - [`03-data-transformation-guide.md`](../sdlc/docs/architecture/03-data-transformation-guide.md) - Complete entity mappings and conversions
- ✅ CLI user experience designed with multiple operation modes
- ✅ ETL pipeline architecture defined (Extract → Transform → Load)
- ✅ Configuration management approach specified (.env with development controls)
- ✅ Development workflow controls planned (incremental testing, position tracking)
- ✅ Error handling and retry patterns designed
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

## Integration Test Setup Status (2025-12-15)

### Completed
- ✅ Azure AD app registration created
  - App Name: `Project Online ETL Integration Tests`
  - Tenant ID: `3836f4a1-67af-43f2-a675-f9f54899abe0`
  - Client ID: `3ea53d9f-c9bb-462e-aace-ab32982b693a`
- ✅ Client secret generated and configured
- ✅ `.env.test` file configured with all credentials
- ✅ Project Online URL configured: `https://smartsheet365.sharepoint.com/sites/pwa`
- ✅ Smartsheet API token configured
- ✅ Connection test script created (`npm run test:connection`)
- ✅ Permissions diagnostic script created
- ✅ Setup documentation created (`test/INTEGRATION_TEST_SETUP_GUIDE.md`)
- ✅ Documentation updated for non-admin users (admin consent workflow)

### Pending
- ⏳ **BLOCKED**: Waiting for Azure AD admin to grant consent for SharePoint API permission
  - Required permission: `Sites.ReadWrite.All` (Application permission)
  - Status: Admin request sent to IT department
  - Diagnostic shows: No roles/scopes in token (confirmation of missing consent)

### Test Infrastructure Status
- ✅ Integration test suite: 38/39 passing (97.4% success rate)
- ✅ PMO Standards integration: 8/8 tests passing
- ✅ Mock integration tests: Working with Smartsheet API
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