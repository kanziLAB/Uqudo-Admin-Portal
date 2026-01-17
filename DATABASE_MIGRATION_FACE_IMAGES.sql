-- Migration: Add face image and document images to accounts table
-- Date: 2026-01-17
-- Description: Stores face selfie and document images from SDK verification

-- Add columns for images
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS face_image_url TEXT,
ADD COLUMN IF NOT EXISTS document_front_url TEXT,
ADD COLUMN IF NOT EXISTS document_back_url TEXT,
ADD COLUMN IF NOT EXISTS face_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN accounts.face_image_url IS 'URL to face selfie image from SDK';
COMMENT ON COLUMN accounts.document_front_url IS 'URL to document front image';
COMMENT ON COLUMN accounts.document_back_url IS 'URL to document back image';
COMMENT ON COLUMN accounts.face_image_base64 IS 'Base64 encoded face image for quick display';
COMMENT ON COLUMN accounts.images_fetched_at IS 'Timestamp when images were fetched from Uqudo API';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched
ON accounts(images_fetched_at)
WHERE images_fetched_at IS NOT NULL;

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
AND column_name IN ('face_image_url', 'document_front_url', 'document_back_url', 'face_image_base64', 'images_fetched_at');
