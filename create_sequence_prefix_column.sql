-- Free approach: Add computed columns for sequence prefixes
-- This is much more efficient than searching full sequences

-- Step 1: Add columns for sequence prefixes
ALTER TABLE proteins ADD COLUMN IF NOT EXISTS seq_prefix_5 VARCHAR(5);
ALTER TABLE proteins ADD COLUMN IF NOT EXISTS seq_prefix_10 VARCHAR(10);
ALTER TABLE proteins ADD COLUMN IF NOT EXISTS seq_prefix_20 VARCHAR(20);

-- Step 2: Update the columns in batches (to avoid timeouts)
-- Run these one at a time, monitoring for timeouts

-- Batch 1: First 100k records
UPDATE proteins 
SET 
    seq_prefix_5 = SUBSTRING(sequence, 1, 5),
    seq_prefix_10 = SUBSTRING(sequence, 1, 10),
    seq_prefix_20 = SUBSTRING(sequence, 1, 20)
WHERE id <= 100000 
  AND sequence IS NOT NULL
  AND seq_prefix_5 IS NULL;

-- Batch 2: Next 100k records
UPDATE proteins 
SET 
    seq_prefix_5 = SUBSTRING(sequence, 1, 5),
    seq_prefix_10 = SUBSTRING(sequence, 1, 10),
    seq_prefix_20 = SUBSTRING(sequence, 1, 20)
WHERE id > 100000 AND id <= 200000
  AND sequence IS NOT NULL
  AND seq_prefix_5 IS NULL;

-- Continue with more batches...
-- You can automate this with a function:

CREATE OR REPLACE FUNCTION populate_sequence_prefixes(batch_size INT DEFAULT 50000)
RETURNS void AS $$
DECLARE
    rows_updated INT;
BEGIN
    LOOP
        UPDATE proteins 
        SET 
            seq_prefix_5 = SUBSTRING(sequence, 1, 5),
            seq_prefix_10 = SUBSTRING(sequence, 1, 10),
            seq_prefix_20 = SUBSTRING(sequence, 1, 20)
        WHERE sequence IS NOT NULL
          AND seq_prefix_5 IS NULL
        LIMIT batch_size;
        
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        
        IF rows_updated = 0 THEN
            EXIT;
        END IF;
        
        -- Optional: Add a small delay between batches
        PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function
SELECT populate_sequence_prefixes(25000);

-- Step 3: Create indexes on the prefix columns (much faster than full sequence)
CREATE INDEX idx_seq_prefix_5 ON proteins(seq_prefix_5);
CREATE INDEX idx_seq_prefix_10 ON proteins(seq_prefix_10);
CREATE INDEX idx_seq_prefix_20 ON proteins(seq_prefix_20);

-- Step 4: For even better performance, create a compound index
CREATE INDEX idx_seq_prefixes ON proteins(seq_prefix_5, seq_prefix_10, seq_prefix_20);