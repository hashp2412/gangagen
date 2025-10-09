-- Test if the RPC function exists and works
-- Run this in your Supabase SQL editor

-- 1. Check if the function exists
SELECT 
    proname as function_name,
    pronargs as num_args
FROM 
    pg_proc 
WHERE 
    proname = 'search_proteins_optimized';

-- 2. Test the function with sample data
SELECT * FROM search_proteins_optimized(
    p_name := 'kinase',
    p_organism := NULL,
    p_domain := NULL,
    p_limit := 5,
    p_offset := 0
);

-- 3. Alternative test with all parameters null
SELECT * FROM search_proteins_optimized(
    NULL,
    NULL,
    'PF03245',
    5,
    0
);