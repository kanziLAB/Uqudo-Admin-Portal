-- Add AML status column to accounts table
-- This tracks whether the account has AML matches or is clear

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS aml_status VARCHAR(50) DEFAULT 'pending';

-- Add comment
COMMENT ON COLUMN accounts.aml_status IS 'AML check status: pending, aml_clear, aml_match_found, under_review';

-- Update existing accounts based on whether they have cases
UPDATE accounts SET aml_status = 'aml_match_found'
WHERE id IN (
  SELECT DISTINCT account_id
  FROM aml_cases
  WHERE resolution_status NOT IN ('resolved', 'closed')
);

UPDATE accounts SET aml_status = 'aml_clear'
WHERE aml_status = 'pending'
AND created_at < NOW() - INTERVAL '1 hour'
AND id NOT IN (SELECT DISTINCT account_id FROM aml_cases);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_aml_status ON accounts(aml_status);
