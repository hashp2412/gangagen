'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { proteinService } from '../lib/proteinService';
import { exportToCSV } from '../lib/csvExport';
import { Download, Trash2, Database, AlertCircle } from 'lucide-react';

export default function SavedQueries() {
  const router = useRouter();
  const [savedProteins, setSavedProteins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProteins, setSelectedProteins] = useState(new Set());

  useEffect(() => {
    fetchSavedProteins();
  }, []);

  const fetchSavedProteins = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get access code from session storage
      const accessCode = sessionStorage.getItem('accessCode');

      if (!accessCode) {
        setError('Access code not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch saved proteins
      const result = await proteinService.fetchSavedProteins(accessCode);

      setSavedProteins(result);
    } catch (err) {
      console.error('Error fetching saved proteins:', err);
      setError('Failed to load saved proteins. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProtein = (proteinId, isSelected) => {
    const newSelected = new Set(selectedProteins);
    if (isSelected) {
      newSelected.add(proteinId);
    } else {
      newSelected.delete(proteinId);
    }
    setSelectedProteins(newSelected);
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const allIds = savedProteins.map(p => p.id);
      setSelectedProteins(new Set(allIds));
    } else {
      setSelectedProteins(new Set());
    }
  };

  const handleExport = async (exportSelected = false) => {
    try {
      // Determine which proteins to export
      const proteinsToExport = exportSelected
        ? savedProteins.filter(p => selectedProteins.has(p.id))
        : savedProteins;

      if (proteinsToExport.length === 0) {
        alert('No proteins to export');
        return;
      }

      // Get the access code
      const accessCode = sessionStorage.getItem('accessCode');

      // Fetch complete data including sequences for export
      const proteinIds = proteinsToExport.map(p => p.id);
      const completeData = await proteinService.fetchCompleteDataForExport(proteinIds);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `saved-proteins-${accessCode}-${timestamp}.csv`;

      // Export to CSV
      exportToCSV(completeData, filename);

      alert(`Exported ${completeData.length} protein(s) successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export proteins. Please try again.');
    }
  };

  const handleDelete = async (deleteSelected = false) => {
    try {
      // Determine which proteins to delete
      const proteinsToDelete = deleteSelected
        ? Array.from(selectedProteins)
        : savedProteins.map(p => p.id);

      if (proteinsToDelete.length === 0) {
        alert('No proteins selected for deletion');
        return;
      }

      // Confirm deletion
      const confirmMessage = deleteSelected
        ? `Are you sure you want to delete ${proteinsToDelete.length} selected protein(s)?`
        : 'Are you sure you want to delete ALL saved proteins?';

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Get the access code
      const accessCode = sessionStorage.getItem('accessCode');

      // Delete proteins from database
      const result = await proteinService.removeSavedProteins(accessCode, proteinsToDelete);

      alert(result.message);

      // Clear selection
      setSelectedProteins(new Set());

      // Refresh the list
      await fetchSavedProteins();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete proteins. Please try again.');
    }
  };

  const isAllSelected = () => {
    return savedProteins.length > 0 && savedProteins.every(p => selectedProteins.has(p.id));
  };

  const isSomeSelected = () => {
    return savedProteins.some(p => selectedProteins.has(p.id));
  };

  const handleRowClick = (proteinId) => {
    // Navigate to details page with protein ID as query parameter
    router.push(`/details?id=${proteinId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
          <p className="mt-4 text-linear-text-secondary font-medium">Loading saved proteins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-linear p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
            <p className="text-linear-text-secondary mb-4">{error}</p>
            <button
              onClick={fetchSavedProteins}
              className="btn-linear px-4 py-2 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (savedProteins.length === 0) {
    return (
      <div className="card-linear p-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-linear-text-primary mb-2">No Saved Proteins</h3>
            <p className="text-linear-text-secondary mb-4">
              You haven't saved any proteins yet. Search for proteins and click "Save" to add them here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="card-linear p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading text-linear-text-primary mb-2">Saved Proteins</h2>
            <div className="flex items-center gap-6 text-sm text-linear-text-secondary">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>{savedProteins.length} proteins saved</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {selectedProteins.size > 0 && (
              <>
                <button
                  onClick={() => handleExport(true)}
                  className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Selected ({selectedProteins.size})</span>
                </button>
                <button
                  onClick={() => handleDelete(true)}
                  className="px-4 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedProteins.size})</span>
                </button>
              </>
            )}
            {selectedProteins.size === 0 && (
              <>
                <button
                  onClick={() => handleExport(false)}
                  className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export All</span>
                </button>
                <button
                  onClick={() => handleDelete(false)}
                  className="px-4 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Saved Proteins Table */}
      <div className="table-linear overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-12 px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={isAllSelected()}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected() && !isAllSelected();
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
                <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                  Saved Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-ui text-linear-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {savedProteins.map((protein) => (
                <tr
                  key={protein.id}
                  onClick={(e) => {
                    // Don't navigate if clicking on checkbox or delete button
                    if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('button')) {
                      handleRowClick(protein.id);
                    }
                  }}
                  className={`cursor-pointer hover:bg-green-50 transition-colors ${
                    selectedProteins.has(protein.id) ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedProteins.has(protein.id)}
                      onChange={(e) => handleSelectProtein(protein.id, e.target.checked)}
                      className="h-4 w-4 text-green-600 accent-green-500 focus:ring-green-500 focus:ring-2 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-linear-text-primary font-mono">
                    {protein.accession || protein.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-linear-text-primary max-w-xs">
                    <div className="truncate" title={protein.name}>
                      {protein.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-linear-text-secondary max-w-xs">
                    <div className="truncate" title={protein.organism}>
                      {protein.organism || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-linear-text-secondary">
                    {protein.entries_header || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-linear-text-secondary">
                    {new Date(protein.saved_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to delete this protein?')) {
                          return;
                        }

                        try {
                          const accessCode = sessionStorage.getItem('accessCode');
                          await proteinService.removeSavedProteins(accessCode, [protein.id]);
                          alert('Protein deleted successfully!');
                          await fetchSavedProteins();
                        } catch (error) {
                          console.error('Delete failed:', error);
                          alert('Failed to delete protein. Please try again.');
                        }
                      }}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Delete this protein"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="bg-white px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-linear-text-secondary">
            <span>
              Showing {savedProteins.length} saved protein{savedProteins.length !== 1 ? 's' : ''}
            </span>
            {selectedProteins.size > 0 && (
              <span className="font-semibold text-green-600">
                {selectedProteins.size} selected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
