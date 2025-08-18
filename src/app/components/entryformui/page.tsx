"use client";

import React, { useState, useRef } from "react";

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

  // Submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const entry = {
      date,
      title,
      text,
      folder,
      tags,
      mood,
      location,
      weather,
    };
    console.log(JSON.stringify(entry, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center py-8 px-2">
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 p-8"
        aria-label="Journal Entry Form"
      >
        {/* Top Bar: Date */}
        <div className="md:col-span-2 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
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
        <div className="flex flex-col gap-1">
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
        <div className="flex flex-col gap-1">
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
        {/* Text */}
        <div className="flex flex-col gap-1 md:col-span-2">
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
        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label htmlFor="tags" className="font-medium text-gray-700 dark:text-gray-200">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full px-3 py-1 text-sm mr-1"
              >
                {tag}
                <button
                  type="button"
                  className="ml-2 text-blue-400 hover:text-blue-700 dark:hover:text-white focus:outline-none"
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
        </div>
        {/* Mood */}
        <div className="flex flex-col gap-1">
          <label className="font-medium text-gray-700 dark:text-gray-200">Mood</label>
          <div className="flex gap-2 mt-1" role="group" aria-label="Mood selector">
            {MOODS.map((m) => (
              <button
                key={m.emoji}
                type="button"
                className={`text-2xl rounded-full p-2 border-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                  mood === m.emoji
                    ? "bg-blue-100 dark:bg-blue-800 border-blue-400"
                    : "bg-transparent border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                aria-pressed={mood === m.emoji}
                aria-label={m.label}
                tabIndex={0}
                onClick={() => setMood(mood === m.emoji ? null : m.emoji)}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
        {/* Location & Weather */}
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-medium text-gray-700 dark:text-gray-200">Location & Weather</label>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <button
              type="button"
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={handleGetLocation}
            >
              Get my location
            </button>
            <span className="text-gray-600 dark:text-gray-300 min-w-[120px]">
              {location || <span className="italic text-gray-400">No location</span>}
            </span>
            <span className="ml-auto flex items-center gap-1 text-lg">
              <span>{weather}</span>
            </span>
          </div>
        </div>
        {/* Save Button */}
        <div className="md:col-span-2 flex justify-end mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!title.trim() || !text.trim()}
          >
            Save Entry
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryForm;
