'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { proteinService } from '../lib/proteinService';
import ProteinDetails from './ProteinDetails';
import SequenceSearch from './SequenceSearch';

import { 
  Search, 
  Database, 
  History, 
  LogOut, 
  Download,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Sparkles
} from 'lucide-react';

// Range Visualization Component
const RangeVisualization = ({ rangeData, domainBounds }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };
  
  // Parse range data - expecting format like "PF03245(27...149)"
  const parseRange = (data) => {
    if (!data || typeof data !== 'string') return null;
    
    // Match patterns like "PF03245(27...149)" or "PF03245(27-149)"
    const matches = data.match(/([A-Z0-9]+)\((\d+)[\.\-]+(\d+)\)/);
    if (matches && matches.length >= 4) {
      return {
        domain: matches[1],
        start: parseInt(matches[2]),
        end: parseInt(matches[3])
      };
    }
    return null;
  };

  const range = parseRange(rangeData);
  
  if (!range) {
    return <span className="text-sm text-linear-text-secondary">{rangeData || 'N/A'}</span>;
  }

  // Use dynamic domain bounds or defaults
  const scaleStart = domainBounds?.min || 0;
  const scaleEnd = domainBounds?.max || 200;
  const blockWidth = 180; // px - width of the visualization bar
  
  // Calculate positions
  const rangeStart = range.start;
  const rangeEnd = range.end;
  
  const startPercent = Math.max(0, Math.min(100, ((rangeStart - scaleStart) / (scaleEnd - scaleStart)) * 100));
  const endPercent = Math.max(0, Math.min(100, ((rangeEnd - scaleStart) / (scaleEnd - scaleStart)) * 100));
  const widthPercent = endPercent - startPercent;

  return (
    <div 
      className="flex flex-col space-y-1 transition-all duration-300 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Hover Tooltip */}
      {isHovered && (
        <div 
          className="absolute z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 40}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold">{range.domain}</div>
          <div className="text-gray-300">Range: {rangeStart}-{rangeEnd}</div>
          <div className="text-gray-300">Length: {rangeEnd - rangeStart + 1} aa</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
      
      {/* Domain name */}
      <div className={`text-xs font-semibold text-gray-700 transition-colors duration-200 ${isHovered ? 'text-green-700' : ''}`}>
        {range.domain}
      </div>
      
      {/* Visual range bar */}
      <div className="relative" style={{ width: `${blockWidth}px` }}>
        {/* Light green background bar representing full domain */}
        <div className={`h-8 bg-green-100 relative overflow-hidden border border-green-200 rounded-full transition-all duration-300 ${
          isHovered ? 'shadow-md border-green-300 bg-green-50' : ''
        }`}>
          {/* Dark green highlighted range with animation */}
          <div
            className={`absolute top-0 h-full bg-green-500 transition-all duration-700 ease-out rounded-full  ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: `${startPercent}%`,
              width: isVisible ? `${widthPercent}%` : '0%',
              transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
              transformOrigin: 'center'
            }}
          >
            {/* Subtle gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
            
            {/* Animated shimmer effect */}
            <div 
              className="absolute inset-0 opacity-0 bg-gradient-to-r from-transparent via-white to-transparent"
              style={{
                animation: isHovered ? 'shimmer 1.5s ease-out infinite' : 'none',
                opacity: isHovered ? 0.2 : 0
              }}
            ></div>
          </div>
          
          {/* Pulse effect on hover */}
          {isHovered && (
            <div
              className="absolute top-0 h-full bg-green-400 opacity-30 rounded-full"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            ></div>
          )}
          
          {/* Range numbers overlay with fade-in */}
          {widthPercent > 20 && (
            <div 
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
            </div>
          )}
        </div>
        
        {/* Range text below if not shown in bar */}
        {widthPercent <= 20 && (
          <div className={`text-xs text-gray-600 mt-0.5 transition-all duration-200 ${
            isHovered ? 'text-green-700 font-semibold' : ''
          }`}>
            {rangeStart}-{rangeEnd}
          </div>
        )}
      </div>
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};


// Database data will be fetched from Supabase

const domains = ['All Domains', 'Bacteria', 'Archaea', 'Eukaryota', 'Virus'];

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('explore');
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    organism: '',
    domain: ''
  });
  
  // Domain options for dropdown
  const domainOptions = [
    "PF03245", "PF16754", "PF11860", "PF13702", "PF00959", "PF00182", "PF00704",
    "PF01374", "PF05838", "PF18013", "PF04965", "PF01183", "PF00722", "PF05193", 
    "PF01551", "PF00675", "PF01435", "PF01433", "PF10502", "PF00246", "PF03572", 
    "PF00814", "PF17900", "PF01510", "PF01520", "PF05257", "PF06347", "PF08239", 
    "PF08460", "PF01476", "PF14859", "PF01024", "PF11429"
  ];
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [domainBounds, setDomainBounds] = useState({ min: 0, max: 200 });
  const [selectedProteinId, setSelectedProteinId] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('');

  const menuItems = [
    { id: 'explore', label: 'Explore Database', icon: Database },
    { id: 'search', label: 'Search Sequence', icon: Search },
    { id: 'saved', label: 'Saved Queries', icon: History },
  ];

  // Calculate domain bounds from data
  const calculateDomainBounds = (entries) => {
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    entries.forEach(entry => {
      if (!entry.entries_header) return;
      
      // Parse range from entries_header like "PF03245(27...149)"
      const matches = entry.entries_header.match(/[A-Z0-9]+\((\d+)[\.\-]+(\d+)\)/);
      if (matches && matches.length >= 3) {
        const start = parseInt(matches[1]);
        const end = parseInt(matches[2]);
        minValue = Math.min(minValue, start);
        maxValue = Math.max(maxValue, end);
      }
    });
    
    // Provide defaults if no valid data
    if (minValue === Infinity || maxValue === -Infinity) {
      return { min: 0, max: 200 };
    }
    
    // Add some padding to the domain
    const padding = Math.max(10, (maxValue - minValue) * 0.1);
    return {
      min: Math.floor(Math.max(0, minValue - padding)),
      max: Math.ceil(maxValue + padding)
    };
  };

  // Don't fetch data on mount - only when user searches
  useEffect(() => {
    // Set initial empty state
    setData([]);
    setFilteredData([]);
    setTotalPages(0);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate minimum filter length
      if (searchFilters.name.trim() && searchFilters.name.trim().length < 3) {
        setError('Name must be at least 3 characters');
        setLoading(false);
        return;
      }
      
      if (searchFilters.organism.trim() && searchFilters.organism.trim().length < 3) {
        setError('Organism must be at least 3 characters');
        setLoading(false);
        return;
      }
      
      // Use the optimized service
      const result = await proteinService.fetchProteinsOptimized(searchFilters, page);
      
      setData(result.data);
      setFilteredData(result.data);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
      
      // Calculate and set domain bounds
      if (result.data && result.data.length > 0) {
        const bounds = calculateDomainBounds(result.data);
        setDomainBounds(bounds);
      }
      
      // Show message if no results
      if (result.count === 0) {
        setError('No proteins found matching your search criteria');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      
      let errorMessage = 'Failed to fetch data. Please try again.';
      
      if (err?.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Try narrowing your search criteria.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchFilters]);

  const handleSearch = () => {
    // Validate filters before searching
    const hasValidFilters = 
      (searchFilters.name.trim().length >= 3) ||
      (searchFilters.organism.trim().length >= 3) ||
      searchFilters.domain;
      
    if (!hasValidFilters) {
      setError('Please enter at least 3 characters in name or organism, or select a domain');
      return;
    }
    
    setCurrentPage(1);
    fetchData(1);
  };

  // Get current page data
  const getCurrentPageData = () => {
    // Data is already paginated from the API
    return filteredData;
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchData(page);
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      fetchData(page);
      setPageInput('');
    }
  };

  // Selection handlers
  const handleEntrySelection = (entryId, isSelected) => {
    const newSelectedEntries = new Set(selectedEntries);
    if (isSelected) {
      newSelectedEntries.add(entryId);
    } else {
      newSelectedEntries.delete(entryId);
    }
    setSelectedEntries(newSelectedEntries);
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const currentPageIds = getCurrentPageData().map(entry => entry.id);
      setSelectedEntries(new Set([...selectedEntries, ...currentPageIds]));
    } else {
      const currentPageIds = new Set(getCurrentPageData().map(entry => entry.id));
      const newSelectedEntries = new Set([...selectedEntries].filter(id => !currentPageIds.has(id)));
      setSelectedEntries(newSelectedEntries);
    }
  };

  const handleSelectAllData = (isSelected) => {
    if (isSelected) {
      const allIds = filteredData.map(entry => entry.id);
      setSelectedEntries(new Set(allIds));
    } else {
      setSelectedEntries(new Set());
    }
  };

  // Check if all current page items are selected
  const isAllCurrentPageSelected = () => {
    const currentPageIds = getCurrentPageData().map(entry => entry.id);
    return currentPageIds.length > 0 && currentPageIds.every(id => selectedEntries.has(id));
  };

  // Check if some current page items are selected (for indeterminate state)
  const isSomeCurrentPageSelected = () => {
    const currentPageIds = getCurrentPageData().map(entry => entry.id);
    return currentPageIds.some(id => selectedEntries.has(id));
  };

  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('validAccess');
    sessionStorage.removeItem('accessCode');
    onLogout();
  };
  
  const handleRowClick = (proteinId) => {
    setSelectedProteinId(proteinId);
  };
  
  const handleBackFromDetails = () => {
    setSelectedProteinId(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'explore':
        return (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="card-linear p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div>
                  <label className="block text-xs font-ui text-linear-text-secondary mb-3 uppercase tracking-wider">
                    Name / ID
                  </label>
                  <input
                    type="text"
                    value={searchFilters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    placeholder="Enter at least 3 characters..."
                    className="input-linear w-full"
                  />
                  {searchFilters.name.trim().length > 0 && searchFilters.name.trim().length < 3 && (
                    <p className="text-xs text-orange-500 mt-1">Min 3 characters required</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-ui text-linear-text-secondary mb-3 uppercase tracking-wider">
                    Organism
                  </label>
                  <input
                    type="text"
                    value={searchFilters.organism}
                    onChange={(e) => handleFilterChange('organism', e.target.value)}
                    placeholder="Enter at least 3 characters..."
                    className="input-linear w-full"
                  />
                  {searchFilters.organism.trim().length > 0 && searchFilters.organism.trim().length < 3 && (
                    <p className="text-xs text-orange-500 mt-1">Min 3 characters required</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-ui text-linear-text-secondary mb-3 uppercase tracking-wider">
                    Domain
                  </label>
                  <select
                    value={searchFilters.domain}
                    onChange={(e) => handleFilterChange('domain', e.target.value)}
                    className="input-linear w-full cursor-pointer"
                  >
                    <option value="">Select domain...</option>
                    {domainOptions.map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSearch}
                    className="btn-linear flex-1 px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Execute
                  </button>
                  <button
                    onClick={() => {
                      setSearchFilters({ name: '', organism: '', domain: '' });
                      setData([]);
                      setFilteredData([]);
                      setError(null);
                      proteinService.clearCache();
                    }}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50"
                    title="Clear filters"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>


            {/* Data Table */}
            <div className="table-linear overflow-hidden">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
                      <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-green-600 animate-pulse" />
                    </div>
                    <p className="mt-4 text-linear-text-secondary font-medium">Searching database...</p>
                    <p className="text-sm text-gray-500 mt-1">Processing {filteredData.length > 0 ? `${filteredData.length} results` : 'your query'}</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12">
                  <div className="text-red-600 mb-4">{error}</div>
                  <button
                    onClick={() => {
                      setError(null);
                      setData([]);
                      setFilteredData([]);
                    }}
                    className="btn-linear px-4 py-2 text-sm"
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {!loading && !error && filteredData.length === 0 && (
                <div className="text-center py-20">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No data to display</h3>
                    <p className="text-gray-500 mb-4">Use the search filters above to find proteins</p>
                    <p className="text-sm text-gray-400">Search by name, organism, or domain</p>
                  </div>
                </div>
              )}
              
              {!loading && !error && filteredData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead>
                    <tr>
                      <th className="w-12 px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={isAllCurrentPageSelected()}
                          ref={(input) => {
                            if (input) input.indeterminate = isSomeCurrentPageSelected() && !isAllCurrentPageSelected();
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 text-green-600 accent-green-500 focus:ring-green-500 focus:ring-2 rounded"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                        Organism
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-linear-text-secondary uppercase tracking-wider min-w-[220px]">
                        Domain
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentPageData().map((entry) => (
                      <tr 
                        key={entry.id}
                        onClick={(e) => {
                          if (!e.target.closest('input[type="checkbox"]')) {
                            handleRowClick(entry.id);
                          }
                        }}
                        className={`cursor-pointer hover:bg-green-50 transition-colors ${selectedEntries.has(entry.id) ? 'selected' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={(e) => handleEntrySelection(entry.id, e.target.checked)}
                            className="h-4 w-4 text-green-600 accent-green-500 focus:ring-green-500 focus:ring-2 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-linear-text-primary font-mono">
                          {entry.accession || entry.id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-linear-text-primary max-w-xs">
                          <div className="truncate" title={entry.name}>
                            {entry.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-linear-text-secondary max-w-xs">
                          <div className="truncate" title={entry.source_organism_full_name}>
                            {entry.source_organism_full_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RangeVisualization rangeData={entry.entries_header} domainBounds={domainBounds} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredData.length === 0 && (
                  <div className="text-center py-12 text-linear-text-secondary font-normal">
                    No data entries found matching search parameters
                  </div>
                )}
                </div>
              )}

              {/* Pagination Controls */}
              {!loading && !error && filteredData.length > 0 && (
                <div className="bg-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    {/* Left - Entry count */}
                    <div className="flex items-center space-x-2 text-sm text-linear-text-secondary">
                      <span>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                        {Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
                        {filteredData.length} entries
                      </span>
                    </div>
                    
                    {/* Center - Pagination Navigation */}
                    <div className="flex items-center space-x-2">
                      {/* Previous button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-xl hover:bg-green-200 hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      <div className="flex space-x-1">
                        {/* First page */}
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => handlePageChange(1)}
                              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                            >
                              1
                            </button>
                            {currentPage > 4 && <span className="px-2 text-linear-text-secondary">...</span>}
                          </>
                        )}
                        
                        {/* Current page range */}
                        {[...Array(5)].map((_, i) => {
                          const page = currentPage - 2 + i;
                          if (page < 1 || page > totalPages) return null;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-4 py-2 text-sm rounded-xl transition-all duration-300 ${
                                page === currentPage
                                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-105'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200 hover:transform hover:scale-105'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        
                        {/* Last page */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="px-2 text-linear-text-secondary">...</span>}
                            <button
                              onClick={() => handlePageChange(totalPages)}
                              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Next button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-xl hover:bg-green-200 hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      {/* Page jump */}
                      <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2 ml-4">
                        <span className="text-sm text-linear-text-secondary">Go to:</span>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={pageInput}
                          onChange={(e) => setPageInput(e.target.value)}
                          placeholder="Page"
                          className="w-16 px-2 py-1 text-sm bg-green-50 rounded focus:outline-none focus:bg-green-100 focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                        >
                          Go
                        </button>
                      </form>
                    </div>

                    {/* Right - Export and Save Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const dataToExport = selectedEntries.size > 0 
                            ? filteredData.filter(entry => selectedEntries.has(entry.id))
                            : filteredData;
                          console.log('Exporting data:', dataToExport);
                          // Add your export logic here
                        }}
                        className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export {selectedEntries.size > 0 ? `(${selectedEntries.size})` : 'All'}</span>
                      </button>
                      <button
                        onClick={() => {
                          const dataToSave = selectedEntries.size > 0 
                            ? filteredData.filter(entry => selectedEntries.has(entry.id))
                            : filteredData;
                          console.log('Saving data:', dataToSave);
                          // Add your save logic here
                        }}
                        className="btn-linear px-4 py-2 text-sm flex items-center space-x-1"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save {selectedEntries.size > 0 ? `(${selectedEntries.size})` : 'All'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        );
      
      case 'search':
        return <SequenceSearch />;
      
      case 'saved':
        return (
          <div className="card-linear p-6">
            <h2 className="text-xl font-semibold text-linear-text-primary mb-4">Saved Queries</h2>
            <p className="text-linear-text-secondary">Your saved queries will appear here...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (selectedProteinId) {
    return (
      <ProteinDetails 
        proteinId={selectedProteinId} 
        onBack={handleBackFromDetails}
        onLogout={handleLogout}
      />
    );
  }
  
  return (
    <div className="flex h-screen pt-20">
      {/* Sidebar */}
      <div className="w-64 sidebar-linear">
        
        <nav className="mt-8 px-4 flex flex-col gap-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`menu-item-linear w-full flex items-center px-4 py-3 text-left text-sm font-normal tracking-wide ${
                  activeSection === item.id ? 'active' : 'text-linear-text-secondary hover:text-linear-text-primary'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
          
          <button
            onClick={handleLogout}
            className="menu-item-linear w-full flex items-center px-4 py-3 text-left text-sm font-normal tracking-wide text-red-500 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Content */}
        <main className="flex-1 overflow-auto p-8 relative">
          <div className="floating-shapes">
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}