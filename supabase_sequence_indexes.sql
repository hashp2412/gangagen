-- Create indexes for protein sequence searches
-- These will optimize sequence-based queries

-- 1. Create a B-tree index on sequence for exact matches
CREATE INDEX IF NOT EXISTS idx_proteins_sequence ON proteins 
USING btree (sequence);

-- 2. Create a B-tree index on first 50 characters for prefix searches
CREATE INDEX IF NOT EXISTS idx_proteins_sequence_prefix ON proteins 
USING btree (left(sequence, 50));

-- 3. Create GIN index for substring searches (if pg_trgm is available)
-- This allows for partial sequence matching
CREATE INDEX IF NOT EXISTS idx_proteins_sequence_trgm ON proteins 
USING gin (sequence gin_trgm_ops);

-- 4. Create an index on sequence length for filtering by size
CREATE INDEX IF NOT EXISTS idx_proteins_sequence_length ON proteins 
USING btree (length(sequence));

-- Analyze the table to update statistics
ANALYZE proteins;