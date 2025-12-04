# Technology Ecosystem Knowledge

## Overview
Comprehensive knowledge base for troubleshooting across various development technology ecosystems. Used by both Roo Dev Env mode and Claude dev-env agent.

## Applies To

- ✅ Roo Mode: Dev Env mode
- ✅ Claude Agent: dev-env
---

## Python Ecosystem

### Tools
pip, pipenv, poetry, conda, pyenv, virtualenv, venv

### Frameworks
Django, Flask, FastAPI, Pyramid, Tornado

### Common Issues
- **Version conflicts** - Multiple Python versions causing conflicts
- **Virtual environment not activated** - Global vs local package confusion
- **PYTHONPATH configuration** - Module import issues
- **SSL certificate issues** - Certificate verification failures
- **Package compilation failures** - Missing system dependencies (gcc, python-dev, etc.)

### Troubleshooting Patterns
- **Environment isolation** - Use virtualenv/venv to isolate project dependencies
- **Dependency resolution** - Check requirements.txt, verify package versions
- **PATH configuration** - Verify correct Python: `which python`, `which pip`
- **Virtual environment activation** - `source venv/bin/activate` (Linux/Mac), `venv\Scripts\activate` (Windows)

---

## Node.js Ecosystem

### Tools
npm, yarn, pnpm, nvm, volta, npx

### Frameworks
React, Vue, Angular, Express, Next.js, Nest.js

### Common Issues
- **Node version conflicts** - Project requires different Node version
- **Global vs local packages** - Command not found for local packages
- **npm cache corruption** - Stale or corrupted cache causing install failures
- **Permission issues** - Avoid sudo with npm (use nvm instead)
- **Lockfile conflicts** - package-lock.json vs yarn.lock mismatches

### Troubleshooting Patterns
- **Version management** - Use nvm: `nvm use 18`, `nvm install 18`
- **Package resolution** - `npm install`, `yarn install`, clear cache first if issues
- **Clear cache** - `npm cache clean --force`, `yarn cache clean`
- **Check versions** - `node -v`, `npm -v`, verify against project requirements
- **Local package execution** - Use npx: `npx eslint` instead of global install

---

## Java Ecosystem

### Tools
Maven, Gradle, SDKMAN, javac, java, Homebrew

### Frameworks
Spring Boot, Spring MVC, Micronaut, Quarkus

### Common Issues
- **JAVA_HOME not set** - JDK not configured correctly
- **Classpath issues** - Dependencies not found at runtime
- **Version mismatches** - Java version doesn't match project requirement
- **Maven/Gradle configuration errors** - pom.xml or build.gradle issues
- **Build cache problems** - Stale compiled classes

### Troubleshooting Patterns
- **Environment variables** - Set JAVA_HOME: `export JAVA_HOME=/path/to/jdk`
- **Build tool configuration** - Verify pom.xml or build.gradle syntax
- **Dependency management** - `mvn clean install`, `gradle clean build`
- **Version checking** - `java -version`, `javac -version`, `echo $JAVA_HOME`
- **SDKMAN usage** - Install/switch versions: `sdk install java 17.0.0`, `sdk use java 17.0.0`

---

## Containerization

### Tools
Docker, Podman, Docker Compose, Kubernetes, Minikube

### Common Issues
- **Daemon not running** - Docker/Podman daemon not started
- **Permission issues** - Docker socket requires root or group membership
- **Network configuration** - Container networking conflicts or misconfig
- **Volume mounting permissions** - Host/container user ID mismatches
- **Image build failures** - Dockerfile syntax or dependency issues

### Troubleshooting Patterns
- **Service startup** - `systemctl start docker`, `brew services start docker` (Mac)
- **Permission fixes** - Add user to docker group: `sudo usermod -aG docker $USER`
- **Network debugging** - `docker network ls`, `docker network inspect`
- **Volume permissions** - Match user IDs or use named volumes
- **Build debugging** - Use `--no-cache` flag, check Dockerfile syntax

---

## Databases

### Tools
PostgreSQL, MySQL, MongoDB, Redis, SQLite

### Common Issues
- **Connection failures** - Service not running or wrong connection string
- **Authentication errors** - Wrong username, password, or auth method
- **Port conflicts** - Default port already in use by another service
- **Data directory permissions** - Database can't read/write data directory
- **Version compatibility** - Client version doesn't match server version

### Troubleshooting Patterns
- **Service management** - `systemctl status postgresql`, `brew services list`
- **Configuration files** - Check pg_hba.conf (PostgreSQL), my.cnf (MySQL)
- **Permission resolution** - `chown postgres:postgres /var/lib/postgresql`, verify permissions
- **Port checking** - `netstat -an | grep 5432`, `lsof -i :5432`
- **Connection testing** - `psql -h localhost -U user -d dbname`, verify connection params

---

## Cloud Services

### Tools
AWS CLI, Azure CLI, GCP CLI (gcloud), Terraform, kubectl

### Common Issues
- **Authentication** - Credentials not configured or expired
- **Region configuration** - Wrong default region set
- **Permission policies** - IAM/RBAC permissions insufficient
- **CLI not installed** - Tools not available or not in PATH
- **Profile configuration** - Wrong profile selected or misconfigured

### Troubleshooting Patterns
- **Credential setup** - `aws configure`, `gcloud auth login`, `az login`
- **Profile configuration** - Check ~/.aws/credentials, ~/.config/gcloud
- **Policy debugging** - `aws iam get-user`, `kubectl auth can-i`
- **Region verification** - `aws configure get region`, `gcloud config get-value region`
- **Installation check** - `which aws`, verify PATH includes CLI tools

---

## Version Control (Git)

### Tools
Git, GitHub CLI (gh), GitLab CLI (glab), SSH keys, GPG signing

### Common Issues
- **Authentication failures** - SSH keys not set up or token expired
- **Remote configuration** - Wrong origin URL or permissions
- **Git hooks not executing** - Permissions or path issues
- **Large File Storage (LFS)** - LFS not installed or configured
- **Merge conflicts** - Understanding and resolving conflicts

### Troubleshooting Patterns
- **Key generation** - `ssh-keygen -t ed25519 -C "email@example.com"`
- **Config setup** - Edit ~/.gitconfig, ~/.ssh/config
- **Authentication debugging** - `ssh -T git@github.com`, test connection
- **Remote management** - `git remote -v`, `git remote set-url origin`
- **Hook permissions** - `chmod +x .git/hooks/pre-commit`

---

## Web Development Tools

### Tools
Webpack, Vite, Parcel, ESLint, Prettier, TypeScript, Babel

### Frameworks
HTML/CSS/JS, SASS, PostCSS, Tailwind CSS

### Common Issues
- **Build tool configuration** - webpack.config.js, vite.config.js errors
- **Module resolution** - Can't resolve imports or dependencies
- **Asset compilation** - SASS/PostCSS compilation failures
- **TypeScript errors** - Type checking or tsconfig.json issues
- **Build performance** - Slow builds or excessive memory usage

### Troubleshooting Patterns
- **Build system debugging** - Check config files, verify loader/plugin setup
- **Module bundling** - Verify import paths, check node_modules
- **Asset pipeline** - Check file paths, verify loaders configured
- **Type checking** - Run `tsc --noEmit`, check tsconfig.json settings
- **Performance tuning** - Enable caching, use production mode, check bundle size

---

## Implementation Guidance

### For Roo Modes
Reference this document in XML rules:
```xml
<ecosystem_knowledge>
  See sdlc/shared/ecosystem-knowledge.md for comprehensive troubleshooting knowledge across:
  - Python, Node.js, Java ecosystems
  - Containerization (Docker, Podman)
  - Databases (PostgreSQL, MySQL, MongoDB, Redis)
  - Cloud services (AWS, Azure, GCP)
  - Version control (Git, GitHub, GitLab)
  - Web development tools
</ecosystem_knowledge>
```

### For Claude Agents
Reference this document in agent markdown:
```markdown
## Shared Patterns Reference

This agent follows patterns in `sdlc/shared/`:
- [Technology Ecosystem Knowledge](./ecosystem-knowledge.md)
  - Python, Node.js, Java ecosystems
  - Containerization, databases, cloud services
  - Version control and web development tools
```

---

## Updates and Maintenance

**Single Source of Truth:** This file is the definitive reference for technology ecosystem knowledge.

**When to Update:**
- New technology ecosystem added to SDLC
- New tools become standard in ecosystem
- Troubleshooting patterns evolve
- Better approaches discovered

**Impact of Updates:**
- Automatically benefits both Roo modes and Claude agents
- Ensures consistency across both systems
- Captures collective learning and improves over time