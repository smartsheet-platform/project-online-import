# PWA Instance Troubleshooting Guide

## Problem: 404 Error on Project Online Connection Test

### Symptoms

When running `npm run test:connection`, you see:

```
[ERROR] Max retries (5) exceeded ConnectionError: HTTP request failed: 
Request failed with status code 404
```

And your browser shows the PWA site with the message:
> "No Project Web App instances found. Create at least one PWA instance before accessing this page."

---

## Root Cause

Your SharePoint site exists at the configured URL, but it **does not have a Project Web App (PWA) instance configured**. 

The Project Online OData API endpoint (`/_api/ProjectData`) requires an active PWA instance to function. Without it, the API returns 404 (Not Found).

---

## Diagnostic Tool

Run the diagnostic script to confirm this issue:

```bash
npm run diagnose:pwa
```

This will:
1. ✓ Verify authentication works
2. ✓ Confirm the SharePoint site exists and is accessible  
3. ✗ Detect that no PWA instance is configured

---

## Solution Options

### Option 1: Enable PWA on This Site

**Who:** SharePoint/Office 365 Administrator

**Steps:**

1. **Navigate to SharePoint Admin Center**
   - Go to https://admin.microsoft.com
   - Select "Admin centers" > "SharePoint"

2. **Access Project Online Settings**
   - Go to "Settings" > "Project Online"
   - Or navigate to: Settings > Project settings

3. **Create PWA Instance**
   - Click "Create a PWA instance"
   - Select the site: `https://mbfcorp.sharepoint.com/sites/pwa`
   - Configure instance settings (admin, locale, time zone)
   - Wait for provisioning to complete (can take 10-30 minutes)

4. **Verify Instance Creation**
   - Navigate to the site in browser
   - You should see Project Online interface instead of the error message
   - Run diagnostic again: `npm run diagnose:pwa`

**Note:** This requires SharePoint Administrator or Global Administrator permissions.

---

### Option 2: Use an Existing PWA Site

**Who:** Any team member (with admin assistance)

**Steps:**

1. **Find Your Actual PWA Site URL**
   
   Method A - Use Project Online Web App:
   ```
   1. Open Project Online in your browser
   2. Log in with your Microsoft 365 credentials
   3. Look at the URL in the address bar
   4. Copy the base URL (everything before /_layouts)
   ```
   
   Method B - Ask Your Administrator:
   ```
   Contact your SharePoint or Project Online administrator and ask:
   "What is our Project Online site URL?"
   ```
   
   Method C - Common Patterns:
   ```
   • https://[tenant].sharepoint.com/sites/pwa
   • https://[tenant].sharepoint.com/pwa
   • https://[tenant].sharepoint.com (root site)
   • https://[tenant].sharepoint.com/sites/ProjectServer
   ```

2. **Update Configuration**
   
   Edit `.env.test` file:
   ```bash
   # Change from:
   PROJECT_ONLINE_URL=https://mbfcorp.sharepoint.com/sites/pwa
   
   # To the actual PWA URL:
   PROJECT_ONLINE_URL=https://[actual-pwa-url]
   ```

3. **Test the Connection**
   ```bash
   # First, verify PWA instance exists:
   npm run diagnose:pwa
   
   # If successful, test full connection:
   npm run test:connection
   ```

---

## Verification Steps

After applying either solution:

### Step 1: Run PWA Diagnostic

```bash
npm run diagnose:pwa
```

Expected output:
```
✓ Authentication successful
✓ SharePoint site exists and is accessible
✓ PWA instance is configured and ProjectData API is accessible

✅ SUCCESS - PWA Instance Configured!
```

### Step 2: Run Connection Test

```bash
npm run test:connection
```

Expected output:
```
✓ Client initialized
✓ Authentication successful
✓ Connection to Project Online successful

✅ SUCCESS - Connection Test Passed!
```

### Step 3: Verify in Browser

Navigate to your PWA site URL in a browser. You should see:
- Project Online web interface
- Project center with projects list
- Navigation menus for Projects, Resources, etc.

**NOT** the error message about missing PWA instances.

---

## Common Issues

### Issue: "Access Denied" after PWA Creation

**Cause:** Your user account doesn't have Project Online license or permissions

**Solution:**
1. Verify you have a Project Online license assigned
2. Ask admin to add you as a Project Online user
3. Ensure you're added to the PWA site with appropriate permissions

### Issue: PWA Creation Takes Too Long

**Cause:** Normal provisioning time

**Solution:**
- PWA provisioning can take 10-30 minutes
- Check status in SharePoint Admin Center
- Wait for provisioning to complete before testing

### Issue: Multiple PWA Sites in Organization

**Cause:** Organizations can have multiple PWA instances

**Solution:**
1. Confirm which PWA site your projects are in
2. Use the correct URL for your specific projects
3. Document the correct URL in project documentation

---

## Technical Details

### What is a PWA Instance?

A Project Web App (PWA) instance is a specialized SharePoint site collection that:
- Hosts the Project Online OData API (`/_api/ProjectData`)
- Stores project, task, resource, and assignment data
- Provides the Project Online web interface
- Requires specific provisioning beyond a standard SharePoint site

### API Endpoints

Without PWA Instance:
```
❌ https://[site]/_api/ProjectData → 404 Not Found
```

With PWA Instance:
```
✓ https://[site]/_api/ProjectData → 200 OK
✓ https://[site]/_api/ProjectData/Projects → Project list
✓ https://[site]/_api/ProjectData/Tasks → Task list
✓ https://[site]/_api/ProjectData/Resources → Resource list
```

### Required Permissions

For the PWA Instance to work with this tool:

**Azure AD App Registration:**
- Delegated Permissions: `AllSites.Read`, `AllSites.Write`
- Or Application Permissions: `Sites.ReadWrite.All`

**User Account:**
- Project Online license assigned
- Access to the specific PWA site
- Appropriate Project Online role (e.g., Project Manager, Team Member)

---

## Getting Help

If you continue to experience issues:

1. **Run all diagnostics:**
   ```bash
   npm run diagnose:pwa
   npm run test:connection
   ```

2. **Collect information:**
   - Screenshot of browser showing PWA site
   - Full error output from diagnostic scripts
   - Confirmation of your Project Online license status

3. **Contact:**
   - Your SharePoint Administrator (for PWA provisioning)
   - Your Project Online Administrator (for access issues)
   - Include all diagnostic information

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run diagnose:pwa` | Check if PWA instance is configured |
| `npm run test:connection` | Full connection test including authentication |
| `npm run test:integration` | Run integration tests (requires working PWA) |

---

## Related Documentation

- [Integration Test Setup Guide](./INTEGRATION_TEST_SETUP_GUIDE.md) - Complete setup instructions
- [Authentication Setup](../sdlc/docs/project/Authentication-Setup.md) - Azure AD app registration
- [Project Online Migration Overview](../sdlc/docs/architecture/project-online-migration-overview.md) - System architecture
