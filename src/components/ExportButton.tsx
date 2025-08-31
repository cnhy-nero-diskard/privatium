import { FC } from 'react';
import { exportEntriesToJson } from '@/utils/exportUtils';

const ExportButton: FC = () => {
  const handleExport = async () => {
    try {
      const jsonData = await exportEntriesToJson();
      
      // Create a Blob with the JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Set filename with current date
      const date = new Date().toISOString().split('T')[0];
      a.download = `privatium-journal-export-${date}.json`;
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
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center gap-2"
      title="Export entries to JSON file"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export
    </button>
  );
};

export default ExportButton;
