-- Add alert_ids column to aml_cases table
-- This allows storing an array of alert IDs associated with each case

ALTER TABLE aml_cases ADD COLUMN IF NOT EXISTS alert_ids JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN aml_cases.alert_ids IS 'Array of alert IDs associated with this case';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'aml_cases' AND column_name = 'alert_ids';
