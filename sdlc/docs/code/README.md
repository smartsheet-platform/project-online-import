# Code Documentation and Guidance

This directory contains comprehensive documentation extracted from the Project Online to Smartsheet ETL codebase through the bootstrap process. These artifacts serve as authoritative references for understanding the project's architecture, patterns, and conventions.

## Bootstrap Artifacts

The following files were generated through systematic codebase analysis and provide deep insights into the project's implementation:

### Core Documentation

#### [`BOOTSTRAP.md`](./BOOTSTRAP.md)
**Comprehensive Project Overview**
- Technology stack and dependencies
- Architecture layers (CLI → Orchestration → Transformation → API Client)
- Key design patterns and architectural decisions
- Data flow and transformation pipeline
- Configuration reference
- Testing strategy and common workflows
- Performance considerations
- Onboarding guide for new developers

**Use this when**: Starting work on the project, onboarding new team members, or understanding overall system architecture.

---

#### [`patterns.md`](./patterns.md)
**Recurring Code Patterns (18 documented patterns)**

Categories:
- **Architectural Patterns**: ETL Pipeline, Dependency Injection, Template Method
- **Data Transformation**: Builder, Functional Transformation, Mapping
- **API Integration**: Retry with Exponential Backoff, Rate Limiting, Pagination
- **Error Handling**: Typed Errors with Actionable Messages, Error Context
- **Resiliency**: Get-or-Create, Existence Check, Template Copy
- **Logging**: Structured Logging with Levels, Progress Reporting
- **Testing**: Mock with Spy, Scenario-Based Tests

Each pattern includes:
- Description and purpose
- When to use
- Implementation example from codebase
- Related patterns
- Best practices

**Use this when**: Implementing new features, refactoring code, or ensuring consistency with established patterns.

---

#### [`conventions.md`](./conventions.md)
**Coding Standards and Best Practices**

Covers:
- TypeScript configuration (ES2020, strict mode, CommonJS)
- Naming conventions (files, variables, functions, classes)
- File organization and project structure
- Import organization and module patterns
- Code style (async/await, return types, JSDoc)
- Type safety guidelines
- Testing conventions (AAA pattern, naming, organization)
- Git workflow (commits, branches, PRs)
- Performance guidelines
- Security practices
- Code review checklist

**Use this when**: Writing new code, reviewing PRs, setting up development environment, or enforcing quality standards.

---

#### [`anti-patterns.md`](./anti-patterns.md)
**Common Mistakes to Avoid (20 documented anti-patterns)**

Categories:
- **Architecture**: God Object, Tight Coupling, Leaky Abstractions
- **Data Transformation**: Mutation of Input, Silent Data Loss, Magic Numbers
- **Error Handling**: Swallowing Exceptions, Generic Errors, Catching Everything
- **API Integration**: No Retry Logic, Ignoring Rate Limits, Not Handling Pagination
- **Testing**: Testing Implementation Details, No Assertions, Test Interdependence
- **Performance**: N+1 Query Problem, Unnecessary Await, Excessive Logging
- **Configuration**: Hardcoded Values, Missing Validation

Each anti-pattern includes:
- What it is and why it's problematic
- Red flags to watch for
- How to fix it with specific examples
- Better alternatives

**Use this when**: Code review, troubleshooting quality issues, or educating team on best practices.

---

#### [`troubleshooting-playbook.md`](./troubleshooting-playbook.md)
**Diagnostic Guide for Common Issues**

Includes:
- Quick diagnostic commands
- Common error categories (Configuration, Authentication, API, Data, etc.)
- Systematic troubleshooting process
- Performance issue diagnosis
- Step-by-step resolution guides
- Environment checklist
- Support and bug reporting guidelines

Each error includes:
- Symptoms and error messages
- Diagnosis steps with commands
- Resolution procedures
- Prevention strategies

**Use this when**: Debugging issues, setting up new environments, investigating failures, or providing support.

---

## How to Use These Documents

### For New Developers

**Week 1: Understanding the System**
1. Read [`BOOTSTRAP.md`](./BOOTSTRAP.md) cover-to-cover
2. Set up environment following onboarding section
3. Review [`conventions.md`](./conventions.md) coding standards
4. Run example workflow from bootstrap guide

**Week 2: Hands-On Development**
1. Reference [`patterns.md`](./patterns.md) while exploring codebase
2. Review [`anti-patterns.md`](./anti-patterns.md) to avoid common mistakes
3. Keep [`troubleshooting-playbook.md`](./troubleshooting-playbook.md) handy for setup issues
4. Write first test using conventions from conventions.md

### For Feature Development

**Planning Phase**:
1. Review relevant patterns in [`patterns.md`](./patterns.md)
2. Check [`BOOTSTRAP.md`](./BOOTSTRAP.md) for architecture context
3. Plan implementation following established patterns

**Implementation Phase**:
1. Follow [`conventions.md`](./conventions.md) coding standards
2. Reference [`patterns.md`](./patterns.md) for implementation examples
3. Avoid pitfalls listed in [`anti-patterns.md`](./anti-patterns.md)
4. Use resiliency helpers from bootstrap guide

**Testing Phase**:
1. Follow testing conventions from [`conventions.md`](./conventions.md)
2. Use scenario-based approach from [`patterns.md`](./patterns.md)
3. Reference test examples in bootstrap guide

**Troubleshooting**:
1. Consult [`troubleshooting-playbook.md`](./troubleshooting-playbook.md) first
2. Enable debug logging per playbook instructions
3. Follow systematic diagnosis process

### For Code Review

**Review Checklist**:
1. ✓ Follows naming conventions ([`conventions.md`](./conventions.md))
2. ✓ Uses established patterns ([`patterns.md`](./patterns.md))
3. ✓ Avoids documented anti-patterns ([`anti-patterns.md`](./anti-patterns.md))
4. ✓ Includes proper error handling (typed errors)
5. ✓ Has adequate test coverage
6. ✓ Follows file organization standards
7. ✓ Includes appropriate logging
8. ✓ Uses resiliency helpers where applicable

### For Troubleshooting

**Quick Diagnostic Flow**:
```bash
# 1. Check configuration
npm run config

# 2. Enable debug mode
LOG_LEVEL=DEBUG npm run import -- --source <id>

# 3. Consult troubleshooting playbook
# See: troubleshooting-playbook.md

# 4. Search for similar error in patterns
# Reference: patterns.md (Error Handling section)

# 5. Check if hitting known anti-pattern
# Reference: anti-patterns.md
```

## Maintenance Guidelines

### Keeping Documentation Current

These bootstrap artifacts reflect the codebase at the time of generation. Update them when:

**Architecture Changes**:
- New layers or components added → Update [`BOOTSTRAP.md`](./BOOTSTRAP.md)
- New patterns established → Add to [`patterns.md`](./patterns.md)
- Breaking changes to conventions → Update [`conventions.md`](./conventions.md)

**New Issues Discovered**:
- Recurring bugs → Add to [`anti-patterns.md`](./anti-patterns.md)
- Common support questions → Add to [`troubleshooting-playbook.md`](./troubleshooting-playbook.md)

**Technology Updates**:
- Dependency upgrades → Update versions in bootstrap guide
- New tools adopted → Document in conventions
- API changes → Update patterns and examples

### Re-running Bootstrap

To regenerate these artifacts with current codebase state:

```bash
# From Roo CLI (when in project root)
/bootstrap

# This will:
# 1. Analyze current codebase
# 2. Extract patterns and conventions
# 3. Update all bootstrap artifacts
# 4. Preserve manual customizations (marked sections)
```

## Document Status

| Document | Last Generated | Lines | Coverage |
|----------|---------------|-------|----------|
| BOOTSTRAP.md | 2025-12-08 | 500+ | Complete project overview |
| patterns.md | 2025-12-08 | 600+ | 18 patterns documented |
| conventions.md | 2025-12-08 | 600+ | Complete standards |
| anti-patterns.md | 2025-12-08 | 500+ | 20 anti-patterns |
| troubleshooting-playbook.md | 2025-12-08 | 800+ | Comprehensive diagnostics |

## Quick Reference

### Most Common Use Cases

| Scenario | Primary Reference | Supporting Docs |
|----------|------------------|-----------------|
| New developer onboarding | BOOTSTRAP.md | conventions.md |
| Implementing new feature | patterns.md | conventions.md, anti-patterns.md |
| Debugging production issue | troubleshooting-playbook.md | BOOTSTRAP guide (error handling) |
| Code review | conventions.md, anti-patterns.md | patterns.md |
| Architecture decision | BOOTSTRAP.md | patterns.md |
| Performance optimization | troubleshooting-playbook.md | patterns.md (performance), anti-patterns.md |
| Test writing | conventions.md (testing) | patterns.md (testing patterns) |

### Document Cross-References

- **BOOTSTRAP** references all other docs for deep dives
- **patterns.md** references conventions and anti-patterns
- **conventions.md** includes pattern examples
- **anti-patterns.md** references correct patterns
- **troubleshooting-playbook.md** references all for context

---

## Project Context

**Project Name**: Project Online to Smartsheet ETL  
**Technology Stack**: TypeScript, Node.js, Azure AD, Smartsheet SDK  
**Architecture Style**: Layered ETL Pipeline with Dependency Injection  
**Key Patterns**: Template-based workspace creation, Re-run resiliency, Typed errors

For complete project context, see [`BOOTSTRAP.md`](./BOOTSTRAP.md).

---

*These artifacts were generated through systematic codebase analysis using the Roo bootstrap command. They represent the authoritative documentation for this project's implementation patterns and practices.*