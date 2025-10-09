-- Fixed approach to add prefix columns for sequence search
-- Works with standard PostgreSQL/Supabase

-- Step 1: Add the prefix columns (if they don't exist)
ALTER TABLE proteins 
ADD COLUMN IF NOT EXISTS seq_prefix_3 VARCHAR(3),
ADD COLUMN IF NOT EXISTS seq_prefix_5 VARCHAR(5),
ADD COLUMN IF NOT EXISTS seq_prefix_10 VARCHAR(10);

-- Step 2: Update prefix columns using subquery with LIMIT
-- This updates 10,000 records at a time to avoid timeouts

UPDATE proteins 
SET 
    seq_prefix_3 = SUBSTRING(sequence, 1, 3),
    seq_prefix_5 = SUBSTRING(sequence, 1, 5),
    seq_prefix_10 = SUBSTRING(sequence, 1, 10)
WHERE id IN (
    SELECT id 
    FROM proteins 
    WHERE sequence IS NOT NULL
      AND LENGTH(sequence) >= 3
      AND seq_prefix_3 IS NULL
    LIMIT 10000
);

-- Alternative approach using CTID (more efficient)
UPDATE proteins 
SET 
    seq_prefix_3 = SUBSTRING(sequence, 1, 3),
    seq_prefix_5 = SUBSTRING(sequence, 1, 5),
    seq_prefix_10 = SUBSTRING(sequence, 1, 10)
WHERE ctid IN (
    SELECT ctid 
    FROM proteins 
    WHERE sequence IS NOT NULL
      AND LENGTH(sequence) >= 3
      AND seq_prefix_3 IS NULL
    LIMIT 10000
);

-- Check progress
SELECT 
    COUNT(*) as total_proteins,
    COUNT(seq_prefix_3) as updated_proteins,
    COUNT(*) - COUNT(seq_prefix_3) as remaining_proteins
FROM proteins
WHERE sequence IS NOT NULL;

-- Step 3: Automated batch update function
CREATE OR REPLACE FUNCTION update_sequence_prefixes_batch(batch_size INT DEFAULT 10000)
RETURNS TABLE(updated_count INT, remaining_count INT) AS $$
DECLARE
    rows_updated INT;
    rows_remaining INT;
BEGIN
    -- Update batch
    UPDATE proteins 
    SET 
        seq_prefix_3 = SUBSTRING(sequence, 1, 3),
        seq_prefix_5 = SUBSTRING(sequence, 1, 5),
        seq_prefix_10 = SUBSTRING(sequence, 1, 10)
    WHERE id IN (
        SELECT id 
        FROM proteins 
        WHERE sequence IS NOT NULL
          AND LENGTH(sequence) >= 3
          AND seq_prefix_3 IS NULL
        LIMIT batch_size
    );
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Count remaining
    SELECT COUNT(*) INTO rows_remaining
    FROM proteins
    WHERE sequence IS NOT NULL
      AND LENGTH(sequence) >= 3
      AND seq_prefix_3 IS NULL;
    
    RETURN QUERY SELECT rows_updated, rows_remaining;
END;
$$ LANGUAGE plpgsql;

-- Run the batch update (returns updated count and remaining count)
SELECT * FROM update_sequence_prefixes_batch(10000);

-- Keep running until remaining_count is 0
-- You can also run this in a loop:
DO $$
DECLARE
    result RECORD;
    total_updated INT := 0;
BEGIN
    LOOP
        SELECT * INTO result FROM update_sequence_prefixes_batch(5000);
        total_updated := total_updated + result.updated_count;
        
        RAISE NOTICE 'Updated % records, % remaining', result.updated_count, result.remaining_count;
        
        EXIT WHEN result.remaining_count = 0 OR result.updated_count = 0;
        
        -- Small delay to prevent overload
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RAISE NOTICE 'Total updated: %', total_updated;
END $$;

-- Step 4: Create indexes (run after all data is updated)
CREATE INDEX IF NOT EXISTS idx_seq_prefix_3 ON proteins(seq_prefix_3);
CREATE INDEX IF NOT EXISTS idx_seq_prefix_5 ON proteins(seq_prefix_5);
CREATE INDEX IF NOT EXISTS idx_seq_prefix_10 ON proteins(seq_prefix_10);

-- Step 5: Verify indexes are working
EXPLAIN ANALYZE
SELECT COUNT(*) 
FROM proteins 
WHERE seq_prefix_5 = 'MVLSP';