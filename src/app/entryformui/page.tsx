"use client";

import React, { useState, useRef, useEffect } from "react";
import { Save, Check, Loader2, MapPin, Globe, Sun, HelpCircle, X, Smile, Meh, Frown, Angry, Calendar, Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createJournal } from "@/utils/supabaseClient";
import { RichTextEditor } from "@/app/components/RichTextEditor";
import '@/app/components/rich-text-editor.css';

const FOLDER_OPTIONS = ["Personal", "Work", "Ideas", "Archive"];
const MOODS = [
  { icon: Smile, label: "Very Happy" },
  { icon: Smile, label: "Happy" },
  { icon: Meh, label: "Neutral" },
  { icon: Frown, label: "Sad" },
  { icon: Angry, label: "Angry" },
];

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

import { Descendant } from 'slate';

// Default value for the rich text editor
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const EntryForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = searchParams?.get('page') === 'edit';
  
  const today = new Date();
  const [date, setDate] = useState<string>(isEdit && searchParams ? searchParams.get('date') || formatDate(today) : formatDate(today));
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(isEdit && searchParams ? searchParams.get('title') || '' : '');
  const [slateValue, setSlateValue] = useState<Descendant[]>(() => {
    if (isEdit && searchParams?.get('content')) {
      return [{ 
        type: 'paragraph',
        children: [{ text: searchParams.get('content') || '' }]
      }];
    }
    return initialValue;
  });
  const [folder, setFolder] = useState<string>(isEdit && searchParams ? searchParams.get('folder') || FOLDER_OPTIONS[0] : FOLDER_OPTIONS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [mood, setMood] = useState<string | null>(isEdit && searchParams ? searchParams.get('mood') || null : null);
  const [location, setLocation] = useState<string>("");
  const [weather] = useState<string>("☀️ Sunny");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTime());
  const [formattedDate, setFormattedDate] = useState<string>(getCurrentFormattedDate());
  const tagInputRef = useRef<HTMLInputElement>(null);
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
  
  // Handle rich text editor changes
  const handleEditorChange = (value: Descendant[]) => {
    setSlateValue(value);
  };

  // Check if the slate value has content
  const hasContent = () => {
    if (!slateValue || slateValue.length === 0) return false;
    return slateValue.some((node: any) => 
      node.text !== undefined && node.text.trim() !== '' || 
      (node.children && node.children.some((child: any) => 
        child.text !== undefined && child.text.trim() !== ''))
    );
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

  // Tag add handler
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    
    try {
      await createJournal({
        date,
        title,
        content: JSON.stringify(slateValue),
        folder,
        mood: mood || ''
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.push('/');
        router.refresh();
      }, 1200);
    } catch (error) {
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
          
          {/* Rich Text Editor */}
          <div className="w-full dark:text-gray-100">
            <RichTextEditor 
              value={slateValue}
              onChange={handleEditorChange}
            />
          </div>
        </div>
        
        {/* Bottom Panel with Folder, Tags, Mood, Location */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="flex flex-wrap gap-1 border rounded px-2 py-1 bg-white dark:bg-gray-700 min-h-[38px]">
                {tags.map((tag, i) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      type="button"
                      className="ml-1 text-blue-400 hover:text-red-500 focus:outline-none"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() => removeTag(tag)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="tags"
                  ref={tagInputRef}
                  type="text"
                  className="border-0 focus:ring-0 text-sm flex-1 min-w-[60px] bg-transparent"
                  placeholder={tags.length ? "" : "Add tag"}
                  value={tagInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  aria-label="Add tag"
                />
              </div>
            </div>
            
            {/* Mood */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Select Mood
              </label>
              <div className="flex items-center gap-2" role="group" aria-label="Mood selector">
                {MOODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      className={`rounded-full p-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 relative group ${
                        mood === m.label
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-400"
                          : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      aria-pressed={mood === m.label}
                      aria-label={m.label}
                      tabIndex={0}
                      onClick={() => setMood(mood === m.label ? null : m.label)}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-black/80 text-white text-xs rounded px-2 py-1 transition-all">{m.label}</span>
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
