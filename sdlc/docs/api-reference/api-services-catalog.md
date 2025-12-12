**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Anti-Patterns](../code/anti-patterns.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Test Suite Guide →](../../test/README.md) |
|:---|:---:|---:|

</div>

---

# API Services Reference

This catalog provides a comprehensive reference for all APIs and services used by the Project Online to Smartsheet ETL application.

## External APIs

### Project Online OData API

**Primary API:** Microsoft Project Online REST API (OData v4)  
**Documentation:** [Project Online OData Reference](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/)  
**Base URL Pattern:** `https://{tenant}.sharepoint.com/sites/{site}/_api/ProjectData`

| Endpoint | HTTP Method | Purpose | Used By Components |
|----------|-------------|---------|-------------------|
| `/Projects` | GET | List all projects | [`ProjectOnlineClient.getProjects()`](../../src/lib/ProjectOnlineClient.ts:260) |
| `/Projects('{id}')` | GET | Get single project by ID | [`ProjectOnlineClient.getProject()`](../../src/lib/ProjectOnlineClient.ts:271) |
| `/Tasks` | GET | List all tasks | [`ProjectOnlineClient.getTasks()`](../../src/lib/ProjectOnlineClient.ts:287) |
| `/Resources` | GET | List all resources | [`ProjectOnlineClient.getResources()`](../../src/lib/ProjectOnlineClient.ts:309) |
| `/Assignments` | GET | List all assignments | [`ProjectOnlineClient.getAssignments()`](../../src/lib/ProjectOnlineClient.ts:320) |

#### OData Query Options

The API supports standard OData v4 query parameters:

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `$select` | Select specific fields | `?$select=Id,Name,StartDate` |
| `$filter` | Filter results | `?$filter=ProjectId eq guid'xxx'` |
| `$orderby` | Sort results | `?$orderby=Name asc` |
| `$top` | Limit results | `?$top=100` |
| `$skip` | Skip results (pagination) | `?$skip=100` |
| `$expand` | Expand related entities | `?$expand=Tasks` |

#### Pagination

- API returns paginated results automatically
- Response includes `@odata.nextLink` for next page
- Client handles pagination automatically via [`fetchAllPages()`](../../src/lib/ProjectOnlineClient.ts:217)

#### Rate Limiting

- **Default Limit:** 300 requests per minute (configurable)
- **Implementation:** Client-side rate limiting in [`checkRateLimit()`](../../src/lib/ProjectOnlineClient.ts:145)
- **Response Code:** 429 Too Many Requests
- **Retry-After Header:** Indicates wait time in seconds

#### Error Handling

| Status Code | Meaning | Client Handling |
|-------------|---------|-----------------|
| 200 OK | Success | Return data |
| 401 Unauthorized | Token expired | Clear cache, retry |
| 403 Forbidden | Insufficient permissions | Throw auth error with guidance |
| 404 Not Found | Resource doesn't exist | Throw not found error |
| 429 Too Many Requests | Rate limit exceeded | Wait and retry |
| 500+ Server Error | Server issue | Retry with backoff |

---

### Smartsheet API

**Primary API:** Smartsheet REST API v2.0  
**Documentation:** [Smartsheet API Documentation](https://smartsheet.redoc.ly/)  
**SDK:** [@smartsheet/smartsheet-javascript-sdk](https://www.npmjs.com/package/smartsheet) v4.7.0  
**Base URL:** `https://api.smartsheet.com/2.0`

| Service Area | Operations | Used By Components |
|--------------|-----------|-------------------|
| **Workspaces** | List, Create, Copy, Update | [`ProjectTransformer`](../../src/transformers/ProjectTransformer.ts), [`SmartsheetHelpers.copyWorkspace()`](../../src/util/SmartsheetHelpers.ts) |
| **Sheets** | List, Get, Create, Update, Rename, Delete | All transformers, [`SmartsheetHelpers`](../../src/util/SmartsheetHelpers.ts) |
| **Rows** | Add, Update, Delete, Bulk Operations | [`TaskTransformer`](../../src/transformers/TaskTransformer.ts), [`ResourceTransformer`](../../src/transformers/ResourceTransformer.ts), [`AssignmentTransformer`](../../src/transformers/AssignmentTransformer.ts) |
| **Columns** | Add, Update, Configure Picklists | All transformers, [`SmartsheetHelpers.addColumnsIfNotExist()`](../../src/util/SmartsheetHelpers.ts) |

#### Key Operations

**Workspace Operations:**
- `client.workspaces.copyWorkspace()` - Copy template workspace
- `client.workspaces.getWorkspace()` - Get workspace details
- `client.workspaces.listWorkspaces()` - List all workspaces

**Sheet Operations:**
- `client.sheets.createSheetInWorkspace()` - Create new sheet
- `client.sheets.getSheet()` - Get sheet with rows/columns
- `client.sheets.updateSheet()` - Update sheet properties
- `client.sheets.deleteSheet()` - Delete sheet

**Row Operations:**
- `client.sheets.addRows()` - Add rows (supports bulk)
- `client.sheets.updateRows()` - Update existing rows
- `client.sheets.deleteRows()` - Delete rows (supports bulk)

**Column Operations:**
- `client.sheets.addColumn()` - Add new column
- `client.sheets.updateColumn()` - Update column properties (including picklists)

#### Special Features Used

**Template Workspace:**
- Template ID: Configurable via `TEMPLATE_WORKSPACE_ID` environment variable (no default)
- If set: Contains pre-configured sheets (Summary, Tasks, Resources) for faster creation
- If not set: Creates blank workspace from scratch
- Set in `.env` file or leave empty to create blank workspaces
- Copied at workspace creation for consistency

**Picklist Configuration:**
- Type: `PICKLIST` with `strict: true`
- References PMO Standards workspace via `CELL_LINK`
- Centralized reference data for Status, Priority, Constraint Type

**Column Types Used:**
- `TEXT_NUMBER` - Standard text/number fields
- `DATE` - Date fields
- `CONTACT_LIST` - User/contact fields
- `PICKLIST` - Dropdown lists with strict validation
- `PREDECESSOR` - Task dependencies
- `DURATION` - Task duration (auto-calculated)
- `AUTO_NUMBER` - Auto-incrementing IDs
- `CREATED_DATE`, `MODIFIED_DATE` - System timestamps
- `CREATED_BY`, `MODIFIED_BY` - System user tracking

---

### Azure AD Authentication API

**Authority:** Microsoft Identity Platform  
**Documentation:** [Azure AD OAuth 2.0](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)  
**Implementation:** [@azure/msal-node](https://www.npmjs.com/package/@azure/msal-node) v2.6.0

| Endpoint | Purpose | Used By |
|----------|---------|---------|
| `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` | Acquire access token | [`MSALAuthHandler.acquireToken()`](../../src/lib/auth/MSALAuthHandler.ts:99) |

#### Authentication Flow

**Grant Type:** Client Credentials (service-to-service)

**Required Configuration:**
- `TENANT_ID` - Azure AD tenant ID (GUID)
- `CLIENT_ID` - Application (client) ID (GUID)
- `CLIENT_SECRET` - Client secret value (string)

**Token Request:**
```typescript
{
  scopes: [`{sharePointDomain}/.default`],
  grantType: 'client_credentials'
}
```

**Token Response:**
- `accessToken` - Bearer token for API calls
- `expiresOn` - Token expiration timestamp
- **Cache Duration:** Token cached with 5-minute expiration buffer

#### Required Azure AD Permissions

**API Permission:** SharePoint  
**Permission Name:** `Sites.ReadWrite.All` or `Sites.FullControl.All`  
**Type:** Application permission (not delegated)  
**Admin Consent:** Required

---

## Authentication & Authorization

### Project Online API Authentication

**Method:** OAuth 2.0 Bearer Token  
**Provider:** Azure AD (Microsoft Identity Platform)  
**Flow:** Client Credentials Grant

**Token Acquisition:**
1. Request token from Azure AD with SharePoint scope
2. Cache token until expiration (minus 5-minute buffer)
3. Attach as `Authorization: Bearer {token}` header
4. Auto-refresh on 401 response

**Implementation:** [`MSALAuthHandler`](../../src/lib/auth/MSALAuthHandler.ts)

### Smartsheet API Authentication

**Method:** Personal Access Token  
**Token Length:** 26 alphanumeric characters  
**Header:** `Authorization: Bearer {token}`

**Token Generation:**
1. Log into Smartsheet
2. Go to Account → Personal Settings → API Access
3. Generate New Access Token
4. Copy and store in `.env` as `SMARTSHEET_API_TOKEN`

**Security Notes:**
- Token has same permissions as user account
- Treat as password - never commit to source control
- Rotate regularly for security

---

## Rate Limiting

### Project Online OData API

**Limit:** 300 requests per minute (conservative default)  
**Actual Limit:** Varies by tenant (Microsoft doesn't publish exact limits)  
**Configuration:** `RATE_LIMIT_PER_MINUTE` environment variable

**Client-Side Throttling:**
```typescript
// Implemented in ProjectOnlineClient.checkRateLimit()
private requestCount: number = 0;
private requestWindowStart: number = Date.now();
// Tracks requests in 60-second sliding window
```

**Response Headers:**
- `Retry-After` - Seconds to wait before retry (on 429 response)

**Handling:**
- Client enforces rate limit proactively
- Waits for window reset if limit reached
- Automatically retries on 429 with backoff

### Smartsheet API

**Limit:** 300 requests per minute per access token  
**Documentation:** [Smartsheet Rate Limiting](https://smartsheet.redoc.ly/#section/API-Basics/Rate-Limiting)

**Response Headers:**
- `X-Rate-Limit-Limit` - Total requests allowed per minute
- `X-Rate-Limit-Remaining` - Requests remaining in current window
- `X-Rate-Limit-Reset` - Time when limit resets (Unix timestamp)

**Status Code:** 429 Too Many Requests

**Best Practices:**
- Batch operations when possible (add multiple rows in single call)
- Use bulk operations instead of loops
- Monitor rate limit headers

---

## Error Handling Standards

### HTTP Status Codes

| Code | Meaning | Response |
|------|---------|----------|
| 200 OK | Successful request | Return data |
| 400 Bad Request | Invalid parameters | Throw validation error |
| 401 Unauthorized | Authentication required | Refresh token, retry |
| 403 Forbidden | Insufficient permissions | Throw auth error with guidance |
| 404 Not Found | Resource not found | Throw not found error |
| 429 Too Many Requests | Rate limit exceeded | Wait and retry |
| 500 Internal Server Error | Server error | Retry with exponential backoff |
| 502 Bad Gateway | Gateway error | Retry with backoff |
| 503 Service Unavailable | Service down | Retry with backoff |

### Error Handling Pattern

**Implementation:** [`ErrorHandler`](../../src/util/ErrorHandler.ts)

All errors follow typed error pattern:
```typescript
class ImportError extends Error {
  code: string;        // Error code for programmatic handling
  actionable: string;  // User-friendly guidance
  details?: unknown;   // Additional context
}
```

**Error Factory Methods:**
- `configError()` - Missing/invalid configuration
- `validationError()` - Data validation failures
- `authError()` - Authentication/authorization issues
- `connectionError()` - Network connectivity problems
- `rateLimitError()` - API rate limiting
- `apiError()` - General API errors
- `dataError()` - Data transformation errors
- `networkError()` - Network timeouts/failures

### Retry Logic

**Implementation:** [`ExponentialBackoff`](../../src/util/ExponentialBackoff.ts)

**Configuration:**
- Max Retries: 3 (default, configurable)
- Initial Delay: 1000ms
- Max Delay: 30000ms (30 seconds)
- Backoff Strategy: Exponential with jitter

**Retry Conditions:**
- Network errors (ETIMEDOUT, ECONNREFUSED)
- Server errors (500, 502, 503)
- Rate limiting (429) with Retry-After header
- Transient failures

**Non-Retry Conditions:**
- Authentication errors (401, 403)
- Client errors (400, 404)
- Validation errors

---

## Development Environment

### Local Development

**API Endpoints:**
- Project Online: Production SharePoint URL
- Smartsheet: Production API (`https://api.smartsheet.com/2.0`)
- Azure AD: Production authority (`https://login.microsoftonline.com`)

**Note:** No sandbox/test environments - use test workspaces and projects

### Configuration

**Environment Variables:** (`.env` file)
```bash
# Project Online & Azure AD
TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=your_client_secret
PROJECT_ONLINE_URL=https://contoso.sharepoint.com/sites/pwa

# Smartsheet
SMARTSHEET_API_TOKEN=abc123...xyz (26 chars)
PMO_STANDARDS_WORKSPACE_ID=1234567890123456

# Optional
LOG_LEVEL=DEBUG
MAX_RETRIES=3
RATE_LIMIT_PER_MINUTE=300
```

### Testing

**Test Approach:**
- Unit tests: Mock API clients ([`MockODataClient`](../../test/unit/MockODataClient.ts), [`MockSmartsheetClient`](../../test/unit/MockSmartsheetClient.ts))
- Integration tests: Use real Smartsheet workspace (requires API token)
- Test data: Builder pattern for OData entities ([`test/unit/builders/`](../../test/unit/builders/))

**Test Workspace:**
- Use dedicated test workspace for integration tests
- Clean up after tests via [`cleanup-test-workspaces.ts`](../../scripts/cleanup-test-workspaces.ts)
- Sample workspace structure in [`sample-workspace-info.json`](../../sample-workspace-info.json)

---

## Usage in Component Documentation

When documenting API integrations in component specifications, use this format:

```markdown
## API Integrations

| Data | Service API Used | Notes |
|------|------------------|-------|
| Projects | Project Online OData `/Projects` | [API Docs](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/)<br/>Fetches all project metadata |
| Tasks | Project Online OData `/Tasks` | [API Docs](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/)<br/>Filtered by ProjectId |
| Workspace | Smartsheet `workspaces.copyWorkspace()` | [API Docs](https://smartsheet.redoc.ly/#operation/copy-workspace)<br/>Copies from template ID configured via TEMPLATE_WORKSPACE_ID env var |
```

---

## API Version Management

### Project Online OData API

**Version:** OData v4 (verbose format)  
**Accept Header:** `application/json;odata=verbose`  
**Stability:** Stable - part of SharePoint REST API  
**Breaking Changes:** Rare, communicated via Microsoft 365 roadmap

### Smartsheet API

**Version:** v2.0 (current)  
**Version in URL:** `https://api.smartsheet.com/2.0`  
**SDK Version:** 4.7.0 ([@smartsheet/smartsheet-javascript-sdk](https://www.npmjs.com/package/smartsheet))  
**Stability:** Stable with backward compatibility  
**Deprecation Policy:** 12-month notice for breaking changes

### Azure AD Authentication

**Version:** OAuth 2.0 (Microsoft Identity Platform v2.0)  
**Endpoint:** `/oauth2/v2.0/token`  
**MSAL Version:** 2.6.0 ([@azure/msal-node](https://www.npmjs.com/package/@azure/msal-node))  
**Stability:** Stable - enterprise authentication standard

---

## Maintenance & Updates

### Monitoring API Changes

**Project Online:**
- Monitor [Microsoft 365 Message Center](https://admin.microsoft.com/AdminPortal/Home#/MessageCenter)
- Review [SharePoint REST API updates](https://docs.microsoft.com/en-us/sharepoint/dev/general-development/sharepoint-rest-service)

**Smartsheet:**
- Monitor [Smartsheet Developer Blog](https://www.smartsheet.com/blog/category/developers)
- Review [API Changelog](https://smartsheet.redoc.ly/#section/API-Changelog)
- Watch [smartsheet-sdk-javascript releases](https://github.com/smartsheet/smartsheet-javascript-sdk/releases)

**Azure AD:**
- Monitor [Azure AD Updates](https://docs.microsoft.com/en-us/azure/active-directory/fundamentals/whats-new)
- Review [MSAL.js releases](https://github.com/AzureAD/microsoft-authentication-library-for-js/releases)

### Dependency Updates

Check for updates regularly:
```bash
npm outdated
npm update
npm audit
```

**Critical Dependencies:**
- `@azure/msal-node` - Security updates important
- `smartsheet` - API compatibility updates
- `axios` - Security and performance updates

---

## Performance Considerations

### Optimization Strategies

**Batch Operations:**
- Add multiple rows in single API call
- Update multiple cells simultaneously
- Use bulk delete operations

**Parallel Requests:**
```typescript
// Good: Parallel independent requests
const [tasks, resources] = await Promise.all([
  client.getTasks(projectId),
  client.getResources()
]);

// Bad: Sequential independent requests
const tasks = await client.getTasks(projectId);
const resources = await client.getResources();
```

**Pagination:**
- Client automatically handles pagination
- No manual page management needed
- All results returned in single response

**Caching:**
- Auth tokens cached until expiration
- Column maps cached during transformation
- Reuse connections when possible

### Performance Metrics

**Typical Import Times** (1000-task project):
- Authentication: ~1-2 seconds
- Project data extraction: ~30-60 seconds
- Workspace creation: ~5-10 seconds
- Data transformation: ~60-120 seconds
- Total: ~2-4 minutes

**Bottlenecks:**
- Network latency to APIs
- API rate limiting
- Large datasets (>5000 tasks)
- Sequential row additions

---

*Last Updated: 2025-12-08*

---

<div align="center">

| [← Previous: Anti-Patterns](../code/anti-patterns.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Test Suite Guide →](../../test/README.md) |
|:---|:---:|---:|

</div>