# Language Best Practices

This directory contains universal and language-specific best practices, patterns, and guidelines used by multiple agents/modes.

## Shared by Agents

These files are referenced by:
- **code-reviewer** - Uses as review checklists to identify issues
- **implementer** - Uses as implementation guidelines to follow best practices

## Universal Best Practices

- **[universal.md](universal.md)** - Language-agnostic best practices that apply to all code (code clarity, testing, error handling, design principles, etc.)

**Start here:** All developers should follow the universal best practices regardless of language.

## Language-Specific Best Practices

These files contain patterns and practices specific to each language:

- **[kotlin-jvm.md](kotlin-jvm.md)** - Kotlin on JVM (null safety, coroutines, scope functions, Spring Boot, etc.)
- **[typescript-javascript.md](typescript-javascript.md)** - TypeScript/JavaScript (type safety, async patterns, React, etc.)
- **[python.md](python.md)** - Python (type hints, context managers, comprehensions, async, etc.)

Each language-specific file references the universal best practices and adds language-specific guidance.

## Universal vs Project-Specific

**These files (universal):**
- Language-agnostic best practices
- Standard patterns and conventions
- Common pitfalls to avoid
- Testing approaches

**Project-specific patterns (sdlc/docs/code/):**
- How THIS project structures code
- Project-specific naming conventions
- Project-specific error handling patterns
- Framework integration patterns specific to this codebase

## Adding New Languages

To add a new language:

1. Create `{language}.md` in this directory
2. Include sections for common concerns (null safety, error handling, testing, etc.)
3. Update `../code-reviewer-review-patterns.md` to reference it
4. Update `../implementer-code-guidance.md` to reference it

## Customization

Add project-specific language practices here, but keep major project patterns in `sdlc/docs/code/`.
