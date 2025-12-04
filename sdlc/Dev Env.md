# Project Online Import Development Environment Setup Guide

Welcome to Project Online Import development! This guide will help you set up your development environment for both the Smartsheet Agentic SDLC toolkit usage and your project development.

## Table of Contents

1. [What is Project Online Import?](#what-is-project-online-import)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Development Environment Setup](#development-environment-setup)
5. [Running the Application](#running-the-application)
6. [Development Tools](#development-tools)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## What is Project Online Import?

Project Online Import is a TypeScript CLI tool for importing Microsoft Project Online data into Smartsheet. It provides:

- **Data Transformation**: Converts Project Online entities (Projects, Tasks, Resources, Assignments) to Smartsheet format
- **PMO Standards Integration**: Creates centralized reference sheets for standardized picklist values across projects
- **Automated Sheet Creation**: Generates properly structured Smartsheet workspaces and sheets with correct column types
- **Type-Safe Architecture**: Full TypeScript implementation with comprehensive type definitions and error handling

### Key Components

- **CLI Interface**: Command-line tool built with Commander.js for easy data import operations
- **Transformation Engine**: Core modules that convert oData entities to Smartsheet rows with proper data mapping
- **TypeScript Application**: Type-safe codebase with interfaces for Project Online entities and Smartsheet structures
- **Testing Infrastructure**: Comprehensive Jest test suite with mock clients for unit testing transformation logic

---

## Prerequisites

- **Operating System**: macOS, Linux, or Windows with WSL2
- **Node.js**: Version 18.0.0 or higher (LTS recommended)
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Git**: Installed and configured
- **VSCode**: With Roo extension installed (for Smartsheet Agentic SDLC)

---

## Initial Setup

### Step 1: Clone Repository

```bash
git clone <your-repository-url>
cd Project-Online-Import
```

### Step 2: Environment Variables

The Smartsheet Agentic SDLC will help you create your `.env` file:

1. **Use the Dev Env mode**: Switch to "🔧 project online Dev Env" mode
2. **Request environment setup**: Say "set up environment"
3. **Follow token setup guidance**: The mode will guide you through:
   - Git platform token setup (GitHub, GitLab, etc.)
   - JIRA integration setup (optional)
   - Project-specific credentials

**Required Environment Variables:**
```bash
# Git platform token (required for MR feedback)
GIT_TOKEN=your_git_platform_token

# JIRA integration (optional - configured via MCP, see sdlc/atlassian/)
JIRA_PROJECT_KEY=
JIRA_URL=https://smartsheet.atlassian.net
JIRA_USERNAME=
JIRA_API_TOKEN=
CONFLUENCE_URL=https://smar-wiki.atlassian.net/
CONFLUENCE_USERNAME=
CONFLUENCE_API_TOKEN=

# Project Online Import specific variables
# PROJECT_ONLINE_URL=https://your-tenant.project.microsoft.com
# PROJECT_ONLINE_CLIENT_ID=your_client_id
# PROJECT_ONLINE_CLIENT_SECRET=your_client_secret
# SMARTSHEET_ACCESS_TOKEN=your_smartsheet_token
```

---

## Development Environment Setup

### Node.js/TypeScript Environment

**1. Install dependencies:**
```bash
npm install
```

This installs all required packages including:
- TypeScript compiler
- Jest testing framework
- ESLint and Prettier for code quality
- Commander for CLI interface
- Development tools (ts-node, type definitions)

**2. Verify installation:**
```bash
# Check Node.js version (should be >= 18.0.0)
node --version

# Check npm version (should be >= 9.0.0)
npm --version

# Verify TypeScript compilation works
npm run typecheck
```

### Development Dependencies

All development tools are automatically installed with `npm install`. Key tools include:

**Code Quality:**
- ESLint for linting TypeScript code
- Prettier for consistent code formatting
- TypeScript compiler for type checking

**Testing:**
- Jest as the test runner
- ts-jest for TypeScript support in tests
- @types/jest for TypeScript definitions

**Development:**
- ts-node for running TypeScript files directly
- @types/node for Node.js type definitions

---

## Running the Application

### Development Mode

Run the CLI in development mode with TypeScript directly:

```bash
# Run the CLI tool in development mode
npm run dev

# The CLI will show available commands and options
npm run dev -- --help
```

### Build and Production Mode

Build the TypeScript code to JavaScript for production:

```bash
# Clean previous build
npm run clean

# Build TypeScript to dist/ directory
npm run build

# Run the built CLI tool
npm start

# Or run the CLI directly after building
./dist/cli.js --help
```

### Development Scripts

```bash
# Run in dev mode (uses ts-node)
npm run dev

# Type-check without building
npm run typecheck

# Watch mode (auto-rebuilds on changes)
npm run build -- --watch
```

---

## Development Tools

### Linting and Code Quality

The project uses ESLint and Prettier for code quality and formatting:

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check code formatting
npm run format:check

# Auto-format code
npm run format

# Type-check the codebase
npm run typecheck
```

**Pre-commit Workflow:**
Before committing code, run:
```bash
npm run lint:fix && npm run format && npm run typecheck && npm test
```

### Editor Configuration

**VSCode Settings** (`.vscode/settings.json`):
- Auto-format on save with Prettier
- ESLint integration for real-time linting
- TypeScript language features enabled

**Recommended VSCode Extensions:**
- ESLint
- Prettier - Code formatter
- TypeScript and JavaScript Language Features (built-in)
- Roo Coder (for Smartsheet Agentic SDLC)

---

## Testing

### Running Tests

The project uses Jest for comprehensive unit testing:

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- ProjectTransformer.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should create"
```

### Test Structure

- **Unit Tests**: Located in `test/` directory mirroring `src/` structure
  - `test/transformers/` - Transformation logic tests
  - `test/mocks/` - Mock implementations for testing
  - `test/utils/` - Utility function tests

- **Test Naming**: `*.test.ts` files with descriptive test suites
- **Mock Infrastructure**: MockSmartsheetClient and MockODataClient for isolated testing
- **Coverage Goals**: Aim for >80% code coverage on transformation logic

### Test Organization

```
test/
├── mocks/
│   ├── MockSmartsheetClient.ts   # Mock Smartsheet SDK
│   └── MockODataClient.ts         # Mock Project Online oData client
├── transformers/
│   ├── ProjectTransformer.test.ts
│   ├── ResourceTransformer.test.ts
│   ├── TaskTransformer.test.ts
│   └── AssignmentTransformer.test.ts
└── utils/
    └── utils.test.ts
```

---

## Troubleshooting

### Common Issues

#### TypeScript Compilation Errors

**Problem**: TypeScript compilation fails with type errors
**Solutions**:
1. Ensure Node.js version >= 18.0.0: `node --version`
2. Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
3. Check TypeScript version: `npx tsc --version` (should be 5.3.3)
4. Run type-check to see all errors: `npm run typecheck`

#### Test Failures

**Problem**: Jest tests fail or don't run
**Solutions**:
1. Clear Jest cache: `npx jest --clearCache`
2. Verify test file naming follows `*.test.ts` pattern
3. Check import paths are correct (use relative paths)
4. Run single test file to isolate issue: `npm test -- FileName.test.ts`

### SDLC Mode Issues

#### Modes Not Appearing

**Problem**: project online modes don't show up in Roo mode selector
**Solutions**:
1. Verify deployment: `ls -la .roomodes`
2. Validate YAML syntax: `python -c "import yaml; yaml.safe_load(open('.roomodes'))"`
3. Reload VSCode: `Cmd+Shift+P` → "Developer: Reload Window"

#### Environment Setup Issues

**Problem**: Dev Env mode reports configuration problems
**Solutions**:
1. Check .env file exists and is properly configured
2. Verify all required tools are installed (Node.js, npm)
3. Check that environment variables are properly set
4. Use Dev Env mode's comprehensive troubleshooting

### Development Environment Issues

#### Node.js/TypeScript Issues

**Problem**: Module not found errors or import issues
**Solutions**:
1. Verify tsconfig.json paths are correct
2. Check that imports use correct relative paths
3. Ensure all dependencies are installed: `npm install`
4. Rebuild the project: `npm run clean && npm run build`

#### Dependency Issues

**Problem**: Package installation or dependency conflicts
**Solutions**:
1. Delete and reinstall: `rm -rf node_modules package-lock.json && npm install`
2. Check Node.js and npm versions meet minimum requirements
3. Try using npm clean install: `npm ci`
4. Check for peer dependency warnings: `npm install --legacy-peer-deps`

#### ESLint/Prettier Conflicts

**Problem**: Linting and formatting rules conflict
**Solutions**:
1. ESLint config includes `eslint-config-prettier` to disable conflicting rules
2. Run format first, then lint: `npm run format && npm run lint`
3. Check `.eslintrc.json` and `.prettierrc` are not modified
4. Reload VSCode window to refresh ESLint server

#### Jest Configuration Issues

**Problem**: Tests don't run or fail to compile TypeScript
**Solutions**:
1. Verify `jest.config.js` points to ts-jest preset
2. Check `tsconfig.json` includes test files
3. Clear Jest cache: `npx jest --clearCache`
4. Ensure test files use `.test.ts` extension

---

## Getting Help

### Using the Smartsheet Agentic SDLC Modes for Environment Issues

1. **Switch to project online Dev Env Mode**: The AI assistant has comprehensive troubleshooting knowledge
2. **Describe the issue**: The mode can diagnose and fix a wide range of environment problems
3. **Follow guidance**: The mode references this Dev Env.md file plus has broad ecosystem knowledge

### Project-Specific Resources

- **Repository**: Check README.md for project overview and architecture
- **Documentation**: See `sdlc/docs/` for detailed specifications and plans
- **Type Definitions**: Review `src/types/` for all TypeScript interfaces
- **Test Examples**: Look at existing test files for patterns and best practices

### External Resources

- **TypeScript Documentation**: https://www.typescriptlang.org/docs/
- **Node.js Documentation**: https://nodejs.org/docs/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Commander.js**: https://github.com/tj/commander.js#readme

---

**Welcome to Project Online Import development with AI-powered SDLC assistance! 🚀**

*Last Updated: 2024-12-04*
*Project Type: TypeScript CLI Tool*
*Node.js >= 18.0.0 | npm >= 9.0.0*