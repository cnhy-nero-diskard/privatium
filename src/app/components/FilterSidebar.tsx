"use client";
import React, { useState, useMemo, useEffect } from "react";
import { MoodIcon } from "./MoodIcon";
import { MOOD_DEFINITIONS } from "@/utils/moodUtils";
import { Tag } from "@/types/tags";
import ExportButton from "@/components/ExportButton";
import ImportButton from "@/components/ImportButton";
import { getFolders, createFolder, deleteFolder, updateFolder, type Folder } from "@/utils/folderUtils";

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  date: string;
  folder: string;
  mood: string;
  tags?: Tag[];
}

interface FilterSidebarProps {
  entries: JournalEntry[];
  selectedDate: string | null;
  selectedFolder: string | null;
  selectedTags: string[];
  selectedMoods: string[];
  onDateChange: (date: string | null) => void;
  onFolderChange: (folder: string | null) => void;
  onTagToggle: (tag: string) => void;
  onMoodToggle: (mood: string) => void;
  onClearFilters: () => void;
  onImportComplete: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  count,
}) => {
  return (
    <div className="border-b border-gray-700/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-200">{title}</span>
          {count !== undefined && (
            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
              {count}
            </span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  entries,
  selectedDate,
  selectedFolder,
  selectedTags,
  selectedMoods,
  onDateChange,
  onFolderChange,
  onTagToggle,
  onMoodToggle,
  onClearFilters,
  onImportComplete,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isMoodsOpen, setIsMoodsOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start collapsed by default
  
  // Folder management states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3B82F6");
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderColor, setEditFolderColor] = useState("#3B82F6");
  
  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);
  
  const loadFolders = async () => {
    try {
      const loadedFolders = await getFolders();
      setFolders(loadedFolders);
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName("");
      setNewFolderColor("#3B82F6");
      setIsAddingFolder(false);
      await loadFolders();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };
  
  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm("Are you sure you want to delete this folder? Entries in this folder will not be deleted.")) {
      return;
    }
    
    try {
      await deleteFolder(folderId);
      await loadFolders();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };
  
  const handleUpdateFolder = async (folderId: number) => {
    if (!editFolderName.trim()) return;
    
    try {
      await updateFolder(folderId, editFolderName.trim(), editFolderColor);
      setEditingFolderId(null);
      setEditFolderName("");
      setEditFolderColor("#3B82F6");
      await loadFolders();
    } catch (error) {
      console.error("Failed to update folder:", error);
    }
  };
  
  const startEditFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
    setEditFolderColor(folder.color);
  };

  // Calculate folder statistics
  const folderStats = useMemo(() => {
    const stats = entries.reduce((acc, entry) => {
      acc[entry.folder] = (acc[entry.folder] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats)
      .map(([folder, count]) => ({ folder, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Calculate tag statistics
  const tagStats = useMemo(() => {
    const stats = entries.reduce((acc, entry) => {
      entry.tags?.forEach((tag) => {
        acc[tag.name] = (acc[tag.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Calculate mood statistics
  const moodStats = useMemo(() => {
    const stats = entries.reduce((acc, entry) => {
      if (entry.mood) {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Get unique dates from entries
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.date))).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [entries]);

  const activeFiltersCount =
    (selectedDate ? 1 : 0) +
    (selectedFolder ? 1 : 0) +
    selectedTags.length +
    selectedMoods.length;

  return (
    <>
      {/* Toggle button - visible on all screen sizes */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-20 z-50 p-3 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-all duration-300 ${
          isSidebarOpen ? "left-[21rem]" : "left-4"
        }`}
        title={isSidebarOpen ? "Hide filters" : "Show filters"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isSidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-20 left-0 h-[calc(100vh-5rem)] w-80 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700/50 overflow-y-auto transition-transform duration-300 z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50 sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-100">Filters</h2>
            {activeFiltersCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
              >
                Clear All ({activeFiltersCount})
              </button>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>

        {/* Import/Export Section */}
        <div className="p-4 border-b border-gray-700/30 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Data Management
          </h3>
          <div className="space-y-2">
            <ExportButton />
            <ImportButton onImportComplete={onImportComplete} />
          </div>
        </div>

        {/* Calendar Section */}
        <CollapsibleSection
          title="Calendar"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          <div className="space-y-2">
            <input
              type="date"
              value={selectedDate || ""}
              onChange={(e) => onDateChange(e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            {selectedDate && (
              <button
                onClick={() => onDateChange(null)}
                className="w-full text-sm px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Clear Date
              </button>
            )}
            <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
              <p className="text-xs text-gray-400 mb-2">Recent dates:</p>
              {uniqueDates.slice(0, 10).map((date) => {
                const entryCount = entries.filter((e) => e.date === date).length;
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={date}
                    onClick={() => onDateChange(isSelected ? null : date)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-sm">{date}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-600 rounded-full">
                      {entryCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CollapsibleSection>

        {/* Folders Section */}
        <CollapsibleSection
          title="Folders"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          }
          isOpen={isFoldersOpen}
          onToggle={() => setIsFoldersOpen(!isFoldersOpen)}
          count={folders.length}
        >
          <div className="space-y-2">
            {/* Add folder button */}
            {!isAddingFolder ? (
              <button
                onClick={() => setIsAddingFolder(true)}
                className="w-full px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Folder
              </button>
            ) : (
              <div className="space-y-2 p-2 bg-gray-700/50 rounded-lg">
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") {
                      setIsAddingFolder(false);
                      setNewFolderName("");
                      setNewFolderColor("#3B82F6");
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newFolderColor}
                    onChange={(e) => setNewFolderColor(e.target.value)}
                    className="w-12 h-8 rounded cursor-pointer border border-gray-500"
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingFolder(false);
                      setNewFolderName("");
                      setNewFolderColor("#3B82F6");
                    }}
                    className="px-3 py-1.5 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Folder list */}
            <div className="space-y-1">
              {folders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No folders yet
                </p>
              ) : (
                folders.map((folder) => {
                  const entryCount = entries.filter((e) => e.folder === folder.name).length;
                  const isSelected = selectedFolder === folder.name;
                  const isEditing = editingFolderId === folder.id;
                  
                  if (isEditing) {
                    return (
                      <div key={folder.id} className="space-y-2 p-2 bg-gray-700/50 rounded-lg border-2 border-purple-500/30">
                        <input
                          type="text"
                          value={editFolderName}
                          onChange={(e) => setEditFolderName(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateFolder(folder.id);
                            if (e.key === "Escape") {
                              setEditingFolderId(null);
                              setEditFolderName("");
                              setEditFolderColor("#3B82F6");
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editFolderColor}
                            onChange={(e) => setEditFolderColor(e.target.value)}
                            className="w-12 h-8 rounded cursor-pointer border border-gray-500"
                          />
                          <button
                            onClick={() => handleUpdateFolder(folder.id)}
                            className="flex-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingFolderId(null);
                              setEditFolderName("");
                              setEditFolderColor("#3B82F6");
                            }}
                            className="px-3 py-1.5 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={folder.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color }}
                      />
                      <button
                        onClick={() => onFolderChange(isSelected ? null : folder.name)}
                        className="flex-1 text-left flex items-center justify-between"
                      >
                        <span className="text-sm truncate">{folder.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-600 rounded-full ml-2">
                          {entryCount}
                        </span>
                      </button>
                      <button
                        onClick={() => startEditFolder(folder)}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title="Edit folder"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        title="Delete folder"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Tags Section */}
        <CollapsibleSection
          title="Tags"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          }
          isOpen={isTagsOpen}
          onToggle={() => setIsTagsOpen(!isTagsOpen)}
          count={tagStats.length}
        >
          <div className="space-y-1">
            {tagStats.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tags yet</p>
            ) : (
              tagStats.map(({ tag, count }) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onTagToggle(tag)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-sm truncate flex-1">#{tag}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-600 rounded-full ml-2">
                      {count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </CollapsibleSection>

        {/* Moods Section */}
        <CollapsibleSection
          title="Moods"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          isOpen={isMoodsOpen}
          onToggle={() => setIsMoodsOpen(!isMoodsOpen)}
          count={moodStats.length}
        >
          <div className="space-y-1">
            {moodStats.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No moods yet</p>
            ) : (
              moodStats.map(({ mood, count }) => {
                const isSelected = selectedMoods.includes(mood);
                const moodDef = MOOD_DEFINITIONS.find((m) => m.label === mood);
                return (
                  <button
                    key={mood}
                    onClick={() => onMoodToggle(mood)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <MoodIcon mood={mood} size="sm" />
                      <span className="text-sm truncate">{mood}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-gray-600 rounded-full ml-2">
                      {count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Overlay for mobile - only show on smaller screens when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 top-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default FilterSidebar;
