# Device Code Flow Authentication Specification

**Status:** Draft  
**Created:** 2025-12-17  
**Author:** Project Online SDLC  
**Related Issue:** App-only authentication disabled on SharePoint tenant

---

## Executive Summary

This specification defines the implementation of Device Code Flow authentication to replace the current Client Credentials flow, enabling the Project Online migration tool to work with SharePoint tenants that have app-only authentication disabled.

### Problem Statement

The current authentication implementation uses Client Credentials flow (app-only authentication) which is rejected by SharePoint REST APIs with the error "Unsupported app only token." Testing confirmed that the SharePoint tenant (`mbfcorp.sharepoint.com`) has app-only access disabled at the tenant level, blocking all 8 tested API endpoints.

### Solution Overview

Implement Device Code Flow authentication that:
- Uses delegated permissions with user authentication
- Provides seamless CLI experience with device code display
- Caches tokens securely to minimize re-authentication
- Maintains backward compatibility with existing configuration

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Background and Context](#background-and-context)
- [Requirements](#requirements)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Configuration Changes](#configuration-changes)
- [User Experience](#user-experience)
- [Security Considerations](#security-considerations)
- [Testing Strategy](#testing-strategy)
- [Migration Path](#migration-path)
- [Success Metrics](#success-metrics)
- [Appendices](#appendices)

---

## Background and Context

### Current Authentication Flow

**Implementation:** Client Credentials Flow (OAuth 2.0)  
**File:** [`src/lib/MSALAuthHandler.ts`](../../src/lib/MSALAuthHandler.ts)  
**Method:** `acquireTokenByClientCredential()`

```typescript
// Current approach - app-only token
const tokenRequest: ClientCredentialRequest = {
  scopes: [`${sharePointDomain}/.default`],
};
const response = await this.confidentialClientApp.acquireTokenByClientCredential(tokenRequest);
```

**Permissions Used:**
- SharePoint `Sites.ReadWrite.All` (Application permission)

**Issue:**
- SharePoint tenant rejects all requests with "Unsupported app only token"
- Tenant-level policy blocks app-only authentication
- No REST API endpoints are accessible

### Investigation Results

**Testing Performed:** [`scripts/test-rest-api-alternatives.ts`](../../scripts/test-rest-api-alternatives.ts)  
**Endpoints Tested:** 8 different SharePoint and Project Online API endpoints  
**Success Rate:** 0/8 - All rejected with "Unsupported app only token"

**Tested Endpoints:**
1. `/_api/ProjectData/Projects` - ProjectData OData
2. `/_api/web` - SharePoint Web Properties
3. `/_api/web/lists` - SharePoint Lists
4. `/_api/site` - Site Information
5. `/_api/ProjectServer/Projects` - ProjectServer REST
6. `/_api/web/lists?$filter=BaseTemplate eq 150` - Project Lists
7. `/_api/search/query` - SharePoint Search
8. `/_api/contextinfo` - Context Info for POST operations

### Why Device Code Flow

**Device Code Flow vs Alternatives:**

| Flow | User Interaction | Local Server | CLI Friendly | Tenant Compatible |
|------|------------------|--------------|--------------|-------------------|
| **Client Credentials** | None | No | ✅ Excellent | ❌ Blocked by tenant |
| **Device Code** | One-time | No | ✅ Excellent | ✅ Works |
| **Authorization Code** | One-time | Yes | ⚠️ Port conflicts | ✅ Works |

**Selected:** Device Code Flow
- ✅ No local web server required
- ✅ Perfect for CLI applications
- ✅ Works with tenant security settings
- ✅ Simple user experience
- ✅ Token caching minimizes re-authentication

---

## Requirements

### Functional Requirements

#### FR-1: Device Code Authentication Flow
**Priority:** Must Have  
**Description:** Implement OAuth 2.0 Device Code Flow for user authentication

**Acceptance Criteria:**
- System initiates device code flow when access token needed
- Device code and user code URL displayed to user
- Application polls for user authentication completion
- Access token acquired upon successful authentication
- Refresh token stored for future use

#### FR-2: Token Caching
**Priority:** Must Have  
**Description:** Securely cache access tokens to minimize user authentication requests

**Acceptance Criteria:**
- Tokens cached to user's home directory (`~/.project-online-tokens/`)
- Cache includes access token, refresh token, and expiry timestamp
- Cached tokens used when valid (with 5-minute buffer)
- Tokens refreshed automatically when expired
- Cache cleared on authentication failure

#### FR-3: Delegated Permissions
**Priority:** Must Have  
**Description:** Switch from Application permissions to Delegated permissions

**Acceptance Criteria:**
- Azure AD app configured with SharePoint delegated permissions
- Scopes requested: `AllSites.Read`, `AllSites.Write`
- User consent flow handled properly
- Permissions validated during authentication

#### FR-4: Interactive User Experience
**Priority:** Must Have  
**Description:** Provide clear user experience for authentication

**Acceptance Criteria:**
- Clear instructions displayed when authentication required
- Device code and URL prominently shown
- Progress indicator while waiting for authentication
- Success/failure messages clear and actionable
- Re-authentication flow handles expired tokens gracefully

#### FR-5: Backward Compatibility
**Priority:** Should Have  
**Description:** Maintain compatibility with existing configuration

**Acceptance Criteria:**
- Existing `.env` configuration variables still work
- No breaking changes to public APIs
- Graceful fallback if client secret still provided
- Migration guide provided for users

### Non-Functional Requirements

#### NFR-1: Security
- Tokens stored with restrictive file permissions (600)
- Tokens encrypted at rest using native OS security
- No tokens logged or displayed except for debugging
- Secure token refresh without re-authentication

#### NFR-2: Performance
- Initial authentication completes within 60 seconds
- Token refresh completes within 3 seconds
- Cached token retrieval completes within 100ms
- No performance impact on subsequent API calls

#### NFR-3: Reliability
- Handles network failures during authentication
- Retries authentication polling with exponential backoff
- Clear error messages for all failure scenarios
- Automatic token refresh on expiration

#### NFR-4: Usability
- Authentication required only once per token lifetime (typically 1 hour)
- Clear instructions for first-time users
- Minimal disruption to existing workflows
- Help text available for authentication issues

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Application                          │
│  (src/cli.ts, src/index.ts)                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ requires token
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               MSALAuthHandler (Enhanced)                     │
│  - Device Code Flow                                          │
│  - Token Cache Manager                                       │
│  - Token Refresh Logic                                       │
└────────────────┬───────────────────┬────────────────────────┘
                 │                   │
     ┌───────────▼─────────┐    ┌────▼──────────────┐
     │  MSAL Public Client │    │   Token Cache     │
     │  (Device Code Flow) │    │  ~/.project-      │
     │                     │    │   online-tokens/  │
     └──────────┬──────────┘    └───────────────────┘
                │
                │ authenticates with
                ▼
     ┌─────────────────────────┐
     │  Microsoft Identity      │
     │  Platform (Azure AD)     │
     │  https://login.          │
     │  microsoftonline.com     │
     └──────────┬───────────────┘
                │
                │ issues token for
                ▼
     ┌─────────────────────────┐
     │  SharePoint Online       │
     │  REST API                │
     │  Project Online API      │
     └──────────────────────────┘
```

### Authentication Sequence

```
User               CLI Tool           MSAL            Azure AD        SharePoint
 │                    │                 │                 │                │
 │  run command       │                 │                 │                │
 │───────────────────>│                 │                 │                │
 │                    │                 │                 │                │
 │                    │ check cache     │                 │                │
 │                    │────────────────>│                 │                │
 │                    │ no valid token  │                 │                │
 │                    │<────────────────│                 │                │
 │                    │                 │                 │                │
 │                    │ start device flow                 │                │
 │                    │─────────────────────────────────>│                │
 │                    │                 │  device_code    │                │
 │                    │                 │  user_code      │                │
 │                    │<─────────────────────────────────│                │
 │                    │                 │                 │                │
 │<──────────────────────────────────────────────────────┤                │
 │  Display:                            │                 │                │
 │  Go to: https://microsoft.com/devicelogin             │                │
 │  Enter code: ABCD-1234               │                 │                │
 │                                      │                 │                │
 │  [User opens browser]                │                 │                │
 │  [User enters code]                  │                 │                │
 │  [User signs in]                     │                 │                │
 │──────────────────────────────────────────────────────>│                │
 │                                      │                 │                │
 │                    │ poll for token  │                 │                │
 │                    │─────────────────────────────────>│                │
 │                    │                 │ authorization_  │                │
 │                    │                 │ pending...      │                │
 │                    │<─────────────────────────────────│                │
 │                    │ [wait 5s]       │                 │                │
 │                    │                 │                 │                │
 │  [authentication complete]           │                 │                │
 │<─────────────────────────────────────────────────────│                │
 │                    │                 │                 │                │
 │                    │ poll for token  │                 │                │
 │                    │─────────────────────────────────>│                │
 │                    │                 │  access_token   │                │
 │                    │                 │  refresh_token  │                │
 │                    │<─────────────────────────────────│                │
 │                    │                 │                 │                │
 │                    │ cache tokens    │                 │                │
 │                    │────────────────>│                 │                │
 │                    │                 │                 │                │
 │                    │ make API call with token         │                │
 │                    │──────────────────────────────────────────────────>│
 │                    │                 │                 │  200 OK        │
 │                    │<──────────────────────────────────────────────────│
 │                    │                 │                 │                │
 │  ✓ Success         │                 │                 │                │
 │<───────────────────│                 │                 │                │
```

### Token Cache Structure

**Cache Location:** `~/.project-online-tokens/{tenant-id}.json`

**Cache Format:**
```json
{
  "version": "1.0",
  "tenant_id": "14457e5c-136e-41e3-b269-2c4033f43f45",
  "client_id": "4114b136-fb49-42f3-884f-bcf36d3fd8c6",
  "access_token": "eyJ0eXAiOiJKV1QiLCJub...",
  "refresh_token": "0.AXwAXH5FFL4T40...",
  "expires_on": "2025-12-17T22:30:00.000Z",
  "cached_at": "2025-12-17T21:30:00.000Z",
  "scopes": ["AllSites.Read", "AllSites.Write"]
}
```

**File Permissions:** `0600` (owner read/write only)

---

## Implementation Details

### Code Changes Required

#### 1. MSALAuthHandler Modifications

**File:** `src/lib/MSALAuthHandler.ts`

**Current Implementation:**
- Uses `ConfidentialClientApplication` for Client Credentials flow
- Application permissions (app-only tokens)
- No user interaction

**New Implementation:**
- Add `PublicClientApplication` for Device Code Flow
- Delegated permissions (user context)
- Interactive authentication with device code display
- Token caching and refresh logic

**Changes Required:**

```typescript
// Add new interface for token cache
interface CachedToken {
  version: string;
  tenant_id: string;
  client_id: string;
  access_token: string;
  refresh_token?: string;
  expires_on: string;
  cached_at: string;
  scopes: string[];
}

// Modify AuthConfig to support both flows
export interface AuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret?: string; // Optional - for backward compatibility
  projectOnlineUrl: string;
  useDeviceCodeFlow?: boolean; // Default: true if no clientSecret
}

// Add new class properties
private publicClientApp?: msal.PublicClientApplication;
private tokenCacheDir: string;
private deviceCodeCallback?: (message: string) => void;

// Add new methods
private async acquireTokenByDeviceCode(): Promise<TokenResponse>
private getCachePath(): string
private async loadTokenFromCache(): Promise<CachedToken | null>
private async saveTokenToCache(token: CachedToken): Promise<void>
private async clearTokenCache(): Promise<void>
private async refreshToken(): Promise<TokenResponse>
```

#### 2. Token Cache Manager

**New File:** `src/lib/TokenCacheManager.ts`

**Responsibilities:**
- Manage token storage in user's home directory
- Encrypt/decrypt tokens at rest
- Handle file system operations securely
- Validate cached token integrity

**Key Methods:**
```typescript
export class TokenCacheManager {
  constructor(cacheDir: string);
  
  async save(tenantId: string, clientId: string, token: TokenData): Promise<void>;
  async load(tenantId: string, clientId: string): Promise<TokenData | null>;
  async clear(tenantId: string, clientId: string): Promise<void>;
  async clearAll(): Promise<void>;
  
  private getCachePath(tenantId: string, clientId: string): string;
  private ensureCacheDir(): Promise<void>;
  private validateToken(token: TokenData): boolean;
}
```

#### 3. Device Code Display Handler

**New File:** `src/util/DeviceCodeDisplay.ts`

**Responsibilities:**
- Format device code message for user
- Display instructions prominently
- Show polling status
- Handle authentication completion

**Key Methods:**
```typescript
export class DeviceCodeDisplay {
  static displayDeviceCode(userCode: string, verificationUrl: string): void;
  static showPollingStatus(): void;
  static showSuccess(): void;
  static showError(error: string): void;
}
```

#### 4. Configuration Updates

**File:** `src/util/ConfigManager.ts`

**Changes:**
- Add `USE_DEVICE_CODE_FLOW` environment variable (default: auto-detect)
- Validate authentication configuration
- Provide migration warnings for deprecated client secret usage

#### 5. CLI Integration

**File:** `src/cli.ts`

**Changes:**
- Handle device code authentication prompts
- Display authentication status
- Provide `auth` command for manual authentication
- Add `auth:clear` command to clear cached tokens

---

## Configuration Changes

### Azure AD App Registration

**Current Configuration:**
- **Permission Type:** Application permissions
- **Permissions:** SharePoint `Sites.ReadWrite.All`
- **Admin Consent:** Required
- **Authentication:** Client Credentials flow

**New Configuration Required:**
- **Permission Type:** Delegated permissions
- **Permissions:** 
  - SharePoint `AllSites.Read`
  - SharePoint `AllSites.Write`
- **Admin Consent:** Optional (user can consent)
- **Authentication:** Device Code flow
- **Public Client:** Enable "Allow public client flows" = Yes

**Azure Portal Configuration Steps:**

1. **Enable Public Client Flows:**
   - Navigate to: Azure Portal → App registrations → Your App
   - Go to: Authentication
   - Under "Advanced settings" → "Allow public client flows"
   - Set to: **Yes**
   - Click "Save"

2. **Add Delegated Permissions:**
   - Go to: API permissions
   - Click "Add a permission"
   - Select "SharePoint"
   - Choose "Delegated permissions"
   - Check: `AllSites.Read` and `AllSites.Write`
   - Click "Add permissions"

3. **Remove Application Permissions (Optional):**
   - If no longer using Client Credentials flow
   - Remove: `Sites.ReadWrite.All` (Application permission)

4. **Update Redirect URIs:**
   - Go to: Authentication → Platform configurations
   - Add platform: "Mobile and desktop applications"
   - Add redirect URI: `http://localhost`
   - Click "Configure"

### Environment Variables

**Current `.env` Configuration:**
```bash
TENANT_ID=14457e5c-136e-41e3-b269-2c4033f43f45
CLIENT_ID=4114b136-fb49-42f3-884f-bcf36d3fd8c6
CLIENT_SECRET=ncV8Q~oECXkzjN9A2FrqZLzr7rKxGM16S01pOc4R
PROJECT_ONLINE_URL=https://mbfcorp.sharepoint.com/sites/pwa
```

**New `.env` Configuration:**
```bash
TENANT_ID=14457e5c-136e-41e3-b269-2c4033f43f45
CLIENT_ID=4114b136-fb49-42f3-884f-bcf36d3fd8c6
# CLIENT_SECRET no longer required for Device Code Flow
PROJECT_ONLINE_URL=https://mbfcorp.sharepoint.com/sites/pwa

# Optional: Force device code flow (auto-detected if CLIENT_SECRET absent)
USE_DEVICE_CODE_FLOW=true

# Optional: Token cache directory (default: ~/.project-online-tokens)
TOKEN_CACHE_DIR=~/.project-online-tokens
```

**Backward Compatibility:**
- If `CLIENT_SECRET` provided: Use Client Credentials flow (if tenant allows)
- If `CLIENT_SECRET` absent: Automatically use Device Code Flow
- If `USE_DEVICE_CODE_FLOW=true`: Force Device Code Flow regardless

---

## User Experience

### First-Time Authentication

```bash
$ npm run cli migrate -- --source abc123 --workspace-name "Project Migration"

Project Online to Smartsheet Migration Tool
============================================

Authentication Required
-----------------------
To access Project Online, please authenticate with your Microsoft account.

1. Open your browser and go to: https://microsoft.com/devicelogin

2. Enter this code: ABCD-1234

3. Sign in with your Microsoft credentials

Waiting for authentication... (this may take up to 5 minutes)

[5 seconds later]
✓ Authentication successful!
✓ Token cached for future use

Starting migration...
```

### Subsequent Usage (Token Cached)

```bash
$ npm run cli migrate -- --source xyz789 --workspace-name "Another Project"

Project Online to Smartsheet Migration Tool
============================================

✓ Using cached authentication token

Starting migration...
```

### Token Expiration/Refresh

```bash
$ npm run cli validate -- --source abc123

Project Online to Smartsheet Migration Tool
============================================

✓ Refreshing authentication token...
✓ Token refreshed successfully

Validating project...
```

### Manual Authentication

```bash
$ npm run cli auth

Project Online Authentication
==============================

This will authenticate with Project Online and cache the token for future use.

1. Open your browser and go to: https://microsoft.com/devicelogin

2. Enter this code: WXYZ-5678

3. Sign in with your Microsoft credentials

Waiting for authentication...

✓ Authentication successful!
✓ Token saved to: /Users/jbrown/.project-online-tokens/

You can now use the migration tool without re-authenticating.
```

### Clear Cached Tokens

```bash
$ npm run cli auth:clear

Clear Cached Tokens
===================

This will remove all cached authentication tokens.
You will need to re-authenticate on the next command.

Are you sure? (y/N): y

✓ Tokens cleared successfully
✓ Deleted: /Users/jbrown/.project-online-tokens/14457e5c-136e-41e3-b269-2c4033f43f45.json

You will be prompted to authenticate on your next command.
```

---

## Security Considerations

### Token Storage Security

**Requirements:**
1. **File Permissions:** Token cache files must have `0600` permissions (owner read/write only)
2. **Directory Permissions:** Cache directory must have `0700` permissions (owner access only)
3. **Platform Security:** 
   - macOS: Use Keychain Access for token encryption
   - Windows: Use Data Protection API (DPAPI)
   - Linux: Use filesystem encryption or gnome-keyring

**Implementation:**
```typescript
// Token cache file permissions
const tokenPath = path.join(cacheDir, `${tenantId}.json`);
await fs.writeFile(tokenPath, JSON.stringify(token), { mode: 0o600 });

// Verify permissions after write
const stats = await fs.stat(tokenPath);
if (stats.mode & 0o077) {
  throw new Error('Token cache has insecure permissions');
}
```

### Token Lifetime Management

**Access Token:**
- Lifetime: 1 hour (managed by Azure AD)
- Buffer: 5 minutes (refresh before expiration)
- Max age: 55 minutes before refresh required

**Refresh Token:**
- Lifetime: 90 days (default, configurable in Azure AD)
- Single-use: New refresh token issued on each refresh
- Revocation: Can be revoked in Azure AD

**Implementation:**
- Check token expiry before each API call
- Attempt refresh if within 5-minute expiration buffer
- Re-authenticate if refresh fails

### Error Handling

**Authentication Errors:**

| Error | Cause | User Action |
|-------|-------|-------------|
| `authorization_pending` | User hasn't completed authentication | Continue waiting |
| `authorization_declined` | User denied consent | Run `auth` command again |
| `expired_token` | Device code expired (15 minutes) | Re-run command to get new code |
| `invalid_grant` | Refresh token expired | Re-authenticate with `auth` command |
| `interaction_required` | Conditional access policy requires MFA | Complete MFA in browser |

**Mitigation:**
- Clear error messages with actionable steps
- Automatic retry with exponential backoff for transient errors
- Graceful fallback to re-authentication

### Logging and Debugging

**Security Rules:**
- ✅ Log: Token expiration timestamps
- ✅ Log: Authentication flow status
- ✅ Log: API endpoint calls (URLs only)
- ❌ Never log: Access tokens
- ❌ Never log: Refresh tokens  
- ❌ Never log: User credentials
- ❌ Never log: Device codes

**Debug Mode:**
```bash
# Enable debug logging (still no token values)
DEBUG=true npm run cli migrate -- --source abc123
```

---

## Testing Strategy

### Unit Tests

**File:** `test/unit/MSALAuthHandler.devicecode.test.ts`

**Test Cases:**
1. ✅ Device code flow initialization
2. ✅ Device code polling logic
3. ✅ Token caching to filesystem
4. ✅ Token loading from cache
5. ✅ Token expiry detection
6. ✅ Token refresh logic
7. ✅ Cache file permissions verification
8. ✅ Error handling for authentication failures

**File:** `test/unit/TokenCacheManager.test.ts`

**Test Cases:**
1. ✅ Create cache directory with correct permissions
2. ✅ Save token with encryption
3. ✅ Load token with decryption
4. ✅ Validate token integrity
5. ✅ Clear individual token cache
6. ✅ Clear all cached tokens
7. ✅ Handle corrupted cache files
8. ✅ Handle missing cache directory

### Integration Tests

**File:** `test/integration/device-code-auth.test.ts`

**Test Cases:**
1. ✅ End-to-end device code authentication flow
2. ✅ Token caching and reuse
3. ✅ Automatic token refresh
4. ✅ API calls with delegated permissions
5. ✅ Fallback to Client Credentials if configured
6. ✅ Migration from Client Credentials to Device Code

**Test Environment:**
- Use test Azure AD tenant
- Use test SharePoint site
- Mock device code user interaction
- Test with actual Azure AD endpoints

### Manual Testing

**Test Script:** `scripts/test-device-code-flow.ts`

**Test Scenarios:**
1. First-time authentication with device code
2. Subsequent command with cached token
3. Token expiration and automatic refresh
4. Manual `auth` command
5. Manual `auth:clear` command
6. Authentication timeout (user doesn't complete in 15 minutes)
7. Authentication denial (user cancels)
8. Network failure during authentication
9. Network failure during token refresh

**Acceptance Criteria:**
- Device code displayed clearly
- User instructions are unambiguous
- Authentication completes within 60 seconds of user action
- Cached token works without re-authentication
- Token refresh is transparent to user
- Error messages are clear and actionable

### Connection Test Updates

**File:** `scripts/test-project-online-connection.ts`

**Updates Required:**
- Support device code flow for connection testing
- Handle interactive authentication during test
- Display device code if authentication needed
- Cache token for subsequent test runs

**Usage:**
```bash
$ npm run test:connection

===========================================
Project Online Connection Test
===========================================

Configuration loaded from: .env.test

Authentication Method: Device Code Flow

Step 1: Checking for cached token...
⚠ No cached token found

Step 2: Starting device code authentication...

Please authenticate to continue:
1. Go to: https://microsoft.com/devicelogin
2. Enter code: ABCD-1234
3. Sign in with your Microsoft credentials

Waiting for authentication...

✓ Authentication successful!
✓ Token cached

Step 3: Testing Project Online API access...
✓ Successfully retrieved projects
✓ Found 25 projects

===========================================
✅ SUCCESS - Connection Test Passed
===========================================
```

---

## Migration Path

### For Existing Users

#### Phase 1: Update Azure AD Configuration (Administrator)

**Estimated Time:** 10 minutes

1. Enable public client flows in Azure AD app registration
2. Add delegated permissions (AllSites.Read, AllSites.Write)
3. (Optional) Remove application permissions if no longer needed

#### Phase 2: Update Application Code (Developer)

**Estimated Time:** 4-6 hours development + testing

1. Implement Device Code Flow in MSALAuthHandler
2. Implement TokenCacheManager
3. Add DeviceCodeDisplay utility
4. Update ConfigManager for new configuration
5. Add CLI auth commands
6. Write unit tests
7. Write integration tests
8. Update documentation

#### Phase 3: Update Environment Configuration (User)

**Estimated Time:** 2 minutes

1. Update `.env` file to remove CLIENT_SECRET or set USE_DEVICE_CODE_FLOW=true
2. First run will prompt for authentication
3. Token cached for future use

#### Phase 4: Validate Migration (User)

**Estimated Time:** 5 minutes

1. Run connection test: `npm run test:connection`
2. Verify authentication flow works
3. Verify API access succeeds
4. Run migration on test project

### Rollback Plan

If issues occur with Device Code Flow:

1. **Immediate Rollback:**
   ```bash
   # Re-add CLIENT_SECRET to .env
   CLIENT_SECRET=ncV8Q~oECXkzjN9A2FrqZLzr7rKxGM16S01pOc4R
   USE_DEVICE_CODE_FLOW=false
   ```

2. **Code Rollback:**
   - Revert to previous commit
   - Redeploy previous version
   - Notify users of rollback

3. **Azure AD Rollback:**
   - Re-enable application permissions if removed
   - Keep delegated permissions for future attempts

---

## Success Metrics

### Functional Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Authentication success rate | >99% | Percentage of successful device code authentications |
| Token cache hit rate | >90% | Percentage of operations using cached token |
| Token refresh success rate | >99% | Percentage of successful automatic token refreshes |
| API access success rate | 100% | Percentage of API calls succeeding with delegated token |
| User re-authentication frequency | <1 per day | Average authentications per user per day |

### Performance Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial authentication time | <60 seconds | Time from device code display to token acquisition |
| Cached token retrieval | <100ms | Time to load and validate cached token |
| Token refresh time | <3 seconds | Time to refresh expired token |
| Zero performance impact | N/A | API call performance unchanged from cached token |

### User Experience Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| User confusion rate | <5% | Users requiring support during authentication |
| Authentication abandonment rate | <2% | Users not completing authentication flow |
| Error message clarity | >95% | Users resolving errors without support |
| Documentation completeness | >95% | Users successfully authenticating via docs |

---

## Appendices

### Appendix A: OAuth 2.0 Device Code Flow Specification

**RFC:** [RFC 8628 - OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)

**Microsoft Documentation:** [Device Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-device-code)

**Flow Steps:**

1. **Device Authorization Request:**
   ```http
   POST /oauth2/v2.0/devicecode HTTP/1.1
   Host: login.microsoftonline.com
   Content-Type: application/x-www-form-urlencoded
   
   client_id={client_id}
   &scope=https://contoso.sharepoint.com/AllSites.Read
   ```

2. **Device Authorization Response:**
   ```json
   {
     "user_code": "ABCD1234",
     "device_code": "GmRhmhcxhwAzkoEqiMEg...",
     "verification_uri": "https://microsoft.com/devicelogin",
     "expires_in": 900,
     "interval": 5,
     "message": "To sign in, use a web browser to open..."
   }
   ```

3. **Access Token Request (Polling):**
   ```http
   POST /oauth2/v2.0/token HTTP/1.1
   Host: login.microsoftonline.com
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=urn:ietf:params:oauth:grant-type:device_code
   &client_id={client_id}
   &device_code=GmRhmhcxhwAzkoEqiMEg...
   ```

4. **Access Token Response:**
   ```json
   {
     "token_type": "Bearer",
     "scope": "https://contoso.sharepoint.com/AllSites.Read",
     "expires_in": 3600,
     "access_token": "eyJ0eXAiOiJKV1QiLCJub...",
     "refresh_token": "0.AXwAXH5FFL4T40..."
   }
   ```

### Appendix B: MSAL.js Device Code Flow Example

```typescript
import * as msal from '@azure/msal-node';

const config: msal.Configuration = {
  auth: {
    clientId: 'your-client-id',
    authority: 'https://login.microsoftonline.com/your-tenant-id',
  },
};

const pca = new msal.PublicClientApplication(config);

const deviceCodeRequest: msal.DeviceCodeRequest = {
  deviceCodeCallback: (response) => {
    console.log(response.message);
  },
  scopes: ['https://contoso.sharepoint.com/AllSites.Read'],
};

const response = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
console.log('Access Token:', response.accessToken);
```

### Appendix C: Token Cache Encryption

**Platform-Specific Implementations:**

**macOS:**
```typescript
import { execSync } from 'child_process';

function encryptToken(token: string): string {
  const encrypted = execSync(
    `security add-generic-password -s "project-online-token" -w "${token}" -U`,
    { encoding: 'utf-8' }
  );
  return encrypted;
}

function decryptToken(): string {
  const decrypted = execSync(
    `security find-generic-password -s "project-online-token" -w`,
    { encoding: 'utf-8' }
  );
  return decrypted.trim();
}
```

**Windows:**
```typescript
import { execSync } from 'child_process';

function encryptToken(token: string, filePath: string): void {
  // Write to file first
  fs.writeFileSync(filePath, token);
  
  // Encrypt using Windows DPAPI via PowerShell
  execSync(
    `powershell -Command "Add-Type -AssemblyName System.Security; ` +
    `$data = [System.IO.File]::ReadAllBytes('${filePath}'); ` +
    `$encrypted = [System.Security.Cryptography.ProtectedData]::Protect(` +
    `$data, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); ` +
    `[System.IO.File]::WriteAllBytes('${filePath}', $encrypted)"`
  );
}
```

**Linux:**
```typescript
// Use filesystem permissions (0600) as primary security
// Optional: Integrate with gnome-keyring or KWallet if available

import { execSync } from 'child_process';

function checkKeychainAvailable(): boolean {
  try {
    execSync('which secret-tool', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function encryptToken(token: string): void {
  if (checkKeychainAvailable()) {
    execSync(
      `secret-tool store --label="Project Online Token" ` +
      `service project-online-token account default`,
      { input: token }
    );
  } else {
    // Fallback to encrypted file with 0600 permissions
    const filePath = getTokenCachePath();
    fs.writeFileSync(filePath, token, { mode: 0o600 });
  }
}
```

### Appendix D: Related Documentation

**Internal Documentation:**
- [Authentication Setup Guide](../project/Authentication-Setup.md)
- [CLI Usage Guide](../project/CLI-Usage-Guide.md)
- [API Services Catalog](../api-reference/api-services-catalog.md)
- [Troubleshooting Playbook](../code/troubleshooting-playbook.md)

**External Documentation:**
- [Microsoft Identity Platform Device Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-device-code)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [SharePoint REST API Authorization](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/authorization-and-authentication-of-sharepoint-add-ins)
- [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628)

### Appendix E: Testing Checklist

**Pre-Implementation Testing:**
- [x] Confirmed app-only tokens rejected by tenant (test:rest-api)
- [x] Verified all REST API endpoints fail with "Unsupported app only token"
- [x] Documented current authentication flow
- [x] Created specification document

**Implementation Testing:**
- [ ] Unit tests pass for MSALAuthHandler device code methods
- [ ] Unit tests pass for TokenCacheManager
- [ ] Integration tests pass for device code authentication
- [ ] Connection test works with device code flow
- [ ] Migration command works with device code flow
- [ ] Token caching works correctly
- [ ] Token refresh works automatically
- [ ] Error handling works for all failure scenarios

**User Acceptance Testing:**
- [ ] First-time authentication flow is clear
- [ ] Device code displayed prominently
- [ ] Authentication completes within 60 seconds
- [ ] Cached token used on subsequent runs
- [ ] Token refresh is transparent
- [ ] Manual `auth` command works
- [ ] Manual `auth:clear` command works
- [ ] Error messages are actionable

**Security Testing:**
- [ ] Token cache files have 0600 permissions
- [ ] Token cache directory has 0700 permissions
- [ ] No tokens logged in debug mode
- [ ] Token cache survives system restart
- [ ] Token cache properly cleared on auth:clear
- [ ] Platform-specific encryption works (if implemented)

**Performance Testing:**
- [ ] Cached token retrieval < 100ms
- [ ] Token refresh < 3 seconds
- [ ] No performance impact on API calls
- [ ] Memory usage acceptable

**Documentation Testing:**
- [ ] Authentication Setup Guide updated
- [ ] CLI Usage Guide updated
- [ ] Troubleshooting guide updated
- [ ] README updated with new flow
- [ ] Migration guide clear and complete

---

## Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-12-17 | 1.0 | Project Online SDLC | Initial specification created based on app-only token rejection findings |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | Pending |
| Technical Lead | | | Pending |
| Security Review | | | Pending |
| Documentation Lead | | | Pending |

---

**End of Specification**
