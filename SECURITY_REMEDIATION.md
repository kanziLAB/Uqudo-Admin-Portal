# Security Remediation Guide

## Critical Issue: Exposed Credentials

GitGuardian has detected exposed credentials in the GitHub repository. This document provides step-by-step instructions to remediate the security vulnerabilities.

## Status

✅ **Code Fixed**: All 12 backend files now use environment variables instead of hardcoded credentials
🔄 **Pending**: Credential rotation and Vercel environment variable updates

## Summary of Changes

All backend diagnostic and migration scripts have been updated to use environment variables:

### Files Updated (12 total)
1. `backend/execute-migrations-pg.js` - Uses `DB_PASSWORD`
2. `backend/execute-migrations-mcp.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
3. `backend/execute-migrations-simple.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
4. `backend/run-migrations-final.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
5. `backend/add-match-details-supabase.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
6. `backend/check-cases.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
7. `backend/check-jws-structure.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
8. `backend/check-users.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
9. `backend/check-latest-account.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
10. `backend/verify-column-raw.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
11. `backend/check-schema.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`
12. `backend/check-recent-data.js` - Uses `SUPABASE_SERVICE_ROLE_KEY`

## Immediate Next Steps

### Step 1: Rotate Supabase Service Role Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/settings/api
2. Navigate to **Settings** → **API**
3. In the **Project API keys** section, find the **service_role** key
4. Click **Reset** or **Generate new key**
5. Copy the new service role key (starts with `eyJ...`)
6. Save it securely - you'll need it for Vercel

**Note**: The old exposed key was:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M
```

### Step 2: Update Database Password (Already Done)

✅ **COMPLETED** - Password has been reset to: `G0zVkCkEfdUj0Dq8`

### Step 3: Update Vercel Environment Variables

Update the following environment variables in Vercel:

1. Go to Vercel Dashboard: https://vercel.com/
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Update these variables:

#### Required Updates:

```bash
# Update with NEW Supabase service role key from Step 1
SUPABASE_SERVICE_ROLE_KEY=<NEW_KEY_FROM_SUPABASE>

# Update with NEW database password
DB_PASSWORD=G0zVkCkEfdUj0Dq8

# Verify these are correct (should already exist)
SUPABASE_URL=https://kpmcigujptbolpdlfojo.supabase.co
DB_USER=postgres
DB_HOST=db.kpmcigujptbolpdlfojo.supabase.co
DB_PORT=5432
DB_NAME=postgres
```

#### For each variable:
1. Click **Edit** next to the variable
2. Update the value
3. Select environments: **Production**, **Preview**, and **Development**
4. Click **Save**

### Step 4: Redeploy Application

After updating Vercel environment variables:

```bash
# Trigger a new deployment
git commit --allow-empty -m "Trigger redeploy with new credentials"
git push origin main
```

Or manually redeploy from Vercel dashboard:
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

### Step 5: Remove Credentials from Git History (Optional but Recommended)

The exposed credentials are now in git history. To completely remove them:

#### Option A: Using BFG Repo-Cleaner (Recommended)

```bash
# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
cd /tmp
git clone --mirror https://github.com/YOUR_ORG/ui-master.git
cd ui-master.git

# Replace exposed service role key
echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M' > ../credentials.txt
echo '+Mz/KD_Sa@d-JW5' >> ../credentials.txt
bfg --replace-text ../credentials.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push --force
```

#### Option B: Using git filter-branch

```bash
# WARNING: This command rewrites git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/execute-migrations-pg.js backend/execute-migrations-mcp.js" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

**⚠️ WARNING**: These commands rewrite git history. Coordinate with your team before running them.

### Step 6: Verify Security

After completing all steps:

1. Check GitGuardian alerts are cleared
2. Test diagnostic scripts locally with environment variables:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="<new_key>"
   export DB_PASSWORD="G0zVkCkEfdUj0Dq8"
   node backend/check-cases.js
   ```
3. Verify Vercel deployment works with new credentials
4. Test a new SDK verification end-to-end

## Environment Variable Reference

All backend scripts now require these environment variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://kpmcigujptbolpdlfojo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<rotated_key>

# PostgreSQL Direct Connection (for migrations)
DB_USER=postgres
DB_PASSWORD=G0zVkCkEfdUj0Dq8
DB_HOST=db.kpmcigujptbolpdlfojo.supabase.co
DB_PORT=5432
DB_NAME=postgres
```

## Security Best Practices Going Forward

1. **Never commit credentials**: Always use environment variables
2. **Use .env.local**: For local development (already in .gitignore)
3. **Rotate regularly**: Rotate service keys every 90 days
4. **Monitor alerts**: Set up GitGuardian or similar tools
5. **Limit access**: Use least-privilege principle for API keys
6. **Audit regularly**: Review who has access to credentials

## Support

If you encounter issues during remediation:

1. Check Vercel deployment logs for errors
2. Verify environment variables are set correctly
3. Test database connection with new credentials
4. Review Supabase logs for authentication failures

## Timeline

- **2026-01-18 10:00 PM**: Credentials exposed (GitGuardian alert)
- **2026-01-18 10:15 PM**: Code fixed (all 12 files updated)
- **2026-01-18 10:20 PM**: Database password rotated
- **PENDING**: Supabase service role key rotation
- **PENDING**: Vercel environment variable updates
- **PENDING**: Verify deployment with new credentials

## Files No Longer Exposing Credentials

All diagnostic scripts now exit with error if environment variables are not set:

```javascript
if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}
```

This prevents accidental execution without proper credentials.

## Commit This Fix

```bash
git add -A
git commit -m "Security fix: Remove hardcoded credentials from all backend scripts

- Updated 12 backend files to use environment variables
- Added validation for required environment variables
- Scripts now exit with error if credentials not provided
- Prepared for credential rotation

Addresses GitGuardian security alert for exposed:
- Supabase service role key
- Database password"
```
