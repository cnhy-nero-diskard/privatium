"use client";
import React, { useState, useEffect } from "react";
import JournalModal from "../components/JournalModal";
import Link from "next/link";
import TopNavigation from "../components/TopNavigation";
import { getJournals, updateJournal, deleteJournal } from "@/utils/supabaseClient";
import { getJournalTags } from "@/utils/tagUtils";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { MoodIcon } from "../components/MoodIcon";
import AITherapistSummary from "../components/AITherapistSummary";
import { groupEntriesByMonth, formatMonthKey, getEntriesForMonth, getCurrentMonthKey } from "@/utils/dateUtils";
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
    const [showAISection, setShowAISection] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
    const [monthlyEntries, setMonthlyEntries] = useState<JournalEntry[]>([]);
	const [folders, setFolders] = useState<Folder[]>([]);
	
	// Filter states
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

	const fetchEntries = async () => {
		setError(null);
		setLoading(true);
		try {
			const response = await getJournals(currentEtag || undefined);
			
			// If status is 304, data hasn't changed, so we can keep using the current entries
			if (response.status === 304) {
				setLoading(false);
				return;
			}
			
			const { data, etag } = response as ApiResponse;
			
			// Update our etag
			if (etag) {
				setCurrentEtag(etag);
			}
			
			// Check for decryption errors
			const hasDecryptionErrors = data.some(entry => entry._decryptError);
			if (hasDecryptionErrors) {
				setError('Some entries could not be decrypted properly. They will be shown with placeholder content.');
			}
			
			// Load tags for each entry
			const entriesWithTags = await Promise.all(
				data.map(async entry => {
					const tags = await getJournalTags(entry.id);
					return { ...entry, content: entry.content ?? "", tags };
				})
			);
			
			setEntries(entriesWithTags || []);
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
			setEntries([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchEntries();
		loadFolders();
	}, []);

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

	// Update monthly entries when selected month or entries change
	useEffect(() => {
		if (entries.length > 0 && selectedMonth) {
			const filteredEntries = getEntriesForMonth(entries, selectedMonth);
			setMonthlyEntries(filteredEntries);
		} else {
			setMonthlyEntries([]);
		}
	}, [entries, selectedMonth]);

	// Handler for editing an entry
	const handleEdit = async (updatedEntry: any) => {
		try {
			await updateJournal(updatedEntry.id, updatedEntry);
			await fetchEntries();
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
				await fetchEntries();
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
				await fetchEntries();
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

	const handleClearFilters = () => {
		setSelectedDate(null);
		setSelectedFolder(null);
		setSelectedTags([]);
		setSelectedMoods([]);
		setSearchTerm("");
	};

	// Filter entries based on all active filters
	const filteredEntries = entries.filter(entry => {
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
			<main className="min-h-screen bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex pt-24">
				<FilterSidebar
					entries={entries}
					selectedDate={selectedDate}
					selectedFolder={selectedFolder}
					selectedTags={selectedTags}
					selectedMoods={selectedMoods}
					onDateChange={handleDateChange}
					onFolderChange={handleFolderChange}
					onTagToggle={handleTagToggle}
					onMoodToggle={handleMoodToggle}
					onClearFilters={handleClearFilters}
					onImportComplete={fetchEntries}
				/>
				<div className="flex-1 px-4 lg:px-8 overflow-x-hidden">
				<div className="w-full max-w-4xl mx-auto">
				<div className="text-center mb-12 animate-fadeIn">
					<h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
						Yo
					</h1>
					<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
						Built with privacy
					</p>
					<div className="mt-6">
						<button
							onClick={() => setShowAISection(!showAISection)}
							className={`px-4 py-2 rounded-lg font-medium shadow-lg ${showAISection ? 'bg-purple-700 text-white' : 'bg-white/80 dark:bg-gray-800/80 text-purple-700 dark:text-purple-400'} hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-200 flex items-center gap-2 mx-auto`}
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
								<path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 001.73 10.057a.75.75 0 01-.231-1.337 60.653 60.653 0 0110.2-5.915z" />
								<path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18a1.5 1.5 0 00-.14-2.508 49.03 49.03 0 00-4.45-2.26.75.75 0 01-.435-.685c.033-1.982.166-3.952.397-5.903a.75.75 0 01.66-.664A48.448 48.448 0 0117.25 5.75a.75.75 0 01.665.665 48.497 48.497 0 01.396 5.903.75.75 0 01-.434.686c-.546.275-1.084.56-1.617.849A1.5 1.5 0 0016 13.18a49.03 49.03 0 003.342 1.68.75.75 0 01.461.71 49.384 49.384 0 00-.254 4.287.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.443.12-2.871.254-4.286a.75.75 0 01.46-.709 49.368 49.368 0 003.341-1.681A1.5 1.5 0 005 13.18a48.45 48.45 0 01-4.309-2.233.75.75 0 01-.435-.684c.033-1.982.166-3.952.397-5.903a.75.75 0 01.665-.665A48.449 48.449 0 0118 5.75a.75.75 0 01.665.665 48.449 48.449 0 01.396 5.903.75.75 0 01-.435.684 48.978 48.978 0 01-4.31 2.233 1.5 1.5 0 00-.139 2.509z" />
							</svg>
							{showAISection ? 'Hide AI Therapist' : 'Show AI Therapist'}
						</button>
					</div>
				</div>
				
				{showAISection && (
					<div className="mb-8 animate-fadeIn">
						<div className="flex flex-wrap items-center justify-between mb-4">
							<h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2">
								AI Therapist Insights
							</h2>
							
							<div className="flex items-center space-x-2">
								<label htmlFor="month-select" className="text-sm text-gray-600 dark:text-gray-300">
									Select Month:
								</label>
								<select
									id="month-select"
									value={selectedMonth}
									onChange={(e) => setSelectedMonth(e.target.value)}
									className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 dark:bg-gray-700 dark:border-gray-600"
								>
									{Object.keys(groupEntriesByMonth(entries))
										.sort((a, b) => b.localeCompare(a))
										.map((monthKey) => (
											<option key={monthKey} value={monthKey}>
												{formatMonthKey(monthKey)}
											</option>
										))
									}
								</select>
							</div>
						</div>
						
						<AITherapistSummary 
							entries={monthlyEntries} 
							month={formatMonthKey(selectedMonth).split(' ')[0]} 
							year={parseInt(selectedMonth.split('-')[0])} 
						/>
					</div>
				)}				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-all duration-300 hover:shadow-xl">
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
								onClick={() => fetchEntries()}
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
							
							{/* Quick Notes Section */}
							{(() => {
								const isSameDay = (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString();

								const quickNotes = filteredEntries.filter(entry => 
									(!entry.content || entry.content.trim() === '')
								);
								
								if (quickNotes.length > 0) {
									return (
										<div className="mb-8 pb-6 border-b border-gray-700/30">
											<div className="flex items-center gap-2 mb-4">
												<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
													<path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
													<path d="M8 11a1 1 0 100-2 1 1 0 000 2zm0 0a1 1 0 000 2m0-2a1 1 0 000-2m0 2a1 1 0 100 2m0-2v1m4-1a1 1 0 100-2 1 1 0 000 2zm0 0a1 1 0 000 2m0-2a1 1 0 000-2m0 2a1 1 0 100 2m0-2v1" />
												</svg>
												<h2 className="text-lg font-semibold text-amber-400">Quick Notes</h2>
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
															{...(!multiSelectMode ? { onClick: () => setSelectedEntry(entry) } : {})}
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
																	<MoodIcon mood={entry.mood} size="md" />
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

							<h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2 mb-4">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								Journal Entries
							</h2>
							<div className="space-y-6">
								{Object.entries(
									filteredEntries
										.filter(entry =>
											// Filter out quick notes as they're shown in their own section
											(entry.content && entry.content.trim() !== '')
										)
										.reduce((groups: { [key: string]: typeof filteredEntries }, entry) => {
											const date = new Date(entry.date);
											const today = new Date();
											const yesterday = new Date(today);
											yesterday.setDate(yesterday.getDate() - 1);
											
											let dateKey = entry.date;
											if (date.toDateString() === today.toDateString()) {
												dateKey = "Today";
											} else if (date.toDateString() === yesterday.toDateString()) {
												dateKey = "Yesterday";
											}
											
											if (!groups[dateKey]) {
												groups[dateKey] = [];
											}
											groups[dateKey].push(entry);
											return groups;
										}, {})
								)
									.sort(([dateA], [dateB]) => {
										const a = dateA === "Today" ? new Date() :
											dateA === "Yesterday" ? new Date(new Date().setDate(new Date().getDate() - 1)) :
											new Date(dateA);
										const b = dateB === "Today" ? new Date() :
											dateB === "Yesterday" ? new Date(new Date().setDate(new Date().getDate() - 1)) :
											new Date(dateB);
										return b.getTime() - a.getTime();
									})
									.map(([date, groupEntries]) => (
										<div key={date} className="space-y-4">
											<h3 className="text-sm font-medium text-gray-400/70 pl-2 border-l-2 border-gray-700/30">
												{date}
											</h3>
											<div className="grid gap-4">
												{groupEntries.map((entry) => {
										// Check if this is a quick note (no content) and if it's recent (within 24 hours)
										const isQuickNote = !entry.content || entry.content.trim() === '';
										
										// Calculate if the entry is recent (within last 24 hours)
										const entryDate = new Date(entry.date);
										const now = new Date();
										const hoursSinceCreation = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
										const isRecent = hoursSinceCreation <= 24;
										
										// Determine CSS classes for highlighting
										let entryClasses = `backdrop-blur-sm rounded-lg transition-all duration-300 border hover:border-gray-600 
										    ${multiSelectMode ? 'flex items-center gap-3' : 'cursor-pointer'}`;
										
										// Apply different styling based on entry type
										if (isQuickNote) {
											// Quick note styling - completely different visual style
											entryClasses += isRecent 
											    ? ' bg-gradient-to-br from-amber-500/80 to-orange-600/70 border-amber-400 border-dashed p-3 shadow-lg shadow-amber-700/20 transform hover:-translate-y-1'  // Recent quick note
											    : ' bg-gradient-to-br from-amber-600/40 to-orange-700/30 border-amber-500/30 border-dashed p-3 shadow hover:shadow-amber-700/10 transform hover:-translate-y-1'; // Older quick note
										} else {
											// Regular entry styling
											entryClasses += ' bg-gray-800/50 border-gray-700/50 p-4 hover:bg-gray-800/70';
										}
										
										return (
										<div
											key={entry.id}
											className={`${entryClasses} flex`}
											{...(!multiSelectMode ? { onClick: () => setSelectedEntry(entry) } : {})}
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
												<div className={`flex-1 ${isQuickNote ? 'pr-3' : ''}`}>
													{isQuickNote ? (
														<>
															{/* Quick Note Style - More like a sticky note */}
															<div className="flex items-center gap-2 mb-1">
																{/* Sticky Note Icon */}
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
														</>
													) : (
														<>
															{/* Regular Entry Style */}
															<h3 className="font-medium text-gray-100 text-lg mb-1">
																{entry.title}
															</h3>
															<div className="text-xs italic text-gray-400 mb-2 line-clamp-1">
																{entry.content ? (entry.content.length > 100 ? `${entry.content.substring(0, 100)}...` : entry.content) : ''}
															</div>
															<div className="flex items-center gap-3 text-sm text-gray-400">
																<span className="flex items-center gap-1">
																	<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
																	</svg>
																	{entry.date}
																</span>
																<span className="flex items-center gap-1">
																	<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
																	</svg>
																	{entry.folder}
																</span>
															</div>
														</>
													)}
												</div>
												{isQuickNote ? (
													<div className="ml-4 bg-amber-700/40 backdrop-blur-sm p-2 rounded-full shadow-md border border-amber-500/40 flex items-center justify-center text-xl rotate-3 transform hover:rotate-0 transition-transform">
														<MoodIcon mood={entry.mood} size="md" />
													</div>
												) : (
													<div className="ml-4 bg-gray-900/50 backdrop-blur-sm p-2 rounded-full shadow-lg border border-gray-700/50 flex items-center justify-center text-2xl">
														<MoodIcon mood={entry.mood} size="lg" />
													</div>
												)}
											</div>
											</div>
										</div>
									);
								})}
											</div>
										</div>
									))
								}
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
						</>
					)}
					

					{/* Modal for entry content */}
					{selectedEntry && (
						<JournalModal
							entry={selectedEntry}
							onClose={() => setSelectedEntry(null)}
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
		</main>
		</>
	);
};

export default HomePage;
