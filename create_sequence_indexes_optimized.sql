-- Optimized index creation for large tables (2M records)
-- Run these one at a time to avoid timeouts

-- Step 1: Set a longer timeout for index creation
SET statement_timeout = '60min';

-- Step 2: Create indexes with CONCURRENTLY to avoid locking
-- This allows normal database operations to continue

-- Index 1: Prefix search (most important)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_seq_prefix_20
ON proteins (substring(sequence, 1, 20));

-- Index 2: Very short prefix for quick lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_seq_prefix_5
ON proteins (substring(sequence, 1, 5));

-- Index 3: First character index for alphabetical filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_seq_first_char
ON proteins (substring(sequence, 1, 1));

-- Step 3: Create a materialized view for common sequence searches (optional)
-- This pre-computes common sequence patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS sequence_search_helper AS
SELECT 
    id,
    accession,
    name,
    source_organism_full_name,
    entries_header,
    length,
    substring(sequence, 1, 20) as seq_prefix_20,
    substring(sequence, 1, 5) as seq_prefix_5,
    substring(sequence, 1, 1) as seq_first_char
FROM proteins
WHERE sequence IS NOT NULL 
  AND length(sequence) > 0;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_seq_prefix_20 ON sequence_search_helper (seq_prefix_20);
CREATE INDEX IF NOT EXISTS idx_mv_seq_prefix_5 ON sequence_search_helper (seq_prefix_5);
CREATE INDEX IF NOT EXISTS idx_mv_seq_first_char ON sequence_search_helper (seq_first_char);

-- Step 4: Analyze to update statistics
ANALYZE proteins;

-- Reset timeout
SET statement_timeout = '30s';