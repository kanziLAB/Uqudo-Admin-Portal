# Uqudo Admin Portal - Implementation Plan

## Executive Summary
Multi-tenant AML/KYC Admin Portal for managing alerts, hits, and SDK results with workflow orchestration, case management, and comprehensive access control.

## System Architecture

### 1. Multi-Tenancy Strategy
```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Layer (AWS/Azure)               │
├─────────────────────────────────────────────────────────┤
│              Application Layer (Node.js/Express)         │
├─────────────────────────────────────────────────────────┤
│         Database Layer (Supabase PostgreSQL MVP1)        │
│                  Row-Level Security (RLS)                │
└─────────────────────────────────────────────────────────┘

Data Isolation: tenant_id column in all tables with RLS policies
```

### 2. Core Modules

#### A. Dashboard & Analytics
- KPI Tiles (Registrations, Growth, Account Distribution)
- Charts (Verification Type, Account Status, Country Distribution, Growth Rate)
- Real-time data refresh
- Drill-down navigation

#### B. Account Management
- Searchable account list with advanced filtering
- Account Details with:
  - Unified profile view
  - Verification tickets history
  - Document upload viewer
  - Analyst log and notes
  - Status transitions

#### C. KYC Alert System
- Alert queue with prioritization
- Alert types: Manual Review, Duplicate Account, ID Expiry
- Document request workflow
- Auto-suspension logic
- Grace period management

#### D. AML Case Management
- Case list with resolution tracking
- Integration with external AML portal
- Match count display
- Resolution status workflow

#### E. Configuration Module
- **KYC Setup**: EID verification, OCR configuration, grace periods
- **Blocklist Management**: Import/Export, Add/Edit/Delete
- **Rule Engine**: No-code rule builder for duplicity detection
- **Country Selection**: Enable/disable countries

#### F. Settings & Access Control
- Role-Based Access Control (RBAC)
- User roles: Analyst, Team Lead, Manager, MLRO, View-Only
- Permission mapping per module
- Audit logging

### 3. Workflow Orchestrator

```javascript
Workflow Engine Components:
1. Rule Evaluation Engine
2. Action Executor
3. State Machine
4. Event Bus
5. Queue Manager
```

**Supported Workflows:**
- KYC Verification Flow (GovDB API → OCR → Manual Review)
- Alert Generation and Assignment
- Maker/Checker Approval Process
- Document Request and Verification
- Account Status Transitions

### 4. Database Schema (Supabase MVP1)

```sql
-- Core Tables
tenants (id, name, config, created_at)
users (id, tenant_id, email, role, permissions)
accounts (id, tenant_id, user_id, kyc_status, account_status, ...)
verification_tickets (id, account_id, ticket_id, result, reason, ...)
kyc_alerts (id, account_id, alert_type, status, ...)
aml_cases (id, account_id, case_id, resolution_status, ...)
documents (id, account_id, doc_type, file_url, compliance_status, ...)
analyst_logs (id, account_id, action, description, user_id, ...)
blocklist (id, tenant_id, name, id_type, id_number, ...)
rules (id, tenant_id, rule_name, rule_logic, category, status, ...)
audit_logs (id, tenant_id, user_id, action, details, timestamp)

-- Row-Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON accounts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### 5. API Endpoints

#### Authentication & Tenancy
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/tenants/:tenantId/config
```

#### Dashboard
```
GET    /api/dashboard/kpis?period=30d
GET    /api/dashboard/charts/verification-type
GET    /api/dashboard/charts/account-status
GET    /api/dashboard/charts/country-distribution
GET    /api/dashboard/charts/growth-rate
```

#### Accounts
```
GET    /api/accounts?filters=...&page=1&limit=20
GET    /api/accounts/:id
PATCH  /api/accounts/:id
POST   /api/accounts/:id/documents/request
POST   /api/accounts/:id/notes
GET    /api/accounts/:id/verification-tickets
GET    /api/accounts/:id/analyst-logs
```

#### KYC Alerts
```
GET    /api/kyc-alerts?filters=...&page=1
GET    /api/kyc-alerts/:id
PATCH  /api/kyc-alerts/:id/status
POST   /api/kyc-alerts/:id/actions
```

#### Case Management
```
GET    /api/cases?filters=...&page=1
GET    /api/cases/:id
POST   /api/cases/:id/actions (Approve/Decline/Clean/Suspicious/FalsePositive)
PATCH  /api/cases/:id/status
```

#### Configuration
```
GET    /api/config/kyc-setup
PUT    /api/config/kyc-setup
GET    /api/config/blocklist
POST   /api/config/blocklist
DELETE /api/config/blocklist/:id
GET    /api/config/rules
POST   /api/config/rules
PUT    /api/config/rules/:id
GET    /api/config/countries
PATCH  /api/config/countries/:id
```

### 6. Manual Actions on Alerts

**Action Types:**
1. **Approve**: KYC verification passed, set status to Verified
2. **Decline**: KYC verification failed, set status to Failed
3. **Clean**: No AML/sanctions match, clear case
4. **Suspicious**: Flag for further investigation
5. **False Positive**: Mark as incorrect match, clear alert

**Implementation:**
```javascript
POST /api/alerts/:id/actions
{
  "action": "APPROVE" | "DECLINE" | "CLEAN" | "SUSPICIOUS" | "FALSE_POSITIVE",
  "reason": "string",
  "notes": "string",
  "reviewedBy": "userId"
}
```

### 7. Data Display Components

#### KYC Data
- Full Name, DOB, Gender, Nationality
- ID Type, ID Number, Issuing Place, Expiry Date
- Address, Province/Emirate, Country of Residence
- Phone, Email
- T&C Version and Acceptance Time

#### Biometric Data
- Liveness check results
- Face matching score
- Document authentication results
- OCR extracted data vs submitted data comparison

#### Device Attestation
- Device ID, Type, OS Version
- IP Address, Geolocation
- Risk score
- Browser fingerprint
- Session information

### 8. Migration Path: Supabase → MongoDB

**Phase 1 (MVP1): Supabase**
- Quick setup with PostgreSQL
- Built-in auth and RLS
- Real-time subscriptions
- RESTful API auto-generated

**Phase 2: MongoDB Migration**
```javascript
// Document structure for MongoDB
{
  _id: ObjectId,
  tenantId: ObjectId,
  account: {...},
  verification: [{...}],
  alerts: [{...}],
  documents: [{...}],
  auditLog: [{...}],
  metadata: {
    createdAt: ISODate,
    updatedAt: ISODate
  }
}
```

**Migration Strategy:**
1. Run dual-write mode (Supabase + MongoDB)
2. Verify data consistency
3. Switch read traffic to MongoDB
4. Deprecate Supabase

### 9. Security Considerations

- **Multi-Tenant Isolation**: Strict RLS policies
- **Authentication**: JWT with refresh tokens
- **Authorization**: RBAC with granular permissions
- **Encryption**: At-rest and in-transit (TLS)
- **Audit Logging**: All actions logged with user/timestamp
- **API Rate Limiting**: Per tenant
- **Input Validation**: All API endpoints
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Token-based

### 10. Performance Optimization

- Database indexing on frequently queried fields
- Pagination for large datasets
- Caching layer (Redis) for dashboard metrics
- Lazy loading for document previews
- WebSocket for real-time updates
- CDN for static assets

### 11. Deployment Architecture

```
┌──────────────┐
│   CloudFront  │ (CDN)
└──────┬───────┘
       │
┌──────▼───────┐
│  Load Balancer│
└──────┬───────┘
       │
┌──────▼────────┬──────────────┐
│   App Server  │  App Server   │ (Auto-scaling)
└──────┬────────┴──────┬───────┘
       │               │
┌──────▼───────────────▼────────┐
│     Supabase PostgreSQL       │ (Primary)
│           +                   │
│     Read Replicas             │
└───────────────────────────────┘
```

### 12. Development Phases

**Phase 1: MVP1 (8-10 weeks)**
- ✅ Multi-tenant authentication
- ✅ Dashboard with basic KPIs
- ✅ Account Management
- ✅ KYC Alert System
- ✅ Basic workflow orchestrator
- ✅ Supabase integration
- ✅ Role-based access control

**Phase 2: Enhanced Features (4-6 weeks)**
- ✅ AML Case Management
- ✅ Advanced Rule Engine
- ✅ Document management & OCR
- ✅ Maker/Checker workflow
- ✅ Email notifications
- ✅ Export/Import functionality

**Phase 3: Enterprise (4-6 weeks)**
- ✅ Advanced analytics & reporting
- ✅ Audit trail & compliance reports
- ✅ API rate limiting & monitoring
- ✅ MongoDB migration
- ✅ Performance optimization
- ✅ Mobile responsive improvements

## Technology Stack

### Frontend
- Material Dashboard (Bootstrap 5)
- Vanilla JavaScript (ES6+)
- Chart.js / Chartist for visualizations
- DataTables for advanced table features
- Select2 for enhanced dropdowns
- Moment.js for date handling

### Backend
- Node.js 18+ with Express.js
- TypeScript for type safety
- JWT authentication
- Express-validator for input validation
- Winston for logging
- Bull for job queues

### Database (MVP1)
- Supabase (PostgreSQL 14+)
- Row-Level Security policies
- Supabase Auth
- Supabase Storage for documents

### DevOps
- Docker containers
- GitHub Actions for CI/CD
- AWS/Azure for hosting
- Sentry for error tracking
- DataDog for monitoring

## Next Steps

1. **Set up Supabase project** with multi-tenant schema
2. **Create backend API** with Express.js
3. **Build frontend pages** using Material Dashboard
4. **Implement authentication** and tenant isolation
5. **Develop workflow orchestrator**
6. **Integrate alert and case management**
7. **Add configuration modules**
8. **Testing and QA**
9. **Deployment to staging**
10. **Production launch**

## Contact & Support

For implementation questions, contact the Uqudo development team.
