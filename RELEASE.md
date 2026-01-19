# Release Guide

This document provides step-by-step instructions for releasing this project (Smartsheet internal use only).

## Prerequisites

- [ ] You have push access to the Smartsheet GitHub organization
- [ ] You are a Smartsheet team member with access to private repositories
- [ ] All tests pass locally: `npm test`
- [ ] Code builds successfully: `npm run build`
- [ ] Branch `feat/open-source` is ready for release

---

## Step 1: Create Private GitHub Repository

### 1.1 Create Repository on GitHub

1. Go to: https://github.com/organizations/smartsheet/repositories/new
2. Repository details:
   - **Name:** `project-online-import`
   - **Description:** "CLI tool for importing Project Online data to Smartsheet (Smartsheet internal)"
   - **Visibility:** ⚠️ **Private** (Smartsheet teams only)
   - **Initialize:** Do NOT add README, .gitignore, or license (we already have them)
3. Click "Create repository"

### 1.2 Push Code to GitHub

From your local repository:

```bash
# Add GitHub as remote
git remote add github git@github.com:smartsheet/project-online-import.git

# OR if using HTTPS:
# git remote add github https://github.com/smar-shikhar-krishna/project-online-import.git

# Push the feat/open-source branch
git push github feat/open-source:main

# Push all tags (if any exist)
git push github --tags
```

### 1.3 Configure Repository Settings

1. **Branch Protection** (Settings → Branches → Add rule - Optional):
   - Branch name pattern: `main`
   - ✅ Require pull request reviews before merging

2. **Add Topics** (Repository homepage → About → Settings):
   - `project-online`, `smartsheet`, `cli`, `etl`, `migration`, `typescript`, `internal`

3. **Configure Access** (Settings → Collaborators and teams):
   - Add relevant Smartsheet teams with appropriate permissions
   - Typically: `smartsheet/engineering` with Write access

---

## Step 2: Create Initial Release (v1.0.0)

### 2.1 Verify Package is Ready

```bash
# From project root
npm run typecheck
npm run lint
npm run format:check
npm run test:unit

# Test package creation
npm pack --dry-run

# Create tarball for distribution
npm pack
```

### 2.2 Tag Release

```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial release (Smartsheet internal)

Features:
- Project Online to Smartsheet import via CLI
- Device Code Flow authentication
- Hierarchical task import
- Resource and assignment mapping
- PMO Standards workspace pattern
- Template-based workspace creation

See CHANGELOG.md for full details."

# Push tag to GitHub
git push github v1.0.0
```

### 2.3 Create GitHub Release (with Tarball Attachment)

1. Go to: https://github.com/smar-shikhar-krishna/project-online-import/releases/new
2. Select tag: `v1.0.0`
3. Release title: `v1.0.0 - Initial Release (Internal)`
4. Description:
```markdown
## 🎉 Initial Release (Smartsheet Internal)

First release of the Project Online to Smartsheet Import Tool for Smartsheet teams.

### ✨ Features

#### Core Functionality
- Import Project Online projects to Smartsheet via CLI
- OAuth 2.0 authentication with Device Code Flow
- Hierarchical task structure preservation
- Resource and assignment mapping (Work, Material, Cost)
- PMO Standards workspace for centralized reference data

#### Data Mapping
- Project metadata (name, owner, dates, status, priority)
- Tasks with full hierarchy and dependencies
- Task constraints (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO)
- Resource assignments with multi-contact lists
- Critical path fields (Late Start, Late Finish, Total Slack, Free Slack)

#### Reliability
- Exponential backoff retry logic
- Rate limiting (300 req/min default)
- Re-run resilience (idempotent operations)
- Template-based workspace creation
- Comprehensive error handling

### 📦 Installation (Smartsheet Teams)

**Option 1: Install from GitHub release**
```bash
# Download the tarball from this release
npm install -g ./project-online-import-1.0.0.tgz
```

**Option 2: Install directly from GitHub**
```bash
npm install -g git+https://github.com/smar-shikhar-krishna/project-online-import.git#v1.0.0
```

**Option 3: Clone and build locally**
```bash
git clone https://github.com/smar-shikhar-krishna/project-online-import.git
cd project-online-import
git checkout v1.0.0
npm install
npm run build
npm link  # Makes CLI globally available
```

### 📖 Documentation

- [README.md](README.md) - Getting started
- [CLI Usage Guide](README.md#usage)
- [Authentication Setup](README.md#configuration)

### 🐛 Known Limitations

- Portfolio solution type not yet implemented
- Custom fields not currently mapped
- Requires manual Azure AD app registration

### 🙏 Contributing

Smartsheet team members: See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

**⚠️ Internal Use Only:** This tool is intended for Smartsheet teams. Access requires Smartsheet GitHub organization membership.
```

5. **Attach tarball:** Upload `project-online-import-1.0.0.tgz` (already created)
6. Click "Publish release"

---

## Step 3: Distribution to Smartsheet Teams

### Method A: GitHub Release (Recommended)

Team members download from releases page:
```bash
# Go to: https://github.com/smar-shikhar-krishna/project-online-import/releases/latest
# Download: project-online-import-1.0.0.tgz
npm install -g ./project-online-import-1.0.0.tgz
```

### Method B: Direct Git Installation

Team members install from git:
```bash
npm install -g git+https://github.com/smar-shikhar-krishna/project-online-import.git
```

### Method C: Clone and Build

For development:
```bash
git clone git@github.com:smartsheet/project-online-import.git
cd project-online-import
npm install
npm run build
npm link
```

---

## Version Management

### Creating New Releases

```bash
# Update version in package.json
npm version patch  # 1.0.0 → 1.0.1 (bug fixes)
npm version minor  # 1.0.0 → 1.1.0 (new features)
npm version major  # 1.0.0 → 2.0.0 (breaking changes)

# This creates a git tag automatically
git push github main
git push github --tags

# Build and package
npm run build
npm pack

# Create GitHub release with tarball attached
```

---

## Post-Release Checklist

### Immediate
- [ ] Test installation from GitHub release tarball
- [ ] Test git-based installation
- [ ] Update internal wiki/documentation with installation instructions

### Communication
- [ ] Notify relevant Smartsheet teams via Slack/email
- [ ] Share installation instructions
- [ ] Provide link to GitHub repository
- [ ] Document any prerequisites (Azure AD app registration, Smartsheet API token)

### Maintenance
- [ ] Monitor GitHub issues (internal team members only)
- [ ] Review and merge pull requests
- [ ] Update documentation based on feedback

---

## Security Considerations

### Repository Access
- ✅ Repository is private (Smartsheet organization members only)
- ✅ No public npm distribution
- ✅ Requires GitHub authentication for all access

### Credentials in Tests
- ⚠️ `.env.test` contains dummy credentials (safe for private repo)
- ✅ `.gitignore` excludes `.env` and `.env.local`
- ✅ No real credentials committed to history

### Distribution
- ✅ Tarball distribution via GitHub releases (authenticated access)
- ✅ Git installation requires repository access
- ✅ No public download links

---

## Troubleshooting

### "Repository not found" during installation

**Cause:** User doesn't have access to private repository

**Solution:**
1. Verify user is member of Smartsheet GitHub organization
2. User must authenticate with GitHub:
   ```bash
   # Configure git credentials
   git config --global credential.helper store

   # Or use SSH keys
   ssh-keygen -t ed25519 -C "your.email@smartsheet.com"
   # Add to GitHub: Settings → SSH keys
   ```

### Installing from private GitHub repo

Team members need to authenticate:

**Via HTTPS:**
```bash
# Create Personal Access Token at https://github.com/settings/tokens
# Scopes: repo (all)

npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN
npm install git+https://github.com/smar-shikhar-krishna/project-online-import.git
```

**Via SSH (easier):**
```bash
# Use SSH URL instead
npm install git+ssh://git@github.com/smar-shikhar-krishna/project-online-import.git
```

---

## Alternative: Internal npm Registry (Future)

If Smartsheet sets up an internal npm registry (Artifactory/Verdaccio), migration path:

1. Add to `package.json`:
```json
{
  "publishConfig": {
    "registry": "https://npm.internal.smartsheet.com"
  }
}
```

2. Publish to internal registry:
```bash
npm publish
```

3. Team installation becomes simpler:
```bash
npm install -g project-online-import
```

---

## Checklist Before Release

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] No sensitive data in code or configs
- [ ] CHANGELOG.md updated
- [ ] README.md reviewed for private repo context
- [ ] `package.json` has `"private": true`
- [ ] GitHub repository created (PRIVATE)
- [ ] Package builds correctly: `npm pack`
- [ ] Version tagged: `git tag -a v1.0.0 -m "Release v1.0.0"`
- [ ] Code pushed to GitHub (private repo)
- [ ] GitHub release created with tarball attached
- [ ] Installation tested by team member
