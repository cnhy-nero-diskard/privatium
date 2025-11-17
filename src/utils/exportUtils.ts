import { getJournals } from './supabaseClient';
import { getJournalTags } from './tagUtils';

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

/**
 * Escape CSV field - wrap in quotes if contains comma, quote, or newline
 */
function escapeCSVField(field: string): string {
  if (!field) return '';
  
  // Convert to string if not already
  const str = String(field);
  
  // Check if field needs quoting (contains comma, quote, or newline)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return str;
}

export async function exportEntriesToCSV(): Promise<string> {
  try {
    // Get all journal entries
    const response = await getJournals();
    if (response.status !== 200) {
      throw new Error('Failed to fetch journal entries');
    }

    const entries = response.data;
    
    // Load tags for each entry
    const entriesWithTags = await Promise.all(
      entries.map(async (entry) => {
        const tags = await getJournalTags(entry.id!);
        return { ...entry, tags };
      })
    );

    // CSV Headers matching import format
    const headers = ['Date', 'Title', 'Folder', 'Tag', 'Mood', 'Location', 'weather'];
    const csvLines = [headers.join(',')];

    // Convert each entry to CSV row
    for (const entry of entriesWithTags) {
      const tags = entry.tags?.map((t: { name: string }) => t.name).join(',') || '';
      
      const row = [
        escapeCSVField(entry.date),
        escapeCSVField(entry.title),
        escapeCSVField(entry.folder),
        escapeCSVField(tags), // Tags are comma-separated, will be quoted if needed
        escapeCSVField(entry.mood),
        escapeCSVField(entry.content), // Location field contains the content
        '' // weather field is empty (for compatibility)
      ];
      
      csvLines.push(row.join(','));
    }

    return csvLines.join('\n');
  } catch (error) {
    console.error('Error exporting entries to CSV:', error);
    throw new Error('Failed to export journal entries to CSV');
  }
}

export type ExportFormat = 'json' | 'csv';

export async function exportEntries(format: ExportFormat): Promise<{ data: string; mimeType: string; extension: string }> {
  if (format === 'csv') {
    return {
      data: await exportEntriesToCSV(),
      mimeType: 'text/csv',
      extension: 'csv'
    };
  } else {
    return {
      data: await exportEntriesToJson(),
      mimeType: 'application/json',
      extension: 'json'
    };
  }
}
