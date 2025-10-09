-- Create GIN indexes with pg_trgm for fast text search
-- These indexes enable partial matching (LIKE '%text%') with good performance

-- Step 1: Enable pg_trgm extension (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create GIN indexes for text search columns
-- Note: These indexes can be large and take time to build on 2M records
-- Consider creating them one at a time with extended timeout

-- Set longer timeout for index creation
SET statement_timeout = '2h';

-- 1. GIN index on name (for protein name searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_name_gin_trgm 
ON proteins USING gin (name gin_trgm_ops);

-- 2. GIN index on source_organism_scientific_name (for organism searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_organism_gin_trgm 
ON proteins USING gin (source_organism_scientific_name gin_trgm_ops);

-- 3. GIN index on entries_header (for domain searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_entries_header_gin_trgm 
ON proteins USING gin (entries_header gin_trgm_ops);

-- 4. GIN index on sequence - WARNING: This will be VERY large!
-- For 2M sequences, this could be several GB and take hours to build
-- Consider using prefix columns instead (as we discussed earlier)
-- Only uncomment if you really need full sequence search:

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_sequence_gin_trgm 
-- ON proteins USING gin (sequence gin_trgm_ops);

-- Alternative: Create GIN index only on first part of sequence to reduce size
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_seq_start_gin_trgm 
ON proteins USING gin (substring(sequence, 1, 100) gin_trgm_ops);

-- Reset timeout
SET statement_timeout = '30s';

-- Step 3: Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'proteins'
  AND indexname LIKE '%gin_trgm%'
ORDER BY indexname;

-- Step 4: Test the indexes with sample queries
-- These should now be fast even with partial matching:

-- Test name search (should use idx_proteins_name_gin_trgm)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM proteins 
WHERE name LIKE '%kinase%';

-- Test organism search (should use idx_proteins_organism_gin_trgm)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM proteins 
WHERE source_organism_scientific_name LIKE '%homo%';

-- Test domain search (should use idx_proteins_entries_header_gin_trgm)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM proteins 
WHERE entries_header LIKE '%PF00069%';

-- Test sequence prefix search (should use idx_proteins_seq_start_gin_trgm)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM proteins 
WHERE substring(sequence, 1, 100) LIKE '%MVLSP%';

-- Step 5: Query optimization tips
-- Use these operators for best performance with GIN indexes:

-- 1. LIKE with wildcards (works with gin_trgm_ops)
SELECT * FROM proteins WHERE name LIKE '%kinase%';

-- 2. ILIKE for case-insensitive (also uses GIN index)
SELECT * FROM proteins WHERE name ILIKE '%KINASE%';

-- 3. Similarity search (requires pg_trgm)
SELECT * FROM proteins WHERE name % 'kinaze';  -- Finds similar spellings

-- 4. Distance operator
SELECT * FROM proteins 
WHERE name <-> 'protein kinase' < 0.5  -- Finds names similar to 'protein kinase'
ORDER BY name <-> 'protein kinase';

-- Optional: Create composite GIN index for multiple columns
-- This allows searching across multiple fields efficiently
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proteins_search_gin_trgm
ON proteins USING gin (
    (name || ' ' || 
     coalesce(source_organism_scientific_name, '') || ' ' || 
     coalesce(entries_header, '')) gin_trgm_ops
);

-- Usage: Search across all indexed fields
SELECT * FROM proteins 
WHERE (name || ' ' || 
       coalesce(source_organism_scientific_name, '') || ' ' || 
       coalesce(entries_header, '')) LIKE '%kinase human%';