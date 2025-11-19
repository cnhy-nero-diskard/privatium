import React from 'react';

interface ImportResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    message: string;
    errors?: string[];
  } | null;
}

const ImportResultModal: React.FC<ImportResultModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 animate-fadeIn">
      <div className={`bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border ${result.success ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'} min-w-[300px] max-w-[90vw] w-[500px] scale-95 animate-modalPop`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${result.success ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
            {result.success ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h3 className={`text-xl font-bold ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {result.success ? 'Import Successful' : 'Import Failed'}
          </h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {result.message}
          </p>
          
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg max-h-40 overflow-y-auto border border-red-100 dark:border-red-800">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button 
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold min-w-[80px] transition-colors duration-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        .animate-modalPop {
          animation: modalPop 0.3s cubic-bezier(.17,.67,.83,.67);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ImportResultModal;
