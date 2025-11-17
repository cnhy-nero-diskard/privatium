import { FC, useState, useRef, useEffect } from 'react';
import { exportEntries, type ExportFormat } from '@/utils/exportUtils';

const ExportButton: FC = () => {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [showDropdown, setShowDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, mimeType, extension } = await exportEntries(format);
      
      // Create a Blob with the data
      const blob = new Blob([data], { type: mimeType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Set filename with current date
      const date = new Date().toISOString().split('T')[0];
      a.download = `privatium-journal-export-${date}.${extension}`;
      a.href = url;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export entries. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-0">
        {/* Main Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 rounded-l-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Export entries to ${format.toUpperCase()} file`}
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export {format.toUpperCase()}
            </>
          )}
        </button>

        {/* Format Selector Dropdown Toggle */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={exporting}
          className="px-2 py-2 rounded-r-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 border-l border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Select export format"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50 min-w-[160px]">
          <div className="py-1">
            <button
              onClick={() => {
                setFormat('json');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-4 py-2 transition-colors ${
                format === 'json'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">JSON</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-6">Complete data with metadata</p>
            </button>
            <button
              onClick={() => {
                setFormat('csv');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-4 py-2 transition-colors ${
                format === 'csv'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">CSV</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-6">Universal spreadsheet format</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
