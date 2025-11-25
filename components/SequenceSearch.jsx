'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sequenceSearchService } from '../lib/simplifiedSequenceSearch';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Dna
} from 'lucide-react';

// Session storage keys for caching search state
const STORAGE_KEYS = {
  SEQUENCE: 'sequenceSearch_sequence',
  RESULTS: 'sequenceSearch_results',
  PAGE: 'sequenceSearch_page',
  IS_MULTI: 'sequenceSearch_isMulti'
};

export default function SequenceSearch() {
  const router = useRouter();
  const [searchSequence, setSearchSequence] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMultiSearch, setIsMultiSearch] = useState(false);

  // Restore cached state on component mount
  useEffect(() => {
    try {
      const cachedSequence = sessionStorage.getItem(STORAGE_KEYS.SEQUENCE);
      const cachedResults = sessionStorage.getItem(STORAGE_KEYS.RESULTS);
      const cachedPage = sessionStorage.getItem(STORAGE_KEYS.PAGE);
      const cachedIsMulti = sessionStorage.getItem(STORAGE_KEYS.IS_MULTI);

      if (cachedSequence) {
        setSearchSequence(cachedSequence);
      }
      if (cachedResults) {
        setResults(JSON.parse(cachedResults));
      }
      if (cachedPage) {
        setCurrentPage(parseInt(cachedPage, 10));
      }
      if (cachedIsMulti) {
        setIsMultiSearch(cachedIsMulti === 'true');
      }
    } catch (err) {
      console.error('Error restoring cached search state:', err);
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  const saveStateToCache = useCallback((sequence, resultsData, page, isMulti) => {
    try {
      if (sequence) {
        sessionStorage.setItem(STORAGE_KEYS.SEQUENCE, sequence);
      }
      if (resultsData) {
        sessionStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(resultsData));
      }
      if (page) {
        sessionStorage.setItem(STORAGE_KEYS.PAGE, page.toString());
      }
      sessionStorage.setItem(STORAGE_KEYS.IS_MULTI, isMulti.toString());
    } catch (err) {
      console.error('Error saving search state to cache:', err);
    }
  }, []);

  const validateSequence = (seq) => {
    const cleaned = seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY\s,]/g, '');
    return cleaned;
  };

  // Truncate sequence for display - show first 15 and last 15 characters with ellipsis
  const truncateSequence = (seq, maxLength = 15) => {
    if (!seq || seq.length <= maxLength) return seq;

    const firstPart = seq.substring(0, 15);
    const lastPart = seq.substring(seq.length - 15);

    return `${firstPart}...${lastPart}`;
  };

  const handleSearch = useCallback(async (page = 1) => {
    const input = searchSequence.trim();

    if (!input) {
      setError('Please enter a valid protein sequence');
      return;
    }

    // Check if input contains commas (multi-sequence search)
    const sequences = input.split(',').map(s => s.trim()).filter(s => s);

    if (sequences.length > 1) {
      // Multi-sequence search
      setIsMultiSearch(true);

      // Validate each sequence
      const invalidSequences = sequences.filter(seq => {
        const cleaned = seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
        return !cleaned || cleaned.length < 3;
      });

      if (invalidSequences.length > 0) {
        setError(`Invalid sequences (must be at least 3 amino acids): ${invalidSequences.join(', ')}`);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await sequenceSearchService.searchMultipleSequences(sequences, page);

        if (result.error) {
          setError(result.error);
          setResults(null);
        } else {
          setResults(result);
          setCurrentPage(page);
          // Cache the results
          saveStateToCache(input, result, page, true);

          if (result.totalCount === 0) {
            setError(`No proteins found for any of the ${sequences.length} sequences`);
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error('Multi-sequence search error:', err);
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Single sequence search
      setIsMultiSearch(false);
      const cleanedSequence = sequences[0].toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');

      if (!cleanedSequence) {
        setError('Please enter a valid protein sequence');
        return;
      }

      if (cleanedSequence.length < 3) {
        setError('Sequence must be at least 3 amino acids long');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Single sequence search with options
        // Automatically enable window search for sequences > 100 characters
        const searchOptions = {
          useWindowSearch: cleanedSequence.length > 100,
          timeout: 30000 // 30 seconds timeout
        };

        const result = await sequenceSearchService.searchBySequence(cleanedSequence, page, 'contains', searchOptions);

        if (result.error) {
          setError(result.error);
          setResults(null);
        } else {
          // Wrap single result in array format to match multi-search structure
          const wrappedResult = {
            results: [{
              sequence: cleanedSequence,
              ...result
            }],
            totalCount: result.count,
            searchedSequences: [cleanedSequence],
            isTruncated: result.isTruncated,
            useWindowSearch: result.useWindowSearch
          };
          setResults(wrappedResult);
          setCurrentPage(result.currentPage);
          // Cache the results
          saveStateToCache(input, wrappedResult, result.currentPage, false);

          if (result.count === 0) {
            setError(`No proteins found containing: ${cleanedSequence}`);
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error('Sequence search error:', err);
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }, [searchSequence, saveStateToCache]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= results?.totalPages) {
      handleSearch(page);
    }
  };

  const handleSequenceInput = (e) => {
    const input = e.target.value;
    const cleaned = validateSequence(input);
    setSearchSequence(input);

    if (input && input !== cleaned) {
      setError('Invalid characters removed. Use only standard amino acid codes.');
    } else {
      setError(null);
    }
  };

  const handleClearSearch = () => {
    setSearchSequence('');
    setResults(null);
    setError(null);
    setCurrentPage(1);
    setIsMultiSearch(false);
    sequenceSearchService.clearCache();
    // Clear sessionStorage cache
    try {
      sessionStorage.removeItem(STORAGE_KEYS.SEQUENCE);
      sessionStorage.removeItem(STORAGE_KEYS.RESULTS);
      sessionStorage.removeItem(STORAGE_KEYS.PAGE);
      sessionStorage.removeItem(STORAGE_KEYS.IS_MULTI);
    } catch (err) {
      console.error('Error clearing search cache:', err);
    }
  };

  const handleRowClick = (proteinId) => {
    // Save current section so we return to Sequence Search when coming back
    sessionStorage.setItem('dashboardSection', 'search');
    router.push(`/details?id=${proteinId}`);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="card-linear p-8">
        <h2 className="text-xl font-bold text-linear-text-primary mb-6 flex items-center gap-3">
          <img src="/protein.png" alt="Protein" className="w-10 h-10 object-contain" />
          Search by Protein Sequence
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-linear-text-secondary mb-2">
              Enter Protein Sequence(s) - Single or Multiple (min. 3 amino acids each)
            </label>
            <textarea
              value={searchSequence}
              onChange={handleSequenceInput}
              placeholder="Single: MVLSPADKTNVKAAW&#10;Multiple: MVLS, ACDE, PQRS (comma-separated)"
              className="input-linear w-full h-32 font-jetbrains text-sm"
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-2">
              Standard amino acid codes only: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y
            </p>
            <p className="text-xs text-blue-600 mt-2 flex items-start gap-2">
              <span>💡</span>
              <span>
                <strong>Single search:</strong> Searches for proteins containing the sequence anywhere.
                <br/>
                <strong>Multiple search:</strong> Enter comma-separated sequences (e.g., "ABC,XYZ,DEF") to search for all sequences in parallel and view grouped results.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleSearch(1)}
              disabled={loading || !searchSequence.trim()}
              className="btn-linear px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Searching...' : 'Search'}
            </button>

            <button
              onClick={handleClearSearch}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 font-semibold text-gray-700"
              title="Clear search"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card-linear p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
              <Dna className="absolute inset-0 m-auto w-8 h-8 text-green-600 animate-pulse" />
            </div>
            <p className="mt-4 text-linear-text-secondary font-medium">Searching proteins...</p>
            <p className="text-sm text-gray-500 mt-1">
              This may take a few seconds for large datasets
            </p>
          </div>
        </div>
      )}

      {/* Results - Grouped by Search Sequence */}
      {!loading && results && results.results && results.results.length > 0 && (
        <div className="space-y-6">
         

          {/* Results grouped by sequence */}
          {results.results.map((searchResult, index) => {
            const searchSeq = searchResult.searchSequence || searchResult.sequence;
            const proteinData = searchResult.data || [];
            const count = searchResult.count || 0;

            return (
              <div key={index} className="table-linear overflow-hidden">
                {/* Header for this search group */}
                <div className="bg-black px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <span>Search Result for:</span>
                        <span className="font-mono font-bold bg-white/20 px-3 py-1 rounded" title={searchSeq}>
                          {truncateSequence(searchSeq)}
                        </span>
                      </h3>
                      <p className="text-white/90 text-sm mt-1">
                        {count} protein(s) found containing this sequence
                      </p>
                    </div>
                    <div className="text-white text-xl font-bold">{count}</div>
                  </div>
                </div>

                {proteinData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-linear-text-secondary uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-linear-text-secondary uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-linear-text-secondary uppercase tracking-wider">
                            Organism
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-linear-text-secondary uppercase tracking-wider">
                            Domain
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-linear-text-secondary uppercase tracking-wider">
                            Length
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-linear-text-secondary uppercase tracking-wider">
                            Sequence Match
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {proteinData.map((protein) => {
                          const proteinSeq = protein.sequence || '';

                          // Find first occurrence of search sequence (contains mode)
                          const matchIndex = proteinSeq.indexOf(searchSeq);
                          let beforeMatch = '';
                          let matchedPart = '';
                          let afterMatch = '';

                          if (matchIndex >= 0) {
                            beforeMatch = proteinSeq.substring(Math.max(0, matchIndex - 10), matchIndex);
                            matchedPart = proteinSeq.substring(matchIndex, matchIndex + searchSeq.length);
                            afterMatch = proteinSeq.substring(matchIndex + searchSeq.length, matchIndex + searchSeq.length + 10);
                            if (matchIndex > 10) beforeMatch = '...' + beforeMatch;
                            if (matchIndex + searchSeq.length + 10 < proteinSeq.length) afterMatch = afterMatch + '...';
                          }

                          return (
                            <tr
                              key={protein.id}
                              onClick={() => handleRowClick(protein.id)}
                              className="cursor-pointer hover:bg-green-50 transition-colors border-b border-gray-100"
                            >
                              <td className="px-6 py-4 text-sm font-mono">
                                {protein.accession || protein.id}
                              </td>
                              <td className="px-6 py-4 text-sm max-w-xs">
                                <div className="truncate">{protein.name || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                                <div className="truncate">{protein.source_organism_full_name || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {protein.entries_header || 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {protein.length || 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-xs font-mono">
                                <span className="text-gray-500">{beforeMatch}</span>
                                <span className="bg-green-200 font-semibold">{matchedPart}</span>
                                <span className="text-gray-500">{afterMatch}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No proteins found for this sequence
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !results && (
        <div className="text-center py-20">
          <div className="flex flex-col items-center justify-center">
            <Dna className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search proteins by sequence</h3>
            <p className="text-gray-500">Enter a protein sequence above to find matching proteins</p>
          </div>
        </div>
      )}
    </div>
  );
}