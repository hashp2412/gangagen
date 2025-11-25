'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { proteinService } from '../lib/proteinService';
import Sidebar from './Sidebar';
import { ArrowLeft, X } from 'lucide-react';

const DomainScale = ({ protein }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null); // { index, range, domain }
  const [showModal, setShowModal] = useState(null); // stores the segment index to show modal for
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  // For portal - ensure we're on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sequenceLength = protein?.length || 1000;
  const scaleHeight = 120;
  const svgWidth = 1000;
  const padding = 40; // Padding on left and right for labels

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

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

  const parsedData = parseRange(protein?.entries_header);

  // Calculate view window - focus on domains if they're relatively small
  const calculateViewWindow = () => {
    if (!parsedData || parsedData.ranges.length === 0) return { start: 0, end: sequenceLength };

    // Find the overall range span (min start to max end)
    const minStart = Math.min(...parsedData.ranges.map(r => r.start));
    const maxEnd = Math.max(...parsedData.ranges.map(r => r.end));
    const totalDomainSpan = maxEnd - minStart;
    const domainRatio = totalDomainSpan / sequenceLength;

    // If domain span is less than 5% of the sequence, zoom in
    if (domainRatio < 0.05) {
      const domainCenter = (minStart + maxEnd) / 2;
      const windowSize = Math.max(totalDomainSpan * 10, 500); // Show at least 10x domain size or 500aa

      let windowStart = Math.max(0, Math.floor(domainCenter - windowSize / 2));
      let windowEnd = Math.min(sequenceLength, Math.ceil(domainCenter + windowSize / 2));

      // Adjust if we hit boundaries
      if (windowEnd - windowStart < windowSize) {
        if (windowStart === 0) {
          windowEnd = Math.min(sequenceLength, windowSize);
        } else if (windowEnd === sequenceLength) {
          windowStart = Math.max(0, sequenceLength - windowSize);
        }
      }

      return { start: windowStart, end: windowEnd };
    }

    // Show full sequence for larger domains
    return { start: 0, end: sequenceLength };
  };

  const viewWindow = calculateViewWindow();
  const viewLength = viewWindow.end - viewWindow.start;

  const calculatePosition = (position) => {
    // Calculate position relative to the view window
    return padding + ((position - viewWindow.start) / viewLength) * svgWidth;
  };

  const generateTicks = () => {
    const majorTicks = [];
    const minorTicks = [];

    // Dynamically calculate intervals based on view length
    let majorInterval, minorInterval;
    if (viewLength <= 100) {
      majorInterval = 10;
      minorInterval = 5;
    } else if (viewLength <= 500) {
      majorInterval = 50;
      minorInterval = 10;
    } else if (viewLength <= 1000) {
      majorInterval = 100;
      minorInterval = 25;
    } else if (viewLength <= 5000) {
      majorInterval = 500;
      minorInterval = 100;
    } else {
      majorInterval = 1000;
      minorInterval = 200;
    }

    // Generate major ticks
    const firstMajor = Math.ceil(viewWindow.start / majorInterval) * majorInterval;
    for (let i = firstMajor; i <= viewWindow.end; i += majorInterval) {
      if (i >= viewWindow.start && i <= viewWindow.end) {
        majorTicks.push(i);
      }
    }

    // Always include view start and end
    if (!majorTicks.includes(viewWindow.start)) {
      majorTicks.unshift(viewWindow.start);
    }
    if (!majorTicks.includes(viewWindow.end)) {
      majorTicks.push(viewWindow.end);
    }

    // Generate minor ticks
    const firstMinor = Math.ceil(viewWindow.start / minorInterval) * minorInterval;
    for (let i = firstMinor; i <= viewWindow.end; i += minorInterval) {
      if (i >= viewWindow.start && i <= viewWindow.end && !majorTicks.includes(i)) {
        minorTicks.push(i);
      }
    }

    return { majorTicks, minorTicks };
  };

  const { majorTicks, minorTicks } = generateTicks();

  // Function to render sequence with highlighting for a specific segment
  const renderSequenceWithHighlight = (segmentIndex) => {
    if (!protein?.sequence || !parsedData) return null;

    const sequence = protein.sequence;
    const range = parsedData.ranges[segmentIndex];

    // Positions are 1-indexed, but substring is 0-indexed
    const beforeDomain = sequence.substring(0, range.start - 1);
    const domainSequence = sequence.substring(range.start - 1, range.end);
    const afterDomain = sequence.substring(range.end);

    return (
      <div className="font-mono text-xs break-all leading-relaxed">
        <span className="text-gray-400">{beforeDomain}</span>
        <span className="bg-[#08c88a] text-white px-0.5 rounded">{domainSequence}</span>
        <span className="text-gray-400">{afterDomain}</span>
      </div>
    );
  };

  const isZoomed = viewWindow.start > 0 || viewWindow.end < sequenceLength;

  if (!parsedData) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-bold text-linear-text-primary mb-4">Domain Position</h3>
        <p className="text-sm text-linear-text-secondary">{protein?.entries_header || 'N/A'}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-linear-text-primary">
          Domain Position
          {parsedData.ranges.length > 1 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({parsedData.ranges.length} segments)
            </span>
          )}
        </h3>
        {isZoomed && (
          <div className="text-xs text-linear-text-secondary font-mono bg-green-50 px-3 py-1 rounded-full">
            Zoomed View: {viewWindow.start}-{viewWindow.end} of {sequenceLength} aa
          </div>
        )}
      </div>

      {/* Render a scale for each segment */}
      {parsedData.ranges.map((range, index) => {
        const segmentLength = range.end - range.start + 1;

        return (
          <div key={index} className="relative">
            {/* Segment label */}
            {parsedData.ranges.length > 1 && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-[#08c88a]">
                  Segment {index + 1}
                </span>
                <span className="text-xs text-gray-500">
                  ({range.start}-{range.end}, {segmentLength} aa)
                </span>
              </div>
            )}

            <div className="relative p-8 glass-effect rounded-3xl">
              <svg
                viewBox={`0 0 ${svgWidth + padding * 2} ${scaleHeight}`}
                className="w-full h-auto"
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={handleMouseMove}
              >
                <defs>
                  <linearGradient id={`proteinGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ab079" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#08c88a" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#07eea5" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Background bar representing full protein */}
                <rect
                  x={padding}
                  y="30"
                  width={svgWidth}
                  height="20"
                  fill="#d1fae5"
                  stroke="#a7f3d0"
                  strokeWidth="2"
                  rx="10"
                />

                {/* Domain segment */}
                {range.end >= viewWindow.start && range.start <= viewWindow.end && (
                  <g
                    onMouseEnter={() => setHoveredSegment({ index, range, domain: parsedData.domain })}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => setShowModal(index)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={calculatePosition(Math.max(range.start, viewWindow.start))}
                      y="25"
                      width={((Math.min(range.end, viewWindow.end) - Math.max(range.start, viewWindow.start)) / viewLength) * svgWidth}
                      height="30"
                      fill="#08c88a"
                      fillOpacity={hoveredSegment?.index === index ? 1 : 0.8}
                      stroke="#0ab079"
                      strokeWidth="2"
                      rx="5"
                      className="transition-all duration-200"
                    />

                    <text
                      x={calculatePosition((Math.max(range.start, viewWindow.start) + Math.min(range.end, viewWindow.end)) / 2)}
                      y="42"
                      textAnchor="middle"
                      className="fill-white text-sm font-semibold pointer-events-none"
                    >
                      {parsedData.domain}
                    </text>
                  </g>
                )}

                {/* Major ticks with labels */}
                {majorTicks.map((tick) => (
                  <g key={`major-${tick}`}>
                    <line
                      x1={calculatePosition(tick)}
                      y1="55"
                      x2={calculatePosition(tick)}
                      y2="68"
                      stroke="#6b7280"
                      strokeWidth="2"
                    />
                    <text
                      x={calculatePosition(tick)}
                      y="90"
                      textAnchor="middle"
                      className="fill-linear-text-secondary text-xs font-jetbrains"
                    >
                      {tick}
                    </text>
                  </g>
                ))}

                {/* Minor ticks without labels */}
                {minorTicks.map((tick) => (
                  <g key={`minor-${tick}`}>
                    <line
                      x1={calculatePosition(tick)}
                      y1="55"
                      x2={calculatePosition(tick)}
                      y2="62"
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                  </g>
                ))}

                <text
                  x={svgWidth / 2 + padding}
                  y="110"
                  textAnchor="middle"
                  className="fill-linear-text-secondary text-sm font-ui"
                >
                  Sequence Position
                </text>
              </svg>

              {/* Hover hint tooltip */}
              {hoveredSegment?.index === index && showModal === null && (
                <div
                  className="absolute z-40 bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none px-3 py-2"
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y - 10}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="text-xs text-center">
                    <span className="text-[#08c88a] font-semibold">
                      {parsedData.domain}
                      {parsedData.ranges.length > 1 && ` (Segment ${index + 1})`}
                    </span>
                    <span className="text-gray-400 ml-2">Click to view details</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    Range: {range.start}-{range.end} ({segmentLength} aa)
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Domain Details Modal - rendered via Portal to document.body */}
      {isMounted && showModal !== null && parsedData && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowModal(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative bg-black text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-bold text-[#08c88a]">
                  {parsedData.domain}
                  {parsedData.ranges.length > 1 && (
                    <span className="text-gray-400 font-normal ml-2">
                      (Segment {showModal + 1}/{parsedData.ranges.length})
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Position {parsedData.ranges[showModal].start} - {parsedData.ranges[showModal].end}
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-800">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-[#08c88a]">
                  {parsedData.ranges[showModal].end - parsedData.ranges[showModal].start + 1}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
                  Segment Length (aa)
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">
                  {sequenceLength}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
                  Protein Length (aa)
                </div>
              </div>
            </div>

            {/* Sequence */}
            <div className="p-6">
              <div className="max-h-60 overflow-y-auto bg-gray-800 p-4 rounded-xl border border-gray-700">
                {renderSequenceWithHighlight(showModal)}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                The highlighted region shows the domain sequence ({parsedData.ranges[showModal].start}-{parsedData.ranges[showModal].end})
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-800">
              <button
                onClick={() => setShowModal(null)}
                className="px-6 py-3 bg-gradient-to-r from-[#0ab079] to-[#07eea5] text-black font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(8,200,138,0.3)] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function ProteinDetails({ proteinId, onBack, onLogout }) {
  const [protein, setProtein] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchProtein();
  }, [proteinId]);
  
  const fetchProtein = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await proteinService.fetchProteinDetails(proteinId);
      setProtein(data);
    } catch (err) {
      console.error('Error fetching protein:', err);
      setError(err.message || 'Failed to fetch protein details');
    } finally {
      setLoading(false);
    }
  };

  // Handle sidebar section change
  const handleSectionChange = (sectionId) => {
    // Store the desired section in sessionStorage
    sessionStorage.setItem('dashboardSection', sectionId);
    // Navigate back to dashboard - it will read the section and switch to it
    onBack();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={onBack}
            className="btn-linear px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  if (!protein) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-linear-text-secondary text-center">
          <p className="mb-4">Protein not found</p>
          <button
            onClick={onBack}
            className="btn-linear px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <button
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-linear-text-secondary hover:text-linear-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-mono">{protein.accession}</span>
            </button>

            <div className="space-y-6">
              <div className="card-linear p-8">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-linear-text-primary">
                      <span className="font-semibold">Name:</span> {protein.name || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-linear-text-primary">
                      <span className="font-semibold">Organism:</span> {protein.source_organism_scientific_name || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-linear-text-primary">
                      <span className="font-semibold">Sequence Length:</span> {protein.length || 'N/A'} amino acids
                    </p>
                  </div>

                  {protein.description && (
                    <div>
                      <p className="text-sm text-linear-text-primary">
                        <span className="font-semibold">Description:</span> {protein.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-linear p-8">
                <DomainScale protein={protein} />
              </div>

              {protein.sequence && (
                <div className="card-linear p-8">
                  <h3 className="text-lg font-bold text-linear-text-primary mb-4">Sequence</h3>
                  <div className="font-jetbrains text-sm text-linear-text-secondary bg-gray-50 p-4 rounded-lg overflow-x-auto">
                    <pre className="whitespace-pre-wrap break-all">{protein.sequence}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}