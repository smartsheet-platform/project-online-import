# Atlassian MCP Server Setup Script for Windows
# Supports: Windows 11 with Docker Desktop
# PowerShell 5.1+ required

param(
    [switch]$SkipDockerInstall,
    [switch]$Force,
    [string]$Email,
    [string]$ApiToken
)

# Configuration
$ContainerImage = "ghcr.io/sooperset/mcp-atlassian:latest"
$ZscalerCertDir = "$env:USERPROFILE\.zscaler"
$ZscalerCertPath = "$ZscalerCertDir\ZscalerRootCA.pem"

# Default Smartsheet URLs
$ConfluenceUrl = "https://smar-wiki.atlassian.net/wiki"
$JiraUrl = "https://smartsheet.atlassian.net"

# Color functions for output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Blue
    Write-Host ""
}

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to install Docker Desktop
function Install-DockerDesktop {
    Write-Header "Installing Docker Desktop"
    
    if (Test-Command "docker") {
        Write-Status "Testing existing Docker installation..."
        try {
            $dockerVersion = docker --version
            Write-Success "Docker already installed: $dockerVersion"
            
            # Test if Docker is running
            docker ps 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker is running correctly"
                return
            } else {
                Write-Warning "Docker is installed but not running. Please start Docker Desktop."
                Write-Status "Waiting for Docker to start..."
                
                # Try to start Docker Desktop
                $dockerDesktop = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
                if (-not $dockerDesktop) {
                    Write-Status "Starting Docker Desktop..."
                    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
                }
                
                # Wait for Docker to be ready
                $timeout = 60
                $elapsed = 0
                while ($elapsed -lt $timeout) {
                    Start-Sleep -Seconds 5
                    $elapsed += 5
                    try {
                        docker ps 2>$null | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Success "Docker is now running"
                            return
                        }
                    }
                    catch { }
                    Write-Status "Waiting for Docker... ($elapsed/$timeout seconds)"
                }
                
                Write-Error "Docker failed to start within $timeout seconds"
                Write-Status "Please start Docker Desktop manually and run this script again"
                exit 1
            }
        }
        catch {
            Write-Warning "Docker command failed. May need reinstallation."
        }
    }
    
    if ($SkipDockerInstall) {
        Write-Error "Docker not found and -SkipDockerInstall specified"
        exit 1
    }
    
    Write-Status "Docker not found. Installation required."
    Write-Status "Please download and install Docker Desktop from:"
    Write-Status "https://www.docker.com/products/docker-desktop"
    Write-Status ""
    Write-Status "Installation steps:"
    Write-Status "1. Download Docker Desktop for Windows"
    Write-Status "2. Run installer as Administrator"
    Write-Status "3. Enable WSL 2 integration when prompted"
    Write-Status "4. Restart computer after installation"
    Write-Status "5. Launch Docker Desktop and wait for it to start"
    Write-Status ""
    
    $response = Read-Host "Have you installed Docker Desktop? (y/N)"
    if ($response -notmatch '^[Yy]$') {
        Write-Status "Please install Docker Desktop and run this script again"
        exit 1
    }
    
    # Verify installation
    if (-not (Test-Command "docker")) {
        Write-Error "Docker command not found. Please ensure Docker Desktop is properly installed"
        exit 1
    }
    
    Write-Success "Docker installation verified"
}

# Function to export Zscaler certificate
function Export-ZscalerCertificate {
    Write-Header "Exporting Zscaler Certificate"
    
    # Create certificate directory
    if (-not (Test-Path $ZscalerCertDir)) {
        New-Item -ItemType Directory -Path $ZscalerCertDir -Force | Out-Null
        Write-Status "Created certificate directory: $ZscalerCertDir"
    }
    
    # Check if certificate already exists
    if ((Test-Path $ZscalerCertPath) -and (-not $Force)) {
        Write-Status "Certificate already exists at: $ZscalerCertPath"
        $response = Read-Host "Overwrite existing certificate? (y/N)"
        if ($response -notmatch '^[Yy]$') {
            Write-Status "Using existing certificate"
            return
        }
    }
    
    Write-Status "Searching for Zscaler certificate in Windows certificate store..."
    
    try {
        # Search for Zscaler certificate
        $cert = Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like "*Zscaler*" -or $_.Issuer -like "*Zscaler*"}
        
        if (-not $cert) {
            Write-Warning "Zscaler certificate not found in LocalMachine\Root store"
            Write-Status "Searching in CurrentUser\Root store..."
            $cert = Get-ChildItem -Path Cert:\CurrentUser\Root | Where-Object {$_.Subject -like "*Zscaler*" -or $_.Issuer -like "*Zscaler*"}
        }
        
        if ($cert) {
            if ($cert.Count -gt 1) {
                Write-Status "Multiple Zscaler certificates found, using the first one"
                $cert = $cert[0]
            }
            
            Write-Status "Found certificate: $($cert.Subject)"
            
            # Export certificate to PEM format
            $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
            $certBase64 = [System.Convert]::ToBase64String($certBytes)
            
            # Format as PEM
            $certPem = "-----BEGIN CERTIFICATE-----`n"
            for ($i = 0; $i -lt $certBase64.Length; $i += 64) {
                $line = $certBase64.Substring($i, [Math]::Min(64, $certBase64.Length - $i))
                $certPem += "$line`n"
            }
            $certPem += "-----END CERTIFICATE-----"
            
            # Save to file
            $certPem | Out-File -FilePath $ZscalerCertPath -Encoding ASCII
            Write-Success "Certificate exported to: $ZscalerCertPath"
        }
        else {
            Write-Error "Zscaler certificate not found in certificate stores"
            Write-Status "Please export the certificate manually:"
            Write-Status "1. Press Win+R, type 'certmgr.msc', press Enter"
            Write-Status "2. Navigate to Trusted Root Certification Authorities → Certificates"
            Write-Status "3. Find the Zscaler certificate"
            Write-Status "4. Right-click → All Tasks → Export..."
            Write-Status "5. Choose 'Base-64 encoded X.509 (.CER)' format"
            Write-Status "6. Save as: $ZscalerCertPath"
            
            Read-Host "Press Enter when certificate is ready"
        }
    }
    catch {
        Write-Error "Failed to access certificate store: $($_.Exception.Message)"
        Write-Status "Please run this script as Administrator or export certificate manually"
        exit 1
    }
    
    # Verify certificate file
    if (-not (Test-Path $ZscalerCertPath)) {
        Write-Error "Certificate file not found: $ZscalerCertPath"
        exit 1
    }
    
    $certContent = Get-Content $ZscalerCertPath -Raw
    if ($certContent -match "-----BEGIN CERTIFICATE-----" -and $certContent -match "-----END CERTIFICATE-----") {
        Write-Success "Certificate format verified"
    }
    else {
        Write-Error "Certificate format is invalid"
        exit 1
    }
}

# Function to get user credentials
function Get-UserCredentials {
    Write-Header "Collecting User Credentials"
    
    # Get email
    if (-not $Email) {
        do {
            $Email = Read-Host "Enter your Smartsheet email address"
            if ($Email -notmatch '^[^@]+@smartsheet\.com$') {
                Write-Warning "Please enter a valid @smartsheet.com email address"
                $Email = $null
            }
        } while (-not $Email)
    }
    
    # Get API token
    if (-not $ApiToken) {
        Write-Status ""
        Write-Status "You need an Atlassian API token. If you don't have one:"
        Write-Status "1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens"
        Write-Status "2. Click 'Create API token'"
        Write-Status "3. Name it 'Roo MCP Access'"
        Write-Status "4. Copy the token"
        Write-Status ""
        
        do {
            $ApiToken = Read-Host "Enter your Atlassian API token" -AsSecureString
            $ApiToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiToken))
            if (-not $ApiToken) {
                Write-Warning "API token cannot be empty"
            }
        } while (-not $ApiToken)
    }
    
    Write-Success "Credentials collected"
    return @{
        Email = $Email
        ApiToken = $ApiToken
    }
}

# Function to get MCP settings path
function Get-McpSettingsPath {
    # Use per-project .roo/mcp.json in the current workspace
    return ".roo\mcp.json"
}

# Function to create MCP configuration
function New-McpConfiguration {
    param(
        [string]$UserEmail,
        [string]$UserApiToken
    )
    
    Write-Header "Creating MCP Configuration"
    
    $mcpSettingsPath = Get-McpSettingsPath
    $mcpSettingsDir = Split-Path $mcpSettingsPath -Parent
    
    # Create directory if it doesn't exist
    if (-not (Test-Path $mcpSettingsDir)) {
        New-Item -ItemType Directory -Path $mcpSettingsDir -Force | Out-Null
        Write-Status "Created .roo directory"
    }
    
    # Backup existing configuration
    if (Test-Path $mcpSettingsPath) {
        $backupPath = "$mcpSettingsPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $mcpSettingsPath $backupPath
        Write-Success "Backup created: $backupPath"
    }
    
    # Create MCP configuration in standard MCP format
    Write-Status "Creating per-project MCP configuration..."
    
    $mcpConfig = @{
        mcpServers = @{
            atlassian = @{
                command = "docker"
                args = @(
                    "run",
                    "-i",
                    "--rm",
                    "--user",
                    "root",
                    "-v",
                    "$($ZscalerCertPath):/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro",
                    "-e",
                    "CONFLUENCE_URL=$ConfluenceUrl",
                    "-e",
                    "CONFLUENCE_USERNAME=$UserEmail",
                    "-e",
                    "CONFLUENCE_API_TOKEN=$UserApiToken",
                    "-e",
                    "JIRA_URL=$JiraUrl",
                    "-e",
                    "JIRA_USERNAME=$UserEmail",
                    "-e",
                    "JIRA_API_TOKEN=$UserApiToken",
                    "-e",
                    "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt",
                    "--entrypoint",
                    "sh",
                    $ContainerImage,
                    "-c",
                    "update-ca-certificates && su app -c 'mcp-atlassian'"
                )
            }
        }
    }
    
    # Convert to JSON and save
    $jsonConfig = $mcpConfig | ConvertTo-Json -Depth 10
    $jsonConfig | Out-File -FilePath $mcpSettingsPath -Encoding UTF8
    
    Write-Success "MCP configuration created at: $mcpSettingsPath"
}

# Function to test installation
function Test-Installation {
    param(
        [string]$UserEmail,
        [string]$UserApiToken
    )
    
    Write-Header "Testing Installation"
    
    # Test certificate installation in container
    Write-Status "Testing certificate installation in container..."
    try {
        $certTest = docker run --rm --user root `
            -v "$($ZscalerCertPath):/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro" `
            --entrypoint sh `
            $ContainerImage `
            -c "update-ca-certificates 2>&1 | grep -i zscaler && echo 'Certificate installed successfully'" 2>$null
        
        if ($certTest -match "Certificate installed successfully") {
            Write-Success "Certificate test passed"
        }
        else {
            Write-Warning "Certificate test failed - this may still work in practice"
        }
    }
    catch {
        Write-Warning "Certificate test failed: $($_.Exception.Message)"
    }
    
    # Test Jira connectivity
    Write-Status "Testing Jira API connectivity..."
    try {
        $jiraTest = docker run --rm --user root `
            -v "$($ZscalerCertPath):/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro" `
            -e "JIRA_URL=$JiraUrl" `
            -e "JIRA_USERNAME=$UserEmail" `
            -e "JIRA_API_TOKEN=$UserApiToken" `
            -e "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt" `
            --entrypoint sh `
            $ContainerImage `
            -c 'update-ca-certificates >/dev/null 2>&1 && su app -c "python3 -c \"
import requests
from requests.auth import HTTPBasicAuth
import os
import sys

try:
    jira_url = os.environ.get('JIRA_URL')
    username = os.environ.get('JIRA_USERNAME')
    api_token = os.environ.get('JIRA_API_TOKEN')
    
    auth = HTTPBasicAuth(username, api_token)
    response = requests.get(f'{jira_url}/rest/api/3/myself', auth=auth, timeout=10)
    
    if response.status_code == 200:
        user = response.json()
        print(f'SUCCESS: Connected as {user.get(\\\"displayName\\\", \\\"Unknown\\\")}')
    else:
        print(f'FAILED: HTTP {response.status_code}')
        sys.exit(1)
except Exception as e:
    print(f'ERROR: {str(e)}')
    sys.exit(1)
\"" 2>&1'
        
        if ($jiraTest -match "SUCCESS:") {
            Write-Success "Jira connectivity test passed"
            $successLine = ($jiraTest -split "`n" | Where-Object { $_ -match "SUCCESS:" })[0]
            Write-Host "  $successLine" -ForegroundColor Green
        }
        else {
            Write-Warning "Jira connectivity test failed:"
            Write-Host "  $jiraTest" -ForegroundColor Yellow
            Write-Status "This may be due to network issues or incorrect credentials"
        }
    }
    catch {
        Write-Warning "Jira connectivity test failed: $($_.Exception.Message)"
    }
}

# Function to show completion instructions
function Show-CompletionInstructions {
    Write-Header "Setup Complete!"
    
    Write-Success "Atlassian MCP Server has been configured successfully!"
    Write-Host ""
    Write-Status "Next steps:"
    Write-Host "  1. Restart VSCode completely (close and reopen)"
    Write-Host "  2. Wait 30-60 seconds for the MCP server to initialize"
    Write-Host "  3. Open Roo and verify the 'atlassian' server appears in MCP servers list"
    Write-Host ""
    Write-Status "Test the integration by asking Roo:"
    Write-Host "  'Search for issues in the SA project assigned to me'"
    Write-Host "  'What are the most recent Jira issues?'"
    Write-Host ""
    Write-Status "Configuration files:"
    Write-Host "  - MCP Settings: $(Get-McpSettingsPath)"
    Write-Host "  - Zscaler Certificate: $ZscalerCertPath"
    Write-Host "  - Container Runtime: Docker Desktop"
    Write-Host ""
    Write-Status "If you encounter issues:"
    Write-Host "  - Check VSCode Output panel (View → Output → Roo Code)"
    Write-Host "  - Verify your API token hasn't expired"
    Write-Host "  - Ensure VSCode is completely restarted"
    Write-Host "  - Make sure Docker Desktop is running"
    Write-Host ""
}

# Main execution
function Main {
    Write-Header "Atlassian MCP Server Setup for Windows"
    Write-Status "PowerShell Version: $($PSVersionTable.PSVersion)"
    Write-Host ""
    
    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Error "PowerShell 5.0 or later is required"
        exit 1
    }
    
    # Warn if not running as administrator
    if (-not (Test-Administrator)) {
        Write-Warning "Not running as Administrator. Some operations may fail."
        Write-Status "Consider running PowerShell as Administrator for best results."
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -notmatch '^[Yy]$') {
            exit 1
        }
    }
    
    try {
        Install-DockerDesktop
        Export-ZscalerCertificate
        $credentials = Get-UserCredentials
        New-McpConfiguration -UserEmail $credentials.Email -UserApiToken $credentials.ApiToken
        Test-Installation -UserEmail $credentials.Email -UserApiToken $credentials.ApiToken
        Show-CompletionInstructions
    }
    catch {
        Write-Error "Setup failed: $($_.Exception.Message)"
        Write-Status "Please check the error above and try again"
        exit 1
    }
}

# Handle script interruption
trap {
    Write-Error "Setup interrupted by user"
    exit 1
}

# Show help if requested
if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "/?") {
    Write-Host "Atlassian MCP Server Setup Script for Windows"
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "  .\setup-atlassian-mcp-windows.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "  -SkipDockerInstall    Skip Docker Desktop installation check"
    Write-Host "  -Force               Overwrite existing certificate and configuration"
    Write-Host "  -Email <email>       Pre-specify Smartsheet email address"
    Write-Host "  -ApiToken <token>    Pre-specify Atlassian API token"
    Write-Host ""
    Write-Host "EXAMPLES:"
    Write-Host "  .\setup-atlassian-mcp-windows.ps1"
    Write-Host "  .\setup-atlassian-mcp-windows.ps1 -Email user@smartsheet.com"
    Write-Host "  .\setup-atlassian-mcp-windows.ps1 -Force -SkipDockerInstall"
    Write-Host ""
    exit 0
}

# Run main function
Main