# Active Context: Project Online to Smartsheet ETL

## Current Focus (2025-12-31)
**Project Online REST API Data Access Investigation**: Projects created in web UI not accessible via REST APIs despite successful authentication and connectivity.

## Current Phase
Architecture Complete - Authentication Working - **Investigating API Data Access Mismatch**

## Active Investigation: UI-Created Projects Not Visible via REST API

### Branch
`feature/real-project-online-test-data` (based on `fix/project-online-oauth-csom-endpoint`)

### Objective
Extract real Project Online data for integration test validation.

### Status: Blocked - API Access Issue

**Symptom:** Test project successfully created in Project Online web UI (ID: 100000, GUID: f0c13557-eae5-f011-9aac-00155d105101, Published 12/30/2025) but REST API query returns 0 projects and direct GUID fetch returns 404 "project does not exist".

**Working:**
- ✅ OAuth authentication (connection test passes)
- ✅ API connectivity (`/_api/ProjectServer/Projects` returns 200 OK)
- ✅ Project created and published in UI
- ✅ Project checked in (not in draft/edit mode)

**Not Working:**
- ❌ Query returns empty: `GET /_api/ProjectServer/Projects` → 0 projects
- ❌ Direct fetch fails: `GET /_api/ProjectServer/Projects('guid')` → 404
- ❌ All ProjectServer collections tested return empty or 404

**Question:** What API endpoint or method accesses projects created via Project Online web UI?

### Diagnostic Tools Created
- `scripts/extract-real-project-data.ts` - Main extraction tool
- `scripts/diagnose-api-endpoints.ts` - Tests multiple endpoints
- `scripts/check-all-collections.ts` - Checks ProjectServer collections
- `scripts/check-sharepoint-lists.ts` - Scans SharePoint lists
- `scripts/check-project-detail-pages.ts` - Inspects detail pages
- `sdlc/docs/project/Test-Project-Creation.md` - Manual creation guide

**Next:** Determine correct data access method for UI-created projects.

## Recent Completion: Project Online OAuth Authentication (2025-12-30) ✅
Switched from legacy OData (`/_api/ProjectData`) to modern CSOM API (`/_api/ProjectServer`). Connection test now passing!

**Root Cause**: Legacy OData Reporting API doesn't properly support OAuth bearer token authentication in SharePoint Permission Mode.

**Solution**: Changed API endpoint to `/_api/ProjectServer` which natively supports OAuth.

**Code Change**: [`src/lib/ProjectOnlineClient.ts`](../src/lib/ProjectOnlineClient.ts) line 80 - updated `getApiBaseUrl()`.

**Result**: Connection test passes, authentication working correctly.

## Recent Completion: Resource Type Column Separation (2025-12-21) - ALL TESTS PASSING ✅
- ✅ Resource Name (TEXT_NUMBER, primary) + Team Members (CONTACT_LIST) structure implemented
- ✅ Critical fix: Contact objects require objectType: 'CONTACT' wrapper (per Smartsheet SDK)
- ✅ ResourceTransformer: 21 columns with correct contact format
- ✅ TaskTransformer: Assignment column configuration
- ✅ Type definitions: objectType added to SmartsheetContact interface
- ✅ ALL unit tests passing: 162/162 (48 ResourceTransformer + 38 TaskTransformer + 76 others)
- ✅ PMO Standards integration tests: 8/8 passing
- ✅ Importer tests: 8/8 passing
- ✅ Template sheets migrated: Resources + Tasks sheets

## Integration Test Setup Status

### Completed
- ✅ Azure AD app registration (mbfcorp.sharepoint.com tenant)
- ✅ Device Code Flow authentication implemented and working
- ✅ Public client flows enabled, delegated permissions configured
- ✅ Token caching system implemented
- ✅ `.env.test` configured
- ✅ Project Online URL: `https://mbfcorp.sharepoint.com/sites/pwa`
- ✅ Connection test passing
- ✅ **Test project created in UI** (12/30/2025)

### Current Blocker
- ⏸️ **API Data Access**: UI-created projects not accessible via REST APIs
- ⏸️ **Investigation needed**: Determine correct access method

### Test Infrastructure Status
- ✅ Integration test suite: 38/39 passing (97.4% success rate)
- ✅ PMO Standards integration: 8/8 tests passing
- ✅ Existing test fixtures comprehensive and working
- ⏳ E2E with real data: Awaiting API access resolution

See: [INVESTIGATION-PROJECT-ONLINE-API-ACCESS.md](../INVESTIGATION-PROJECT-ONLINE-API-ACCESS.md) for complete diagnostic details.

## Architectural Decisions & Patterns

[Rest of file content remains unchanged...]
