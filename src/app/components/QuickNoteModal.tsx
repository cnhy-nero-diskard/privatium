import React, { useState, useEffect, useRef } from "react";
import { createJournal } from "@/utils/supabaseClient";
import { MoodIcon } from "./MoodIcon";
import { getFolders, createFolder, type Folder } from "@/utils/folderUtils";

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteAdded: () => void;
}

const QuickNoteModal: React.FC<QuickNoteModalProps> = ({ 
  isOpen, 
  onClose,
  onNoteAdded
}) => {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [notesFolder, setNotesFolder] = useState<string>("Notes");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load or create Notes folder
  useEffect(() => {
    const ensureNotesFolder = async () => {
      try {
        const folders = await getFolders();
        const notesFolderObj = folders.find(f => f.name === "Notes");
        
        if (notesFolderObj) {
          setNotesFolder(notesFolderObj.name);
        } else if (folders.length > 0) {
          // Use first folder if Notes doesn't exist
          setNotesFolder(folders[0].name);
        } else {
          // Create a Notes folder if no folders exist
          const newFolder = await createFolder("Notes", "#FCD34D"); // Yellow color for notes
          setNotesFolder(newFolder.name);
        }
      } catch (error) {
        console.error("Failed to load/create Notes folder:", error);
        setNotesFolder("Notes"); // Fallback
      }
    };
    
    ensureNotesFolder();
  }, []);

  useEffect(() => {
    // When modal opens, focus the input field
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      // Create a note (entry with only a title, no content)
      await createJournal({
        title: title.trim(),
        content: "", // No content for quick notes
        date: dateString,
        folder: notesFolder,
        mood: mood
      });
      
      setTitle("");
      onNoteAdded();
      onClose();
    } catch (error) {
      console.error("Error adding quick note:", error);
      alert("Failed to add quick note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
          className="bg-yellow-50 dark:bg-yellow-900 rounded-xl shadow-2xl p-6 w-full max-w-md animate-modalEnter border-2 border-yellow-300 dark:border-yellow-700 border-dashed"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {/* Sticky Note Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="3" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
                <path d="M8 8h8M8 12h6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Quick Note</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={100}
              required
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {title.length}/100
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How are you feeling?
            </label>
            <div className="flex justify-around">
              {["happy", "neutral", "sad", "angry"].map((moodType) => (
                <button
                  key={moodType}
                  type="button"
                  onClick={() => setMood(moodType)}
                  className={`p-2 rounded-full transition-all ${
                    mood === moodType
                      ? "bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  aria-label={`Mood: ${moodType}`}
                >
                  <MoodIcon mood={moodType} size="md" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Add Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNoteModal;
