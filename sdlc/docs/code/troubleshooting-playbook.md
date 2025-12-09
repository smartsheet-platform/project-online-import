**📚 Implementation Guide Series**

**Previous**: [← CLI Usage Guide](../project/CLI-Usage-Guide.md)

📍 **Current**: Troubleshooting Playbook

**Next**: [Code Conventions →](./conventions.md)

**Complete Series**:
1. [Project Online Migration Overview](../architecture/01-project-online-migration-overview.md)
2. [ETL System Design](../architecture/02-etl-system-design.md)
3. [Data Transformation Guide](../architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](../project/Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](../project/Re-run-Resiliency.md)
6. [Sheet References](../project/Sheet-References.md)
7. [Authentication Setup](../project/Authentication-Setup.md)
8. [CLI Usage Guide](../project/CLI-Usage-Guide.md)
9. [Troubleshooting Playbook](../code/troubleshooting-playbook.md)
10. [Code Conventions](../code/conventions.md)
11. [Code Patterns](../code/patterns.md)
12. [Anti-Patterns](../code/anti-patterns.md)
13. [API Services Catalog](../code/api-services-catalog.md)
14. [Test Suite Guide](../../test/README.md)

---

# Project Online Import - Troubleshooting Playbook

This playbook provides systematic approaches to diagnosing and resolving common issues with the Project Online to Smartsheet ETL tool.

## Quick Diagnostic Commands

```bash
# Check configuration
npm run config

# Run in debug mode
LOG_LEVEL=DEBUG npm run import -- --source <project-id>

# Validate environment
node -e "console.log(process.env.SMARTSHEET_API_TOKEN ? 'Token set' : 'Token missing')"

# Test authentication
npm run test -- --testNamePattern="authentication"

# Run integration tests
npm run test:integration
```

## Common Error Categories

### Configuration Errors

#### Error: "Configuration Error: SMARTSHEET_API_TOKEN is required"

**Symptoms**:
```
❌ Configuration Error: SMARTSHEET_API_TOKEN is required but not set
💡 What to do: Update your .env file to set SMARTSHEET_API_TOKEN correctly
```

**Diagnosis**:
1. Check if `.env` file exists: `ls -la .env`
2. Check if token is set: `grep SMARTSHEET_API_TOKEN .env`
3. Check if token is valid length (26 characters)

**Resolution**:
```bash
# 1. Copy sample if .env doesn't exist
cp .env.sample .env

# 2. Edit .env and add token
# SMARTSHEET_API_TOKEN=your_26_character_token

# 3. Verify token format
node -e "const t = process.env.SMARTSHEET_API_TOKEN; console.log(t ? \`Length: \${t.length}\` : 'Not set')"

# 4. Get token from Smartsheet:
# - Go to Account > Personal Settings > API Access
# - Generate New Access Token
# - Copy 26-character token to .env
```

**Prevention**:
- Add `.env` to `.gitignore` (already done)
- Use `.env.sample` as template
- Document token requirements in README

---

#### Error: "Configuration Error: Invalid format for SMARTSHEET_API_TOKEN"

**Symptoms**:
```
⚠️  SMARTSHEET_API_TOKEN format may be invalid. Expected 26-character alphanumeric token.
```

**Diagnosis**:
```bash
# Check token length and format
node -e "
const token = process.env.SMARTSHEET_API_TOKEN || '';
console.log('Length:', token.length);
console.log('Valid format:', /^[a-zA-Z0-9]{26}$/.test(token));
console.log('Sample:', token.substring(0, 4) + '...' + token.substring(token.length - 4));
"
```

**Resolution**:
1. Token must be exactly 26 alphanumeric characters
2. No spaces, no special characters
3. Regenerate token in Smartsheet if corrupted
4. Copy carefully (no line breaks)

---

### Authentication Errors

#### Error: "Authentication error: Failed to acquire token from Azure AD"

**Symptoms**:
```
❌ Authentication error: Failed to acquire token
💡 What to do: Check TENANT_ID, CLIENT_ID, CLIENT_SECRET are correct
```

**Diagnosis**:
1. **Check credentials are set**:
```bash
echo "TENANT_ID: ${TENANT_ID:0:8}..."
echo "CLIENT_ID: ${CLIENT_ID:0:8}..."
echo "CLIENT_SECRET: ${CLIENT_SECRET:0:8}..."
```

2. **Verify format** (all should be GUIDs):
```bash
node -e "
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log('TENANT_ID valid:', uuidRegex.test(process.env.TENANT_ID || ''));
console.log('CLIENT_ID valid:', uuidRegex.test(process.env.CLIENT_ID || ''));
"
```

3. **Test authentication manually**:
```bash
# Use curl to test Azure AD token endpoint
curl -X POST "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "scope=https://<your-domain>.sharepoint.com/.default" \
  -d "grant_type=client_credentials"
```

**Resolution**:
1. **Verify Azure AD App Registration**:
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Find your app registration
   - Copy Application (client) ID → `CLIENT_ID`
   - Copy Directory (tenant) ID → `TENANT_ID`
   
2. **Create/Verify Client Secret**:
   - In app registration → Certificates & secrets
   - Create new client secret if expired
   - Copy secret VALUE (not ID) → `CLIENT_SECRET`
   
3. **Verify API Permissions**:
   - API permissions should include Sites.Read.All or Sites.FullControl.All
   - Grant admin consent if required

4. **Check expiration**:
   - Client secrets expire (check expiration date)
   - Rotate before expiry

**Prevention**:
- Set calendar reminders for secret expiration
- Use key vault for production
- Document app registration setup

---

#### Error: "AADSTS700016: Application not found in directory"

**Symptoms**:
```
Error: AADSTS700016: Application with identifier 'xxx' was not found in the directory
```

**Diagnosis**:
- CLIENT_ID doesn't match any app registration in TENANT_ID
- Wrong tenant or wrong client ID

**Resolution**:
1. Verify CLIENT_ID and TENANT_ID match
2. Check app registration exists in correct tenant
3. Ensure app is not deleted or disabled

---

### API Errors

#### Error: "API rate limit exceeded"

**Symptoms**:
```
❌ API rate limit exceeded
💡 What to do: Wait 60 seconds before retrying. Consider reducing batch size.
```

**Diagnosis**:
```bash
# Check current batch size
grep BATCH_SIZE .env

# Monitor API calls
LOG_LEVEL=DEBUG npm run import 2>&1 | grep "API call"
```

**Resolution**:
1. **Wait for rate limit reset** (usually 60 seconds)
2. **Reduce batch size**:
```bash
# In .env
BATCH_SIZE=50  # Down from default 100
```
3. **Add delays between operations**
4. **Check rate limit headers** in debug logs

**Prevention**:
- Implement rate limiting (already done in ProjectOnlineClient)
- Batch operations when possible
- Use pagination efficiently

---

#### Error: "Network error: ECONNREFUSED" or "ETIMEDOUT"

**Symptoms**:
```
❌ Failed to connect to Project Online: ECONNREFUSED
💡 What to do: Check internet connection and verify PROJECT_ONLINE_URL
```

**Diagnosis**:
1. **Test basic connectivity**:
```bash
# Ping Project Online
ping <your-tenant>.sharepoint.com

# Test HTTPS
curl -I https://<your-tenant>.sharepoint.com
```

2. **Verify URL format**:
```bash
# Should be: https://<tenant>.sharepoint.com/sites/<site>
echo $PROJECT_ONLINE_URL
```

3. **Check proxy settings** (if behind corporate firewall):
```bash
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

**Resolution**:
1. Verify internet connection
2. Check PROJECT_ONLINE_URL is correct
3. Configure proxy if needed:
```bash
# In .env
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```
4. Check firewall/VPN requirements
5. Test from different network if possible

---

#### Error: "Request failed with status code 404"

**Symptoms**:
```
❌ Project not found: Request failed with status code 404
```

**Diagnosis**:
1. **Verify project ID**:
```bash
# Project ID should be a GUID
echo "Project ID: ${PROJECT_ID}"
# Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

2. **Test project access**:
```bash
# Try listing all projects
npm run import -- --list-projects
```

**Resolution**:
1. Verify project ID is correct (copy from Project Online)
2. Check user has access to project
3. Verify project is published (not draft)
4. Check project hasn't been deleted

---

### Data Transformation Errors

#### Error: "Validation error: Project Name must be non-empty string"

**Symptoms**:
```
❌ Validation error: Project Name must be non-empty string
💡 What to do: Check source data for missing required fields
```

**Diagnosis**:
```bash
# Run validation only
npm run validate -- --source <project-id>

# Check raw Project Online data
LOG_LEVEL=DEBUG npm run import 2>&1 | grep "Project data"
```

**Resolution**:
1. Check Project Online project has Name field populated
2. Verify OData query includes Name field
3. Fix data in Project Online source
4. Re-run import after fixing

---

#### Error: "Failed to transform task: Invalid OutlineLevel"

**Symptoms**:
```
❌ Failed to transform 5 of 100 tasks
Task ID xxx has invalid OutlineLevel
```

**Diagnosis**:
1. Check task hierarchy in Project Online
2. Verify OutlineLevel values are sequential
3. Look for orphaned tasks (parent doesn't exist)

**Resolution**:
1. Fix task hierarchy in Project Online
2. Ensure all parent tasks exist
3. Verify OutlineLevel starts at 1 (not 0)

---

### Smartsheet API Errors

#### Error: "Smartsheet API Error: Invalid column type"

**Symptoms**:
```
❌ Failed to create column: Invalid column type for PREDECESSOR
```

**Diagnosis**:
- PREDECESSOR column type only valid on project sheets
- Dependencies must be enabled first

**Resolution**:
```typescript
// Ensure dependencies are enabled before adding PREDECESSOR column
await client.sheets.updateSheet({
  sheetId,
  body: { dependenciesEnabled: true }
});

// Then add PREDECESSOR column
await client.sheets.addColumn({
  sheetId,
  body: {
    title: 'Predecessors',
    type: 'PREDECESSOR'
  }
});
```

---

#### Error: "Cannot set Duration column value when dependencies enabled"

**Symptoms**:
```
❌ Error 500: Cannot set value for Duration column
```

**Diagnosis**:
- Duration is auto-calculated from Start/End dates when dependencies enabled
- Attempting to set it directly causes 500 error

**Resolution**:
```typescript
// Don't set Duration directly
// if (columnMap['Duration']) {
//   cells.push({ columnId: columnMap['Duration'], value: duration });
// }

// Instead, set Start and End dates - Duration auto-calculated
if (columnMap['Start Date']) {
  cells.push({ columnId: columnMap['Start Date'], value: startDate });
}
if (columnMap['End Date']) {
  cells.push({ columnId: columnMap['End Date'], value: endDate });
}
```

---

### Template Workspace Errors

#### Error: "Template workspace not found: 9002412817049476"

**Symptoms**:
```
❌ Failed to copy workspace: Workspace 9002412817049476 not found
💡 What to do: Verify template workspace exists and API token has access
```

**Diagnosis**:
```bash
# Check if token can access workspace
node -e "
const client = require('smartsheet');
const smartsheet = client.createClient({ accessToken: process.env.SMARTSHEET_API_TOKEN });
smartsheet.workspaces.getWorkspace({ workspaceId: 9002412817049476 })
  .then(ws => console.log('Found:', ws.name))
  .catch(err => console.log('Error:', err.message));
"
```

**Resolution**:
1. **Verify template workspace exists**
2. **Share workspace with API token user**:
   - Open template workspace in Smartsheet
   - Share with user who owns API token
   - Grant Editor or Admin access
3. **Alternative**: Create new template workspace

**Creating Template Workspace**:
1. Create new workspace: "Project Template"
2. Add three sheets:
   - "Summary" (15 columns)
   - "Tasks" (18 columns)
   - "Resources" (18 columns)
3. Configure column structures per specification
4. Share with API token user
5. Update `TEMPLATE_WORKSPACE_ID` constant

---

### Re-run / Resiliency Errors

#### Error: "Sheet already exists but has different structure"

**Symptoms**:
```
⚠️  Sheet 'Project X - Tasks' already exists but missing expected columns
```

**Diagnosis**:
- Previous import failed mid-process
- Sheet exists but incomplete

**Resolution**:
1. **Option A: Use existing sheet** (recommended):
```typescript
// Resiliency helpers automatically add missing columns
await addColumnsIfNotExist(client, sheetId, requiredColumns);
```

2. **Option B: Delete and recreate**:
   - Delete incomplete sheet in Smartsheet
   - Re-run import (will create fresh sheet)

3. **Option C: Manual cleanup**:
   - Add missing columns manually in Smartsheet
   - Ensure column types match specification
   - Re-run import

**Prevention**:
- Use resiliency helpers (`getOrCreateSheet`, `addColumnsIfNotExist`)
- Don't interrupt imports mid-process
- Use dry-run mode first: `--dry-run`

---

## Systematic Troubleshooting Process

### Step 1: Identify Error Category

1. **Configuration** → Missing/invalid .env values
2. **Authentication** → Azure AD or API token issues  
3. **Network** → Connectivity problems
4. **API** → Rate limits, permissions, endpoints
5. **Data** → Validation, transformation errors
6. **Logic** → Code bugs, edge cases

### Step 2: Gather Diagnostic Information

```bash
# Enable verbose logging
export LOG_LEVEL=DEBUG

# Capture full output
npm run import -- --source <id> 2>&1 | tee import.log

# Check configuration
npm run config > config.txt

# Check versions
node --version > diagnostics.txt
npm --version >> diagnostics.txt
npm list --depth=0 >> diagnostics.txt
```

### Step 3: Isolate the Issue

1. **Test in isolation**:
```bash
# Test just authentication
npm test -- --testNamePattern="auth"

# Test just one transformer
npm test -- ProjectTransformer
```

2. **Reduce complexity**:
   - Try with smaller dataset
   - Skip optional features
   - Use mock clients in tests

3. **Compare with working case**:
   - Use sample data from `sample-workspace-info.json`
   - Test with known-good project

### Step 4: Check Assumptions

Common false assumptions:
- ❌ "The API token hasn't expired" → Check expiration
- ❌ "The project ID is correct" → Verify in UI
- ❌ "Dependencies are installed" → Run `npm install`
- ❌ "Environment is loaded" → Print `process.env`
- ❌ "The test data is valid" → Validate against schema

### Step 5: Search Documentation

1. **Project docs**: `sdlc/docs/project/`
2. **This troubleshooting guide**
3. **API documentation**:
   - [Smartsheet API](https://smartsheet.redoc.ly/)
   - [Project Online OData](https://docs.microsoft.com/en-us/previous-versions/office/project-odata/)
4. **Error handler source**: `src/util/ErrorHandler.ts`

### Step 6: Enable Debug Mode

```typescript
// In code - add temporary debug logging
console.log('DEBUG: Value =', JSON.stringify(value, null, 2));

// Use debugger
debugger;  // In Node.js with --inspect

// Check intermediate values
const intermediate = transformStep1(data);
logger.debug('After step 1:', intermediate);
const final = transformStep2(intermediate);
logger.debug('Final result:', final);
```

### Step 7: Create Minimal Reproduction

```typescript
// Isolate the failing case
const minimalProject = {
  Id: '123',
  Name: 'Test',
  // Only essential fields
};

const result = await transformer.transformProject(minimalProject);
// Does it fail? If yes, good minimal reproduction
```

## Performance Issues

### Symptom: Import Takes Too Long

**Diagnosis**:
```bash
# Profile with time tracking
time npm run import -- --source <id>

# Check API call counts in debug mode
LOG_LEVEL=DEBUG npm run import 2>&1 | grep "API call" | wc -l
```

**Common Causes**:
1. **Too many API calls** (N+1 problem)
2. **Large dataset** without batching
3. **No parallelization**
4. **Retry loops** on persistent errors
5. **Network latency**

**Resolution**:
1. **Batch operations**:
```typescript
// Bad: N API calls
for (const row of rows) {
  await client.addRow(sheetId, row);
}

// Good: 1 API call
await client.addRows(sheetId, rows);
```

2. **Parallel when safe**:
```typescript
// Sequential
const tasks = await getTasks();
const resources = await getResources();

// Parallel (if independent)
const [tasks, resources] = await Promise.all([
  getTasks(),
  getResources()
]);
```

3. **Cache expensive operations**:
```typescript
// Cache column map
const columnMap = await getColumnMap(client, sheetId);
// Reuse for all rows
```

4. **Use progress reporting** to identify bottlenecks

---

## Getting Help

### Before Asking for Help

Prepare this information:
1. **Error message** (full text)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Environment**:
   - Node.js version
   - Operating system
   - Package versions
5. **Configuration** (sanitized - no tokens!)
6. **Logs** (debug mode)

### Creating a Bug Report

```markdown
## Description
Brief description of issue

## Steps to Reproduce
1. Run `npm run import --source <id>`
2. Observe error: "..."

## Expected Behavior
Should create workspace with 3 sheets

## Actual Behavior
Error: "Configuration Error: ..."

## Environment
- Node.js: v18.17.0
- OS: macOS 14.0
- Package version: 1.0.0

## Logs
```
[Paste relevant logs here]
```

## Configuration (Sanitized)
SMARTSHEET_API_TOKEN: abc...xyz (26 chars)
TENANT_ID: 550e8400...
```

### Support Channels

1. **Search existing issues** in project repository
2. **Check documentation** in `sdlc/docs/`
3. **Review this troubleshooting guide**
4. **Ask team** in project chat/Slack
5. **Create issue** with bug report template

## Preventive Measures

### Development Best Practices

1. **Always use error handling**
2. **Write tests for edge cases**
3. **Validate inputs**
4. **Use resiliency helpers**
5. **Enable debug logging during development**
6. **Test with real data** (sample size)

### Operations Best Practices

1. **Monitor API token expiration**
2. **Set up alerting** for failures
3. **Log to file** for audit trail
4. **Use dry-run mode** first
5. **Backup before major operations**
6. **Document custom configurations**

### Monitoring Checklist

- [ ] API token valid and not expired
- [ ] Azure AD client secret not expired
- [ ] API rate limits not exceeded
- [ ] Network connectivity stable
- [ ] Template workspace accessible
- [ ] Test suite passing
- [ ] Recent imports successful

## Quick Reference

### Environment Variables Checklist

```bash
# Required
✓ SMARTSHEET_API_TOKEN (26 chars)
✓ TENANT_ID (GUID)
✓ CLIENT_ID (GUID)
✓ CLIENT_SECRET (string)

# Recommended
✓ PROJECT_ONLINE_URL
✓ PMO_STANDARDS_WORKSPACE_ID

# Optional
○ LOG_LEVEL (DEBUG/INFO/WARN/ERROR)
○ BATCH_SIZE (default: 100)
○ MAX_RETRIES (default: 3)
○ DRY_RUN (true/false)
```

### Common Commands

```bash
# Validate configuration
npm run config

# Run import
npm run import -- --source <project-guid>

# Dry run (no changes)
npm run import -- --source <project-guid> --dry-run

# Debug mode
LOG_LEVEL=DEBUG npm run import -- --source <project-guid>

# Run tests
npm test

# Integration tests
npm run test:integration

# Lint and format
npm run lint
npm run format
```

### Log Levels

- **DEBUG**: All details, including API calls and transformations
- **INFO**: Progress updates and major milestones (default)
- **WARN**: Non-fatal issues, deprecations
- **ERROR**: Fatal errors, exceptions
- **SILENT**: No output

### Exit Codes

- `0`: Success
- `1`: General error
- `2`: Configuration error
- `3`: Authentication error
- `4`: Validation error
- `5`: API error

---

Remember: Most issues are configuration or environment problems. Check `.env` first, test authentication second, then investigate data/logic issues.

---

**📚 Implementation Guide Series**

**Previous**: [← CLI Usage Guide](../project/CLI-Usage-Guide.md)

📍 **Current**: Troubleshooting Playbook

**Next**: [Code Conventions →](./conventions.md)

**Complete Series**:
1. [Project Online Migration Overview](../architecture/01-project-online-migration-overview.md)
2. [ETL System Design](../architecture/02-etl-system-design.md)
3. [Data Transformation Guide](../architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](../project/Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](../project/Re-run-Resiliency.md)
6. [Sheet References](../project/Sheet-References.md)
7. [Authentication Setup](../project/Authentication-Setup.md)
8. [CLI Usage Guide](../project/CLI-Usage-Guide.md)
9. **Troubleshooting Playbook** (You are here)
10. [Code Conventions](./conventions.md)
11. [Code Patterns](./patterns.md)
12. [Anti-Patterns](./anti-patterns.md)
13. [API Services Catalog](../api-reference/api-services-catalog.md)
14. [Test Suite Guide](../../test/README.md)

**🔗 Related Documentation**:
- [CLI Usage Guide](../project/CLI-Usage-Guide.md) - Command-line interface and common operations
- [Code Conventions](./conventions.md) - Coding standards and best practices
- [ETL System Design](../architecture/02-etl-system-design.md) - System architecture overview

---