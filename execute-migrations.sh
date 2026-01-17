#!/bin/bash

# Execute database migrations for Supabase
# This script runs SQL migrations using the Supabase REST API

SUPABASE_URL="https://kpmcigujptbolpdlfojo.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M"

echo "🚀 Starting database migrations..."
echo ""

# Migration 1: SDK Analytics Columns
echo "📄 Migration 1: Adding SDK analytics columns..."

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sdk_source JSONB, ADD COLUMN IF NOT EXISTS sdk_verifications JSONB, ADD COLUMN IF NOT EXISTS sdk_documents JSONB, ADD COLUMN IF NOT EXISTS sdk_analytics JSONB;"
  }'

echo ""
echo "✅ SDK analytics columns added"
echo ""

# Migration 2: Face Images Columns
echo "📄 Migration 2: Adding face images columns..."

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS face_image_url TEXT, ADD COLUMN IF NOT EXISTS document_front_url TEXT, ADD COLUMN IF NOT EXISTS document_back_url TEXT, ADD COLUMN IF NOT EXISTS face_image_base64 TEXT, ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;"
  }'

echo ""
echo "✅ Face images columns added"
echo ""

echo "🎉 All migrations completed!"
echo ""
echo "📝 Summary:"
echo "   ✓ SDK analytics columns (sdk_source, sdk_verifications, sdk_documents, sdk_analytics)"
echo "   ✓ Face images columns (face_image_url, face_image_base64, document URLs)"
echo ""
echo "⚠️  Note: You may need to create indexes manually in Supabase SQL Editor:"
echo "   CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);"
echo "   CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched ON accounts(images_fetched_at) WHERE images_fetched_at IS NOT NULL;"
echo ""
