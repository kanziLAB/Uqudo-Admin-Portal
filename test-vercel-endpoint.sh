#!/bin/bash

# Test Vercel Endpoint - SDK JWS Submission
# This script tests the deployed endpoint and helps diagnose issues

echo "======================================"
echo "Testing Vercel SDK JWS Endpoint"
echo "======================================"
echo ""

# Configuration
VERCEL_URL="https://uqudo-admin-portal.vercel.app"
ENDPOINT="/api/sdk-verification/enrollment-jws"
FULL_URL="${VERCEL_URL}${ENDPOINT}"

echo "Target URL: $FULL_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "----------------------"
curl -s "${VERCEL_URL}/health" | jq '.' 2>/dev/null || curl -s "${VERCEL_URL}/health"
echo ""
echo ""

# Test 2: OPTIONS (CORS Preflight)
echo "Test 2: CORS Preflight (OPTIONS)"
echo "--------------------------------"
curl -X OPTIONS -v "${FULL_URL}" 2>&1 | grep -E "(< HTTP|Access-Control)"
echo ""
echo ""

# Test 3: POST with Invalid Token (should return 400)
echo "Test 3: POST with Invalid Token"
echo "--------------------------------"
echo "Expected: 400 Bad Request with error message"
curl -X POST "${FULL_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{"token":"invalid-token"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "${FULL_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{"token":"invalid-token"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 4: POST with Mock JWT Token (should return 400 or process)
echo "Test 4: POST with Mock JWT Token"
echo "---------------------------------"
echo "Expected: 400 (invalid format) or 200 (if format valid)"

# Create a simple JWT-like token (won't be valid but tests format handling)
MOCK_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImRvY3VtZW50cyI6W3sidHlwZSI6InBhc3Nwb3J0IiwicmVhZGluZyI6eyJkYXRhIjp7ImZ1bGxOYW1lIjoiVEVTVCBVU0VSIiwiaWROdW1iZXIiOiJURVNUMTIzIn19fV0sInZlcmlmaWNhdGlvbnMiOlt7InR5cGUiOiJmYWNlX21hdGNoIiwicmVzdWx0Ijp7Im1hdGNoIjp0cnVlLCJzY29yZSI6MC45NX19XX19.signature"

curl -X POST "${FULL_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d "{\"token\":\"${MOCK_TOKEN}\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "${FULL_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d "{\"token\":\"${MOCK_TOKEN}\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

echo "======================================"
echo "Diagnostic Questions:"
echo "======================================"
echo ""
echo "1. Did Test 1 (Health Check) return success? (Yes/No)"
echo "2. Did Test 2 show Access-Control headers? (Yes/No)"
echo "3. What HTTP status did Test 3 return? (200/400/404/405/500)"
echo "4. What HTTP status did Test 4 return? (200/400/404/405/500)"
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Check Vercel Dashboard → Your Project → Logs"
echo "2. Look for logs around your mobile submission time"
echo "3. Check what response your mobile app received"
echo "4. Run this SQL in Supabase to check for records:"
echo ""
echo "   SELECT id, user_id, full_name, tenant_id, created_at"
echo "   FROM accounts"
echo "   ORDER BY created_at DESC"
echo "   LIMIT 10;"
echo ""
