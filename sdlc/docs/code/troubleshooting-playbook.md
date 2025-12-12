**📚 Implementation Guide Series**

<div align="center">

| [← Previous: Using the Migration Tool](../project/CLI-Usage-Guide.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Code Conventions →](./conventions.md) |
|:---|:---:|---:|

</div>

---

# Troubleshooting Common Issues

**Last Updated**: 2024-12-08

This guide helps you diagnose and resolve common issues you might encounter when migrating from Project Online to Smartsheet.

## How to Use This Guide

Each issue includes:

- **What you're seeing**: The symptoms or error messages
- **Why it's happening**: The underlying cause
- **How to diagnose**: Steps to confirm the issue
- **How to fix it**: Solutions that work
- **How to prevent it**: Avoiding the issue in future migrations

---

## Authentication and Connection Issues

### "Authentication failed" Error

**What you're seeing**:
- Migration stops immediately with an authentication error
- Validation shows "Authentication failed"
- Error messages about tokens or credentials

**Why it's happening**:
- Your Azure Active Directory credentials are invalid or expired
- The client secret is incorrect
- Missing permissions
- Your Project Online web address is formatted incorrectly

**How to diagnose**:
1. Run the validation command: `npm run dev validate -- --source [your-project-id]`
2. Check your `.env` file has all these values:
   ```bash
   TENANT_ID=your-tenant-id
   CLIENT_ID=your-client-id
   CLIENT_SECRET=your-client-secret
   PROJECT_ONLINE_URL=https://your-organization.sharepoint.com/sites/pwa
   ```
3. Verify your client secret hasn't expired (check in Azure Portal)
4. Test your Project Online web address in a browser

**How to fix it**:
1. **Refresh your client secret**:
   - Go to Azure Portal → App registration → Certificates & secrets
   - Create a new client secret
   - Update your `.env` file with the new secret
2. **Check web address format**:
   - Should be: `https://[your-organization].sharepoint.com/sites/[site-name]`
   - Example: `https://contoso.sharepoint.com/sites/pwa`
3. **Ensure permissions are approved**:
   - Azure Portal → App registration → Permissions
   - Click "Grant admin consent for [Your Organization]"

**How to prevent it**:
- Set client secrets to expire after 12-24 months
- Keep separate credentials for testing and production
- Validate your configuration before important migrations

### "Access forbidden" Error

**What you're seeing**:
- Authentication works but operations fail
- "Insufficient permissions" messages
- Can see Project Online but can't create in Smartsheet

**Why it's happening**:
- Missing SharePoint permissions in Azure
- Your Smartsheet token doesn't have the right permissions
- Account restrictions in Smartsheet

**How to diagnose**:
1. Check Azure Active Directory permissions:
   - Azure Portal → App registration → Permissions
   - You need **Sites.ReadWrite.All** with a green checkmark
2. Test your Smartsheet token:
   - Must have workspace creation permissions
   - Must be an owner or administrator
3. Test Smartsheet access directly:
   ```bash
   curl -H "Authorization: Bearer $SMARTSHEET_API_TOKEN" \
        "https://api.smartsheet.com/2.0/users/me"
   ```

**How to fix it**:
1. **Add missing permissions**:
   - Azure Portal → Permissions → Add permission
   - Select **SharePoint** → **Application permissions**
   - Check **Sites.ReadWrite.All** → Grant admin consent
2. **Get the right Smartsheet token**:
   - Go to Account → Personal Settings → Access Tokens
   - Generate a new token
   - Ensure you have workspace creation permissions
3. **Check Smartsheet account**:
   - Verify you're not at your workspace limit
   - Ensure you have Professional or higher license level

**How to prevent it**:
- Document required permissions clearly
- Test with validation command before migrating
- Use separate test environments

---

## Data Issues

### "Invalid data format" or "Transformation failed"

**What you're seeing**:
- Migration stops during the conversion phase
- Errors about invalid dates, numbers, or text
- Specific field mentioned in the error

**Why it's happening**:
- Unexpected data formats in your Project Online project
- Missing required fields
- Invalid characters in names or descriptions
- Data quality issues in the source

**How to diagnose**:
1. Note which field is mentioned in the error
2. Run validation to check data quality:
   ```bash
   npm run dev validate -- --source [project-id] --verbose
   ```
3. Check that field in Project Online to see what data is there

**How to fix it**:
1. **Fix the data in Project Online** (preferred):
   - Add missing required fields
   - Fix invalid values
   - Remove problematic characters
2. **Adjust expected formats** (if needed):
   - Contact support if you have valid data that's not being accepted

**How to prevent it**:
- Review data quality in Project Online before migrating
- Run validation first to catch issues early
- Document any data requirements upfront

### "Reference sheet not found" or Dropdown List Issues

**What you're seeing**:
- Errors about missing Standards workspace
- Dropdown lists show empty or incorrect values
- Cannot select from dropdown lists

**Why it's happening**:
- Standards workspace hasn't been created
- Reference sheets aren't set up correctly
- Permission issues accessing the workspace
- Template workspace is missing reference sheets

**How to diagnose**:
1. Check if Standards workspace exists in Smartsheet
2. Verify reference sheets are populated
3. Confirm you have access to the workspace
4. Check workspace permissions

**How to fix it**:
1. **Let the tool create the Standards workspace**:
   - Leave `STANDARDS_WORKSPACE_ID` empty in your configuration
   - The tool creates it automatically on first run
2. **Or provide an existing one**:
   - Add the workspace ID to your `.env` file:
   ```bash
   STANDARDS_WORKSPACE_ID=your_existing_workspace_id
   ```
3. **Verify permissions**:
   - Ensure you have owner or administrator access to the workspace

**How to prevent it**:
- Let the tool handle Standards workspace creation
- Verify setup before migrating multiple projects
- Document the Standards workspace location for your team

---

## Performance Issues

### "Rate limit exceeded" or Slow Performance

**What you're seeing**:
- Migration takes much longer than expected
- Errors about rate limiting
- Many retry attempts in the logs
- Tool appears to hang or freeze

**Why it's happening**:
- Temporary network issues
- Smartsheet rate limits being reached (300 requests per minute)
- Large project with many tasks
- Network latency

**How to diagnose**:
1. Check if error messages mention "rate limit"
2. Note how many tasks and resources your project has
3. Test with a smaller project to see if it's size-related

**How to fix it**:
1. **Wait and retry**:
   - The tool automatically handles rate limits
   - It waits and retries automatically
   - Rate limits reset after 60 seconds
2. **For very large projects**:
   - Migration may take longer (this is normal)
   - The tool shows progress so you know it's working
3. **For network issues**:
   - Check your internet connection
   - Retry the migration

**How to prevent it**:
- Be patient with large projects - the tool is working even if it seems slow
- Run migrations during off-peak hours if possible
- Test with smaller projects first

---

## Quick Health Checks

### Test Your Configuration

```bash
# Check if authentication works
npm run dev validate -- --source [your-project-id]

# View your configuration (passwords hidden)
npm run dev config

# Test without making changes
npm run dev import -- --source [project-id] --destination [workspace-id] --dry-run
```

### Get More Information

```bash
# See detailed information as the migration runs
npm run dev import --source [project-id] --destination [workspace-id] --verbose
```

---

## Getting Additional Help

If you can't resolve an issue using this guide:

1. **Review the error message carefully** - it often explains what's wrong
2. **Check this troubleshooting section** - look for similar symptoms
3. **Verify your configuration** - double-check all settings
4. **Test your connection** - use the validation command
5. **Contact your administrator** - for permission-related issues with Azure Active Directory or Smartsheet

When reporting an issue, please provide:
- The complete error message
- What you were trying to do
- Your configuration (without passwords)
- Steps to reproduce the problem

---

<div align="center">

| [← Previous: Using the Migration Tool](../project/CLI-Usage-Guide.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Code Conventions →](./conventions.md) |
|:---|:---:|---:|

</div>