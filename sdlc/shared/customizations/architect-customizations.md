# Architect Mode Customizations

## Purpose

This file contains project-specific customizations for the Architect mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom document types specific to your project
- Project-specific planning workflows
- Custom architectural patterns or constraints
- Integration with your team's specific tools or processes
- Additional file organization rules

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/architect-document-organization.md`
- `../../shared/architect-role-definition.md`
- `../../shared/ecosystem-knowledge.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom Architect mode rules below this line -->



<!-- Example: Custom document type
## Security Review Documents

All architecture plans must include security review documents:

**Location**: `sdlc/docs/architecture/security/`
**Template**: Use the security review template from company wiki
**Required Sections**:
- Threat model
- Authentication/authorization design
- Data protection strategy
- Compliance requirements (GDPR, SOC2, etc.)

Security reviews must be completed before implementation begins.
-->

<!-- Example: Custom architectural pattern
## Microservices Communication Pattern

All microservices must follow our event-driven architecture:

**Message Broker**: Use RabbitMQ for async communication
**API Gateway**: Kong for synchronous requests
**Service Discovery**: Consul for service registration
**Circuit Breaker**: Implement using Resilience4j

Document these patterns in `sdlc/docs/architecture/patterns/`
-->