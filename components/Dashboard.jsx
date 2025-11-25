'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { proteinService } from '../lib/proteinService';
import { exportToCSV } from '../lib/csvExport';
import SequenceSearch from './SequenceSearch';
import Sidebar from './Sidebar';
import SavedQueries from './SavedQueries';

import {
  Search,
  Download,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Range Visualization Component
const RangeVisualization = ({ rangeData, domainBounds, proteinLength }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null); // { index, range, domain }
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Parse range data - handles single and multiple ranges
  // Examples: "PF03245(27...149)" or "PF00704(34...320,355...427)"
  const parseRange = (data) => {
    if (!data || typeof data !== 'string') return null;

    // Match the domain code and everything inside parentheses
    const domainMatch = data.match(/([A-Z0-9]+)\(([^)]+)\)/);
    if (!domainMatch || domainMatch.length < 3) return null;

    const domain = domainMatch[1];
    const rangesStr = domainMatch[2];

    // Parse all ranges (comma-separated)
    const rangeMatches = rangesStr.matchAll(/(\d+)[\.\-]+(\d+)/g);
    const ranges = [];

    for (const match of rangeMatches) {
      ranges.push({
        start: parseInt(match[1]),
        end: parseInt(match[2])
      });
    }

    if (ranges.length === 0) return null;

    return {
      domain,
      ranges
    };
  };

  const parsedData = parseRange(rangeData);

  if (!parsedData) {
    return <span className="text-sm text-linear-text-secondary">{rangeData || 'N/A'}</span>;
  }

  // Use protein length as the full scale (100% = protein length)
  const scaleEnd = proteinLength || 200; // Full protein length
  const blockWidth = 200; // px - width of the visualization bar

  return (
    <div className="relative inline-block group">
      <div
        className={`flex items-center gap-3 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: `${blockWidth}px` }}
      >
        {/* Main visualization bar */}
        <div className="relative flex-1 h-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden shadow-inner">
          {/* Render each range segment with individual hover */}
          {parsedData.ranges.map((range, index) => {
            const startPercent = Math.max(0, Math.min(100, (range.start / scaleEnd) * 100));
            const endPercent = Math.max(0, Math.min(100, (range.end / scaleEnd) * 100));
            const widthPercent = endPercent - startPercent;
            const segmentLength = range.end - range.start + 1;

            return (
              <div
                key={index}
                className={`absolute h-full bg-gradient-to-r from-[#0ab079] to-[#07eea5] rounded-full transition-all duration-300 shadow-md cursor-pointer ${
                  hoveredSegment?.index === index ? 'brightness-110 scale-y-110' : ''
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget.closest('.relative.inline-block').getBoundingClientRect();
                  setTooltipPosition({
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top
                  });
                  setHoveredSegment({
                    index,
                    range,
                    domain: parsedData.domain,
                    segmentLength,
                    segmentNumber: index + 1,
                    totalSegments: parsedData.ranges.length
                  });
                }}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            );
          })}
        </div>

        {/* Domain label */}
        <span className="text-xs text-[#08c88a] font-jetbrains whitespace-nowrap font-bold bg-green-50 px-2 py-1 rounded-md">
          {parsedData.domain}
        </span>
      </div>

      {/* Hover tooltip - shows specific segment info */}
      {hoveredSegment && (
        <div
          className="absolute z-50 bg-white text-slate-900 text-xs px-4 py-3 pointer-events-none rounded-xl shadow-2xl border-2 border-green-200"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 90}px`,
            transform: 'translateX(-50%)',
            minWidth: '180px'
          }}
        >
          <div className="font-bold text-[#08c88a] text-sm mb-2">
            {hoveredSegment.domain}
            {hoveredSegment.totalSegments > 1 && (
              <span className="text-gray-500 font-normal ml-1">
                (Segment {hoveredSegment.segmentNumber}/{hoveredSegment.totalSegments})
              </span>
            )}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">Range:</span> {hoveredSegment.range.start}-{hoveredSegment.range.end}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">Segment Length:</span> {hoveredSegment.segmentLength} aa
          </div>
          <div className="text-gray-900 font-semibold border-t pt-2 mt-2">
            <span className="text-gray-600 font-normal">Protein:</span> {proteinLength || 'N/A'} aa
          </div>
        </div>
      )}
    </div>
  );
};



// Database data will be fetched from Supabase

const domains = ['All Domains', 'Bacteria', 'Archaea', 'Eukaryota', 'Virus'];

export default function Dashboard({ onLogout }) {
  const router = useRouter();
  const mainContentRef = useRef(null); // Reference to scrolling container
  const domainDropdownRef = useRef(null); // Reference for custom domain dropdown
  const [activeSection, setActiveSection] = useState('explore');
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [isStateRestored, setIsStateRestored] = useState(false);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false); // Track domain dropdown state
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    organism: '',
    domain: ''
  });

  // Close domain dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target)) {
        setIsDomainDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Domain options for dropdown with names
  const domainOptions = [
    { code: "PF03245", name: "Bile acid:sodium symporter family" },
    { code: "PF16754", name: "GTP-binding domain" },
    { code: "PF11860", name: "Domain of unknown function" },
    { code: "PF13702", name: "Ankyrin repeats" },
    { code: "PF00959", name: "Nucleoside transporter" },
    { code: "PF00182", name: "Chitinase class I" },
    { code: "PF00704", name: "Glycosyl hydrolases family" },
    { code: "PF01374", name: "SUR7/PalI family" },
    { code: "PF05838", name: "SNARE domain" },
    { code: "PF18013", name: "Transmembrane domain" },
    { code: "PF04965", name: "Membrane protein" },
    { code: "PF01183", name: "Glycosyltransferase" },
    { code: "PF00722", name: "Glycosyl hydrolase family 16" },
    { code: "PF05193", name: "Peptidase family" },
    { code: "PF01551", name: "Peptidase family M23" },
    { code: "PF00675", name: "Insulinase family" },
    { code: "PF01435", name: "Peptidase family M41" },
    { code: "PF01433", name: "Peptidase family M1" },
    { code: "PF10502", name: "Signal peptide domain" },
    { code: "PF00246", name: "Zinc carboxypeptidase" },
    { code: "PF03572", name: "Peptidase family S49" },
    { code: "PF00814", name: "Glycoprotease family" },
    { code: "PF17900", name: "Bacterial domain" },
    { code: "PF01510", name: "N-acetylmuramoyl-L-alanine amidase" },
    { code: "PF01520", name: "N-acetylmuramoyl-L-alanine amidase" },
    { code: "PF05257", name: "Endopeptidase" },
    { code: "PF06347", name: "Protein of unknown function" },
    { code: "PF08239", name: "Bacterial surface protein" },
    { code: "PF08460", name: "WxL domain" },
    { code: "PF01476", name: "LysM domain" },
    { code: "PF14859", name: "Bacterial domain" },
    { code: "PF01024", name: "Cysteine-rich domain" },
    { code: "PF11429", name: "Domain of unknown function" }
  ];
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [domainBounds, setDomainBounds] = useState({ min: 0, max: 200 });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(null); // Total count of results
  const [countLoading, setCountLoading] = useState(false); // Is count still loading?
  const [hasMore, setHasMore] = useState(false); // For pagination when count is unknown
  const [pageInput, setPageInput] = useState('');

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

  // Restore search state when component mounts (e.g., after navigating back from details)
  useEffect(() => {
    // Check if we need to switch to a specific section (from protein details page navigation)
    const desiredSection = sessionStorage.getItem('dashboardSection');
    if (desiredSection) {
      setActiveSection(desiredSection);
      // Clear it so it doesn't affect future navigations
      sessionStorage.removeItem('dashboardSection');
    }

    // Try to restore previous search state from sessionStorage
    const savedState = sessionStorage.getItem('dashboardSearchState');

    if (savedState) {
      try {
        const { filters, page, results, scrollPosition } = JSON.parse(savedState);

        if (filters) {
          setSearchFilters(filters);
        }

        if (page) {
          setCurrentPage(page);
        }

        // Restore results if they exist
        if (results && results.data && results.data.length > 0) {
          setData(results.data);
          setFilteredData(results.data);
          setTotalPages(results.totalPages || 0);
          setError(null);
          setIsStateRestored(true);

          // Calculate domain bounds
          const bounds = calculateDomainBounds(results.data);
          setDomainBounds(bounds);

          // Restore scroll position after DOM is ready
          if (scrollPosition !== undefined && scrollPosition !== null && scrollPosition > 0) {
            // Restore scroll on the main content container
            const restoreScroll = () => {
              if (mainContentRef.current) {
                mainContentRef.current.scrollTop = scrollPosition;
              }
            };

            // Strategy 1: Immediate
            restoreScroll();

            // Strategy 2: Using requestAnimationFrame (after browser paint)
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                restoreScroll();
              });
            });

            // Strategy 3: Fallback with timeout (after DOM is definitely ready)
            setTimeout(() => {
              restoreScroll();
            }, 50);

            // Strategy 4: Final fallback
            setTimeout(() => {
              if (mainContentRef.current && Math.abs(mainContentRef.current.scrollTop - scrollPosition) > 10) {
                restoreScroll();
              }
            }, 200);
          }
        } else {
          setIsStateRestored(false);
        }
      } catch (err) {
        console.error('Failed to restore search state:', err);
        // Clear corrupted state
        sessionStorage.removeItem('dashboardSearchState');
        setIsStateRestored(false);
      }
    } else {
      setIsStateRestored(false);
    }

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

      // Callback function that will be called when count is ready (runs in background)
      const handleCountUpdate = (countData) => {
        console.log('Count update received:', countData);
        setTotalCount(countData.count);
        setTotalPages(countData.totalPages);
        setCountLoading(false);

        // Update sessionStorage with the new count
        const savedState = sessionStorage.getItem('dashboardSearchState');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            state.results.count = countData.count;
            state.results.totalPages = countData.totalPages;
            sessionStorage.setItem('dashboardSearchState', JSON.stringify(state));
          } catch (err) {
            console.error('Failed to update session storage with count:', err);
          }
        }
      };

      // Use the optimized service with count callback
      const result = await proteinService.fetchProteinsOptimized(searchFilters, page, handleCountUpdate);

      setData(result.data);
      setFilteredData(result.data);
      setHasMore(result.hasMore || false);
      setCurrentPage(result.currentPage);

      // Set count state based on whether count is available yet
      if (result.countLoading) {
        setCountLoading(true);
        setTotalCount(null);
        setTotalPages(null);
      } else {
        setCountLoading(false);
        setTotalCount(result.count);
        setTotalPages(result.totalPages || 0);
      }

      // Calculate and set domain bounds
      if (result.data && result.data.length > 0) {
        const bounds = calculateDomainBounds(result.data);
        setDomainBounds(bounds);
      }

      // Save search state to sessionStorage for restoration when navigating back
      const stateToSave = {
        filters: searchFilters,
        page: result.currentPage,
        results: {
          data: result.data,
          totalPages: result.totalPages,
          count: result.count
        }
      };

      sessionStorage.setItem('dashboardSearchState', JSON.stringify(stateToSave));

      // Show message if no results (only if we know count is 0)
      if (result.count === 0 && !result.countLoading) {
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
    // If totalPages is null (unknown count), allow navigation based on hasMore
    if (totalPages === null || totalPages === 0) {
      if (page >= 1 && (page > currentPage ? hasMore : true)) {
        fetchData(page);
      }
    } else {
      // Normal pagination with known totalPages
      if (page >= 1 && page <= totalPages) {
        fetchData(page);
      }
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    // If totalPages is null, allow any page >= 1
    if (totalPages === null || totalPages === 0) {
      if (page >= 1) {
        fetchData(page);
        setPageInput('');
      }
    } else {
      if (page >= 1 && page <= totalPages) {
        fetchData(page);
        setPageInput('');
      }
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
    // Get scroll position from the main content container (not window!)
    const scrollPosition = mainContentRef.current?.scrollTop || 0;

    // Get current state and add scroll position
    const currentState = sessionStorage.getItem('dashboardSearchState');
    if (currentState) {
      try {
        const state = JSON.parse(currentState);
        state.scrollPosition = scrollPosition;
        sessionStorage.setItem('dashboardSearchState', JSON.stringify(state));
      } catch (err) {
        console.error('Failed to save scroll position:', err);
      }
    }

    // Save current section so we return to Explore Database when coming back
    sessionStorage.setItem('dashboardSection', 'explore');

    // Navigate to details page with protein ID as query parameter
    router.push(`/details?id=${proteinId}`);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'explore':
        return (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="bg-white p-8 mb-8 rounded-2xl shadow-lg backdrop-blur-xl bg-opacity-95 border border-gray-100 overflow-visible relative z-[100]">
              <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <div className="w-1 h-6 bg-[#08c88a] rounded-full"></div>
                Search Proteins
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end overflow-visible">
                {/* Name/ID field */}
                <div>
                  <label className="block text-xs text-linear-text-secondary mb-3 uppercase tracking-wider font-medium">
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

                {/* Organism field */}
                <div>
                  <label className="block text-xs text-linear-text-secondary mb-3 uppercase tracking-wider font-medium">
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

                {/* Custom Domain dropdown - expands when clicked (takes space of buttons) */}
                <div
                  className={`overflow-visible ${isDomainDropdownOpen ? 'col-span-2' : ''}`}
                  ref={domainDropdownRef}
                >
                  <label className="block text-xs text-linear-text-secondary mb-3 uppercase tracking-wider font-medium">
                    Domain
                  </label>
                  <div className="relative overflow-visible">
                    {/* Custom dropdown trigger */}
                    <button
                      type="button"
                      onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                      className={`input-linear w-full cursor-pointer bg-white pr-10 text-left flex items-center justify-between ${
                        isDomainDropdownOpen ? 'border-[#08c88a] ring-2 ring-[#08c88a]/20' : ''
                      }`}
                    >
                      <span className={`truncate ${searchFilters.domain ? 'text-gray-800' : 'text-gray-400'}`}>
                        {searchFilters.domain
                          ? `${searchFilters.domain} - ${domainOptions.find(d => d.code === searchFilters.domain)?.name || ''}`
                          : 'Select domain...'}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 flex-shrink-0 text-[#08c88a] transition-transform duration-150 ${
                          isDomainDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Custom dropdown options */}
                    <AnimatePresence>
                      {isDomainDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.1 }}
                          className="absolute z-[9999] w-full mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl max-h-[30rem] overflow-y-auto"
                        >
                          {/* Clear option */}
                          <div
                            onClick={() => {
                              handleFilterChange('domain', '');
                              setIsDomainDropdownOpen(false);
                            }}
                            className="px-4 py-3 cursor-pointer text-gray-400 hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
                          >
                            Select domain...
                          </div>
                          {/* Domain options */}
                          {domainOptions.map((domain, index) => (
                            <div
                              key={domain.code}
                              onClick={() => {
                                handleFilterChange('domain', domain.code);
                                setIsDomainDropdownOpen(false);
                              }}
                              className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-center justify-between ${
                                searchFilters.domain === domain.code
                                  ? 'bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7] text-[#047857]'
                                  : 'text-gray-700 hover:bg-green-50'
                              } ${index !== domainOptions.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                              <span>
                                <span className="font-semibold text-[#08c88a]">{domain.code}</span>
                                <span className="text-gray-400 mx-2">-</span>
                                <span>{domain.name}</span>
                              </span>
                              {searchFilters.domain === domain.code && (
                                <Check className="w-5 h-5 text-[#08c88a]" />
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Execute and Clear buttons - hidden when domain dropdown is open */}
                {!isDomainDropdownOpen && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSearch}
                      className="bg-black text-white border-0 rounded-xl px-6 py-3 font-semibold text-sm tracking-wide uppercase transition-all duration-300 ease-in-out shadow-md relative overflow-hidden flex-1 flex items-center justify-center gap-2 hover:bg-gray-800"
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
                        // Clear saved search state
                        sessionStorage.removeItem('dashboardSearchState');
                      }}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 font-semibold text-gray-700"
                      title="Clear filters"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>


            {/* Data Table */}
            <div className="table-linear overflow-hidden">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#08c88a] shadow-lg"></div>
                      <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-[#08c88a] animate-pulse" />
                    </div>
                    <p className="mt-6 text-lg text-gray-900 font-semibold">Searching database...</p>
                    <p className="text-sm text-gray-500 mt-2">Processing {filteredData.length > 0 ? `${filteredData.length} results` : 'your query'}</p>
                    <div className="flex gap-2 mt-4">
                      <div className="w-2 h-2 bg-[#08c88a] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-[#08c88a] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-[#08c88a] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
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
                    className="btn-linear px-6 py-3 rounded-xl text-sm"
                  >
                    Clear
                  </button>
                </div>
              )}

              {!loading && !error && filteredData.length === 0 && (
                <div className="text-center py-20">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-full mb-6">
                      <img src="/discovery.png" alt="Discovery" className="w-16 h-16 object-contain" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No data to display</h3>
                    <p className="text-gray-600 mb-2 text-base">Use the search filters above to find proteins</p>
                    <p className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">Search by name, organism, or domain</p>
                  </div>
                </div>
              )}

              {!loading && !error && filteredData.length > 0 && (
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-black">
                      <tr>
                        <th className="w-12 px-6 py-4 text-left text-xs text-white uppercase tracking-wider font-semibold">
                          <input
                            type="checkbox"
                            checked={isAllCurrentPageSelected()}
                            ref={(input) => {
                              if (input) input.indeterminate = isSomeCurrentPageSelected() && !isAllCurrentPageSelected();
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 accent-[#08c88a]"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs text-white uppercase tracking-widest font-semibold">
                          ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs text-white uppercase tracking-widest font-semibold">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs text-white uppercase tracking-widest font-semibold">
                          Organism
                        </th>
                        <th className="px-6 py-4 text-left text-xs text-white uppercase tracking-widest font-semibold min-w-[220px]">
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
                              className="h-4 w-4 accent-[#08c88a]"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-linear-text-primary font-medium">
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
                          <td className="px-6 py-4 min-w-[220px]">
                            <RangeVisualization
                              rangeData={entry.entries_header}
                              domainBounds={domainBounds}
                              proteinLength={entry.length}
                            />
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
                        {countLoading ? (
                          // Count is loading - show current page data with loading indicator
                          <span className="flex items-center gap-2">
                            {`Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${((currentPage - 1) * itemsPerPage) + filteredData.length}`}
                            <span className="text-gray-400">of</span>
                            <span className="inline-flex items-center gap-1 text-[#08c88a]">
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              counting...
                            </span>
                          </span>
                        ) : totalCount !== null ? (
                          // Count is known - show full info
                          `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount.toLocaleString()} entries`
                        ) : (
                          // Unknown total (fallback) - show page number with hasMore
                          `Page ${currentPage} - Many results${hasMore ? ' (more available)' : ''}`
                        )}
                      </span>
                    </div>

                    {/* Center - Pagination Navigation */}
                    <div className="flex items-center space-x-2">
                      {/* Previous button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-6 py-3 text-sm bg-white text-gray-700 hover:bg-green-50 hover:text-[#08c88a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1 rounded-xl border border-gray-200 font-medium"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>

                      {/* Page numbers - shows: currentPage, nextPage, ... lastPage */}
                      <div className="flex space-x-1 items-center">
                        {totalPages !== null && totalPages > 0 ? (
                          <>
                            {/* Current page */}
                            <button
                              onClick={() => handlePageChange(currentPage)}
                              className="px-4 py-3 text-sm transition-all duration-300 rounded-xl border bg-[#08c88a] text-white border-[#08c88a] shadow-lg"
                            >
                              {currentPage}
                            </button>

                            {/* Next page (if exists and not the last page) */}
                            {currentPage + 1 <= totalPages && currentPage + 1 < totalPages && (
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="px-4 py-3 text-sm transition-all duration-300 rounded-xl border bg-white text-gray-700 border-gray-200 hover:bg-green-50 hover:text-[#08c88a] hover:border-green-200"
                              >
                                {currentPage + 1}
                              </button>
                            )}

                            {/* Ellipsis and last page (if current page is not at or near the end) */}
                            {currentPage < totalPages && (
                              <>
                                {currentPage + 1 < totalPages && (
                                  <span className="px-2 text-linear-text-secondary">...</span>
                                )}
                                <button
                                  onClick={() => handlePageChange(totalPages)}
                                  className="px-4 py-3 text-sm transition-all duration-300 rounded-xl border bg-white text-gray-700 border-gray-200 hover:bg-green-50 hover:text-[#08c88a] hover:border-green-200"
                                >
                                  {totalPages}
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          /* Unknown total pages - just show current page */
                          <button
                            className="px-4 py-3 text-sm bg-[#08c88a] text-white rounded-xl border border-[#08c88a] shadow-lg"
                          >
                            {currentPage}
                          </button>
                        )}
                      </div>

                      {/* Next button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={totalPages ? currentPage === totalPages : !hasMore}
                        className="px-6 py-3 text-sm bg-white text-gray-700 hover:bg-green-50 hover:text-[#08c88a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1 rounded-xl border border-gray-200 font-medium"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Page jump */}
                      <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2 ml-4">
                        <span className="text-sm text-gray-600 font-medium">Go to:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="1"
                          max={totalPages || undefined}
                          value={pageInput}
                          onChange={(e) => {
                            // Only allow numeric input (no alphabets, no symbols)
                            // Remove non-digits first, then remove leading zeros
                            const value = e.target.value
                              .replace(/[^0-9]/g, '')  // Remove non-digits
                              .replace(/^0+/, '');      // Remove leading zeros (prevents 0, 00, 01, etc.)
                            setPageInput(value);
                          }}
                          placeholder="Page"
                          className="w-16 px-3 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#08c88a] transition-all duration-300"
                        />
                        {/* Go button only shows when input has a value */}
                        {pageInput && (
                          <button
                            type="submit"
                            className="px-6 py-3 text-sm bg-[#08c88a] text-white hover:bg-[#0ab079] transition-all duration-300 rounded-xl font-medium shadow-md hover:shadow-lg"
                          >
                            Go
                          </button>
                        )}
                      </form>
                    </div>

                    {/* Right - Export and Save Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            // Determine which entries to export
                            const entriesToExport = selectedEntries.size > 0
                              ? filteredData.filter(entry => selectedEntries.has(entry.id))
                              : filteredData;

                            if (entriesToExport.length === 0) {
                              alert('No data to export');
                              return;
                            }

                            // Show loading state
                            const button = document.activeElement;
                            const originalText = button.innerHTML;
                            button.disabled = true;
                            button.innerHTML = '<span class="animate-spin">⏳</span> Fetching sequences...';

                            // Fetch complete data including sequences
                            const proteinIds = entriesToExport.map(entry => entry.id);
                            const completeData = await proteinService.fetchCompleteDataForExport(proteinIds);

                            // Generate filename with timestamp
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                            const filename = `protein-data-export-${timestamp}.csv`;

                            // Export to CSV and download
                            exportToCSV(completeData, filename);

                            // Restore button state
                            button.disabled = false;
                            button.innerHTML = originalText;
                          } catch (error) {
                            console.error('Export failed:', error);
                            alert('Failed to export data. Please try again.');
                            // Restore button state on error
                            const button = document.activeElement;
                            button.disabled = false;
                          }
                        }}
                        className="px-2 py-2 text-sm bg-white cursor-pointer text-gray-700 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 flex items-center space-x-2 rounded-lg font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export {selectedEntries.size > 0 ? `(${selectedEntries.size})` : 'All'}</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            // Get the access code from session storage
                            const accessCode = sessionStorage.getItem('accessCode');

                            if (!accessCode) {
                              alert('Access code not found. Please log in again.');
                              return;
                            }

                            // Determine which entries to save
                            const entriesToSave = selectedEntries.size > 0
                              ? filteredData.filter(entry => selectedEntries.has(entry.id))
                              : filteredData;

                            if (entriesToSave.length === 0) {
                              alert('No proteins to save. Please select proteins or perform a search.');
                              return;
                            }

                            // Show loading state
                            const button = document.activeElement;
                            const originalText = button.innerHTML;
                            button.disabled = true;
                            button.innerHTML = '<span class="animate-spin">⏳</span> Saving...';

                            // Save proteins to database
                            const result = await proteinService.saveProteinsForAccessCode(accessCode, entriesToSave);

                            // Restore button state
                            button.disabled = false;
                            button.innerHTML = originalText;

                            // Show success message
                            alert(result.message);

                            // Clear selection after save
                            setSelectedEntries(new Set());
                          } catch (error) {
                            console.error('Save failed:', error);
                            alert(`Failed to save proteins: ${error.message}`);

                            // Restore button state on error
                            const button = document.activeElement;
                            button.disabled = false;
                          }
                        }}
                        className="px-2 py-2 text-sm transition-all duration-300 flex items-center cursor-pointer space-x-2 rounded-lg font-medium bg-gradient-to-r from-[#0ab079] to-[#07eea5] text-white"

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
        return <SavedQueries />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Content */}
        <main ref={mainContentRef} className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}