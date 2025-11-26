"use client";

import React, { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

interface Entry {
  id: number;
  date: string;
  title: string;
  content: string;
  folder: string;
  mood: string;
  tags?: any; // Changed to match JournalEntry type
}

interface AITherapistSummaryProps {
  entries: Entry[];
  month: string;
  year: number;
  rangeDescription?: string;
}

interface TherapistInsights {
  summary: string;
  keyPatterns: string[];
  majorStressors: string[];
  positiveShifts: string[];
  recommendations: string[];
  focusPrompt: string;
}

const AITherapistSummary: React.FC<AITherapistSummaryProps> = ({ entries, month, year, rangeDescription }) => {
  const [insights, setInsights] = useState<TherapistInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (entries.length === 0) {
      setError("No entries available for the selected range.");
      setInsights(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare the entries data in a format suitable for the AI
      const entriesForAI = entries.map(entry => ({
        date: entry.date,
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags?.map((tag: { name: string }) => tag.name)
      }));

      // Call the API endpoint we'll create
      const response = await fetch('/api/ai-therapist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entries: entriesForAI,
          month,
          year,
          rangeDescription: rangeDescription || `${month} ${year}`
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      if (!data.insights) {
        throw new Error("AI response missing insights data.");
      }

      setInsights(data.insights as TherapistInsights);
    } catch (err) {
      console.error("Error generating AI summary:", err);
      setError("Failed to generate summary. Please try again later.");
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <BrainCircuit className="mr-2 text-purple-500" />
          AI Therapist Summary
        </h2>
        <button
          onClick={generateSummary}
          disabled={loading || entries.length === 0}
          className={`px-4 py-2 rounded-lg flex items-center ${
            loading || entries.length === 0
              ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Analyzing...
            </>
          ) : (
            "Generate Insights"
          )}
        </button>
      </div>

      {error && (
        <div className="text-red-500 mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
          {error}
        </div>
      )}

      {!insights && !error && !loading && (
        <div className="text-gray-500 dark:text-gray-400 italic">
          Click "Generate Insights" to get a therapist's perspective on your journal entries for {rangeDescription || `${month} ${year}`}.
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="animate-spin h-8 w-8 text-purple-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            Analyzing your entries and generating therapeutic insights...
          </p>
        </div>
      )}

      {insights && (
        <div className="mt-6 space-y-6">
          <section className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">Overview</h3>
            <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{insights.summary}</p>
          </section>

          {insights.keyPatterns.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Key Emotional Patterns</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-200">
                {insights.keyPatterns.map((pattern, idx) => (
                  <li key={`pattern-${idx}`}>{pattern}</li>
                ))}
              </ul>
            </section>
          )}

          {insights.majorStressors.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Current Stressors</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-200">
                {insights.majorStressors.map((stressor, idx) => (
                  <li key={`stressor-${idx}`}>{stressor}</li>
                ))}
              </ul>
            </section>
          )}

          {insights.positiveShifts.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Positive Shifts</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-200">
                {insights.positiveShifts.map((shift, idx) => (
                  <li key={`positive-${idx}`}>{shift}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Therapist Recommendations</h3>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-200">
              {insights.recommendations.map((suggestion, idx) => (
                <li key={`recommendation-${idx}`}>{suggestion}</li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">Reflection Prompt</h3>
            <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{insights.focusPrompt}</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default AITherapistSummary;