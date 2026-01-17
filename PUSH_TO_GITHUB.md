# Push to GitHub - Authentication Required

Your code is committed locally and ready to push! You just need to authenticate with GitHub.

## ✅ Code Status

- ✅ Git repository initialized
- ✅ All files committed (412 files, 97,109 insertions)
- ✅ Remote configured: https://github.com/kanziLAB/Uqudo-Admin-Portal.git
- ⏳ Ready to push to GitHub

## Option 1: Push via HTTPS (Easiest)

### Step 1: Configure Git Credentials

```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master

# Set your GitHub username
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 2: Push with Credentials

```bash
# Push to GitHub (you'll be prompted for username and password/token)
git push -u origin main
```

**Note**: GitHub no longer accepts passwords for authentication. You need to use a **Personal Access Token** instead.

### Create a Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "Uqudo Admin Portal"
4. Select scopes:
   - ✅ `repo` (all)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

When prompted for password, paste your **token** instead.

---

## Option 2: Push via SSH (More Secure)

### Step 1: Check if you have SSH keys

```bash
ls -la ~/.ssh
```

If you see `id_rsa.pub` or `id_ed25519.pub`, you have SSH keys. Skip to Step 3.

### Step 2: Generate SSH key (if needed)

```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

Press Enter to accept default location. Optionally add a passphrase.

### Step 3: Add SSH key to GitHub

```bash
# Copy your SSH public key
cat ~/.ssh/id_ed25519.pub
```

1. Copy the output
2. Go to https://github.com/settings/keys
3. Click "New SSH key"
4. Title: "Mac - Uqudo Admin Portal"
5. Paste your key
6. Click "Add SSH key"

### Step 4: Update remote URL to SSH

```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master

# Change remote from HTTPS to SSH
git remote set-url origin git@github.com:kanziLAB/Uqudo-Admin-Portal.git

# Push
git push -u origin main
```

---

## Option 3: Push via GitHub CLI (If Installed)

```bash
# Install GitHub CLI (if not installed)
brew install gh

# Authenticate
gh auth login

# Push
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
git push -u origin main
```

---

## Option 4: Use GitHub Desktop

1. Download GitHub Desktop: https://desktop.github.com/
2. Open GitHub Desktop
3. File → Add Local Repository
4. Select: `/Users/uqudo/Desktop/Admin Portal/ui-master`
5. Click "Publish repository"
6. Uncheck "Keep this code private" (or keep it checked if you want it private)
7. Click "Publish Repository"

---

## After Successful Push

Once you've pushed successfully, you'll see:

```
Enumerating objects: 451, done.
Counting objects: 100% (451/451), done.
Delta compression using up to 8 threads
Compressing objects: 100% (442/442), done.
Writing objects: 100% (451/451), 10.23 MiB | 2.14 MiB/s, done.
Total 451 (delta 52), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (52/52), done.
To https://github.com/kanziLAB/Uqudo-Admin-Portal.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## Next: Deploy to Vercel

After pushing to GitHub:

### 1. Go to Vercel

https://vercel.com/new

### 2. Import Repository

- Click "Import Git Repository"
- Select "kanziLAB/Uqudo-Admin-Portal"
- Click "Import"

### 3. Configure Project

- **Framework Preset**: Other
- **Root Directory**: `./`
- Keep other settings as default

### 4. Add Environment Variables

Click "Environment Variables" and add:

```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
CORS_ORIGIN=https://uqudo-admin-portal.vercel.app
```

**Important**: Add for all three environments:
- Production ✓
- Preview ✓
- Development ✓

### 5. Deploy

Click "Deploy" and wait 2-5 minutes.

### 6. Update CORS

After deployment:
1. Copy your Vercel URL
2. Update `CORS_ORIGIN` environment variable with actual URL
3. Click "Redeploy"

### 7. Update Supabase

Go to Supabase Dashboard → Settings → API → CORS:
```
https://your-app.vercel.app
https://your-app-*.vercel.app
```

---

## Troubleshooting

### Error: "fatal: could not read Username"

**Solution**: Use Option 1 or 2 above to configure authentication.

### Error: "Support for password authentication was removed"

**Solution**: Use a Personal Access Token instead of your password (see Option 1).

### Error: "Permission denied (publickey)"

**Solution**: Add your SSH key to GitHub (see Option 2).

### Error: "Repository not found"

**Solution**: Verify the repository exists at https://github.com/kanziLAB/Uqudo-Admin-Portal

---

## Quick Commands Cheat Sheet

```bash
# Configure git
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Push with HTTPS (will prompt for token)
git push -u origin main

# Or switch to SSH and push
git remote set-url origin git@github.com:kanziLAB/Uqudo-Admin-Portal.git
git push -u origin main

# Check remote URL
git remote -v

# Check git status
git status
```

---

**Current Status**: Code is committed and ready to push!

**Next Command**: Configure authentication and run `git push -u origin main`

**After Push**: Deploy to Vercel at https://vercel.com/new
