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

  /**
   * Fetch proteins with parallel data and count queries
   * @param {Object} filters - Search filters (name, organism, domain)
   * @param {number} page - Page number (default 1)
   * @param {Function} onCountUpdate - Optional callback that receives count when it arrives (for delayed count updates)
   * @returns {Promise<Object>} - Result with data, count, totalPages, etc.
   */
  async fetchProteinsOptimized(filters, page = 1, onCountUpdate = null) {
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

        // Build data query
        let dataQuery = supabase.from('proteins').select('id, accession, name, source_organism_full_name, entries_header, length');

        console.log('Search filters:', { name, organism, domain, page });

        // Apply filters to data query
        // Using ilike for pattern matching (supports % wildcards)
        if (name?.trim()) {
          const searchTerm = name.trim();
          console.log('Applying name/ID filter:', searchTerm);
          // Use % as wildcard: %term% matches anywhere in the string
          dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
        }

        if (organism?.trim()) {
          const searchTerm = organism.trim();
          console.log('Applying organism filter:', searchTerm);
          // Use % as wildcard: %term% matches anywhere in the string
          dataQuery = dataQuery.ilike('source_organism_full_name', `%${searchTerm}%`);
        }

        if (domain?.trim()) {
          const searchTerm = domain.trim();
          console.log('Applying domain filter:', searchTerm);
          dataQuery = dataQuery.ilike('entries_header', `%${searchTerm}%`);
        }

        // Execute DATA query first (priority - user sees results immediately)
        console.log('Executing data query...');
        const dataResponse = await dataQuery
          .order('id', { ascending: true })
          .range(offset, offset + ITEMS_PER_PAGE); // Fetch one extra to check hasMore

        console.log('Data response:', dataResponse);
        const { data: fetchedData, error: dataError } = dataResponse;

        // Handle data query error (critical)
        if (dataError) {
          console.error('Data query error:', dataError);
          throw new Error(`Data query failed: ${dataError.message || JSON.stringify(dataError)}`);
        }

        // Check if we got more than ITEMS_PER_PAGE rows (indicates more results exist)
        let hasMore = fetchedData && fetchedData.length > ITEMS_PER_PAGE;

        // Trim to correct page size
        const data = hasMore ? fetchedData.slice(0, ITEMS_PER_PAGE) : (fetchedData || []);

        // If no data at all, return early
        if (data.length === 0 && page === 1) {
          const result = {
            data: [],
            count: 0,
            totalPages: 0,
            currentPage: page
          };
          this.setCache(cacheKey, result);
          return result;
        }

        // Build initial result with unknown count (data is ready!)
        const result = {
          data: data,
          count: null, // Will be updated when count query completes
          totalPages: null,
          currentPage: page,
          hasMore: hasMore,
          countLoading: true, // Flag to indicate count is still loading
          estimatedCount: `Loading count...`
        };

        // Start count query in background (don't await it here)
        this.fetchCountInBackground(filters, page, cacheKey, onCountUpdate);

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

  /**
   * Fetch count in background and call the callback when ready
   * This runs independently after data is returned to the user
   * @param {Object} filters - Search filters
   * @param {number} page - Current page
   * @param {string} cacheKey - Cache key to update
   * @param {Function} onCountUpdate - Callback to notify when count is ready
   */
  async fetchCountInBackground(filters, page, cacheKey, onCountUpdate) {
    const { name, organism, domain } = filters;

    // Build count query with same filters (must match data query filters exactly)
    let countQuery = supabase.from('proteins').select('id', { count: 'exact', head: false }).limit(1);

    // Using ilike for pattern matching - same as data query
    if (name?.trim()) {
      countQuery = countQuery.ilike('name', `%${name.trim()}%`);
    }
    if (organism?.trim()) {
      countQuery = countQuery.ilike('source_organism_full_name', `%${organism.trim()}%`);
    }
    if (domain?.trim()) {
      countQuery = countQuery.ilike('entries_header', `%${domain.trim()}%`);
    }

    let retries = 0;
    const maxRetries = 5; // More retries for count since it can be slow

    while (retries < maxRetries) {
      try {
        console.log(`Background count query attempt ${retries + 1}...`);
        const { count, error: countError } = await countQuery;

        if (countError) {
          // If timeout, retry with exponential backoff
          if (countError.code === '57014') {
            console.warn(`Count query timed out (attempt ${retries + 1}), retrying...`);
            retries++;
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Longer delay for count
              continue;
            }
          }
          console.error('Background count query failed:', countError);
          return; // Give up on count, user still has data
        }

        console.log('Background count query succeeded:', count);

        // Calculate total pages
        const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

        // Update cache with count
        const cached = this.getCache(cacheKey);
        if (cached) {
          cached.count = count;
          cached.totalPages = totalPages;
          cached.countLoading = false;
          cached.estimatedCount = null;
          this.setCache(cacheKey, cached);
        }

        // Notify the component via callback
        if (onCountUpdate) {
          onCountUpdate({
            count,
            totalPages,
            currentPage: page
          });
        }

        return; // Success!

      } catch (error) {
        console.error(`Background count attempt ${retries + 1} failed:`, error);
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        }
      }
    }

    console.warn('Background count query gave up after max retries');
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