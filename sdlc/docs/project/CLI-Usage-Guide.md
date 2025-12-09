**📚 Implementation Guide Series**

**Previous**: [← Authentication Setup](./Authentication-Setup.md)

📍 **Current**: CLI Usage Guide

**Next**: [Troubleshooting Playbook →](../code/troubleshooting-playbook.md)

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


# CLI Usage Guide

## Overview

The Project Online to Smartsheet ETL tool provides a command-line interface with enhanced logging, progress reporting, error handling, and configuration management. This guide covers all CLI features and usage patterns.

**Last Updated**: 2024-12-08

---

## Table of Contents

- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
- [Configuration](#configuration)
- [CLI Options](#cli-options)
- [Progress Reporting](#progress-reporting)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Setup Configuration

Create a `.env` file in the project root:

```bash
cp .env.sample .env
```

Edit `.env` and add your credentials:

```env
# Project Online Connection
TENANT_ID=your-azure-tenant-id
CLIENT_ID=your-azure-app-client-id
CLIENT_SECRET=your-azure-app-client-secret
PROJECT_ONLINE_URL=https://your-tenant.sharepoint.com/sites/pwa

# Smartsheet Connection
SMARTSHEET_API_TOKEN=your_smartsheet_token_here

# Optional: Reuse existing PMO Standards workspace
PMO_STANDARDS_WORKSPACE_ID=12345678901234
```

### 2. Verify Configuration

```bash
npm run cli config
```

This validates your configuration and shows you what's configured (with sensitive values masked).

### 3. Run Import

```bash
npm run cli import \
  --source "project-guid-here" \
  --destination "workspace-id-here"
```

---

## Command Reference

### `import` - Import Project Data

Import data from Project Online to Smartsheet.

```bash
npm run cli import --source <project-id> --destination <workspace-id> [options]
```

**Arguments:**
- `--source <project-id>` - Project Online project ID (GUID format)
- `--destination <workspace-id>` - Smartsheet workspace ID (used for validation)

**Options:**
- `-v, --verbose` - Enable detailed debug logging
- `--dry-run` - Validate configuration without making changes
- `--config <path>` - Use custom configuration file (default: `.env`)

**Examples:**

```bash
# Standard import
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456"

# Dry run to test configuration and extract data
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --dry-run

# Verbose logging for debugging
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --verbose

# Custom configuration file
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --config .env.production
```

---

### `validate` - Validate Source Data

Validate Project Online configuration and connectivity without performing import.

```bash
npm run cli validate --source <project-id> [options]
```

**Arguments:**
- `--source <project-id>` - Project Online project ID (GUID format)

**Options:**
- `-v, --verbose` - Enable detailed debug logging
- `--config <path>` - Use custom configuration file

**Examples:**

```bash
# Validate source URL and configuration
npm run cli validate \
  --source "https://contoso.sharepoint.com/sites/PWA/_api/ProjectData"

# Verbose validation
npm run cli validate \
  --source "https://contoso.sharepoint.com/sites/PWA/_api/ProjectData" \
  --verbose
```

**What it checks:**
- ✓ Source URL format validity
- ✓ Smartsheet API token presence
- ℹ️ Full connectivity validation (pending extraction layer)

---

### `config` - Validate Configuration

Validate and display current configuration.

```bash
npm run cli config [options]
```

**Options:**
- `-v, --verbose` - Show additional configuration details
- `--config <path>` - Validate custom configuration file

**Examples:**

```bash
# Check default configuration
npm run cli config

# Validate production configuration
npm run cli config --config .env.production

# Verbose configuration check
npm run cli config --verbose
```

**Output:**

```
⚙️  Configuration Validator

✓ Configuration loaded successfully

Configuration Summary:
  • TENANT_ID: ********
  • CLIENT_ID: ********
  • CLIENT_SECRET: ********
  • PROJECT_ONLINE_URL: https://your-tenant.sharepoint.com/sites/pwa
  • SMARTSHEET_API_TOKEN: ********token (80 characters)
  • PMO_STANDARDS_WORKSPACE_ID: Not set (will create new workspace)

✅ Configuration is valid
```

---

## Configuration

### Environment Variables

The tool uses environment variables for configuration. Store these in a `.env` file in the project root.

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TENANT_ID` | Azure AD tenant ID | `12345678-1234-1234-1234-123456789012` |
| `CLIENT_ID` | Azure AD app registration client ID | `87654321-4321-4321-4321-210987654321` |
| `CLIENT_SECRET` | Azure AD app registration client secret | `abc123...xyz789` |
| `PROJECT_ONLINE_URL` | Project Online site URL | `https://contoso.sharepoint.com/sites/pwa` |
| `SMARTSHEET_API_TOKEN` | Your Smartsheet API access token | `abc123...xyz789` |

#### Optional Variables

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `PMO_STANDARDS_WORKSPACE_ID` | Existing PMO Standards workspace ID (reuse across projects) | `1234567890123456` | Creates new workspace |

### Configuration Files

#### `.env` - Development/Default Configuration

Primary configuration file. Git-ignored for security.

```env
# Project Online Connection
TENANT_ID=your-azure-tenant-id
CLIENT_ID=your-azure-app-client-id
CLIENT_SECRET=your-azure-app-client-secret
PROJECT_ONLINE_URL=https://your-tenant.sharepoint.com/sites/pwa

# Smartsheet Configuration
SMARTSHEET_API_TOKEN=your_token_here

# Optional: Reuse existing PMO Standards workspace
PMO_STANDARDS_WORKSPACE_ID=1234567890123456
```

#### `.env.sample` - Configuration Template

Template file showing required variables. Committed to git.

```env
# Project Online Connection
# Azure AD app registration credentials
TENANT_ID=
CLIENT_ID=
CLIENT_SECRET=
PROJECT_ONLINE_URL=

# Smartsheet API Token
# Get yours from: https://app.smartsheet.com/b/home?lx=<your_account_id>#/accountsettings/apiAccess
SMARTSHEET_API_TOKEN=

# Optional: PMO Standards Workspace ID
# Leave empty to create a new workspace, or provide an existing workspace ID to reuse
PMO_STANDARDS_WORKSPACE_ID=
```

#### Custom Configuration Files

You can use custom configuration files for different environments:

```bash
# Production configuration
npm run cli import \
  --source "..." \
  --destination "..." \
  --config .env.production

# Testing configuration
npm run cli validate \
  --source "..." \
  --config .env.test
```

### Security Best Practices

1. **Never commit `.env` files** - They're git-ignored by default
2. **Use `.env.sample` for templates** - Commit this without actual credentials
3. **Rotate tokens regularly** - Update tokens on a schedule
4. **Use separate tokens per environment** - Don't share tokens between dev/prod

---

## CLI Options

### Global Options

These options work with all commands:

#### `-v, --verbose` - Verbose Logging

Enable detailed debug logging to see what's happening under the hood.

```bash
npm run cli import ... --verbose
```

**Output Levels:**
- **Normal**: INFO, WARN, ERROR, SUCCESS messages
- **Verbose**: Adds DEBUG messages for detailed troubleshooting

**When to use:**
- Troubleshooting configuration issues
- Understanding the import process
- Debugging API interactions

#### `--config <path>` - Custom Configuration

Use a custom configuration file instead of default `.env`.

```bash
npm run cli import ... --config .env.production
```

**Use cases:**
- Separate dev/staging/production environments
- Customer-specific configurations
- Testing with different credentials

#### `--dry-run` - Dry Run Mode

Validate configuration and process without making actual changes.

```bash
npm run cli import ... --dry-run
```

**What it does:**
- ✓ Validates configuration
- ✓ Tests Project Online authentication
- ✓ Extracts project data from Project Online
- ✓ Reports data statistics (tasks, resources, assignments)
- ✗ Skips all Smartsheet write operations

**When to use:**
- Testing configuration before actual import
- Validating Project Online connectivity
- Previewing import process

---

## Progress Reporting

The CLI provides real-time progress feedback during imports.

### Progress Display

```
📦 Starting import for project: Customer Implementation Project

[1/7] PMO Standards Setup ⣾ 
```

### Multi-Stage Progress

For complex operations, progress is broken into stages:

```
[1/7] PMO Standards Setup ✓ Workspace ID: 1234567890123456
[2/7] Project Workspace Creation ✓ Customer Implementation (ID: 9876543210987654)
[3/7] Summary Sheet Configuration ✓ Status and Priority picklists configured
[4/7] Task Import ████████████████████░░ 85% (425/500 tasks) ETA: 2m 15s
```

### Progress Indicators

- **Spinner** (⣾⣽⣻⢿⡿⣟⣯⣷) - Active processing
- **Progress Bar** (████░░░░) - Batch operations with percentage
- **Checkmark** (✓) - Stage completed
- **Cross** (✗) - Stage failed

### ETA Calculation

For operations with many items (tasks, resources), the CLI estimates time remaining:

```
[4/7] Task Import ████████░░░░░░░░░░░░ 40% (200/500 tasks) ETA: 5m 30s
```

### Summary Report

After completion, view a summary of all stages:

```
Import Summary:
  Stage 1 (PMO Standards Setup): ✓ 2.3s
  Stage 2 (Project Workspace Creation): ✓ 4.1s
  Stage 3 (Summary Sheet Configuration): ✓ 1.8s
  Stage 4 (Task Import): ✓ 180.5s
  Stage 5 (Task Sheet Configuration): ✓ 2.1s
  Stage 6 (Resource Import): ✓ 45.3s
  Stage 7 (Assignment Column Creation): ✓ 12.7s

Total Time: 4m 9s

✅ Import completed successfully!
   Workspace: https://app.smartsheet.com/folders/12345678901234
```

---

## Error Handling

The CLI provides actionable error messages with suggested fixes.

### Error Types

#### Configuration Errors

When configuration is invalid or missing:

```
❌ Configuration Error: SMARTSHEET_API_TOKEN is missing

💡 To fix this:
   1. Create a .env file in the project root
   2. Add: SMARTSHEET_API_TOKEN=your_token_here
   3. Get your token from: https://app.smartsheet.com/b/home#/accountsettings/apiAccess
```

#### Validation Errors

When input parameters are invalid:

```
❌ Validation Error: source must be a valid Project Online URL

💡 Expected format:
   https://your-tenant.sharepoint.com/sites/PWA/_api/ProjectData

   Current value: "invalid-url"
```

#### Network Errors

When network connectivity fails:

```
❌ Network Error: Unable to connect to Smartsheet API

💡 To fix this:
   1. Check your internet connection
   2. Verify Smartsheet API is accessible
   3. Check firewall/proxy settings
   4. Retry the operation

   If the problem persists, contact support.
```

#### Authentication Errors

When API token is invalid:

```
❌ Authentication Error: Smartsheet API token is invalid or expired

💡 To fix this:
   1. Verify your token in the .env file
   2. Ensure the token hasn't expired
   3. Generate a new token if needed: https://app.smartsheet.com/b/home#/accountsettings/apiAccess
   4. Update SMARTSHEET_API_TOKEN in .env
```

#### Rate Limit Errors

When API rate limits are exceeded:

```
❌ Rate Limit Error: Smartsheet API rate limit exceeded

💡 The tool will automatically retry with exponential backoff.
   
   Rate limits:
   • 300 requests per minute
   • Resets every 60 seconds
   
   Current operation will resume shortly...
```

#### Permission Errors

When API token lacks required permissions:

```
❌ Permission Error: Insufficient permissions to create workspace

💡 To fix this:
   1. Verify your Smartsheet account has workspace creation permissions
   2. Check if you're using the correct API token
   3. Contact your Smartsheet admin to grant necessary permissions
```

#### Data Errors

When source data is invalid:

```
❌ Data Error: Project 'Customer Project' is missing required field: Name

💡 Verify the source data:
   1. Check Project Online project has all required fields
   2. Ensure custom field mappings are correct
   3. Review project data in Project Online web interface
```

### Error Recovery

The CLI uses automatic retry logic for transient errors:

- **Network failures**: 3 retries with exponential backoff
- **Rate limits**: Automatic backoff until limit resets
- **Temporary API issues**: Retry with increasing delays

```
⚠️  Request failed: Network timeout
⏳ Retrying in 2 seconds (attempt 1/3)...
```

---

## Examples

### Complete Workflow Example

```bash
# 1. Setup configuration
cp .env.sample .env
nano .env  # Add your SMARTSHEET_API_TOKEN

# 2. Verify configuration
npm run cli config

# Output:
# ✓ Configuration loaded successfully
# Configuration Summary:
#   • SMARTSHEET_API_TOKEN: ********token (80 characters)

# 3. Validate source and test connectivity
npm run cli validate \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Output:
# 🔍 Validating Project Online data
#
# Validating source: a1b2c3d4-e5f6-7890-abcd-ef1234567890
#
# ✓ Project ID format is valid
# ✓ Azure AD Tenant ID is configured
# ✓ Azure AD Client ID is configured
# ✓ Azure AD Client Secret is configured
# ✓ Project Online URL is configured
# ✓ Smartsheet API token is configured
#
# 🔌 Testing Project Online connection...
# ✓ Connection to Project Online successful
#
# ✅ Validation passed

# 4. Dry run first to test extraction
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --dry-run

# Output:
# 🚀 Project Online to Smartsheet ETL
#
# 📥 Source: Project Online project a1b2c3d4-e5f6-7890-abcd-ef1234567890
# 📤 Destination: Smartsheet workspace 1234567890123456
#
# 🚨 DRY RUN MODE: No changes will be made
#
# In dry-run mode, the tool will:
#   • Validate configuration
#   • Connect to Project Online
#   • Extract project data
#   • Process data transformations
#   • Skip all Smartsheet write operations
#
# Testing Project Online connection...
#
# Extracting data for project a1b2c3d4-e5f6-7890-abcd-ef1234567890...
#
# ✅ Dry run completed successfully!
#    Project: Customer Implementation Project
#    Tasks: 342
#    Resources: 28
#    Assignments: 567

# 5. Perform actual import
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456"
```

### Development/Testing Examples

```bash
# Verbose debugging
npm run cli import \
  --source "..." \
  --destination "..." \
  --verbose

# Test with custom configuration
npm run cli config --config .env.test

# Validate different project IDs
npm run cli validate --source "dev-project-guid"
npm run cli validate --source "staging-project-guid"
npm run cli validate --source "prod-project-guid"
```

### Production Examples

```bash
# Use production configuration
npm run cli import \
  --source "prod-project-guid" \
  --destination "9876543210987654" \
  --config .env.production

# Validate before import
npm run cli validate \
  --source "prod-project-guid" \
  --config .env.production

npm run cli import \
  --source "prod-project-guid" \
  --destination "9876543210987654" \
  --config .env.production
```

---

## Troubleshooting

### Common Issues

#### "Configuration Error: SMARTSHEET_API_TOKEN is missing"

**Cause**: No `.env` file or missing token in `.env`

**Solution**:
```bash
# Create .env from template
cp .env.sample .env

# Add your token
echo "SMARTSHEET_API_TOKEN=your_token_here" >> .env

# Verify configuration
npm run cli config
```

#### "Authentication Error: Invalid token"

**Cause**: Smartsheet token is invalid, expired, or has wrong permissions, OR Azure AD credentials are incorrect

**Solution for Smartsheet**:
1. Generate new token: https://app.smartsheet.com/b/home#/accountsettings/apiAccess
2. Update `.env` file with new token
3. Ensure token has required scopes (Create Sheets, Read Sheets, Write Sheets)

**Solution for Project Online**:
1. Verify TENANT_ID, CLIENT_ID, and CLIENT_SECRET in `.env`
2. Ensure Azure AD app has Sites.ReadWrite.All permission with admin consent
3. Check PROJECT_ONLINE_URL is correct
4. Test connection with `npm run cli validate --source <project-id>`

#### "Network Error: ENOTFOUND"

**Cause**: DNS resolution failed or no internet connectivity

**Solution**:
1. Check internet connection
2. Verify you can access https://api.smartsheet.com in browser
3. Check corporate firewall/proxy settings
4. Try again with verbose logging: `--verbose`

#### "Rate Limit Exceeded"

**Cause**: Too many API requests (>300/minute)

**Solution**:
- The tool automatically retries with backoff
- Wait 60 seconds for rate limit to reset
- Consider batching operations if making multiple imports

#### "Permission Error: Cannot create workspace"

**Cause**: Smartsheet account lacks workspace creation permissions

**Solution**:
1. Contact your Smartsheet administrator
2. Request workspace creation permissions
3. Or use existing workspace: Set `PMO_STANDARDS_WORKSPACE_ID` in `.env`

### Debug Mode

Enable verbose logging to see detailed debug information:

```bash
npm run cli import ... --verbose
```

**Debug output includes**:
- Configuration loading details
- API request/response details
- Transformation step-by-step progress
- Memory and performance metrics

### Getting Help

**Check documentation**:
- [ETL System Design](../architecture/02-etl-system-design.md) - System design and architecture
- [Data Transformation Guide](../architecture/03-data-transformation-guide.md) - Data mappings and output structure
- [Project-Plan.md](./Project-Plan.md) - Implementation status

**Report issues**:
1. Run command with `--verbose` flag
2. Copy full error output
3. Include `.env.sample` (without actual credentials)
4. Describe expected vs actual behavior

---

## Advanced Usage

### Programmatic Usage

If you need to use the importer programmatically instead of via CLI:

```typescript
import { ProjectOnlineImporter } from './lib/importer';
import { SmartsheetClient } from './types/SmartsheetClient';
import { Logger, LogLevel } from './util/Logger';
import { ErrorHandler } from './util/ErrorHandler';

// Initialize with custom logger
const logger = new Logger({
  level: LogLevel.INFO,
  timestamps: true,
  colors: true
});

const errorHandler = new ErrorHandler(logger);
const client = ...; // Initialize Smartsheet client

const importer = new ProjectOnlineImporter(client, logger, errorHandler);

// Import project
const result = await importer.importProject({
  project: projectData,
  tasks: taskData,
  resources: resourceData,
  assignments: assignmentData
});

if (result.success) {
  console.log(`Workspace created: ${result.workspacePermalink}`);
} else {
  console.error('Import failed:', result.errors);
}
```

### Environment-Specific Configurations

Create separate configuration files for each environment:

**`.env.development`**:
```env
TENANT_ID=dev-tenant-id
CLIENT_ID=dev-client-id
CLIENT_SECRET=dev-client-secret
PROJECT_ONLINE_URL=https://dev-tenant.sharepoint.com/sites/pwa
SMARTSHEET_API_TOKEN=dev_token_here
PMO_STANDARDS_WORKSPACE_ID=1234567890123456
```

**`.env.staging`**:
```env
TENANT_ID=staging-tenant-id
CLIENT_ID=staging-client-id
CLIENT_SECRET=staging-client-secret
PROJECT_ONLINE_URL=https://staging-tenant.sharepoint.com/sites/pwa
SMARTSHEET_API_TOKEN=staging_token_here
PMO_STANDARDS_WORKSPACE_ID=2345678901234567
```

**`.env.production`**:
```env
TENANT_ID=prod-tenant-id
CLIENT_ID=prod-client-id
CLIENT_SECRET=prod-client-secret
PROJECT_ONLINE_URL=https://prod-tenant.sharepoint.com/sites/pwa
SMARTSHEET_API_TOKEN=prod_token_here
PMO_STANDARDS_WORKSPACE_ID=3456789012345678
```

Use with CLI:
```bash
npm run cli import ... --config .env.production
```

---

## Future Enhancements

Planned CLI improvements:

- [ ] **Project listing**: List available projects from Project Online (`list-projects` command)
- [ ] **Incremental import**: Import only changed data since last run
- [ ] **Batch import**: Import multiple projects in one operation
- [ ] **Export configuration**: Generate configuration from existing workspace
- [ ] **Resume capability**: Resume interrupted imports from checkpoint
- [ ] **Rollback capability**: Undo failed imports

---

**📚 Implementation Guide Series**

**Previous**: [← Authentication Setup](./Authentication-Setup.md)

📍 **Current**: CLI Usage Guide

**Next**: [Troubleshooting Playbook →](../code/troubleshooting-playbook.md)

**Complete Series**:
1. [Project Online Migration Overview](../architecture/01-project-online-migration-overview.md)
2. [ETL System Design](../architecture/02-etl-system-design.md)
3. [Data Transformation Guide](../architecture/03-data-transformation-guide.md)
4. [Template-Based Workspace Creation](./Template-Based-Workspace-Creation.md)
5. [Re-run Resiliency](./Re-run-Resiliency.md)
6. [Sheet References](./Sheet-References.md)
7. [Authentication Setup](./Authentication-Setup.md)
8. **CLI Usage Guide** (You are here)
9. [Troubleshooting Playbook](../code/troubleshooting-playbook.md)
10. [Code Conventions](../code/conventions.md)
11. [Code Patterns](../code/patterns.md)
12. [Anti-Patterns](../code/anti-patterns.md)

**🔗 Related Documentation**:
- [Authentication Setup](./Authentication-Setup.md) - Azure AD and credential configuration
- [ETL System Design](../architecture/02-etl-system-design.md) - System architecture and components

**Document Version**: 1.1
**Last Updated**: 2024-12-08
**Status**: Reflects actual implementation with full Project Online client and authentication