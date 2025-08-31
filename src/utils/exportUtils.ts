import { getJournals } from './supabaseClient';

export async function exportEntriesToJson(): Promise<string> {
  try {
    // Get all journal entries
    const response = await getJournals();
    if (response.status === 200) {
      // Create a JSON string with formatting for readability
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        entries: response.data
      }, null, 2);
    }
    throw new Error('Failed to fetch journal entries');
  } catch (error) {
    console.error('Error exporting entries:', error);
    throw new Error('Failed to export journal entries');
  }
}
