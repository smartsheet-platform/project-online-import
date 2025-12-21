# Codebase Bootstrapping Agent

**Agent Name:** Codebase Bootstrapper
**Agent Command:** /bootstrap

---

## 🎯 Goal

The primary goal of the "Codebase Bootstrapper" is to **systematically analyze the entire codebase** and **generate comprehensive project knowledge** for AI coding agents. This documentation provides the essential, project-specific knowledge required for AI agents to become immediately productive and maintain consistency with project patterns.

## 📋 Methodology

This command applies a **rigorous, systematic approach** inspired by documentation extraction best practices:

### Dual Workflow Paths

1. **Initial Bootstrap** (`/bootstrap`): Extract project knowledge from scratch
2. **Knowledge Verification** (`/bootstrap verify`): Validate existing bootstrap artifacts against current codebase

### Structured Analysis Framework

The bootstrap process follows a systematic workflow defined in:
- [`1_bootstrap_workflow.xml`](./bootstrap/1_bootstrap_workflow.xml) - Extraction and verification workflows
- [`2_knowledge_patterns.xml`](./bootstrap/2_knowledge_patterns.xml) - Output templates and structures
- [`3_extraction_techniques.xml`](./bootstrap/3_extraction_techniques.xml) - Analysis techniques and heuristics
- [`4_bootstrap_communication.xml`](./bootstrap/4_bootstrap_communication.xml) - Communication guidelines

## 🔎 Knowledge Discovery Focus

The analysis systematically targets and documents:

### 1. Architecture & Design Decisions
- Architectural pattern identification (MVC, Clean Architecture, Microservices, etc.)
- Component organization and service boundaries
- Layer separation and dependency rules
- Critical data flows and state management
- Design decision rationale and trade-offs

### 2. Technology Stack & Dependencies
- Complete technology stack with versions and rationale
- Framework usage patterns and configurations
- Key libraries and their purposes
- Build tools and development dependencies
- Version compatibility requirements

### 3. Code Conventions & Standards
- Naming conventions (files, functions, variables, constants)
- File and directory organization patterns
- Module boundaries and import strategies
- Code style and formatting standards
- Git workflow conventions (branches, commits, PRs)

### 4. Recurring Patterns
- Error handling patterns with context
- API integration patterns and client abstractions
- Data validation and sanitization approaches
- Logging and monitoring patterns
- Configuration management strategies
- Testing patterns and coverage expectations
- Authentication and authorization patterns
- Performance optimization patterns

### 5. Anti-Patterns to Avoid
- God objects and SRP violations
- Circular dependencies
- Leaky abstractions
- Tight coupling issues
- Common code smells
- Architectural violations

### 6. Integration Points
- External API integrations and client patterns
- Database access patterns and ORM usage
- Message queue and event-driven patterns
- Authentication mechanisms for external services
- Retry, timeout, and circuit breaker patterns

## 📦 Output Artifacts

Bootstrap generates structured knowledge artifacts in `sdlc/docs/`:

### Code Guidance Artifacts (`sdlc/docs/code/`)
- **`BOOTSTRAP-[project].md`** - Comprehensive, human-readable project knowledge
- **`Patterns.md`** - Recurring code patterns with DO/DON'T examples
- **`Conventions.md`** - Team conventions and standards
- **`Anti-Patterns.md`** - Anti-patterns to avoid with correct alternatives
- **`Troubleshooting-Playbook.md`** - Common issues, diagnostics, and solutions

### Specification Artifacts (`sdlc/docs/specs/`)
- **`architecture-decisions.md`** - Architectural decisions, rationale, and trade-offs

## 🚫 Constraints & Guidelines

### Output Requirements
1. **Primary Location:** `sdlc/docs/code/` for code patterns and guidance
2. **Architecture Location:** `sdlc/docs/specs/` for architecture and design decisions
3. **Intelligent Merge:** Preserve valuable content while updating outdated sections
4. **Format:** Use structured Markdown with clear sections, tables, and code blocks
5. **Integration:** All SDLC modes and agents reference these locations for project knowledge

### Content Quality Standards
1. **Specificity:** Document **THIS project's specific approaches**, not generic advice
2. **Examples:** Include **actual code examples** from the codebase, not generic samples
3. **Rationale:** Explain **why** patterns exist, not just **what** they are
4. **Fact-Based:** Document **only discoverable, existing patterns**, not aspirational practices
5. **Completeness:** Provide sufficient context for AI agents to apply patterns correctly
6. **Actionability:** Include DO/DON'T examples with clear guidance

### Source Material
- Analyze codebase structure and implementation
- Review existing documentation in `sdlc/**`, `.roo/**`, and `.claude/**`
- Extract patterns from git history where relevant
- Incorporate inline code comments and documentation

## 📝 Usage

### Initial Bootstrap
```bash
/bootstrap
```
Performs full codebase analysis and generates all bootstrap artifacts.

### Knowledge Verification
```bash
/bootstrap verify
```
Validates existing bootstrap artifacts against current codebase, identifies drift, and recommends updates.


## 🔄 Integration with SDLC Modes and Agents

All SDLC modes (Roo) and agents (Claude) reference bootstrap knowledge from `sdlc/docs/`:
- **Architect Mode/Agent**: References `sdlc/docs/specs/architecture-decisions.md` for design patterns
- **Code Mode/Agent**: Follows `sdlc/docs/code/Patterns.md` and `sdlc/docs/code/Conventions.md`
- **Spec Mode/Agent**: Aligns with documented architecture in `sdlc/docs/specs/`
- **Dev Env Mode/Agent**: References configuration patterns in `sdlc/docs/code/`
- **MR Actions Mode/Agent**: Validates against conventions in `sdlc/docs/code/Conventions.md`

## 📊 Expected Output

After bootstrap completion, you'll receive:

1. **Summary Statistics**
   - Architecture pattern identified
   - Number of patterns documented
   - Conventions extracted
   - Anti-patterns identified
   - Integration points mapped

2. **Critical Findings**
   - Most important conventions for consistency
   - Critical anti-patterns to avoid
   - Key integration patterns

3. **Artifact Locations**
   - List of created/updated files
   - References to key documentation

4. **Next Steps**
   - Review recommendations
   - Verification schedule suggestions
   - Integration with modes/agents confirmed

## 🔍 Quality Assurance

Bootstrap includes built-in quality checks:
- ✅ All code examples from actual codebase
- ✅ Patterns include rationale and "why"
- ✅ Anti-patterns include correct alternatives
- ✅ File paths accurate and relative to project root
- ✅ Tables properly formatted
- ✅ Internal links functional
- ✅ Metadata includes date and version
- ✅ No placeholder content

## 📚 Detailed Documentation

For implementation details, see:
- [Workflow Documentation](./bootstrap/1_bootstrap_workflow.xml)
- [Pattern Templates](./bootstrap/2_knowledge_patterns.xml)
- [Extraction Techniques](./bootstrap/3_extraction_techniques.xml)
- [Communication Guidelines](./bootstrap/4_bootstrap_communication.xml)

---