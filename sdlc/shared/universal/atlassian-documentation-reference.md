# Atlassian Documentation Reference

## Overview

Universal rule ensuring that all modes always reference the sdlc/atlassian/ folder as the authoritative source for Atlassian MCP server setup instructions. This rule guarantees consistency across all modes and prevents outdated or incorrect setup guidance by establishing a single source of truth for Atlassian integration.

## Applies To

- ✅ Roo Modes: ALL modes when handling Atlassian integration tasks
- ✅ Claude Agents: ALL agents when handling Atlassian integration tasks

## Core Principle

The sdlc/atlassian/ directory contains the definitive, up-to-date documentation for Atlassian MCP server setup. All modes must reference this documentation when:
- Setting up Atlassian MCP servers
- Troubleshooting Atlassian connectivity issues
- Providing setup instructions to users
- Creating MCP server configurations
- Handling platform-specific setup requirements

**Enforcement Level**: MANDATORY - No alternative documentation sources allowed

## Mandatory Documentation Reference

### Authoritative Source

**Rule**: ALWAYS reference sdlc/atlassian/ folder for Atlassian MCP setup

**Applies To**: All modes when handling Atlassian integration tasks

**Primary Documents**:

**sdlc/atlassian/ATLASSIAN_MCP.md**:
- Purpose: Complete setup guide with step-by-step instructions
- Use For: Detailed setup procedures, platform-specific configurations, troubleshooting

**sdlc/atlassian/ATLASSIAN_MCP_SETUP_SCRIPTS.md**:
- Purpose: Automated setup scripts and quick start options
- Use For: Script-based setup, automation options, advanced configuration

### No Alternative Sources

Do not use or reference alternative Atlassian setup documentation.

**Forbidden Sources**:
- Generic MCP server documentation
- Third-party Atlassian integration guides
- Outdated internal documentation
- Mode-specific custom instructions for Atlassian setup
- Hardcoded setup instructions in mode rules

**Rationale**:
- sdlc/atlassian/ contains the most current and tested procedures
- Alternative sources may have outdated or incorrect information
- Centralized documentation ensures consistency across all modes
- Platform-specific requirements are properly documented in sdlc/atlassian/

### Documentation Consultation Workflow

Always consult documentation before providing setup guidance.

**Workflow**:
1. Read relevant files from sdlc/atlassian/ directory
2. Extract current, accurate setup procedures
3. Adapt instructions to user's specific platform and context
4. Reference the documentation source in responses

## Documentation Usage Patterns

### Initial Setup

**Scenario**: User needs to set up Atlassian MCP server for the first time

**Required Actions**:
1. Read sdlc/atlassian/ATLASSIAN_MCP.md for complete setup guide
2. Extract platform-specific configuration template
3. Guide user through step-by-step process from documentation
4. Reference documentation sections for additional details

### Troubleshooting

**Scenario**: User experiencing issues with existing Atlassian MCP setup

**Required Actions**:
1. Consult troubleshooting section in sdlc/atlassian/ATLASSIAN_MCP.md
2. Apply documented solutions for common issues
3. Reference specific troubleshooting steps from documentation
4. Escalate to documentation maintainers if issue not covered

### Platform-Specific Guidance

**Scenario**: User needs setup instructions for specific platform (macOS, Windows, Linux)

**Required Actions**:
1. Read platform-specific sections from sdlc/atlassian/ATLASSIAN_MCP.md
2. Extract exact configuration templates for user's platform
3. Provide platform-appropriate certificate and container instructions
4. Reference documentation sections for platform-specific details

### Automated Setup

**Scenario**: User prefers automated setup using scripts

**Required Actions**:
1. Reference sdlc/atlassian/ATLASSIAN_MCP_SETUP_SCRIPTS.md
2. Guide user to appropriate script for their platform
3. Provide script usage instructions from documentation
4. Include fallback to manual setup if scripts don't work

## Mode-Specific Implementation

### dev-env Mode

**Behavior**:
- Primary mode for Atlassian MCP setup and troubleshooting
- Must read and apply all relevant sections from sdlc/atlassian/
- Should provide detailed, step-by-step guidance based on documentation

**Documentation Focus**:
- Complete setup procedures
- Troubleshooting and debugging steps
- Platform-specific installation requirements
- Certificate export and container configuration

### orchestrator Mode

**Behavior**:
- References documentation when coordinating Atlassian setup as part of larger workflows
- Delegates detailed setup to dev-env mode but ensures documentation consistency

**Documentation Focus**:
- High-level setup overview
- Integration with other development environment tasks
- Prerequisites and dependencies

### architect Mode

**Behavior**:
- References documentation when planning systems that include Atlassian integration
- Documents Atlassian MCP server as part of system architecture

**Documentation Focus**:
- Architecture and integration patterns
- Security considerations
- System requirements and dependencies

### code Mode

**Behavior**:
- References documentation when implementing features that require Atlassian connectivity
- Ensures MCP server is properly configured before coding Atlassian-dependent features

**Documentation Focus**:
- MCP server configuration requirements
- API connectivity and authentication
- Integration testing procedures

### debug Mode

**Behavior**:
- References documentation when troubleshooting Atlassian connectivity issues
- Uses documented debugging procedures and common issue resolutions

**Documentation Focus**:
- Troubleshooting section
- Common issues and solutions
- Debugging and verification steps

## Documentation Consultation Workflow

### Pre-Response Requirements

Before providing Atlassian setup guidance:

- ✓ Read current sdlc/atlassian/ATLASSIAN_MCP.md
- ✓ Check sdlc/atlassian/ATLASSIAN_MCP_SETUP_SCRIPTS.md if automation relevant
- ✓ Extract platform-specific information for user's environment
- ✓ Verify configuration templates are current
- ✓ Note any recent updates or version changes

### Response Formatting

How to reference documentation in responses:

**Guidelines**:
- Always mention the source documentation file
- Reference specific sections when providing detailed instructions
- Include direct quotes for critical configuration details
- Provide file paths for users who want to read the full documentation

**Example References**:
- "According to `sdlc/atlassian/ATLASSIAN_MCP.md`, the setup process involves..."
- "The troubleshooting section in `ATLASSIAN_MCP.md` recommends..."
- "For automated setup, see `ATLASSIAN_MCP_SETUP_SCRIPTS.md`"

## Quality Assurance

### Documentation Accuracy Validation

Ensuring documentation-based responses are accurate:

**Validation Steps**:
- Verify information matches current documentation content
- Check that platform-specific details are correctly applied
- Ensure configuration templates are complete and accurate
- Validate that troubleshooting steps are current

### Common Mistakes Prevention

**Mistake**: Providing outdated setup instructions
- Prevention: Always read current documentation before responding

**Mistake**: Using incorrect platform-specific paths or commands
- Prevention: Extract exact platform details from documentation

**Mistake**: Missing critical setup steps
- Prevention: Follow complete workflow from documentation, don't summarize

**Mistake**: Referencing non-existent documentation sections
- Prevention: Verify section names and content before referencing

## Documentation Maintenance Integration

### Feedback Loop

How modes should handle documentation gaps or issues:

**When Documentation Insufficient**:
1. Note the specific gap or issue encountered
2. Provide best available guidance based on existing documentation
3. Recommend user report documentation issue for improvement
4. Suggest temporary workarounds if available

### Version Awareness

Handling documentation updates and version changes:

**Best Practices**:
- Always use most current version of documentation
- Note version history when significant changes are present
- Warn users if their setup might be based on older documentation

## Integration with Other Rules

### MCP Server Creation Rule

Works with Atlassian MCP server creation rule.

**Alignment**: This rule provides the "how" (documentation source) while the MCP server creation rule provides the "what" (mandatory MCP server creation). Together they ensure consistent, documented MCP server setup.

### VSCode Settings Protection

Reinforces proper configuration location.

**Alignment**: Documentation clearly specifies .roo/mcp.json as the correct location, supporting the VSCode settings protection rule's guidance away from .vscode/settings.json for MCP configuration.

### Memory Bank Segmentation

Applies regardless of memory bank context.

**Universal Application**: Whether in SDLC or main app context, sdlc/atlassian/ documentation is the authoritative source for Atlassian MCP setup procedures.

## User Education

### Documentation Awareness

When referencing documentation:
- Explain why sdlc/atlassian/ is the authoritative source
- Demonstrate how to navigate and use the documentation
- Guide users to understand the structure and organization

### Best Practices

- Bookmark sdlc/atlassian/ documentation for future reference
- Check documentation for updates when setup issues occur
- Follow complete procedures rather than shortcuts
- Report documentation issues or gaps for improvement

## Enforcement Mechanisms

### Automated Validation

Checks to ensure documentation reference compliance:

**Validation Points**:
- Verify modes read documentation before providing Atlassian guidance
- Check that responses reference appropriate documentation sections
- Validate that configuration templates match documentation

### Quality Gates

Process checkpoints to prevent documentation bypass:

**Gates**:
- Mandatory documentation consultation before Atlassian responses
- Required documentation source citation in setup guidance
- Validation that provided instructions match current documentation