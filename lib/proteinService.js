import { supabase } from './supabase';

const ITEMS_PER_PAGE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class ProteinService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastSearchKey = null; // Track the last search to detect new searches
  }

  getCacheKey(filters, page) {
    return JSON.stringify({ ...filters, page });
  }

  getSearchKey(filters) {
    // Key without page number to identify unique searches
    return JSON.stringify({ ...filters });
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
    const searchKey = this.getSearchKey(filters);

    // Clear cache only if this is a NEW search (different filters)
    if (page === 1 && this.lastSearchKey !== null && this.lastSearchKey !== searchKey) {
      this.clearCache();
    }

    // Update last search key
    this.lastSearchKey = searchKey;

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

        // Build optimized query (skip RPC function)
        // Using select with count instead of head:true to avoid 500 errors on some queries
        let countQuery = supabase.from('proteins').select('id', { count: 'exact', head: false }).limit(1);
        let dataQuery = supabase.from('proteins').select('id, accession, name, source_organism_full_name, entries_header, length');

        console.log('Search filters:', { name, organism, domain, page });

        // Apply filters - using ilike directly (same as SQL queries)
        if (name?.trim()) {
          const searchTerm = name.trim();
          console.log('Applying name/ID filter:', searchTerm);

          // TEMPORARY: Search only in name column until we debug OR issue
          // TODO: Add accession search once OR syntax is fixed
          countQuery = countQuery.ilike('name', `%${searchTerm}%`);
          dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
        }

        if (organism?.trim()) {
          const searchTerm = organism.trim();
          console.log('Applying organism filter:', searchTerm);
          countQuery = countQuery.ilike('source_organism_full_name', `%${searchTerm}%`);
          dataQuery = dataQuery.ilike('source_organism_full_name', `%${searchTerm}%`);
        }

        if (domain?.trim()) {
          const searchTerm = domain.trim();
          console.log('Applying domain filter:', searchTerm);
          countQuery = countQuery.ilike('entries_header', `%${searchTerm}%`);
          dataQuery = dataQuery.ilike('entries_header', `%${searchTerm}%`);
        }

        // Get total count - will automatically fall back to pagination-only if count times out
        let count;
        let totalPages;
        let hasMore = false;

        console.log('Executing count query...');
        const countResponse = await countQuery;
        console.log('Count response:', countResponse);
        const { count: resultCount, error: countError } = countResponse;

        // If count query times out (error code 57014), fall back to skip-count approach
        if (countError && countError.code === '57014') {
          console.warn('Count query timed out - falling back to pagination-only approach');
          console.log('Executing data query with extra row...');
          const dataResponse = await dataQuery
            .order('id', { ascending: true })
            .range(offset, offset + ITEMS_PER_PAGE); // Fetch one extra
          console.log('Data response:', dataResponse);
          const { data: fetchedData, error: dataError } = dataResponse;

          if (dataError) {
            console.error('Data query error:', dataError);
            throw new Error(`Data query failed: ${dataError.message || JSON.stringify(dataError)}`);
          }

          // Check if we got more than ITEMS_PER_PAGE rows
          hasMore = fetchedData && fetchedData.length > ITEMS_PER_PAGE;

          // Trim to correct page size
          const data = hasMore ? fetchedData.slice(0, ITEMS_PER_PAGE) : fetchedData;

          const result = {
            data: data || [],
            count: null, // Unknown total count
            totalPages: null, // Unknown total pages
            currentPage: page,
            hasMore, // Indicates if there's a next page
            estimatedCount: `Many results (page ${page})`
          };

          this.setCache(cacheKey, result);
          return result;
        }

        if (countError) {
          console.error('Count query error:', countError);
          console.error('Full error object:', JSON.stringify(countError, null, 2));
          console.error('Error details:', {
            message: countError.message,
            details: countError.details,
            hint: countError.hint,
            code: countError.code,
            status: countResponse.status,
            statusText: countResponse.statusText
          });
          console.error('Search term that caused error:', name);
          console.error('Full query filters:', { name, organism, domain });
          throw new Error(`Count query failed: ${countError.message || countError.details || countError.hint || 'Unknown error - possibly query syntax or RLS issue'}`);
        }

        count = resultCount;
        console.log('Count result:', count);

        // Calculate pagination
        totalPages = Math.ceil(count / ITEMS_PER_PAGE);

        // If no results, return early without fetching data
        if (count === 0) {
          console.log('No results found, skipping data query');
          const result = {
            data: [],
            count: 0,
            totalPages: 0,
            currentPage: page
          };
          this.setCache(cacheKey, result);
          return result;
        }

        // Fetch paginated data (for non-skipped count queries)
        console.log('Executing data query...');
        const dataResponse = await dataQuery
          .order('id', { ascending: true })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
        console.log('Data response:', dataResponse);
        const { data, error: dataError } = dataResponse;

        if (dataError) {
          console.error('Data query error:', dataError);
          console.error('Data error type:', typeof dataError);
          console.error('Data error keys:', Object.keys(dataError));
          console.error('Data error stringified:', JSON.stringify(dataError, null, 2));
          throw new Error(`Data query failed: ${dataError.message || JSON.stringify(dataError)}`);
        }

        const result = {
          data: data || [],
          count,
          totalPages,
          currentPage: page
        };

        this.setCache(cacheKey, result);
        return result;

      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error
        });
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
    // Clear cache on new search (when page is 1)
    if (page === 1) {
      this.clearCache();
    }

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

  /**
   * Fetch complete protein data including sequences for export
   * @param {Array} proteinIds - Array of protein IDs to fetch
   * @returns {Promise<Array>} - Array of complete protein data
   */
  async fetchCompleteDataForExport(proteinIds) {
    if (!proteinIds || proteinIds.length === 0) {
      return [];
    }

    try {
      // Fetch all data including sequences for the selected proteins
      const { data, error } = await supabase
        .from('proteins')
        .select('id, accession, name, source_organism_full_name, entries_header, sequence, length')
        .in('id', proteinIds);

      if (error) {
        console.error('Error fetching complete data for export:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch complete data:', error);
      throw error;
    }
  }

  /**
   * Save selected proteins to the saved_queries table for a specific access code
   * @param {string} accessCode - The 6-digit access code
   * @param {Array} proteins - Array of protein objects to save
   * @returns {Promise<Object>} - Result of the save operation
   */
  async saveProteinsForAccessCode(accessCode, proteins) {
    if (!accessCode || !proteins || proteins.length === 0) {
      throw new Error('Access code and proteins are required');
    }

    try {
      // Prepare the protein data as JSON
      const proteinsJSON = proteins.map(protein => ({
        id: protein.id,
        accession: protein.accession,
        name: protein.name,
        organism: protein.source_organism_full_name,
        entries_header: protein.entries_header,
        length: protein.length,
        saved_date: new Date().toISOString()
      }));

      // Check if a record already exists for this access code
      const { data: existingData, error: fetchError } = await supabase
        .from('saved_queries')
        .select('id, saved_proteins')
        .eq('access_code', accessCode)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing saved queries:', fetchError);
        throw fetchError;
      }

      if (existingData) {
        // Update existing record - merge with existing saved proteins
        const existingSavedProteins = existingData.saved_proteins || [];

        // Get IDs of already saved proteins
        const existingIds = new Set(existingSavedProteins.map(p => p.id));

        // Add only new proteins (avoid duplicates)
        const newProteins = proteinsJSON.filter(p => !existingIds.has(p.id));
        const updatedProteins = [...existingSavedProteins, ...newProteins];

        const { data, error } = await supabase
          .from('saved_queries')
          .update({
            saved_proteins: updatedProteins
          })
          .eq('access_code', accessCode)
          .select();

        if (error) {
          console.error('Error updating saved queries:', error);
          throw error;
        }

        return {
          success: true,
          message: `Added ${newProteins.length} new protein(s). ${existingSavedProteins.length} already saved.`,
          data,
          newCount: newProteins.length,
          totalCount: updatedProteins.length
        };
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('saved_queries')
          .insert([{
            access_code: accessCode,
            saved_proteins: proteinsJSON
          }])
          .select();

        if (error) {
          console.error('Error inserting saved queries:', error);
          throw error;
        }

        return {
          success: true,
          message: `Saved ${proteinsJSON.length} protein(s) successfully.`,
          data,
          newCount: proteinsJSON.length,
          totalCount: proteinsJSON.length
        };
      }
    } catch (error) {
      console.error('Failed to save proteins:', error);
      throw error;
    }
  }

  /**
   * Fetch saved proteins for a specific access code
   * @param {string} accessCode - The 6-digit access code
   * @returns {Promise<Array>} - Array of saved proteins
   */
  async fetchSavedProteins(accessCode) {
    if (!accessCode) {
      throw new Error('Access code is required');
    }

    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .select('saved_proteins')
        .eq('access_code', accessCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching saved proteins:', error);
        throw error;
      }

      return data?.saved_proteins || [];
    } catch (error) {
      console.error('Failed to fetch saved proteins:', error);
      throw error;
    }
  }

  /**
   * Remove specific proteins from saved list
   * @param {string} accessCode - The 6-digit access code
   * @param {Array} proteinIds - Array of protein IDs to remove
   * @returns {Promise<Object>} - Result of the remove operation
   */
  async removeSavedProteins(accessCode, proteinIds) {
    if (!accessCode || !proteinIds || proteinIds.length === 0) {
      throw new Error('Access code and protein IDs are required');
    }

    try {
      // Fetch current saved proteins
      const { data: existingData, error: fetchError } = await supabase
        .from('saved_queries')
        .select('saved_proteins')
        .eq('access_code', accessCode)
        .single();

      if (fetchError) {
        console.error('Error fetching saved proteins:', fetchError);
        throw fetchError;
      }

      // Filter out the proteins to remove
      const updatedProteins = (existingData.saved_proteins || []).filter(
        p => !proteinIds.includes(p.id)
      );

      // Update the record
      const { data, error } = await supabase
        .from('saved_queries')
        .update({
          saved_proteins: updatedProteins
        })
        .eq('access_code', accessCode)
        .select();

      if (error) {
        console.error('Error removing saved proteins:', error);
        throw error;
      }

      return {
        success: true,
        message: `Removed ${proteinIds.length} protein(s).`,
        data,
        remainingCount: updatedProteins.length
      };
    } catch (error) {
      console.error('Failed to remove saved proteins:', error);
      throw error;
    }
  }
}

export const proteinService = new ProteinService();