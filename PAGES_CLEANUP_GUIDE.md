# Pages Cleanup Guide

## Issue
The portal contains duplicate and unnecessary template pages from the Material Dashboard template.

## Pages to KEEP (Active Uqudo Portal Pages)

These 7 pages are the actual working portal:

1. **uqudo-dashboard.html** - Main dashboard with KPIs and charts
2. **uqudo-sign-in.html** - Login page for the portal
3. **accounts.html** - Customer accounts management
4. **alerts.html** - KYC alerts management
5. **cases.html** - AML cases management
6. **kyc-setup.html** - KYC configuration settings
7. **blocklist.html** - Blocklist management

## Pages to DELETE (Template Pages - Not Used)

These 14 pages are leftover Material Dashboard templates and should be deleted:

1. **dashboard.html** - ❌ Duplicate (use uqudo-dashboard.html)
2. **sign-in.html** - ❌ Duplicate (use uqudo-sign-in.html)
3. **sign-up.html** - ❌ Not needed (no signup functionality)
4. **profile.html** - ❌ Template page
5. **billing.html** - ❌ Template page
6. **virtual-reality.html** - ❌ Template page
7. **rtl.html** - ❌ Template page (RTL not needed)
8. **tables.html** - ❌ Template page
9. **typography.html** - ❌ Template page
10. **icons.html** - ❌ Template page
11. **notifications.html** - ❌ Template page
12. **map.html** - ❌ Template page
13. **landing.html** - ❌ Template page
14. **template.html** - ❌ Template page

## How to Clean Up

### Option 1: Manual Deletion
Navigate to the pages directory and delete the files:
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/pages"
rm dashboard.html sign-in.html sign-up.html profile.html billing.html \
   virtual-reality.html rtl.html tables.html typography.html icons.html \
   notifications.html map.html landing.html template.html
```

### Option 2: Use the Cleanup Script
A cleanup script has been created at:
```bash
bash /Users/uqudo/Desktop/Admin\ Portal/ui-master/cleanup_pages.sh
```

### Option 3: Delete via File Manager
1. Open Finder
2. Navigate to: `/Users/uqudo/Desktop/Admin Portal/ui-master/pages/`
3. Select the 14 files listed above
4. Move them to Trash (Cmd+Delete)

## After Cleanup

After deletion, you should have only 7 HTML files in the pages directory:
- alerts.html
- accounts.html
- blocklist.html
- cases.html
- kyc-setup.html
- uqudo-dashboard.html
- uqudo-sign-in.html

## Verification
Run this command to verify cleanup:
```bash
ls -1 /Users/uqudo/Desktop/Admin\ Portal/ui-master/pages/*.html
```

You should see only the 7 Uqudo portal pages listed above.
