"use client";

import React, { useState, useRef, useEffect } from "react";
import { Save, Check, Loader2, MapPin, Globe, Sun, HelpCircle, X, Smile, SmilePlus, Meh, Frown, Angry, Calendar, Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createJournal, updateJournal } from "@/utils/supabaseClient";
import { updateJournalTags } from "@/utils/tagUtils";
import { PlainTextEditor } from "@/app/components/PlainTextEditor";
import { getAllMoods, getMoodDefinition } from "@/utils/moodUtils";
import { logMoodSelection, logSaveAttempt } from "@/utils/debugMood";
import { getEntryState, clearEntryState } from "@/utils/entryStateManager";
import { TagInput } from "@/app/components/TagInput";
import { Tag } from "@/types/tags";

const FOLDER_OPTIONS = ["Personal", "Work", "Ideas", "Archive"];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getCurrentFormattedDate(): string {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Helper functions
function getMoodIcon(moodLabel: string): React.ReactElement {
  switch(moodLabel) {
    case 'Very Happy':
      return <SmilePlus className="w-5 h-5" />;
    case 'Happy':
      return <Smile className="w-5 h-5" />;
    case 'Neutral':
      return <Meh className="w-5 h-5" />;
    case 'Sad':
      return <Frown className="w-5 h-5" />;
    case 'Angry':
      return <Angry className="w-5 h-5" />;
    default:
      return <Meh className="w-5 h-5" />;
  }
}

// Default value for the plain text editor
const initialValue: string = '';

const EntryForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = searchParams?.get('page') === 'edit';
  const [editId, setEditId] = useState<string | null>(null);
  
  const today = new Date();
  const [date, setDate] = useState<string>(formatDate(today));
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>(initialValue);
  const [folder, setFolder] = useState<string>(FOLDER_OPTIONS[0]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);

  // Calculate word and character counts whenever content changes
  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.replace(/\s/g, '').length;
    setWordCount(words);
    setCharCount(chars);
  }, [content]);

  // Load entry state from session storage on mount if editing
  useEffect(() => {
    if (isEdit) {
      import('@/utils/entryStateManager').then(({ getEntryState, clearEntryState }) => {
        const entryState = getEntryState();
        if (entryState) {
          setEditId(entryState.id || null);
          setDate(entryState.date || formatDate(today));
          setTitle(entryState.title || '');
          setContent(entryState.content || '');
          setFolder(entryState.folder || FOLDER_OPTIONS[0]);
          if (entryState.mood) setMood(entryState.mood);
          if (entryState.tags) setSelectedTags(entryState.tags);
          // Clear the state after loading
          clearEntryState();
        }
      });
    }
  }, [isEdit]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [mood, setMood] = useState<string | null>(isEdit && searchParams ? searchParams.get('mood') || null : null);
  const [location, setLocation] = useState<string>("");
  const [weather] = useState<string>("☀️ Sunny");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTime());
  const [formattedDate, setFormattedDate] = useState<string>(getCurrentFormattedDate());
  const datePickerRef = useRef<HTMLInputElement>(null);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Close date picker when clicking outside
  useEffect(() => {
    if (!showDatePicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        datePickerRef.current && 
        !datePickerRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    // Update the formatted date display
    const selectedDate = new Date(e.target.value);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const day = selectedDate.getDate();
    const month = months[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    setFormattedDate(`${day} ${month} ${year}`);
    setShowDatePicker(false);
  };
  
  // Handle text editor changes
  const handleEditorChange = (value: string) => {
    setContent(value);
  };

  // Check if the content has text
  const hasContent = () => {
    return content && content.trim().length > 0;
  };

  // Progress calculation
  const progress = [title, hasContent() ? 1 : 0, folder, mood].filter(Boolean).length / 4 * 100;

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation(`Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
      },
      () => setLocation("Unable to retrieve location")
    );
  };

  // Tag handling is now done by the TagInput component

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    
    try {
      const journalData = {
        date,
        title,
        content: content,
        folder,
        mood: mood || ''
      };

      // Debug logging
      logSaveAttempt(journalData);

      if (isEdit && editId) {
        // Update existing entry
        console.log('Updating entry with ID:', editId);
        const updatedEntry = await updateJournal(parseInt(editId), journalData);
        if (updatedEntry?.id) {
          // Update tags
          const tagIds = selectedTags.map(tag => tag.id!);
          await updateJournalTags(updatedEntry.id, tagIds);
        }
      } else {
        // Create new entry
        console.log('Creating new entry');
        const newEntry = await createJournal(journalData);
        if (newEntry?.id && selectedTags.length > 0) {
          // Add tags to the new entry
          const tagIds = selectedTags.map(tag => tag.id!);
          await updateJournalTags(newEntry.id, tagIds);
        }
      }
      
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.push('/');
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error('Save error:', error);
      setSaving(false);
      alert('Failed to save entry. Please try again.');
    }
  };

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Check for dark mode on client-side
  useEffect(() => {
    const darkModeCheck = () => {
      const isDark = 
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
        document.documentElement.classList.contains('dark') || 
        document.body.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    darkModeCheck();
    
    // Watch for changes in dark mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => darkModeCheck();
    mediaQuery.addEventListener('change', handleChange);
    
    // Observer for class changes on html/body
    const observer = new MutationObserver(darkModeCheck);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col py-8 px-4 ${isDarkMode ? 'dark' : ''}`}>
      {/* Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none"
              aria-label="Close help modal"
              onClick={() => setHelpOpen(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Entry Form Help</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><b>Date</b>: Click the date to edit it.</li>
              <li><b>Title</b>: Short summary for your entry.</li>
              <li><b>Rich Text Editor</b>: Use the toolbar for text formatting:
                <ul className="list-circle pl-4 mt-1 space-y-1">
                  <li>Bold, italic, underline, code formatting</li>
                  <li>Headings and block quotes</li>
                  <li>Bullet and numbered lists</li>
                  <li>Text alignment options</li>
                  <li>Section dividers</li>
                  <li>Use keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)</li>
                </ul>
              </li>
              <li><b>Folder</b>: Organize entries by category.</li>
              <li><b>Tags</b>: Add or create tags for quick search.</li>
              <li><b>Mood</b>: Select your mood for the day.</li>
              <li><b>Location</b>: Optionally add your current location.</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* Floating Help Icon */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-100 text-blue-700 rounded-full shadow-lg p-3 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Open help modal"
        onClick={() => setHelpOpen(true)}
        type="button"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
      
      <form
        onSubmit={handleSubmit}
        className={`bg-white/80 dark:bg-gray-800/90 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col h-full ${isDarkMode ? 'dark' : ''}`}
        aria-label="Journal Entry Form"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {/* Progress indicator */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-t-full overflow-hidden">
          <div className="h-full transition-all duration-500" 
               style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#a78bfa,#ec4899)' }} />
        </div>
        
        {/* DIARO STYLE HEADER: DATE AND TIME */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                type="button" 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center space-x-1 focus:outline-none"
                aria-label="Change entry date"
              >
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400" />
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">{formattedDate}</span>
              </button>
              <Clock className="w-5 h-5 ml-2 text-gray-600 dark:text-gray-300" />
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">{currentTime}</span>
            </div>
            {showDatePicker && (
              <div className="absolute top-full left-6 mt-1 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2">
                <input
                  ref={datePickerRef}
                  type="date"
                  id="date"
                  name="date"
                  className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600"
                  value={date}
                  onChange={handleDateChange}
                  aria-label="Select entry date"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 text-gray-900 dark:text-gray-100">
          {/* Title */}
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Entry title..."
            className="w-full text-xl font-medium mb-4 bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:ring-0 focus:border-blue-400 px-0 py-2 text-gray-900 dark:text-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          
          {/* Plain Text Editor */}
          <div className="w-full dark:text-gray-100">
            <div className="flex justify-end mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="mr-4">{wordCount} words</span>
              <span>{charCount} characters</span>
            </div>
            <PlainTextEditor 
              value={content}
              onChange={handleEditorChange}
            />
          </div>
        </div>
        
        {/* Bottom Panel with Folder, Tags, Mood, Location */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Folder Selection */}
            <div className="flex flex-col">
              <label htmlFor="folder" className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Select Folder
              </label>
              <select
                id="folder"
                name="folder"
                className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                {FOLDER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            
            {/* Tags */}
            <div className="flex flex-col">
              <label htmlFor="tags" className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Select Tags
              </label>
              <TagInput
                selectedTags={selectedTags}
                onChange={setSelectedTags}
              />
            </div>
            
            {/* Mood */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Select Mood
              </label>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mood selector">
                {getAllMoods().map((moodDef) => {
                  return (
                    <button
                      key={moodDef.id}
                      type="button"
                      className={`rounded-full p-2 border focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 relative group w-10 h-10 flex items-center justify-center ${
                        mood === moodDef.label
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-500 dark:text-blue-400"
                          : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                      aria-pressed={mood === moodDef.label}
                      aria-label={moodDef.label}
                      tabIndex={0}
                      onClick={() => {
                        const newMood = mood === moodDef.label ? null : moodDef.label;
                        setMood(newMood);
                        logMoodSelection(newMood);
                      }}
                    >
                      {getMoodIcon(moodDef.label)}
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-black/80 text-white text-xs rounded px-2 py-1 transition-all whitespace-nowrap z-10">
                        {moodDef.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Location */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Location
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  className="border rounded-l px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={handleGetLocation}
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <div className="flex-1 border-t border-b border-r rounded-r px-2 py-1.5 bg-white dark:bg-gray-700 text-sm overflow-hidden">
                  {location || <span className="text-gray-400 italic">Current location</span>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className={`bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${saving ? 'pointer-events-none' : ''}`}
              disabled={!title.trim() || !hasContent() || saving}
            >
              {saving ? (
                <Loader2 className="animate-spin mr-1 w-4 h-4" />
              ) : saved ? (
                <Check className="mr-1 w-4 h-4" />
              ) : (
                <Save className="mr-1 w-4 h-4" />
              )}
              {saved ? "Saved!" : saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EntryForm;
