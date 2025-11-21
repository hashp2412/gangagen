'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { proteinService } from '../lib/proteinService';
import Sidebar from './Sidebar';
import { ArrowLeft } from 'lucide-react';

const DomainScale = ({ protein }) => {
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
  
  const parseRange = (data) => {
    if (!data || typeof data !== 'string') return null;
    
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
  
  const range = parseRange(protein?.entries_header);

  const calculatePosition = (position) => {
    // Calculate position within the available width (excluding padding)
    return padding + (position / sequenceLength) * svgWidth;
  };
  
  const generateTicks = () => {
    const majorTicks = [];
    const minorTicks = [];
    const majorInterval = 50;
    const minorInterval = 10;
    
    // Generate major ticks every 50
    for (let i = 0; i <= sequenceLength; i += majorInterval) {
      majorTicks.push(i);
    }
    
    // Always include the sequence length as the final major tick if it's not already included
    if (majorTicks[majorTicks.length - 1] !== sequenceLength) {
      majorTicks.push(sequenceLength);
    }
    
    // Generate minor ticks every 10 (excluding positions that are already major ticks)
    for (let i = 0; i <= sequenceLength; i += minorInterval) {
      if (!majorTicks.includes(i)) {
        minorTicks.push(i);
      }
    }
    
    return { majorTicks, minorTicks };
  };
  
  const { majorTicks, minorTicks } = generateTicks();
  
  // Function to render sequence with highlighting
  const renderSequenceWithHighlight = () => {
    if (!protein?.sequence || !range) return null;

    const sequence = protein.sequence;
    // Positions are 1-indexed, but substring is 0-indexed
    // So position 5 means the 5th character, which is index 4
    const beforeDomain = sequence.substring(0, range.start - 1);
    const domainSequence = sequence.substring(range.start - 1, range.end);
    const afterDomain = sequence.substring(range.end);

    return (
      <div className="font-mono text-xs break-all leading-relaxed">
        <span className="text-gray-400">{beforeDomain}</span>
        <span className="bg-orange-500 text-white px-0.5 rounded">{domainSequence}</span>
        <span className="text-gray-400">{afterDomain}</span>
      </div>
    );
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-heading text-linear-text-primary mb-4">Domain Position</h3>

      <div className="relative p-8 glass-effect rounded-3xl">
        <svg
          viewBox={`0 0 ${svgWidth + padding * 2} ${scaleHeight}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
        >
          <defs>
            <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          
          <rect
            x={padding}
            y="30"
            width={svgWidth}
            height="20"
            fill="#dcfce7"
            stroke="#bbf7d0"
            strokeWidth="2"
            rx="10"
          />
          
          {range && (
            <g
              onMouseEnter={() => setHoveredDomain(range)}
              onMouseLeave={() => setHoveredDomain(null)}
              className="cursor-pointer"
            >
              <rect
                x={calculatePosition(range.start)}
                y="25"
                width={(range.end - range.start) / sequenceLength * svgWidth}
                height="30"
                fill="#f97316"
                fillOpacity={hoveredDomain?.domain === range.domain ? 1 : 0.8}
                stroke="#ea580c"
                strokeWidth="2"
                rx="5"
                className="transition-all duration-200"
              />

              <text
                x={calculatePosition(range.start + (range.end - range.start) / 2)}
                y="42"
                textAnchor="middle"
                className="fill-white text-sm font-semibold"
              >
                {range.domain}
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

        {/* HTML Tooltip with full sequence */}
        {hoveredDomain && hoveredDomain.domain === range.domain && (
          <div
            className="absolute z-50 bg-gray-900 text-white rounded-lg shadow-2xl pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 20}px`,
              transform: 'translate(-50%, -100%)',
              width: '600px',
            }}
          >
            <div className="p-4">
              <div className="font-semibold text-sm mb-2 text-green-400">
                {range.domain}: Position {range.start}-{range.end}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                Domain Length: {range.end - range.start} aa | Protein Length: {sequenceLength} aa
              </div>
              <div className="max-h-60 overflow-y-auto bg-gray-800 p-3 rounded border border-gray-700">
                {renderSequenceWithHighlight()}
              </div>
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default function ProteinDetails({ proteinId, onBack, onLogout }) {
  const [protein, setProtein] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('explore');
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
    if (sectionId === 'explore') {
      // Go back to Dashboard
      onBack();
    } else {
      setActiveSection(sectionId);
    }
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
            className="btn-linear px-4 py-2 flex items-center gap-2"
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
            className="btn-linear px-4 py-2 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen pt-20">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={onLogout}
      />

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
          <div className="max-w-6xl mx-auto">
            <button
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-linear-text-secondary hover:text-linear-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {protein.accession}
            </button>
            
            <div className="space-y-6">
              <div className="card-linear p-8">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-body text-linear-text-primary">
                      <span className="font-semibold font-ui">Name:</span> {protein.name || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-body text-linear-text-primary">
                      <span className="font-semibold font-ui">Organism:</span> {protein.source_organism_scientific_name || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-body text-linear-text-primary">
                      <span className="font-semibold font-ui">Sequence Length:</span> {protein.length || 'N/A'} amino acids
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
                  <h3 className="text-lg font-heading text-linear-text-primary mb-4">Sequence</h3>
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