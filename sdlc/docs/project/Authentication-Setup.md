
<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🎯 Migrating to Smartsheet</h1>

🎯 Migrating · [🏗️ How it Works](../architecture/etl-system-design.md) · [🛠️ Contributing](../code/conventions.md)

</div>

<div align="center">

[← Previous: Sheet Connections](./Sheet-References.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Using the Migration Tool →](./CLI-Usage-Guide.md)

</div>

---

# Setting Up Authentication

This guide walks you through connecting the migration tool to your Project Online environment.

## What You'll Need

To migrate your projects, the tool needs secure access to both your Project Online data and your Smartsheet account. This requires:

1. An application registration in Azure Active Directory
2. Appropriate permissions to read your Project Online data
3. Administrator approval for the application
4. Your credentials in a configuration file

## Requirements

- **Azure Active Directory Admin Access**: You'll need someone with administrator privileges who can:
  - Create application registrations
  - Grant approval for application permissions
- **Project Online Access**: The application needs access to read your Project Online data
- **Your Organization's Information**: Know your Azure Active Directory tenant details

## Step-by-Step Setup

### Step 1: Create the Application Registration

1. Go to: https://portal.azure.com/#allservices/category/All

2. Navigate to **Identity** → **App registrations**
   - In the left sidebar, click on the **Identity** category
   - Click on **App registrations** (highlighted in orange)

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

### Step 3: Create a Client Secret

1. In your application registration, go to **Certificates & secrets**

2. Click **New client secret**

3. Fill in the form:
   - **Description**: `Migration Tool Secret`
   - **Expires**: Choose 12-24 months
   
4. Click **Add**

5. **IMPORTANT**: Copy the secret value immediately
   - This is your `CLIENT_SECRET`
   - **You can only see it once!**
   - If you close the page without copying it, you'll need to create a new one

### Step 4: Grant Permissions

1. In your application registration, go to **API permissions**

2. Click **Add a permission**

3. Select **SharePoint** (Project Online uses SharePoint's infrastructure)

4. Choose **Application permissions**

5. Find and check **Sites.ReadWrite.All**
   - This lets the application read your Project Online data
   - Required for the migration to work

6. Click **Add permissions**

7. **CRITICAL**: Grant Admin Consent
   
   **If you see the "Grant admin consent" button:**
   - Click **"Grant admin consent for [Your Organization]"**
   - Click "Yes" to confirm
   - Wait for the status to show "Granted for [Your Organization]" with a green checkmark
   
   **If you DO NOT see the "Grant admin consent" button:**
   - You don't have Azure AD admin privileges (this is common)
   - **Contact your IT administrator or Azure AD admin** with this request:
     ```
     Subject: Azure AD Admin Consent Required for App Registration
     
     Hi [Admin Name],
     
     I've created an Azure AD app registration for Project Online migration
     and need admin consent granted for API permissions.
     
     App Details:
     - App Name: Project Online Migration Tool
     - Application (Client) ID: [your CLIENT_ID from Step 2]
     - Tenant ID: [your TENANT_ID from Step 2]
     
     Required Permission:
     - API: SharePoint
     - Permission: Sites.ReadWrite.All (Application permission)
     
     Please grant admin consent for this permission in the Azure Portal:
     1. Go to: Azure Portal → Identity → App registrations
     2. Find the app by Client ID above
     3. Click "API permissions"
     4. Click "Grant admin consent for [Organization]"
     
     Thank you!
     ```
   - Wait for your admin to grant consent before proceeding
   - You can verify consent was granted by checking the "Status" column shows "Granted for [Organization]" with a green checkmark

### Step 5: Verify the Setup

After granting consent, verify you see:

| Permission | Type | Status |
|-----------|------|--------|
| SharePoint / Sites.ReadWrite.All | Application | ✓ Granted for [Your Organization] |

If you don't see the green checkmark, click "Grant admin consent" again.

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
   CLIENT_SECRET=your-client-secret-from-step-3
   PROJECT_ONLINE_URL=https://your-organization.sharepoint.com/sites/pwa
   
   # Smartsheet Configuration
   SMARTSHEET_API_TOKEN=your-smartsheet-token
   ```

3. Replace each placeholder value with your actual information

### Step 7: Test the Connection

Test that everything is configured correctly:

```bash
# Test Project Online API connection
npm run test:connection
```

If successful, you'll see:
```
===========================================
Project Online Connection Test
===========================================

Step 1: Initializing Project Online client...
✓ Client initialized

Step 2: Testing authentication with Azure AD...
✓ Authentication successful

✓ Connection to Project Online successful

===========================================
✅ SUCCESS - Connection Test Passed!
===========================================

Your Project Online configuration is working correctly.
You can now run integration tests with:
  npm run test:integration
```

**If you see errors**, check the diagnostic output or see the Troubleshooting section below.

You can also validate with a specific project:

```bash
npm run dev validate -- --source [your-project-id]
```

Replace `[your-project-id]` with one of your Project Online project identifiers.

## Troubleshooting

### "Authentication failed" Error

**What this means**:
Your credentials aren't working

**How to fix**:
1. Double-check that you copied all credentials correctly
2. Verify your client secret hasn't expired (check in Azure Portal)
3. Create a new client secret if needed

### "Access forbidden" Error

**What this means**:
The application doesn't have the necessary permissions

**How to fix**:
1. Go to Azure Portal → Your app registration → API permissions
2. Make sure **Sites.ReadWrite.All** shows with a green checkmark
3. If not approved, click "Grant admin consent for [Organization]"
4. Contact your administrator if you don't have permission to grant consent

### Common Error Messages

| Error | What It Means | How to Fix |
|-------|---------------|------------|
| `invalid_client` | Credentials are wrong | Verify `CLIENT_ID` and `CLIENT_SECRET` are correct |
| `invalid_resource` | URL is wrong | Check `PROJECT_ONLINE_URL` format |
| `unauthorized_client` | Not authorized | Grant admin consent for the application |
| `invalid_grant` | Token request failed | Create a new client secret |

### "Resource not found" Error

**What this means**:
- Your Project Online URL is incorrect
- The site doesn't exist
- The application doesn't have access

**How to fix**:
1. Verify your Project Online URL format: `https://[your-organization].sharepoint.com/sites/[site-name]`
2. Test the URL in your web browser (you should be able to access it)
3. Ensure your application has been granted access to the SharePoint site

### "Cannot get token" Error

**What this means**:
- Network connectivity issues
- Firewall blocking Microsoft authentication
- Invalid tenant ID

**How to fix**:
1. Check your internet connection
2. Verify your firewall allows access to:
   - `https://login.microsoftonline.com`
   - `https://*.sharepoint.com`
3. Confirm your `TENANT_ID` is correct

## Security Best Practices

### Protecting Your Credentials

1. **Never commit `.env` files to source control**
   - The file is excluded by default
   - Never share your `.env` file with others

2. **Rotate credentials regularly**
   - Set an expiration when creating secrets (12-24 months is recommended)
   - Create a new secret before the old one expires
   - Update your `.env` file with the new secret
   - Delete the old secret after confirming the new one works

3. **Use separate credentials for testing and production**
   - Create different application registrations for testing versus actual use
   - Never use production credentials for testing

### Managing Permissions

1. **Grant only necessary permissions**
   - Sites.ReadWrite.All is required to read Project Online data
   - Don't grant additional permissions you don't need

2. **Review regularly**
   - Periodically review which applications have permissions
   - Remove application registrations you're no longer using
   - Check who has administrative consent approval

### Monitoring Access

1. **Review sign-in activity**
   - Azure Portal → Azure Active Directory → Sign-ins
   - Filter by your application name
   - Watch for failed authentication attempts

2. **Set up alerts** for unusual activity:
   - Multiple failed sign-in attempts
   - Unexpected sign-in patterns
   - Permission changes

## Additional Resources

### Microsoft Documentation

- [Creating App Registrations](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Application Permissions](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent)
- [Project Online Documentation](https://docs.microsoft.com/en-us/previous-versions/office/project-javascript-api/jj712612(v=office.15))

### Getting Help

If you encounter issues:

1. Read the error message carefully - it often explains what's wrong
2. Review the troubleshooting section above
3. Verify all your configuration values are correct
4. Test the connection using the `validate` command
5. Contact your Azure Active Directory administrator for permission issues

---

<div align="center">

[← Previous: Sheet Connections](./Sheet-References.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Using the Migration Tool →](./CLI-Usage-Guide.md)

</div>