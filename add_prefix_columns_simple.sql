-- Simple approach to add prefix columns for sequence search
-- Run these commands one by one in Supabase SQL editor

-- Step 1: Add the prefix columns (if they don't exist)
ALTER TABLE proteins 
ADD COLUMN IF NOT EXISTS seq_prefix_3 VARCHAR(3),
ADD COLUMN IF NOT EXISTS seq_prefix_5 VARCHAR(5),
ADD COLUMN IF NOT EXISTS seq_prefix_10 VARCHAR(10);

-- Step 2: Update prefix columns in batches
-- This updates 10,000 records at a time to avoid timeouts
-- Run this multiple times until all records are updated

UPDATE proteins 
SET 
    seq_prefix_3 = SUBSTRING(sequence, 1, 3),
    seq_prefix_5 = SUBSTRING(sequence, 1, 5),
    seq_prefix_10 = SUBSTRING(sequence, 1, 10)
WHERE sequence IS NOT NULL
  AND LENGTH(sequence) >= 3
  AND seq_prefix_3 IS NULL
LIMIT 10000;

-- Check progress
SELECT 
    COUNT(*) as total_proteins,
    COUNT(seq_prefix_3) as updated_proteins,
    COUNT(*) - COUNT(seq_prefix_3) as remaining_proteins
FROM proteins
WHERE sequence IS NOT NULL;

-- Step 3: Create indexes on prefix columns (run after all data is updated)
CREATE INDEX IF NOT EXISTS idx_seq_prefix_3 ON proteins(seq_prefix_3);
CREATE INDEX IF NOT EXISTS idx_seq_prefix_5 ON proteins(seq_prefix_5);
CREATE INDEX IF NOT EXISTS idx_seq_prefix_10 ON proteins(seq_prefix_10);

-- Step 4: Test the search
-- This should be very fast with indexes
SELECT COUNT(*) 
FROM proteins 
WHERE seq_prefix_5 LIKE 'MVLSP%';

-- Optional: Create a function to update remaining records automatically
CREATE OR REPLACE FUNCTION update_sequence_prefixes_batch()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE proteins 
    SET 
        seq_prefix_3 = SUBSTRING(sequence, 1, 3),
        seq_prefix_5 = SUBSTRING(sequence, 1, 5),
        seq_prefix_10 = SUBSTRING(sequence, 1, 10)
    WHERE sequence IS NOT NULL
      AND LENGTH(sequence) >= 3
      AND seq_prefix_3 IS NULL
    LIMIT 10000;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Call the function repeatedly until it returns 0
SELECT update_sequence_prefixes_batch();