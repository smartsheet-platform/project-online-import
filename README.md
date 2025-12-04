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

## Project Structure

```
.
├── src/              # Source code
│   ├── cli.ts        # CLI entry point
│   ├── index.ts      # Main export file
│   └── lib/          # Core library code
│       └── importer.ts
├── test/             # Unit tests
│   └── importer.test.ts
├── dist/             # Compiled output (generated)
├── coverage/         # Test coverage reports (generated)
└── node_modules/     # Dependencies (generated)
```

## License

MIT