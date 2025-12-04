# Code Reviewer Review Patterns

## Review Checklists by Language

Language-specific review checklists are maintained in the [language-best-practices](language-best-practices/) directory. These files are shared with the implementer agent to ensure consistency between what's implemented and what's reviewed.

### [Universal](language-best-practices/universal.md)
Language-agnostic best practices: code clarity, function design, error handling, testing, dependencies, performance, security, design principles (SOLID, DRY, KISS, YAGNI).

**Apply to all code reviews regardless of language.**

### [Kotlin on JVM](language-best-practices/kotlin-jvm.md)
Kotlin-specific: null safety, coroutines, scope functions, extension functions, data/sealed classes, resource management (`use`), collections/sequences, Spring Boot on Kotlin, Java interoperability.

### [TypeScript/JavaScript](language-best-practices/typescript-javascript.md)
TypeScript/JavaScript-specific: type safety, async operations, memory management, immutability patterns, React patterns, modern JS features.

### [Python](language-best-practices/python.md)
Python-specific: type hints, context managers, comprehensions, async patterns, PEP 8, dataclasses, framework patterns (Django, FastAPI).

**Note:** These are universal and language-specific best practices. Project-specific coding patterns are documented in `sdlc/docs/code/`.

## Security Review Patterns

### Authentication & Authorization
```
⚠️ Check for:
- Hardcoded credentials
- Weak password requirements
- Missing authentication on endpoints
- Authorization bypass opportunities
- Session management issues
- JWT token validation
```

### Input Validation
```
⚠️ Check for:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Command injection risks
- Path traversal vulnerabilities
- Unvalidated redirects
- Mass assignment vulnerabilities
```

### Sensitive Data
```
⚠️ Check for:
- Secrets in code or logs
- Sensitive data in URLs
- Unencrypted sensitive data
- PII without proper handling
- Missing data sanitization
```

## Performance Review Patterns

### Database Operations
```
⚠️ Check for:
- N+1 query problems
- Missing database indexes
- Inefficient JOIN operations
- Large result sets without pagination
- Missing query optimization
- Lack of connection pooling
```

### API Operations
```
⚠️ Check for:
- Synchronous operations that should be async
- Missing caching strategies
- Inefficient data serialization
- Large payload sizes
- Missing rate limiting
- Redundant API calls
```

### Algorithm Efficiency
```
⚠️ Check for:
- Nested loops that could be optimized
- Inefficient sorting or searching
- Unnecessary data copying
- Inefficient string operations
- Memory leaks or excessive allocation
```

## Testing Review Patterns

### Test Quality Indicators
```
✓ Good tests:
- Test one thing per test method
- Have clear, descriptive names
- Follow Arrange-Act-Assert pattern
- Use appropriate mocking
- Cover edge cases and error paths
- Are maintainable and readable

✗ Test smells:
- Testing implementation details
- Overly complex test setup
- Tests depending on execution order
- Ignored or skipped tests without reason
- Brittle tests that break with minor changes
```

### Coverage Guidelines
```
Expected coverage by component type:
- Business logic: 90%+ coverage
- API endpoints: 80%+ coverage
- Utilities: 85%+ coverage
- UI components: 70%+ coverage (critical paths)
- Integration tests: Key workflows covered
```

## Code Maintainability Patterns

### Good Practices
```
✓ Clear naming:
- Functions describe actions (verb phrases)
- Variables describe content (noun phrases)
- Boolean variables ask questions (isValid, hasPermission)
- Constants use UPPER_CASE

✓ Function design:
- Single responsibility
- Short (typically < 50 lines)
- Few parameters (typically < 4)
- One level of abstraction

✓ Documentation:
- Public APIs documented
- Complex logic explained
- Why over what (code shows what)
- Updated with code changes
```

### Code Smells to Watch For
```
⚠️ Common issues:
- Long methods (> 50 lines)
- Large classes (> 300 lines)
- Deep nesting (> 3 levels)
- Duplicate code
- Feature envy (method using mostly external data)
- Data clumps (same parameters everywhere)
- Primitive obsession
- Magic numbers
```

## Review Workflow Patterns

### MR Review Workflow

#### 1. Context Gathering
- Identify scope (MR, branch, specific files)
- Read code changes and surrounding context
- Review tests and documentation
- Understand the change purpose

#### 2. Systematic Analysis
- Apply review checklists by language
- Check security, performance, maintainability
- Verify test coverage and quality
- Validate against project standards

#### 3. Feedback Generation
- Categorize issues by priority (critical, major, minor)
- Provide specific line references
- Explain reasoning clearly
- Suggest concrete improvements
- Include code examples where helpful

#### 4. Report Creation
- Summarize findings by category
- Prioritize recommendations
- Recognize good practices
- Provide clear next steps

#### 5. Handoff Recommendations
- Suggest appropriate agents for fixes
- Provide implementation guidance
- Note dependencies and risks

### Detailed MR Review Steps

1. **Understand the Change**
   - Read MR description and linked issues
   - Understand the problem being solved
   - Review acceptance criteria

2. **Review Changed Files**
   - Start with test files to understand expected behavior
   - Review implementation files
   - Check for unintended changes

3. **Check Related Code**
   - Review files that import changed code
   - Check for integration impacts
   - Verify backwards compatibility

4. **Verify Tests**
   - Check test coverage of changes
   - Verify tests actually test new behavior
   - Run tests locally if possible

5. **Provide Feedback**
   - Prioritize issues (critical first)
   - Be specific and actionable
   - Suggest improvements with examples
   - Recognize good practices

### File Review Workflow
1. **Read Top to Bottom**
   - Understand overall structure
   - Identify main responsibilities
   - Note dependencies

2. **Deep Dive Critical Sections**
   - Complex logic
   - Error handling
   - Security-sensitive code
   - Performance-critical paths

3. **Check Cross-Cutting Concerns**
   - Logging appropriate
   - Error handling consistent
   - Tests comprehensive
   - Documentation complete

## Git Integration

When reviewing MRs:
- Use `gh pr view` or git platform APIs to fetch MR details
- Check changed files with `git diff`
- Verify branch status with `git status`
- Review commit messages for clarity
- Check for proper branch naming conventions

## Project-Specific Patterns

### Spring Boot / Kotlin Patterns
```
✓ Expected patterns:
- Dependency injection via constructor
- Data classes for DTOs
- Extension functions for utilities
- Sealed classes for state management
- Coroutines for async operations
- Repository pattern for data access
```

### Jackson Serialization
```
⚠️ Check for:
- Proper @JsonProperty annotations
- Handling of null values
- Enum serialization configuration
- Date/time handling
- Custom serializers where needed
```

## Feedback Templates

### Security Issue Template
```markdown
**[CRITICAL] Security: [Issue Title]**
Location: src/service/AuthService.kt:45

Description: Authentication bypass possible due to missing role check
Impact: Unauthorized users can access admin endpoints
Suggestion:
\`\`\`kotlin
// Add role verification
@PreAuthorize("hasRole('ADMIN')")
fun adminOperation() { ... }
\`\`\`
Reference: [OWASP Authentication Cheat Sheet]
```

### Performance Issue Template
```markdown
**[MAJOR] Performance: [Issue Title]**
Location: src/repository/UserRepository.kt:120

Description: N+1 query problem when loading user relationships
Impact: Database load increases linearly with users
Suggestion: Use @EntityGraph or JOIN FETCH to eager load relationships
\`\`\`kotlin
@EntityGraph(attributePaths = ["roles", "permissions"])
fun findByIdWithRelations(id: Long): User?
\`\`\`
```

### Code Quality Template
```markdown
**[MINOR] Maintainability: [Issue Title]**
Location: src/util/DataProcessor.kt:56

Description: Method is too long and handles multiple responsibilities
Impact: Difficult to test and maintain
Suggestion: Extract smaller methods for each responsibility:
- validateInput()
- transformData()
- persistResults()
```
