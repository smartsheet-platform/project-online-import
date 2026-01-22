<div align="center" style="background-image: url('https://www.smartsheet.com/sites/default/files/styles/1300px/public/2024-10/features-header-product-illustrations-ursa.png?itok=AMMNS_FZ'); background-size: cover; background-position: center; padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">

<img src="https://www.smartsheet.com/sites/default/files/smartsheet-logo-blue-new.svg" width="200" height="33" style="margin-bottom: 20px;">

<h1 style="color: rgba(0, 15, 51, 0.75);">🎯 Migrating to Smartsheet</h1>

🎯 Migrating · [🏗️ How it Works](./ETL-System-Design.md) · [🛠️ Contributing](../code/Conventions.md)

</div>

<div align="center">

[← Previous: Setting Up Authentication](./Authentication-Setup.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Troubleshooting →](../code/Troubleshooting-Playbook.md)

</div>

---


# Using the Migration Tool

## Overview

The migration tool runs from the command line and provides real-time feedback as it moves your data from Project Online to Smartsheet. This guide explains how to use the tool effectively.

---

## Quick Start

### 1. Set Up Your Configuration

Create a configuration file in the project folder:

```bash
cp .env.sample .env
```

Edit the `.env` file and add your credentials:

```env
# Project Online Connection (Device Code Flow)
TENANT_ID=your-azure-tenant-id
CLIENT_ID=your-azure-app-client-id
PROJECT_ONLINE_URL=https://your-tenant.sharepoint.com/sites/pwa

# Smartsheet Connection
SMARTSHEET_API_TOKEN=your_smartsheet_token_here

# Optional: Reuse existing Standards workspace
STANDARDS_WORKSPACE_ID=12345678901234
```

**Note:** No `CLIENT_SECRET` is required! The tool uses Device Code Flow authentication - you'll authenticate in your browser when you first run the tool.

### 2. Verify Your Configuration

Check that everything is set up correctly:

```bash
npm run cli config
```

This shows you what's configured (with passwords hidden for security).

### 3. Run Your Migration

```bash
npm run cli import \
  --source "your-project-id" \
  --destination "workspace-id"
```

---

## Available Commands

### Import: Migrate Your Project

Moves your data from Project Online to Smartsheet.

```bash
npm run cli import --source <project-id> --destination <workspace-id> [options]
```

**What you provide:**
- `--source <project-id>` - Your Project Online project identifier
- `--destination <workspace-id>` - Smartsheet workspace identifier (for validation)

**Additional options:**
- `-v, --verbose` - Show detailed information about what's happening
- `--dry-run` - Test the migration without actually creating anything
- `--config <path>` - Use a different configuration file

**Examples:**

```bash
# Basic migration
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456"

# Test run (no changes made)
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --dry-run

# See detailed information
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --verbose
```

---

### Validate: Check Before Migrating

Tests your Project Online connection and data without making any changes.

```bash
npm run cli validate --source <project-id> [options]
```

**What you provide:**
- `--source <project-id>` - Your Project Online project identifier

**Additional options:**
- `-v, --verbose` - Show detailed information
- `--config <path>` - Use a different configuration file

**What it checks:**
- ✓ Can connect to Project Online
- ✓ Your credentials work
- ✓ The project exists and is accessible
- ✓ Smartsheet token is configured

---

### Config: View Your Settings

Shows your current configuration settings.

```bash
npm run cli config [options]
```

**Additional options:**
- `-v, --verbose` - Show more details
- `--config <path>` - Check a different configuration file

**What you see:**

```
⚙️  Configuration Validator

✓ Configuration loaded successfully

Configuration Summary:
  • TENANT_ID: ******** (hidden for security)
  • CLIENT_ID: ******** (hidden for security)
  • PROJECT_ONLINE_URL: https://your-tenant.sharepoint.com/sites/pwa
  • SMARTSHEET_API_TOKEN: ********token (80 characters)
  • STANDARDS_WORKSPACE_ID: Not set (will create new workspace)
  • Authentication: Device Code Flow (interactive)
  • Token Cache: ~/.project-online-tokens/ (default)

✅ Configuration is valid
```

---

## Configuration Options

### Required Settings

These settings are required for the tool to work:

| Setting | What It's For | Example |
|---------|---------------|---------|
| `TENANT_ID` | Your Azure Active Directory tenant | `12345678-1234-1234-1234-123456789012` |
| `CLIENT_ID` | Your application identifier | `87654321-4321-4321-4321-210987654321` |
| `PROJECT_ONLINE_URL` | Your Project Online site address | `https://contoso.sharepoint.com/sites/pwa` |
| `SMARTSHEET_API_TOKEN` | Your Smartsheet access token | `abc123...xyz789` |

### Optional Settings

| Setting | What It's For | Example | If Not Set |
|---------|---------------|---------|------------|
| `STANDARDS_WORKSPACE_ID` | Existing Standards workspace to reuse | `1234567890123456` | Creates a new workspace |

### Security Tips

1. **Never commit `.env` files** - They contain your passwords
2. **Use `.env.sample` for examples** - It has no real passwords
3. **Change tokens regularly** - Update them on a schedule
4. **Use different tokens for testing** - Don't mix test and production credentials

---

## Command Options

### Show Detailed Information: `--verbose`

See everything that's happening as the migration runs:

```bash
npm run cli import --source ... --destination ... --verbose
```

**When to use**:
- Troubleshooting configuration issues
- Understanding what the migration is doing
- Diagnosing connection problems

### Test Without Changes: `--dry-run`

Preview what would happen without actually creating anything:

```bash
npm run cli import --source ... --destination ... --dry-run
```

**What it does:**
- ✓ Validates your configuration
- ✓ Tests your Project Online connection
- ✓ Extracts your project data
- ✓ Shows how many tasks, resources, and assignments you have
- ✗ Doesn't create anything in Smartsheet

**When to use**:
- Testing your configuration before the real migration
- Verifying you can connect to Project Online
- Previewing the migration process

### Use Different Configuration: `--config`

Use a different configuration file:

```bash
npm run cli import --source ... --destination ... --config .env.production
```

**When to use**:
- Separate test and production environments
- Different settings for different scenarios
- Testing with different credentials

---

## What You'll See

### Progress Updates

As the migration runs, you'll see real-time updates:

```
📦 Starting migration for: Customer Implementation Project

[1/7] Setting up Standards workspace ⣾
[1/7] Standards workspace ready ✓

[2/7] Creating project workspace ⣾
[2/7] Workspace created: Customer Implementation ✓

[3/7] Configuring summary sheet ⣾
[3/7] Summary sheet configured ✓

[4/7] Migrating tasks ████████████████████░░ 85% (425/500) Time remaining: 2m 15s
```

**Progress Indicators**:
- **Spinner** (⣾) - Currently working
- **Progress Bar** (████░░░░) - Shows percentage complete
- **Checkmark** (✓) - Stage finished
- **X** (✗) - Stage had an error

### Completion Summary

When finished, you'll see a summary:

```
Migration Summary:
  Standards Setup: ✓ Completed
  Workspace Creation: ✓ Completed  
  Summary Sheet: ✓ Completed
  Tasks: ✓ 500 migrated
  Task Configuration: ✓ Completed
  Resources: ✓ 45 migrated
  Assignments: ✓ Completed

✅ Migration completed successfully!
   View your workspace: https://app.smartsheet.com/folders/12345678901234
```

---

## Common Issues

### "Token is missing" Error

**What happened**:
The tool can't find your Smartsheet access token

**How to fix**:
```bash
# Create configuration file
cp .env.sample .env

# Add your token (edit the file)
# SMARTSHEET_API_TOKEN=your_token_here

# Verify it's set correctly
npm run cli config
```

### "Authentication failed" Error

**What happened**:
Your credentials aren't working

**For Smartsheet**:
1. Get a new token from https://app.smartsheet.com/b/home#/accountsettings/apiAccess
2. Update your `.env` file with the new token
3. Make sure the token has the right permissions

**For Project Online**:
1. Verify your Azure Active Directory credentials in `.env`
2. Check that the application has the required permissions with admin approval
3. Confirm your `PROJECT_ONLINE_URL` is correct
4. Test with: `npm run cli validate --source <project-id>`

### "Cannot connect" Error

**What happened**:
Network issues or incorrect configuration

**How to fix**:
1. Check your internet connection
2. Verify you can access https://api.smartsheet.com in your web browser
3. Check if your firewall or proxy is blocking connections
4. Try again with `--verbose` to see more details

### "Rate limit exceeded" Error

**What happened**:
Too many requests to Smartsheet (more than 300 per minute)

**What the tool does**:
- Automatically waits and retries
- The rate limit resets after 60 seconds
- Your migration continues after the wait

### "Cannot create workspace" Error

**What happened**:
Your Smartsheet account doesn't have permission to create workspaces

**How to fix**:
1. Contact your Smartsheet administrator
2. Request workspace creation permissions
3. Or provide an existing workspace ID in your configuration

---

## Complete Workflow Example

Here's a typical migration from start to finish:

```bash
# 1. Create configuration file
cp .env.sample .env
nano .env  # Edit and add your tokens

# 2. Check configuration
npm run cli config
# ✓ Configuration loaded successfully

# 3. Test connection to Project Online
npm run cli validate \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
# ✓ Connection successful

# 4. Preview the migration (no changes)
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456" \
  --dry-run
# ✅ Preview completed
#    Project: Customer Implementation  
#    Tasks: 342
#    Resources: 28
#    Assignments: 567

# 5. Run the actual migration
npm run cli import \
  --source "a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  --destination "1234567890123456"
# ✅ Migration completed!
```

---

<div align="center">

[← Previous: Setting Up Authentication](./Authentication-Setup.md) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [Next: Troubleshooting →](../code/Troubleshooting-Playbook.md)

</div>