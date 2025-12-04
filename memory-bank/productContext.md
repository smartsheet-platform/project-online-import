# Product Context: Project Online to Smartsheet ETL

## Project Overview
A command-line ETL tool for migrating Microsoft Project Online data to Smartsheet, designed to support Professional Services teams in onboarding new customers as Project Online reaches end-of-life.

## Business Context
- **Driver**: Microsoft Project Online is going EOL
- **Target Users**: Smartsheet Professional Services team
- **Use Case**: Repeatable customer onboarding and data migration
- **Value Proposition**: Quick, reliable migration from Project Online to Smartsheet

## Technical Scope
- **Language**: TypeScript/Node.js
- **Extract**: Project Online oData API
- **Transform**: Application business logic
- **Load**: Smartsheet SDK for Node.js

## Key Requirements
1. Command-line interface for PS team use
2. Configuration via .env file (git-ignored for security)
3. Robust API handling (auth, pagination, timeouts, backoff)
4. Development-friendly control flow (incremental testing)
5. Production-ready recursive data extraction
6. Proper error handling and logging

## Success Criteria
- Repeatable migration process
- Fast development iteration cycle
- Reliable production data extraction
- Clear logging and progress tracking
- Professional Services team can operate independently