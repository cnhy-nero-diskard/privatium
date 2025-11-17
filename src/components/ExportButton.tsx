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
      <div className="flex items-stretch w-full bg-gray-700/50 rounded-md border border-gray-600/50 hover:bg-gray-700 transition-colors overflow-hidden">
        {/* Main Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 px-3 py-2 text-gray-200 font-normal text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Export entries to ${format.toUpperCase()} file`}
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs">Exporting...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export {format.toUpperCase()}</span>
            </>
          )}
        </button>

        {/* Format Selector Dropdown Toggle */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={exporting}
          className="px-2.5 py-2 text-gray-200 border-l border-gray-600 hover:bg-gray-600/50 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Select export format"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full mt-1 right-0 bg-gray-800/95 backdrop-blur-sm rounded-md shadow-lg border border-gray-700/50 overflow-hidden z-50 min-w-[160px]">
          <div className="py-1">
            <button
              onClick={() => {
                setFormat('json');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                format === 'json'
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-normal">JSON</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 ml-5">Complete data</p>
            </button>
            <button
              onClick={() => {
                setFormat('csv');
                setShowDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                format === 'csv'
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-normal">CSV</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 ml-5">Spreadsheet format</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
