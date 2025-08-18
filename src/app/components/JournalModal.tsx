import React, { useRef } from "react";
import { FaRegSmile, FaRegFrown, FaRegMeh, FaRegCopy, FaEdit, FaTrash } from "react-icons/fa";

interface JournalModalProps {
  entry: any;
  onClose: () => void;
  onEdit?: (updatedEntry: any) => void;
  onDelete?: (entryId: string) => void;
}

const moodIcon = (mood: string) => {
  switch (mood?.toLowerCase()) {
    case "happy": return <FaRegSmile className="inline text-yellow-400 mr-1" title="Happy" />;
    case "sad": return <FaRegFrown className="inline text-blue-400 mr-1" title="Sad" />;
    case "neutral": return <FaRegMeh className="inline text-gray-400 mr-1" title="Neutral" />;
    default: return <FaRegSmile className="inline text-yellow-300 mr-1" title={mood} />;
  }
};

const JournalModal: React.FC<JournalModalProps> = ({ entry, onClose, onEdit, onDelete }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [editData, setEditData] = React.useState(entry);
  if (!entry) return null;

  const handleCopy = () => {
    if (contentRef.current) {
      navigator.clipboard.writeText(entry.content);
    }
  };

  const handleEditClick = () => {
    setEditData(entry);
    setIsEditing(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSave = () => {
    if (onEdit) onEdit(editData);
    setIsEditing(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 animate-fadeIn">
      <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-xl w-full relative border-2 border-blue-200 dark:border-blue-700 scale-95 animate-modalPop transition-all duration-300">
        <button
          className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors text-xl font-bold shadow-md"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        {isEditing ? (
          <>
            <input
              type="text"
              name="title"
              value={editData.title}
              onChange={handleEditChange}
              className="font-extrabold mb-2 text-blue-700 dark:text-blue-300 text-2xl sm:text-3xl font-journal tracking-wide w-full p-2 rounded-lg border border-blue-200 dark:border-blue-700 mb-2"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4">
              <input type="text" name="date" value={editData.date} onChange={handleEditChange} className="px-2 py-0.5 rounded-full border w-24" />
              <input type="text" name="folder" value={editData.folder} onChange={handleEditChange} className="px-2 py-0.5 rounded-full border w-24" />
              <input type="text" name="mood" value={editData.mood} onChange={handleEditChange} className="px-2 py-0.5 rounded-full border w-24" />
            </div>
            <textarea
              name="content"
              value={editData.content}
              onChange={handleEditChange}
              className="prose dark:prose-invert max-h-80 sm:max-h-96 overflow-y-auto text-base text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-800 mb-4 w-full"
              rows={6}
            />
            <div className="flex gap-2 mt-2">
              <button className="px-4 py-1 rounded-lg bg-blue-600 text-white font-semibold" onClick={handleEditSave}>Save</button>
              <button className="px-4 py-1 rounded-lg bg-gray-300 text-gray-700 font-semibold" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-extrabold mb-2 text-blue-700 dark:text-blue-300 text-2xl sm:text-3xl font-journal tracking-wide">
              {entry.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4">
              <span>{entry.date}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-700">{entry.folder}</span>
              <span className="flex items-center gap-1 font-semibold">Mood: {moodIcon(entry.mood)}<span className="text-base">{entry.mood}</span></span>
            </div>
            <div ref={contentRef} className="prose dark:prose-invert max-h-80 sm:max-h-96 overflow-y-auto text-base text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-800 mb-4">
              {entry.content}
            </div>
            <div className="flex justify-between items-center mt-2 gap-2">
              <div className="flex items-center gap-3">
                <button
                  className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 text-lg shadow-sm"
                  onClick={handleCopy}
                  aria-label="Copy journal content"
                  title="Copy"
                >
                  <FaRegCopy />
                </button>
                <button
                  className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border border-green-200 dark:border-green-700 text-lg shadow-sm"
                  onClick={handleEditClick}
                  aria-label="Edit journal entry"
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button
                  className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 border border-red-200 dark:border-red-700 text-lg shadow-sm"
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
        )}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border border-red-300 dark:border-red-700">
              <p className="mb-4 text-lg text-red-700 dark:text-red-300">Are you sure you want to delete this entry?</p>
              <div className="flex gap-4 justify-end">
                <button className="px-4 py-1 rounded-lg bg-red-600 text-white font-semibold" onClick={handleDeleteConfirm}>Delete</button>
                <button className="px-4 py-1 rounded-lg bg-gray-300 text-gray-700 font-semibold" onClick={handleDeleteCancel}>Cancel</button>
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
