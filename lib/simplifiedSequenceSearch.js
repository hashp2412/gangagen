import { supabase } from './supabase';

const ITEMS_PER_PAGE = 20;

export class SimplifiedSequenceSearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastSequence = null; // Track the last sequence to detect new searches
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

    // Clear cache only if this is a NEW search (different sequence)
    if (page === 1 && this.lastSequence !== null && this.lastSequence !== cleanSequence) {
      this.clearCache();
    }

    // Update last sequence
    this.lastSequence = cleanSequence;

    // Check cache
    const cacheKey = this.getCacheKey(cleanSequence, page);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;

      console.log(`Searching sequence for: ${cleanSequence}`);

      // Execute search using the sequence column directly
      // Search for sequences that START WITH the entered sequence
      const { data, error, count } = await supabase
        .from('proteins')
        .select('id, accession, name, source_organism_full_name, entries_header, length, sequence', { count: 'exact' })
        .like('sequence', `${cleanSequence}%`)
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
        message: count === 0
          ? `No proteins found starting with: ${cleanSequence}`
          : `Found ${count} protein(s) starting with: ${cleanSequence}`
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