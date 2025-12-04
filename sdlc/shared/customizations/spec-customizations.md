# Spec Mode Customizations

## Purpose

This file contains project-specific customizations for the Spec mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom specification templates
- Project-specific documentation standards
- Custom API documentation patterns
- Integration with your team's documentation tools
- Additional specification validation rules

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/spec-writer-role-definition.md`
- `../../shared/spec-guidance-integration.md`
- `../../shared/spec-incremental-updates.md`
- `../../shared/spec-mr-feedback-integration.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom Spec mode rules below this line -->



<!-- Example: Custom specification section
## Performance Requirements

All specifications must include performance benchmarks and SLAs:

**Required Sections**:

### Performance Benchmarks
- **Response Time**: 95th percentile < 200ms
- **Throughput**: Minimum 1000 requests/second
- **Concurrent Users**: Support 10,000 simultaneous users
- **Database Queries**: < 50ms per query

### Service Level Agreements (SLAs)
- **Uptime**: 99.9% availability
- **Error Rate**: < 0.1% of requests
- **Recovery Time**: < 5 minutes for critical failures

### Load Testing Requirements
- Simulate peak load (3x normal traffic)
- Test degradation under stress
- Verify auto-scaling triggers

**Validation**: Performance tests must pass before deployment
-->

<!-- Example: Custom API documentation pattern
## API Documentation Standards

All API specifications must follow OpenAPI 3.0 format:

**Required Fields**:
```yaml
openapi: 3.0.0
info:
  title: API Name
  version: 1.0.0
  description: Detailed API description
  contact:
    name: Team Name
    email: team@company.com

servers:
  - url: https://api.company.com/v1
    description: Production
  - url: https://staging-api.company.com/v1
    description: Staging

paths:
  /endpoint:
    get:
      summary: Brief description
      description: Detailed description
      parameters: [...]
      responses:
        200:
          description: Success response
          content:
            application/json:
              schema: {...}
              examples: {...}
        400:
          description: Bad request
        401:
          description: Unauthorized
        500:
          description: Server error
```

**Additional Requirements**:
- Include request/response examples for all endpoints
- Document all error codes and messages
- Specify authentication requirements
- Include rate limiting information
-->

<!-- Example: Custom validation rule
## Specification Review Checklist

Before marking specification as complete, verify:

**Completeness**:
- [ ] All API endpoints documented
- [ ] Request/response schemas defined
- [ ] Error handling specified
- [ ] Authentication/authorization documented
- [ ] Rate limiting defined

**Quality**:
- [ ] Examples provided for all endpoints
- [ ] Edge cases documented
- [ ] Performance requirements specified
- [ ] Security considerations addressed

**Compliance**:
- [ ] Follows company API standards
- [ ] Meets accessibility requirements (WCAG 2.1)
- [ ] Complies with data protection regulations
- [ ] Includes audit logging requirements

**Stakeholder Approval**:
- [ ] Product owner reviewed
- [ ] Technical lead approved
- [ ] Security team signed off (if applicable)
-->