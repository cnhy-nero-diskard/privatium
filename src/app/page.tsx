"use client";

import React, { useState } from "react";
import Link from "next/link";

// Dummy data for previous entries (replace with real data source later)
const dummyEntries = [
	{
		id: 1,
		date: "2025-07-14",
		title: "A Productive Day",
		folder: "Work",
		mood: "😊",
	},
	{
		id: 2,
		date: "2025-07-13",
		title: "Sunday Reflections",
		folder: "Personal",
		mood: "😄",
	},
];

const HomePage: React.FC = () => {
	const [entries] = useState(dummyEntries);

	return (
		<main className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center py-10 px-2">
			<h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
				My Journal
			</h1>
			<div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
						Previous Entries
					</h2>
					<Link href="/components/entryformui">
						<button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
							+ New Entry
						</button>
					</Link>
				</div>
				{entries.length === 0 ? (
					<p className="text-gray-500 dark:text-gray-400 italic">
						No entries yet. Start by adding a new entry!
					</p>
				) : (
					<ul className="divide-y divide-gray-200 dark:divide-gray-700">
						{entries.map((entry) => (
							<li
								key={entry.id}
								className="py-4 flex items-center justify-between"
							>
								<div>
									<div className="font-medium text-gray-800 dark:text-gray-100">
										{entry.title}
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400">
										{entry.date} | {entry.folder}
									</div>
								</div>
								<span className="text-2xl ml-4">{entry.mood}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</main>
	);
};

export default HomePage;
