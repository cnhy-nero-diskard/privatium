import React, { useRef } from "react";
import { useRouter } from 'next/navigation';
import { FaRegCopy, FaEdit, FaTrash } from "react-icons/fa";
import { MoodWithLabel } from "./MoodIcon";
import { saveEntryState } from "@/utils/entryStateManager";

interface JournalModalProps {
  entry: any;
  onClose: () => void;
  onEdit?: (updatedEntry: any) => void;
  onDelete?: (entryId: string) => void;
}

const JournalModal: React.FC<JournalModalProps> = ({ entry, onClose, onDelete }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  if (!entry) return null;

  const handleCopy = () => {
    if (contentRef.current) {
      navigator.clipboard.writeText(entry.content);
    }
  };

  const handleEditClick = () => {
    // Save entry state to session storage
    saveEntryState({
      id: entry.id.toString(),
      title: entry.title || '',
      date: entry.date || '',
      folder: entry.folder || '',
      mood: entry.mood || '',
      content: entry.content || ''
    });
    // Close the modal and navigate to edit form
    onClose();
    router.push('/entryformui?page=edit');
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) onDelete(entry.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={modalRef}
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
        className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-xl min-w-[320px] w-full min-h-[320px] max-h-[90vh] relative border-2 border-blue-200 dark:border-blue-700 animate-modalEnter flex flex-col focus:outline-none"
      >
        <button
          className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors text-xl font-bold shadow-md"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <>
          <h2 className="font-extrabold mb-2 text-blue-700 dark:text-blue-300 text-2xl sm:text-3xl font-journal tracking-wide break-words max-w-full" title={entry.title}>
            {entry.title?.length ? entry.title : <span className="italic text-gray-400">No Title</span>}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4">
            <span>{entry.date}</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-700">{entry.folder || <span className="italic text-gray-400">No Folder</span>}</span>
            <span className="flex items-center gap-1 font-semibold">
              Mood: <MoodWithLabel mood={entry.mood} />
            </span>
          </div>
          <div ref={contentRef} className="prose dark:prose-invert min-h-[120px] max-h-[320px] sm:max-h-[400px] overflow-y-auto text-base text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-800 mb-4 break-words whitespace-pre-wrap">
            {entry.content?.length ? entry.content : <span className="italic text-gray-400">No content available.</span>}
          </div>
          <div className="flex justify-between items-center mt-2 gap-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 text-lg shadow-sm min-w-[40px]"
                onClick={handleCopy}
                aria-label="Copy journal content"
                title="Copy"
              >
                <FaRegCopy />
              </button>
              <button
                className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border border-green-200 dark:border-green-700 text-lg shadow-sm min-w-[40px]"
                onClick={handleEditClick}
                aria-label="Edit journal entry"
                title="Edit"
              >
                <FaEdit />
              </button>
              <button
                className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 border border-red-200 dark:border-red-700 text-lg shadow-sm min-w-[40px]"
                onClick={handleDeleteClick}
                aria-label="Delete journal entry"
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
            {entry.lastEdited && (
              <span className="text-xs text-gray-400">Last edited: {entry.lastEdited}</span>
            )}
          </div>
        </>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border border-red-300 dark:border-red-700 min-w-[260px] max-w-[90vw]">
              <p className="mb-4 text-lg text-red-700 dark:text-red-300">Are you sure you want to delete this entry?</p>
              <div className="flex gap-4 justify-end flex-wrap">
                <button className="px-4 py-1 rounded-lg bg-red-600 text-white font-semibold min-w-[80px]" onClick={handleDeleteConfirm}>Delete</button>
                <button className="px-4 py-1 rounded-lg bg-gray-300 text-gray-700 font-semibold min-w-[80px]" onClick={handleDeleteCancel}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Animations */}
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
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default JournalModal;
