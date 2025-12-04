# Code Guidance Integration for Implementer

## Overview

Guidelines for using project-specific coding standards and patterns when implementing code. Ensures consistent implementation that matches project approaches.

## Language Best Practices

Language-specific and universal best practices are maintained in the [language-best-practices](language-best-practices/) directory. These files are shared with the code-reviewer agent to ensure consistency between what's implemented and what's reviewed.

### [Universal](language-best-practices/universal.md)
Language-agnostic best practices: code clarity, function design, error handling, testing, dependencies, performance, security, design principles (SOLID, DRY, KISS, YAGNI).

**Apply to all code implementations regardless of language.**

### [Kotlin on JVM](language-best-practices/kotlin-jvm.md)
Kotlin-specific: null safety, coroutines, scope functions, extension functions, data/sealed classes, resource management (`use`), collections/sequences, Spring Boot on Kotlin, Java interoperability.

### [TypeScript/JavaScript](language-best-practices/typescript-javascript.md)
TypeScript/JavaScript-specific: type safety, async operations, memory management, immutability patterns, React patterns, modern JS features.

### [Python](language-best-practices/python.md)
Python-specific: type hints, context managers, comprehensions, async patterns, PEP 8, dataclasses, framework patterns (Django, FastAPI).

**Note:** These are universal and language-specific best practices. Project-specific coding patterns are documented in `sdlc/docs/code/`.

## Guidance Directory

**Location**: `sdlc/docs/code/` (including all subdirectories)

**Purpose**: Central location for project-specific coding standards, architectural patterns, testing approaches, and implementation examples

## When to Reference Guidance

- Starting any code implementation task
- User requests adherence to project standards
- Implementing features that should follow established patterns
- Need clarification on coding conventions or architecture patterns

## How to Use Guidance

### Step 1: Check for Guidance Documents
Check for guidance documents in `sdlc/docs/code/` including all subdirectories

**Example subdirectories**:
- `sdlc/docs/code/api/integration-patterns.md`
- `sdlc/docs/code/testing/unit-test-examples.md`
- `sdlc/docs/code/patterns/error-handling-patterns.md`

### Step 2: Read Applicable Standards
Read applicable standards, patterns, or examples from all subdirectories

### Step 3: Apply Guidance
Apply guidance to current implementation work

### Step 4: Reference in Code
Reference specific guidance documents in code comments when appropriate

## Guidance File Types

### Coding Standards
- **Filename**: `coding-standards.md`
- **Usage**: Reference for code style, naming conventions, structure patterns
- **When**: Before implementing any new code

### Architecture Patterns
- **Filename**: `architecture-patterns.md`
- **Usage**: Reference for consistent architectural approaches
- **When**: Designing component structure or system integration

### API Integration Examples
- **Filename**: `api-integration-examples.md`
- **Usage**: Reference for API integration patterns and examples
- **When**: Implementing API integrations (but delegate client creation to API Client Code specialist)

### Testing Patterns
- **Filename**: `testing-patterns.md`
- **Usage**: Reference for testing approaches and framework usage
- **When**: Writing tests or setting up test suites

### Error Handling
- **Filename**: `error-handling.md`
- **Usage**: Reference for consistent error handling patterns
- **When**: Implementing error handling or exception management

## Integration Workflow

### Startup Check
1. Check for language-specific best practices in `language-best-practices/` directory
   - Read universal.md for all implementations
   - Read language-specific file (kotlin-jvm.md, typescript-javascript.md, or python.md) based on implementation language
2. Check if `sdlc/docs/code/` directory exists
3. List available project-specific guidance documents
4. Read relevant documents based on implementation task
5. Apply guidance to implementation approach

### Implementation Guidance
1. Apply language best practices (universal + language-specific)
2. Reference project-specific coding standards for style and structure
3. Follow architectural patterns for consistent design
4. Use testing patterns for comprehensive test coverage
5. Apply error handling patterns consistently
6. Include references to guidance documents in code comments

## User Communication

### When Guidance Available
```
I found language-specific best practices and project-specific coding guidance. I'll
reference these standards and patterns to ensure consistent implementation that
matches your project's approaches.
```

### When No Project Guidance
```
I'll apply language-specific best practices from language-best-practices/. No
project-specific guidance found in sdlc/docs/code/. Consider adding coding-standards.md
and architecture-patterns.md for more consistent results.
```

## Best Practices

1. **Always check for and apply language best practices first**
2. **Always check for and apply project-specific guidance**
3. **Reference guidance documents in code comments when following patterns**
4. **Suggest improvements to guidance documents when patterns are unclear**
