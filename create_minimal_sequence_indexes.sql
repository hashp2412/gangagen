-- Minimal indexes for sequence search on 2M records
-- Run these one at a time to avoid timeouts

-- Option 1: Create a functional index on first few characters only
-- This is much faster than indexing the full sequence
CREATE INDEX IF NOT EXISTS idx_seq_start_5 
ON proteins (substring(sequence, 1, 5));

-- If the above times out, try even shorter:
CREATE INDEX IF NOT EXISTS idx_seq_start_3 
ON proteins (substring(sequence, 1, 3));

-- Option 2: Create a partial index for sequences that start with common amino acids
-- This creates smaller, more targeted indexes
CREATE INDEX IF NOT EXISTS idx_seq_starts_m 
ON proteins (sequence) 
WHERE sequence LIKE 'M%';

CREATE INDEX IF NOT EXISTS idx_seq_starts_a 
ON proteins (sequence) 
WHERE sequence LIKE 'A%';

-- Option 3: Create a helper table (fastest approach)
-- This avoids indexing the large sequence column directly
CREATE TABLE IF NOT EXISTS sequence_search_helper (
    protein_id INTEGER PRIMARY KEY,
    seq_prefix_3 VARCHAR(3),
    seq_prefix_5 VARCHAR(5),
    seq_prefix_10 VARCHAR(10)
);

-- Populate the helper table in batches to avoid timeout
INSERT INTO sequence_search_helper (protein_id, seq_prefix_3, seq_prefix_5, seq_prefix_10)
SELECT 
    id,
    substring(sequence, 1, 3),
    substring(sequence, 1, 5),
    substring(sequence, 1, 10)
FROM proteins
WHERE sequence IS NOT NULL
  AND length(sequence) >= 3
  AND id <= 100000  -- Process first 100k records
ON CONFLICT (protein_id) DO NOTHING;

-- Create indexes on the helper table (much faster)
CREATE INDEX idx_helper_prefix_3 ON sequence_search_helper (seq_prefix_3);
CREATE INDEX idx_helper_prefix_5 ON sequence_search_helper (seq_prefix_5);
CREATE INDEX idx_helper_prefix_10 ON sequence_search_helper (seq_prefix_10);

-- Continue populating in batches:
-- Run these one at a time, increasing the ID range each time
-- INSERT INTO sequence_search_helper ... WHERE id > 100000 AND id <= 200000
-- INSERT INTO sequence_search_helper ... WHERE id > 200000 AND id <= 300000
-- etc.