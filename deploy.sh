#!/bin/bash

# Uqudo Admin Portal - Vercel Deployment Script
# This script deploys the application to Vercel without requiring global installation

echo "=========================================="
echo "Uqudo Admin Portal - Vercel Deployment"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Project directory confirmed"
echo ""

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Deployment configuration missing."
    exit 1
fi

echo "✅ Vercel configuration found"
echo ""

echo "🚀 Starting deployment using npx vercel..."
echo ""
echo "You will be prompted to:"
echo "  1. Login to Vercel (if not already logged in)"
echo "  2. Set up project settings"
echo "  3. Confirm deployment"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Deploy using npx (doesn't require global installation)
npx vercel

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Note your deployment URL from above"
echo "2. Configure environment variables in Vercel Dashboard:"
echo "   https://vercel.com/dashboard"
echo "3. Go to: Settings → Environment Variables"
echo "4. Add required variables (see .env.example)"
echo "5. Deploy to production: npx vercel --prod"
echo ""
echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
