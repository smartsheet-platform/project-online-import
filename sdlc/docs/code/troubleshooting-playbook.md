**📚 Implementation Guide Series**

<div align="center">

| [← Previous: CLI Usage Guide](../project/CLI-Usage-Guide.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Code Conventions →](./conventions.md) |
|:---|:---:|---:|

</div>

---

# Project Online Import - Troubleshooting Playbook

This document provides systematic approaches to diagnose and resolve common issues encountered during Project Online to Smartsheet migration.

## Overview

This playbook contains real-world troubleshooting scenarios based on production experience. Each entry includes:

- **Symptoms**: What you're seeing
- **Root Cause**: Why it's happening
- **Diagnosis Steps**: How to confirm the issue
- **Solutions**: How to fix it
- **Prevention**: How to avoid in future runs

**Last Updated**: 2024-12-08

---

## Common Error Categories

### 1. Authentication & Connection Issues

#### Error: "Authentication failed (401 Unauthorized)"

**Symptoms**:
- Import fails immediately with authentication error
- Validation command shows "Authentication failed"
- Token-related errors in logs

**Root Cause**:
- Invalid or expired Azure AD credentials
- Incorrect client secret
- Missing API permissions
- Project Online URL format incorrect

**Diagnosis Steps**:
1. Run validation command: `npm run dev validate -- --source [project-id]`
2. Check `.env` file for correct values:
   ```bash
   TENANT_ID=your-tenant-id
   CLIENT_ID=your-client-id
   CLIENT_SECRET=your-client-secret
   PROJECT_ONLINE_URL=https://your-tenant.sharepoint.com/sites/pwa
   ```
3. Verify client secret hasn't expired in Azure portal
4. Test Project Online URL in browser

**Solutions**:
1. **Rotate client secret**:
   - Azure portal → App registration → Certificates & secrets
   - Create new client secret
   - Update `.env` with new secret value
2. **Fix URL format**:
   - Must be: `https://[tenant].sharepoint.com/sites/[site-name]`
   - Example: `https://contoso.sharepoint.com/sites/pwa`
3. **Grant admin consent**:
   - Azure portal → App registration → API permissions
   - Click "Grant admin consent for [Organization]"

**Prevention**:
- Set client secret expiration for 12-24 months
- Keep separate development/production credentials
- Validate configuration before each major migration

#### Error: "Access forbidden (403 Forbidden)"

**Symptoms**:
- Authentication succeeds but API calls fail
- "Insufficient permissions" errors
- Can see Project Online data but can't create workspace

**Root Cause**:
- Missing SharePoint API permissions
- Incorrect Smartsheet API token scope
- License restrictions on Smartsheet account

**Diagnosis Steps**:
1. Verify Azure AD permissions:
   - Azure portal → App registration → API permissions
   - Must have **Sites.ReadWrite.All** with green checkmark
2. Check Smartsheet API token:
   - Must be owner/admin of destination workspace location
   - Token must have create workspace permissions
3. Test Smartsheet API directly:
   ```bash
   curl -H "Authorization: Bearer $SMARTSHEET_API_TOKEN" \
        "https://api.smartsheet.com/2.0/users/me"
   ```

**Solutions**:
1. **Add missing permissions**:
   - Azure portal → API permissions → Add permission
   - Select **SharePoint** → **Application permissions**
   - Check **Sites.ReadWrite.All** → Grant admin consent
2. **Use correct Smartsheet token**:
   - Account → Personal Settings → API Access
   - Generate new token with proper scope
3. **Check Smartsheet account limits**:
   - Verify workspace creation limits not exceeded
   - Ensure proper licensing (Professional or higher)

**Prevention**:
- Document required permissions in setup guide
- Use validation command before each migration
- Maintain separate test/production environments

### 2. Data Transformation Issues

#### Error: "Invalid data format" or "Transformation failed"

**Symptoms**:
- Import fails during transformation phase
- Errors about invalid dates, numbers, or strings
- Specific field mentioned in error message

**Root Cause**:
- Unexpected data formats in Project Online
- Missing required fields
- Invalid characters in names/descriptions
- Data quality issues in source system

**Diagnosis Steps**:
1. Identify failing field from error message
2. Run validation command to check data quality:
   ```bash
   npm run dev validate -- --source [project-id] --verbose
   ```
3. Export problematic Project Online data:
   ```typescript
   // Quick debug script
   const client = new ProjectOnlineClient(config);
   const project = await client.getProject(projectId);
   console.log(JSON.stringify(project, null, 2));
   ```
4. Compare with expected format in [Data Transformation Guide](../architecture/03-data-transformation-guide.md)

**Solutions**:
1. **Handle null/undefined values**:
   ```typescript
   // Before
   const name = project.Name;
   
   // After
   const name = project.Name || 'Unnamed Project';
   ```
2. **Add data validation**:
   ```typescript
   function validateProject(project: Project): void {
     if (!project.Name || project.Name.trim() === '') {
       throw ErrorHandler.validationError('Project Name', 'non-empty string');
     }
     if (project.StartDate && isNaN(new Date(project.StartDate).getTime())) {
       throw ErrorHandler.validationError('Start Date', 'valid ISO date string');
     }
   }
   ```
3. **Add character sanitization**:
   ```typescript
   function sanitizeName(name: string): string {
     return name
       .replace(/[/\\:*?"<>|]/g, '-')
       .replace(/-+/g, '-')
       .trim()
       .substring(0, 100);
   }
   ```

**Prevention**:
- Add comprehensive input validation
- Create unit tests for edge cases
- Document expected data formats
- Implement data quality checks in validation command

#### Error: "Duplicate sheets" or "Column already exists"

**Symptoms**:
- Warning about existing sheets during import
- "Column already exists" messages
- Multiple identical sheets created

**Root Cause**:
- Running import multiple times without cleanup
- Resiliency helpers not working correctly
- Template workspace already contains project sheets

**Diagnosis Steps**:
1. Check workspace before import:
   ```bash
   npm run dev validate -- --destination [workspace-id]
   ```
2. Look for existing sheets with similar names
3. Verify resiliency helpers are called:
   ```typescript
   // Should be using these:
   await getOrCreateSheet(client, workspaceId, sheetConfig);
   await addColumnsIfNotExist(client, sheetId, columns);
   ```

**Solutions**:
1. **Use proper resiliency helpers**:
   ```typescript
   // ✅ Correct
   const sheet = await getOrCreateSheet(client, workspaceId, {
     name: `${projectName} - Tasks`,
     columns: baseTaskColumns
   });
   
   const results = await addColumnsIfNotExist(client, sheet.id, customColumns);
   ```
2. **Manual cleanup** (if needed):
   - Delete duplicate sheets manually
   - Or use cleanup script: `scripts/cleanup-test-workspaces.ts`
3. **Update template workspace**:
   - Ensure template doesn't contain project-specific sheets
   - Only contain PMO Standards reference sheets

**Prevention**:
- Always use resiliency helpers for sheet/column creation
- Never run import on production workspace without verification
- Use separate test workspaces for development
- Implement proper re-run resiliency from start

### 3. Performance & Scaling Issues

#### Error: "API rate limit exceeded" or Slow Performance

**Symptoms**:
- Import takes significantly longer than expected
- Errors about rate limiting
- Logs show many retry attempts
- System appears unresponsive

**Root Cause**:
- Too many API calls without batching
- Rate limiting not properly implemented
- Large datasets processing sequentially
- Network latency issues

**Diagnosis Steps**:
1. Check logs for rate limit messages:
   ```bash
   # Look for these patterns:
   # "Rate limit exceeded, waiting X seconds"
   # "Retry attempt Y of Z"
   ```
2. Measure API call count:
   ```typescript
   // Add debug logging
   let apiCallCount = 0;
   
   async function wrappedApiCall(fn: () => Promise<any>) {
     apiCallCount++;
     if (apiCallCount % 100 === 0) {
       logger.debug(`API calls so far: ${apiCallCount}`);
     }
     return await fn();
   }
   ```
3. Compare with expected call count from architecture docs
4. Test with smaller dataset to isolate issue

**Solutions**:
1. **Enable batch operations**:
   ```typescript
   // Before - individual calls
   for (const task of tasks) {
     await client.addRow(sheetId, task);
   }
   
   // After - batch operation
   await client.addRows(sheetId, tasks);
   ```
2. **Optimize rate limiting**:
   ```typescript
   // Check built-in rate limiting in ProjectOnlineClient
   // Should already be implemented with proper backoff
   
   // For custom operations:
   const rateLimiter = new RateLimiter(250); // 250 calls/minute
   await rateLimiter.checkLimit();
   await client.createRow(sheetId, task);
   ```
3. **Parallelize independent operations**:
   ```typescript
   // Before - sequential
   for (const project of projects) {
     await importProject(project);
   }
   
   // After - parallel with concurrency control
   const concurrency = 3; // Match rate limit capabilities
   for (let i = 0; i < projects.length; i += concurrency) {
     const batch = projects.slice(i, i + concurrency);
     await Promise.all(batch.map(p => importProject(p)));
   }
   ```

**Prevention**:
- Design with batch operations from start
- Implement comprehensive rate limiting early
- Test with large datasets during development
- Monitor API usage patterns in production

### 4. Integration Issues

#### Error: "Reference sheet not found" or Picklist Issues

**Symptoms**:
- Errors about missing PMO Standards sheets
- Picklist columns show empty or wrong values
- Cross-sheet reference failures

**Root Cause**:
- PMO Standards workspace not created/setup
- Reference sheet IDs incorrect
- Workspace permissions issues
- Template workspace missing reference sheets

**Diagnosis Steps**:
1. Verify PMO Standards workspace exists:
   ```bash
   npm run dev validate -- --pmo-standards
   ```
2. Check reference sheet configuration:
   ```typescript
   // Debug output
   logger.debug('PMO Standards Info:', configManager.get().pmoStandards);
   ```
3. Manually verify sheets in Smartsheet UI
4. Check workspace sharing permissions

**Solutions**:
1. **Create missing reference sheets**:
   ```typescript
   // Auto-create PMO Standards if missing
   const pmoWorkspace = await getOrCreatePMOStandards(client);
   const statusSheet = await getOrCreateSheet(client, pmoWorkspace.id, {
     name: 'Project - Status',
     columns: [{ title: 'Value', type: 'TEXT_NUMBER', primary: true }]
   });
   ```
2. **Update configuration**:
   ```bash
   # In .env
   PMO_STANDARDS_WORKSPACE_ID=existing_workspace_id
   ```
3. **Fix template workspace**:
   - Ensure template contains all reference sheets
   - Verify sheet names match expected values

**Prevention**:
- Include PMO Standards setup in installation process
- Add validation for reference sheets
- Document required workspace structure
- Create automated setup script

---

## Diagnostic Commands

### Quick Health Check

```bash
# Check authentication
npm run dev validate -- --source [project-id]

# Check destination workspace
npm run dev validate -- --destination [workspace-id]

# Check PMO Standards
npm run dev validate -- --pmo-standards
```

### Detailed Debugging

```bash
# Verbose logging
npm run dev import -- --source [project-id] --destination [workspace-id] --verbose

# Dry-run mode (no changes)
npm run dev import -- --source [project-id] --destination [workspace-id] --dry-run

# Specific phase debugging
npm run dev validate -- --source [project-id] --only transformation
```

### Log Analysis

**Common patterns to search for**:
```bash
# Authentication issues
grep -i "auth\|401\|403" import.log

# Rate limiting
grep -i "rate\|limit\|429" import.log

# Data validation
grep -i "validation\|invalid" import.log

# API errors
grep -i "error\|fail" import.log
```

---

## Escalation Path

If you cannot resolve an issue with this playbook:

1. **Check GitHub issues** - Search for similar problems
2. **Review recent commits** - Look for related fixes
3. **Contact team lead** - Provide:
   - Complete error messages
   - Relevant log excerpts
   - Steps to reproduce
   - Configuration details (without secrets)

---

<div align="center">

| [← Previous: CLI Usage Guide](../project/CLI-Usage-Guide.md) | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [Next: Code Conventions →](./conventions.md) |
|:---|:---:|---:|

</div>