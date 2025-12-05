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

Comprehensive documentation is available in the [`sdlc/docs/project/`](sdlc/docs/project/) directory:

- **[Architecture](sdlc/docs/project/Architecture.md)** - System design, components, data flow, and implementation details
- **[Smartsheet Structure](sdlc/docs/project/Smartsheet-Structure.md)** - Workspace organization, sheet structures, and data type mappings
- **[Sheet References](sdlc/docs/project/Sheet-References.md)** - Cross-sheet references, picklist configurations, and relationship patterns
- **[CLI Usage Guide](sdlc/docs/project/CLI-Usage-Guide.md)** - Complete CLI command reference and troubleshooting
- **[Project Plan](sdlc/docs/project/Project-Plan.md)** - Implementation progress, completed items, open tasks, and timeline

Additional planning documents:
- [Architecture Plan](sdlc/docs/plans/project-online-smartsheet-etl-architecture-plan.md) - Detailed ETL architecture and implementation phases
- [Transformation Mapping](sdlc/docs/plans/project-online-smartsheet-transformation-mapping.md) - Property mappings and data conversion specifications

## Project Structure

```
.
├── sdlc/                      # SDLC documentation and plans
│   └── docs/
│       ├── project/           # Project documentation
│       │   ├── Architecture.md
│       │   ├── CLI-Usage-Guide.md
│       │   ├── Project-Plan.md
│       │   ├── Sheet-References.md
│       │   └── Smartsheet-Structure.md
│       ├── plans/             # Architecture and transformation plans
│       └── specs/             # Technical specifications
├── src/                       # Source code
│   ├── cli.ts                 # CLI entry point
│   ├── index.ts               # Main export file
│   ├── lib/                   # Core library code
│   │   └── importer.ts
│   ├── transformers/          # Data transformation layer
│   │   ├── ProjectTransformer.ts
│   │   ├── TaskTransformer.ts
│   │   ├── ResourceTransformer.ts
│   │   ├── AssignmentTransformer.ts
│   │   ├── PMOStandardsTransformer.ts
│   │   └── utils.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── ProjectOnline.ts
│   │   ├── Smartsheet.ts
│   │   └── SmartsheetClient.ts
│   └── util/                  # Utility classes
│       └── ExponentialBackoff.ts
├── test/                      # Tests
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── mocks/                 # Mock implementations
├── memory-bank/               # Project context and progress
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

See [Architecture.md](sdlc/docs/project/Architecture.md) for complete details.

## Contributing

This project follows TypeScript best practices and maintains high code quality standards. Please ensure:

- All code passes `npm run typecheck`, `npm run lint`, and `npm test`
- New features include appropriate tests
- Documentation is updated for significant changes

## License

MIT