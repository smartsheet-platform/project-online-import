#!/bin/bash

# Atlassian MCP Server Setup Script for Linux/macOS
# Supports: macOS, Ubuntu WSL, Amazon Linux EC2
# Compatible with: Podman (recommended) and Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_IMAGE="ghcr.io/sooperset/mcp-atlassian:latest"
ZSCALER_CERT_DIR="$HOME/.zscaler"
ZSCALER_CERT_PATH="$ZSCALER_CERT_DIR/ZscalerRootCA.pem"

# Default Smartsheet URLs
CONFLUENCE_URL="https://smar-wiki.atlassian.net/wiki"
JIRA_URL="https://smartsheet.atlassian.net"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/os-release ]]; then
        . /etc/os-release
        case $ID in
            ubuntu)
                if grep -q Microsoft /proc/version 2>/dev/null; then
                    echo "ubuntu-wsl"
                else
                    echo "ubuntu"
                fi
                ;;
            amzn)
                echo "amazon-linux"
                ;;
            *)
                echo "linux"
                ;;
        esac
    else
        echo "unknown"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install container runtime
install_container_runtime() {
    local os_type=$(detect_os)
    print_header "Installing Container Runtime"

    case $os_type in
        macos)
            if command_exists podman; then
                print_success "Podman already installed"
            elif command_exists brew; then
                print_status "Installing Podman via Homebrew..."
                brew install podman
                print_status "Initializing Podman machine..."
                podman machine init
                podman machine start
                print_success "Podman installed and initialized"
            else
                print_error "Homebrew not found. Please install Homebrew first or install Podman manually"
                exit 1
            fi
            ;;
        ubuntu*|ubuntu-wsl)
            if command_exists podman; then
                print_success "Podman already installed"
            else
                print_status "Installing Podman..."
                sudo apt update
                sudo apt install -y podman
                print_success "Podman installed"
            fi
            ;;
        amazon-linux)
            if command_exists docker; then
                print_success "Docker already installed"
            else
                print_status "Installing Docker..."
                sudo yum update -y
                sudo yum install -y docker
                print_status "Starting Docker service..."
                sudo systemctl start docker
                sudo systemctl enable docker
                print_status "Adding current user to docker group..."
                sudo usermod -aG docker $USER
                print_warning "You may need to log out and back in for docker group membership to take effect"
                print_success "Docker installed"
            fi
            ;;
        *)
            print_warning "Unknown OS. Checking for existing container runtime..."
            if command_exists podman; then
                print_success "Podman found"
            elif command_exists docker; then
                print_success "Docker found"
            else
                print_error "No container runtime found. Please install Podman or Docker manually"
                exit 1
            fi
            ;;
    esac

    # Verify container runtime works
    local os_type=$(detect_os)

    # For Amazon Linux, prefer Docker
    if [[ "$os_type" == "amazon-linux" ]]; then
        if command_exists docker; then
            print_status "Testing Docker..."
            if docker ps >/dev/null 2>&1; then
                print_success "Docker is working correctly"
                CONTAINER_CMD="docker"
            else
                print_error "Docker is installed but not working. Please check your installation"
                print_status "You may need to log out and back in for docker group membership to take effect"
                exit 1
            fi
        else
            print_error "Docker not found. Please install Docker manually"
            exit 1
        fi
    # For other systems, prefer Podman
    elif command_exists podman; then
        print_status "Testing Podman..."
        if podman ps >/dev/null 2>&1; then
            print_success "Podman is working correctly"
            CONTAINER_CMD="podman"
        else
            print_error "Podman is installed but not working. Please check your installation"
            exit 1
        fi
    elif command_exists docker; then
        print_status "Testing Docker..."
        if docker ps >/dev/null 2>&1; then
            print_success "Docker is working correctly"
            CONTAINER_CMD="docker"
        else
            print_error "Docker is installed but not working. Please check your installation"
            exit 1
        fi
    else
        print_error "No working container runtime found"
        exit 1
    fi
}

# Function to export Zscaler certificate
export_zscaler_certificate() {
    local os_type=$(detect_os)
    print_header "Zscaler Certificate Setup"

    # Skip Zscaler certificate for Amazon Linux EC2 (typically not behind Zscaler)
    if [[ "$os_type" == "amazon-linux" ]]; then
        print_status "Amazon Linux EC2 detected - skipping Zscaler certificate setup"
        print_status "EC2 instances typically don't require Zscaler certificates"
        SKIP_ZSCALER=true
        return 0
    fi

    # Create certificate directory
    mkdir -p "$ZSCALER_CERT_DIR"

    case $os_type in
        macos)
            print_status "Extracting Zscaler certificate from macOS keychain..."
            if security find-certificate -a -c "Zscaler" -p /Library/Keychains/System.keychain > "$ZSCALER_CERT_PATH" 2>/dev/null; then
                print_success "Certificate extracted successfully"
            else
                print_error "Failed to extract Zscaler certificate from keychain"
                print_status "Please ensure Zscaler certificate is installed in System keychain"
                exit 1
            fi
            ;;
        ubuntu-wsl)
            print_status "Attempting to copy certificate from Windows host..."
            local windows_cert_path="/mnt/c/Users/$USER/.zscaler/ZscalerRootCA.pem"
            if [[ -f "$windows_cert_path" ]]; then
                cp "$windows_cert_path" "$ZSCALER_CERT_PATH"
                print_success "Certificate copied from Windows host"
            else
                print_warning "Certificate not found in Windows user directory"
                print_status "Attempting to extract from Windows certificate store..."
                if command_exists powershell.exe; then
                    powershell.exe -Command "Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {\$_.Subject -like '*Zscaler*'} | Select-Object -First 1 | ForEach-Object { [System.Convert]::ToBase64String(\$_.RawData) }" | sed 's/\r$//' | fold -w 64 | sed '1i-----BEGIN CERTIFICATE-----' | sed '$a-----END CERTIFICATE-----' > "$ZSCALER_CERT_PATH" 2>/dev/null
                    if [[ -s "$ZSCALER_CERT_PATH" ]]; then
                        print_success "Certificate extracted from Windows certificate store"
                    else
                        print_error "Failed to extract certificate. Please export manually"
                        exit 1
                    fi
                else
                    print_error "PowerShell not available. Please export certificate manually"
                    exit 1
                fi
            fi
            ;;
        *)
            print_warning "Unknown OS. Please export Zscaler certificate manually to: $ZSCALER_CERT_PATH"
            read -p "Press Enter when certificate is ready, or Ctrl+C to exit..."
            ;;
    esac

    # Verify certificate
    if [[ -f "$ZSCALER_CERT_PATH" ]] && [[ -s "$ZSCALER_CERT_PATH" ]]; then
        print_status "Verifying certificate format..."
        if openssl x509 -in "$ZSCALER_CERT_PATH" -text -noout >/dev/null 2>&1; then
            print_success "Certificate format is valid"
            # Show certificate details
            local cert_subject=$(openssl x509 -in "$ZSCALER_CERT_PATH" -subject -noout 2>/dev/null | sed 's/subject=//')
            print_status "Certificate subject: $cert_subject"
            SKIP_ZSCALER=false
        else
            print_error "Certificate format is invalid"
            exit 1
        fi
    else
        print_error "Certificate file not found or empty"
        exit 1
    fi
}

# Function to get user input
get_user_credentials() {
    print_header "Collecting User Credentials"

    # Get email
    while [[ -z "$USER_EMAIL" ]]; do
        read -p "Enter your Smartsheet email address: " USER_EMAIL
        if [[ ! "$USER_EMAIL" =~ ^[^@]+@smartsheet\.com$ ]]; then
            print_warning "Please enter a valid @smartsheet.com email address"
            USER_EMAIL=""
        fi
    done

    # Get API token
    while [[ -z "$API_TOKEN" ]]; do
        echo
        print_status "You need an Atlassian API token. If you don't have one:"
        print_status "1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens"
        print_status "2. Click 'Create API token'"
        print_status "3. Name it 'AI Assistant MCP Access'"
        print_status "4. Copy the token"
        echo
        read -s -p "Enter your Atlassian API token: " API_TOKEN
        echo
        if [[ -z "$API_TOKEN" ]]; then
            print_warning "API token cannot be empty"
        fi
    done

    print_success "Credentials collected"
}

# Function to get MCP settings paths (supports both Roo and Claude)
get_mcp_settings_paths() {
    local paths=()

    # Find project root (where .git directory is or two levels up from script location)
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$script_dir/../.."
    cd "$project_root" || exit 1

    # Check for Roo
    if [[ -d ".roo" ]]; then
        paths+=(".roo/mcp.json")
    fi

    # Check for Claude
    if [[ -d ".claude" ]]; then
        paths+=(".mcp.json")
    fi

    # If neither exist, prompt user
    if [[ ${#paths[@]} -eq 0 ]]; then
        print_status "Which AI coding assistant(s) are you using?"
        echo "  1) Roo only" >&2
        echo "  2) Claude Code only" >&2
        echo "  3) Both Roo and Claude Code" >&2
        read -p "Enter your choice (1, 2, or 3): " choice >&2
        case $choice in
            1)
                mkdir -p ".roo"
                paths+=(".roo/mcp.json")
                ;;
            2)
                paths+=(".mcp.json")
                ;;
            3)
                mkdir -p ".roo"
                paths+=(".roo/mcp.json")
                paths+=(".mcp.json")
                ;;
            *)
                print_warning "Invalid choice. Defaulting to Claude Code format (.mcp.json)"
                paths+=(".mcp.json")
                ;;
        esac
    fi

    # Return paths as a properly formatted array
    printf '%s\n' "${paths[@]}"
}

# Function to create MCP configuration for a given path
create_mcp_config_file() {
    local mcp_settings_path="$1"

    # Find project root
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$script_dir/../.."
    local full_path="$project_root/$mcp_settings_path"
    local mcp_settings_dir=$(dirname "$full_path")

    # Create directory if it doesn't exist
    mkdir -p "$mcp_settings_dir"

    # Backup existing configuration
    if [[ -f "$full_path" ]]; then
        print_status "Backing up existing MCP settings at $mcp_settings_path..."
        cp "$full_path" "$full_path.backup.$(date +%Y%m%d_%H%M%S)"
        print_success "Backup created"
    fi

    print_status "Creating MCP configuration at $mcp_settings_path..."

    # Build docker args based on whether we have Zscaler cert
    if [[ "$SKIP_ZSCALER" == "true" ]]; then
        # No Zscaler certificate - simpler configuration
        cat > "$full_path" << EOF
{
  "mcpServers": {
    "atlassian": {
      "command": "$CONTAINER_CMD",
      "args": [
        "run",
        "-i",
        "--rm",
        "$CONTAINER_IMAGE"
      ],
      "env": {
        "CONFLUENCE_URL": "$CONFLUENCE_URL",
        "CONFLUENCE_USERNAME": "$USER_EMAIL",
        "CONFLUENCE_API_TOKEN": "$API_TOKEN",
        "JIRA_URL": "$JIRA_URL",
        "JIRA_USERNAME": "$USER_EMAIL",
        "JIRA_API_TOKEN": "$API_TOKEN"
      }
    }
  }
}
EOF
    else
        # With Zscaler certificate
        local cert_mount_path="$ZSCALER_CERT_PATH:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro"
        cat > "$full_path" << EOF
{
  "mcpServers": {
    "atlassian": {
      "command": "$CONTAINER_CMD",
      "args": [
        "run",
        "-i",
        "--rm",
        "--user",
        "root",
        "-v",
        "$cert_mount_path",
        "-e",
        "CONFLUENCE_URL=$CONFLUENCE_URL",
        "-e",
        "CONFLUENCE_USERNAME=$USER_EMAIL",
        "-e",
        "CONFLUENCE_API_TOKEN=$API_TOKEN",
        "-e",
        "JIRA_URL=$JIRA_URL",
        "-e",
        "JIRA_USERNAME=$USER_EMAIL",
        "-e",
        "JIRA_API_TOKEN=$API_TOKEN",
        "-e",
        "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt",
        "--entrypoint",
        "sh",
        "$CONTAINER_IMAGE",
        "-c",
        "update-ca-certificates && su app -c 'mcp-atlassian'"
      ]
    }
  }
}
EOF
    fi

    print_success "MCP configuration created at: $mcp_settings_path"
}

# Function to create MCP configuration for all detected assistants
create_mcp_configuration() {
    print_header "Creating MCP Configuration"

    # Read paths into array using mapfile/readarray
    local paths=()
    while IFS= read -r line; do
        paths+=("$line")
    done < <(get_mcp_settings_paths)

    if [[ ${#paths[@]} -eq 0 ]]; then
        print_error "No MCP configuration paths determined"
        exit 1
    fi

    print_status "Will create ${#paths[@]} MCP configuration file(s)"

    for path in "${paths[@]}"; do
        create_mcp_config_file "$path"
    done

    print_success "All MCP configurations created successfully"
}

# Function to test installation
test_installation() {
    print_header "Testing Installation"

    # Test certificate installation in container (only if we have Zscaler cert)
    if [[ "$SKIP_ZSCALER" != "true" ]]; then
        print_status "Testing certificate installation in container..."
        if $CONTAINER_CMD run --rm --user root \
            -v "$ZSCALER_CERT_PATH:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro" \
            --entrypoint sh \
            "$CONTAINER_IMAGE" \
            -c "update-ca-certificates 2>&1 | grep -i zscaler && echo '✅ Certificate installed successfully'" 2>/dev/null; then
            print_success "Certificate test passed"
        else
            print_warning "Certificate test failed - this may still work in practice"
        fi
    fi

    # Test Jira connectivity
    print_status "Testing Jira API connectivity..."

    if [[ "$SKIP_ZSCALER" == "true" ]]; then
        # Test without Zscaler certificate
        local test_result=$($CONTAINER_CMD run --rm \
            -e "JIRA_URL=$JIRA_URL" \
            -e "JIRA_USERNAME=$USER_EMAIL" \
            -e "JIRA_API_TOKEN=$API_TOKEN" \
            "$CONTAINER_IMAGE" \
            python3 -c "
import requests
from requests.auth import HTTPBasicAuth
import os
import sys

try:
    jira_url = os.environ.get('JIRA_URL')
    username = os.environ.get('JIRA_USERNAME')
    api_token = os.environ.get('JIRA_API_TOKEN')

    auth = HTTPBasicAuth(username, api_token)
    response = requests.get(jira_url + '/rest/api/3/myself', auth=auth, timeout=10)

    if response.status_code == 200:
        user = response.json()
        display_name = user.get('displayName', 'Unknown')
        print('SUCCESS: Connected as ' + display_name)
    else:
        print('FAILED: HTTP ' + str(response.status_code))
        sys.exit(1)
except Exception as e:
    print('ERROR: ' + str(e))
    sys.exit(1)
" 2>&1)
    else
        # Test with Zscaler certificate
        local test_result=$($CONTAINER_CMD run --rm --user root \
            -v "$ZSCALER_CERT_PATH:/usr/local/share/ca-certificates/ZscalerRootCA.crt:ro" \
            -e "JIRA_URL=$JIRA_URL" \
            -e "JIRA_USERNAME=$USER_EMAIL" \
            -e "JIRA_API_TOKEN=$API_TOKEN" \
            -e "REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt" \
            --entrypoint sh \
            "$CONTAINER_IMAGE" \
            -c 'update-ca-certificates >/dev/null 2>&1 && su app -c "python3 -c \"
import requests
from requests.auth import HTTPBasicAuth
import os
import sys

try:
    jira_url = os.environ.get(\\\"JIRA_URL\\\")
    username = os.environ.get(\\\"JIRA_USERNAME\\\")
    api_token = os.environ.get(\\\"JIRA_API_TOKEN\\\")

    auth = HTTPBasicAuth(username, api_token)
    response = requests.get(jira_url + \\\"/rest/api/3/myself\\\", auth=auth, timeout=10)

    if response.status_code == 200:
        user = response.json()
        display_name = user.get(\\\"displayName\\\", \\\"Unknown\\\")
        print(\\\"SUCCESS: Connected as \\\" + display_name)
    else:
        print(\\\"FAILED: HTTP \\\" + str(response.status_code))
        sys.exit(1)
except Exception as e:
    print(\\\"ERROR: \\\" + str(e))
    sys.exit(1)
\"" 2>&1' 2>/dev/null)
    fi

    if echo "$test_result" | grep -q "SUCCESS:"; then
        print_success "Jira connectivity test passed"
        echo "  $(echo "$test_result" | grep "SUCCESS:")"
    else
        print_warning "Jira connectivity test failed:"
        echo "  $test_result"
        print_status "This may be due to network issues or incorrect credentials"
    fi
}

# Function to show completion instructions
show_completion_instructions() {
    print_header "Setup Complete!"

    echo
    print_success "Atlassian MCP Server has been configured successfully!"
    echo

    # Determine which assistants were configured
    local paths=()
    while IFS= read -r line; do
        paths+=("$line")
    done < <(get_mcp_settings_paths)

    local has_roo=false
    local has_claude=false
    for path in "${paths[@]}"; do
        if [[ "$path" == *".roo/"* ]]; then
            has_roo=true
        elif [[ "$path" == ".mcp.json" ]]; then
            has_claude=true
        fi
    done

    print_status "Next steps:"
    echo

    if [[ "$has_roo" == true ]] && [[ "$has_claude" == true ]]; then
        echo "  📦 Configured for: Both Roo and Claude Code"
        echo "  1. Completely restart VSCode (close and reopen)"
        echo "  2. Wait 30-60 seconds for MCP servers to initialize"
        echo "  3. Verify in Roo: Type /mcp to see 'atlassian' server"
        echo "  4. Verify in Claude Code: Check Output panel (View → Output → Claude Code)"
    elif [[ "$has_roo" == true ]]; then
        echo "  📦 Configured for: Roo"
        echo "  1. Press Cmd+Shift+P → 'Developer: Reload Window'"
        echo "     OR completely restart VSCode (close and reopen)"
        echo "  2. Wait 30-60 seconds for MCP server to initialize"
        echo "  3. Open Roo and type /mcp to verify 'atlassian' server appears"
    elif [[ "$has_claude" == true ]]; then
        echo "  📦 Configured for: Claude Code"
        echo "  1. Press Cmd+Shift+P → 'Developer: Reload Window'"
        echo "  2. Wait 30-60 seconds for MCP server to initialize"
        echo "  3. Check Output panel: View → Output → 'Claude Code' for MCP status"
    fi

    echo
    print_status "Test the integration by asking your AI assistant:"
    echo "  'Search for issues in the FS project assigned to me'"
    echo "  'What are my recent Jira issues?'"
    echo
    print_status "Configuration files:"
    local paths=()
    while IFS= read -r line; do
        paths+=("$line")
    done < <(get_mcp_settings_paths)
    for path in "${paths[@]}"; do
        echo "  - MCP Settings: $path"
    done
    if [[ "$SKIP_ZSCALER" != "true" ]]; then
        echo "  - Zscaler Certificate: $ZSCALER_CERT_PATH"
    fi
    echo "  - Container Runtime: $CONTAINER_CMD"
    echo
    print_status "If you encounter issues:"
    echo "  - Check VSCode Output panel (View → Output → [Roo/Claude] Code)"
    echo "  - Verify your API token hasn't expired"
    echo "  - Ensure VSCode is completely restarted"
    echo
}

# Main execution
main() {
    print_header "Atlassian MCP Server Setup for Linux/macOS"
    print_status "Detected OS: $(detect_os)"
    echo

    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root is not recommended. Consider running as a regular user."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    install_container_runtime
    export_zscaler_certificate
    get_user_credentials
    create_mcp_configuration
    test_installation
    show_completion_instructions
}

# Handle script interruption
trap 'print_error "Setup interrupted by user"; exit 1' INT

# Run main function
main "$@"