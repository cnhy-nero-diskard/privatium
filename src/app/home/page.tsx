"use client";
import React, { useState, useEffect } from "react";
import JournalModal from "../components/JournalModal";
import Link from "next/link";
import TopNavigation from "../components/TopNavigation";
import { getJournals, updateJournal, deleteJournal } from "@/utils/supabaseClient";
import { getJournalTags } from "@/utils/tagUtils";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { MoodIcon } from "../components/MoodIcon";

import { Tag } from '@/types/tags';

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

	const [error, setError] = useState<string | null>(null);

	const fetchEntries = async () => {
		setError(null);
		setLoading(true);
		try {
			const data = await getJournals();
			
			// Check for decryption errors
			const hasDecryptionErrors = data.some(entry => entry._decryptError);
			if (hasDecryptionErrors) {
				setError('Some entries could not be decrypted properly. They will be shown with placeholder content.');
			}
			
			// Load tags for each entry
			const entriesWithTags = await Promise.all(
				data.map(async (entry) => {
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
		
		// Set up refresh interval to check for new notes (optional)
		const refreshInterval = setInterval(() => {
			fetchEntries();
		}, 60000); // Refresh every minute
		
		return () => clearInterval(refreshInterval);
	}, []);

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

	return (
		<>
			<TopNavigation />
			<main className="min-h-screen bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center pt-24 px-4">
				<div className="w-full max-w-4xl">
					<div className="text-center mb-12 animate-fadeIn">
						<h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
							Welcome to Your Digital Journal
						</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
							A safe space to capture your thoughts, memories, and reflections.
						</p>
					</div>

				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-all duration-300 hover:shadow-xl">
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
								<select
									value={selectedFolder || ""}
									onChange={(e) => setSelectedFolder(e.target.value || null)}
									className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
								>
									<option value="">All Folders</option>
									{Array.from(new Set(entries.map(entry => entry.folder))).map(folder => (
										<option key={folder} value={folder}>{folder}</option>
									))}
								</select>
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
												const filtered = entries
													.filter(entry =>
														(!searchTerm || entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
															entry.content?.toLowerCase().includes(searchTerm.toLowerCase())) &&
														(!selectedFolder || entry.folder === selectedFolder)
													);
												selectAllVisible(filtered);
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
							<div className="space-y-6">
								{Object.entries(
									entries
										.filter(entry =>
											(!searchTerm || entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
												entry.content?.toLowerCase().includes(searchTerm.toLowerCase())) &&
											(!selectedFolder || entry.folder === selectedFolder)
										)
										.reduce((groups: { [key: string]: typeof entries }, entry) => {
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
											// Quick note styling
											entryClasses += isRecent 
											    ? ' bg-gradient-to-r from-purple-700/60 to-blue-700/60 border-purple-500/50 p-3'  // Recent note (highlighted)
											    : ' bg-gray-800/30 border-gray-700/30 p-3'; // Older note (greyed out)
										} else {
											// Regular entry styling
											entryClasses += ' bg-gray-800/50 border-gray-700/50 p-4 hover:bg-gray-800/70';
										}
										
										return (
										<div
											key={entry.id}
											className={entryClasses}
											{...(!multiSelectMode ? { onClick: () => setSelectedEntry(entry) } : {})}
										>
											{multiSelectMode && (
												<input
													type="checkbox"
													checked={selectedIds.includes(entry.id)}
													onChange={() => toggleSelectEntry(entry.id)}
													className="form-checkbox h-5 w-5 text-blue-600"
													aria-label={`Select entry ${entry.title}`}
												/>
											)}
											<div className="flex items-start justify-between w-full">
												<div className={`flex-1 ${isQuickNote ? 'pr-3' : ''}`}>
													<h3 className={`font-medium text-gray-100 ${isQuickNote ? 'text-base' : 'text-lg'} mb-1`}>
														{entry.title}
														{isQuickNote && isRecent && (
															<span className="ml-2 text-xs px-2 py-0.5 bg-purple-500/70 rounded-full text-white">New</span>
														)}
													</h3>
													{!isQuickNote && (
														<div className="text-xs italic text-gray-400 mb-2 line-clamp-1">
															{entry.content ? (entry.content.length > 100 ? `${entry.content.substring(0, 100)}...` : entry.content) : ''}
														</div>
													)}
													<div className="flex items-center gap-3 text-sm text-gray-400">
														<span className="flex items-center gap-1">
															<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
															</svg>
															{entry.date}
														</span>
														<span className="flex items-center gap-1">
															<svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isQuickNote ? 'text-indigo-400' : 'text-purple-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
															</svg>
															{entry.folder}
														</span>
													</div>
												</div>
												<div className={`ml-4 bg-gray-900/50 backdrop-blur-sm p-2 rounded-full shadow-lg border border-gray-700/50 flex items-center justify-center ${isQuickNote ? 'text-xl' : 'text-2xl'}`}>
													<MoodIcon mood={entry.mood} size={isQuickNote ? "md" : "lg"} />
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
		</main>
		</>
	);
};

export default HomePage;
