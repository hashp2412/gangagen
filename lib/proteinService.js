import { supabase } from './supabase';

const ITEMS_PER_PAGE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class ProteinService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getCacheKey(filters, page) {
    return JSON.stringify({ ...filters, page });
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
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

  async fetchProteinsOptimized(filters, page = 1) {
    const cacheKey = this.getCacheKey(filters, page);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { name, organism, domain } = filters;
    
    // Validate filters
    if (!name?.trim() && !organism?.trim() && !domain) {
      return {
        data: [],
        count: 0,
        totalPages: 0,
        currentPage: page
      };
    }

    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const offset = (page - 1) * ITEMS_PER_PAGE;
        
        // Try RPC function first for better performance
        try {
          const { data, error } = await supabase.rpc('search_proteins_optimized', {
            p_name: name?.trim() || null,
            p_organism: organism?.trim() || null,
            p_domain: domain || null,
            p_limit: ITEMS_PER_PAGE,
            p_offset: offset
          });

          if (error) {
            console.error('RPC function error:', error);
            console.error('Error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            throw error;
          }

          // Extract total count from first row (or 0 if no results)
          const totalCount = data?.[0]?.total_count || 0;
          
          // Remove total_count from data objects
          const cleanData = data?.map(({ total_count, ...rest }) => rest) || [];

          const result = {
            data: cleanData,
            count: totalCount,
            totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
            currentPage: page
          };

          this.setCache(cacheKey, result);
          return result;
          
        } catch (rpcError) {
          // Fallback to regular queries if RPC fails
          console.warn('RPC function failed, falling back to regular queries:', rpcError.message || rpcError);
          
          // Build optimized query
          let countQuery = supabase.from('proteins').select('*', { count: 'exact', head: true });
          let dataQuery = supabase.from('proteins').select('id, accession, name, source_organism_full_name, entries_header');

          // Apply filters
          if (name?.trim()) {
            const searchTerm = `%${name.trim()}%`;
            // Use LIKE instead of ILIKE for better GIN index usage
            countQuery = countQuery.like('name', searchTerm);
            dataQuery = dataQuery.like('name', searchTerm);
          }

          if (organism?.trim()) {
            const searchTerm = `%${organism.trim()}%`;
            // Use LIKE for better GIN index usage
            countQuery = countQuery.like('source_organism_full_name', searchTerm);
            dataQuery = dataQuery.like('source_organism_full_name', searchTerm);
          }

          if (domain) {
            const searchTerm = `%${domain}%`;
            countQuery = countQuery.like('entries_header', searchTerm);
            dataQuery = dataQuery.like('entries_header', searchTerm);
          }

          // Get total count first
          const { count, error: countError } = await countQuery;
          
          if (countError) throw countError;

          // Calculate pagination
          const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

          // Fetch paginated data
          const { data, error: dataError } = await dataQuery
            .order('id', { ascending: true })
            .range(offset, offset + ITEMS_PER_PAGE - 1);

          if (dataError) throw dataError;

          const result = {
            data: data || [],
            count,
            totalPages,
            currentPage: page
          };

          this.setCache(cacheKey, result);
          return result;
        }

      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, error);
        retries++;
        
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        } else {
          throw error;
        }
      }
    }
  }

  async fetchProteinDetails(proteinId) {
    const cacheKey = `protein-${proteinId}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('proteins')
      .select('*')
      .eq('id', proteinId)
      .single();

    if (error) throw error;

    this.setCache(cacheKey, data);
    return data;
  }

  async searchBySequence(sequence, searchType = 'partial', page = 1) {
    const cacheKey = `sequence-${sequence}-${searchType}-${page}`;
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

    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        // Build query for sequence search
        let countQuery = supabase.from('proteins').select('*', { count: 'exact', head: true });
        let dataQuery = supabase.from('proteins').select('id, accession, name, source_organism_full_name, entries_header, sequence, length');

        if (searchType === 'exact') {
          // Exact match
          countQuery = countQuery.eq('sequence', cleanSequence);
          dataQuery = dataQuery.eq('sequence', cleanSequence);
        } else if (searchType === 'prefix') {
          // Starts with
          countQuery = countQuery.like('sequence', `${cleanSequence}%`);
          dataQuery = dataQuery.like('sequence', `${cleanSequence}%`);
        } else {
          // Partial match (contains)
          countQuery = countQuery.like('sequence', `%${cleanSequence}%`);
          dataQuery = dataQuery.like('sequence', `%${cleanSequence}%`);
        }

        // Get total count
        console.log('Executing count query for sequence search...');
        const { count, error: countError } = await countQuery;
        if (countError) {
          console.error('Count query error:', countError);
          console.error('Count query details:', {
            message: countError.message,
            details: countError.details,
            hint: countError.hint,
            code: countError.code
          });
          throw new Error(countError.message || 'Failed to count matching sequences');
        }

        // Calculate pagination
        const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
        const offset = (page - 1) * ITEMS_PER_PAGE;

        // Fetch paginated data
        const { data, error: dataError } = await dataQuery
          .order('id', { ascending: true })
          .range(offset, offset + ITEMS_PER_PAGE - 1);

        if (dataError) {
          console.error('Data query error:', dataError);
          throw dataError;
        }

        // Highlight matching sequences
        const highlightedData = data?.map(item => ({
          ...item,
          highlightedSequence: this.highlightSequence(item.sequence, cleanSequence, searchType)
        })) || [];

        const result = {
          data: highlightedData,
          count,
          totalPages,
          currentPage: page,
          searchSequence: cleanSequence,
          searchType
        };

        this.setCache(cacheKey, result);
        return result;

      } catch (error) {
        console.error(`Sequence search attempt ${retries + 1} failed:`, error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        retries++;
        
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        } else {
          // Return a user-friendly error
          return {
            data: [],
            count: 0,
            totalPages: 0,
            currentPage: page,
            error: error.message || 'Failed to search sequences. Please check if the sequence column exists in your database.'
          };
        }
      }
    }
  }

  highlightSequence(fullSequence, searchSequence, searchType) {
    if (!fullSequence || !searchSequence) return fullSequence;

    const startIndex = fullSequence.indexOf(searchSequence);
    if (startIndex === -1) return fullSequence;

    const beforeMatch = fullSequence.substring(0, startIndex);
    const match = fullSequence.substring(startIndex, startIndex + searchSequence.length);
    const afterMatch = fullSequence.substring(startIndex + searchSequence.length);

    return {
      before: beforeMatch,
      match: match,
      after: afterMatch
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

export const proteinService = new ProteinService();