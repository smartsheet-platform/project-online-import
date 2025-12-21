# Orchestrator Mode Customizations

## Purpose

This file contains project-specific customizations for the Orchestrator mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom workflow orchestration patterns
- Project-specific task breakdown strategies
- Custom mode coordination rules
- Integration with your team's project management tools
- Additional quality gates or checkpoints

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/orchestrator-role-definition.md`
- `../../shared/orchestrator-delegation-Patterns.md`
- `../../shared/orchestrator-mr-coordination.md`
- `../../shared/orchestrator-validation-testing.md`
- `../../shared/jira-workflow-Patterns.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom Orchestrator mode rules below this line -->



<!-- Example: Custom workflow checkpoint
## Security Review Gate

All production deployments require security team approval:

**Trigger**: Before production deployment
**Required Approvers**: Security team lead + CISO
**Review Checklist**:
- [ ] Threat model reviewed and approved
- [ ] Penetration testing completed
- [ ] Security scan passed (no critical/high vulnerabilities)
- [ ] Data protection measures verified
- [ ] Compliance requirements met (GDPR, SOC2, HIPAA)

**Process**:
1. Orchestrator creates security review ticket in Jira
2. Assigns to security team
3. Waits for approval before proceeding
4. Documents approval in deployment notes

**Blocking**: Yes - Cannot proceed without approval
**SLA**: 2 business days for review
-->

<!-- Example: Custom task breakdown strategy
## Feature Development Workflow

For new features, orchestrator must follow this breakdown:

**Phase 1: Planning** (Architect mode)
- Create technical design document
- Define API contracts
- Identify dependencies and risks
- Estimate effort and timeline

**Phase 2: Specification** (Spec mode)
- Write detailed API specifications
- Document data models
- Define acceptance criteria
- Create test scenarios

**Phase 3: Implementation** (Code mode)
- Implement backend logic
- Create database migrations
- Write unit and integration tests
- Update API documentation

**Phase 4: Review** (MR Actions mode)
- Create merge request
- Address code review feedback
- Verify CI/CD pipeline passes
- Update changelog

**Phase 5: Deployment** (Orchestrator coordination)
- Deploy to staging environment
- Run smoke tests
- Get stakeholder approval
- Deploy to production
- Monitor for issues

Each phase must complete before moving to next phase.
-->

<!-- Example: Custom quality gate
## Code Quality Gate

Before merging to main branch, verify:

**Automated Checks**:
- [ ] All tests pass (unit, integration, e2e)
- [ ] Code coverage ≥ 90%
- [ ] No security vulnerabilities (Snyk scan)
- [ ] No code smells (SonarQube quality gate)
- [ ] Performance benchmarks met

**Manual Checks**:
- [ ] Code review approved by 2+ developers
- [ ] Architecture review approved (for significant changes)
- [ ] Documentation updated
- [ ] Changelog entry added

**Orchestrator Actions**:
1. Verify all automated checks passed
2. Confirm manual approvals received
3. Run final integration test suite
4. Merge to main branch
5. Trigger deployment pipeline
6. Update Jira ticket status to "Deployed"
-->