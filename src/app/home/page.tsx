"use client";
import React, { useState, useEffect, useCallback } from "react";
import JournalModal from "../components/JournalModal";
import Link from "next/link";
import TopNavigation from "../components/TopNavigation";
import { getJournals, updateJournal, deleteJournal } from "@/utils/supabaseClient";
import { getJournalTags } from "@/utils/tagUtils";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { MoodIcon } from "../components/MoodIcon";
import AITherapistSummary from "../components/AITherapistSummary";
import { groupEntriesByMonth, formatMonthKey, getEntriesForMonth, getCurrentMonthKey, getEntriesForLastMonths, getEntriesForLastYears, getEntriesForDateRange, formatDateRangeDescription, getAllAvailableMonths, calculateDateRange } from "@/utils/dateUtils";
import FilterSidebar from "../components/FilterSidebar";
import { getFolders, type Folder } from "@/utils/folderUtils";

import { Tag } from '@/types/tags';

interface ApiResponse {
	status: number;
	data: JournalEntry[];
	etag?: string;
}

interface JournalEntry {
	id: number;
	title: string;
	content: string;
	date: string;
	folder: string;
	mood: string;
	tags?: Tag[];
	_decryptError?: boolean;
	created_at?: string;
	updated_at?: string;
}

const HomePage: React.FC = () => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
	const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteType, setDeleteType] = useState<'single' | 'multi'>('single');
    const [currentEtag, setCurrentEtag] = useState<string | null>(null);	const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
    const [monthlyEntries, setMonthlyEntries] = useState<JournalEntry[]>([]);
	// Date range selector states
	const [rangeType, setRangeType] = useState<'single' | 'lastMonths' | 'lastYears' | 'custom'>('single');
	const [monthsCount, setMonthsCount] = useState<number>(3);
	const [yearsCount, setYearsCount] = useState<number>(1);
	const [customStartMonth, setCustomStartMonth] = useState<string>(getCurrentMonthKey());
	const [customEndMonth, setCustomEndMonth] = useState<string>(getCurrentMonthKey());
	const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
	const [customRangePickerYear, setCustomRangePickerYear] = useState<number>(new Date().getFullYear());
	const [folders, setFolders] = useState<Folder[]>([]);
	const [isAISidebarCollapsed, setIsAISidebarCollapsed] = useState(false);
	const [availableMonths, setAvailableMonths] = useState<Array<{ month: string; count: number }>>([]);
	
	// Filter states
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
	const [quickNotesMode, setQuickNotesMode] = useState<'all' | 'only-quick-notes' | 'mixed'>('all');

	// Lazy loading states
	const [isLazyLoading, setIsLazyLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [totalCount, setTotalCount] = useState(0);
	const [selectedEntryTags, setSelectedEntryTags] = useState<Tag[] | null>(null);
	const [isSearchMode, setIsSearchMode] = useState(false);
	const ITEMS_PER_PAGE = 50; // Load 50 entries at a time
	const observerTarget = React.useRef<HTMLDivElement>(null);

	// When an entry is selected, lazily load its tags
	const handleEntryClick = async (entry: JournalEntry) => {
		setSelectedEntry(entry);
		setSelectedEntryTags(null);
		try {
			const tags = await getJournalTags(entry.id);
			setSelectedEntryTags(tags);
		} catch (error) {
			console.error('Error loading tags for entry:', entry.id, error);
		}
	};

	// Fetch entries with lazy loading support (without tags; tags are loaded on demand)
	const fetchEntries = useCallback(async (resetData: boolean = false) => {
		setError(null);
		
		// If resetting, start from page 0
		const currentPage = resetData ? 0 : page;
		
		if (resetData) {
			setLoading(true);
			setEntries([]);
			setPage(0);
			setHasMore(true);
		} else {
			setIsLazyLoading(true);
		}

		try {
			const response = await getJournals({
				currentEtag: currentEtag || undefined,
				limit: ITEMS_PER_PAGE,
				offset: currentPage * ITEMS_PER_PAGE
			});
			
			// If status is 304, data hasn't changed, so we can keep using the current entries
			if (response.status === 304) {
				setLoading(false);
				setIsLazyLoading(false);
				return;
			}
			
			const { data, etag, totalCount: count, hasMore: more } = response as ApiResponse & { totalCount: number; hasMore: boolean };
			
			// Update our etag
			if (etag) {
				setCurrentEtag(etag);
			}
			
			// Update total count and hasMore flag
			setTotalCount(count);
			setHasMore(more);
			
			// Check for decryption errors
			const hasDecryptionErrors = data.some(entry => entry._decryptError);
			if (hasDecryptionErrors) {
				setError('Some entries could not be decrypted properly. They will be shown with placeholder content.');
			}
			
			// Do not load tags here to avoid N+1 requests;
			// tags are fetched on-demand when opening an entry.
			const entriesWithoutTags = data.map(entry => ({ ...entry, content: entry.content ?? "" }));
			
			// Append new entries or replace all entries
			if (resetData) {
				setEntries(entriesWithoutTags || []);
				setPage(1); // reset page to 1 since we've loaded the first page
			} else {
				// Deduplicate by id to avoid duplicate keys
				setEntries(prev => {
					const existingIds = new Set(prev.map(e => e.id));
					const toAdd = (entriesWithoutTags || []).filter(e => !existingIds.has(e.id));
					return [...prev, ...toAdd];
				});
				// Only increment page if we actually received new entries
				if ((entriesWithoutTags || []).length > 0) {
					setPage(currentPage + 1);
				}
			}
		} catch (error) {
			console.error('Error fetching entries:', error);
			let errorMessage: string;
			
			if (error instanceof Error) {
				// Handle specific error types
				if (error.message.includes('Database query failed')) {
					errorMessage = 'Unable to connect to the database. Please check your internet connection.';
				} else if (error.message.includes('decrypt')) {
					errorMessage = 'There was a problem decrypting your journal entries. Please check your encryption settings.';
				} else {
					errorMessage = error.message;
				}
			} else {
				errorMessage = 'An unexpected error occurred. Please try again later.';
			}
			
			setError(errorMessage);
			if (resetData) {
				setEntries([]);
			}
		} finally {
			setLoading(false);
			setIsLazyLoading(false);
		}
	}, [page, currentEtag]);

	// Specialized search function that queries all entries
	const performSearch = async () => {
		setError(null);
		setLoading(true);
		setIsSearchMode(true);
		
		try {
			// Import searchJournals from supabaseClient
			const { searchJournals } = await import('@/utils/supabaseClient');
			
			const response = await searchJournals(searchTerm, {
				folder: selectedFolder,
				tags: selectedTags,
				moods: selectedMoods,
				date: selectedDate
			});
			
			const { data } = response;
			
			// Do not load tags here; tags are loaded on demand per entry.
			const entriesWithoutTags = data.map(entry => ({ ...entry, content: entry.content ?? "" }));
			
			// Apply tag filter if needed (since backend doesn't do this)
			let filtered = entriesWithoutTags;
			if (selectedTags.length > 0) {
				// Since tags are not preloaded anymore, tag-based filtering
				// is delegated to the backend via `searchJournals` options.
			}
			
			setEntries(filtered as JournalEntry[]);
			setHasMore(false); // No pagination in search mode
		} catch (error) {
			console.error('Error searching entries:', error);
			setError('An error occurred while searching. Please try again.');
			setEntries([]);
		} finally {
			setLoading(false);
		}
	};

	// Load available months for AI therapist date selector
	const loadAvailableMonths = async () => {
		try {
			const response = await fetch('/api/available-months');
			if (response.ok) {
				const { months } = await response.json();
				setAvailableMonths(months || []);
			}
		} catch (error) {
			console.error('Failed to load available months:', error);
		}
	};

	// Initial load
	useEffect(() => {
		fetchEntries(true);
		loadFolders();
		loadAvailableMonths();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Intersection observer for lazy loading
	useEffect(() => {
		if (isSearchMode || !hasMore || loading) {
			return; // Don't set up observer in search mode or when nothing more to load
		}

		const observer = new IntersectionObserver(
			(entries) => {
				// Load more when the target is visible
				if (entries[0].isIntersecting && !isLazyLoading) {
					console.log('Intersection detected - loading more entries');
					fetchEntries(false);
				}
			},
			{ 
				threshold: 0.1,
				rootMargin: '100px' // Start loading 100px before reaching the target
			}
		);

		const currentTarget = observerTarget.current;
		if (currentTarget) {
			observer.observe(currentTarget);
			console.log('Observer attached to target');
		}

		return () => {
			if (currentTarget) {
				observer.unobserve(currentTarget);
			}
		};
	}, [hasMore, isLazyLoading, loading, isSearchMode, fetchEntries]);

	// Load folders
	const loadFolders = async () => {
		try {
			const loadedFolders = await getFolders();
			setFolders(loadedFolders);
		} catch (error) {
			console.error("Failed to load folders:", error);
		}
	};

	// Get folder color by name
	const getFolderColor = (folderName: string): string => {
		const folder = folders.find(f => f.name === folderName);
		return folder?.color || '#6B7280'; // Default gray color
	};

	// Update monthly entries based on selected range type
	useEffect(() => {
		if (entries.length > 0) {
			let filteredEntries: JournalEntry[] = [];
			
			switch (rangeType) {
				case 'single':
					filteredEntries = getEntriesForMonth(entries, selectedMonth);
					break;
				case 'lastMonths':
					filteredEntries = getEntriesForLastMonths(entries, monthsCount);
					break;
				case 'lastYears':
					filteredEntries = getEntriesForLastYears(entries, yearsCount);
					break;
				case 'custom':
					filteredEntries = getEntriesForDateRange(entries, customStartMonth, customEndMonth);
					break;
			}
			
			setMonthlyEntries(filteredEntries);
		} else {
			setMonthlyEntries([]);
		}
	}, [entries, rangeType, selectedMonth, monthsCount, yearsCount, customStartMonth, customEndMonth]);

	// Handler for editing an entry
	const handleEdit = async (updatedEntry: any) => {
		try {
			await updateJournal(updatedEntry.id, updatedEntry);
			// Reload data based on current mode
			if (isSearchMode) {
				await performSearch();
			} else {
				await fetchEntries(true);
			}
			setSelectedEntry(null);
		} catch (error) {
			console.error('Error updating entry:', error);
			alert('Failed to update entry.');
		}
	};

	// Show confirm modal before deleting single entry
	const handleDeleteRequest = () => {
		setDeleteType('single');
		setShowDeleteModal(true);
	};

	// Show confirm modal before multi-delete
	const handleMultiDeleteRequest = () => {
		setDeleteType('multi');
		setShowDeleteModal(true);
	};

	// Confirm delete for single or multiple entries
	const handleDeleteConfirm = async () => {
		if (deleteType === 'single' && selectedEntry) {
			try {
				await deleteJournal(Number(selectedEntry.id));
				// Reload data based on current mode
				if (isSearchMode) {
					await performSearch();
				} else {
					await fetchEntries(true);
				}
				setSelectedEntry(null);
			} catch (error) {
				console.error('Error deleting entry:', error);
				alert('Failed to delete entry.');
			}
		} else if (deleteType === 'multi' && selectedIds.length > 0) {
			try {
				await Promise.all(selectedIds.map(id => deleteJournal(id)));
				setSelectedIds([]);
				setMultiSelectMode(false);
				// Reload data based on current mode
				if (isSearchMode) {
					await performSearch();
				} else {
					await fetchEntries(true);
				}
			} catch (error) {
				console.error('Error deleting entries:', error);
				alert('Failed to delete selected entries.');
			}
		}
		setShowDeleteModal(false);
	};

	const handleDeleteCancel = () => {
		setShowDeleteModal(false);
	};

	// Toggle selection for an entry
	const toggleSelectEntry = (id: number) => {
		setSelectedIds(prev => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);
	};

	// Select all visible entries
	const selectAllVisible = (visibleEntries: any[]) => {
		setSelectedIds(visibleEntries.map(e => e.id));
	};

	// Deselect all
	const deselectAll = () => setSelectedIds([]);

	// Effect to trigger search or reload when filters/search change
	useEffect(() => {
		// If there's a search term or any filters active, use search mode
		const hasActiveFilters = searchTerm || selectedDate || selectedFolder || 
			selectedTags.length > 0 || selectedMoods.length > 0;
		
		if (hasActiveFilters) {
			performSearch();
		} else {
			// No filters - return to lazy loading mode
			setIsSearchMode(false);
			fetchEntries(true);
		}
	}, [searchTerm, selectedDate, selectedFolder, selectedTags, selectedMoods]);

	// Filter handlers
	const handleDateChange = (date: string | null) => {
		setSelectedDate(date);
	};

	const handleFolderChange = (folder: string | null) => {
		setSelectedFolder(folder);
	};

	const handleTagToggle = (tag: string) => {
		setSelectedTags(prev =>
			prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
		);
	};

	const handleMoodToggle = (mood: string) => {
		setSelectedMoods(prev =>
			prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
		);
	};

	const handleQuickNotesModeChange = (mode: 'all' | 'only-quick-notes' | 'mixed') => {
		setQuickNotesMode(mode);
	};

	const handleClearFilters = () => {
		setSelectedDate(null);
		setSelectedFolder(null);
		setSelectedTags([]);
		setSelectedMoods([]);
		setQuickNotesMode('all');
		setSearchTerm("");
	};

	// Filter entries based on all active filters
	const filteredEntries = entries.filter(entry => {
		// Quick notes mode filter
		const isQuickNote = !entry.content || entry.content.trim() === '';
		if (quickNotesMode === 'only-quick-notes' && !isQuickNote) {
			return false;
		}

		// Search term filter
		if (searchTerm && !entry.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
			!entry.content?.toLowerCase().includes(searchTerm.toLowerCase())) {
			return false;
		}

		// Date filter
		if (selectedDate && entry.date !== selectedDate) {
			return false;
		}

		// Folder filter
		if (selectedFolder && entry.folder !== selectedFolder) {
			return false;
		}

		// Tags filter (entry must have at least one of the selected tags)
		if (selectedTags.length > 0) {
			const entryTagNames = entry.tags?.map(t => t.name) || [];
			if (!selectedTags.some(tag => entryTagNames.includes(tag))) {
				return false;
			}
		}

		// Moods filter
		if (selectedMoods.length > 0 && !selectedMoods.includes(entry.mood)) {
			return false;
		}

		return true;
	});

	return (
		<>
			<TopNavigation />
			<main className="min-h-screen bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex pt-20">
			<FilterSidebar
				entries={entries}
				selectedDate={selectedDate}
				selectedFolder={selectedFolder}
				selectedTags={selectedTags}
				selectedMoods={selectedMoods}
				quickNotesMode={quickNotesMode}
				onDateChange={handleDateChange}
				onFolderChange={handleFolderChange}
				onTagToggle={handleTagToggle}
				onMoodToggle={handleMoodToggle}
				onQuickNotesModeChange={handleQuickNotesModeChange}
				onClearFilters={handleClearFilters}
				onImportComplete={() => fetchEntries(true)}
			/>
				<div className="flex-1 px-0 lg:px-8 overflow-x-hidden">
					<div className="w-full max-w-6xl mx-auto px-0 lg:px-4">
						<div className="text-center mb-12 animate-fadeIn">
							<h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
								'sup
							</h1>
							<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
								Built with privacy
							</p>
						</div>				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-all duration-300 hover:shadow-xl">
					<div className="flex flex-wrap justify-between items-center gap-4 mb-6">
						<div className="flex-1">
							<div className="flex gap-4 flex-wrap items-center">
								<input
									type="text"
									placeholder="Search entries..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-64"
								/>
								<button
									className={`px-4 py-2 rounded-lg font-semibold shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 ${multiSelectMode ? 'text-red-600' : 'text-blue-600'} hover:bg-gradient-to-r hover:from-red-700 hover:via-pink-700 hover:to-purple-800 hover:text-white`}
									onClick={() => {
										setMultiSelectMode(!multiSelectMode);
										setSelectedIds([]);
									}}
									type="button"
									title={multiSelectMode ? "Cancel Multi-Select" : "Multi-Delete"}
								>
									{multiSelectMode ? (
										<>
											<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0v10a2 2 0 002 2h4a2 2 0 002-2V7" />
											</svg>
											Cancel Multi-Select
										</>
									) : (
										<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0v10a2 2 0 002 2h4a2 2 0 002-2V7" />
										</svg>
									)}
								</button>
								{multiSelectMode && (
									<>
										<button
											className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold shadow-lg ml-2"
											type="button"
											onClick={() => {
												selectAllVisible(filteredEntries);
											}}
										>Select All</button>
										<button
											className="px-4 py-2 rounded-lg bg-gray-400 text-white font-semibold shadow-lg ml-2"
											type="button"
											onClick={deselectAll}
										>Deselect All</button>
									</>
								)}
							</div>
						</div>
					</div>
					{loading ? (
						<div className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="animate-pulse">
									<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
									<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
								</div>
							))}
						</div>
					) : error ? (
						<div className="text-center py-12">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<p className="text-red-500 dark:text-red-400 text-lg mb-4">
								{error}
							</p>
							<button
								onClick={() => fetchEntries(true)}
								className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2 mx-auto"
							>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Retry
							</button>
						</div>
					) : entries.length === 0 ? (
						<div className="text-center py-12">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							<p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
								Your journal is empty
							</p>
							<p className="text-gray-400 dark:text-gray-500">
								Start by adding your first entry!
							</p>
						</div>
					) : (
						<>
							{/* Multi-delete bar */}
							{multiSelectMode && (
								<div className="flex items-center gap-4 mb-4">
									<span className="text-sm text-gray-700 dark:text-gray-300">Selected: {selectedIds.length}</span>
									<button
										className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-lg flex items-center gap-2"
										type="button"
										disabled={selectedIds.length === 0}
										onClick={handleMultiDeleteRequest}
										title="Delete Selected"
									>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0v10a2 2 0 002 2h4a2 2 0 002-2V7" />
										</svg>
										Delete
									</button>
								</div>
							)}
							
							{/* Quick Notes Section - Only show when mode is 'all' (default) */}
							{quickNotesMode === 'all' && (() => {
								const isSameDay = (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString();

								// Only show quick notes created today
								const quickNotes = filteredEntries.filter(entry => 
									(!entry.content || entry.content.trim() === '') &&
									isSameDay(entry.date)
								);
								
								if (quickNotes.length > 0) {
									return (
										<div className="mb-8 pb-6 border-b border-gray-700/30">
											<div className="flex items-center gap-2 mb-4">
												<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
													<path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
													<path d="M8 11a1 1 0 100-2 1 1 0 000 2zm0 0a1 1 0 000 2m0-2a1 1 0 000-2m0 2a1 1 0 100 2m0-2v1m4-1a1 1 0 100-2 1 1 0 000 2zm0 0a1 1 0 000 2m0-2a1 1 0 000-2m0 2a1 1 0 100 2m0-2v1" />
												</svg>
												<h2 className="text-lg font-semibold text-amber-400">Quick Notes (Today)</h2>
												<span className="text-xs px-2 py-0.5 bg-amber-900/50 text-amber-300 rounded-full">{quickNotes.length}</span>
											</div>
											
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												{quickNotes.map((entry) => {
													const entryDate = new Date(entry.date);
													const now = new Date();
													const hoursSinceCreation = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
													const isRecent = hoursSinceCreation <= 24;
													
													let entryClasses = `backdrop-blur-sm rounded-lg transition-all duration-300 border hover:border-amber-400 
														${multiSelectMode ? 'flex items-center gap-3' : 'cursor-pointer'}`;
													
													entryClasses += isRecent 
														? ' bg-gradient-to-br from-amber-500/80 to-orange-600/70 border-amber-400 border-dashed p-3 shadow-lg shadow-amber-700/20 transform hover:-translate-y-1'
														: ' bg-gradient-to-br from-amber-600/40 to-orange-700/30 border-amber-500/30 border-dashed p-3 shadow hover:shadow-amber-700/10 transform hover:-translate-y-1';
													
													return (
														<div
															key={entry.id}
															className={`${entryClasses} flex`}
															{...(!multiSelectMode ? { onClick: () => handleEntryClick(entry) } : {})}
														>
															{/* Folder color bar */}
															<div
																className="w-1 rounded-l-lg flex-shrink-0"
																style={{ backgroundColor: getFolderColor(entry.folder) }}
															/>
															<div className="flex-1 flex items-center">
															{multiSelectMode && (
																<input
																	type="checkbox"
																	checked={selectedIds.includes(entry.id)}
																	onChange={() => toggleSelectEntry(entry.id)}
																	className="form-checkbox h-5 w-5 text-blue-600 ml-3"
																	aria-label={`Select entry ${entry.title}`}
																/>
															)}
															<div className={`flex items-start justify-between w-full ${multiSelectMode ? 'ml-3' : 'ml-3'}`}>
																<div className="flex-1 pr-3">
																	<div className="flex items-center gap-2 mb-1">
																		<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-300" viewBox="0 0 20 20" fill="currentColor">
																			<path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h6v4H7V5z" clipRule="evenodd" />
																		</svg>
																		<h3 className="font-medium text-gray-100 text-base tracking-wide">
																			{entry.title}
																			{isRecent && (
																				<span className="ml-2 text-xs px-2 py-0.5 bg-amber-500 rounded-full text-white font-bold">New</span>
																			)}
																		</h3>
																	</div>
																	<div className="flex items-center gap-3 text-sm text-amber-100/80">
																		<span className="flex items-center gap-1">
																			<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
																			</svg>
																			{entry.date}
																		</span>
																		<span className="flex items-center gap-1">
																			<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
																			</svg>
																			{entry.folder}
																		</span>
																	</div>
																</div>
																<div className="ml-4 bg-amber-700/40 backdrop-blur-sm p-2 rounded-full shadow-md border border-amber-500/40 flex items-center justify-center text-xl rotate-3 transform hover:rotate-0 transition-transform">
																	{entry.mood && entry.mood.trim() !== "" && (
																		<MoodIcon mood={entry.mood} size="md" />
																	)}
																</div>
															</div>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									);
								}
								return null;
							})()}

							{/* Section Title - changes based on mode */}
							{quickNotesMode === 'only-quick-notes' ? (
								<h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
									</svg>
									All Quick Notes
								</h2>
							) : (
								<h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2 mb-4">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									{quickNotesMode === 'mixed' ? 'All Entries' : 'Journal Entries'}
								</h2>
							)}
							<div className="space-y-6">
								{Object.entries(
									filteredEntries
										.filter(entry => {
											// In 'all' mode (default), filter out quick notes from journal entries section
											// In 'only-quick-notes' mode, show all (already filtered by filteredEntries)
											// In 'mixed' mode, show everything
											if (quickNotesMode === 'all') {
												return entry.content && entry.content.trim() !== '';
											}
											return true;
										})
										.reduce((groups: { [key: string]: typeof filteredEntries }, entry) => {
											const date = new Date(entry.date);
											const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
											const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
											
											if (!groups[monthKey]) {
												groups[monthKey] = [];
											}
											groups[monthKey].push(entry);
											return groups;
										}, {})
								)
									.sort(([monthA], [monthB]) => {
										// Sort by month key in descending order (newest first)
										return monthB.localeCompare(monthA);
									})
									.map(([monthKey, groupEntries]) => {
										// Format the month label
										const [year, month] = monthKey.split('-');
										const monthLabel = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
										
										// Sort entries within the month by date (newest first)
										const sortedEntries = [...groupEntries].sort((a, b) => {
											return new Date(b.date).getTime() - new Date(a.date).getTime();
										});
										
										return (
										<div key={monthKey} className="space-y-4">
											<h3 className="text-lg font-semibold text-blue-400/90 pl-3 py-2 border-l-4 border-blue-400/50 bg-gray-800/30 rounded-r">
												{monthLabel}
											</h3>
											<div className="grid gap-4">
												{sortedEntries.map((entry) => {
										// Check if this is a quick note (no content) and if it's recent (within 24 hours)
										const isQuickNote = !entry.content || entry.content.trim() === '';
										
										// Calculate if the entry is recent (within last 24 hours)
										const entryDate = new Date(entry.date);
										const now = new Date();
										const hoursSinceCreation = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
										const isRecent = hoursSinceCreation <= 24;
										
										// Determine CSS classes for highlight/multi-select
										let entryClasses = `backdrop-blur-sm rounded-lg transition-all duration-300 border w-full max-w-full overflow-hidden
										    ${multiSelectMode ? ' cursor-default' : ' cursor-pointer'}`;

										// Apply yellow background to quick notes in 'only-quick-notes' or 'mixed' modes
										// OR if in 'all' mode and the note is recent (existing behavior)
										if (isQuickNote && (quickNotesMode === 'only-quick-notes' || quickNotesMode === 'mixed')) {
											// Always show with yellow background in these modes
											entryClasses += ' bg-gradient-to-br from-amber-500/60 to-orange-600/50 border-amber-400/50 border-dashed shadow hover:shadow-amber-700/20 hover:-translate-y-1';
										} else if (isQuickNote && quickNotesMode === 'all') {
											// Original behavior for 'all' mode - only highlight recent ones
											entryClasses += isRecent
												? ' bg-gradient-to-br from-amber-500/80 to-orange-600/70 border-amber-400 border-dashed shadow-lg shadow-amber-700/20 hover:-translate-y-1'
												: ' bg-gradient-to-br from-amber-600/40 to-orange-700/30 border-amber-500/30 border-dashed shadow hover:shadow-amber-700/10 hover:-translate-y-1';
										} else {
											// Base dark tile for regular journal entries
											entryClasses += ' bg-black border-gray-700 hover:border-gray-500';
										}

										// Format date/time pieces for the left column
										const entryDateObj = new Date(entry.date);
									const dayName = entryDateObj.toLocaleDateString(undefined, { weekday: 'short' });
									const dayNumber = entryDateObj.toLocaleDateString(undefined, { day: '2-digit' });
										const timeString = entryDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

										return (
										<div
											key={entry.id}
											className={entryClasses}
											{...(!multiSelectMode ? { onClick: () => handleEntryClick(entry) } : {})}
										>
											<div className="flex h-full w-full">
												{/* Folder color bar on extreme left */}
												<div
													className="w-2 flex-shrink-0"
													style={{ backgroundColor: getFolderColor(entry.folder) }}
												/>

												{/* Left date/time column */}
												<div className="flex flex-col justify-between items-center px-3 py-3 bg-gray-900 text-white min-w-[80px] md:min-w-[110px]">
													<span className="text-sm md:text-base font-semibold tracking-wide text-center leading-tight">{dayName}</span>
													<span className="text-2xl md:text-3xl font-bold mt-2 mb-2 leading-none">{dayNumber}</span>
													<span className="text-xs md:text-sm font-medium tracking-wide leading-tight">{timeString}</span>
												</div>

												{/* Right content column */}
												<div className="flex-1 flex items-stretch min-w-0">
													{multiSelectMode && (
														<div className="flex items-start pl-3 pt-3">
															<input
																type="checkbox"
																checked={selectedIds.includes(entry.id)}
																onChange={() => toggleSelectEntry(entry.id)}
																className="form-checkbox h-5 w-5 text-blue-500"
																aria-label={`Select entry ${entry.title}`}
															/>
														</div>
													)}
													<div className={`flex w-full items-stretch min-w-0 ${multiSelectMode ? 'pl-3 pr-3 py-3' : 'px-4 md:px-6 py-3 md:py-4'}`}>
														<div className="flex-1 flex flex-col justify-center">
															{isQuickNote ? (
																<>
																	<h3 className="font-semibold text-amber-100 text-base tracking-wide mb-2 flex items-center gap-2">
																		<span>{entry.title}</span>
																		{isRecent && (
																			<span className="text-xs px-2 py-0.5 bg-amber-500 rounded-full text-white font-bold">New</span>
																		)}
																	</h3>
																	<div className="text-xs text-amber-100/80 flex gap-4">
																		<span>{entry.date}</span>
																		<span>{entry.folder}</span>
																	</div>
																</>
															) : (
																<>
																	<h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-3 tracking-wide break-words">
																		{entry.title}
																	</h3>
																	<div className="text-xs md:text-sm text-gray-200 leading-relaxed line-clamp-3 break-words">
																		{entry.content ? (entry.content.length > 200 ? `${entry.content.substring(0, 200)}...` : entry.content) : ''}
																	</div>
																</>
															)}
														</div>
														{entry.mood && entry.mood.trim() !== "" && (
															<div className="ml-4 flex items-center pr-4">
																<div className={isQuickNote ? 'bg-amber-700/40 backdrop-blur-sm p-2 rounded-full shadow-md border border-amber-500/40 flex items-center justify-center text-xl rotate-3 transform hover:rotate-0 transition-transform' : 'bg-gray-900/80 backdrop-blur-sm p-3 rounded-full shadow-lg border border-gray-700/80 flex items-center justify-center text-2xl'}>
																	<MoodIcon mood={entry.mood} size={isQuickNote ? 'md' : 'lg'} />
																</div>
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
									);
								})}
											</div>
										</div>
									);
								})}
							</div>
							
							{/* No journal entries message */}
							{(() => {
								const isSameDay = (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString();
								const hasQuickNotes = filteredEntries.some(entry => (!entry.content || entry.content.trim() === ''));
								const hasJournalEntries = filteredEntries.some(entry => entry.content && entry.content.trim() !== '');
								
								// Show "No journal entries" message only when displaying that section and there are no matching entries
								if (!hasJournalEntries && filteredEntries.length > 0) {
									return (
										<div className="text-center py-8 border border-gray-700/20 rounded-lg bg-gray-800/20 mb-8">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
											<p className="text-gray-400 text-lg mb-2">
												No journal entries yet
											</p>
											<p className="text-gray-500 text-sm">
												{hasQuickNotes ? "You have some quick notes above. Try expanding them into full journal entries!" : "Start by adding your first entry!"}
											</p>
										</div>
									);
								}
								return null;
							})()}

							{/* Lazy loading indicator and observer target */}
							{!isSearchMode && hasMore && (
								<div className="py-8">
									{/* Observer target - invisible trigger point */}
									<div ref={observerTarget} className="h-2"></div>
									
									{/* Loading indicator */}
									{isLazyLoading ? (
										<div className="space-y-4 text-center">
											<div className="animate-pulse flex justify-center">
												<div className="h-8 w-8 bg-blue-500 rounded-full animate-bounce"></div>
											</div>
											<p className="text-gray-500 dark:text-gray-400">Loading more entries...</p>
										</div>
									) : (
										/* Manual load more button as fallback */
										<div className="text-center">
											<button
												onClick={() => fetchEntries(false)}
												className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors font-semibold"
											>
												Load More Entries
											</button>
										</div>
									)}
								</div>
							)}

							{/* Show total count info */}
							{!loading && entries.length > 0 && (
								<div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
									{isSearchMode ? (
										<p>Found {entries.length} matching {entries.length === 1 ? 'entry' : 'entries'}</p>
									) : (
										<p>
											Showing {entries.length} of {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
											{!hasMore && entries.length === totalCount && ' (all loaded)'}
										</p>
									)}
								</div>
							)}
						</>
					)}
					

					{/* Modal for entry content */}
					{selectedEntry && (
						<JournalModal
							entry={{ ...selectedEntry, tags: selectedEntryTags || selectedEntry.tags }}
							onClose={() => {
								setSelectedEntry(null);
								setSelectedEntryTags(null);
							}}
							onEdit={handleEdit}
							onDelete={handleDeleteRequest}
						/>
					)}

					{/* Confirm Delete Modal */}
					<ConfirmDeleteModal
						open={showDeleteModal}
						onConfirm={handleDeleteConfirm}
						onCancel={handleDeleteCancel}
						multiple={deleteType === 'multi'}
						count={deleteType === 'multi' ? selectedIds.length : undefined}
					/>
					</div>
				</div>
			</div>
			
			{/* AI Therapist Right Sidebar */}
			<div className={`hidden xl:block bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto transition-all duration-300 ${isAISidebarCollapsed ? 'w-14' : 'w-96'}`}>
				<div className="p-6">
					{/* Collapse/Expand Button */}
					<div className="flex items-center justify-between mb-6">
						{!isAISidebarCollapsed && (
							<h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
									<path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 001.73 10.057a.75.75 0 01-.231-1.337 60.653 60.653 0 0110.2-5.915z" />
									<path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18a1.5 1.5 0 00-.14-2.508 49.03 49.03 0 00-4.45-2.26.75.75 0 01-.435-.685c.033-1.982.166-3.952.397-5.903a.75.75 0 01.66-.664A48.448 48.448 0 0117.25 5.75a.75.75 0 01.665.665 48.497 48.497 0 01.396 5.903.75.75 0 01-.434.686c-.546.275-1.084.56-1.617.849A1.5 1.5 0 0016 13.18a49.03 49.03 0 003.342 1.68.75.75 0 01.461.71 49.384 49.384 0 00-.254 4.287.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.443.12-2.871.254-4.286a.75.75 0 01.46-.709 49.368 49.368 0 003.341-1.681A1.5 1.5 0 005 13.18a48.45 48.45 0 01-4.309-2.233.75.75 0 01-.435-.684c.033-1.982.166-3.952.397-5.903a.75.75 0 01.665-.665A48.449 48.449 0 0118 5.75a.75.75 0 01.665.665 48.449 48.449 0 01.396 5.903.75.75 0 01-.435.684 48.978 48.978 0 01-4.31 2.233 1.5 1.5 0 00-.139 2.509z" />
								</svg>
								AI Therapist
							</h2>
						)}
						<button
							onClick={() => setIsAISidebarCollapsed(!isAISidebarCollapsed)}
							className="p-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white shadow-lg transition-all ml-auto"
							aria-label={isAISidebarCollapsed ? "Expand AI Therapist" : "Collapse AI Therapist"}
						>
							<svg 
								xmlns="http://www.w3.org/2000/svg" 
								className={`h-5 w-5 transition-transform ${isAISidebarCollapsed ? 'rotate-180' : ''}`}
								fill="none" 
								viewBox="0 0 24 24" 
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
					
					{!isAISidebarCollapsed && (
						<>
							
					
					<div className="mb-4 space-y-3">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Date Range:
						</label>
						
						{/* Range Type Selector */}
						<select
							value={rangeType}
							onChange={(e) => setRangeType(e.target.value as any)}
							className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
						>
							<option value="single">Single Month</option>
							<option value="lastMonths">Last X Months</option>
							<option value="lastYears">Last X Years</option>
							<option value="custom">Custom Range</option>
						</select>
						
					{/* Single Month Selector */}
					{rangeType === 'single' && (
						<div className="space-y-3">
							{/* Year Selector */}
							<div className="flex items-center justify-between gap-2">
								<button
									onClick={() => setPickerYear(pickerYear - 1)}
									className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
								>
									←
								</button>
								<span className="font-semibold text-gray-700 dark:text-gray-300">{pickerYear}</span>
								<button
									onClick={() => setPickerYear(pickerYear + 1)}
									className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
								>
									→
								</button>
							</div>
							{/* Month Grid */}
							<div className="grid grid-cols-3 gap-2">
								{Array.from({ length: 12 }, (_, i) => {
									const monthNum = i + 1;
									const monthKey = `${pickerYear}-${monthNum.toString().padStart(2, '0')}`;
									// Use availableMonths from the API instead of paginated entries
									const monthData = availableMonths.find(m => m.month === monthKey);
									const entryCount = monthData?.count || 0;
									const isSelected = selectedMonth === monthKey;
									const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
									
									return (
										<button
											key={monthKey}
											onClick={() => setSelectedMonth(monthKey)}
											className={`p-2 rounded-lg text-sm font-medium transition-colors ${
												isSelected
													? 'bg-purple-500 text-white'
													: entryCount > 0
													? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
													: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
											}`}
										>
											<div>{monthNames[i]}</div>
											{entryCount > 0 && (
												<div className="text-xs mt-0.5">{entryCount}</div>
											)}
										</button>
									);
								})}
							</div>
						</div>
					)}						{/* Last X Months Selector */}
						{rangeType === 'lastMonths' && (
							<div className="flex items-center space-x-2">
								<label className="text-sm text-gray-600 dark:text-gray-400">Last</label>
								<input
									type="number"
									min="1"
									max="36"
									value={monthsCount}
									onChange={(e) => setMonthsCount(Math.max(1, Math.min(36, parseInt(e.target.value) || 1)))}
									className="w-20 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
								/>
								<label className="text-sm text-gray-600 dark:text-gray-400">months</label>
							</div>
						)}
						
						{/* Last X Years Selector */}
						{rangeType === 'lastYears' && (
							<div className="flex items-center space-x-2">
								<label className="text-sm text-gray-600 dark:text-gray-400">Last</label>
								<input
									type="number"
									min="1"
									max="10"
									value={yearsCount}
									onChange={(e) => setYearsCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
									className="w-20 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
								/>
								<label className="text-sm text-gray-600 dark:text-gray-400">years</label>
							</div>
						)}
						
					{/* Custom Range Selector */}
					{rangeType === 'custom' && (
						<div className="space-y-3">
							{/* Year Selector */}
							<div className="flex items-center justify-between gap-2">
								<button
									onClick={() => setCustomRangePickerYear(customRangePickerYear - 1)}
									className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
								>
									←
								</button>
								<span className="font-semibold text-gray-700 dark:text-gray-300">{customRangePickerYear}</span>
								<button
									onClick={() => setCustomRangePickerYear(customRangePickerYear + 1)}
									className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
								>
									→
								</button>
							</div>
							
							{/* Start Month Selection */}
							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">From:</label>
								<div className="grid grid-cols-3 gap-2">
									{Array.from({ length: 12 }, (_, i) => {
										const monthNum = i + 1;
										const monthKey = `${customRangePickerYear}-${monthNum.toString().padStart(2, '0')}`;
										const monthData = availableMonths.find(m => m.month === monthKey);
										const entryCount = monthData?.count || 0;
										const isSelected = customStartMonth === monthKey;
										const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
										
										return (
											<button
												key={monthKey}
												onClick={() => setCustomStartMonth(monthKey)}
												className={`p-2 rounded-lg text-xs font-medium transition-colors ${
													isSelected
														? 'bg-green-500 text-white ring-2 ring-green-600'
														: entryCount > 0
														? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
														: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
												}`}
											>
												<div>{monthNames[i]}</div>
												{entryCount > 0 && (
													<div className="text-xs mt-0.5">{entryCount}</div>
												)}
											</button>
										);
									})}
								</div>
							</div>
							
							{/* End Month Selection */}
							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">To:</label>
								<div className="grid grid-cols-3 gap-2">
									{Array.from({ length: 12 }, (_, i) => {
										const monthNum = i + 1;
										const monthKey = `${customRangePickerYear}-${monthNum.toString().padStart(2, '0')}`;
										const monthData = availableMonths.find(m => m.month === monthKey);
										const entryCount = monthData?.count || 0;
										const isSelected = customEndMonth === monthKey;
										const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
										
										return (
											<button
												key={monthKey}
												onClick={() => setCustomEndMonth(monthKey)}
												className={`p-2 rounded-lg text-xs font-medium transition-colors ${
													isSelected
														? 'bg-blue-500 text-white ring-2 ring-blue-600'
														: entryCount > 0
														? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
														: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
												}`}
											>
												<div>{monthNames[i]}</div>
												{entryCount > 0 && (
													<div className="text-xs mt-0.5">{entryCount}</div>
												)}
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}						{/* Display selected range info */}
						<div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
							<span className="font-medium">Selected: </span>
							{rangeType === 'single' && formatMonthKey(selectedMonth)}
							{rangeType === 'lastMonths' && `Last ${monthsCount} month${monthsCount > 1 ? 's' : ''}`}
							{rangeType === 'lastYears' && `Last ${yearsCount} year${yearsCount > 1 ? 's' : ''}`}
							{rangeType === 'custom' && `${formatMonthKey(customStartMonth)} - ${formatMonthKey(customEndMonth)}`}
						</div>
					</div>							<AITherapistSummary 
								{...(() => {
									const range = calculateDateRange(rangeType, {
										selectedMonth,
										monthsCount,
										yearsCount,
										customStartMonth,
										customEndMonth
									});
									return {
										startDate: range.startDate,
										endDate: range.endDate,
										rangeDescription: range.description,
										rangeType
									};
								})()}
							/>
						</>
					)}
				</div>
			</div>
		</main>
		</>
	);
};export default HomePage;
