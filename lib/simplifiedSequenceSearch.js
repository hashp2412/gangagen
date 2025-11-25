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

  async searchBySequence(sequence, page = 1, searchMode = 'contains', options = {}) {
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

    // Handle long sequences (>100 characters)
    const MAX_SEARCH_LENGTH = 50; // Reduced from 100 to 50 for better performance
    let searchSequence = cleanSequence;
    let isTruncated = false;
    let useWindowSearch = false;
    let usePrefixSearch = false;

    // Automatically enable window search for sequences > 100 characters
    if (cleanSequence.length > 100) {
      useWindowSearch = true;
      // Use first 50 chars for initial match, then verify full sequence
      searchSequence = cleanSequence.substring(0, 50);
    } else if (cleanSequence.length > MAX_SEARCH_LENGTH) {
      // For sequences between 50-100, use the provided options
      if (options.useWindowSearch) {
        useWindowSearch = true;
        searchSequence = cleanSequence.substring(0, 50);
      } else if (options.usePrefixSearch) {
        usePrefixSearch = true;
        searchSequence = cleanSequence.substring(0, 30);
      } else {
        isTruncated = true;
        searchSequence = cleanSequence.substring(0, MAX_SEARCH_LENGTH);
      }
    }

    // Clear cache only if this is a NEW search (different sequence or mode)
    const searchKey = `${cleanSequence}-${searchMode}`;
    if (page === 1 && this.lastSequence !== null && this.lastSequence !== searchKey) {
      this.clearCache();
    }

    // Update last sequence
    this.lastSequence = searchKey;

    // Check cache
    const cacheKey = this.getCacheKey(searchKey, page);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Determine the search pattern based on searchMode
      let searchPattern;
      let searchDescription;

      // For long sequences, prefer prefix search (much faster than contains)
      if (usePrefixSearch || (cleanSequence.length > 50 && !useWindowSearch)) {
        searchPattern = `${searchSequence}%`;
        searchDescription = 'starting with (prefix)';
        console.log(`Prefix search for performance: ${searchSequence} (original: ${cleanSequence.length} chars)`);
      } else {
        switch(searchMode) {
          case 'contains':
            searchPattern = `%${searchSequence}%`;
            searchDescription = 'containing';
            console.log(`Searching sequences containing: ${searchSequence} (original: ${cleanSequence.length} chars)`);
            break;
          case 'starts':
            searchPattern = `${searchSequence}%`;
            searchDescription = 'starting with';
            console.log(`Searching sequences starting with: ${searchSequence}`);
            break;
          case 'ends':
            searchPattern = `%${searchSequence}`;
            searchDescription = 'ending with';
            console.log(`Searching sequences ending with: ${searchSequence}`);
            break;
          default:
            searchPattern = `%${searchSequence}%`;
            searchDescription = 'containing';
        }
      }

      // Set timeout for query (30 seconds)
      const timeout = options.timeout || 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // For long sequences, use a more efficient search strategy
        let data, error, count;

        if (cleanSequence.length > 50) {
          // Strategy for long sequences: Remove count query to speed up
          // Count queries with LIKE on long strings are very expensive
          const result = await supabase
            .from('proteins')
            .select('id, accession, name, source_organism_full_name, entries_header, length, sequence')
            .like('sequence', searchPattern)
            .order('id', { ascending: true })
            .range(offset, offset + ITEMS_PER_PAGE - 1)
            .abortSignal(controller.signal);

          data = result.data;
          error = result.error;
          // For long sequences, we don't get exact count to avoid timeout
          count = result.data?.length || 0;
        } else {
          // Normal search for short sequences (with count)
          const result = await supabase
            .from('proteins')
            .select('id, accession, name, source_organism_full_name, entries_header, length, sequence', { count: 'exact' })
            .like('sequence', searchPattern)
            .order('id', { ascending: true })
            .range(offset, offset + ITEMS_PER_PAGE - 1)
            .abortSignal(controller.signal);

          data = result.data;
          error = result.error;
          count = result.count;
        }

        clearTimeout(timeoutId);

        if (error) {
          console.error('Search error:', error);
          throw new Error(error.message || 'Search failed');
        }

        // If using window search, filter results to verify full sequence match
        let filteredData = data || [];
        let actualCount = count || 0;

        if (useWindowSearch && filteredData.length > 0) {
          filteredData = filteredData.filter(protein =>
            protein.sequence && protein.sequence.includes(cleanSequence)
          );
          actualCount = filteredData.length;
        }

        const totalPages = Math.ceil(actualCount / ITEMS_PER_PAGE);

        const result = {
          data: filteredData,
          count: actualCount,
          totalPages,
          currentPage: page,
          searchSequence: cleanSequence,
          searchMode,
          isTruncated,
          truncatedTo: isTruncated ? searchSequence.length : null,
          originalLength: cleanSequence.length,
          useWindowSearch,
          message: actualCount === 0
            ? `No proteins found ${searchDescription}: ${cleanSequence.substring(0, 50)}${cleanSequence.length > 50 ? '...' : ''}`
            : `Found ${actualCount} protein(s) ${searchDescription}: ${cleanSequence.substring(0, 50)}${cleanSequence.length > 50 ? '...' : ''}`
        };

        this.setCache(cacheKey, result);
        return result;

      } catch (queryError) {
        clearTimeout(timeoutId);

        if (queryError.name === 'AbortError') {
          throw new Error(`Search timed out after ${timeout/1000} seconds. Try using a shorter sequence or enable window search.`);
        }
        throw queryError;
      }

    } catch (error) {
      console.error('Sequence search failed:', error);
      return {
        data: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        error: error.message || 'Search failed. Please try again or use a different search pattern.'
      };
    }
  }

  async searchMultipleSequences(sequences, page = 1) {
    // sequences is an array of sequence strings
    // Clean and validate all sequences
    const cleanedSequences = sequences
      .map(seq => seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, ''))
      .filter(seq => seq && seq.length >= 3);

    if (cleanedSequences.length === 0) {
      return {
        results: [],
        error: 'Please enter at least one valid sequence with 3+ amino acids'
      };
    }

    try {
      // Execute all searches in parallel using Promise.all
      const searchPromises = cleanedSequences.map(async (sequence) => {
        const result = await this.searchBySequence(sequence, page, 'contains');
        return {
          sequence,
          ...result
        };
      });

      // Wait for all searches to complete
      const results = await Promise.all(searchPromises);

      // Calculate total count across all searches
      const totalCount = results.reduce((sum, result) => sum + (result.count || 0), 0);

      return {
        results, // Array of results, one per sequence
        totalCount,
        searchedSequences: cleanedSequences,
        message: `Searched ${cleanedSequences.length} sequence(s), found ${totalCount} total protein(s)`
      };

    } catch (error) {
      console.error('Multiple sequence search failed:', error);
      return {
        results: [],
        error: 'Multi-sequence search failed. Please try again.'
      };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const sequenceSearchService = new SimplifiedSequenceSearchService();