# VSCode Settings Protection

## Overview

Universal rule to prevent accidental modification of .vscode/settings.json files across all modes unless explicitly requested by the user. This protects critical VSCode workspace configuration from unintended changes during development tasks.

## Applies To

- ✅ Roo Modes: ALL modes
- ✅ Claude Agents: ALL agents

## Core Principle

.vscode/settings.json contains critical workspace configuration that affects the entire development environment. Unintended modifications can break:
- Extension configurations
- Language server settings
- Debugging configurations
- Workspace-specific preferences
- Team-shared development settings

**Enforcement Level**: STRICT - No exceptions without explicit user request

## Protection Rules

### Default Behavior

**Rule**: NEVER edit .vscode/settings.json unless explicitly requested

**Applies To**: All modes, all tasks, all contexts

**Rationale**:
- Prevents accidental workspace configuration corruption
- Maintains team development environment consistency
- Avoids breaking existing tool integrations
- Preserves user-specific workspace preferences

### Explicit Request Detection

Only edit .vscode/settings.json when user explicitly requests it.

**Explicit Indicators**:
- "edit .vscode/settings.json"
- "modify VSCode settings"
- "update workspace settings"
- "change .vscode/settings.json"
- "add to VSCode settings"
- "configure VSCode workspace"

**Implicit Rejections** (too vague):
- "configure the project"
- "set up development environment"
- "fix configuration issues" (unless specifically about VSCode settings)
- "optimize the workspace" (unless specifically about VSCode settings)

### Alternative Approaches

When configuration changes are needed, suggest alternatives:

**Scenario**: User needs project configuration
**Suggest**: Create project-specific config files (e.g., .env, config.json)

**Scenario**: User needs tool configuration
**Suggest**: Create tool-specific config files (e.g., .eslintrc, tsconfig.json)

**Scenario**: User needs environment setup
**Suggest**: Create setup scripts or documentation

**Scenario**: User needs MCP server configuration
**Suggest**: Create/update .roo/mcp.json (per-project) or document global setup

## Violation Prevention

### Pre-Action Check

Before any file modification:

- ✓ Is the target file .vscode/settings.json?
- ✓ Did user explicitly request VSCode settings modification?
- ✓ Are there alternative approaches that don't require VSCode settings changes?

### When Modification Attempted

**Step 1**: STOP the modification immediately
- Reason: Protect workspace configuration integrity

**Step 2**: Explain why .vscode/settings.json is protected
- Message Template:
  ```
  I cannot modify .vscode/settings.json unless you explicitly request it.
  This file contains critical workspace configuration that affects the entire
  development environment. Would you like me to suggest alternative approaches
  for your configuration needs?
  ```

**Step 3**: Offer alternative solutions
- Suggest project-specific config files or other appropriate methods

## Explicit Request Handling

### When Explicitly Requested

**Validation Steps**:
1. Confirm the user specifically wants .vscode/settings.json modified
2. Explain the potential impact of the changes
3. Suggest backing up current settings if significant changes
4. Proceed with the requested modifications

**Safety Measures**:
- Always read existing settings before modification
- Preserve existing configuration when adding new settings
- Use proper JSON formatting and validation
- Explain what changes were made and why

## Common Scenarios

### MCP Server Setup

**User Request**: "Set up Atlassian MCP server"

**Correct Behavior**:
- Create/update .roo/mcp.json for per-project configuration
- Explanation: MCP servers should be configured per-project, not in VSCode settings
- Reference: Use sdlc/atlassian/ documentation for proper setup

**Incorrect Behavior**:
- Modifying .vscode/settings.json to add MCP server configuration
- Why Wrong: VSCode settings are for workspace preferences, not MCP server configuration

### Development Environment Setup

**User Request**: "Configure the development environment"

**Correct Behavior**:
- Create .env files, package.json scripts, or setup documentation
- Explanation: Development environment setup should use standard configuration files

**Incorrect Behavior**:
- Adding development settings to .vscode/settings.json
- Why Wrong: Too vague - could break existing workspace configuration

### Tool Configuration

**User Request**: "Set up linting and formatting"

**Correct Behavior**:
- Create .eslintrc, .prettierrc, or other tool-specific config files
- Explanation: Tool configuration should use standard config files, not VSCode settings

**Incorrect Behavior**:
- Adding linter settings to .vscode/settings.json
- Why Wrong: Tool configuration belongs in tool-specific config files

## Integration with Existing Rules

### Memory Bank Alignment

This rule works with memory bank segmentation:
- Protects workspace configuration regardless of memory bank context
- Applies equally to SDLC and main app development work
- Prevents configuration conflicts between different development contexts

### Mode Compatibility

This rule applies to all modes without exception:

- **architect**: Cannot modify VSCode settings during planning
- **code**: Cannot modify VSCode settings during implementation
- **debug**: Cannot modify VSCode settings during troubleshooting
- **orchestrator**: Cannot modify VSCode settings during coordination
- **dev-env**: Can suggest VSCode settings changes but must get explicit permission

## Exception Handling

### Legitimate Exceptions

**Exception**: User explicitly requests "edit .vscode/settings.json to add X"
- Handling: Proceed with explicit confirmation and safety measures

**Exception**: User asks to "fix VSCode configuration issue" with specific settings file mentioned
- Handling: Confirm they want .vscode/settings.json modified, then proceed safely

### Non-Exceptions

**Non-Exception**: Task requires "configuration" but doesn't specify VSCode settings
- Handling: Use alternative configuration approaches, never assume VSCode settings

**Non-Exception**: Mode has edit permissions that could include .vscode/settings.json
- Handling: Permission doesn't override protection - still require explicit request

## Educational Component

### User Education

When protection triggered:
- Explain why .vscode/settings.json is protected
- Demonstrate alternative configuration approaches
- Guide user to understand proper configuration patterns

### Best Practices

- Use project-specific configuration files when possible
- Keep workspace settings minimal and team-friendly
- Document configuration decisions for team members
- Use .roo/mcp.json for MCP server configuration