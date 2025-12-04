# Environment Setup Workflow

## Overview
Project-specific workflow patterns for environment setup and troubleshooting. Used by both Roo Dev Env mode and Claude dev-env agent.

## Applies To

- ✅ Roo Mode: Dev Env mode
- ✅ Claude Agent: dev-env
---

## .env File Setup Workflow

### Two-Phase Approach

**Phase 1: Environment Variable Population** (0_env_file_initialization.xml)
- Ensure .env file exists with all variables from .env.sample
- Interactively collect and populate required variables (GIT_TOKEN)
- Optionally collect Jira integration variables
- Update .env file with all collected values

**Phase 2: Script Execution** (1_env_setup_automation.xml)
- Run setup scripts using populated .env variables
- Automate script prompts using environment variables
- Validate installation and connectivity

**CRITICAL:** Phase 1 MUST complete before Phase 2 begins.

### AI Assistant Detection

Before running Phase 2, determine which AI coding assistant(s) require MCP configuration:

**Detection Methods:**
1. **Interactive prompt**: Ask user which assistant they're using (Roo, Claude Code, or Both)
2. **Auto-detection**: Check for presence of `.roo/` and/or `.claude/` directories
3. **Default fallback**: If no directories exist, default to Claude Code format (`.mcp.json`)

**MCP Configuration Locations:**
- **Roo**: `.roo/mcp.json`
- **Claude Code**: `.mcp.json` (project root)
- **Both**: Create both files

**Implementation Pattern:**
```bash
# Ask user which AI assistant to configure
echo "Which AI coding assistant are you using?"
echo "  1) Roo only"
echo "  2) Claude Code only"
echo "  3) Both Roo and Claude Code"
read -p "Enter your choice (1, 2, or 3): " AI_CHOICE

# Set MCP paths based on choice
case $AI_CHOICE in
    1) MCP_PATHS=".roo/mcp.json"; mkdir -p .roo ;;
    2) MCP_PATHS=".mcp.json" ;;
    3) MCP_PATHS=".roo/mcp.json .mcp.json"; mkdir -p .roo ;;
    *)
        # Auto-detect fallback
        if [[ -d .roo ]] && [[ -d .claude ]]; then
            MCP_PATHS=".roo/mcp.json .mcp.json"
        elif [[ -d .roo ]]; then
            MCP_PATHS=".roo/mcp.json"
        elif [[ -d .claude ]]; then
            MCP_PATHS=".mcp.json"
        else
            MCP_PATHS=".mcp.json"  # Default to Claude Code
        fi
        ;;
esac
```

### Phase 1: Environment Variable Population

**Critical Principles:**
- NEVER assume default values for user-specific configuration
- Always explicitly ask users for: Git tokens, email addresses, API tokens, project keys
- Ignore .env.sample example values (e.g., "JBS", "JB Sandbox") - these are EXAMPLES ONLY
- When a variable is empty, always prompt the user for the real value

**Step 1 - Check and Create .env:**
```bash
# Check if .env exists
test -f .env && echo "✅ .env file exists" || echo "❌ .env file missing"

# Copy from template if missing
cp .env.sample .env
```

**Step 2 - GIT_TOKEN Setup (Required):**
```bash
# Check if GIT_TOKEN is populated
grep -q "^GIT_TOKEN=.\+$" .env && echo "✅ GIT_TOKEN configured" || echo "❌ GIT_TOKEN needs setup"
```

Prompt user:
- "Do you have a GitLab token ready?" (Yes / No, help me / Skip)
- If needs help, provide token creation URL: https://git.lab.smartsheet.com/-/profile/personal_access_tokens
- Required scopes: `api`, `read_repository`, `write_repository`
- Collect token and update: `sed -i.bak 's|^GIT_TOKEN=.*|GIT_TOKEN=USER_TOKEN|' .env`

**Step 3 - GitLab Configuration Setup (Required for MR Creation):**
```bash
# Check if GitLab configuration is populated
grep -q "^GITLAB_PROJECT_ID=.\+$" .env && echo "✅ GitLab configured" || echo "❌ GitLab needs setup"
```

Prompt user: "Would you like to set up GitLab MR creation?" (Yes / No, skip)

If yes, collect:
1. **GITLAB_PROJECT_ID**: Project's numeric ID

**How to Find Your Project ID:**

**Method 1: From Project Homepage (Easiest)**
1. Go to your project at https://git.lab.smartsheet.com
   - Example: `https://git.lab.smartsheet.com/team-appspaces/service-workapps-api`
   - Or: `https://git.lab.smartsheet.com/community/sdlc-template`
2. On the project homepage, look **directly below the project name**
3. You'll see: **"Project ID: 12345"** in gray text
4. Copy just the number (e.g., `12345`)

**Method 2: From Settings**
1. Go to your project at https://git.lab.smartsheet.com
2. Click **Settings** → **General** in the left sidebar
3. Look for **"Project ID"** at the top of the page
4. Copy the numeric ID

**Method 3: From Git Remote URL**
If you have the project cloned locally:
```bash
# Get the remote URL
git remote get-url origin

# Example output:
# git@git.lab.smartsheet.com:team-appspaces/service-workapps-api.git
# or
# https://git.lab.smartsheet.com/community/sdlc-template.git

# Then visit that URL in your browser and use Method 1
```

**Important Notes:**
- The Project ID is a **number** (e.g., `12345`), not the project path
- Project path: `team-appspaces/service-workapps-api` ❌ (this is NOT the ID)
- Project ID: `12345` ✅ (this is what you need)
- NEVER assume default - always ask user for their specific project ID

Update .env:
```bash
sed -i.bak \
  -e "s|^GITLAB_PROJECT_ID=.*|GITLAB_PROJECT_ID=${PROJECT_ID}|" \
  .env
```

Note: `GITLAB_API_URL` is pre-configured to `https://git.lab.smartsheet.com/api/v4` in `.env.sample`

**Step 4 - Jira Integration Setup (Optional):**
```bash
# Check if Jira is configured
grep -q "^JIRA_USERNAME=.\+$" .env && grep -q "^JIRA_API_TOKEN=.\+$" .env && echo "✅ Jira configured" || echo "⚠️ Jira optional"
```

Prompt user: "Would you like to set up Jira integration?" (Yes / No, skip)

If yes, collect:
1. **Jira username (email)**: Must match pattern `*@smartsheet.com`
2. **Jira API token**: Provide instructions for https://id.atlassian.com/manage-profile/security/api-tokens
3. **Jira project key**: NEVER assume default - always ask user for their specific key

Update .env:
```bash
sed -i.bak \
  -e "s|^JIRA_USERNAME=.*|JIRA_USERNAME=${USER_EMAIL}|" \
  -e "s|^JIRA_API_TOKEN=.*|JIRA_API_TOKEN=${API_TOKEN}|" \
  -e "s|^CONFLUENCE_USERNAME=.*|CONFLUENCE_USERNAME=${USER_EMAIL}|" \
  -e "s|^CONFLUENCE_API_TOKEN=.*|CONFLUENCE_API_TOKEN=${API_TOKEN}|" \
  -e "s|^JIRA_PROJECT_KEY=.*|JIRA_PROJECT_KEY=${PROJECT_KEY}|" \
  .env
```

**Step 5 - Validation:**
```bash
# Verify required variables
test -f .env && echo "✅ .env file exists" || echo "❌ .env file missing"
grep -q "^GIT_TOKEN=.\+$" .env && echo "✅ GIT_TOKEN configured" || echo "❌ GIT_TOKEN needs setup"

# Verify GitLab configuration
grep -q "^GITLAB_PROJECT_ID=.\+$" .env && echo "✅ GitLab PROJECT_ID configured" || echo "⚠️ GitLab PROJECT_ID optional (required for MR creation)"

# Verify optional Jira variables
grep -q "^JIRA_USERNAME=.\+$" .env && grep -q "^JIRA_API_TOKEN=.\+$" .env && echo "✅ Jira configured" || echo "⚠️ Jira optional"

# Phase 1 Complete Check
test -f .env && grep -q "^GIT_TOKEN=.\+$" .env && echo "✅ Phase 1 complete: .env file ready with GIT_TOKEN" || echo "❌ Phase 1 incomplete"
```

**Interaction Patterns:**
- **First-time setup**: No .env file → Create from sample → Collect GIT_TOKEN → Ask about GitLab MR creation → If yes, collect GITLAB_PROJECT_ID → Ask about Jira → If yes, collect all Jira vars
- **Partial setup**: .env exists but missing vars → Prompt only for missing → Update .env
- **GitLab addition**: .env with GIT_TOKEN, wants MR creation → Collect GITLAB_PROJECT_ID → Update .env
- **Jira addition**: .env with GIT_TOKEN, wants Jira → Collect Jira vars → Run setup script

### Phase 2: Script Execution
```bash
# Step 1: Validate .env file is ready
test -f .env && echo "✅ .env file exists" || echo "❌ .env file missing"

# Step 2: Check GIT_TOKEN configuration
grep -q "^GIT_TOKEN=.\+$" .env && echo "✅ GIT_TOKEN configured" || echo "❌ GIT_TOKEN needs setup"

# Step 3: Check if Jira setup is desired
grep -q "^JIRA_USERNAME=.\+$" .env && grep -q "^JIRA_API_TOKEN=.\+$" .env && echo "jira_ready" || echo "jira_not_configured"

# Step 4: Detect which AI assistant(s) to configure
echo "Which AI coding assistant are you using?"
echo "  1) Roo only"
echo "  2) Claude Code only"
echo "  3) Both Roo and Claude Code"
read -p "Enter your choice (1, 2, or 3): " AI_CHOICE

# Determine MCP configuration path(s) based on choice
case $AI_CHOICE in
    1)
        MCP_PATHS=".roo/mcp.json"
        mkdir -p .roo
        echo "Configuring for Roo"
        ;;
    2)
        MCP_PATHS=".mcp.json"
        echo "Configuring for Claude Code"
        ;;
    3)
        MCP_PATHS=".roo/mcp.json .mcp.json"
        mkdir -p .roo
        echo "Configuring for both Roo and Claude Code"
        ;;
    *)
        # Auto-detect if no valid choice
        if [[ -d .roo ]] && [[ -d .claude ]]; then
            MCP_PATHS=".roo/mcp.json .mcp.json"
            echo "Auto-detected: Both Roo and Claude Code"
        elif [[ -d .roo ]]; then
            MCP_PATHS=".roo/mcp.json"
            echo "Auto-detected: Roo"
        elif [[ -d .claude ]]; then
            MCP_PATHS=".mcp.json"
            echo "Auto-detected: Claude Code"
        else
            MCP_PATHS=".mcp.json"
            echo "Defaulting to Claude Code format"
        fi
        ;;
esac

# Step 5: Run Atlassian MCP setup script (if Jira variables populated)
# Note: The setup script will prompt for AI assistant choice interactively
source .env
cd sdlc/atlassian && echo -e "${JIRA_USERNAME}\n${JIRA_API_TOKEN}" | ./setup-atlassian-mcp-linux.sh

# Step 6: Verify MCP configuration was created in correct location(s)
for mcp_path in $MCP_PATHS; do
    if test -f "$mcp_path" && grep -q '"atlassian"' "$mcp_path"; then
        echo "✅ Jira MCP integration configured: $mcp_path"
    else
        echo "⚠️ MCP configuration not found: $mcp_path"
    fi
done
```

### Phase 2: Post-Setup Instructions
After Atlassian MCP setup completes:

1. **Reload/Restart Based on Your AI Assistant**

   **For Roo:**
    - Press Cmd+Shift+P → "Developer: Reload Window"
    - OR completely restart VSCode (close and reopen)
    - Wait 30-60 seconds for MCP server to initialize

   **For Claude Code:**
    - Press Cmd+Shift+P → "Developer: Reload Window"
    - Wait 30-60 seconds for MCP server to initialize
    - Check VSCode Output panel (View → Output → "Claude Code") for MCP initialization status

   **For Both (if you configured both):**
    - Completely restart VSCode (close and reopen)
    - Wait 30-60 seconds after restart

2. **Verify Integration**

   **For Roo:**
    - Open Roo chat
    - Type `/mcp` or check MCP servers list
    - Look for "atlassian" server with status "connected"

   **For Claude Code:**
    - Look for MCP server status in Claude Code output panel
    - Or simply ask: "What MCP servers are available?"

   **Test query for either assistant:**
    - "Search for issues in [PROJECT_KEY] project assigned to me"
    - "What are my recent Jira issues?"

3. **Configuration Files Created:**
    - `.roo/mcp.json` - MCP server configuration (Roo)
    - `.mcp.json` - MCP server configuration (Claude Code)
    - `~/.zscaler/ZscalerRootCA.pem` - Certificate (if needed)

### Final Validation
```bash
# Overall status
test -f .env && grep -q "^GIT_TOKEN=.\+$" .env && echo "✅ Environment ready" || echo "❌ Setup needed"

# Phase 2 Complete Check - Check both possible locations
if [[ -d .roo ]]; then
    test -f .roo/mcp.json && grep -q '"atlassian"' .roo/mcp.json && echo "✅ Phase 2 complete: Roo MCP integration configured" || echo "⚠️ Roo MCP not configured"
fi

if [[ -d .claude ]]; then
    test -f .mcp.json && grep -q '"atlassian"' .mcp.json && echo "✅ Phase 2 complete: Claude Code MCP integration configured" || echo "⚠️ Claude Code MCP not configured"
fi

# If neither directory exists, check for .mcp.json anyway (Claude Code default)
if [[ ! -d .roo ]] && [[ ! -d .claude ]]; then
    test -f .mcp.json && grep -q '"atlassian"' .mcp.json && echo "✅ Phase 2 complete: MCP integration configured" || echo "⚠️ Phase 2 not complete or skipped"
fi
```

---

## Token Setup Instructions

### GitLab Token (Required)

**Purpose:** Required for MR feedback processing and creation in SDLC workflows.

**Get Your Token:**
1. Go to https://git.lab.smartsheet.com/-/profile/personal_access_tokens
2. Click "Add new token"
3. Name: "SDLC MR Integration"
4. Select scopes:
   - `api` (full API access)
   - `read_repository` (read repository data)
   - `write_repository` (push code, create MRs)
5. Click "Create personal access token"
6. Copy the token (starts with `glpat-`)

**Add to .env:**
```bash
# Edit .env file
code .env  # or vim .env, nano .env, etc.

# Set your token:
GIT_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

### GitLab Configuration (Required for MR Creation)

**Purpose:** Required for creating merge requests and GitLab API operations.

**Get Your Configuration:**

1. **GITLAB_API_URL**: Smartsheet's GitLab API endpoint
   - Value: `https://git.lab.smartsheet.com/api/v4`
   - This is pre-configured in `.env.sample` - no action needed

2. **GITLAB_PROJECT_ID**: Your project's numeric ID

**How to Find Your Project ID:**

**Method 1: From Project Homepage (Easiest)**
1. Go to your project at https://git.lab.smartsheet.com
   - Example: `https://git.lab.smartsheet.com/team-appspaces/service-workapps-api`
   - Or: `https://git.lab.smartsheet.com/community/sdlc-template`
2. On the project homepage, look **directly below the project name**
3. You'll see: **"Project ID: 12345"** in gray text
4. Copy just the number

**Method 2: From Settings**
1. Go to your project at https://git.lab.smartsheet.com
2. Click **Settings** → **General** in the left sidebar
3. Look for **"Project ID"** at the top
4. Copy the numeric ID

**Method 3: From Your Git Remote**
```bash
# Get your project URL
git remote get-url origin
# Example: git@git.lab.smartsheet.com:team-appspaces/service-workapps-api.git

# Visit that URL in browser and use Method 1
```

**Important:** The Project ID is a **number** (e.g., `12345`), not the project path like `team-appspaces/service-workapps-api`.

**Add to .env:**
```bash
GIT_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_API_URL=https://git.lab.smartsheet.com/api/v4
GITLAB_PROJECT_ID=12345
```

### Jira Integration (Optional)

**Purpose:** Optional Jira integration via Atlassian MCP server for issue tracking and SDLC workflows.

**Get Jira API credentials:**
1. Go to your Atlassian account settings
2. Generate an API token
3. Use your Atlassian account email as username

**Add to .env:**
```bash
JIRA_USERNAME=your_atlassian_email@example.com
JIRA_API_TOKEN=your_jira_api_token
```

**Note:** The SDLC works fine without Jira - it just won't have Jira integration capabilities.

### JIRA Integration (Optional - Already Configured via MCP)

**Purpose:** Optional task tracking and orchestrator status updates.

**Note:** JIRA integration is configured via the MCP Atlassian server, not through .env variables. See `sdlc/atlassian/` directory for setup instructions.

The SDLC works fine without JIRA - it just won't have task discovery and status update capabilities.

---

## Dev Env.md Integration

### Purpose
Project-specific setup instructions beyond basic .env configuration.

### When to Reference
- User requests comprehensive environment setup
- Basic .env setup fails or is insufficient
- User has complex development environment issues
- User asks for detailed setup instructions
- New developer onboarding

### How to Use
1. Read `sdlc/Dev Env.md` to understand project setup requirements
2. Extract relevant sections based on user's specific issue
3. Provide step-by-step guidance from Dev Env.md
4. Adapt generic instructions to user's specific project context

### What to Look For
- Operating system-specific instructions (macOS, Linux, Windows)
- Technology stack setup (Python, Node.js, Java, etc.)
- Project-specific tools and dependencies
- Common troubleshooting scenarios

---

## Trigger Phrases

Recognize these as environment setup/troubleshooting requests:
- "set up environment"
- "configure .env"
- "setup tokens"
- "check environment"
- "configure development environment"
- "onboarding setup"
- "complete development environment"
- "comprehensive environment setup"
- "full setup guide"
- "development environment troubleshooting"

---

## Common Error Patterns

### Command Not Found
**Pattern:** `command not found`, `command: not found`
**Indicates:** Tool not installed or not in PATH
**Approach:** Check installation, verify PATH configuration

### Module/Package Errors
**Pattern:** `ModuleNotFoundError`, `ImportError`, `npm ERR!`
**Indicates:** Package not installed or environment isolation issue
**Approach:** Check package installation, verify virtual environment

### Permission Denied
**Pattern:** `Permission denied`, `EACCES`
**Indicates:** File/directory permissions or sudo requirement
**Approach:** Check file permissions, consider sudo for system-level tools

### Connection Refused
**Pattern:** `Connection refused`, `ECONNREFUSED`
**Indicates:** Service not running or port conflicts
**Approach:** Check service status, verify port availability

### Authentication Failed
**Pattern:** `Authentication failed`, `401 Unauthorized`, `403 Forbidden`
**Indicates:** Missing or invalid credentials
**Approach:** Check tokens, credentials, SSH keys

---

## Educational Approach

### Core Principle
Help developers understand **WHY** issues occur, not just **HOW** to fix them.

### Solution Structure
Every solution should include:
1. **Immediate fix steps** - Resolve the problem now
2. **Root cause analysis** - Explain why it happened
3. **Ecosystem context** - How this fits into broader dev environment
4. **Prevention guidance** - Avoid similar issues in future
5. **Validation steps** - Confirm solution works

### Problem Analysis Workflow
When troubleshooting environment issues:
1. **Analyze error messages** - Identify patterns (see Common Error Patterns above)
2. **Apply ecosystem knowledge** - Draw from Technology Ecosystem Knowledge shared pattern
3. **Follow solution structure** - Apply the 5-step solution structure above:
    - Immediate fix
    - Root cause analysis
    - Ecosystem context
    - Prevention guidance
    - Validation steps

### Knowledge Transfer Goals
- Make developers more self-sufficient
- Transfer understanding of ecosystem relationships
- Provide context for troubleshooting approaches
- Enable developers to diagnose similar issues independently

### Teaching Moments
- When explaining why setup steps are needed
- When helping users understand ecosystem relationships
- When providing context for troubleshooting approaches
- When root cause is instructive for future prevention

---
## Updates and Maintenance

**Single Source of Truth:** This file is the definitive reference for environment setup workflow.

**When to Update:**
- .env setup process changes
- New token types added
- Token setup URLs change
- New error patterns discovered
- Better educational approaches identified

**Impact of Updates:**
- Automatically benefits both Roo modes and Claude agents
- Ensures consistency across both systems
- Reduces duplication and maintenance burden