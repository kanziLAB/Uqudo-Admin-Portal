# IMPORTANT: Run This SQL Migration First!

Before creating cases, you MUST add the `alert_ids` column to the database.

## Steps:

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Add alert_ids column to aml_cases table
ALTER TABLE aml_cases ADD COLUMN IF NOT EXISTS alert_ids JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN aml_cases.alert_ids IS 'Array of alert IDs associated with this case';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'aml_cases' AND column_name = 'alert_ids';
```

4. Click **Run**
5. You should see a result showing the new column

## After Running:

✅ Case creation will work
✅ You can select alerts and link them to cases
✅ The alert_ids will be stored as a JSON array in each case

---

**Location of migration file**: `/backend/migrations/add_alert_ids_to_cases.sql`
