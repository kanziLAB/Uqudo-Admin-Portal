import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import accountsRoutes from './routes/accounts.js';
import alertsRoutes from './routes/alerts.js';
import casesRoutes from './routes/cases.js';
import configRoutes from './routes/config.js';
import workflowRoutes from './routes/workflow.js';
import sdkVerificationRoutes from './routes/sdk-verification.js';
import sdkVerificationJWSRoutes from './routes/sdk-verification-jws.js';
import sdkSessionsRoutes from './routes/sdk-sessions.js';

// Import middleware
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditLogger } from './middleware/auditLogger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Uqudo Admin Portal API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// SDK verification endpoints - public for webhook integration
// Use authentication if you want to require it: authenticate, auditLogger,
app.use('/api/sdk-verification', sdkVerificationRoutes);
app.use('/api/sdk-verification', sdkVerificationJWSRoutes);

// Protected routes (authentication required)
app.use('/api/dashboard', authenticate, auditLogger, dashboardRoutes);
app.use('/api/accounts', authenticate, auditLogger, accountsRoutes);
app.use('/api/alerts', authenticate, auditLogger, alertsRoutes);
app.use('/api/cases', authenticate, auditLogger, casesRoutes);
app.use('/api/config', authenticate, auditLogger, configRoutes);
app.use('/api/workflow', authenticate, auditLogger, workflowRoutes);
app.use('/api/sdk-sessions', authenticate, auditLogger, sdkSessionsRoutes);

// Serve frontend static files (in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../pages')));
  app.use('/assets', express.static(join(__dirname, '../assets')));

  // Catch-all route to serve index.html
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../pages/dashboard.html'));
  });
}

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Uqudo Admin Portal API Server Started');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`API Base URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
