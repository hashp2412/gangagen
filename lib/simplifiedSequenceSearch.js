import { supabase } from './supabase';

const ITEMS_PER_PAGE = 20;

export class SimplifiedSequenceSearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getCacheKey(sequence, page) {
    return `seq-${sequence}-${page}`;
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

  async searchBySequence(sequence, page = 1) {
    // Clean and validate sequence
    const cleanSequence = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
    
    if (!cleanSequence || cleanSequence.length < 3) {
      return {
        data: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        error: 'Please enter at least 3 amino acids'
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(cleanSequence, page);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      // Determine which prefix column to use based on sequence length
      let searchColumn;
      let searchValue;
      
      if (cleanSequence.length <= 3) {
        searchColumn = 'seq_prefix_3';
        searchValue = cleanSequence.padEnd(3, '_');
      } else if (cleanSequence.length <= 5) {
        searchColumn = 'seq_prefix_5';
        searchValue = cleanSequence.padEnd(5, '_');
      } else if (cleanSequence.length <= 10) {
        searchColumn = 'seq_prefix_10';
        searchValue = cleanSequence.substring(0, 10);
      } else {
        // For sequences longer than 10, always search by first 10 characters
        searchColumn = 'seq_prefix_10';
        searchValue = cleanSequence.substring(0, 10);
      }

      console.log(`Searching ${searchColumn} for: ${searchValue}`);

      // Execute search using prefix column
      const { data, error, count } = await supabase
        .from('proteins')
        .select('id, accession, name, source_organism_full_name, entries_header, length', { count: 'exact' })
        .like(searchColumn, `${searchValue}%`)
        .order('id', { ascending: true })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (error) {
        console.error('Search error:', error);
        throw new Error(error.message || 'Search failed');
      }

      const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

      const result = {
        data: data || [],
        count: count || 0,
        totalPages,
        currentPage: page,
        searchSequence: cleanSequence,
        searchColumn,
        searchValue,
        message: cleanSequence.length > 10 
          ? `Showing proteins starting with: ${searchValue}` 
          : null
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Sequence search failed:', error);
      return {
        data: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        error: 'Search failed. Please ensure the database has prefix columns set up.'
      };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const sequenceSearchService = new SimplifiedSequenceSearchService();