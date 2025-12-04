# Atlassian MCP Server Setup Scripts

This directory contains automated setup scripts to configure the Atlassian MCP server for Roo Code integration with Jira and Confluence in Zscaler environments.

## Quick Start

### Linux/macOS/WSL
```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/your-repo/setup-atlassian-mcp-linux.sh
chmod +x setup-atlassian-mcp-linux.sh
./setup-atlassian-mcp-linux.sh
```

### Windows
```powershell
# Download and run the setup script (Run PowerShell as Administrator)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/your-repo/setup-atlassian-mcp-windows.ps1" -OutFile "setup-atlassian-mcp-windows.ps1"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-atlassian-mcp-windows.ps1
```

## What These Scripts Do

Both scripts automate the complete setup process described in [`ATLASSIAN_MCP.md`](ATLASSIAN_MCP.md):

1. **Install Container Runtime**
   - Linux/macOS: Installs Podman (recommended) or uses existing Docker
   - Windows: Guides Docker Desktop installation and verification

2. **Export Zscaler Certificate**
   - Automatically detects and exports the Zscaler root certificate
   - Handles platform-specific certificate stores and formats
   - Validates certificate format and content

3. **Collect User Credentials**
   - Prompts for Smartsheet email address
   - Securely collects Atlassian API token
   - Validates email format and token presence

4. **Configure MCP Server**
   - Creates proper MCP configuration file for your platform
   - Sets up container volume mounts for certificate
   - Configures environment variables for Jira and Confluence

5. **Test Installation**
   - Verifies certificate installation in container
   - Tests Jira API connectivity
   - Validates end-to-end functionality

## Prerequisites

### All Platforms
- VSCode with Roo Code extension installed
- Access to Smartsheet Jira (smartsheet.atlassian.net)
- Access to Smartsheet Confluence (smar-wiki.atlassian.net)
- Zscaler certificate installed on your system
- Atlassian API token (script will guide you to create one)

### Linux/macOS Specific
- Bash shell
- `curl` or `wget` for downloading
- `openssl` for certificate validation
- Homebrew (macOS) for Podman installation
- `sudo` access for package installation

### Windows Specific
- PowerShell 5.1 or later
- Administrator privileges (recommended)
- Internet access for Docker Desktop download

## Supported Platforms

### ✅ Fully Supported
- **macOS** (Intel and Apple Silicon)
- **Ubuntu 20.04+ / WSL2**
- **Amazon Linux 2/2023**
- **Windows 11** with Docker Desktop

### ⚠️ Partially Supported
- **Other Linux distributions** (manual container runtime installation may be required)
- **Windows 10** (Docker Desktop compatibility varies)

## Script Options

### Linux/macOS Script (`setup-atlassian-mcp-linux.sh`)

```bash
./setup-atlassian-mcp-linux.sh [OPTIONS]

# The script runs interactively by default
# No command-line options currently supported
```

**Environment Variables:**
- `CONTAINER_CMD`: Force specific container runtime (`podman` or `docker`)
- `SKIP_TESTS`: Skip connectivity tests (`true`/`false`)

### Windows Script (`setup-atlassian-mcp-windows.ps1`)

```powershell
.\setup-atlassian-mcp-windows.ps1 [OPTIONS]

OPTIONS:
  -SkipDockerInstall    Skip Docker Desktop installation check
  -Force               Overwrite existing certificate and configuration
  -Email <email>       Pre-specify Smartsheet email address
  -ApiToken <token>    Pre-specify Atlassian API token
  -Help                Show help information
```

**Examples:**
```powershell
# Interactive setup
.\setup-atlassian-mcp-windows.ps1

# Pre-specify email
.\setup-atlassian-mcp-windows.ps1 -Email "john.doe@smartsheet.com"

# Force overwrite existing configuration
.\setup-atlassian-mcp-windows.ps1 -Force

# Skip Docker installation check
.\setup-atlassian-mcp-windows.ps1 -SkipDockerInstall
```

## Troubleshooting

### Common Issues

#### 1. Certificate Export Failures

**Linux/macOS:**
```bash
# Manual certificate export
security find-certificate -a -c "Zscaler" -p /Library/Keychains/System.keychain > ~/.zscaler/ZscalerRootCA.pem

# Verify certificate
openssl x509 -in ~/.zscaler/ZscalerRootCA.pem -text -noout | grep -i zscaler
```

**Windows:**
```powershell
# Check certificate stores
Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like "*Zscaler*"}
Get-ChildItem -Path Cert:\CurrentUser\Root | Where-Object {$_.Subject -like "*Zscaler*"}
```

#### 2. Container Runtime Issues

**Podman not starting (macOS):**
```bash
podman machine stop
podman machine rm
podman machine init
podman machine start
```

**Docker not running (Windows):**
- Ensure Docker Desktop is installed and running
- Check Windows features: Hyper-V, WSL2
- Restart Docker Desktop service

#### 3. Permission Errors

**Linux/macOS:**
```bash
# Fix certificate permissions
chmod 644 ~/.zscaler/ZscalerRootCA.pem

# Add user to docker group (if using Docker)
sudo usermod -aG docker $USER
# Log out and back in
```

**Windows:**
```powershell
# Run PowerShell as Administrator
# Or check file permissions on certificate directory
```

#### 4. Network/Connectivity Issues

**Test manual connectivity:**
```bash
# Test Jira API directly
curl -u "your.email@smartsheet.com:YOUR_API_TOKEN" \
  -H "Accept: application/json" \
  https://smartsheet.atlassian.net/rest/api/3/myself
```

### Script-Specific Debugging

#### Enable Debug Mode

**Linux/macOS:**
```bash
# Run with debug output
bash -x ./setup-atlassian-mcp-linux.sh
```

**Windows:**
```powershell
# Enable verbose output
$VerbosePreference = "Continue"
.\setup-atlassian-mcp-windows.ps1
```

#### Check Script Logs

Both scripts provide colored output indicating:
- 🔵 **[INFO]** - Informational messages
- 🟢 **[SUCCESS]** - Successful operations
- 🟡 **[WARNING]** - Non-fatal issues
- 🔴 **[ERROR]** - Fatal errors requiring attention

### Manual Verification Steps

After running the scripts, verify the setup:

1. **Check MCP Configuration:**
   ```bash
   # All platforms - check per-project configuration
   cat .roo/mcp.json
   ```

2. **Test Container Manually:**
   ```bash
   # Test certificate installation
   podman run --rm --user root -v ~/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro --entrypoint sh ghcr.io/sooperset/mcp-atlassian:latest -c "update-ca-certificates && ls -la /etc/ssl/certs/ | grep -i zscaler && echo 'Certificate installed successfully'"
   ```

3. **Restart VSCode:**
   - Close VSCode completely
   - Reopen VSCode
   - Wait 30-60 seconds for MCP server initialization
   - Check Roo Code for "atlassian" server in MCP servers list

## Security Considerations

### API Token Security
- API tokens are stored in MCP configuration files with restricted permissions
- Never commit API tokens to version control
- Rotate tokens regularly (every 90 days recommended)
- Use unique tokens per environment/user

### Certificate Security
- Zscaler certificates are stored in hidden directories (`~/.zscaler/`)
- Certificates are mounted read-only into containers
- Certificate files have restricted permissions (644)

### Container Security
- Containers run with minimal required privileges
- Containers are automatically cleaned up after use (`--rm` flag)
- No persistent data stored in containers
- Images are pulled from official registries with SHA verification

## Advanced Configuration

### Custom Container Images
To use a different MCP container image, modify the scripts:

```bash
# Linux/macOS - edit the script
CONTAINER_IMAGE="your-registry/mcp-atlassian:custom-tag"

# Windows - edit the script
$ContainerImage = "your-registry/mcp-atlassian:custom-tag"
```

### Custom Atlassian URLs
For non-Smartsheet Atlassian instances, modify the URLs:

```bash
# Linux/macOS
CONFLUENCE_URL="https://your-org.atlassian.net/wiki"
JIRA_URL="https://your-org.atlassian.net"

# Windows
$ConfluenceUrl = "https://your-org.atlassian.net/wiki"
$JiraUrl = "https://your-org.atlassian.net"
```

### Proxy Configuration
For environments requiring HTTP proxies, add proxy settings to the container:

```bash
# Add to container args
"-e", "HTTP_PROXY=http://proxy.company.com:8080"
"-e", "HTTPS_PROXY=http://proxy.company.com:8080"
"-e", "NO_PROXY=localhost,127.0.0.1"
```

## Support and Contributing

### Getting Help
1. Check this documentation and [`ATLASSIAN_MCP.md`](ATLASSIAN_MCP.md)
2. Review VSCode Output panel (View → Output → Roo Code)
3. Check [MCP Atlassian GitHub repository](https://github.com/sooperset/mcp-atlassian)
4. Ask in Smartsheet Slack channels

### Contributing
To improve these scripts:
1. Test on your platform
2. Submit issues for bugs or enhancement requests
3. Contribute platform-specific improvements
4. Update documentation for new scenarios

### Version History
- **v1.0** (2025-11-12): Initial automated setup scripts
  - Linux/macOS bash script with multi-platform support
  - Windows PowerShell script with parameter support
  - Comprehensive error handling and testing
  - Automated certificate export and validation

## License

These scripts are provided as-is for Smartsheet internal use. Modify and distribute according to your organization's policies.