# Finding Your Existing Project Online PWA Site

## Situation

You don't have SharePoint Administrator access, so you cannot provision a new PWA instance. However, **your organization likely already has a Project Online site** - you just need to find the correct URL.

---

## Quick Methods to Find PWA Site URL

### Method 1: Open Project Online in Browser (EASIEST)

1. **Go to your normal Project Online access point:**
   - Office 365 app launcher (waffle icon)
   - Microsoft Teams Project Online app
   - Bookmarks/favorites for Project Online
   - Email links to projects

2. **Once Project Online opens, look at the browser address bar**
   
3. **Copy the base URL** (everything before `/_layouts`)
   
   Example:
   ```
   If you see: https://mbfcorp.sharepoint.com/pwa/_layouts/15/PWA.aspx
   Your PWA URL is: https://mbfcorp.sharepoint.com/pwa
   
   If you see: https://mbfcorp.sharepoint.com/_layouts/15/PWA.aspx  
   Your PWA URL is: https://mbfcorp.sharepoint.com
   ```

### Method 2: Check Office 365 App Launcher

1. **Go to:** https://www.office.com
2. **Sign in** with your work account
3. **Click the app launcher** (9 dots/waffle icon in top left)
4. **Look for "Project" or "Project Online"**
5. **Right-click → Copy link address**
6. **Extract the base URL** from the link

### Method 3: Ask a Colleague

Find someone who uses Project Online and ask:

```
"Can you send me the URL you use to access Project Online?
Just open it in your browser and copy the address from the address bar."
```

Common roles that use Project Online:
- Project Managers
- PMO team members
- Resource Managers
- Portfolio Managers

### Method 4: Check Your Browser History

1. **Open browser history** (Ctrl+H or Cmd+Y)
2. **Search for:** "sharepoint" or "project"
3. **Look for URLs containing:**
   - `PWA.aspx`
   - `projectcenter`
   - `projects.aspx`
   - Anything with "project" in the path

### Method 5: Check Microsoft Teams

1. **Open Microsoft Teams**
2. **Look for Project Online app/tab**
3. **Click on it**
4. **Right-click → Copy link** (if available)
5. **Or check the URL when it opens**

### Method 6: Check Email

1. **Search your email for:** "project" AND "sharepoint"
2. **Look for:**
   - Project status update notifications
   - Task assignment emails
   - Project approval requests
   - Links to project sites

---

## Common PWA URL Patterns

Your PWA site is likely one of these:

```
✓ https://mbfcorp.sharepoint.com
✓ https://mbfcorp.sharepoint.com/pwa
✓ https://mbfcorp.sharepoint.com/sites/ProjectOnline
✓ https://mbfcorp.sharepoint.com/sites/ProjectServer
✓ https://mbfcorp.sharepoint.com/sites/Projects
```

**The one you tried that DOESN'T work:**
```
✗ https://mbfcorp.sharepoint.com/sites/pwa  (No PWA instance here)
```

---

## Test Each URL

Once you have a candidate URL, test it:

### Option 1: Quick Browser Test

Open the URL in your browser. You should see:

**✓ Correct PWA site:**
- Project Online interface
- Project Center with list of projects
- Navigation: Projects, Resources, Reports, etc.
- May require sign-in

**✗ Wrong URL:**
- "No Project Web App instances found" error
- Regular SharePoint site
- Access denied
- 404 Not Found

### Option 2: Use Diagnostic Script

Update `.env.test` with the new URL and run:

```bash
# Edit .env.test
PROJECT_ONLINE_URL=https://[test-url]

# Test it
npm run diagnose:pwa
```

**Expected output if correct:**
```
✓ Authentication successful
✓ SharePoint site exists and is accessible
✓ PWA instance is configured and ProjectData API is accessible

✅ SUCCESS - PWA Instance Configured!
```

---

## If You Still Can't Find It

### Contact Your IT/SharePoint Administrator

Use this template email:

```
Subject: Request: Project Online Site URL

Hi [IT Admin],

I'm working on a Project Online integration and need to confirm the 
correct Project Online site URL for our organization.

I've tried: https://mbfcorp.sharepoint.com/sites/pwa
But this site doesn't have a PWA instance configured.

Could you provide:
1. The correct Project Online (PWA) site URL for our organization
2. Confirm I have access to this site for API integration

Background: I'm developing an integration that uses the Project Online 
OData API to extract project data. I have Azure AD authentication 
working, but need the correct PWA site URL.

Technical details:
- Need the base site URL (e.g., https://mbfcorp.sharepoint.com/pwa)
- Site must have ProjectData API available (/_api/ProjectData)
- My Azure AD app has delegated permissions configured

Thank you!
```

### Alternative: Request Admin Provision PWA

If there truly is no PWA site, request provisioning:

```
Subject: Request: Enable PWA Instance on SharePoint Site

Hi [SharePoint Admin],

I need a Project Web App (PWA) instance to be provisioned for a 
Project Online integration project.

Preferred site: https://mbfcorp.sharepoint.com/sites/pwa
(This site exists but doesn't have PWA enabled yet)

OR

Please advise which existing PWA site I should use instead.

I've prepared a guide for the provisioning process if helpful:
[Attach: test/PWA_INSTANCE_PROGRAMMATIC_CREATION.md]

The provisioning can be done via:
- SharePoint Admin Center UI, OR
- PowerShell command: Enable-PnPProjectWebAppInstance

Thank you!
```

---

## Testing Workflow

Once you get a candidate URL:

```bash
# 1. Update .env.test
nano .env.test
# Change PROJECT_ONLINE_URL to new URL

# 2. Run diagnostic
npm run diagnose:pwa

# 3. If diagnostic passes, test connection
npm run test:connection

# 4. If connection passes, run integration tests
npm run test:integration
```

---

## Troubleshooting

### "I can access Project Online in browser, but API returns 404"

**Possible causes:**

1. **Different URL:** Browser might redirect you to actual PWA
   - Solution: Copy exact URL from browser address bar after page loads
   
2. **PWA on different tenant/subdomain**
   - Solution: Check if your org has multiple SharePoint tenants
   
3. **Using Project for the Web (not Project Online)**
   - Project for the Web uses different APIs
   - Check with IT: "Are we using Project Online or Project for the Web?"

### "I found the URL but still get 404"

Try these variations:

```bash
# Try without trailing slash
PROJECT_ONLINE_URL=https://mbfcorp.sharepoint.com

# Try with /pwa
PROJECT_ONLINE_URL=https://mbfcorp.sharepoint.com/pwa

# Try the one that works in browser
PROJECT_ONLINE_URL=[exact URL from browser]
```

### "Colleagues say they don't use a URL - they use the desktop app"

Project Online desktop app (Project Professional) connects to PWA site too:

1. Ask them to open Project Professional
2. File → Info → Manage Accounts
3. Look at the "Project Web App" URL listed
4. That's your PWA site URL

---

## Quick Decision Tree

```
Can you access Project Online somewhere?
├─ YES: Open it, copy URL from browser → Test with diagnostic
└─ NO: Ask IT for Project Online site URL
       │
       ├─ IT provides URL → Test with diagnostic
       │
       └─ No PWA site exists
          └─ Request IT provision PWA (see guide)
```

---

## Summary Checklist

- [ ] Check Office 365 app launcher for Project Online
- [ ] Open Project Online and copy URL from browser
- [ ] Ask colleague who uses Project Online for URL
- [ ] Check browser history for Project Online URLs
- [ ] Check email for Project Online links
- [ ] Test candidate URLs with `npm run diagnose:pwa`
- [ ] If all else fails, email IT (template provided above)

---

## Next Steps After Finding URL

Once you have the correct PWA URL:

1. ✅ Update `PROJECT_ONLINE_URL` in `.env.test`
2. ✅ Run `npm run diagnose:pwa` to verify
3. ✅ Run `npm run test:connection` to test full authentication
4. ✅ Run `npm run test:integration` to validate data access
5. ✅ Document the URL for your team

---

## Need More Help?

If you've tried everything and still can't find the PWA site:

1. **Create a list of all URLs you've tried**
2. **Capture screenshots of error messages**
3. **Document what you see when trying to access Project Online**
4. **Share with IT using the email template above**

The diagnostic script output will help IT understand exactly what's needed.
