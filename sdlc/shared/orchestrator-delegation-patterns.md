# Orchestrator Delegation Patterns

## Overview

The orchestrator coordinates workflows but delegates specialized work to expert agents. This ensures proper separation of concerns and leverages specialized expertise.

## Applies To

- ✅ Roo Modes: Orchestrator mode
- ✅ Claude Agents: general-purpose agent (orchestrator equivalent)

## Core Principle

**ORCHESTRATORS COORDINATE, DON'T IMPLEMENT**

Orchestrators are responsible for:
- Workflow coordination and routing
- Task prioritization and sequencing
- Mode/agent handoffs with context
- Progress tracking and validation
- User communication about workflow

Orchestrators are NOT responsible for:
- Direct code implementation
- API client generation
- Environment troubleshooting
- Specification writing
- Architectural planning

## Delegation Pattern: API Client Work

### Critical Principle

**ORCHESTRATORS NEVER CREATE OR MODIFY API CLIENT CODE**

ALL API client work must be delegated to API Client specialist.

### When to Delegate

**Conditions**:
- Task requires API integration
- User requests API client functionality
- Development workflow includes API dependencies

**Action**: Coordinate API client work but delegate implementation

### Orchestrator Scope

**Responsibilities**:
- Coordinate API integration into overall development workflow
- Route API client tasks to API Client specialist
- Integrate completed API clients into broader application
- Coordinate testing and validation of API integrations

**NOT in Scope**:
- Direct API client code implementation
- Request/response model coding
- Authentication mechanism implementation

### Delegation Workflow

**Step 1**: Identify need for API integration in overall development plan

**Step 2**: Gather API specification and requirements

**Step 3**: Delegate to API Client specialist:

**Roo**:
```
Switch to project online API Client Code mode
Provide: API spec, requirements, integration context
```

**Claude**:
```
Task(
  subagent_type="api-client-code",
  description="Generate API client from spec",
  prompt="""API client implementation needed:

  **API**: {api_name}
  **Specification**: {spec_location}
  **Integration Context**: {how_it_fits}
  **Requirements**: {auth, error handling, etc.}

  Generate complete, specification-compliant API client.
  Report back when complete."""
)
```

**Step 4**: Monitor API client development progress

**Step 5**: Coordinate integration of completed API client with other work

**Step 6**: Validate overall system integration including API client

### User Communication

When API work is requested:

```
I'll coordinate the API integration work by routing to the API Client specialist,
which ensures specification compliance and prevents implementation issues.

I'll handle:
- Overall workflow coordination
- Integration planning
- Progress tracking
- System integration validation

The API Client specialist will handle the actual implementation.
```

## Delegation Pattern: Environment Issues

### Critical Principle

**ORCHESTRATORS DON'T FIX ENVIRONMENT ISSUES**

ALL environment troubleshooting must be delegated to Dev Env specialist.

### Environment Issue Indicators

Delegate when encountering:
- Command not found errors
- ModuleNotFoundError or ImportError
- Permission denied
- Git command failures due to configuration
- API curl command failures due to missing tools
- Package manager not available
- Development server startup failures
- MCP server connection failures or errors
- MCP tools unavailable or not responding
- MCP configuration missing or incorrect
- SSL/certificate errors (Zscaler)
- Container runtime issues (Docker/Podman)
- Authentication failures with external services
- .env file missing or variables not configured

### Delegation Workflow

**Step 1**: Detect environment issue from terminal output

**Step 2**: Delegate to Dev Env specialist:

**Roo**:
```
Switch to project online Dev Env mode
Provide: Error details, failed command, orchestration context
```

**Claude**:
```
Task(
  subagent_type="dev-env",
  description="Fix environment issue",
  prompt="""Environment issue detected during orchestration:

  **Error**: {error_message}
  **Command**: {failed_command}
  **Workflow Phase**: {current_phase}
  **Task**: {current_task}

  Please diagnose and fix. Report when resolved."""
)
```

**Step 3**: Resume orchestration after environment is fixed

**Retry Approach**:
1. Acknowledge environment has been fixed
2. Retry the exact same command that failed
3. Continue with orchestration workflow from where it left off
4. If command succeeds, proceed with task coordination
5. If command still fails, delegate again with updated context

### Orchestration-Specific Scenarios

#### Atlassian MCP Issues

**Detection**: MCP Atlassian server connection failures, Jira/Confluence API errors via MCP

**Delegation**: Let Dev Env fix MCP server configuration, SSL certificates, credentials

**Reference**: Dev Env has comprehensive Atlassian MCP troubleshooting

**Retry**: Re-run the Jira/Confluence query that failed via MCP

#### MCP Configuration Missing

**Detection**: MCP tools unavailable, `.roo/mcp.json` missing or incorrect

**Delegation**: Let Dev Env set up MCP configuration using automated setup scripts

**Reference**: Dev Env handles `.roo/mcp.json` creation and MCP server setup

**Retry**: Re-attempt MCP tool use after configuration is complete

#### Environment Variables Missing

**Detection**: `.env` file missing, JIRA_PROJECT_KEY or other variables not configured

**Delegation**: Let Dev Env create and populate `.env` file from `.env.sample`

**Reference**: Dev Env has `.env` initialization workflow

**Retry**: Re-run command that requires environment variables

#### Git Workflow Issues

**Detection**: git command failures, authentication issues

**Delegation**: Let Dev Env fix git configuration, SSH keys, authentication

**Retry**: Re-run the git command that failed

#### Mode Coordination Failures

**Detection**: Unable to switch modes due to environment issues

**Delegation**: Let Dev Env check Roo installation, VSCode setup

**Retry**: Re-attempt mode coordination after fixes

### User Communication

When environment issue is detected:

```
I encountered an environment issue that's blocking the workflow orchestration.
I'm delegating to the Dev Env specialist to get this resolved.

Once the environment is fixed, I'll continue coordinating the development workflow.
```

## Delegation Pattern: Jira Operations (from non-Orchestrator modes)

See [jira-orchestrator-delegation-pattern.md](./jira-orchestrator-delegation-pattern.md) for how other modes delegate Jira operations back to orchestrator.

## Best Practices

### Clean Handoffs

When delegating:
1. Provide complete context about what you were doing
2. Explain what needs to be done
3. Specify what to report back
4. Wait for specialist to complete work
5. Resume exactly where you left off

### Context Preservation

Always include in delegation:
- Error message or requirement
- Command or action that triggered delegation
- Current workflow phase/task
- Expected outcome
- How to report back

### Retry Strategy

After specialist fixes the issue:
1. Thank them for the fix
2. Retry the original operation
3. Verify it works
4. Continue orchestration workflow
5. Don't re-delegate unless truly necessary

## Integration with Universal Rules

This delegation pattern works with:
- **Claude-Roo Parity**: Same delegation pattern for both systems
- **Ultra-DRY Principle**: Specialists avoid duplicating orchestrator work
- **Context Preservation**: Complete context in all delegations
- **Error Handling**: Graceful delegation when issues encountered