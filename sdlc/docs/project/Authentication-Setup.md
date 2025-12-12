**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Sheet References](./Sheet-References.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: CLI Usage Guide →](./CLI-Usage-Guide.md) |
|:---|:---:|---:|

</div>

---

# Project Online Authentication Setup Guide

This guide walks through setting up Azure AD authentication for the Project Online to Smartsheet ETL tool.

## Overview

The ETL tool uses OAuth 2.0 client credentials flow to authenticate with Project Online via Azure Active Directory (Azure AD). This requires:

1. An Azure AD app registration
2. Appropriate API permissions
3. Admin consent for the application
4. Configuration in your `.env` file

## Prerequisites

- **Azure AD Admin Access**: You need administrator privileges to:
  - Create app registrations
  - Grant admin consent for API permissions
- **Project Online Access**: The app needs access to your Project Online site
- **Tenant Information**: Know your organization's Azure AD tenant

## Step-by-Step Setup

### Step 1: Create Azure AD App Registration

1. Navigate to the [Azure Portal](https://portal.azure.com)

2. Go to **Azure Active Directory** → **App registrations**

3. Click **New registration**

4. Fill in the registration form:
   - **Name**: `Project Online ETL Tool`
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank (not needed for service principal authentication)

5. Click **Register**

### Step 2: Copy Application Credentials

After registration, you'll see the app overview page.

1. **Copy the Application (client) ID**
   - This is your `CLIENT_ID`
   - Example: `12345678-1234-1234-1234-123456789012`

2. **Copy the Directory (tenant) ID**
   - This is your `TENANT_ID`
   - Example: `87654321-4321-4321-4321-210987654321`

### Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**

2. Click **New client secret**

3. Fill in the form:
   - **Description**: `ETL Tool Secret`
   - **Expires**: Choose expiration period (recommended: 12-24 months)
   
4. Click **Add**

5. **CRITICAL**: Copy the secret **Value** immediately
   - This is your `CLIENT_SECRET`
   - **You won't be able to see it again!**
   - If you lose it, you'll need to create a new secret

### Step 4: Grant API Permissions

1. In your app registration, go to **API permissions**

2. Click **Add a permission**

3. Select **SharePoint** (Project Online uses SharePoint APIs)

4. Choose **Application permissions** (not Delegated permissions)

5. Find and check **Sites.ReadWrite.All**
   - This allows the app to read and write to all site collections
   - Required for accessing Project Online data

6. Click **Add permissions**

7. **CRITICAL**: Click **Grant admin consent for [Your Organization]**
   - This button requires admin privileges
   - Without admin consent, the app cannot access the API
   - The button should show a green checkmark after consenting

### Step 5: Verify Permissions

After granting consent, you should see:

| API / Permission Name | Type | Status |
|----------------------|------|--------|
| SharePoint / Sites.ReadWrite.All | Application | ✓ Granted for [Organization] |

If you see "Not granted" or a warning icon, click "Grant admin consent" again.

### Step 6: Configure Environment Variables

1. Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```

2. Edit `.env` and fill in your Azure AD credentials:
   ```bash
   # Azure AD Configuration
   TENANT_ID=your-tenant-id-here
   CLIENT_ID=your-client-id-here
   CLIENT_SECRET=your-client-secret-here
   PROJECT_ONLINE_URL=https://your-org.sharepoint.com/sites/pwa
   
   # Smartsheet Configuration
   SMARTSHEET_API_TOKEN=your-smartsheet-token-here
   ```

3. Replace the placeholder values:
   - `TENANT_ID`: From Step 2
   - `CLIENT_ID`: From Step 2
   - `CLIENT_SECRET`: From Step 3
   - `PROJECT_ONLINE_URL`: Your Project Online site URL
   - `SMARTSHEET_API_TOKEN`: Your Smartsheet API token

### Step 7: Test Authentication

Run the validation command to test your configuration:

```bash
npm run dev validate -- --source [project-guid]
```

Replace `[project-guid]` with an actual Project Online project ID (GUID format).

Expected output if successful:
```
🔍 Validating Project Online data

✓ Project ID format is valid
✓ Azure AD Tenant ID is configured
✓ Azure AD Client ID is configured
✓ Azure AD Client Secret is configured
✓ Project Online URL is configured
✓ Smartsheet API token is configured

🔌 Testing Project Online connection...
✓ Authentication successful
✓ Connection to Project Online successful

✅ Validation passed
```

## Common Issues and Troubleshooting

### Issue: "Authentication failed (401 Unauthorized)"

**Possible Causes:**
- Invalid `CLIENT_ID`, `CLIENT_SECRET`, or `TENANT_ID`
- Client secret expired
- App registration was deleted

**Solution:**
1. Verify all credentials are copied correctly
2. Check if client secret has expired (Azure Portal → App registration → Certificates & secrets)
3. Create a new client secret if needed

### Issue: "Access forbidden (403 Forbidden)"

**Possible Causes:**
- Missing API permissions
- Admin consent not granted
- App doesn't have access to the Project Online site

**Solution:**
1. Verify API permissions:
   - Go to Azure Portal → App registration → API permissions
   - Ensure **Sites.ReadWrite.All** is present
   - Check for green checkmark indicating admin consent
2. If not granted, click "Grant admin consent for [Organization]"
3. Contact your SharePoint/Project Online administrator to grant site access

### Issue: "MSAL authentication error"

**Common MSAL Error Codes:**

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `invalid_client` | Invalid client credentials | Verify `CLIENT_ID` and `CLIENT_SECRET` |
| `invalid_resource` | Invalid Project Online URL | Check `PROJECT_ONLINE_URL` format |
| `unauthorized_client` | App not authorized | Grant admin consent for API permissions |
| `invalid_grant` | Token request failed | Re-create client secret |

**Solution:**
1. Check error message for specific error code
2. Verify configuration values in `.env`
3. Ensure admin consent is granted
4. Try creating a new client secret

### Issue: "The specified resource was not found"

**Possible Causes:**
- Invalid `PROJECT_ONLINE_URL`
- Site doesn't exist
- App doesn't have access to the site

**Solution:**
1. Verify Project Online URL format:
   - Should be: `https://[tenant].sharepoint.com/sites/[site-name]`
   - Example: `https://contoso.sharepoint.com/sites/pwa`
2. Test URL in browser (you should be able to access it)
3. Ensure your Azure AD app has access to this SharePoint site

### Issue: "Token acquisition failed"

**Possible Causes:**
- Network connectivity issues
- Firewall blocking Azure AD endpoints
- Invalid tenant ID

**Solution:**
1. Check internet connectivity
2. Verify firewall allows access to:
   - `https://login.microsoftonline.com`
   - `https://*.sharepoint.com`
3. Confirm `TENANT_ID` is correct

## Security Best Practices

### Client Secret Management

1. **Never commit secrets to version control**
   - The `.env` file is in `.gitignore` by default
   - Never share your `.env` file

2. **Rotate secrets regularly**
   - Set expiration when creating secrets (12-24 months)
   - Create new secret before expiration
   - Update `.env` with new secret
   - Delete old secret after confirming new one works

3. **Use separate credentials per environment**
   - Development: Use test app registration
   - Production: Use separate production app registration
   - Never use production credentials in development

### Permission Management

1. **Principle of Least Privilege**
   - Only grant necessary permissions
   - Sites.ReadWrite.All is required for Project Online access
   - Don't grant additional unnecessary permissions

2. **Regular Audits**
   - Review app permissions periodically
   - Remove unused app registrations
   - Check which users/apps have admin consent

### Monitoring

1. **Review Sign-in Logs**
   - Azure Portal → Azure AD → Sign-ins
   - Filter by application name
   - Check for failed authentication attempts

2. **Set Up Alerts**
   - Configure alerts for:
     - Multiple failed sign-ins
     - Unusual sign-in patterns
     - Permission changes

## Advanced Configuration

### Using Different Environments

You can maintain separate configurations for different environments:

**Development (.env.dev):**
```bash
TENANT_ID=dev-tenant-id
CLIENT_ID=dev-client-id
CLIENT_SECRET=dev-secret
PROJECT_ONLINE_URL=https://contoso-dev.sharepoint.com/sites/pwa-dev
```

**Production (.env.prod):**
```bash
TENANT_ID=prod-tenant-id
CLIENT_ID=prod-client-id
CLIENT_SECRET=prod-secret
PROJECT_ONLINE_URL=https://contoso.sharepoint.com/sites/pwa
```

Load specific configuration:
```bash
npm run dev import -- --config .env.prod --source [project-id]
```

### Default Client Configuration

The Project Online client uses these default configuration values:

- **Timeout**: 30 seconds per request
- **Max Retries**: 3 attempts for failed requests
- **Rate Limit**: 300 API calls per minute

These values are built into the client and provide reliable operation for most scenarios. Custom values can only be configured programmatically (e.g., for testing), not through environment variables or CLI options.

## Support and Additional Resources

### Microsoft Documentation

- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Application Permissions](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent)
- [Project Online REST API](https://docs.microsoft.com/en-us/previous-versions/office/project-javascript-api/jj712612(v=office.15))
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)

### Internal Resources

- [Project Plan](./Project-Plan.md) - Implementation status
- [Project Online Migration Overview](../architecture/01-project-online-migration-overview.md) - System architecture overview
- [CLI Usage Guide](./CLI-Usage-Guide.md) - Command reference

### Getting Help

If you encounter issues not covered in this guide:

1. Check the error message carefully for specific guidance
2. Review the [Troubleshooting](#common-issues-and-troubleshooting) section
3. Verify all configuration values are correct
4. Test authentication with the `validate` command
5. Contact your Azure AD administrator for permission-related issues

---

<div align="center">

| [← Previous: Sheet References](./Sheet-References.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: CLI Usage Guide →](./CLI-Usage-Guide.md) |
|:---|:---:|---:|

</div>