# Atlassian MCP Server Setup Scripts

Quick setup scripts for configuring the Atlassian MCP server with Roo Code in Zscaler environments.

## 🚀 Quick Start

### Linux/macOS/WSL
```bash
./setup-atlassian-mcp-linux.sh
```

### Windows (PowerShell as Administrator)
```powershell
.\setup-atlassian-mcp-windows.ps1
```

## 📁 Files

| File | Description |
|------|-------------|
| [`setup-atlassian-mcp-linux.sh`](setup-atlassian-mcp-linux.sh) | Automated setup for Linux, macOS, and WSL |
| [`setup-atlassian-mcp-windows.ps1`](setup-atlassian-mcp-windows.ps1) | Automated setup for Windows |
| [`ATLASSIAN_MCP_SETUP_SCRIPTS.md`](ATLASSIAN_MCP_SETUP_SCRIPTS.md) | Complete documentation and troubleshooting |
| [`ATLASSIAN_MCP.md`](ATLASSIAN_MCP.md) | Manual setup guide (reference) |

## ✅ What the Scripts Do

1. **Install container runtime** (Podman/Docker)
2. **Export Zscaler certificate** automatically
3. **Collect your credentials** securely
4. **Configure MCP server** for your platform
5. **Test the installation** end-to-end

## 🔧 Prerequisites

- VSCode with Roo Code extension
- Smartsheet email address
- Atlassian API token (script will help you create one)
- Zscaler certificate installed on your system

## 📖 Need Help?

- **Full Documentation**: [`ATLASSIAN_MCP_SETUP_SCRIPTS.md`](ATLASSIAN_MCP_SETUP_SCRIPTS.md)
- **Manual Setup**: [`ATLASSIAN_MCP.md`](ATLASSIAN_MCP.md)
- **Troubleshooting**: Check the documentation files above

## ⚡ After Setup

1. **Restart VSCode** completely
2. **Wait 30-60 seconds** for MCP server to initialize
3. **Test with Roo**: Ask "What Jira tools do you have available?"

---

*These scripts automate the manual process described in ATLASSIAN_MCP.md*