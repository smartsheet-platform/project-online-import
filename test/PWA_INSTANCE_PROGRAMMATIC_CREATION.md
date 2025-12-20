# PWA Instance Programmatic Creation Guide

## Overview

PWA (Project Web App) instance creation is an **administrative operation** that requires elevated privileges. While it cannot be done through standard REST APIs, there are three programmatic approaches available.

---

## ❌ What Does NOT Work

### Standard REST API
```typescript
// ❌ This endpoint doesn't exist
POST https://[tenant].sharepoint.com/sites/pwa/_api/PWA/CreateInstance
```

**Why:** PWA provisioning is a privileged SharePoint operation not exposed via REST.

### Microsoft Graph API
```typescript
// ❌ Graph API has no PWA provisioning endpoint
POST https://graph.microsoft.com/v1.0/sites/.../pwa
```

**Why:** Graph API focuses on data access, not SharePoint provisioning.

---

## ✅ What DOES Work (Admin Only)

### Option 1: SharePoint PnP PowerShell (Recommended)

**Requirements:**
- SharePoint Administrator or Global Administrator role
- PowerShell 7+ installed
- PnP.PowerShell module installed

**Installation:**
```powershell
# Install PnP PowerShell
Install-Module -Name PnP.PowerShell -Force

# Connect to SharePoint
Connect-PnPOnline -Url "https://[tenant]-admin.sharepoint.com" -Interactive
```

**Create PWA Instance:**
```powershell
# Option A: Enable PWA on existing site
Enable-PnPProjectWebAppInstance -Url "https://[tenant].sharepoint.com/sites/pwa"

# Option B: Create new site with PWA
New-PnPSite -Type ProjectWebApp `
    -Title "Project Online" `
    -Url "https://[tenant].sharepoint.com/sites/pwa" `
    -Lcid 1033 `
    -TimeZone 13 `
    -Owner "admin@tenant.onmicrosoft.com"
```

**Verify Creation:**
```powershell
# Check if PWA is enabled
$site = Get-PnPSite -Includes Features
$pwaFeature = $site.Features | Where-Object { $_.DefinitionId -eq "f8bea737-255e-4758-ab82-e34bb46f5828" }

if ($pwaFeature) {
    Write-Host "✓ PWA instance is enabled"
} else {
    Write-Host "✗ PWA instance is NOT enabled"
}
```

**Documentation:**
- [PnP PowerShell: Enable-PnPProjectWebAppInstance](https://pnp.github.io/powershell/cmdlets/Enable-PnPProjectWebAppInstance.html)
- [PnP PowerShell: New-PnPSite](https://pnp.github.io/powershell/cmdlets/New-PnPSite.html)

---

### Option 2: SharePoint CSOM (C#/.NET)

**Requirements:**
- SharePoint Administrator or Global Administrator role
- .NET SDK installed
- SharePoint CSOM NuGet packages

**Installation:**
```bash
dotnet add package Microsoft.SharePointOnline.CSOM
dotnet add package Microsoft.Online.SharePoint.Client.Tenant
```

**Create PWA Instance (C#):**
```csharp
using Microsoft.SharePoint.Client;
using Microsoft.Online.SharePoint.TenantAdministration;

// Connect to SharePoint Admin
var adminUrl = "https://[tenant]-admin.sharepoint.com";
var siteUrl = "https://[tenant].sharepoint.com/sites/pwa";

using (var context = new ClientContext(adminUrl))
{
    // Authenticate (use appropriate method for your scenario)
    context.ExecutingWebRequest += (sender, e) => 
    {
        e.WebRequestExecutor.RequestHeaders["Authorization"] = $"Bearer {accessToken}";
    };

    // Get tenant
    var tenant = new Tenant(context);
    
    // Enable PWA feature on site
    var site = tenant.GetSiteByUrl(siteUrl);
    context.Load(site);
    context.ExecuteQuery();

    // Activate PWA feature
    // Note: Feature ID for PWA is f8bea737-255e-4758-ab82-e34bb46f5828
    var features = site.Features;
    var pwaFeatureId = new Guid("f8bea737-255e-4758-ab82-e34bb46f5828");
    features.Add(pwaFeatureId, true, FeatureDefinitionScope.None);
    
    context.ExecuteQuery();
    
    Console.WriteLine("✓ PWA instance enabled");
}
```

**Documentation:**
- [SharePoint CSOM Reference](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/complete-basic-operations-using-sharepoint-client-library-code)

---

### Option 3: SharePoint Admin Center UI (Manual)

**Requirements:**
- SharePoint Administrator or Global Administrator role
- Web browser access

**Steps:**

1. **Navigate to SharePoint Admin Center**
   ```
   https://admin.microsoft.com
   → Admin centers → SharePoint
   ```

2. **Access Active Sites**
   ```
   Sites → Active sites
   → Select your site: /sites/pwa
   ```

3. **Enable Project Web App**
   ```
   → Settings tab
   → Look for "Project Web App" section
   → Click "Enable Project Web App"
   → Configure settings (admin, locale, timezone)
   → Save
   ```

4. **Wait for Provisioning**
   - Provisioning takes 10-30 minutes
   - Site will be unavailable during provisioning
   - Check status in Active Sites list

5. **Verify**
   - Navigate to site in browser
   - Should see Project Online interface
   - Run: `npm run diagnose:pwa`

---

## Comparison of Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **PowerShell** | Easy to script, well documented, cross-platform | Requires PowerShell | Automation, CI/CD |
| **CSOM** | Programmatic control, .NET integration | Complex, Windows-focused | Enterprise apps |
| **Admin UI** | Simple, no code required | Manual, not repeatable | One-time setup |

---

## Automation Script (PowerShell)

Save as `provision-pwa.ps1`:

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Provision PWA instance on SharePoint site
    
.DESCRIPTION
    Enables Project Web App on an existing SharePoint site or creates new site with PWA.
    Requires SharePoint Administrator or Global Administrator role.
    
.PARAMETER SiteUrl
    The URL of the SharePoint site (e.g., https://tenant.sharepoint.com/sites/pwa)
    
.PARAMETER CreateNew
    If specified, creates a new site with PWA. Otherwise enables PWA on existing site.
    
.PARAMETER Owner
    Owner email for new site (required if CreateNew is specified)
    
.EXAMPLE
    ./provision-pwa.ps1 -SiteUrl "https://mbfcorp.sharepoint.com/sites/pwa"
    
.EXAMPLE
    ./provision-pwa.ps1 -SiteUrl "https://mbfcorp.sharepoint.com/sites/pwa" -CreateNew -Owner "admin@mbfcorp.com"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SiteUrl,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateNew,
    
    [Parameter(Mandatory=$false)]
    [string]$Owner
)

# Check if PnP.PowerShell is installed
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
    Write-Host "Installing PnP.PowerShell module..." -ForegroundColor Yellow
    Install-Module -Name PnP.PowerShell -Force -AllowClobber
}

# Import module
Import-Module PnP.PowerShell

# Extract tenant name from URL
$SiteUrl -match "https://([^.]+).sharepoint.com"
$tenant = $Matches[1]
$adminUrl = "https://$tenant-admin.sharepoint.com"

try {
    # Connect to SharePoint Admin
    Write-Host "Connecting to SharePoint Admin Center..." -ForegroundColor Cyan
    Connect-PnPOnline -Url $adminUrl -Interactive
    
    if ($CreateNew) {
        # Create new site with PWA
        if (-not $Owner) {
            Write-Error "Owner email is required when CreateNew is specified"
            exit 1
        }
        
        Write-Host "Creating new Project Web App site..." -ForegroundColor Cyan
        New-PnPSite -Type ProjectWebApp `
            -Title "Project Online" `
            -Url $SiteUrl `
            -Lcid 1033 `
            -TimeZone 13 `
            -Owner $Owner
            
        Write-Host "✓ PWA site created successfully" -ForegroundColor Green
    }
    else {
        # Enable PWA on existing site
        Write-Host "Enabling PWA on existing site..." -ForegroundColor Cyan
        Enable-PnPProjectWebAppInstance -Url $SiteUrl
        
        Write-Host "✓ PWA instance enabled successfully" -ForegroundColor Green
    }
    
    Write-Host "`nProvisioning may take 10-30 minutes to complete." -ForegroundColor Yellow
    Write-Host "Check the site status in SharePoint Admin Center.`n" -ForegroundColor Yellow
    
    # Disconnect
    Disconnect-PnPOnline
    
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Wait for provisioning to complete (10-30 minutes)"
    Write-Host "  2. Navigate to site in browser to verify"
    Write-Host "  3. Run: npm run diagnose:pwa"
    Write-Host "  4. Run: npm run test:connection"
    
} catch {
    Write-Error "Error provisioning PWA: $_"
    exit 1
}
```

**Usage:**
```powershell
# Enable PWA on existing site
./provision-pwa.ps1 -SiteUrl "https://mbfcorp.sharepoint.com/sites/pwa"

# Create new site with PWA
./provision-pwa.ps1 -SiteUrl "https://mbfcorp.sharepoint.com/sites/pwa" -CreateNew -Owner "admin@mbfcorp.com"
```

---

## After PWA Creation

Once PWA instance is provisioned:

### 1. Verify with Diagnostic
```bash
npm run diagnose:pwa
```

Expected output:
```
✓ Authentication successful
✓ SharePoint site exists and is accessible
✓ PWA instance is configured and ProjectData API is accessible

✅ SUCCESS - PWA Instance Configured!
```

### 2. Test Connection
```bash
npm run test:connection
```

### 3. Update Documentation
Document the PWA URL in:
- `.env.test` file
- Team documentation
- Deployment guides

---

## Troubleshooting

### Error: "Access Denied"
**Cause:** Insufficient permissions

**Solution:**
- Verify you have SharePoint Administrator or Global Administrator role
- Check in Azure AD → Roles and administrators
- Contact your IT administrator

### Error: "Site already has PWA"
**Cause:** PWA already enabled

**Solution:**
- This is actually success! Run `npm run diagnose:pwa` to verify
- If diagnostic shows 404, there may be a provisioning issue

### Error: "Feature activation failed"
**Cause:** Site collection doesn't support PWA

**Solution:**
- Ensure site is a team site or project site
- Some site templates don't support PWA
- Try creating a new dedicated site for PWA

### Provisioning Stuck
**Cause:** SharePoint provisioning queue backlog

**Solution:**
- Wait longer (can take up to 60 minutes in rare cases)
- Check SharePoint Admin Center → Sites → Active sites
- Look for provisioning status indicator
- If stuck >2 hours, contact Microsoft support

---

## Security Considerations

### Minimum Privilege Principle
- Use service accounts with minimum required permissions
- Don't use Global Administrator if SharePoint Administrator suffices
- Rotate credentials regularly

### Audit Logging
- All PWA provisioning operations are logged in Office 365 audit logs
- Review logs regularly for unauthorized changes
- Set up alerts for PWA configuration changes

### Access Control
- Restrict who can run provisioning scripts
- Store credentials securely (Azure Key Vault, etc.)
- Use managed identities when possible

---

## Alternative: Find Existing PWA Site

**If you don't want to create a new PWA instance**, you can find an existing one:

### Method 1: Check All Sites
```powershell
Connect-PnPOnline -Url "https://[tenant]-admin.sharepoint.com" -Interactive

# List all sites with PWA enabled
Get-PnPTenantSite | ForEach-Object {
    $siteUrl = $_.Url
    Connect-PnPOnline -Url $siteUrl -Interactive
    
    $site = Get-PnPSite -Includes Features
    $pwaFeature = $site.Features | Where-Object { $_.DefinitionId -eq "f8bea737-255e-4758-ab82-e34bb46f5828" }
    
    if ($pwaFeature) {
        Write-Host "✓ PWA enabled at: $siteUrl" -ForegroundColor Green
    }
}
```

### Method 2: Ask Project Online Users
Ask team members who use Project Online:
1. "What URL do you use to access Project Online?"
2. "Can you share the link from your browser?"
3. Use that URL as `PROJECT_ONLINE_URL`

### Method 3: Check Project Online Licenses
```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "User.Read.All", "Organization.Read.All"

# Find users with Project Online licenses
$licenses = Get-MgSubscribedSku | Where-Object { $_.SkuPartNumber -like "*PROJECT*" }

# Those users likely have access to the PWA site
```

---

## Summary

| Task | Can Do with REST API? | Alternative |
|------|----------------------|-------------|
| Create PWA Instance | ❌ No | PowerShell, CSOM, Admin UI |
| Find Existing PWA | ❌ No | PowerShell, Ask users |
| Access PWA Data | ✅ Yes | REST API (after PWA exists) |
| Manage Projects | ✅ Yes | REST API (after PWA exists) |

**Bottom Line:** You need admin intervention to provision PWA, but once it exists, your REST API code will work perfectly.

---

## Need Help?

If you need assistance:

1. **Ask your SharePoint Administrator** to provision PWA
2. **Share this guide** with them (includes all necessary steps)
3. **Verify with diagnostics** after provisioning
4. **Run connection tests** to confirm

**Contact:**
- SharePoint Administrator (for provisioning)
- Global Administrator (if SharePoint Admin unavailable)
- Microsoft Support (if provisioning fails)
