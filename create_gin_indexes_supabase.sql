-- GIN indexes for Supabase (without CONCURRENTLY)
-- Run these one at a time to avoid timeouts

-- Step 1: Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create indexes one by one
-- Each index might take several minutes on 2M records

-- 2.1 Name index (most important for general search)
CREATE INDEX IF NOT EXISTS idx_proteins_name_gin_trgm 
ON proteins USING gin (name gin_trgm_ops);

-- Check if it worked
SELECT pg_size_pretty(pg_relation_size('idx_proteins_name_gin_trgm')) as index_size;

-- 2.2 Organism name index
CREATE INDEX IF NOT EXISTS idx_proteins_organism_gin_trgm 
ON proteins USING gin (source_organism_scientific_name gin_trgm_ops);

-- 2.3 Entries header index (for domain searches)
CREATE INDEX IF NOT EXISTS idx_proteins_entries_header_gin_trgm 
ON proteins USING gin (entries_header gin_trgm_ops);

-- 2.4 Limited sequence index (only first 50 characters to keep size manageable)
CREATE INDEX IF NOT EXISTS idx_proteins_seq_prefix_gin 
ON proteins USING gin (substring(sequence, 1, 50) gin_trgm_ops);

-- Step 3: If the above indexes timeout, try smaller ones first:

-- Alternative 1: Create regular B-tree indexes first (faster to build)
CREATE INDEX IF NOT EXISTS idx_proteins_name_lower 
ON proteins (lower(name));

CREATE INDEX IF NOT EXISTS idx_proteins_organism_lower 
ON proteins (lower(source_organism_scientific_name));

-- Alternative 2: Create partial GIN indexes (smaller, faster to build)
-- Only index proteins from specific organisms
CREATE INDEX IF NOT EXISTS idx_proteins_name_gin_human 
ON proteins USING gin (name gin_trgm_ops)
WHERE source_organism_scientific_name LIKE '%Homo sapiens%';

-- Alternative 3: Create indexes on shorter text fields
CREATE INDEX IF NOT EXISTS idx_proteins_name_prefix_gin 
ON proteins USING gin (substring(name, 1, 30) gin_trgm_ops);

-- Step 4: Optimize your queries to use these indexes

-- Good: Uses GIN index for fast partial matching
SELECT * FROM proteins 
WHERE name LIKE '%kinase%' 
LIMIT 50;

-- Better: Case-insensitive search also uses GIN
SELECT * FROM proteins 
WHERE name ILIKE '%kinase%' 
LIMIT 50;

-- Best: Combine multiple conditions
SELECT * FROM proteins 
WHERE name ILIKE '%kinase%' 
  AND source_organism_scientific_name ILIKE '%homo%'
LIMIT 50;

-- Step 5: Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'proteins'
ORDER BY idx_scan DESC;

-- Step 6: If indexes are too large or slow, consider materialized views
CREATE MATERIALIZED VIEW IF NOT EXISTS protein_search_view AS
SELECT 
    id,
    accession,
    name,
    source_organism_scientific_name,
    entries_header,
    substring(sequence, 1, 20) as seq_prefix,
    length
FROM proteins;

-- Create indexes on the materialized view (much faster)
CREATE INDEX idx_mv_name_gin ON protein_search_view USING gin (name gin_trgm_ops);
CREATE INDEX idx_mv_organism_gin ON protein_search_view USING gin (source_organism_scientific_name gin_trgm_ops);

-- Refresh periodically
REFRESH MATERIALIZED VIEW protein_search_view;