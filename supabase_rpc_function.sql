-- Create an optimized RPC function for protein search
-- This function provides better performance for complex filtering

CREATE OR REPLACE FUNCTION search_proteins_optimized(
  p_name TEXT DEFAULT NULL,
  p_organism TEXT DEFAULT NULL,
  p_domain TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  accession TEXT,
  name TEXT,
  source_organism_full_name TEXT,
  entries_header TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Get total count first
  SELECT COUNT(*)
  INTO v_total_count
  FROM proteins p
  WHERE 
    (p_name IS NULL OR p.name ILIKE '%' || p_name || '%') AND
    (p_organism IS NULL OR p.source_organism_full_name ILIKE '%' || p_organism || '%') AND
    (p_domain IS NULL OR p.entries_header LIKE '%' || p_domain || '%');

  -- Return paginated results with total count
  RETURN QUERY
  SELECT 
    p.id,
    p.accession,
    p.name,
    p.source_organism_full_name,
    p.entries_header,
    v_total_count
  FROM proteins p
  WHERE 
    (p_name IS NULL OR p.name ILIKE '%' || p_name || '%') AND
    (p_organism IS NULL OR p.source_organism_full_name ILIKE '%' || p_organism || '%') AND
    (p_domain IS NULL OR p.entries_header LIKE '%' || p_domain || '%')
  ORDER BY p.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_proteins_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION search_proteins_optimized TO anon;