
<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🎯 Migrating to Smartsheet</h1>

🎯 Migrating · [🏗️ How it Works](./ETL-System-Design.md) · [🛠️ Contributing](../code/Conventions.md)

</div>

<div align="center">

[← Previous: Sheet Connections](./Sheet-References.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Using the Migration Tool →](./CLI-Usage-Guide.md)

</div>

---

# Setting Up Authentication

This guide walks you through connecting the migration tool to your Project Online environment using **Device Code Flow** authentication.

## What You'll Need

To migrate your projects, the tool needs secure access to both your Project Online data and your Smartsheet account. This requires:

1. An application registration in Azure Active Directory
2. Delegated permissions to access your Project Online data
3. Your Microsoft account credentials for authentication
4. Configuration in the tool's `.env` file

## Understanding Device Code Flow

**Device Code Flow** is an interactive authentication method perfect for CLI tools:

- ✅ **One-time authentication**: Authenticate in your browser, then the tool caches your token
- ✅ **No client secrets**: No need to manage sensitive secrets in configuration files
- ✅ **User permissions**: Uses your personal Project Online access (delegated permissions)
- ✅ **Secure**: Token caching with automatic refresh

**First Run Experience:**
```bash
$ npm run cli migrate -- --source abc123 --workspace-name "My Project"

Authentication Required
-----------------------
1. Open your browser and go to: https://microsoft.com/devicelogin
2. Enter this code: ABCD-1234
3. Sign in with your Microsoft credentials

Waiting for authentication...
✓ Authentication successful!
✓ Token cached for future use

Starting migration...
```

**Subsequent Runs** use the cached token automatically!

## Requirements

- **Azure Active Directory Access**: You'll need to create an app registration (or ask your IT administrator)
- **Project Online Access**: Your Microsoft account must have access to the Project Online site
- **Your Organization's Information**: Know your Azure Active Directory tenant details

## Step-by-Step Setup

### Step 1: Create the Application Registration

1. Go to: https://portal.azure.com/#allservices/category/All

2. Navigate to **Identity** → **App registrations**
   - In the left sidebar, click on the **Identity** category
   - Click on **App registrations**

3. Click **+ New registration**

4. Fill in the form:
   - **Name**: `Project Online Migration Tool`
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank

5. Click **Register**

### Step 2: Copy Your Application Information

After registering, you'll see the application overview page.

1. **Copy the Application (client) ID**
   - Save this as your `CLIENT_ID`
   - It looks like: `12345678-1234-1234-1234-123456789012`

2. **Copy the Directory (tenant) ID**
   - Save this as your `TENANT_ID`
   - It looks like: `87654321-4321-4321-4321-210987654321`

### Step 3: Enable Public Client Flows

**This step is critical for Device Code Flow!**

1. In your application registration, go to **Authentication**

2. Scroll down to **Advanced settings**

3. Under "Allow public client flows", set the toggle to **Yes**

4. Click **Save**

**Why this matters:** Public client flows enable the Device Code Flow authentication method.

### Step 4: Grant Delegated Permissions

**Important:** We're using **Delegated** permissions, not Application permissions.

1. In your application registration, go to **API permissions**

2. Click **Add a permission**

3. Select **SharePoint** (Project Online uses SharePoint's infrastructure)

4. Choose **Delegated permissions** (NOT Application permissions)

5. Find and check both:
   - ☑️ **AllSites.Read**
   - ☑️ **AllSites.Write**

6. Click **Add permissions**

7. **Note on Admin Consent**:
   - Admin consent is optional for delegated permissions
   - If your organization requires it, you'll see a "Grant admin consent" button - click it
   - If not required, user consent will be handled during first authentication

### Step 5: Verify the Setup

After granting permissions, verify you see:

| Permission | Type | Status |
|-----------|------|--------|
| SharePoint / AllSites.Read | Delegated | ✓ Granted |
| SharePoint / AllSites.Write | Delegated | ✓ Granted |

### Step 6: Configure the Tool

1. Copy the sample configuration file:
   ```bash
   cp .env.sample .env
   ```

2. Edit the `.env` file and add your credentials:
   ```bash
   # Azure Active Directory Configuration
   TENANT_ID=your-tenant-id-from-step-2
   CLIENT_ID=your-client-id-from-step-2
   PROJECT_ONLINE_URL=https://your-organization.sharepoint.com/sites/pwa
   
   # Smartsheet Configuration
   SMARTSHEET_API_TOKEN=your-smartsheet-token
   ```

3. Replace each placeholder value with your actual information

**Note:** No `CLIENT_SECRET` is required for Device Code Flow!

### Step 7: Test the Connection

Test that everything is configured correctly:

```bash
# Test Project Online API connection
npm run test:connection
```

**First time running?** You'll see:

```
===========================================
Project Online Connection Test
===========================================

Configuration loaded from: .env

Authentication Required
-----------------------
To access Project Online, please authenticate with your Microsoft account.

1. Open your browser and go to: https://microsoft.com/devicelogin

2. Enter this code: ABCD-1234

3. Sign in with your Microsoft credentials

Waiting for authentication... (this may take up to 5 minutes)

✓ Authentication successful!
✓ Token cached at: ~/.project-online-tokens/

Step 3: Testing Project Online API access...
✓ Successfully retrieved projects
✓ Found 25 projects

===========================================
✅ SUCCESS - Connection Test Passed!
===========================================

Your Project Online configuration is working correctly.
You can now run integration tests with:
  npm run test:integration
```

**Subsequent runs** will use your cached token and skip authentication!

You can also validate with a specific project:

```bash
npm run cli validate -- --source [your-project-id]
```

## Troubleshooting

### "Authentication failed" or "Authorization pending"

**What this means**:
You haven't completed the browser authentication, or the device code expired.

**How to fix**:
1. Open the device login URL: https://microsoft.com/devicelogin
2. Enter the exact code shown (case-sensitive)
3. Sign in with your Microsoft account
4. Device codes expire after 15 minutes - if it expired, re-run the command to get a new code

### "Public client flows not enabled"

**What this means**:
The Azure AD app isn't configured for Device Code Flow.

**How to fix**:
1. Go to Azure Portal → Your app registration → Authentication
2. Under "Advanced settings" → "Allow public client flows"
3. Set to **Yes**
4. Click "Save"

### "Insufficient permissions" or "Access denied"

**What this means**:
Either the app doesn't have the right permissions, or your user account doesn't have Project Online access.

**How to fix**:
1. **Check App Permissions**:
   - Azure Portal → Your app registration → API permissions
   - Verify both **AllSites.Read** and **AllSites.Write** are listed as **Delegated** permissions
   - Status should show "Granted"

2. **Check User Access**:
   - Verify you can access the Project Online site in your browser
   - Go to your PROJECT_ONLINE_URL and confirm you can view projects
   - If not, request access from your Project Online administrator

### "Resource not found" Error

**What this means**:
- Your Project Online URL is incorrect
- The site doesn't exist
- You don't have access to the site

**How to fix**:
1. Verify your Project Online URL format: `https://[your-organization].sharepoint.com/sites/[site-name]`
2. Test the URL in your web browser (you should be able to access it)
3. Confirm the site name is correct (common: `/sites/pwa`)

### Token Cache Issues

**Clear cached tokens** if you're experiencing authentication problems:

```bash
npm run cli auth:clear
```

This will delete cached tokens and force re-authentication on next run.

**Token cache location**: `~/.project-online-tokens/`

### Common Error Messages

| Error | What It Means | How to Fix |
|-------|---------------|------------|
| `authorization_pending` | You haven't completed authentication yet | Complete the browser authentication |
| `authorization_declined` | You denied consent | Re-run the command and approve the consent |
| `expired_token` | Device code expired (15 min timeout) | Re-run the command to get a new code |
| `invalid_grant` | Refresh token expired | Clear token cache and re-authenticate |
| `interaction_required` | Conditional access policy requires MFA | Complete MFA in browser |

## Security Best Practices

### Token Storage

1. **Tokens are cached locally**
   - Location: `~/.project-online-tokens/`
   - File permissions: `0600` (owner read/write only)
   - Contains: access token, refresh token, expiry timestamp

2. **Token lifetime**
   - Access tokens: 1 hour (auto-refreshed by tool)
   - Refresh tokens: 90 days (configurable by your IT admin)
   - Tool handles refresh automatically

3. **Clearing tokens**
   - Clear if you suspect compromise: `npm run cli auth:clear`
   - Clear if switching accounts
   - Tokens automatically cleared after refresh expiration

### Protecting Your Configuration

1. **Never commit `.env` files to source control**
   - The file is excluded by default in `.gitignore`
   - Never share your `.env` file with others

2. **User Account Security**
   - Use strong passwords and MFA on your Microsoft account
   - Only authenticate on trusted devices
   - The tool uses your personal access - be mindful of what projects you can see

### Managing Permissions

1. **Principle of least privilege**
   - AllSites.Read and AllSites.Write provide read access to Project Online data
   - The tool only reads data, it doesn't modify Project Online
   - Data is written only to Smartsheet

2. **Review regularly**
   - Periodically review which applications have permissions in Azure Portal
   - Remove application registrations you're no longer using
   - Azure Portal → Azure Active Directory → App registrations

### Monitoring Access

1. **Review sign-in activity**
   - Azure Portal → Azure Active Directory → Sign-ins
   - Filter by your application name
   - Watch for unexpected sign-ins

2. **Token expiration**
   - Access tokens expire after 1 hour
   - Refresh tokens expire after 90 days (or sooner if configured by admin)
   - Tool will prompt for re-authentication after refresh token expires

## Authentication vs App-Only Flow

**Previous versions** of this tool used "app-only" authentication with client secrets. This has been replaced with Device Code Flow because:

- ❌ App-only authentication disabled on many SharePoint tenants
- ❌ Requires managing sensitive client secrets
- ❌ Requires admin consent
- ✅ Device Code Flow works on all tenants
- ✅ No secrets to manage
- ✅ Uses your personal access rights

**If you have old configuration** with `CLIENT_SECRET`, simply remove that line from your `.env` file. The tool now exclusively uses Device Code Flow.

## Additional Resources

### Microsoft Documentation

- [Device Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-device-code)
- [Creating App Registrations](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Delegated Permissions](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent)
- [Project Online Documentation](https://docs.microsoft.com/en-us/previous-versions/office/project-javascript-api/jj712612(v=office.15))

### Getting Help

If you encounter issues:

1. Read the error message carefully - it often explains what's wrong
2. Review the troubleshooting section above
3. Verify all your configuration values are correct
4. Test the connection using the `test:connection` command
5. Clear token cache if experiencing authentication issues
6. Contact your Azure Active Directory administrator for permission issues

---

<div align="center">

[← Previous: Sheet Connections](./Sheet-References.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Using the Migration Tool →](./CLI-Usage-Guide.md)

</div>
