-- Test sequence search queries directly in Supabase

-- 1. Check if any sequences exist
SELECT COUNT(*) as total_sequences,
       COUNT(CASE WHEN sequence IS NOT NULL THEN 1 END) as non_null_sequences,
       COUNT(CASE WHEN length(sequence) > 0 THEN 1 END) as non_empty_sequences
FROM proteins
LIMIT 1;

-- 2. Get a sample sequence to test with
SELECT id, accession, name, 
       substring(sequence, 1, 50) as sequence_start,
       length(sequence) as sequence_length
FROM proteins
WHERE sequence IS NOT NULL 
  AND length(sequence) > 10
LIMIT 5;

-- 3. Test a simple sequence search (replace 'MVL' with an actual sequence from above)
SELECT COUNT(*) 
FROM proteins 
WHERE sequence LIKE 'MVL%'
LIMIT 1;

-- 4. Check if the sequence column has any indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'proteins'
  AND indexdef LIKE '%sequence%';

-- 5. Test with a very simple query
SELECT id, accession, name
FROM proteins
WHERE sequence LIKE 'A%'
LIMIT 5;