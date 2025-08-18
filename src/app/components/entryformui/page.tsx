"use client";

import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { createJournal } from "@/utils/supabaseClient";

const FOLDER_OPTIONS = ["Personal", "Work", "Ideas", "Archive"];
const MOODS = [
  { emoji: "😄", label: "Very Happy" },
  { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😠", label: "Angry" },
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const EntryForm: React.FC = () => {
  // ...existing code...
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date();
  const [date, setDate] = useState<string>(formatDate(today));
  const [title, setTitle] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [folder, setFolder] = useState<string>(FOLDER_OPTIONS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [mood, setMood] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("");
  const [weather] = useState<string>("☀️ Sunny");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  // Progress calculation (after state declarations)
  const progress = [title, text, folder, mood].filter(Boolean).length / 4 * 100;

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Use a free reverse geocoding API (stubbed for privacy)
        // In real app, fetch city/state from API
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

  const router = useRouter();

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await createJournal({
        date,
        title,
        content: text,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-8 px-2">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full flex flex-col items-center pt-8 pb-2 z-10">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📝</span>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow">New Journal Entry</h1>
        </div>
        <div className="w-64 h-2 mt-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#3b82f6,#a78bfa,#ec4899)' }} />
        </div>
      </div>
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
              <li><b>Date</b>: Pick or edit the entry date.</li>
              <li><b>Title</b>: Short summary for your entry.</li>
              <li><b>Text</b>: Write your journal entry (Markdown supported).</li>
              <li><b>Folder</b>: Organize entries by category.</li>
              <li><b>Tags</b>: Add or create tags for quick search.</li>
              <li><b>Mood</b>: Select your mood for the day.</li>
              <li><b>Location</b>: Optionally add your current city/state.</li>
              <li><b>Weather</b>: Shows stubbed weather info.</li>
            </ul>
          </div>
        </div>
      )}
      {/* Floating Help Icon */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full shadow-lg p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Open help modal"
        onClick={() => setHelpOpen(true)}
        type="button"
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="12" fill="currentColor" />
          <text x="12" y="17" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial">?</text>
        </svg>
      </button>
      <form
        onSubmit={handleSubmit}
        className="bg-white/80 dark:bg-gray-800/90 rounded-2xl shadow-2xl w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 p-8 mt-24 animate-fadein"
        aria-label="Journal Entry Form"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {/* Top Bar: Date */}
        <div className="md:col-span-2 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-700/60 rounded-lg px-3 py-2 shadow">
            <span className="text-gray-500 dark:text-gray-400">Today:</span>
            <input
              type="date"
              id="date"
              name="date"
              className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Entry date"
            />
          </div>
        </div>
        {/* Title */}
        <div className="flex flex-col gap-1 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
          <label htmlFor="title" className="font-medium text-gray-700 dark:text-gray-200">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Entry title…"
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        {/* Folder */}
        <div className="flex flex-col gap-1 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
          <label htmlFor="folder" className="font-medium text-gray-700 dark:text-gray-200">
            Folder
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
        {/* Text & Markdown Preview */}
        <div className="flex flex-col md:flex-row gap-4 md:col-span-2">
          <div className="flex-1 flex flex-col gap-1 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
            <label htmlFor="text" className="font-medium text-gray-700 dark:text-gray-200">
              Text
            </label>
            <textarea
              id="text"
              name="text"
              rows={6}
              placeholder="Write your entry in Markdown…"
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 resize-vertical"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 flex flex-col gap-1 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
            <label className="font-medium text-gray-700 dark:text-gray-200">Live Preview</label>
            <div className="prose dark:prose-invert max-w-none border rounded px-3 py-2 bg-gray-50 dark:bg-gray-900 min-h-[120px]">
              <ReactMarkdown>{text || "*Your markdown preview will appear here...*"}</ReactMarkdown>
            </div>
          </div>
        </div>
        {/* Tags */}
        <div className="flex flex-col gap-1 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
          <label htmlFor="tags" className="font-medium text-gray-700 dark:text-gray-200">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-1">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm mr-1 shadow ${i%2===0?'bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-200':'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'}`}
              >
                {tag}
                <button
                  type="button"
                  className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-white focus:outline-none"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="tags"
              ref={tagInputRef}
              type="text"
              className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 w-24"
              placeholder="Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              aria-label="Add tag"
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">Press Enter or comma to add. Backspace to remove last.</div>
        </div>
        {/* Mood */}
        <div className="flex flex-col gap-1 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
          <label className="font-medium text-gray-700 dark:text-gray-200">Mood</label>
          <div className="flex gap-2 mt-1" role="group" aria-label="Mood selector">
            {MOODS.map((m) => (
              <button
                key={m.emoji}
                type="button"
                className={`text-2xl rounded-full p-2 border-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 relative group ${
                  mood === m.emoji
                    ? "bg-gradient-to-tr from-blue-200 via-purple-200 to-pink-200 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 border-blue-400 scale-110 shadow-lg"
                    : "bg-transparent border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                aria-pressed={mood === m.emoji}
                aria-label={m.label}
                tabIndex={0}
                onClick={() => setMood(mood === m.emoji ? null : m.emoji)}
              >
                {m.emoji}
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-black/80 text-white text-xs rounded px-2 py-1 transition-all">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Location & Weather */}
        <div className="flex flex-col gap-1 md:col-span-2 bg-white/60 dark:bg-gray-700/60 rounded-lg px-4 py-3 shadow transition-transform hover:scale-[1.02]">
          <label className="font-medium text-gray-700 dark:text-gray-200">Location & Weather</label>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <button
              type="button"
              className="bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-900 dark:to-purple-900 text-gray-700 dark:text-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow"
              onClick={handleGetLocation}
            >
              <span className="mr-2">📍</span>Get my location
            </button>
            <span className="text-gray-600 dark:text-gray-300 min-w-[120px] flex items-center gap-1">
              <span className="text-lg">🌐</span>
              {location || <span className="italic text-gray-400">No location</span>}
            </span>
            <span className="ml-auto flex items-center gap-1 text-lg">
              <span>🌤️</span>
              <span>{weather}</span>
            </span>
          </div>
        </div>
        {/* Save Button */}
        <div className="md:col-span-2 flex justify-end mt-4">
          <button
            type="submit"
            className={`bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative ${saving ? 'pointer-events-none' : ''}`}
            disabled={!title.trim() || !text.trim() || saving}
          >
            {saving ? (
              <span className="animate-spin mr-2 w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : saved ? (
              <span className="mr-2">✅</span>
            ) : (
              <span className="mr-2">💾</span>
            )}
            {saved ? "Saved!" : saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
  </div>
  );
};

export default EntryForm;
