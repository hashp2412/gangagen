-- ==========================================
-- STEP 1: Enable extensions and increase timeout
-- ==========================================

-- Enable trigram extension for fuzzy text search (MUST RUN FIRST!)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Increase statement timeout to 60 seconds (from default ~3 seconds)
-- This prevents queries from timing out during index creation and searches
ALTER DATABASE postgres SET statement_timeout = '60s';

-- ==========================================
-- STEP 2: Create indexes for fast searching
-- ==========================================

-- 1. GIN trigram index on name for ILIKE queries (case-insensitive pattern matching)
CREATE INDEX IF NOT EXISTS idx_proteins_name_trgm ON proteins
USING gin (name gin_trgm_ops);

-- 2. GIN trigram index on organism for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_proteins_organism_trgm ON proteins
USING gin (source_organism_full_name gin_trgm_ops);

-- 3. GIN trigram index on entries_header for domain searches
CREATE INDEX IF NOT EXISTS idx_proteins_entries_header_trgm ON proteins
USING gin (entries_header gin_trgm_ops);

-- 4. B-tree index on id for fast sorting and pagination
CREATE INDEX IF NOT EXISTS idx_proteins_id ON proteins
USING btree (id);

-- ==========================================
-- STEP 3: Update table statistics
-- ==========================================

-- Analyze the table to update query planner statistics
ANALYZE proteins;

-- Example query that will benefit from these indexes:
-- SELECT id, accession, name, source_organism_full_name, entries_header 
-- FROM proteins 
-- WHERE lower(name) LIKE lower('%kinase%') 
--   AND lower(source_organism_full_name) LIKE lower('%human%')
--   AND entries_header LIKE '%PF03245%'
-- ORDER BY id
-- LIMIT 50 OFFSET 0;