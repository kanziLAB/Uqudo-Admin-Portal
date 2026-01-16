# 🚀 START HERE - Uqudo Admin Portal

## Quick Setup (3 Steps)

### Step 1: Configure Supabase (2 minutes)

I need your Supabase credentials to connect to the database. Please provide:

1. **Supabase Project URL**
2. **Supabase Anon Key**
3. **Supabase Service Role Key**

**Where to find them:**
- Go to https://supabase.com/dashboard
- Select your project
- Navigate to **Settings → API**
- Copy the three values above

**Option A: Use Interactive Wizard (Recommended)**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
node setup-config.js
```

**Option B: Manual Configuration**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
cp .env.example .env
# Then edit .env file with your credentials
```

---

### Step 2: Create Demo User (1 minute)

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm install
node create-user.js
```

This will generate:
- Demo user credentials (admin@demo.uqudo.com / Admin@123)
- Password hash
- SQL script to insert the user

**Then:**
1. Copy the SQL output
2. Go to Supabase → **SQL Editor**
3. Paste and run the SQL
4. User is created!

---

### Step 3: Start the Application (30 seconds)

**Terminal 1 - Backend:**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm run dev
```

You should see:
```
============================================================
🚀 Uqudo Admin Portal API Server Started
============================================================
Port: 3000
```

**Terminal 2 - Frontend:**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
npx http-server -p 8080
```

**Open Browser:**
```
http://localhost:8080/pages/uqudo-sign-in.html
```

**Login with:**
- Email: `admin@demo.uqudo.com`
- Password: `Admin@123`

---

## 🎯 What I've Built For You

### ✅ Complete Backend API (100%)
- 50+ REST API endpoints
- Multi-tenant architecture with Row-Level Security
- JWT authentication with RBAC (5 roles)
- Manual actions: Approve, Decline, Clean, Suspicious, False Positive
- Workflow orchestrator triggers
- Comprehensive audit logging
- Security features (rate limiting, helmet, CORS)

### ✅ Frontend Infrastructure (100%)
- API client for all endpoints (`assets/js/api-client.js`)
- Utility functions (`assets/js/utils.js`)
- Sign-in page with authentication (`pages/uqudo-sign-in.html`)

### ✅ Documentation & Tools
- Complete API documentation (`backend/API_DOCUMENTATION.md`)
- Setup guide (`SETUP_GUIDE.md`)
- Progress summary (`PROGRESS_SUMMARY.md`)
- Implementation plan (`UQUDO_IMPLEMENTATION_PLAN.md`)
- Quick start script (`QUICK_START.sh`)
- Configuration wizard (`backend/setup-config.js`)
- User creation tool (`backend/create-user.js`)

---

## 📁 Project Structure

```
ui-master/
├── backend/                        ✅ Complete
│   ├── config/supabase.js         # Database client
│   ├── middleware/                # Auth, errors, audit
│   ├── routes/                    # All API endpoints
│   ├── server.js                  # Express app
│   ├── create-user.js            # User creation tool
│   ├── setup-config.js           # Config wizard
│   └── .env                       # Your credentials (create this)
├── database/
│   └── supabase_schema.sql        ✅ Executed by you
├── assets/js/
│   ├── api-client.js              ✅ API wrapper
│   └── utils.js                   ✅ Helper functions
├── pages/
│   ├── uqudo-sign-in.html         ✅ Login page
│   └── dashboard.html             ⏳ To be customized
└── Documentation/                  ✅ Complete
```

---

## 🔍 Verify Everything Works

### 1. Test Backend Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Uqudo Admin Portal API is running"
}
```

### 2. Test Login API
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.uqudo.com","password":"Admin@123"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGc...",
    "refreshToken": "..."
  }
}
```

### 3. Test Frontend Login
1. Open: http://localhost:8080/pages/uqudo-sign-in.html
2. Enter credentials
3. Click "Sign in"
4. Should redirect to dashboard

---

## 🐛 Troubleshooting

### Backend won't start

**Error:** `Cannot find module '@supabase/supabase-js'`
```bash
cd backend && npm install
```

**Error:** `JWT_SECRET is not defined`
```bash
# Run the config wizard
cd backend && node setup-config.js
```

**Error:** `Port 3000 already in use`
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Cannot connect to Supabase

**Error:** `Invalid Supabase URL` or `Invalid API key`
- Double-check your .env file
- Verify credentials in Supabase Dashboard → Settings → API
- Make sure there are no extra spaces in .env

### Login fails

**Error:** `User not found`
- Demo user wasn't created
- Run `node create-user.js` and execute the SQL in Supabase

**Error:** `Incorrect password`
- Password hash might be wrong
- Re-run `node create-user.js` to generate a new hash
- Copy and run the new SQL

### Frontend can't reach backend

**Error:** `Failed to fetch` in browser console
- Make sure backend is running on port 3000
- Check CORS_ORIGIN in .env includes `http://localhost:8080`
- Verify backend logs for CORS errors

---

## 📊 API Endpoints Summary

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout
- POST `/api/auth/refresh` - Refresh token
- GET `/api/auth/me` - Get current user

### Dashboard
- GET `/api/dashboard/kpis` - KPI statistics
- GET `/api/dashboard/verification-type-distribution` - Charts
- GET `/api/dashboard/account-status-distribution` - Charts
- GET `/api/dashboard/country-distribution` - Top countries
- GET `/api/dashboard/new-registrations?period=7d` - Time series
- GET `/api/dashboard/growth-rate?period=30d` - Growth rate

### Accounts (12 endpoints)
- GET `/api/accounts` - List with filters
- GET `/api/accounts/:id` - Account details
- PATCH `/api/accounts/:id` - Update account
- GET `/api/accounts/:id/verification-tickets` - Ticket history
- GET `/api/accounts/:id/biometric` - Biometric data
- GET `/api/accounts/:id/device-attestation` - Device info
- POST `/api/accounts/:id/documents/request` - Request docs
- GET `/api/accounts/:id/documents` - List documents
- PATCH `/api/accounts/:id/documents/:docId/compliance` - Mark compliant
- GET `/api/accounts/:id/analyst-logs` - Activity logs
- POST `/api/accounts/:id/notes` - Add note

### KYC Alerts (6 endpoints)
- GET `/api/alerts` - List with filters
- GET `/api/alerts/:id` - Alert details
- PATCH `/api/alerts/:id/status` - Update status
- **POST `/api/alerts/:id/actions`** - Manual actions ⭐
- POST `/api/alerts/:id/assign` - Assign to user
- GET `/api/alerts/queue/summary` - Queue stats

### AML Cases (5 endpoints)
- GET `/api/cases` - List with filters
- GET `/api/cases/:id` - Case details
- **POST `/api/cases/:id/actions`** - Manual actions ⭐
- PATCH `/api/cases/:id/status` - Update status
- POST `/api/cases/export` - Export to Excel

### Configuration (17 endpoints)
- KYC Setup: GET, PUT
- Blocklist: GET, GET/:id, POST, PUT/:id, DELETE/:id, POST/import
- Rules: GET, GET/:id, POST, PUT/:id, DELETE/:id, PATCH/:id/toggle
- Countries: GET, PATCH/:id, POST/bulk-update

### Workflow Orchestrator (7 endpoints)
- GET `/api/workflow/status` - Status
- POST `/api/workflow/trigger/duplicate-check` - Check duplicates
- POST `/api/workflow/trigger/pep-screening` - PEP screening
- POST `/api/workflow/trigger/id-expiry-check` - ID expiry
- POST `/api/workflow/trigger/rule-evaluation` - Evaluate rules
- POST `/api/workflow/batch-process` - Batch operations
- GET `/api/workflow/audit-trail` - Audit logs

**Total: 50+ endpoints** ✅

---

## 🎯 Manual Actions (Key Feature)

### Alert Actions (POST `/api/alerts/:id/actions`)
```javascript
{
  "action": "APPROVE",  // or DECLINE, CLEAN, SUSPICIOUS, FALSE_POSITIVE
  "reason": "All checks passed",
  "notes": "Customer verified"
}
```

### Case Actions (POST `/api/cases/:id/actions`)
```javascript
{
  "action": "APPROVE",  // or DECLINE, CLEAN, SUSPICIOUS, FALSE_POSITIVE
  "notes": "False positive confirmed"
}
```

**Actions Update:**
- Account status (active/suspended/blocked)
- PEP/Sanctions status (clear/positive/in_process)
- Resolution status (false/positive/unsolved)
- Create audit log entries
- Add notes if provided

---

## 🔐 Roles & Permissions

| Role | Access Level |
|------|-------------|
| **MLRO** | Full access to everything |
| **Manager** | High-level management, config, batch ops |
| **Team Lead** | Team management, blocklist, rules |
| **Analyst** | Operational access, manual actions |
| **View Only** | Read-only access |

---

## 📝 Next Steps (Frontend Pages)

After you get backend running, I'll build:

1. **Dashboard Page** - KPIs, charts, statistics
2. **Accounts Page** - List, search, filter accounts
3. **Account Detail Page** - Full account view with actions
4. **Alerts Page** - Alert queue with manual actions
5. **Cases Page** - Case management with actions
6. **Configuration Pages** - KYC Setup, Blocklist, Rules, Countries

---

## ❓ What Information Do You Need to Provide?

**Required (to start backend):**
1. ✅ Supabase Project URL
2. ✅ Supabase Anon Key
3. ✅ Supabase Service Role Key

**Optional:**
4. Confirm database schema was executed
5. Any specific requirements for frontend pages

---

## 🚀 Let's Get Started!

**Run the configuration wizard now:**

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
node setup-config.js
```

Then paste your Supabase credentials when prompted.

**Or provide them here and I'll create the .env file for you!**

Just give me:
- SUPABASE_URL=?
- SUPABASE_ANON_KEY=?
- SUPABASE_SERVICE_ROLE_KEY=?

And I'll set everything up! 🎉

---

**Questions? Issues?** Let me know and I'll help debug!
