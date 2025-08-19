import React from 'react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  multiple?: boolean;
  count?: number;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  onConfirm,
  onCancel,
  multiple = false,
  count = 1
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border border-red-300 dark:border-red-700 min-w-[300px] max-w-[90vw] scale-95 animate-modalPop">
        <p className="mb-4 text-lg text-red-700 dark:text-red-300">
          {multiple 
            ? `Are you sure you want to delete ${count} selected entries?` 
            : "Are you sure you want to delete this entry?"}
        </p>
        <div className="flex gap-4 justify-end flex-wrap">
          <button 
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold min-w-[80px] transition-colors duration-200"
            onClick={onConfirm}
          >
            Delete
          </button>
          <button 
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold min-w-[80px] transition-colors duration-200"
            onClick={onCancel}
          >
            Cancel
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

export default ConfirmDeleteModal;
