-- GIN indexes with pg_trgm for text search (Supabase compatible)
-- Run these commands one at a time to avoid timeouts

-- Step 1: Enable pg_trgm extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create GIN indexes WITHOUT CONCURRENTLY
-- Start with smaller indexes first

-- 2.1 Try name index first (usually smallest)
CREATE INDEX IF NOT EXISTS idx_proteins_name_gin_trgm 
ON proteins USING gin (name gin_trgm_ops);

-- If the above succeeds, continue with others:

-- 2.2 Organism name index
CREATE INDEX IF NOT EXISTS idx_proteins_organism_gin_trgm 
ON proteins USING gin (source_organism_scientific_name gin_trgm_ops);

-- 2.3 Entries header index
CREATE INDEX IF NOT EXISTS idx_proteins_entries_header_gin_trgm 
ON proteins USING gin (entries_header gin_trgm_ops);

-- 2.4 For sequence, use a limited prefix (full sequence GIN would be huge)
CREATE INDEX IF NOT EXISTS idx_proteins_seq_prefix_gin 
ON proteins USING gin (substring(sequence, 1, 50) gin_trgm_ops);

-- Step 3: If indexes timeout, try these smaller alternatives:

-- Option A: Create partial indexes (index only a subset)
-- Index only human proteins for name search
CREATE INDEX IF NOT EXISTS idx_proteins_name_gin_human 
ON proteins USING gin (name gin_trgm_ops)
WHERE source_organism_scientific_name = 'Homo sapiens';

-- Option B: Create indexes on shorter substrings
CREATE INDEX IF NOT EXISTS idx_proteins_name_short_gin 
ON proteins USING gin (substring(name, 1, 50) gin_trgm_ops);

-- Option C: Create simple B-tree indexes as fallback
CREATE INDEX IF NOT EXISTS idx_proteins_name_btree 
ON proteins (lower(name) varchar_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_proteins_organism_btree 
ON proteins (lower(source_organism_scientific_name) varchar_pattern_ops);

-- Step 4: Check which indexes were created successfully
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'proteins'
  AND (indexname LIKE '%gin%' OR indexname LIKE '%trgm%')
ORDER BY indexname;

-- Step 5: Test query performance
-- This should show if the GIN index is being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, source_organism_scientific_name
FROM proteins 
WHERE name ILIKE '%kinase%'
LIMIT 10;

-- Step 6: If all GIN indexes fail due to size/timeout, use this approach:
-- Create a search-optimized column with combined text
ALTER TABLE proteins 
ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Update in batches (run multiple times)
UPDATE proteins 
SET search_text = lower(
    coalesce(name, '') || ' ' || 
    coalesce(source_organism_scientific_name, '') || ' ' || 
    coalesce(entries_header, '')
)
WHERE search_text IS NULL
  AND id IN (
    SELECT id FROM proteins 
    WHERE search_text IS NULL 
    LIMIT 10000
);

-- Create GIN index on the combined column (smaller than multiple indexes)
CREATE INDEX IF NOT EXISTS idx_proteins_search_text_gin 
ON proteins USING gin (search_text gin_trgm_ops);

-- Use it for searching across multiple fields
SELECT * FROM proteins 
WHERE search_text LIKE '%kinase human%'
LIMIT 50;