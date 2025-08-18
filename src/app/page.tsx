"use client";
import React, { useState, useEffect } from "react";
import JournalModal from "./components/JournalModal";
import Link from "next/link";
import { getJournals } from "@/utils/supabaseClient";

import { updateJournal, deleteJournal } from "@/utils/supabaseClient";

const HomePage: React.FC = () => {
	const [entries, setEntries] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

	const fetchEntries = async () => {
		try {
			const data = await getJournals();
			setEntries(data || []);
		} catch (error) {
			console.error('Error fetching entries:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchEntries();
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

	// Handler for deleting an entry
	const handleDelete = async (entryId: string) => {
		try {
			await deleteJournal(Number(entryId));
			await fetchEntries();
			setSelectedEntry(null);
		} catch (error) {
			console.error('Error deleting entry:', error);
			alert('Failed to delete entry.');
		}
	};

	return (
		<main className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center py-10 px-4">
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
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
						<div className="flex-1">
							<h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
								Your Journal Entries
							</h2>
							<div className="flex gap-4">
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
							</div>
						</div>
						<Link href="/components/entryformui">
							<button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
								</svg>
								New Entry
							</button>
						</Link>
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
					<div className="grid gap-4">
						{entries
							.filter(entry => 
								(!searchTerm || entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
								entry.content?.toLowerCase().includes(searchTerm.toLowerCase())) &&
								(!selectedFolder || entry.folder === selectedFolder)
							)
							.map((entry) => (
								<div
									key={entry.id}
									className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 cursor-pointer hover:bg-gray-800/70 transition-all duration-300 border border-gray-700/50 hover:border-gray-600"
									onClick={() => setSelectedEntry(entry)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<h3 className="font-medium text-gray-100 text-lg mb-1">
												{entry.title}
											</h3>
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
										</div>
										<span className="text-2xl ml-4 bg-gray-900/50 backdrop-blur-sm p-2 rounded-full shadow-lg border border-gray-700/50">
											{entry.mood}
										</span>
									</div>
								</div>
							))}
					</div>
				)}
				
				{/* Modal for entry content */}
				{selectedEntry && (
					<JournalModal
						entry={selectedEntry}
						onClose={() => setSelectedEntry(null)}
						onEdit={handleEdit}
						onDelete={handleDelete}
					/>
				)}
			</div>
			</div>
		</main>
	);
};

export default HomePage;
