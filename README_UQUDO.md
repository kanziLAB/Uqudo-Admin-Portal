# Uqudo Admin Portal

![version](https://img.shields.io/badge/version-3.2.0-blue.svg) ![status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)

A comprehensive AML/KYC management system for customer onboarding, verification, and compliance monitoring. Built on Material Dashboard 3 with a complete Express.js backend.

## Features

- ✅ **Dashboard**: Real-time KPIs, verification metrics, and analytics
- ✅ **Account Management**: Customer accounts with KYC status tracking
- ✅ **Alert Management**: Priority-based alert queue with investigation workflows
- ✅ **Case Management**: AML cases with alert linking and resolution tracking
- ✅ **Blocklist Management**: Custom blocklists with CSV import
- ✅ **KYC Configuration**: Country risk settings and verification rules
- ✅ **SDK Integration**: Complete Uqudo SDK enrollment processing with background checks
- ✅ **Audit Logging**: Comprehensive activity tracking for compliance

## Technology Stack

### Frontend
- **Framework**: Bootstrap 5 (Material Dashboard 3)
- **Server**: Express.js serving static files
- **JavaScript**: Vanilla JS with modern ES6+

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT-based auth with refresh tokens
- **Validation**: express-validator
- **Security**: helmet, cors, rate limiting

### Deployment
- **Platform**: Vercel (serverless)
- **Database**: Supabase (managed PostgreSQL)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

### Local Development

1. **Clone and install dependencies**:

```bash
cd ui-master
npm install
```

2. **Configure environment**:

```bash
# Copy backend environment file
cd backend
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

Required variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-min-32-chars
```

3. **Start development servers**:

```bash
# Terminal 1: Backend API (port 3000)
cd backend
npm start

# Terminal 2: Frontend (port 8080)
cd ..
npm start
```

4. **Access the application**:

- Frontend: http://localhost:8080
- Login: http://localhost:8080/pages/uqudo-sign-in
- API: http://localhost:3000/api
- Health: http://localhost:3000/health

## Project Structure

```
ui-master/
├── assets/                  # Static assets
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript modules
│   │   ├── api-client.js  # API client (auto-detects environment)
│   │   └── utils.js       # Utility functions
│   └── img/               # Images and icons
├── backend/               # Backend API
│   ├── routes/           # API routes
│   │   ├── auth.js       # Authentication
│   │   ├── accounts.js   # Account management
│   │   ├── alerts.js     # Alert management
│   │   ├── cases.js      # Case management
│   │   ├── config.js     # Configuration
│   │   ├── dashboard.js  # Dashboard data
│   │   ├── workflow.js   # Workflow orchestrator
│   │   └── sdk-verification.js # Uqudo SDK
│   ├── middleware/       # Express middleware
│   ├── migrations/       # Database migrations
│   ├── server.js        # Express server
│   └── .env.example     # Environment template
├── pages/               # HTML pages
│   ├── uqudo-sign-in.html
│   ├── uqudo-dashboard.html
│   ├── accounts.html
│   ├── alerts.html
│   ├── cases.html
│   ├── blocklist.html
│   └── kyc-setup.html
├── server.js           # Frontend Express server
├── vercel.json        # Vercel deployment config
├── DEPLOYMENT_GUIDE.md # Complete deployment guide
└── package.json
```

## API Documentation

### Authentication

**POST** `/api/auth/login`
```json
{
  "email": "analyst@example.com",
  "password": "password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "user": { "id": "...", "email": "...", "role": "analyst" }
  }
}
```

### Accounts

- **GET** `/api/accounts` - List accounts with pagination
- **POST** `/api/accounts` - Create new account
- **GET** `/api/accounts/:id` - Get account details
- **PATCH** `/api/accounts/:id` - Update account

### Alerts

- **GET** `/api/alerts` - List alerts with filters
- **POST** `/api/alerts` - Create new alert
- **PATCH** `/api/alerts/:id/status` - Update alert status
- **POST** `/api/alerts/:id/actions` - Perform alert action

### Cases

- **GET** `/api/cases` - List cases with filters
- **POST** `/api/cases` - Create new case with alert selection
- **GET** `/api/cases/:id` - Get case details
- **POST** `/api/cases/:id/actions` - Perform case action

### SDK Integration

**POST** `/api/sdk-verification/enrollment`

Receives complete Uqudo SDK enrollment payload including:
- Document verification
- Biometric verification (face match)
- Fraud detection (screen, print, tampering)
- Background checks (PEP, Sanctions, Adverse Media)

Automatically creates AML cases when background checks find matches.

See `UQUDO_SDK_INTEGRATION.md` for detailed documentation.

## Deployment

See `DEPLOYMENT_GUIDE.md` for comprehensive Vercel deployment instructions.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Configure environment variables in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (your Vercel URL)

The API client automatically detects the environment and uses:
- **Production**: `https://your-app.vercel.app/api`
- **Local**: `http://localhost:3000/api`

## Database Schema

### Key Tables

- `accounts` - Customer account information
- `kyc_alerts` - KYC/AML alerts
- `aml_cases` - AML investigation cases (with `alert_ids` JSONB field)
- `blocklist_entries` - Custom blocklist
- `country_settings` - Country risk configuration
- `analyst_logs` - Audit trail
- `verification_tickets` - KYC verification records

### Required Migration

Before using case creation with alerts, run this SQL in Supabase:

```sql
ALTER TABLE aml_cases ADD COLUMN IF NOT EXISTS alert_ids JSONB DEFAULT '[]';
```

See `RUN_THIS_SQL.md` for details.

## Features Documentation

### Manual Account Creation

Navigate to Accounts page → "Add Account" button

**Required fields**:
- User ID, Email
- First Name, Last Name
- Phone Number, Date of Birth
- ID Type, ID Number

**Optional**: Nationality, Gender

### Case Creation with Alerts

Navigate to Cases page → "Create Case" button

**Steps**:
1. Enter Case ID
2. Select account from dropdown
3. Choose alerts to link (optional - multi-select checkboxes)
4. Add match count and external URL (optional)
5. Submit

Cases store linked alert IDs in `alert_ids` JSONB field.

### Blocklist CSV Upload

Navigate to Blocklist page → "Upload CSV" button

**CSV Format**:
```csv
full_name,id_type,id_number,nationality,source
John Doe,passport,PASS123,US,OFAC_List
Jane Smith,eid,784-1234-5678901-2,UAE,Internal_List
```

**Features**:
- Header row optional
- Preview first 10 entries before upload
- Option to auto-create alerts for matching accounts
- Bulk import in single transaction

## Security

- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (analyst, team_lead, manager, mlro)
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Audit logging for all actions
- ✅ Input validation with express-validator

## Monitoring

- **Vercel Dashboard**: https://vercel.com/dashboard
  - Function logs
  - Performance metrics
  - Bandwidth usage
- **Supabase Dashboard**: Your Supabase project
  - Database queries
  - API usage
  - Real-time logs

## Troubleshooting

### Database Connection Issues

1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Check Supabase project status
3. Verify IP restrictions allow connections

### CORS Errors

1. Add your frontend URL to `CORS_ORIGIN` in backend `.env`
2. Update Supabase CORS settings to allow your domain
3. Restart backend server

### Authentication Issues

1. Clear browser localStorage
2. Verify `JWT_SECRET` matches across all deployments
3. Check token expiration settings (`JWT_EXPIRES_IN`)

### Count Widgets Not Loading

Count widgets calculate statistics client-side by fetching up to 1000 records. If you have more records, consider:
1. Adding backend summary API endpoints
2. Using database views with aggregate queries
3. Implementing caching layer

## Documentation Files

- `DEPLOYMENT_GUIDE.md` - Complete Vercel deployment instructions
- `UQUDO_SDK_INTEGRATION.md` - SDK enrollment endpoint documentation
- `IMPLEMENTATION_COMPLETE.md` - Feature implementation summary
- `RUN_THIS_SQL.md` - Required database migrations
- `README_UQUDO.md` - This file (main documentation)

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Uqudo SDK Docs**: https://docs.uqudo.com

## Version Information

**Current Version**: 3.2.0
**Last Updated**: January 2026
**Status**: Production Ready ✅

## License

Proprietary - Uqudo Technologies

---

**Built with**: Material Dashboard 3 by Creative Tim
**Backend**: Custom Express.js API
**Database**: Supabase PostgreSQL
**Deployment**: Vercel Serverless
