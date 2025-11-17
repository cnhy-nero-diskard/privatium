import { FC, useState, useRef } from 'react';
import { parseCSV, importEntries, checkDuplicates } from '@/utils/importUtils';

interface DuplicateEntry {
  date: string;
  title: string;
  content: string;
  folder: string;
  mood: string;
  tags: string[];
  existingId: number;
  existingDate: string;
}

interface ImportButtonProps {
  onImportComplete: () => void;
}

const ImportButton: FC<ImportButtonProps> = ({ onImportComplete }) => {
  const [importing, setImporting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setImporting(true);

    try {
      // Read file content
      const content = await file.text();
      
      // Parse CSV
      const entries = parseCSV(content);
      
      if (entries.length === 0) {
        alert('No valid entries found in the CSV file');
        setImporting(false);
        return;
      }

      // Check for duplicates
      const { newEntries, duplicates: foundDuplicates } = await checkDuplicates(entries);

      if (foundDuplicates.length > 0) {
        // Show duplicate modal
        setDuplicates(foundDuplicates);
        setPendingEntries(newEntries);
        setShowDuplicateModal(true);
      } else {
        // No duplicates, import directly
        await performImport(entries, false);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const performImport = async (entries: any[], overwrite: boolean) => {
    setImporting(true);
    try {
      const result = await importEntries(entries, overwrite);
      
      if (result.success) {
        let message = `Successfully imported ${result.imported} entries`;
        if (result.errors.length > 0) {
          message += `\n\nSome entries failed to import:\n${result.errors.join('\n')}`;
        }
        alert(message);
        onImportComplete();
      } else {
        alert(`Import failed: ${result.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      setShowDuplicateModal(false);
      setDuplicates([]);
      setPendingEntries([]);
    }
  };

  const handleSkipDuplicates = async () => {
    // Import only new entries
    await performImport(pendingEntries, false);
  };

  const handleOverwriteDuplicates = async () => {
    // Import all entries including duplicates (overwrite)
    await performImport([...pendingEntries, ...duplicates], true);
  };

  const handleCancel = () => {
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingEntries([]);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Import entries from CSV file"
      >
        {importing ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Importing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </>
        )}
      </button>

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-2">Duplicate Entries Found</h2>
              <p className="text-gray-300">
                Found {duplicates.length} duplicate {duplicates.length === 1 ? 'entry' : 'entries'} that already exist in your journal.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3 mb-6">
                {duplicates.slice(0, 5).map((dup, index) => (
                  <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{dup.title}</h3>
                        <p className="text-sm text-gray-400 mb-2">
                          Date: {dup.date} • Folder: {dup.folder}
                        </p>
                        {dup.tags && dup.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dup.tags.map((tag, idx) => (
                              <span key={idx} className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 text-2xl">
                        <span title={dup.mood}>
                          {dup.mood === 'happy' && '😊'}
                          {dup.mood === 'sad' && '😢'}
                          {dup.mood === 'angry' && '😠'}
                          {dup.mood === 'anxious' && '😰'}
                          {dup.mood === 'calm' && '😌'}
                          {dup.mood === 'neutral' && '😐'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {duplicates.length > 5 && (
                  <p className="text-center text-gray-400 text-sm">
                    ... and {duplicates.length - 5} more
                  </p>
                )}
              </div>

              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-200">
                  <strong>What would you like to do?</strong>
                </p>
                <ul className="text-sm text-blue-300 mt-2 space-y-1 ml-4 list-disc">
                  <li><strong>Skip Duplicates:</strong> Import only the {pendingEntries.length} new entries</li>
                  <li><strong>Overwrite:</strong> Replace existing entries with imported data</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipDuplicates}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Skip Duplicates ({pendingEntries.length} new)
              </button>
              <button
                onClick={handleOverwriteDuplicates}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Overwrite All ({duplicates.length + pendingEntries.length} total)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportButton;
