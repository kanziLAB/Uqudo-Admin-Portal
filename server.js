/**
 * Custom Frontend Server with Clean URLs
 * Serves HTML files without .html extension
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Custom middleware to handle URLs without .html extension
app.use((req, res, next) => {
  // If the request is for a directory or has an extension, continue
  if (req.path.endsWith('/') || path.extname(req.path)) {
    return next();
  }

  // Try to find the file with .html extension
  const htmlPath = path.join(__dirname, req.path + '.html');
  const pagesPath = path.join(__dirname, 'pages', req.path.split('/').pop() + '.html');

  // Check if file exists in root
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }

  // Check if file exists in pages directory
  if (fs.existsSync(pagesPath)) {
    return res.sendFile(pagesPath);
  }

  next();
});

// Serve pages directory
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Root redirect to sign-in
app.get('/', (req, res) => {
  res.redirect('/pages/uqudo-sign-in');
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'pages', 'uqudo-sign-in.html'));
});

app.listen(PORT, () => {
  console.log(`
============================================================
🌐 Uqudo Admin Portal Frontend Server
============================================================
Frontend URL: http://localhost:${PORT}
Login Page: http://localhost:${PORT}/pages/uqudo-sign-in
Dashboard: http://localhost:${PORT}/pages/uqudo-dashboard
QR Generator: http://localhost:${PORT}/pages/qr-generator (Public - No Auth)
Clean URLs: Enabled (no .html extension needed)
============================================================
Examples:
  - http://localhost:${PORT}/pages/uqudo-sign-in (works)
  - http://localhost:${PORT}/pages/accounts (works)
  - http://localhost:${PORT}/pages/alerts (works)
  - http://localhost:${PORT}/pages/qr-generator (works - PUBLIC)
============================================================
QR Generator URL Parameters:
  - customer_id: B2B customer identifier (e.g., vfs-global)
  - customer_name: Display name (e.g., VFS Global)
  - journey_id: Uqudo journey configuration ID
  - reference_id: Customer reference (e.g., application number)
  - expiry: Token expiry in minutes (default: 5)
Example:
  http://localhost:${PORT}/pages/qr-generator?customer_id=vfs-global&customer_name=VFS%20Global
============================================================
  `);
});
