-- Optional: Create RPC function for optimized sequence search
-- This provides better performance for sequence searches

CREATE OR REPLACE FUNCTION search_proteins_by_sequence(
  p_sequence TEXT,
  p_search_type TEXT DEFAULT 'partial', -- 'exact', 'prefix', 'partial'
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  accession TEXT,
  name TEXT,
  source_organism_full_name TEXT,
  entries_header TEXT,
  sequence TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
  v_clean_sequence TEXT;
BEGIN
  -- Clean the sequence (remove non-amino acid characters)
  v_clean_sequence := UPPER(REGEXP_REPLACE(p_sequence, '[^ACDEFGHIKLMNPQRSTVWY]', '', 'g'));
  
  -- Validate sequence length
  IF LENGTH(v_clean_sequence) < 3 THEN
    RAISE EXCEPTION 'Sequence must be at least 3 amino acids long';
  END IF;

  -- Get total count based on search type
  IF p_search_type = 'exact' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM proteins p
    WHERE p.sequence = v_clean_sequence;
  ELSIF p_search_type = 'prefix' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM proteins p
    WHERE p.sequence LIKE v_clean_sequence || '%';
  ELSE -- partial
    SELECT COUNT(*) INTO v_total_count
    FROM proteins p
    WHERE p.sequence LIKE '%' || v_clean_sequence || '%';
  END IF;

  -- Return paginated results with total count
  IF p_search_type = 'exact' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.accession,
      p.name,
      p.source_organism_full_name,
      p.entries_header,
      p.sequence,
      v_total_count
    FROM proteins p
    WHERE p.sequence = v_clean_sequence
    ORDER BY p.id
    LIMIT p_limit
    OFFSET p_offset;
  ELSIF p_search_type = 'prefix' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.accession,
      p.name,
      p.source_organism_full_name,
      p.entries_header,
      p.sequence,
      v_total_count
    FROM proteins p
    WHERE p.sequence LIKE v_clean_sequence || '%'
    ORDER BY p.id
    LIMIT p_limit
    OFFSET p_offset;
  ELSE -- partial
    RETURN QUERY
    SELECT 
      p.id,
      p.accession,
      p.name,
      p.source_organism_full_name,
      p.entries_header,
      p.sequence,
      v_total_count
    FROM proteins p
    WHERE p.sequence LIKE '%' || v_clean_sequence || '%'
    ORDER BY p.id
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_proteins_by_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION search_proteins_by_sequence TO anon;