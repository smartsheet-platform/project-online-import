# Project Online Import CLI

A TypeScript CLI tool for importing Project Online data to Smartsheet.

## Installation

```bash
npm install
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm run dev` - Run the CLI in development mode with ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled CLI
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Fix linting errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

## Usage

### Import Command

Import data from Project Online to Smartsheet:

```bash
npm run dev -- import --source <url> --destination <id>
```

Options:
- `-s, --source <url>` - Project Online source URL
- `-d, --destination <id>` - Smartsheet destination ID
- `--dry-run` - Run without making changes

Example:
```bash
npm run dev -- import --source https://example.com --destination sheet-123
```

### Validate Command

Validate Project Online data before import:

```bash
npm run dev -- validate --source <url>
```

Example:
```bash
npm run dev -- validate --source https://example.com
```

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Code Quality

This project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for unit testing

Run all quality checks:
```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Documentation

Comprehensive documentation is organized in a guided reading series. Follow this recommended order:

1. **[Project Online Migration Overview](sdlc/docs/architecture/01-project-online-migration-overview.md)** - Business context, high-level approach, and system overview
2. **[ETL System Design](sdlc/docs/architecture/02-etl-system-design.md)** - Component architecture and implementation details
3. **[Data Transformation Guide](sdlc/docs/architecture/03-data-transformation-guide.md)** - Data mappings, output structure, and transformation specifications
4. **[Template-Based Workspace Creation](sdlc/docs/project/Template-Based-Workspace-Creation.md)** - Efficient workspace creation using templates
5. **[Re-run Resiliency](sdlc/docs/project/Re-run-Resiliency.md)** - Idempotent operations and multi-run support
6. **[Sheet References](sdlc/docs/project/Sheet-References.md)** - Cross-sheet references, picklist configurations, and relationship patterns
7. **[Authentication Setup](sdlc/docs/project/Authentication-Setup.md)** - Credential configuration for Project Online and Smartsheet
8. **[CLI Usage Guide](sdlc/docs/project/CLI-Usage-Guide.md)** - Complete CLI command reference and examples
9. **[Troubleshooting Playbook](sdlc/docs/code/troubleshooting-playbook.md)** - Common issues and solutions
10. **[Code Conventions](sdlc/docs/code/conventions.md)** - Naming, formatting, and style standards
11. **[Code Patterns](sdlc/docs/code/patterns.md)** - Recommended implementation patterns
12. **[Anti-Patterns](sdlc/docs/code/anti-patterns.md)** - Common mistakes to avoid
13. **[API Services Catalog](sdlc/docs/api-reference/api-services-catalog.md)** - External API integration reference
14. **[Test Suite Guide](test/README.md)** - Testing strategy, scenarios, and implementation

## Project Structure

```
.
├── sdlc/                      # SDLC documentation and configuration
│   ├── docs/
│   │   ├── architecture/      # System architecture documentation
│   │   │   ├── 01-project-online-migration-overview.md
│   │   │   ├── 02-etl-system-design.md
│   │   │   ├── 03-data-transformation-guide.md
│   │   │   ├── claude-agent-system.md
│   │   │   └── ultra-dry-architecture.md
│   │   ├── project/           # Implementation guides
│   │   │   ├── Authentication-Setup.md
│   │   │   ├── CLI-Usage-Guide.md
│   │   │   ├── Re-run-Resiliency.md
│   │   │   ├── Sheet-References.md
│   │   │   └── Template-Based-Workspace-Creation.md
│   │   ├── code/              # Code standards and patterns
│   │   │   ├── anti-patterns.md
│   │   │   ├── conventions.md
│   │   │   ├── patterns.md
│   │   │   └── troubleshooting-playbook.md
│   │   ├── api-reference/     # API integration reference
│   │   │   └── api-services-catalog.md
│   │   └── specs/             # Technical specifications
│   │       ├── E2E-Integration-Tests.md
│   │       └── Project-Plan.md
│   ├── shared/                # Shared documentation for Roo/Claude
│   └── memory-bank/           # SDLC context and progress tracking
├── src/                       # Source code
│   ├── cli.ts                 # CLI entry point
│   ├── index.ts               # Main export file
│   ├── lib/                   # Core library code
│   │   ├── importer.ts        # ETL orchestration
│   │   ├── ProjectOnlineClient.ts  # Project Online API client
│   │   └── auth/
│   │       └── MSALAuthHandler.ts  # Microsoft authentication
│   ├── transformers/          # Data transformation layer
│   │   ├── AssignmentTransformer.ts
│   │   ├── PMOStandardsTransformer.ts
│   │   ├── ProjectTransformer.ts
│   │   ├── ResourceTransformer.ts
│   │   ├── TaskTransformer.ts
│   │   └── utils.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── ProjectOnline.ts
│   │   ├── Smartsheet.ts
│   │   └── SmartsheetClient.ts
│   └── util/                  # Utility classes
│       ├── ConfigManager.ts
│       ├── ErrorHandler.ts
│       ├── ExponentialBackoff.ts
│       ├── Logger.ts
│       ├── ProgressReporter.ts
│       └── SmartsheetHelpers.ts
├── test/                      # Test suite
│   ├── unit/                  # Unit tests with mocks
│   │   ├── builders/          # Test data builders
│   │   ├── transformers/      # Transformer unit tests
│   │   ├── MockODataClient.ts
│   │   └── MockSmartsheetClient.ts
│   ├── integration/           # Integration tests
│   │   ├── scenarios/         # Test scenario definitions
│   │   └── helpers/           # Test utilities
│   └── README.md              # Test suite documentation
├── memory-bank/               # Main app project context
├── scripts/                   # Utility scripts
├── dist/                      # Compiled output (generated)
├── coverage/                  # Test coverage reports (generated)
└── node_modules/              # Dependencies (generated)
```

## Architecture Overview

This tool implements an Extract-Transform-Load (ETL) pattern:

1. **Extract** - Fetch data from Project Online oData API (future)
2. **Transform** - Convert Project Online entities to Smartsheet format
3. **Load** - Create Smartsheet workspaces, sheets, and populate data

### Key Features

- **Workspace per Project** - Each Project Online project becomes a dedicated Smartsheet workspace
- **Three Sheets per Project** - Summary, Tasks, and Resources
- **Hierarchical Tasks** - Maintains task hierarchy from Project Online
- **Resource Type Handling** - Work resources use contact lists, Material/Cost use picklists
- **PMO Standards** - Centralized reference sheets for consistent picklist values
- **Type Safety** - Full TypeScript implementation with comprehensive type definitions

See [Project Online Migration Overview](sdlc/docs/architecture/01-project-online-migration-overview.md) and [ETL System Design](sdlc/docs/architecture/02-etl-system-design.md) for complete details.

## Contributing

This project follows TypeScript best practices and maintains high code quality standards. Please ensure:

- All code passes `npm run typecheck`, `npm run lint`, and `npm test`
- New features include appropriate tests
- Documentation is updated for significant changes

## License

MIT