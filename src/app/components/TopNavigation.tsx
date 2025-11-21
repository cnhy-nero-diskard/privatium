"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import QuickNoteModal from "./QuickNoteModal";

const TopNavigation = () => {
  const [mounted, setMounted] = useState(false);
  const [quickNoteModalOpen, setQuickNoteModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // ...existing code...

  return (
    <>
      {/* Top bar with app name and theme toggle */}
      <div className="fixed top-0 left-0 w-full z-50">
        <nav className="bg-gradient-to-r from-blue-100/80 via-purple-100/80 to-pink-100/80 dark:from-blue-900/90 dark:via-purple-900/90 dark:to-pink-900/90 backdrop-blur-md shadow-md py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <span className="font-bold text-xl text-gray-800 dark:text-white mr-1">
                    Privatium
                  </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-2xl">
                    Journal
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                {/* Theme toggle */}
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Toggle theme"
                >
                  {mounted && (
                    theme === "dark" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
        <Link href="/" className="flex items-center px-4 py-2 rounded-full shadow-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="font-semibold">Home</span>
        </Link>
        
        <Link href="/admin/database" className="flex items-center px-4 py-2 rounded-full shadow-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white hover:bg-green-100 dark:hover:bg-green-900 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <span className="font-semibold">Database</span>
        </Link>
        
        {/* Quick Note Button */}
        <button 
          onClick={() => setQuickNoteModalOpen(true)}
          className="flex items-center px-4 py-2 rounded-full shadow-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="font-semibold">Quick Note</span>
        </button>
        
        <Link href="/entryformui" className="flex items-center px-4 py-2 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-semibold">New Entry</span>
        </Link>
        
        {/* Quick Note Modal */}
        <QuickNoteModal 
          isOpen={quickNoteModalOpen} 
          onClose={() => setQuickNoteModalOpen(false)} 
          onNoteAdded={() => {
            // You can implement refresh logic here if needed
            window.location.reload(); // Simple refresh for now
          }}
        />
      </div>
    </>
  );
};

export default TopNavigation;
