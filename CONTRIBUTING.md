# Contributing to Project Online Import

Thank you for contributing to this project! This guide will help you get started with development and contributing to this open-source tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Error messages and logs**
- **Sample .env configuration** (without sensitive values)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:

- **Use case** - Why is this enhancement needed?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What other approaches did you think about?

### Pull Requests

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/your-username/project-online-import.git
   ```

2. Create a feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes following coding standards

4. Write or update tests

5. Run the full test suite:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm run test:unit
   ```

6. Commit your changes (see commit message guidelines below)

7. Push to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

8. Create a pull request on GitHub

**Note:** This project accepts contributions through GitHub pull requests.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Access to both Microsoft Project Online and Smartsheet for testing
- Access to:
  - Microsoft Project Online instance (for testing)
  - Smartsheet account with API token (for integration testing)

### Installation

```bash
# Clone your fork
git clone https://github.com/your-username/project-online-import.git
cd project-online-import

# Add upstream remote (to sync with main repo)
git remote add upstream https://github.com/smartsheet/project-online-import.git

# Install dependencies
npm install

# Copy environment template
cp .env.sample .env

# Edit .env with your credentials (see README for details)
# Build the project
npm run build
```

### Running Tests

```bash
# Run unit tests
npm run test:unit

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Note:** Integration tests require valid Smartsheet and Project Online credentials.

## Coding Standards

### TypeScript

- Use **TypeScript strict mode** (already configured)
- Explicit types for function parameters and return values
- Avoid `any` - use proper types or `unknown`
- Use interfaces for data structures

### Code Style

- **ESLint + Prettier** - Run `npm run lint:fix` before committing
- **2-space indentation**
- **Single quotes** for strings
- **Semicolons** required
- **Max line length:** 100 characters

### Naming Conventions

- **Classes:** PascalCase (e.g., `ProjectOnlineClient`)
- **Functions:** camelCase (e.g., `extractProjectData`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Files:** PascalCase for classes, camelCase for utilities
- **Interfaces:** PascalCase, no `I` prefix

### Architecture Patterns

- **Factory Pattern** for workspace creation strategies
- **Transformer Pattern** for data mapping
- **Exponential Backoff** for API resilience
- **Type-safe** error handling with ErrorHandler utility

## Testing Guidelines

### Test Coverage

- Aim for **>80% code coverage**
- All new features must include tests
- Bug fixes should include regression tests

### Test Organization

```
test/
  ├── unit/              # Fast, isolated unit tests
  │   ├── transformers/  # Data transformation logic
  │   └── util/          # Helper utilities
  └── integration/       # End-to-end integration tests
      ├── scenarios/     # Real-world test scenarios
      └── helpers/       # Test setup helpers
```

### Writing Tests

```typescript
describe('YourFeature', () => {
  it('should handle expected case', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = yourFunction(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    // Test error conditions, null values, etc.
  });
});
```

## Submitting Changes

### Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks
- `ci:` CI/CD changes

**Examples:**
```
feat: add support for custom field mapping
fix: prevent duplicate rows in task import
docs: update authentication setup guide
test: add integration test for resource import
```

### Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features or bug fixes
3. **Run the full test suite** (`npm test`)
4. **Run linting** (`npm run lint`)
5. **Update CHANGELOG.md** with your changes
6. **Ensure build succeeds** (`npm run build`)

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

## Questions?

- Open an issue for questions
- Tag with `question` label
- Check existing issues first

Thank you for contributing! 🎉
