# 🌐 Frontend & Backend Server Configuration

Complete guide for running the Uqudo Admin Portal with clean URLs.

---

## 📋 Current Setup

### Backend API
- **URL:** `http://localhost:3000`
- **Base Path:** `/api`
- **Technology:** Express.js + Node.js
- **Database:** Supabase (PostgreSQL)

### Frontend
- **URL:** `http://localhost:8080`
- **Technology:** Express.js (Custom server with URL rewriting)
- **Clean URLs:** ✅ Enabled (no .html extension needed)

---

## 🚀 How to Run

### Option 1: Run Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
npm install  # First time only
npm run dev
```

### Option 2: Using pm2 (Run in background)

```bash
# Install pm2 globally (first time only)
npm install -g pm2

# Start backend
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
pm2 start npm --name "uqudo-backend" -- run dev

# Start frontend
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
pm2 start npm --name "uqudo-frontend" -- run dev

# Check status
pm2 list

# View logs
pm2 logs

# Stop all
pm2 stop all

# Delete all processes
pm2 delete all
```

---

## 🔗 URL Structure

### Backend API Endpoints

**Base URL:** `http://localhost:3000/api`

**Authentication:**
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user

**Dashboard:**
- GET `/api/dashboard/kpis` - Dashboard statistics

**Accounts:**
- GET `/api/accounts` - List accounts
- GET `/api/accounts/:id` - Get account details
- GET `/api/accounts/:id/biometric-data` - Get biometric data
- GET `/api/accounts/:id/device-attestation` - Get device info
- GET `/api/accounts/:id/activity-log` - Get activity log
- POST `/api/accounts/:id/actions` - Perform manual action

**Alerts:**
- GET `/api/alerts` - List alerts
- GET `/api/alerts/queue/summary` - Queue summary
- GET `/api/alerts/:id` - Get alert details
- POST `/api/alerts/:id/actions` - Perform manual action

**Cases:**
- GET `/api/cases` - List AML cases
- GET `/api/cases/:id` - Get case details
- POST `/api/cases/:id/actions` - Perform manual action
- POST `/api/cases/export` - Export cases

**Configuration:**
- GET `/api/config/kyc-setup` - Get KYC settings
- PUT `/api/config/kyc-setup` - Update KYC settings
- GET `/api/config/countries` - List countries
- POST `/api/config/countries` - Add country
- GET `/api/config/blocklist` - List blocklist
- POST `/api/config/blocklist` - Add blocklist entry

---

### Frontend URLs

**With Clean URLs (Recommended):**
```
http://localhost:8080/pages/uqudo-sign-in
http://localhost:8080/pages/uqudo-dashboard
http://localhost:8080/pages/accounts
http://localhost:8080/pages/alerts
http://localhost:8080/pages/cases
http://localhost:8080/pages/kyc-setup
http://localhost:8080/pages/blocklist
```

**Traditional URLs (Still work):**
```
http://localhost:8080/pages/uqudo-sign-in.html
http://localhost:8080/pages/uqudo-dashboard.html
http://localhost:8080/pages/accounts.html
http://localhost:8080/pages/alerts.html
http://localhost:8080/pages/cases.html
http://localhost:8080/pages/kyc-setup.html
http://localhost:8080/pages/blocklist.html
```

---

## 🛠️ Clean URLs Configuration

The custom Express server (`server.js`) handles URL rewriting:

**Features:**
- ✅ Serves HTML files without `.html` extension
- ✅ Works with both `/pages/accounts` and `/pages/accounts.html`
- ✅ Redirects root `/` to sign-in page
- ✅ Serves static assets from `/assets`
- ✅ Handles 404 errors gracefully

**How it works:**
```javascript
// Example: User visits /pages/accounts
// Server automatically looks for:
// 1. /pages/accounts.html
// 2. Serves the file if found
// 3. Returns 404 if not found
```

---

## 📝 API Client Configuration

The frontend API client is already configured to use the correct backend URL:

**File:** `assets/js/api-client.js`

```javascript
class ApiClient {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.token = this.getToken();
  }
  // ...
}
```

**Change Backend URL:**
If you need to change the backend URL (e.g., for production), update the `baseURL` in:
- `assets/js/api-client.js` (line 7)

**Example for production:**
```javascript
constructor(baseURL = 'https://api.uqudo.com/api') {
  // ...
}
```

---

## 🔧 Port Configuration

### Change Frontend Port

Edit `server.js`:
```javascript
const PORT = 8080;  // Change this to your desired port
```

### Change Backend Port

Edit `backend/.env`:
```env
PORT=3000  # Change this to your desired port
```

Then update the API client:
```javascript
constructor(baseURL = 'http://localhost:YOUR_NEW_PORT/api') {
```

---

## 🌍 Environment Variables

### Backend (.env file location)
`backend/.env`

**Required variables:**
```env
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase)
SUPABASE_URL=https://kpmcigujptbolpdlfojo.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### Frontend (No .env needed)
Frontend configuration is hardcoded in `assets/js/api-client.js`

---

## 🧪 Testing the Setup

### 1. Test Backend
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### 2. Test Frontend
```bash
# Open in browser:
http://localhost:8080/pages/uqudo-sign-in

# Should show the login page
```

### 3. Test API Connection
```bash
# Login with curl:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.uqudo.com","password":"Admin@123"}'

# Should return a token
```

---

## 📊 Server Status

Check if servers are running:

```bash
# Check backend
lsof -ti:3000

# Check frontend
lsof -ti:8080

# If nothing returns, the server is not running
```

Stop servers:

```bash
# Stop backend
lsof -ti:3000 | xargs kill -9

# Stop frontend
lsof -ti:8080 | xargs kill -9
```

---

## 🔐 CORS Configuration

The backend is already configured to allow requests from the frontend:

**File:** `backend/middleware/security.js`

```javascript
const corsOptions = {
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
};
```

**For production:**
Add your production domain to the `origin` array.

---

## 📦 Dependencies

### Frontend
```json
{
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.38.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.0"
  }
}
```

---

## 🚀 Production Deployment

### Option 1: Same Domain (Recommended)

Deploy both frontend and backend on the same domain:
- Frontend: `https://uqudo.com`
- Backend: `https://uqudo.com/api`

Use Nginx or Apache as reverse proxy.

### Option 2: Separate Domains

- Frontend: `https://portal.uqudo.com`
- Backend: `https://api.uqudo.com`

Update CORS settings in backend to allow the frontend domain.

### Option 3: Static Frontend + API

- Deploy frontend as static files (Netlify, Vercel, S3)
- Deploy backend separately (Heroku, AWS, DigitalOcean)
- Update API client baseURL to point to backend

---

## 📋 Summary

**Backend:**
- URL: `http://localhost:3000`
- API Base: `http://localhost:3000/api`
- Technology: Express.js + Supabase

**Frontend:**
- URL: `http://localhost:8080`
- Clean URLs: ✅ Enabled
- Technology: Express.js (custom server)

**Login:**
- Email: `admin@demo.uqudo.com`
- Password: `Admin@123`

**Start Commands:**
```bash
# Backend
cd backend && npm run dev

# Frontend
npm run dev
```

---

✅ **Everything is configured and ready to use!**
