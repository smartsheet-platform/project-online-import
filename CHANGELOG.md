# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open-source release preparation

## [1.0.0] - TBD

### Added

#### Core Features
- CLI tool for importing Project Online projects to Smartsheet
- OAuth 2.0 authentication via Device Code Flow (interactive browser-based)
- Automatic token caching and refresh
- Support for hierarchical task import with parent-child relationships
- Resource and assignment mapping
- PMO Standards workspace pattern for centralized reference data

#### Data Mapping
- Project metadata (name, owner, dates, status, priority)
- Tasks with full hierarchy (outline levels, indentation)
- Task dependencies (predecessors with lag)
- Resource allocation (Work, Material, Cost types)
- Assignment columns with multi-contact lists
- Critical path fields (Late Start, Late Finish, Total Slack, Free Slack)
- Constraint types (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)

#### Template System
- Template workspace support for consistent structure
- Interactive template acquisition via distribution link
- Automatic template persistence to .env
- Fallback to blank workspace creation

#### Resilience Features
- Exponential backoff retry logic for transient API failures
- Rate limiting (configurable, default 300 req/min)
- Pagination handling for large datasets
- Re-run resilience (idempotent operations)
- Comprehensive error handling with user-friendly messages

#### Developer Experience
- Dry-run mode for validation without changes
- Multi-stage progress reporting
- Detailed logging with configurable levels
- Extensive test coverage (unit + integration)
- TypeScript with strict type checking

### Known Limitations

- Portfolio solution type not yet implemented (planned for future release)
- Task custom fields not currently mapped
- Project custom fields not currently mapped
- Resource assignment notes not imported
- Requires manual Azure AD app registration
- Template workspace must be manually acquired on first run

### Security

- OAuth tokens stored securely in user home directory
- No credentials hardcoded in source code
- Environment variables for all sensitive configuration
- Token auto-refresh prevents credential exposure

---

## Release History

### Version Numbering

- **MAJOR** (x.0.0): Breaking changes to CLI interface or API
- **MINOR** (1.x.0): New features, backward compatible
- **PATCH** (1.0.x): Bug fixes, backward compatible

### Future Roadmap

Planned for future releases:
- Custom field mapping configuration
- Portfolio workspace support
- Bulk import (multiple projects)
- Incremental sync (update existing workspaces)
- Cross-project resource pool management
- REST API mode (in addition to CLI)

---

[Unreleased]: https://github.com/smartsheet/project-online-import/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/smartsheet/project-online-import/releases/tag/v1.0.0
