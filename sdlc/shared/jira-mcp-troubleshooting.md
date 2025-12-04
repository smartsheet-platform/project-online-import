# Jira MCP Troubleshooting Patterns

## Overview
Comprehensive troubleshooting patterns for Jira/Atlassian MCP integration issues. Used by Dev Env mode for diagnosing and resolving MCP server problems.

## Applies To
- ✅ Roo Mode: Dev Env mode
- ✅ Claude Agent: dev-env

---

## MCP Configuration Location

**CRITICAL: Always use per-project .roo/mcp.json configuration**

### Correct Location
- **Path**: `.roo/mcp.json`
- **Scope**: Per-project configuration (RECOMMENDED)
- **Benefits**:
  - Version controlled with project
  - Team members get same MCP setup
  - Roo-specific configuration separate from VSCode settings
  - No global system pollution
  - Easy to remove or update per project

### Forbidden Locations
**NEVER use or reference global VSCode settings for Atlassian MCP:**
- ❌ `.vscode/settings.json`
- ❌ `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` (macOS)
- ❌ `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json` (Windows)
- ❌ `~/.vscode-server/data/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` (Linux)

**Why forbidden:**
- Creates conflicts between projects with different Jira instances
- Pollutes global configuration with project-specific credentials
- Makes it impossible to have different MCP setups per project
- Not version controlled or shareable with team

---

## Trigger Phrases

Recognize these as Jira MCP troubleshooting requests:
- "jira not working"
- "jira integration issue"
- "jira connection failed"
- "atlassian mcp error"
- "mcp server not responding"
- "jira tools not available"
- "can't connect to jira"
- "jira authentication failed"
- "zscaler certificate"
- "ssl certificate error"

---

## Error Patterns

### SSL/Certificate Errors
- **Pattern**: `SSL certificate verification failed`, `CERTIFICATE_VERIFY_FAILED`, `Zscaler`
- **Cause**: Corporate SSL inspection (e.g., Zscaler) intercepting HTTPS connections
- **Solution**: Export and mount Zscaler certificate in container

### Authentication Errors
- **Pattern**: `401 Unauthorized`, `403 Forbidden`, `Authentication failed`
- **Cause**: Invalid or missing API token, incorrect credentials
- **Solution**: Verify API token, check email format, regenerate token if needed

### Connection Errors
- **Pattern**: `Connection refused`, `ECONNREFUSED`, `MCP server not found`
- **Cause**: MCP server not running, container runtime issues, network problems
- **Solution**: Check container runtime status, verify MCP configuration, test network connectivity

### Container Runtime Errors
- **Pattern**: `Docker/Podman not found`, `container not found`
- **Cause**: Container runtime not installed or not running
- **Solution**: Install Docker/Podman, start container runtime service

---

## Diagnostic Workflow

### Step 1: Detect Issue Type
**Check MCP configuration exists:**
```bash
test -f .roo/mcp.json && echo "✅ Project MCP config exists" || echo "❌ No project MCP config"
test -f .vscode/settings.json && grep -q "mcpServers" .vscode/settings.json && echo "⚠️ INCORRECT: MCP in .vscode/settings.json" || true
```

**Identify error patterns:**
- Read error messages from VSCode Output panel
- Check for SSL, authentication, or connection errors
- Determine if first-time setup or existing installation

### Step 2: Reference Documentation
**Documentation files to check:**
- `sdlc/atlassian/ATLASSIAN_MCP.md` - Complete manual setup guide
- `sdlc/atlassian/ATLASSIAN_MCP_SETUP_SCRIPTS.md` - Automated setup documentation
- `sdlc/atlassian/README_SETUP_SCRIPTS.md` - Quick start guide
- `sdlc/atlassian/setup-atlassian-mcp-linux.sh` - Linux/macOS automated setup
- `sdlc/atlassian/setup-atlassian-mcp-windows.ps1` - Windows automated setup

### Step 3: Provide Targeted Solution

**Scenario: First-Time Setup**
- Condition: MCP settings file doesn't exist or Atlassian server not configured
- Solution: Recommend automated setup script
  1. Identify user's platform (Linux/macOS/Windows)
  2. Direct to appropriate setup script in `sdlc/atlassian/`
  3. Provide quick start commands from `README_SETUP_SCRIPTS.md`
  4. Explain what the script will do

**Scenario: SSL Certificate Error**
- Condition: Error mentions SSL, certificate, or Zscaler
- Solution: Guide through Zscaler certificate setup
  1. Reference `ATLASSIAN_MCP.md` section on Zscaler certificate export
  2. Provide platform-specific certificate export commands
  3. Verify certificate file exists and is valid
  4. Check MCP configuration has correct certificate mount
  5. If issues persist, recommend running setup script to automate

**Scenario: Authentication Error**
- Condition: Error mentions 401, 403, authentication, or unauthorized
- Solution: Verify API token and credentials
  1. Guide user to generate new Atlassian API token
  2. Verify token has correct permissions
  3. Check MCP configuration has correct email and token
  4. Test token manually with curl command
  5. Update MCP settings with correct credentials

**Scenario: Container Runtime Error**
- Condition: Error mentions Docker, Podman, or container not found
- Solution: Verify container runtime installation
  1. Check if Docker/Podman is installed and running
  2. Reference `ATLASSIAN_MCP.md` for container runtime installation
  3. Verify container runtime is accessible (`docker ps` or `podman ps`)
  4. If not installed, recommend setup script which handles installation

**Scenario: MCP Server Not Responding**
- Condition: MCP server configured but not responding or timing out
- Solution: Systematic MCP server troubleshooting
  1. Verify VSCode has been reloaded after configuration changes
  2. Check VSCode Output panel for MCP server errors
  3. Test container manually with commands from `ATLASSIAN_MCP_SETUP_SCRIPTS.md`
  4. Verify network connectivity to Atlassian services
  5. Check for proxy or firewall issues
  6. If all else fails, recommend re-running setup script

**Scenario: Configuration Corruption**
- Condition: MCP settings exist but appear corrupted or incomplete
- Solution: Backup and regenerate configuration
  1. Backup existing MCP settings file
  2. Run appropriate setup script to regenerate clean configuration
  3. Verify new configuration with test commands

---

## Automated Setup Scripts

### When to Recommend
- First-time Jira integration setup
- Complex SSL certificate issues
- Multiple configuration problems
- User prefers automated over manual setup
- Configuration appears corrupted

### Linux/macOS Script
**Path**: `sdlc/atlassian/setup-atlassian-mcp-linux.sh`

**Usage:**
```bash
cd sdlc/atlassian
chmod +x setup-atlassian-mcp-linux.sh
./setup-atlassian-mcp-linux.sh
```

**What it does:**
- Installs container runtime (Podman/Docker)
- Exports Zscaler certificate automatically
- Collects user credentials securely
- Configures MCP server for platform
- Tests installation end-to-end

### Windows Script
**Path**: `sdlc/atlassian/setup-atlassian-mcp-windows.ps1`

**Usage:**
```powershell
cd sdlc\atlassian
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-atlassian-mcp-windows.ps1
```

**Note**: Run PowerShell as Administrator for best results

**What it does:**
- Verifies Docker Desktop installation
- Exports Zscaler certificate from Windows store
- Collects user credentials securely
- Configures MCP server for Windows
- Tests installation end-to-end

---

## Docker/Podman Args Format

### Critical Requirement: Environment Variable Passing

**IMPORTANT**: MCP servers use the `env` section to define environment variables that should be available to the MCP server process. The MCP framework automatically handles passing these to the container runtime.

**This requirement is IDENTICAL for both Docker and Podman** - they use the same syntax.

### Required Environment Variables
- `CONFLUENCE_URL`
- `CONFLUENCE_USERNAME`
- `CONFLUENCE_API_TOKEN`
- `JIRA_URL`
- `JIRA_USERNAME`
- `JIRA_API_TOKEN`

### Correct Format (Docker)
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/sooperset/mcp-atlassian@sha256:27c8e5b890e16134a443f49683eaa794fdb48ed5bef785c1b4c88a0cd729df56"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your-email@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "your-api-token-here",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "your-email@smartsheet.com",
        "JIRA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Correct Format (Podman)
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "podman",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/sooperset/mcp-atlassian@sha256:27c8e5b890e16134a443f49683eaa794fdb48ed5bef785c1b4c88a0cd729df56"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your-email@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "your-api-token-here",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "your-email@smartsheet.com",
        "JIRA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

**Key Points:**
- The ONLY difference is the "command" field: `"docker"` vs `"podman"`
- The args array is IDENTICAL for both
- The env section is IDENTICAL for both
- Environment variables are defined in the `env` section
- The MCP framework passes these to the container runtime automatically

### Common Mistakes

**Missing env section:**
```json
"args": [
  "run", "-i", "--rm",
  "ghcr.io/sooperset/mcp-atlassian@sha256:..."
]
```
❌ Without the `env` section, environment variables will NOT be available
❌ MCP server will fail to connect due to missing credentials

**Manually adding -e flags in args:**
```json
"args": [
  "run", "-i", "--rm",
  "-e", "JIRA_URL=https://...",
  "ghcr.io/sooperset/mcp-atlassian@sha256:..."
]
```
❌ Don't manually add `-e` flags - the MCP framework handles this
✅ Define all environment variables in the `env` section instead

### Zscaler Certificate Handling

When Zscaler SSL inspection is present, additional args and env vars required:

```json
"args": [
  "run", "-i", "--rm",
  "--user", "root",
  "-v", "/Users/username/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
  "-e", "CONFLUENCE_URL=$CONFLUENCE_URL",
  "-e", "CONFLUENCE_USERNAME=$CONFLUENCE_USERNAME",
  "-e", "CONFLUENCE_API_TOKEN=$CONFLUENCE_API_TOKEN",
  "-e", "JIRA_URL=$JIRA_URL",
  "-e", "JIRA_USERNAME=$JIRA_USERNAME",
  "-e", "JIRA_API_TOKEN=$JIRA_API_TOKEN",
  "-e", "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt",
  "--entrypoint", "sh",
  "ghcr.io/sooperset/mcp-atlassian@sha256:...",
  "-c", "update-ca-certificates && su app -c 'mcp-atlassian'"
],
"env": {
  "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
  "CONFLUENCE_USERNAME": "your-email@smartsheet.com",
  "CONFLUENCE_API_TOKEN": "your-api-token-here",
  "JIRA_URL": "https://smartsheet.atlassian.net",
  "JIRA_USERNAME": "your-email@smartsheet.com",
  "JIRA_API_TOKEN": "your-api-token-here"
}
```

**Note**: When using custom entrypoints with Zscaler, environment variables must be explicitly passed with `-e VAR=$VAR` syntax in the args array, as the custom shell command bypasses the MCP framework's automatic environment handling.

Platform-specific certificate paths:
- Linux: `/home/username/.zscaler/ZscalerRootCA.pem`
- macOS: `/Users/username/.zscaler/ZscalerRootCA.pem`
- Windows: `C:/Users/username/.zscaler/ZscalerRootCA.pem`

---

## Validation Steps

### Verify Env Section
Check `.roo/mcp.json` or `.mcp.json` contains all required environment variables:
- `CONFLUENCE_URL`
- `CONFLUENCE_USERNAME`
- `CONFLUENCE_API_TOKEN`
- `JIRA_URL`
- `JIRA_USERNAME`
- `JIRA_API_TOKEN`

```bash
# Verify env section exists and has all required keys
jq '.mcpServers.atlassian.env | keys' .roo/mcp.json
```
Expected: All 6 environment variable names listed

### Test MCP Server Manually
```bash
docker run -i --rm \
  -e JIRA_URL="https://smartsheet.atlassian.net" \
  -e JIRA_USERNAME="user@example.com" \
  -e JIRA_API_TOKEN="token" \
  ghcr.io/sooperset/mcp-atlassian@sha256:... \
  --help
```
Expected: Should show MCP server help text without errors

---

## Response Structure

### Diagnosis
1. Clearly identify the specific Jira integration issue
2. Explain what's causing the problem in user-friendly terms

### Solution Recommendation

**Automated Option** (when issue can be resolved by setup script):
- Platform-specific script path
- Exact commands to run
- What the script will do
- Expected outcome

**Manual Option** (when issue requires specific manual intervention):
- Reference to specific section in `ATLASSIAN_MCP.md`
- Step-by-step commands from documentation
- Validation steps to confirm fix
- Explanation of why this approach is needed

### Validation
- Provide commands to verify the fix worked
- Explain what successful output looks like
- Offer next steps if validation fails

### Prevention
- Explain how to avoid this issue in the future
- Reference relevant documentation for deeper understanding

## MCP Configuration Creation Workflow

### Configuration File Locations

**Roo Code Users:**
- File: `.roo/mcp.json`
- Location: Inside `.roo/` directory
- Scope: Per-project, version controlled

**Claude Code Users:**
- File: `.mcp.json`
- Location: Project root
- Scope: Per-project, version controlled

**Detection Strategy:**
1. If `.roo` directory exists → Target: `.roo/mcp.json`
2. If `.claude` directory exists → Target: `.mcp.json`
3. If both exist → Ask user which one(s) to update
4. If neither exist → Ask user which AI assistant they're using

### Configuration Templates

#### Without Zscaler Certificate

For environments without Zscaler SSL inspection (e.g., EC2, home networks):

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/sooperset/mcp-atlassian:latest"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "user@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "actual-token-here",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "user@smartsheet.com",
        "JIRA_API_TOKEN": "actual-token-here"
      }
    }
  }
}
```

#### With Zscaler Certificate

For corporate environments with Zscaler SSL inspection:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--user", "root",
        "-v", "/path/to/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
        "-e", "CONFLUENCE_URL=$CONFLUENCE_URL",
        "-e", "CONFLUENCE_USERNAME=$CONFLUENCE_USERNAME",
        "-e", "CONFLUENCE_API_TOKEN=$CONFLUENCE_API_TOKEN",
        "-e", "JIRA_URL=$JIRA_URL",
        "-e", "JIRA_USERNAME=$JIRA_USERNAME",
        "-e", "JIRA_API_TOKEN=$JIRA_API_TOKEN",
        "-e", "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt",
        "--entrypoint", "sh",
        "ghcr.io/sooperset/mcp-atlassian:latest",
        "-c", "update-ca-certificates && su app -c 'mcp-atlassian'"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "user@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "actual-token-here",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "user@smartsheet.com",
        "JIRA_API_TOKEN": "actual-token-here"
      }
    }
  }
}
```

**Note**: The Zscaler configuration requires explicit `-e VAR=$VAR` syntax because the custom entrypoint bypasses the MCP framework's automatic environment variable handling.

**Platform-specific Zscaler certificate paths:**
- Linux: `/home/username/.zscaler/ZscalerRootCA.pem`
- macOS: `/Users/username/.zscaler/ZscalerRootCA.pem`
- Windows: `C:/Users/username/.zscaler/ZscalerRootCA.pem`

### MCP Configuration Creation Steps

**Step 1: Detect Need for Configuration**
- User reports Atlassian MCP not working
- User asks to set up Jira integration
- `.roo/mcp.json` or `.mcp.json` missing or has errors

**Step 2: Determine Environment Type**
- Ask: Are you behind corporate SSL inspection (Zscaler)?
- Ask: What container runtime are you using (Docker or Podman)?

**Step 3: Gather Required Information**
- Confluence URL (default: `https://smar-wiki.atlassian.net/wiki`)
- Jira URL (default: `https://smartsheet.atlassian.net`)
- User email (`@smartsheet.com`)
- Atlassian API token
- Zscaler certificate path (if applicable)

**Step 4: Determine Target File(s)**
- Use detection strategy above to identify which file(s) to create/update

**Step 5: Create/Update Configuration**
- Use appropriate template (with or without Zscaler)
- Replace placeholders with actual values
- Validate configuration format

**Step 6: Validation**
- Count `-e` flags: `grep -o '"-e"' [config-file] | wc -l` (expect: 6)
- Verify no `-e` flags use `VAR=VALUE` syntax
- Verify all `-e` flags come before container image

**Step 7: Instruct User**
- Reload VSCode window: Developer: Reload Window (Cmd/Ctrl+Shift+P)
- MCP configuration changes require VSCode reload to take effect

### Known Bugs in Setup Scripts

**Bug 1: `sdlc/atlassian/setup-atlassian-mcp-linux.sh` (lines 361-385)**
- **Issue**: No Zscaler cert path - Missing ALL `-e` flags
- **Impact**: Environment variables not passed to container, MCP server fails to connect
- **Status**: NEEDS FIXING (requires Code mode)

**Bug 2: `sdlc/atlassian/setup-atlassian-mcp-linux.sh` (lines 402-413)**
- **Issue**: With Zscaler cert path - Using wrong `-e` syntax
- **Current (wrong)**: `"-e", "CONFLUENCE_URL=$CONFLUENCE_URL"`
- **Correct**: `"-e", "CONFLUENCE_URL"`
- **Impact**: May work but violates documented pattern and best practices
- **Status**: NEEDS FIXING (requires Code mode)

**Bug 3: `sdlc/atlassian/setup-atlassian-mcp-windows.ps1`**
- **Issue**: Likely has same issues as Linux script
- **Status**: NEEDS VERIFICATION AND FIXING

---

---

## Implementation Guidance

### For Roo Modes
Reference this document in XML rules:
```xml
<shared_patterns>
  See sdlc/shared/jira-mcp-troubleshooting.md for:
  - MCP configuration location requirements
  - Error patterns and diagnostic workflows
  - Automated setup script guidance
  - Docker/Podman args format requirements
  - Validation steps and best practices
</shared_patterns>
```

### For Claude Agents
Reference this document in agent markdown:
```markdown
## Shared Patterns Reference

This agent follows patterns in `sdlc/shared/`:
- [Jira MCP Troubleshooting](./jira-mcp-troubleshooting.md)
  - MCP configuration location
  - Error pattern recognition
  - Diagnostic workflows
  - Setup script recommendations
  - Docker/Podman configuration
```

---

## Updates and Maintenance

**Single Source of Truth:** This file is the definitive reference for Jira MCP troubleshooting.

**When to Update:**
- New error patterns discovered
- MCP server configuration changes
- New troubleshooting approaches identified
- Setup script improvements
- Docker/Podman args format updates

**Impact of Updates:**
- Automatically benefits both Roo modes and Claude agents
- Ensures consistency across both systems
- Reduces duplication and maintenance burden