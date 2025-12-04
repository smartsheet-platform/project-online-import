# Smartsheet Agentic SDLC Template

## Overview

This is a **generic template** for creating AI-powered development environments using agentic AI. Copy this template to your project and customize it to create specialized AI assistants that understand your project's architecture, patterns, and workflows.

## What This Template Provides

- **7 Specialist AI Modes** with clean names and proper delegation patterns
- **Segmented Memory Banks** with intelligent context separation
- **JIRA Integration** for optional task tracking with working API commands
- **Complete Delegation Architecture** (API clients, environment issues)
- **Ultra-Simple Setup** with only 2 variables to customize

## Quick Setup (5 Steps)

### Prerequisites

- **VSCode** with Roo extension installed
- **Git** for version control
- **Your project repository** where you want AI development assistance

### Setup Process

**One-Command Setup:** Clone this template and run the setup script with your project details:

```bash
# Clone the Smartsheet Agentic SDLC template
git clone https://gitlab.com/community/sdlc-template.git

# Run setup script with your project details
cd sdlc-template
chmod +x setup-sdlc.sh
./setup-sdlc.sh "MyProject" "myproject" "/path/to/your-project"
```

**Arguments:**
- `PROJECT_NAME` - Display name (e.g., "DataProcessor", "APIGateway")
- `PROJECT_SLUG` - Lowercase slug (e.g., "dataprocessor", "api-gateway")
- `TARGET_PATH` - Path to your project directory

**Examples:**
```bash
./setup-sdlc.sh "DataProcessor" "dataprocessor" "./my-data-app"
./setup-sdlc.sh "APIGateway" "api-gateway" "../backend-service"
./setup-sdlc.sh "UserDashboard" "user-dashboard" "/Users/me/projects/dashboard"
```

**What the script does:**
1. **Copies Smartsheet Agentic SDLC template** to your target project directory
2. **Replaces template variables** in all configuration files
3. **Deploys modes** (copies `.roomodes` and `.roo` to project root)
4. **Provides next steps** for customization and usage

## Your New AI Development Environment

After setup, you'll have **7 professional AI modes**:

- **🏗️ project online Architect** - Planning and system design
- **📊 project online Spec** - Documentation and specifications
- **💻 project online Code** - Business logic implementation
- **🔌 project online API Client Code** - API integration specialist
- **🎯 project online Orchestrator** - Complex project coordination
- **🔄 project online MR Actions** - Code review feedback processing
- **🔧 project online Dev Env** - Environment setup and troubleshooting

**Learn more:** See the [complete mode guide](https://git.lab.smartsheet.com/community/sdlc-template/-/blob/main/docs/agentic-ai-training/04-sdlc-modes-overview.md) for detailed descriptions, delegation patterns, and usage examples.

## Key Features

### Intelligent Memory Banks
- **Smartsheet Agentic SDLC work** (mode development) → uses `sdlc/memory-bank/`
- **Application work** (feature development) → uses `memory-bank/`
- **Automatic context detection** - no manual selection needed

### Perfect Delegation
- **API client work** → Only API Client Code mode implements API clients
- **Environment issues** → Only Dev Env mode fixes environment problems
- **All modes retry** after specialist resolves issues

### Optional JIRA Integration
- **Task tracking** via MCP Atlassian server
- **"What's next?" queries** for automated task discovery via JQL
- **Status updates** throughout development workflow
- **Complete setup instructions** in Atlassian MCP documentation

## Environment Variables

Only **4 environment variables** (2 required, 2 optional):

```bash
# Required for MR feedback processing
GIT_TOKEN=your_git_platform_token

# Optional JIRA task tracking (configured via MCP)
# See sdlc/atlassian/ for setup instructions
```

## File Structure

```
PROJECT_ROOT/
├── .env.sample              # Environment template with setup instructions
└── sdlc/
    ├── .roomodes            # Mode definitions (2 variables to customize)
    ├── Dev Env.md          # Environment guide (customize for your project)
    ├── docs/
    │   ├── code/           # Code mode guidance (add your patterns)
    │   ├── specs/          # Spec mode guidance (add your templates)
    │   └── plans/          # Architect creates planning docs here
    └── memory-bank/        # SDLC memory bank (generic templates)
```

## Learning Resources

### Quick Start Guide

New to Agentic AI workflows? Start here:

- **[5-Minute Quick Start](docs/agentic-ai-training/quick-start.md)** - Get productive immediately
- **[One-Page Cheatsheet](docs/agentic-ai-training/cheatsheet.md)** - Essential commands and patterns

### Comprehensive Training

For in-depth learning about Agentic AI and this template:

📚 **Full training materials available in the [template repository](https://git.lab.smartsheet.com/community/sdlc-template)**

The template repository contains comprehensive guides covering:
- Conceptual foundations and architecture principles
- Detailed mode descriptions and delegation patterns
- Real-world scenarios with code examples
- Best practices and advanced techniques

**Note:** Deployed projects include only quick-start materials to keep the footprint small. The template repository is the single source of truth for all comprehensive training content.

## Troubleshooting

### Modes Not Appearing
```bash
# Check deployment
ls -la .roomodes
ls -la .roo

# Validate syntax
python -c "import yaml; yaml.safe_load(open('.roomodes'))"

# Reload VSCode
# Cmd+Shift+P → "Developer: Reload Window"
```

### Template Variables Remain
```bash
# Find remaining variables
grep -r "{{" sdlc/

# Replace with your values
# project online → MyProject
# project-online → myproject
```

---

## This Template Creates

A professional AI-driven development environment that:
- **Understands your project** through customized guidance documents
- **Maintains clean architecture** with proper delegation patterns
- **Tracks work automatically** through optional JIRA integration
- **Provides comprehensive support** from environment setup to deployment

**Setup Time:** 5 minutes
**Variables to Customize:** Only 2
**Result:** Professional AI development assistance for any project
