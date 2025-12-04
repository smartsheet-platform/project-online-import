# project online Development Environment Setup Guide

> **Template Instructions**: Replace all `project online`, `{{TECH_STACK}}`, and bracketed placeholders with your actual project information.

Welcome to project online development! This guide will help you set up your development environment for both the Smartsheet Agentic SDLC toolkit usage and your project development.

## Table of Contents

1. [What is project online?](#what-is-project_name)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Development Environment Setup](#development-environment-setup)
5. [Running the Application](#running-the-application)
6. [Development Tools](#development-tools)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## What is project online?

project online is [**CUSTOMIZE**: describe your project/platform here]. It provides:

- **[Core Feature 1]**: [**CUSTOMIZE**: Description of main functionality]
- **[Core Feature 2]**: [**CUSTOMIZE**: Description of architecture approach]
- **[Core Feature 3]**: [**CUSTOMIZE**: Description of integration capabilities]
- **[Core Feature 4]**: [**CUSTOMIZE**: Description of user interface or API]

### Key Components

- **[Component 1]**: [**CUSTOMIZE**: Description of main orchestration or routing logic]
- **[Component 2]**: [**CUSTOMIZE**: Description of core functionality modules]
- **[Component 3]**: {{TECH_STACK}} application that [**CUSTOMIZE**: describe your application architecture]
- **[Component 4]**: [**CUSTOMIZE**: Description of UI/frontend components if applicable]

---

## Prerequisites

- **Operating System**: [**CUSTOMIZE**: macOS, Linux, Windows with WSL2, etc.]
- **{{TECH_STACK}}**: [**CUSTOMIZE**: Specific version requirements]
- **Git**: Installed and configured
- **VSCode**: With Roo extension installed
- **[Additional Tool Requirements]**: [**CUSTOMIZE**: Any other required tools]

---

## Initial Setup

### Step 1: Clone Repository

```bash
git clone [**CUSTOMIZE**: your-repository-url]
cd [**CUSTOMIZE**: your-project-directory]
```

### Step 2: Environment Variables

The Smartsheet Agentic SDLC will help you create your `.env` file:

1. **Use the Dev Env mode**: Switch to "🔧 project online Dev Env" mode
2. **Request environment setup**: Say "set up environment"
3. **Follow token setup guidance**: The mode will guide you through:
   - Git platform token setup (GitHub, GitLab, etc.)
   - JIRA integration setup (optional)
   - [**CUSTOMIZE**: Any project-specific tokens or credentials]

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

# [**CUSTOMIZE**: Add your project-specific environment variables]
# API_TOKEN=your_api_token
# DATABASE_URL=your_database_connection
# [Additional variables as needed for your project]
```

---

## Development Environment Setup

### {{TECH_STACK}} Environment

[**CUSTOMIZE**: Add your specific technology stack setup instructions]

**Example for Python:**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Example for Node.js:**
```bash
# Install dependencies
npm install

# or using yarn
yarn install
```

### Development Dependencies

[**CUSTOMIZE**: Add your specific development dependencies and installation]

```bash
# Example linting and formatting tools
# [Add your specific commands]

# Example testing frameworks  
# [Add your specific commands]

# Example build tools
# [Add your specific commands]
```

---

## Running the Application

### Development Server

[**CUSTOMIZE**: Add your development server startup commands]

```bash
# Example for web applications:
# npm run dev
# python manage.py runserver
# [Your specific startup command]

# The application will be available at [YOUR_URL]
```

### Services and Dependencies

[**CUSTOMIZE**: Add any additional services your project needs]

```bash
# Example database startup:
# docker-compose up -d postgres

# Example additional services:
# [Your specific service startup commands]
```

---

## Development Tools

### Linting and Code Quality

[**CUSTOMIZE**: Add your project's linting and code quality tools]

```bash
# Example for Python with ruff:
# ruff check .                    # Check for issues
# ruff check . --fix              # Auto-fix issues  
# ruff format .                   # Format code
# mypy src/                       # Type checking

# Example for Node.js with ESLint:
# npm run lint                    # Check for issues
# npm run lint:fix                # Auto-fix issues
# npm run format                  # Format code

# [Your specific linting commands]
```

### Pre-commit Hooks (Optional)

[**CUSTOMIZE**: If you use pre-commit hooks]

```bash
# Example setup:
# pre-commit install
# pre-commit run --all-files
```

---

## Testing

### Running Tests

[**CUSTOMIZE**: Add your project's testing commands]

```bash
# Example for Python:
# pytest                          # Run all tests
# pytest -v                       # Verbose output
# pytest --cov=src                # With coverage

# Example for Node.js:
# npm test                        # Run all tests
# npm run test:watch              # Watch mode
# npm run test:coverage           # With coverage

# [Your specific test commands]
```

### Test Structure

[**CUSTOMIZE**: Describe your test organization]

- **Unit Tests**: [Location and naming conventions]
- **Integration Tests**: [Location and approach]
- **[Additional Test Types]**: [Your specific testing approach]

---

## Troubleshooting

### Common Issues

#### [**CUSTOMIZE**: Your Project-Specific Issues]

**Problem**: [Common issue in your project]
**Solutions**:
1. [Specific solution steps]
2. [Alternative approaches]
3. [Where to get help]

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
2. Verify all required tools are installed
3. Check that environment variables are properly set
4. Use Dev Env mode's comprehensive troubleshooting

### Development Environment Issues

[**CUSTOMIZE**: Add common environment issues specific to your technology stack]

#### {{TECH_STACK}} Issues
**Problem**: [Common issues with your tech stack]
**Solutions**:
1. [Specific troubleshooting steps]
2. [Environment configuration checks]
3. [Version compatibility verification]

#### Dependency Issues
**Problem**: Package installation or dependency conflicts
**Solutions**:
1. [Clean installation steps]
2. [Version resolution approaches]
3. [Environment isolation verification]

---

## Getting Help

### Using the Smartsheet Agentic SDLC Modes for Environment Issues

1. **Switch to project online Dev Env Mode**: The AI assistant has comprehensive troubleshooting knowledge
2. **Describe the issue**: The mode can diagnose and fix a wide range of environment problems
3. **Follow guidance**: The mode references this Dev Env.md file plus has broad ecosystem knowledge

### Project-Specific Help

- **Team Documentation**: [**CUSTOMIZE**: Links to your team resources]
- **Internal Support**: [**CUSTOMIZE**: How to get help from your team]
- **External Resources**: [**CUSTOMIZE**: Relevant external documentation]

---

## Template Customization Instructions

**When setting up this template for your project:**

1. **Replace all template variables**:
   - `project online` → Your project name
   - `{{TECH_STACK}}` → Your technology stack

2. **Fill in bracketed placeholders**:
   - `[**CUSTOMIZE**: description]` → Your actual information
   - Replace all bracketed instructions with real content

3. **Add project-specific sections**:
   - Technology stack setup instructions
   - Project-specific troubleshooting
   - Team resources and support contacts

4. **Remove this section** after customization is complete

---

**Welcome to project online development with AI-powered SDLC assistance! 🚀**

*Template Version: Smartsheet Agentic SDLC Template*