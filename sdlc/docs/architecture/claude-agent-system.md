# Claude Code Agent System

## Overview

The SDLCTemplate provides a complete Claude Code agent system that mirrors the Roo mode functionality. Each agent is defined in `sdlc/.claude/agents/` and references shared markdown documentation from `sdlc/shared/`.

## Agent Architecture

### Agent Directory Structure

```
sdlc/.claude/agents/
├── orchestrator.md       # General-purpose orchestrator
├── code.md              # Implementer for code generation
├── spec.md              # Spec-writer for documentation
├── architect.md         # Architect for design
├── mr-actions.md        # MR processor for feedback
├── api-client-code.md   # API client specialist
└── dev-env.md           # Environment troubleshooter
```

### Agent Definition Pattern

Each agent follows this structure:

```markdown
# Agent Name

## Role Definition
{{sdlc/shared/role-definition.md}}

## Specific Guidance
{{sdlc/shared/specific-guidance.md}}

## Workflow Patterns
{{sdlc/shared/workflow-Patterns.md}}
```

The `{{path/to/file.md}}` syntax tells Claude Code to include the referenced markdown file's content.

## Available Agents

### 1. General-Purpose Orchestrator (`orchestrator.md`)

**Purpose**: Coordinate complex workflows and delegate to specialized agents

**When to Use**:
- Multi-step projects requiring coordination
- Tasks spanning multiple domains
- Complex problem-solving needing multiple approaches
- Resource and timeline management

**Key Capabilities**:
- Project breakdown and task coordination
- Multi-agent workflow management
- Seamless handoffs between specialized agents
- Risk assessment and mitigation
- Cross-functional team coordination

**Shared Documentation**:
- `sdlc/shared/orchestrator-role-definition.md`
- `sdlc/shared/jira-workflow-Patterns.md`
- `sdlc/shared/git-integration-Patterns.md`

### 2. Implementer (`code.md`)

**Purpose**: Generate complete code implementations from specifications

**When to Use**:
- Implementing features from specifications
- Complete code generation for new components
- Updating existing implementations
- Ensuring code compliance with standards

**Key Capabilities**:
- Complete feature implementation
- Business logic and application components
- Configuration files and deployment scripts
- Testing suites and validation code
- Documentation and installation guides

**Shared Documentation**:
- `sdlc/shared/implementer-role-definition.md`
- `sdlc/shared/implementer-code-guidance.md`
- `sdlc/shared/implementer-targeted-implementation.md`

### 3. Spec-Writer (`spec.md`)

**Purpose**: Create comprehensive documentation and specifications

**When to Use**:
- Documenting new features or enhancements
- Creating technical specifications
- Updating existing documentation
- Ensuring documentation compliance

**Key Capabilities**:
- Complete tool documentation with proper structure
- API integration documentation
- Authorization and security pattern documentation
- Error handling and workflow documentation
- Quality validation against standards

**Shared Documentation**:
- `sdlc/shared/spec-writer-role-definition.md`
- `sdlc/shared/spec-writer-documentation-Patterns.md`

### 4. Architect (`architect.md`)

**Purpose**: Plan, design, and strategize before implementation

**When to Use**:
- Breaking down complex problems
- Creating technical specifications
- Designing system architecture
- Brainstorming solutions before coding

**Key Capabilities**:
- System architecture design
- Technical specification creation
- Problem decomposition
- Solution strategy development

**Shared Documentation**:
- `sdlc/shared/architect-role-definition.md`

### 5. MR Processor (`mr-actions.md`)

**Purpose**: Process merge request feedback and plan implementation

**When to Use**:
- Analyzing open MR feedback
- Processing reviewer comments
- Implementing MR suggestions
- Addressing code review feedback

**Key Capabilities**:
- MR feedback analysis and categorization
- Implementation approach suggestions
- Coordination with Spec and Code agents
- MR feedback resolution tracking

**Shared Documentation**:
- `sdlc/shared/mr-processor-role-definition.md`
- `sdlc/shared/mr-feedback-workflow.md`

### 6. API Client Specialist (`api-client-code.md`)

**Purpose**: Generate API clients from specifications

**When to Use**:
- Creating new API clients from OpenAPI/Swagger specs
- Modifying existing API clients
- Implementing API authentication
- Generating typed models from API schemas

**Key Capabilities**:
- API client code generation
- Specification fidelity as highest priority
- API error handling and status code management
- Request/response handling implementation

**Shared Documentation**:
- `sdlc/shared/api-client-role-definition.md`
- `sdlc/shared/api-client-generation-Patterns.md`

### 7. Environment Troubleshooter (`dev-env.md`)

**Purpose**: Setup and troubleshoot development environments

**When to Use**:
- New developer onboarding
- Environment setup from scratch
- Development environment issues
- Tool configuration and troubleshooting

**Key Capabilities**:
- Complete environment setup
- Version conflict resolution
- Package management and dependency installation
- Development tool configuration
- Environment variable setup
- Systematic problem diagnosis

**Shared Documentation**:
- `sdlc/shared/env-troubleshooter-role-definition.md`
- `sdlc/shared/env-setup-workflow.md`

## Using Claude Code Agents

### Invoking an Agent

In Claude Code, you can invoke agents using the `@` symbol:

```
@implementer Please implement the user authentication feature
based on the specification in docs/specs/auth-spec.md
```

### Agent Handoffs

Agents can hand off work to other agents:

```
@orchestrator I need to implement a new API client for the
payment service. Please coordinate the work.
```

The orchestrator will then delegate to the API client specialist.

### Multi-Agent Workflows

Complex tasks automatically route through multiple agents:

1. **Orchestrator** analyzes task and breaks it down
2. **Spec-Writer** creates comprehensive documentation
3. **Implementer** generates code from specifications
4. **MR Processor** handles review feedback

## Agent-Mode Equivalence

| Claude Agent | Roo Mode | Purpose |
|--------------|----------|---------|
| general-purpose | orchestrator | Workflow coordination |
| implementer | code | Code generation |
| spec-writer | spec | Documentation |
| architect | architect | Design and planning |
| mr-processor | mr-actions | MR feedback processing |
| api-client-specialist | api-client-code | API client generation |
| env-troubleshooter | dev-env | Environment setup |

## Project Context Files

Claude Code uses additional context files in `.claude/`:

### `architecture-plan.md` (544 lines)

Complete architecture documentation including:
- System architecture overview
- Component relationships
- Design patterns and principles
- Technology stack decisions

### `progress.md` (198 lines)

Development progress tracking:
- Completed features
- In-progress work
- Planned enhancements
- Known issues and blockers

### `sdlc-template-context.md` (233 lines)

Project context and patterns:
- Project purpose and goals
- Development workflows
- Coding standards
- Best practices

These files provide Claude Code with comprehensive project understanding without requiring explicit context in every conversation.

## Configuration

### Agent Configuration File

Agents are configured in `AGENTS.md` at the project root:

```markdown
# Project Agents

## Implementer
- Role: Code generation and implementation
- Capabilities: Full-stack development, testing, documentation
- Context: {{sdlc/shared/implementer-role-definition.md}}

## Spec-Writer
- Role: Documentation and specifications
- Capabilities: Technical writing, API documentation
- Context: {{sdlc/shared/spec-writer-role-definition.md}}
```

### Enabling Agents

1. Ensure `AGENTS.md` exists in project root
2. Verify agent definition files exist in `sdlc/.claude/agents/`
3. Confirm shared documentation exists in `sdlc/shared/`
4. Restart Claude Code to load agent definitions

## Best Practices

### For Agent Users

1. **Be Specific**: Clearly state which agent you want to use
2. **Provide Context**: Include relevant file paths and specifications
3. **Trust Handoffs**: Let agents delegate to specialists when appropriate
4. **Review Results**: Always review agent output before committing

### For Agent Developers

1. **Reference Shared Docs**: Always use shared markdown files
2. **Keep Agents Focused**: Each agent should have a clear, specific purpose
3. **Document Capabilities**: Clearly state what each agent can and cannot do
4. **Test Handoffs**: Verify agents can successfully delegate to each other

## Troubleshooting

### Agent Not Found

**Problem**: Claude Code doesn't recognize agent name

**Solution**:
1. Verify agent file exists in `sdlc/.claude/agents/`
2. Check agent is listed in `AGENTS.md`
3. Restart Claude Code
4. Use exact agent name from configuration

### Agent Gives Incorrect Results

**Problem**: Agent doesn't follow expected patterns

**Solution**:
1. Check shared documentation is up-to-date
2. Verify agent references correct shared files
3. Review agent definition for clarity
4. Update shared documentation if patterns changed

### Agent Can't Access Files

**Problem**: Agent references files that don't exist

**Solution**:
1. Verify file paths are relative to project root
2. Check shared documentation files exist in `sdlc/shared/`
3. Ensure file permissions allow reading
4. Confirm file extensions are correct (`.md`)

## Migration from Roo

If migrating from Roo to Claude Code:

1. **Agent Equivalence**: Use the mapping table above
2. **Workflow Patterns**: Same workflows, different invocation
3. **Shared Documentation**: Both tools use same files
4. **No Code Changes**: Implementation remains identical

Example migration:

**Roo**:
```
Switch to Code mode to implement the feature
```

**Claude Code**:
```
@implementer Please implement the feature
```

## Future Enhancements

Planned improvements to the agent system:

- **Agent Composition**: Combine multiple agents for complex tasks
- **Custom Agents**: Allow project-specific agent definitions
- **Agent Metrics**: Track agent usage and effectiveness
- **Agent Learning**: Improve agent responses based on feedback