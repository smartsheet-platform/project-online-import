# Atlassian MCP Server Setup Guide for Zscaler Environments

The Agentic SDLC optionally reads and writes to a team's Jira board. 

This guide provides step-by-step instructions for setting up the Atlassian MCP (Model Context Protocol) server to integrate Jira and Confluence with Roo in the Smartsheet environment with Zscaler SSL inspection.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install Container Runtime](#install-container-runtime)
3. [Export Zscaler Certificate](#export-zscaler-certificate)
4. [Generate Atlassian API Tokens](#generate-atlassian-api-tokens)
5. [Configure MCP Server](#configure-mcp-server)
6. [Verify Installation](#verify-installation)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- VSCode or JetBrains IDE with Roo Code extension installed
- Access to Smartsheet Jira (smartsheet.atlassian.net)
- Access to Smartsheet Confluence (smar-wiki.atlassian.net)

---

## Install Container Runtime

The Atlassian MCP server requires a container runtime (Podman or Docker) to properly handle SSL certificate installation in Zscaler environments.

### Option 1: Podman (Recommended for Linux/macOS)

#### macOS
**Check if Podman is installed:**
```bash
podman --version
```

**If not installed, install Podman:**
```bash
brew install podman
```

**Initialize Podman machine (first time only):**
```bash
podman machine init
podman machine start
```

#### Ubuntu WSL
**Install Podman:**
```bash
sudo apt update
sudo apt install -y podman
```

#### Amazon Linux EC2
**Install Podman:**
```bash
sudo yum update -y
sudo yum install -y podman
```

**Verify Podman is working (All Platforms):**
```bash
podman ps
```
Expected: Empty list (no error messages)

### Option 2: Docker Desktop (Recommended for Windows)

#### Windows 11
**Check if Docker is installed:**
```cmd
docker --version
```

**If not installed:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run the installer as Administrator
3. Enable WSL 2 integration when prompted
4. Restart your computer after installation
5. Launch Docker Desktop and wait for it to start

**Verify Docker is working:**
```cmd
docker ps
```

#### macOS/Linux
**Check if Docker is installed:**
```bash
docker --version
```

**If not installed:**
- **macOS**: Download Docker Desktop from https://www.docker.com/products/docker-desktop
- **Ubuntu**:
  ```bash
  sudo apt update
  sudo apt install -y docker.io
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  # Log out and back in for group changes to take effect
  ```
- **Amazon Linux EC2**:
  ```bash
  sudo yum update -y
  sudo yum install -y docker
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker ec2-user
  # Log out and back in for group changes to take effect
  ```

After installation, ensure Docker is running and accessible.

---

## Export Zscaler Certificate

The Zscaler root certificate must be exported and mounted into the MCP container. Choose the method that matches your operating system:

### Step 1: Create Certificate Directory

**All Platforms:**
```bash
mkdir -p ~/.zscaler
```

### Step 2: Export Certificate (Platform-Specific)

#### Option A: macOS (Original Method)

```bash
security find-certificate -a -c "Zscaler" -p /Library/Keychains/System.keychain > ~/.zscaler/ZscalerRootCA.pem
```

#### Option B: Windows 11

**Method 1: PowerShell (Recommended)**
```powershell
# Open PowerShell as Administrator and run:
$cert = Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like "*Zscaler*"}
if ($cert) {
    $certPath = "$env:USERPROFILE\.zscaler\ZscalerRootCA.pem"
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.zscaler"
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certBase64 = [System.Convert]::ToBase64String($certBytes)
    $certPem = "-----BEGIN CERTIFICATE-----`n"
    for ($i = 0; $i -lt $certBase64.Length; $i += 64) {
        $line = $certBase64.Substring($i, [Math]::Min(64, $certBase64.Length - $i))
        $certPem += "$line`n"
    }
    $certPem += "-----END CERTIFICATE-----"
    $certPem | Out-File -FilePath $certPath -Encoding ASCII
    Write-Host "Certificate exported to: $certPath"
} else {
    Write-Host "Zscaler certificate not found in LocalMachine\Root store"
}
```

**Method 2: Manual Export via Certificate Manager**
1. Press `Win + R`, type `certmgr.msc`, press Enter
2. Navigate to `Certificates - Local Computer` → `Trusted Root Certification Authorities` → `Certificates`
3. Find the Zscaler certificate (look for "Zscaler" in the "Issued By" column)
4. Right-click the certificate → `All Tasks` → `Export...`
5. Choose `Base-64 encoded X.509 (.CER)` format
6. Save as `%USERPROFILE%\.zscaler\ZscalerRootCA.pem`

**Method 3: WSL/Git Bash**
```bash
# If using WSL or Git Bash on Windows
mkdir -p ~/.zscaler
# Copy the certificate from Windows certificate store
powershell.exe -Command "Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {\$_.Subject -like '*Zscaler*'} | ForEach-Object { \$_.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert) | Set-Content -Path '\$env:USERPROFILE\.zscaler\ZscalerRootCA.cer' -Encoding Byte }"
# Convert to PEM format
openssl x509 -inform DER -in ~/.zscaler/ZscalerRootCA.cer -out ~/.zscaler/ZscalerRootCA.pem
```

#### Option C: Ubuntu WSL

**Method 1: From Windows Host (Recommended)**
```bash
# Create directory
mkdir -p ~/.zscaler

# Copy certificate from Windows host
cp /mnt/c/Users/$USER/.zscaler/ZscalerRootCA.pem ~/.zscaler/ZscalerRootCA.pem 2>/dev/null || {
    echo "Certificate not found in Windows user directory. Trying alternative methods..."
    
    # Alternative: Extract from Windows certificate store via PowerShell
    powershell.exe -Command "Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {\$_.Subject -like '*Zscaler*'} | Select-Object -First 1 | ForEach-Object { [System.Convert]::ToBase64String(\$_.RawData) }" | sed 's/\r$//' | fold -w 64 | sed '1i-----BEGIN CERTIFICATE-----' | sed '$a-----END CERTIFICATE-----' > ~/.zscaler/ZscalerRootCA.pem
}
```

**Method 2: Manual Browser Export**
1. Open a browser and navigate to any HTTPS site
2. Click the lock icon → `Certificate` → `Details` → `Copy to File`
3. Export as Base-64 encoded X.509 (.CER)
4. Save to Windows, then copy to WSL:
```bash
cp /mnt/c/path/to/exported/cert.cer ~/.zscaler/ZscalerRootCA.pem
```

#### Option D: Amazon Linux EC2

**Method 1: Download from Zscaler Admin Portal (Recommended)**
```bash
# Create directory
mkdir -p ~/.zscaler

# If you have access to Zscaler admin portal, download the root CA
# Otherwise, use one of the methods below
```

**Method 2: Extract from Browser**
```bash
# Install required tools
sudo yum update -y
sudo yum install -y openssl

# Create directory
mkdir -p ~/.zscaler

# Method 2a: If you can access a Zscaler-intercepted HTTPS site
echo | openssl s_client -servername google.com -connect google.com:443 2>/dev/null | openssl x509 -outform PEM > ~/.zscaler/temp_cert.pem

# Check if this is the Zscaler certificate
if openssl x509 -in ~/.zscaler/temp_cert.pem -text -noout | grep -i "zscaler"; then
    mv ~/.zscaler/temp_cert.pem ~/.zscaler/ZscalerRootCA.pem
    echo "Zscaler certificate extracted successfully"
else
    rm ~/.zscaler/temp_cert.pem
    echo "Certificate extracted is not from Zscaler. Try alternative method."
fi
```

**Method 3: From Corporate IT**
```bash
# Contact your IT department to provide the Zscaler root certificate
# They can provide it as a .pem or .crt file
# Copy it to ~/.zscaler/ZscalerRootCA.pem
```

### Step 3: Verify Certificate Export

**All Platforms:**
```bash
ls -lh ~/.zscaler/ZscalerRootCA.pem
```

Expected output: A file approximately 1.7K in size

```bash
head -3 ~/.zscaler/ZscalerRootCA.pem
```

Expected output:
```
-----BEGIN CERTIFICATE-----
MIIE0zCCA7ugAwIBAgIJANu+mC2Jt3uTMA0GCSqGSIb3DQEBCwUAMIGhMQswCQYD
...
```

**Verify certificate details:**
```bash
openssl x509 -in ~/.zscaler/ZscalerRootCA.pem -text -noout | grep -E "(Subject|Issuer)"
```

Expected output should contain "Zscaler" in the Subject or Issuer field.

---

## Generate Atlassian API Token

You need one API token that will work for both Jira and Confluence.

### Generate Your API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Name: `Roo MCP Access`
4. Click **Create**
5. **Copy the token immediately** (you won't be able to see it again)
6. Save it securely (you'll need it in the next section)

**Note:** This single token works for both Jira and Confluence services.

---

## Configure MCP Server

### Step 1: Locate MCP Configuration File

**Per-Project Configuration (Recommended)**

This guide uses per-project configuration, which stores MCP settings in your workspace's `.roo/mcp.json` file. This approach:
- Keeps configuration with your project
- Prevents conflicts between different projects
- Makes it easy to share configuration with team members
- Allows different projects to use different Atlassian instances

The configuration file is located at:
```bash
.roo/mcp.json
```
(relative to your project root directory)

**Note:** Global configuration is NOT recommended as it can cause conflicts between projects.

### Step 2: Create Backup

**All Platforms:**
```bash
# Create .roo directory if it doesn't exist
mkdir -p .roo

# Backup existing settings if present
cp .roo/mcp.json .roo/mcp.json.backup 2>/dev/null || true
```

### Step 3: Update Configuration (Platform-Specific)

**Important:** All configurations use the standard MCP settings format with `mcpServers` for per-project configuration.

Choose the configuration that matches your platform and container runtime:

#### macOS with Podman (Recommended)

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "podman",
      "args": [
        "run",
        "-i",
        "--rm",
        "--user",
        "root",
        "-v",
        "/Users/YOUR_USERNAME/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
        "-e",
        "CONFLUENCE_URL=https://smar-wiki.atlassian.net/wiki",
        "-e",
        "CONFLUENCE_USERNAME=<fname.lastname>@smartsheet.com",
        "-e",
        "CONFLUENCE_API_TOKEN=<token>",
        "-e",
        "JIRA_URL=https://smartsheet.atlassian.net",
        "-e",
        "JIRA_USERNAME=<fname.lname>@smartsheet.com",
        "-e",
        "JIRA_API_TOKEN=<token>",
        "-e",
        "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt",
        "--entrypoint",
        "sh",
        "ghcr.io/sooperset/mcp-atlassian:latest",
        "-c",
        "update-ca-certificates && su app -c 'mcp-atlassian'"
      ]
    }
  }
}
```

#### Windows 11 with Docker Desktop

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--user",
        "root",
        "-v",
        "C:/Users/YOUR_USERNAME/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
        "--entrypoint",
        "sh",
        "ghcr.io/sooperset/mcp-atlassian@sha256:27c8e5b890e16134a443f49683eaa794fdb48ed5bef785c1b4c88a0cd729df56",
        "-c",
        "update-ca-certificates && exec su app -c 'node /app/build/index.js'"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "your.email@smartsheet.com",
        "JIRA_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "NODE_EXTRA_CA_CERTS": "/etc/ssl/certs/ca-certificates.crt"
      }
    }
  }
}
```

#### Ubuntu WSL with Docker

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--user",
        "root",
        "-v",
        "/home/YOUR_USERNAME/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
        "--entrypoint",
        "sh",
        "ghcr.io/sooperset/mcp-atlassian@sha256:27c8e5b890e16134a443f49683eaa794fdb48ed5bef785c1b4c88a0cd729df56",
        "-c",
        "update-ca-certificates && exec su app -c 'node /app/build/index.js'"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "your.email@smartsheet.com",
        "JIRA_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "NODE_EXTRA_CA_CERTS": "/etc/ssl/certs/ca-certificates.crt"
      }
    }
  }
}
```

#### Amazon Linux EC2 with Docker

**Note:** Amazon Linux EC2 instances typically don't require Zscaler certificates. Use the simpler configuration without certificate mounting:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/sooperset/mcp-atlassian@sha256:27c8e5b890e16134a443f49683eaa794fdb48ed5bef785c1b4c88a0cd729df56"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "your.email@smartsheet.com",
        "JIRA_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE"
      }
    }
  }
}
```

**If your EC2 instance is behind Zscaler** (rare), use this configuration instead:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--user",
        "root",
        "-v",
        "/home/ec2-user/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
        "--entrypoint",
        "sh",
        "ghcr.io/sooperset/mcp-atlassian@sha256:27c8e5b890e16134a443f49683eaa794fdb48ed5bef785c1b4c88a0cd729df56",
        "-c",
        "update-ca-certificates && exec su app -c 'node /app/build/index.js'"
      ],
      "env": {
        "CONFLUENCE_URL": "https://smar-wiki.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@smartsheet.com",
        "CONFLUENCE_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "JIRA_URL": "https://smartsheet.atlassian.net",
        "JIRA_USERNAME": "your.email@smartsheet.com",
        "JIRA_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN_HERE",
        "NODE_EXTRA_CA_CERTS": "/etc/ssl/certs/ca-certificates.crt"
      }
    }
  }
}
```

### Step 4: Customize Configuration

Replace the following placeholders:

1. **YOUR_USERNAME**: Your macOS username (run `whoami` in terminal to find it)
2. **your.email@smartsheet.com**: Your Smartsheet email address (appears in 4 places)
3. **YOUR_ATLASSIAN_API_TOKEN_HERE**: The Atlassian API token you generated (use the same token in both places)

**Quick command to get your full certificate path:**

```bash
echo "/Users/$(whoami)/.zscaler/ZscalerRootCA.pem"
```

Use this full path in the `-v` argument.

---

## Verify Installation

### Step 1: Test Container and Certificate

Verify the container can access the certificate and update the trust store:

```bash
podman run --rm --user root -v ~/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro --entrypoint sh ghcr.io/sooperset/mcp-atlassian:latest -c "update-ca-certificates && ls -la /etc/ssl/certs/ | grep -i zscaler && echo 'Certificate installed successfully'"
```

Expected output:
```
✅ Certificate installed successfully
```

### Step 2: Test Jira Connectivity (Optional but Recommended)

Create a test script to verify Jira API access from the container:

```bash
cat > /tmp/test_jira_connection.sh << 'EOF'
#!/bin/bash

JIRA_URL="https://smartsheet.atlassian.net"
JIRA_USERNAME="your.email@smartsheet.com"
JIRA_API_TOKEN="YOUR_JIRA_API_TOKEN"

podman run --rm --user root \
  -v ~/.zscaler/ZscalerRootCA.pem:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro \
  -e "JIRA_URL=$JIRA_URL" \
  -e "JIRA_USERNAME=$JIRA_USERNAME" \
  -e "JIRA_API_TOKEN=$JIRA_API_TOKEN" \
  -e "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt" \
  --entrypoint sh \
  ghcr.io/sooperset/mcp-atlassian:latest \
  -c 'update-ca-certificates >/dev/null 2>&1 && su app -c "python3 -c \"
import requests
from requests.auth import HTTPBasicAuth
import os

jira_url = os.environ.get('"'"'JIRA_URL'"'"')
username = os.environ.get('"'"'JIRA_USERNAME'"'"')
api_token = os.environ.get('"'"'JIRA_API_TOKEN'"'"')

print('"'"'Testing Jira API connectivity...'"'"')
auth = HTTPBasicAuth(username, api_token)
response = requests.get(f'"'"'{jira_url}/rest/api/3/myself'"'"', auth=auth)

if response.status_code == 200:
    user = response.json()
    print(f'"'"'✅ SUCCESS: Connected to Jira as {user.get(\\\"displayName\\\")}'"'"')
else:
    print(f'"'"'❌ FAILED: Status {response.status_code}'"'"')
\""'
EOF

chmod +x /tmp/test_jira_connection.sh
```

**Update the script with your credentials and run:**

```bash
/tmp/test_jira_connection.sh
```

Expected output:
```
Testing Jira API connectivity...
✅ SUCCESS: Connected to Jira as Your Name
```

### Step 3: Activate MCP Server in VSCode

1. **Reload VSCode:**
   - Press `Cmd + Shift + P`
   - Type: `Developer: Reload Window`
   - Press Enter

2. **Wait for MCP server to start** (this may take 30-60 seconds on first run as it pulls the container image)

3. **Verify MCP server is running:**
   - Open Roo Code
   - The Atlassian MCP server should appear in the available servers list
   - Look for "atlassian" in the MCP servers section

### Step 4: Test End-to-End Integration

Once VSCode is reloaded, test the integration by asking Roo:

```
Search for issues in the SA project assigned to me
```

Or:

```
What are the most recent Jira issues in the SA project?
```

**Expected behavior:**
- Roo should use the `jira_search` tool from the Atlassian MCP server
- You should see actual Jira issue results
- No SSL certificate errors should appear

### Step 5: Verify Available Tools

You can check which Jira/Confluence tools are available by asking Roo:

```
What Jira and Confluence tools do you have available?
```

Expected tools include:
- `jira_search` - Search Jira issues using JQL
- `jira_get_issue` - Get detailed issue information
- `jira_create_issue` - Create new issues
- `jira_update_issue` - Update existing issues
- `jira_get_all_projects` - List accessible projects
- `confluence_search` - Search Confluence content
- `confluence_get_page` - Get specific pages
- And many more...

---

## Troubleshooting

### MCP Server Not Starting

**Check container runtime:**

```bash
# For Podman
podman ps

# For Docker
docker ps
```

**Check VSCode Output panel:**
- Open VSCode Output panel (View → Output)
- Select "Roo Code" from the dropdown
- Look for MCP server error messages

### SSL Certificate Errors

**Verify certificate is valid:**

```bash
openssl x509 -in ~/.zscaler/ZscalerRootCA.pem -text -noout | head -20
```

**Re-export certificate if needed:**

```bash
rm ~/.zscaler/ZscalerRootCA.pem
security find-certificate -a -c "Zscaler" -p /Library/Keychains/System.keychain > ~/.zscaler/ZscalerRootCA.pem
```

### Authentication Failures

**Verify API tokens are correct:**

1. Check that tokens haven't expired
2. Regenerate tokens if needed
3. Ensure no extra spaces in the configuration
4. Verify email address is correct

**Test authentication directly:**

```bash
curl -u "your.email@smartsheet.com:YOUR_API_TOKEN" \
  -H "Accept: application/json" \
  https://smartsheet.atlassian.net/rest/api/3/myself
```

Expected: JSON response with your user information

### Container Image Pull Failures

**For Podman behind Zscaler:**

```bash
# Pull the image manually
podman pull ghcr.io/sooperset/mcp-atlassian:latest
```

If this fails with SSL errors, you may need to configure Podman to use system certificates.

### MCP Server Crashes on Startup

**Check container logs:**

```bash
# For Podman
podman logs $(podman ps -q --filter ancestor=ghcr.io/sooperset/mcp-atlassian)

# For Docker  
docker logs $(docker ps -q --filter ancestor=ghcr.io/sooperset/mcp-atlassian)
```

### Permission Denied Errors

**Verify certificate file permissions:**

```bash
ls -la ~/.zscaler/ZscalerRootCA.pem
```

Should be readable (at least `-rw-r--r--`)

**Fix permissions if needed:**

```bash
chmod 644 ~/.zscaler/ZscalerRootCA.pem
```

---

## Additional Notes

### Per-Project vs Global Installation

This guide uses **per-project configuration** (`.roo/mcp.json`) which is the recommended approach because:

**Benefits of Per-Project Configuration:**
- Each project has its own MCP configuration
- No conflicts between projects using different Atlassian instances
- Configuration can be version controlled (without sensitive tokens)
- Easy to share setup with team members
- Different projects can use different container runtimes or settings

**Note:** Global configuration is NOT recommended as it can cause conflicts between projects.

### Why Container Runtime is Required

In Zscaler SSL inspection environments, the SSL certificate must be installed in the system trust store before Python's `requests` library can verify HTTPS connections. The uvx approach (running Python directly) cannot properly integrate the Zscaler certificate into the SSL chain.

The container approach:
1. Mounts the Zscaler certificate into the container
2. Runs `update-ca-certificates` to add it to the system trust store
3. Ensures Python's `requests` library uses the updated certificate bundle
4. Provides consistent, reproducible SSL configuration

### Security Considerations

- API tokens are stored in the MCP settings file (`.roo/mcp.json`)
- **Important:** Add `.roo/mcp.json` to `.gitignore` if it contains sensitive tokens
- Alternatively, use environment variables or a secrets manager for tokens
- Tokens should be rotated regularly (every 90 days recommended)
- Certificate is stored in `~/.zscaler/` directory which is hidden from normal view
- Never commit API tokens to version control

### Performance Notes

- First container start may take 30-60 seconds (image pull)
- Subsequent starts are faster (image is cached)
- Each Roo session starts a new container instance
- Container is automatically cleaned up when Roo closes (`--rm` flag)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [MCP Atlassian GitHub repository](https://github.com/sooperset/mcp-atlassian) for known issues
2. Review VSCode Output panel for detailed error messages
3. Ask for help in the appropriate Smartsheet Slack channels
4. Consult with IT for Zscaler certificate or network issues

---

## Version History

- **v1.0** (2025-10-31): Initial documentation for Podman/Docker setup with Zscaler support