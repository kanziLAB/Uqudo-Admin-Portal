#!/usr/bin/env node

/**
 * Configuration Wizard for Uqudo Admin Portal
 * Helps set up .env file with Supabase credentials
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

async function main() {
  console.log('='.repeat(70));
  console.log('  Uqudo Admin Portal - Configuration Wizard');
  console.log('='.repeat(70));
  console.log('');
  console.log('This wizard will help you create the .env configuration file.');
  console.log('');
  console.log('You will need your Supabase credentials from:');
  console.log('  Supabase Dashboard → Settings → API');
  console.log('');

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('');
  console.log('-'.repeat(70));
  console.log('  Step 1: Supabase Configuration');
  console.log('-'.repeat(70));
  console.log('');

  const supabaseUrl = await question('Enter your Supabase Project URL: ');

  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    console.log('❌ Invalid Supabase URL. It should start with https://');
    rl.close();
    return;
  }

  const supabaseAnonKey = await question('Enter your Supabase Anon Key: ');

  if (!supabaseAnonKey || supabaseAnonKey.length < 100) {
    console.log('❌ Invalid Anon Key. It should be a long string (200+ characters)');
    rl.close();
    return;
  }

  const supabaseServiceKey = await question('Enter your Supabase Service Role Key: ');

  if (!supabaseServiceKey || supabaseServiceKey.length < 100) {
    console.log('❌ Invalid Service Role Key. It should be a long string (200+ characters)');
    rl.close();
    return;
  }

  console.log('');
  console.log('-'.repeat(70));
  console.log('  Step 2: Server Configuration');
  console.log('-'.repeat(70));
  console.log('');

  const port = await question('Enter backend port (default: 3000): ') || '3000';
  const frontendUrl = await question('Enter frontend URL (default: http://localhost:8080): ') || 'http://localhost:8080';

  console.log('');
  console.log('-'.repeat(70));
  console.log('  Step 3: Security (Generating JWT Secrets)');
  console.log('-'.repeat(70));
  console.log('');

  const jwtSecret = generateSecret();
  const jwtRefreshSecret = generateSecret();

  console.log('✓ Generated JWT_SECRET');
  console.log('✓ Generated JWT_REFRESH_SECRET');

  console.log('');
  console.log('-'.repeat(70));
  console.log('  Creating .env file...');
  console.log('-'.repeat(70));
  console.log('');

  // Create .env content
  const envContent = `# Uqudo Admin Portal - Environment Configuration
# Generated on ${new Date().toISOString()}

# Server Configuration
NODE_ENV=development
PORT=${port}
API_BASE_URL=http://localhost:${port}

# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration (for Bull queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=${frontendUrl},http://localhost:${port}

# File Upload
MAX_FILE_SIZE_MB=100
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,xls,xlsx,csv

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Feature Flags
ENABLE_WORKFLOW_ORCHESTRATOR=true
ENABLE_AUTO_ALERTS=true
ENABLE_BIOMETRIC_DISPLAY=true
ENABLE_DEVICE_ATTESTATION=true
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);

  console.log('✓ .env file created successfully!');
  console.log('');
  console.log('='.repeat(70));
  console.log('  Configuration Summary');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Supabase URL:    ${supabaseUrl}`);
  console.log(`Backend Port:    ${port}`);
  console.log(`Frontend URL:    ${frontendUrl}`);
  console.log(`Config File:     ${envPath}`);
  console.log('');
  console.log('✓ JWT secrets generated securely');
  console.log('');
  console.log('='.repeat(70));
  console.log('  Next Steps');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Verify database schema is executed in Supabase');
  console.log('2. Create demo user: node create-user.js');
  console.log('3. Install dependencies: npm install');
  console.log('4. Start backend: npm run dev');
  console.log('5. Open frontend: http://localhost:8080/pages/uqudo-sign-in.html');
  console.log('');

  rl.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});
