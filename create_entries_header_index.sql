-- Create GIN index for entries_header (domain searches)
-- This enables fast searches like "PF00069" or partial domain matches

-- Step 1: Create the GIN index on entries_header
CREATE INDEX IF NOT EXISTS idx_proteins_entries_header_gin_trgm 
ON proteins USING gin (entries_header gin_trgm_ops);

-- Step 2: Verify the index was created
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'proteins' 
  AND indexname = 'idx_proteins_entries_header_gin_trgm';

-- Step 3: Test the index performance
-- Test with a common domain identifier
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM proteins 
WHERE entries_header LIKE '%PF00069%';

-- Test with partial domain search
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM proteins 
WHERE entries_header LIKE '%PF%';

-- Step 4: Sample queries to find actual domain values
-- Get some sample entries_header values to test with
SELECT DISTINCT 
    substring(entries_header FROM 'PF[0-9]+') as domain,
    COUNT(*) as count
FROM proteins 
WHERE entries_header IS NOT NULL
GROUP BY domain
ORDER BY count DESC
LIMIT 20;

-- Step 5: Test combined search across all indexed columns
-- This should be very fast with all three GIN indexes
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    id,
    accession,
    name,
    source_organism_full_name,
    entries_header
FROM proteins 
WHERE name LIKE '%kinase%' 
  OR source_organism_full_name LIKE '%human%'
  OR entries_header LIKE '%PF00069%'
LIMIT 50;

-- Step 6: Check all GIN indexes status
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
    idx_scan as times_used
FROM pg_stat_user_indexes
WHERE tablename = 'proteins' 
  AND indexname LIKE '%gin_trgm%'
ORDER BY indexname;