-- Create indexes for optimized query performance on 2M records
-- These indexes will significantly reduce query time from minutes to seconds

-- 1. B-tree index on name column for case-insensitive text search
CREATE INDEX IF NOT EXISTS idx_proteins_name_pattern ON proteins 
USING btree (lower(name) varchar_pattern_ops);

-- 2. B-tree index on organism column for case-insensitive text search
CREATE INDEX IF NOT EXISTS idx_proteins_organism_pattern ON proteins 
USING btree (lower(source_organism_full_name) varchar_pattern_ops);

-- 3. GIN index on entries_header for domain searches
CREATE INDEX IF NOT EXISTS idx_proteins_entries_header ON proteins 
USING gin (entries_header gin_trgm_ops);

-- 4. Composite index for combined filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_proteins_composite ON proteins 
USING btree (lower(name), lower(source_organism_full_name));

-- 5. Index on id for fast primary key lookups and pagination
CREATE INDEX IF NOT EXISTS idx_proteins_id ON proteins 
USING btree (id);

-- Enable trigram extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Analyze the table to update statistics after creating indexes
ANALYZE proteins;

-- Example query that will benefit from these indexes:
-- SELECT id, accession, name, source_organism_full_name, entries_header 
-- FROM proteins 
-- WHERE lower(name) LIKE lower('%kinase%') 
--   AND lower(source_organism_full_name) LIKE lower('%human%')
--   AND entries_header LIKE '%PF03245%'
-- ORDER BY id
-- LIMIT 50 OFFSET 0;