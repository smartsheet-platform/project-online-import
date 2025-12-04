# Dev Env Mode Customizations

## Purpose

This file contains project-specific customizations for the Dev Env mode. These customizations extend or override the default behavior defined in the template rules.

**IMPORTANT**: This file will NEVER be overwritten by `setup-sdlc.sh` updates. You can safely add your custom rules, workflows, and instructions here.

## When to Add Customizations

Add customizations here when you need:
- Custom environment setup steps specific to YOUR project
- Project-specific tool configurations (not general tool knowledge)
- Custom troubleshooting procedures (not general tech troubleshooting)
- Integration with your team's development tools
- Additional environment validation checks

## Ultra-DRY Guidelines

Before adding content here, check if the pattern already exists in:
- `../../shared/env-setup-workflow.md`
- `../../shared/ecosystem-knowledge.md`
- `../../shared/jira-mcp-troubleshooting.md`

**Decision Tree**:
- If it exists → Reference the shared pattern in a comment
- If it's new AND applies to multiple modes → Extract to `../../shared/`
- If it's truly project-specific → Add inline content here

## Custom Rules

<!-- Add your custom Dev Env mode rules below this line -->



<!-- Example: Reference shared pattern + project-specific addition
## Environment Setup

For base .env setup, see: `../../shared/env-setup-workflow.md`

### Project-Specific Environment Variables

**COMPANY_API_KEY**:
- **Source**: Get from company vault at https://vault.company.com
- **Required**: Yes
- **Format**: 32-character alphanumeric string
- **Validation**: Run `npm run validate-env` to verify

**DATABASE_URL**:
- **Source**: Local PostgreSQL instance or staging database
- **Required**: Yes for backend development
- **Format**: `postgresql://user:password@localhost:5432/dbname`
- **Setup**: Run `npm run db:setup` to initialize local database
-->

<!-- Example: Truly project-specific rule (inline content)
## Database Connection Validation

Before starting development, verify database connection:

```bash
psql -h localhost -U dev -d myapp -c "SELECT 1"
```

If connection fails:
1. Check PostgreSQL is running: `brew services list | grep postgresql`
2. Verify credentials in `.env` file
3. Ensure database exists: `createdb myapp`
4. Run migrations: `npm run db:migrate`

**Required Tables**: users, sessions, audit_log
**Minimum PostgreSQL Version**: 14.0
-->

<!-- Example: Custom tool configuration
## Docker Configuration

Our project requires specific Docker settings:

**Memory Limit**: 4GB minimum
**CPU Limit**: 2 cores minimum
**Required Volumes**:
- `./data:/app/data` - Persistent data storage
- `./logs:/app/logs` - Application logs

Update Docker Desktop settings or add to `docker-compose.yml`:
```yaml
services:
  app:
    mem_limit: 4g
    cpus: 2
```
-->