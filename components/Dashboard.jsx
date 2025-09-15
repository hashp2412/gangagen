'use client';

import { useState } from 'react';

// Simple 2D Icons
const SearchIcon = () => (
  <div className="w-5 h-5 border-2 border-current rounded-full relative">
    <div className="absolute -bottom-1 -right-1 w-2 h-0.5 bg-current transform rotate-45"></div>
  </div>
);

const DatabaseIcon = () => (
  <div className="w-5 h-5">
    <div className="w-full h-2 bg-current rounded-t"></div>
    <div className="w-full h-1 bg-current opacity-60"></div>
    <div className="w-full h-2 bg-current rounded-b"></div>
  </div>
);

const HistoryIcon = () => (
  <div className="w-5 h-5 border-2 border-current rounded-full relative">
    <div className="absolute top-1 left-1/2 w-0.5 h-2 bg-current transform -translate-x-1/2"></div>
    <div className="absolute top-1/2 left-1/2 w-1.5 h-0.5 bg-current transform -translate-x-1/2"></div>
  </div>
);

const LogOutIcon = () => (
  <div className="w-5 h-5 relative">
    <div className="w-3 h-4 border-2 border-current border-r-0"></div>
    <div className="absolute top-1.5 right-0 w-2 h-0.5 bg-current"></div>
    <div className="absolute top-1 right-0 w-1 h-1 border-t-2 border-r-2 border-current transform rotate-45"></div>
  </div>
);

// Mock database data - replace with actual API call
const mockData = [
  {
    id: 1,
    name: 'EctoLysin-A1',
    organism: 'Escherichia coli',
    domain: 'Bacteria',
    sequence: 'MKKPFTTALVVALLASSGSAAQ...',
    length: 245,
    function: 'Cell wall lysis'
  },
  {
    id: 2,
    name: 'EctoLysin-B2',
    organism: 'Staphylococcus aureus',
    domain: 'Bacteria',
    sequence: 'MKKLSIASLVVVLILLSSGCSQ...',
    length: 198,
    function: 'Peptidoglycan degradation'
  },
  {
    id: 3,
    name: 'EctoLysin-C3',
    organism: 'Pseudomonas aeruginosa',
    domain: 'Bacteria',
    sequence: 'MRRISFALSLVVAILLSSGAAQ...',
    length: 302,
    function: 'Biofilm disruption'
  },
  {
    id: 4,
    name: 'EctoLysin-D4',
    organism: 'Bacillus subtilis',
    domain: 'Bacteria',
    sequence: 'MKKSFTLALVVVLLAASSGAAQ...',
    length: 178,
    function: 'Sporulation regulation'
  },
  {
    id: 5,
    name: 'EctoLysin-E5',
    organism: 'Enterococcus faecalis',
    domain: 'Bacteria',
    sequence: 'MKKPLTVALVVALLACSGSAAQ...',
    length: 234,
    function: 'Cell division'
  }
];

const domains = ['All Domains', 'Bacteria', 'Archaea', 'Eukaryota', 'Virus'];

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('explore');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    organism: '',
    domain: 'All Domains'
  });
  const [filteredData, setFilteredData] = useState(mockData);

  const menuItems = [
    { id: 'explore', label: 'Explore Database', icon: DatabaseIcon },
    { id: 'search', label: 'Search Sequence', icon: SearchIcon },
    { id: 'saved', label: 'Saved Queries', icon: HistoryIcon },
  ];

  const handleSearch = () => {
    const filtered = mockData.filter(item => {
      const matchesName = searchFilters.name === '' || 
        item.name.toLowerCase().includes(searchFilters.name.toLowerCase());
      const matchesOrganism = searchFilters.organism === '' || 
        item.organism.toLowerCase().includes(searchFilters.organism.toLowerCase());
      const matchesDomain = searchFilters.domain === 'All Domains' || 
        item.domain === searchFilters.domain;
      
      return matchesName && matchesOrganism && matchesDomain;
    });
    setFilteredData(filtered);
  };

  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('validAccess');
    sessionStorage.removeItem('accessCode');
    onLogout();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'explore':
        return (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="card-futuristic p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div>
                  <label className="block text-xs font-light text-green-300 mb-3 uppercase tracking-wider">
                    Protein Name
                  </label>
                  <input
                    type="text"
                    value={searchFilters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    placeholder="Enter name..."
                    className="input-futuristic w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-light text-green-300 mb-3 uppercase tracking-wider">
                    Organism
                  </label>
                  <input
                    type="text"
                    value={searchFilters.organism}
                    onChange={(e) => handleFilterChange('organism', e.target.value)}
                    placeholder="Enter organism..."
                    className="input-futuristic w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-light text-green-300 mb-3 uppercase tracking-wider">
                    Domain
                  </label>
                  <select
                    value={searchFilters.domain}
                    onChange={(e) => handleFilterChange('domain', e.target.value)}
                    className="input-futuristic w-full"
                  >
                    {domains.map(domain => (
                      <option key={domain} value={domain} className="bg-gray-900">{domain}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <button
                    onClick={handleSearch}
                    className="btn-futuristic w-full px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <SearchIcon />
                    Execute
                  </button>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="table-futuristic overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="w-12 px-6 py-4 text-left text-xs font-light text-green-200 uppercase tracking-widest">
                        Select
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-light text-green-200 uppercase tracking-widest">
                        Protein ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-light text-green-200 uppercase tracking-widest">
                        Organism
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-light text-green-200 uppercase tracking-widest">
                        Domain
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-light text-green-200 uppercase tracking-widest">
                        Length
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-light text-green-200 uppercase tracking-widest">
                        Function
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((entry) => (
                      <tr 
                        key={entry.id}
                        className={`cursor-pointer ${selectedEntry?.id === entry.id ? 'selected' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="radio"
                            name="selectedEntry"
                            value={entry.id}
                            checked={selectedEntry?.id === entry.id}
                            onChange={() => setSelectedEntry(entry)}
                            className="h-4 w-4 text-green-400 bg-transparent border border-green-400 focus:ring-green-400 focus:ring-1"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-300">
                          {entry.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                          {entry.organism}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">
                          {entry.domain}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-mono">
                          {entry.length} aa
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-300">
                          {entry.function}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredData.length === 0 && (
                <div className="text-center py-12 text-green-400 font-light">
                  No data entries found matching search parameters
                </div>
              )}
            </div>

            {selectedEntry && (
              <div className="card-futuristic p-8">
                <h3 className="text-lg font-light text-green-200 mb-6 roboto tracking-wider uppercase">
                  Selected Entry Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-green-500/20 pb-2">
                      <span className="text-green-300 font-light">Protein ID:</span>
                      <span className="text-green-200 font-mono">{selectedEntry.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-500/20 pb-2">
                      <span className="text-green-300 font-light">Organism:</span>
                      <span className="text-green-200">{selectedEntry.organism}</span>
                    </div>
                    <div className="flex justify-between border-b border-green-500/20 pb-2">
                      <span className="text-green-300 font-light">Domain:</span>
                      <span className="text-green-200">{selectedEntry.domain}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-green-500/20 pb-2">
                      <span className="text-green-300 font-light">Length:</span>
                      <span className="text-green-200 font-mono">{selectedEntry.length} aa</span>
                    </div>
                    <div className="flex justify-between border-b border-green-500/20 pb-2">
                      <span className="text-green-300 font-light">Function:</span>
                      <span className="text-green-200">{selectedEntry.function}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-green-500/20 pt-6">
                  <p className="text-green-300 font-light mb-3 uppercase tracking-wider text-xs">Sequence Data:</p>
                  <div className="bg-black/40 border border-green-500/30 p-4 font-mono text-sm text-green-300 break-all leading-relaxed">
                    {selectedEntry.sequence}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'search':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Sequence</h2>
            <p className="text-gray-600">Sequence search functionality coming soon...</p>
          </div>
        );
      
      case 'saved':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Saved Queries</h2>
            <p className="text-gray-600">Your saved queries will appear here...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 sidebar-futuristic">
        <div className="p-6 border-b border-green-500/30">
          <h1 className="text-lg font-light text-green-200 roboto tracking-wide">
            GangaGen AI
          </h1>
          <p className="text-xs text-green-400 mt-1 font-mono uppercase tracking-widest">
            Database Explorer
          </p>
        </div>
        
        <nav className="mt-8 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`menu-item-futuristic w-full flex items-center px-4 py-3 text-left text-sm font-light tracking-wide ${
                  activeSection === item.id ? 'active' : 'text-green-300'
                }`}
              >
                <div className="mr-3 opacity-70">
                  <Icon />
                </div>
                {item.label}
              </button>
            );
          })}
          
          <button
            onClick={handleLogout}
            className="menu-item-futuristic w-full flex items-center px-4 py-3 text-left text-sm font-light tracking-wide text-red-400 mt-8 hover:bg-red-500/10"
          >
            <div className="mr-3 opacity-70">
              <LogOutIcon />
            </div>
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="backdrop-blur-sm bg-black/20 border-b border-green-500/30 px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-light text-green-200 capitalize roboto tracking-wider">
              {activeSection.replace('-', ' ')}
            </h1>
            <div className="text-xs text-green-400 font-mono uppercase tracking-wider border border-green-500/30 px-3 py-1">
              Database Active
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8" style={{
          background: 'radial-gradient(ellipse at center, rgba(26, 43, 26, 0.3) 0%, rgba(10, 15, 10, 0.8) 100%)'
        }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}