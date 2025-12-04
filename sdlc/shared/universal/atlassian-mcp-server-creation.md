# Atlassian MCP Server Creation

## Overview

Universal rule ensuring that all modes and agents always create Atlassian MCP server configurations when setting up Atlassian connectivity. This standardizes MCP server setup across all contexts, ensuring consistent Jira/Confluence integration.

## Applies To

- ✅ Roo Modes: ALL modes when Atlassian integration needed
- ✅ Claude Agents: ALL agents when Atlassian integration needed

## Core Principle

When any mode or agent encounters a request to set up Atlassian integration, it must always create an MCP server configuration specifically designed for Roo Code/Claude. This ensures:
- Consistent Atlassian integration across all development contexts
- Proper MCP server configuration following established patterns
- Seamless Jira and Confluence connectivity
- Standardized authentication and certificate handling

**Enforcement Level**: MANDATORY - No alternative approaches allowed

## Mandatory Behavior

### Always Create MCP Server Configuration

**Action**: ALWAYS create MCP server configuration when Atlassian setup is requested

**Applies To**: All modes, all Atlassian-related tasks, all contexts

**Configuration Target**: `.roo/mcp.json` (per-project configuration)

**Rationale**:
- Ensures Roo/Claude can access Jira and Confluence APIs
- Provides consistent authentication and SSL certificate handling
- Enables all modes to leverage Atlassian integration capabilities
- Follows established MCP server patterns for reliability

### Roo/Claude-Specific Configuration

MCP server must be configured specifically for Roo Code/Claude integration.

**Required Elements**:
- Server name: "atlassian"
- Container-based execution (Podman/Docker)
- Zscaler certificate mounting for SSL inspection environments
- Proper environment variables for Jira and Confluence URLs
- Authentication via Atlassian API tokens
- Smartsheet-specific URL configurations

**Configuration Source**: Use `sdlc/atlassian/` documentation as authoritative source

### No Alternative Approaches

Do not suggest or implement alternative Atlassian integration methods.

**Forbidden Alternatives**:
- ❌ Direct API calls without MCP server
- ❌ Custom Atlassian integration scripts
- ❌ Third-party Atlassian tools or plugins
- ❌ Manual Jira/Confluence access workflows
- ❌ Browser-based automation for Atlassian access

**Why Forbidden**:
- MCP server provides standardized, reliable integration
- Container-based approach handles SSL certificates properly
- Roo/Claude is designed to work with MCP servers
- Alternative approaches lack proper authentication and error handling

## Trigger Scenarios

### Explicit Atlassian Setup

**User Requests**:
- "Set up Atlassian integration"
- "Configure Jira access"
- "Set up Confluence connectivity"
- "Install Atlassian MCP server"
- "Enable Jira and Confluence for Roo"

**Required Action**: Create complete MCP server configuration

### Implicit Atlassian Needs

**User Requests**:
- "I need to access Jira issues"
- "Help me read Confluence pages"
- "Create Jira tickets from this project"
- "Update Jira status based on development progress"
- "Search for existing Jira issues"

**Required Action**: First create MCP server configuration, then proceed with the requested task

### Development Workflow Integration

**User Requests**:
- "Set up SDLC workflow with Jira tracking"
- "Configure project management integration"
- "Enable automated Jira updates"
- "Connect development workflow to Atlassian"

**Required Action**: Create MCP server as foundation for workflow integration

## Implementation Workflow

### Step 1: Detect Atlassian Integration Need

**Action**: Recognize when user request requires Atlassian connectivity

**Validation**: Check if `.roo/mcp.json` already has "atlassian" server configured

### Step 2: Reference Documentation

**Action**: Always consult `sdlc/atlassian/` documentation for current setup instructions

**Required Files**:
- `sdlc/atlassian/ATLASSIAN_MCP.md` - Complete setup guide
- `sdlc/atlassian/ATLASSIAN_MCP_SETUP_SCRIPTS.md` - Automated setup options

### Step 3: Create MCP Server Configuration

**Action**: Generate appropriate `.roo/mcp.json` configuration

**Platform Detection**:
1. Determine user's platform (macOS, Windows, Linux)
2. Use platform-appropriate container runtime and certificate paths

### Step 4: Gather Required Information

**Required Inputs**:
- User's Smartsheet email address
- Atlassian API token (guide user to create if needed)
- Platform-specific certificate path
- Container runtime preference (Podman vs Docker)

### Step 5: Generate Complete Configuration

**Action**: Create full `.roo/mcp.json` with proper atlassian server configuration

**Validation**: Ensure configuration follows established patterns from documentation

### Step 6: Provide Setup Instructions

**Action**: Guide user through any additional setup steps

**Instructions**:
- Certificate export (if not already done)
- Container runtime installation (if needed)
- VSCode/Claude reload to activate MCP server
- Testing and verification steps

## Configuration Templates

### macOS with Podman

**Description**: Standard macOS configuration with Podman

**Use Case**: Most macOS users with Podman installed

**Reference**: `sdlc/atlassian/ATLASSIAN_MCP.md` section "macOS with Podman"

### Windows with Docker Desktop

**Description**: Standard Windows configuration with Docker Desktop

**Use Case**: Windows 11 users with Docker Desktop

**Reference**: `sdlc/atlassian/ATLASSIAN_MCP.md` section "Windows 11 with Docker Desktop"

### Linux with Docker

**Description**: Standard Linux configuration with Docker

**Use Case**: Ubuntu, WSL, and other Linux environments

**Reference**: `sdlc/atlassian/ATLASSIAN_MCP.md` section "Ubuntu WSL with Docker"

### Amazon Linux EC2

**Description**: Amazon Linux EC2 without Zscaler certificates

**Use Case**: EC2 instances not behind corporate SSL inspection

**Reference**: `sdlc/atlassian/ATLASSIAN_MCP.md` section "Amazon Linux EC2"

## Mode/Agent-Specific Behavior

### Orchestrator Mode

- Create MCP server configuration as part of project setup workflow
- Coordinate MCP setup with other development environment tasks

### Dev-Env Mode / dev-env Agent

- Focus on MCP server installation and troubleshooting
- Handle container runtime setup and certificate configuration
- Provide detailed debugging for MCP connectivity issues

### Architect Mode / architect Agent

- Include MCP server configuration in project architecture planning
- Document MCP integration as part of system design

### Code Mode / code Agent

- Create MCP server configuration before implementing Atlassian-dependent features
- Ensure MCP server is available for code that uses Jira/Confluence APIs

### Debug Mode

- Verify MCP server configuration when troubleshooting Atlassian connectivity
- Check MCP server status as part of debugging workflow

## Quality Assurance

### Validation Checklist

**MCP Server Configuration Validation**:
- ✓ Configuration uses "atlassian" as server name (critical)
- ✓ Container runtime command is correct for platform (critical)
- ✓ Certificate mounting is configured for Zscaler environments (critical)
- ✓ Environment variables include all required Atlassian URLs (high)
- ✓ Authentication placeholders are clearly marked for user input (high)
- ✓ Configuration follows patterns from `sdlc/atlassian/` documentation (medium)

### Common Mistakes Prevention

1. **Using global MCP configuration instead of per-project**
   - **Prevention**: Always create `.roo/mcp.json` in project root

2. **Incorrect certificate path for user's platform**
   - **Prevention**: Use platform-specific paths from documentation

3. **Missing Zscaler certificate configuration**
   - **Prevention**: Always include certificate mounting unless explicitly EC2 non-Zscaler

4. **Wrong container image or SHA**
   - **Prevention**: Use exact image reference from documentation

## Integration with Other Universal Rules

### VSCode Settings Protection

MCP server configuration goes in `.roo/mcp.json`, never in `.vscode/settings.json`. This rule reinforces the VSCode settings protection by providing the correct configuration location for MCP servers.

### Memory Bank Segmentation

Applies regardless of memory bank context. Whether working in SDLC context or main app context, Atlassian MCP server configuration follows the same patterns and requirements.

### SDLC Directory Enforcement

MCP server configuration is created in project `.roo/mcp.json`, which is appropriate for both development and production use.

## Troubleshooting Integration

### Common Issues

**MCP Server Not Starting**:
- **Symptoms**: Roo Code/Claude doesn't show "atlassian" server in MCP servers list
- **Resolution**: Verify container runtime is installed and `.roo/mcp.json` is valid

**SSL Certificate Errors**:
- **Symptoms**: MCP server fails with SSL/TLS errors
- **Resolution**: Verify Zscaler certificate is properly exported and mounted

**Authentication Failures**:
- **Symptoms**: MCP server starts but API calls fail with 401/403 errors
- **Resolution**: Verify Atlassian API token is valid and email address is correct

## User Education

### When Creating MCP Server

- **Explain**: Why MCP server is required for Atlassian integration
- **Demonstrate**: Show how MCP server enables Roo/Claude to access Jira/Confluence
- **Guide**: Walk through the configuration process step-by-step

### Best Practices

1. Use per-project MCP configuration for team consistency
2. Keep API tokens secure and rotate them regularly
3. Test MCP server connectivity after setup
4. Document any custom configuration for team members