import { supabase } from './supabase';
import { simpleSequenceSearch } from './simpleSequenceSearch';

const ITEMS_PER_PAGE = 20; // Smaller page size for sequence searches
const MAX_SEQUENCE_LENGTH = 100; // Max length for partial searches

export class SequenceSearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getCacheKey(sequence, searchType, page) {
    return `seq-${sequence}-${searchType}-${page}`;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    setTimeout(() => {
      this.cache.delete(key);
    }, this.cacheTimeout);
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  async searchBySequence(sequence, searchType = 'partial', page = 1) {
    const cacheKey = this.getCacheKey(sequence, searchType, page);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Clean and validate sequence
    const cleanSequence = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
    
    if (!cleanSequence || cleanSequence.length < 3) {
      return {
        data: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        error: 'Sequence must be at least 3 amino acids long'
      };
    }

    // Limit sequence length for partial searches to avoid timeouts
    let searchSequence = cleanSequence;
    if (searchType === 'partial' && cleanSequence.length > MAX_SEQUENCE_LENGTH) {
      searchSequence = cleanSequence.substring(0, MAX_SEQUENCE_LENGTH);
      console.warn(`Sequence truncated to ${MAX_SEQUENCE_LENGTH} characters for partial search`);
    }

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      console.log(`Starting sequence search: type=${searchType}, length=${searchSequence.length}`);
      
      // Check if we have prefix columns
      const { data: checkColumns } = await supabase
        .from('proteins')
        .select('seq_prefix_5')
        .limit(1);
      
      if (checkColumns && 'seq_prefix_5' in (checkColumns[0] || {})) {
        // Use prefix columns for efficient search
        console.log('Using prefix column search');
        
        let query = supabase
          .from('proteins')
          .select('id, accession, name, source_organism_full_name, entries_header, length', { count: 'exact' });
        
        // Choose appropriate column based on search length
        if (searchSequence.length <= 5) {
          if (searchType === 'exact' || searchType === 'prefix') {
            query = query.eq('seq_prefix_5', searchSequence.padEnd(5, '_').substring(0, 5));
          } else {
            query = query.like('seq_prefix_5', `%${searchSequence}%`);
          }
        } else if (searchSequence.length <= 10) {
          if (searchType === 'exact' || searchType === 'prefix') {
            query = query.like('seq_prefix_10', `${searchSequence}%`);
          } else {
            query = query.like('seq_prefix_10', `%${searchSequence}%`);
          }
        } else {
          if (searchType === 'exact' || searchType === 'prefix') {
            query = query.like('seq_prefix_20', `${searchSequence.substring(0, 20)}%`);
          } else {
            // For partial matches on long sequences, use prefix search
            query = query.like('seq_prefix_20', `${searchSequence.substring(0, 20)}%`);
          }
        }
        
        const { data, error, count } = await query
          .order('id', { ascending: true })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
          
        if (!error && data) {
          return {
            data: data || [],
            count: count || 0,
            totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
            currentPage: page,
            searchSequence: searchSequence,
            searchType,
            usingPrefixColumns: true
          };
        }
      }
      
      // Fallback to direct sequence search (slower)
      console.log('Using direct sequence search (no prefix columns)');
      
      // Only do prefix searches to avoid timeouts
      const { data, error, count } = await supabase
        .from('proteins')
        .select('id, accession, name, source_organism_full_name, entries_header, length', { count: 'exact' })
        .like('sequence', `${searchSequence.substring(0, 10)}%`)
        .order('id', { ascending: true })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (error) {
        console.error('Direct query error:', error);
        throw error;
      }

      const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

      const result = {
        data: data || [],
        count: count || 0,
        totalPages,
        currentPage: page,
        searchSequence: searchSequence,
        searchType,
        truncated: searchSequence !== cleanSequence
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Sequence search failed:', error);
      
      // Use simple sequence search as fallback
      try {
        console.log('Using simplified sequence search...');
        const simpleResult = await simpleSequenceSearch(searchSequence, page);
        
        return {
          data: simpleResult.data,
          count: simpleResult.count || 0,
          totalPages: simpleResult.totalPages || 1,
          currentPage: page,
          searchSequence: searchSequence,
          searchType,
          message: simpleResult.warning || 'Using simplified search due to database limitations'
        };
      } catch (fallbackErr) {
        console.error('Simple search also failed:', fallbackErr);
      }
      
      // Return user-friendly error
      return {
        data: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        error: this.getErrorMessage(error, searchType, searchSequence.length)
      };
    }
  }

  getErrorMessage(error, searchType, sequenceLength) {
    if (error.message?.includes('timeout')) {
      return 'Search timed out. Try a shorter sequence or use "Starts With" search type.';
    }
    
    if (error.code === 'PGRST116') {
      return 'Search query too complex. Try a shorter sequence.';
    }
    
    if (searchType === 'partial' && sequenceLength > 20) {
      return 'Partial search with long sequences may timeout. Try "Starts With" or use a shorter sequence.';
    }
    
    return error.message || 'Failed to search sequences. Please try again.';
  }

  clearCache() {
    this.cache.clear();
  }
}

export const sequenceSearchService = new SequenceSearchService();