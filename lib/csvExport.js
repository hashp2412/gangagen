/**
 * CSV Export Utility
 *
 * This file contains functions to convert protein query data into CSV format
 * and trigger a download in the browser.
 *
 * CSV (Comma-Separated Values) is a simple file format that stores tabular data.
 * Each line represents a row, and values are separated by commas.
 */

/**
 * Converts an array of protein entries into CSV format
 *
 * @param {Array} data - Array of protein objects to export
 * @returns {string} CSV formatted string
 *
 * How this works:
 * 1. Define which fields from the data we want to export (columns)
 * 2. Create a header row with column names
 * 3. For each data entry, extract the values and format them properly
 * 4. Combine everything into a single CSV string
 */
export function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Define the columns we want to export
  // These are the field names from each protein entry
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'accession', header: 'Accession' },
    { key: 'name', header: 'Name' },
    { key: 'source_organism_full_name', header: 'Organism' },
    { key: 'entries_header', header: 'Domain' },
    { key: 'length', header: 'Length' },
    { key: 'sequence', header: 'Sequence' }
  ];

  // Create the header row
  // This is the first line of the CSV with column names
  const headers = columns.map(col => col.header).join(',');

  // Create the data rows
  // For each protein entry, we extract the values and format them
  const rows = data.map(entry => {
    return columns.map(col => {
      // Get the value for this column from the entry
      let value = entry[col.key] || '';

      // Convert to string and handle special characters
      value = String(value);

      // If the value contains commas, quotes, or newlines, we need to:
      // 1. Wrap it in double quotes
      // 2. Escape any existing double quotes by doubling them
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  // Combine header and all rows with newline characters
  return [headers, ...rows].join('\n');
}

/**
 * Triggers a file download in the browser
 *
 * @param {string} csvContent - The CSV content to download
 * @param {string} filename - The name of the file to download
 *
 * How this works:
 * 1. Create a "Blob" - a file-like object containing the CSV data
 * 2. Create a temporary URL that points to this blob
 * 3. Create an invisible <a> link element
 * 4. Set the link to download the file when clicked
 * 5. Programmatically click the link to trigger the download
 * 6. Clean up by removing the link and revoking the URL
 */
export function downloadCSV(csvContent, filename = 'export.csv') {
  // Create a Blob (Binary Large Object) from the CSV string
  // The Blob represents the file data
  // 'text/csv;charset=utf-8;' tells the browser this is a CSV text file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create a temporary URL that points to the blob
  // This URL can be used to download the file
  const url = window.URL.createObjectURL(blob);

  // Create an invisible link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename; // Set the filename for download
  link.style.display = 'none'; // Make it invisible

  // Add the link to the page (required for Firefox)
  document.body.appendChild(link);

  // Programmatically click the link to trigger the download
  link.click();

  // Clean up: remove the link and revoke the URL to free memory
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Main export function - converts data to CSV and triggers download
 *
 * @param {Array} data - Array of protein objects to export
 * @param {string} filename - Optional filename (defaults to timestamped name)
 *
 * This is the main function you'll call from your component.
 * It combines the CSV conversion and download steps.
 */
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // If no filename provided, create one with current timestamp
  // This ensures each export has a unique name
  if (!filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    filename = `protein-data-export-${timestamp}.csv`;
  }

  // Convert the data to CSV format
  const csvContent = convertToCSV(data);

  // Trigger the download
  downloadCSV(csvContent, filename);

  console.log(`Exported ${data.length} entries to ${filename}`);
}
