-- Optimized RPC function for sequence search
-- This handles the search server-side for better performance

CREATE OR REPLACE FUNCTION search_proteins_by_sequence_optimized(
  p_sequence TEXT,
  p_search_type TEXT DEFAULT 'prefix',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  accession TEXT,
  name TEXT,
  source_organism_full_name TEXT,
  entries_header TEXT,
  length INTEGER,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
  v_clean_sequence TEXT;
  v_search_length INT;
BEGIN
  -- Clean the sequence
  v_clean_sequence := UPPER(REGEXP_REPLACE(p_sequence, '[^ACDEFGHIKLMNPQRSTVWY]', '', 'g'));
  v_search_length := LENGTH(v_clean_sequence);
  
  -- Validate
  IF v_search_length < 3 THEN
    RAISE EXCEPTION 'Sequence must be at least 3 amino acids long';
  END IF;

  -- For long partial searches, convert to prefix for performance
  IF p_search_type = 'partial' AND v_search_length > 10 THEN
    p_search_type := 'prefix';
  END IF;

  -- Limit search sequence length
  IF v_search_length > 20 THEN
    v_clean_sequence := SUBSTRING(v_clean_sequence, 1, 20);
  END IF;

  -- Get count using appropriate method
  IF p_search_type = 'exact' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM proteins p
    WHERE p.sequence = v_clean_sequence;
  ELSIF p_search_type = 'prefix' THEN
    -- Use substring for better index usage
    SELECT COUNT(*) INTO v_total_count
    FROM proteins p
    WHERE SUBSTRING(p.sequence, 1, v_search_length) = v_clean_sequence;
  ELSE -- partial
    -- Only for short sequences
    IF v_search_length <= 5 THEN
      SELECT COUNT(*) INTO v_total_count
      FROM proteins p
      WHERE p.sequence LIKE '%' || v_clean_sequence || '%'
      LIMIT 10000; -- Cap counting for performance
    ELSE
      -- Convert to prefix search
      SELECT COUNT(*) INTO v_total_count
      FROM proteins p
      WHERE SUBSTRING(p.sequence, 1, v_search_length) = v_clean_sequence;
    END IF;
  END IF;

  -- Return results
  IF p_search_type = 'exact' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.accession,
      p.name,
      p.source_organism_full_name,
      p.entries_header,
      p.length,
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
      p.length,
      v_total_count
    FROM proteins p
    WHERE SUBSTRING(p.sequence, 1, v_search_length) = v_clean_sequence
    ORDER BY p.id
    LIMIT p_limit
    OFFSET p_offset;
  ELSE -- partial (only for short sequences)
    IF v_search_length <= 5 THEN
      RETURN QUERY
      SELECT 
        p.id,
        p.accession,
        p.name,
        p.source_organism_full_name,
        p.entries_header,
        p.length,
        v_total_count
      FROM proteins p
      WHERE p.sequence LIKE '%' || v_clean_sequence || '%'
      ORDER BY p.id
      LIMIT p_limit
      OFFSET p_offset;
    ELSE
      -- Use prefix search as fallback
      RETURN QUERY
      SELECT 
        p.id,
        p.accession,
        p.name,
        p.source_organism_full_name,
        p.entries_header,
        p.length,
        v_total_count
      FROM proteins p
      WHERE SUBSTRING(p.sequence, 1, v_search_length) = v_clean_sequence
      ORDER BY p.id
      LIMIT p_limit
      OFFSET p_offset;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_proteins_by_sequence_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION search_proteins_by_sequence_optimized TO anon;