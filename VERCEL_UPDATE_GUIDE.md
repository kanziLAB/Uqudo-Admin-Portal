# Vercel Environment Variable Update Guide

## Quick Reference

You have already rotated the database password to: `G0zVkCkEfdUj0Dq8`

## Required Actions

### 1. Rotate Supabase Service Role Key

🔴 **CRITICAL**: The old Supabase service role key was exposed in GitHub and must be rotated immediately.

**Steps:**
1. Go to: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/settings/api
2. Find the **service_role** key section
3. Click the **reset** or **regenerate** button
4. Copy the new key (starts with `eyJ...`)
5. Keep it safe - you'll paste it into Vercel in Step 2

### 2. Update Vercel Environment Variables

Go to your Vercel project settings: https://vercel.com/

Navigate to: **Your Project** → **Settings** → **Environment Variables**

#### Update These Variables:

| Variable Name | New Value | Notes |
|--------------|-----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | `<NEW_KEY_FROM_STEP_1>` | 🔴 Get from Supabase (Step 1) |
| `DB_PASSWORD` | `G0zVkCkEfdUj0Dq8` | ✅ Already rotated |

#### Verify These Exist (should already be set):

| Variable Name | Expected Value |
|--------------|----------------|
| `SUPABASE_URL` | `https://kpmcigujptbolpdlfojo.supabase.co` |
| `DB_USER` | `postgres` |
| `DB_HOST` | `db.kpmcigujptbolpdlfojo.supabase.co` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `postgres` |

**For each variable:**
1. Click **Edit** next to the variable name
2. Paste the new value
3. Select all environments: ✅ Production, ✅ Preview, ✅ Development
4. Click **Save**

### 3. Redeploy Application

After updating all environment variables in Vercel:

**Option A - Trigger from Git:**
```bash
git push origin main
```

**Option B - Redeploy from Vercel Dashboard:**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **...** menu button
4. Click **Redeploy**
5. Check "Use existing Build Cache" is OFF (to ensure new env vars are used)
6. Click **Redeploy**

### 4. Verify Deployment

After redeployment completes:

1. Check deployment logs for any errors
2. Visit your application URL
3. Test login functionality
4. Perform a new SDK verification from mobile
5. Check that cases and match details are working

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is required"

**Cause**: Environment variable not set in Vercel

**Fix**:
1. Go to Vercel → Settings → Environment Variables
2. Add or update `SUPABASE_SERVICE_ROLE_KEY`
3. Select all environments
4. Redeploy

### Error: "Failed to connect to database"

**Cause**: Incorrect `DB_PASSWORD` in Vercel

**Fix**:
1. Verify password is: `G0zVkCkEfdUj0Dq8`
2. Update in Vercel environment variables
3. Redeploy

### Deployment succeeds but authentication fails

**Cause**: Supabase service role key mismatch

**Fix**:
1. Verify you copied the correct NEW key from Supabase
2. Check there are no extra spaces or line breaks
3. Update in Vercel
4. Redeploy

## Security Checklist

- [ ] Rotated Supabase service role key in Supabase dashboard
- [ ] Updated `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- [ ] Updated `DB_PASSWORD` in Vercel
- [ ] Verified all other environment variables exist
- [ ] Redeployed application
- [ ] Tested login and core functionality
- [ ] Verified SDK verification works end-to-end
- [ ] Checked GitGuardian alerts are resolved

## Timeline

- ✅ Code fixed (12 files updated to use environment variables)
- ✅ Database password rotated: `G0zVkCkEfdUj0Dq8`
- ⏳ **NEXT**: Rotate Supabase service role key
- ⏳ **NEXT**: Update Vercel environment variables
- ⏳ **NEXT**: Redeploy and verify

## Support

If you need help:

1. Check Vercel deployment logs: **Deployments** → Click deployment → **View Function Logs**
2. Check Supabase logs: **Logs** → **API**
3. Review `SECURITY_REMEDIATION.md` for detailed information

## Quick Command Reference

```bash
# Check if environment variables are set locally (for testing scripts)
echo $SUPABASE_SERVICE_ROLE_KEY
echo $DB_PASSWORD

# Test a diagnostic script locally
export SUPABASE_SERVICE_ROLE_KEY="<your_new_key>"
export DB_PASSWORD="G0zVkCkEfdUj0Dq8"
node backend/check-cases.js

# Push code to trigger Vercel deployment
git push origin main

# Check Vercel deployment status
vercel ls
```

## After Completing All Steps

Once everything is working:

1. Close GitGuardian alerts
2. Document the incident
3. Review security best practices with team
4. Set calendar reminder to rotate credentials in 90 days
5. Consider enabling Supabase audit logs for monitoring

## Questions?

Refer to the comprehensive `SECURITY_REMEDIATION.md` for detailed explanations and additional options like cleaning git history.
