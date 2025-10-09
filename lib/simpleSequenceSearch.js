import { supabase } from './supabase';

export async function simpleSequenceSearch(sequence, page = 1) {
  const ITEMS_PER_PAGE = 10; // Very small page size
  const offset = (page - 1) * ITEMS_PER_PAGE;
  
  // Clean sequence
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  
  if (cleanSeq.length < 3) {
    return {
      data: [],
      count: 0,
      error: 'Sequence must be at least 3 characters'
    };
  }
  
  try {
    // Strategy 1: If we have a helper table, use it
    const { data: helperCheck } = await supabase
      .from('sequence_search_helper')
      .select('protein_id')
      .limit(1);
      
    if (helperCheck) {
      // Use helper table for prefix search
      const searchCol = cleanSeq.length <= 3 ? 'seq_prefix_3' : 
                       cleanSeq.length <= 5 ? 'seq_prefix_5' : 'seq_prefix_10';
      const searchValue = cleanSeq.substring(0, searchCol === 'seq_prefix_3' ? 3 : 
                                              searchCol === 'seq_prefix_5' ? 5 : 10);
      
      const { data: helperResults, error: helperError, count } = await supabase
        .from('sequence_search_helper')
        .select('protein_id', { count: 'exact' })
        .eq(searchCol, searchValue)
        .range(offset, offset + ITEMS_PER_PAGE - 1);
        
      if (!helperError && helperResults) {
        // Get full protein data
        const proteinIds = helperResults.map(r => r.protein_id);
        const { data: proteins } = await supabase
          .from('proteins')
          .select('id, accession, name, source_organism_full_name, entries_header, length')
          .in('id', proteinIds);
          
        return {
          data: proteins || [],
          count: count || 0,
          totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE)
        };
      }
    }
    
    // Strategy 2: Direct search with very limited scope
    // Only search by first character for browsing
    const firstChar = cleanSeq.charAt(0);
    
    const { data, error, count } = await supabase
      .from('proteins')
      .select('id, accession, name, source_organism_full_name, entries_header, length', { count: 'exact' })
      .like('sequence', `${firstChar}%`)
      .order('id')
      .range(offset, offset + ITEMS_PER_PAGE - 1);
      
    if (error) throw error;
    
    // Filter results in memory for exact match
    const filtered = data?.filter(p => {
      if (!p.sequence) return false;
      return p.sequence.startsWith(cleanSeq);
    }) || [];
    
    return {
      data: filtered,
      count: filtered.length,
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
      warning: 'Limited search - showing proteins starting with ' + firstChar
    };
    
  } catch (error) {
    console.error('Simple sequence search error:', error);
    
    // Final fallback: search in name field
    const { data, count } = await supabase
      .from('proteins')
      .select('id, accession, name, source_organism_full_name, entries_header, length', { count: 'exact' })
      .ilike('name', `%${cleanSeq.substring(0, 5)}%`)
      .limit(ITEMS_PER_PAGE)
      .range(offset, offset + ITEMS_PER_PAGE - 1);
      
    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
      warning: 'Showing results from protein names instead of sequences'
    };
  }
}