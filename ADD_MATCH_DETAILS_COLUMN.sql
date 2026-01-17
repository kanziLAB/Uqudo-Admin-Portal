-- Add match_details column to aml_cases table
-- This column will store detailed information about matched entities from background checks

ALTER TABLE aml_cases
ADD COLUMN IF NOT EXISTS match_details JSONB DEFAULT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN aml_cases.match_details IS 'JSONB column storing detailed match information including matched_entities array, match_count, and highest_risk_score';

-- Create index for faster queries on match_details
CREATE INDEX IF NOT EXISTS idx_aml_cases_match_details ON aml_cases USING GIN (match_details);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'aml_cases' AND column_name = 'match_details';
