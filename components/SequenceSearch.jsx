'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { sequenceSearchService } from '../lib/simplifiedSequenceSearch';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Dna
} from 'lucide-react';


export default function SequenceSearch() {
  const router = useRouter();
  const [searchSequence, setSearchSequence] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const validateSequence = (seq) => {
    const cleaned = seq.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY\s]/g, '');
    return cleaned.replace(/\s/g, '');
  };

  const handleSearch = useCallback(async (page = 1) => {
    const cleanedSequence = validateSequence(searchSequence);
    
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
      
      const result = await sequenceSearchService.searchBySequence(cleanedSequence, page);

      if (result.error) {
        setError(result.error);
        setResults(null);
      } else {
        setResults(result);
        setCurrentPage(result.currentPage);

        if (result.count === 0) {
          setError(`No proteins found starting with: ${cleanedSequence}`);
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
  }, [searchSequence]);

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
    sequenceSearchService.clearCache();
  };

  const handleRowClick = (proteinId) => {
    router.push(`/details?id=${proteinId}`);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="card-linear p-8">
        <h2 className="text-2xl font-heading text-linear-text-primary mb-6 flex items-center gap-3">
          <Dna className="w-6 h-6 text-green-600" />
          Search by Protein Sequence
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-ui text-linear-text-secondary mb-2">
              Enter Protein Sequence (min. 3 amino acids)
            </label>
            <textarea
              value={searchSequence}
              onChange={handleSequenceInput}
              placeholder="e.g., MVLSPADKTNVKAAW or ACDEFGHIKLMNPQRSTVWY..."
              className="input-linear w-full h-32 font-jetbrains text-sm"
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-2">
              Standard amino acid codes only: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y
            </p>
            <p className="text-xs text-blue-600 mt-1">
              💡 Tip: We search for proteins whose sequences START with the entered sequence.
            </p>
          </div>

          <div className="flex items-end gap-4">
            <button
              onClick={() => handleSearch(1)}
              disabled={loading || !searchSequence.trim()}
              className="btn-linear px-6 py-3 flex items-center gap-2 disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Searching...' : 'Search'}
            </button>

            <button
              onClick={handleClearSearch}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50"
              title="Clear search"
            >
              Clear
            </button>

            <div className="text-sm text-gray-600">
              Searches proteins by sequence prefix
            </div>
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
            <p className="text-sm text-gray-500 mt-1">This may take a few seconds for large datasets</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {!loading && results && results.data.length > 0 && (
        <div className="table-linear overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                    Organism
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                    Length
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                    Sequence Match
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.data.map((protein) => {
                  const searchSeq = results.searchSequence;
                  const proteinSeq = protein.sequence || '';
                  const matchedPart = proteinSeq.substring(0, searchSeq.length);
                  const remainingPart = proteinSeq.substring(searchSeq.length, searchSeq.length + 20);

                  return (
                    <tr
                      key={protein.id}
                      onClick={() => handleRowClick(protein.id)}
                      className="cursor-pointer hover:bg-green-50 transition-colors"
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
                        <span className="bg-green-200 font-semibold">{matchedPart}</span>
                        <span className="text-gray-500">{remainingPart}</span>
                        {proteinSeq.length > searchSeq.length + 20 && '...'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div className="bg-white px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * 20) + 1} to{' '}
                  {Math.min(currentPage * 20, results.count)} of{' '}
                  {results.count} results
                  {results.truncated && (
                    <span className="ml-2 text-orange-600">
                      (Sequence truncated for search)
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-xl hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <span className="px-3 py-2 text-sm">
                    Page {currentPage} of {results.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === results.totalPages}
                    className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-xl hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
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