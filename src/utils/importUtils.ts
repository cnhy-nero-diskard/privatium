import { getSupabaseClient } from './supabaseClient';
import { createJournal, getJournals } from './supabaseClient';
import { createTag, addTagToJournal, getJournalTags } from './tagUtils';

interface CSVEntry {
  Date: string;
  Title: string;
  Folder: string;
  Tag: string;
  Mood: string;
  Location: string;
  weather?: string; // Optional, will be ignored
}

interface ParsedEntry {
  date: string;
  title: string;
  content: string;
  folder: string;
  mood: string;
  tags: string[];
}

interface DuplicateEntry extends ParsedEntry {
  existingId: number;
  existingDate: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: DuplicateEntry[];
  errors: string[];
}

/**
 * Parse a single CSV line respecting quotes and escaped characters
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quote (double quote)
      if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
        currentValue += '"';
        i += 2; // Skip both quotes
        continue;
      }
      // Toggle quote state
      insideQuotes = !insideQuotes;
      i++;
    } else if (char === ',' && !insideQuotes) {
      // End of field
      values.push(currentValue);
      currentValue = '';
      i++;
    } else {
      currentValue += char;
      i++;
    }
  }
  
  // Push the last value
  values.push(currentValue);
  
  return values;
}

/**
 * Parse CSV content and convert to journal entries
 */
export function parseCSV(csvContent: string): ParsedEntry[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  
  // Validate required headers
  const requiredHeaders = ['Date', 'Title', 'Folder', 'Tag', 'Mood'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const entries: ParsedEntry[] = [];

  // Parse each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Parse CSV line properly handling quotes
      const values = parseCSVLine(line);

      // Map values to headers
      const entry: any = {};
      headers.forEach((header, index) => {
        entry[header] = values[index] ? values[index].trim() : '';
      });

      // Parse tags - they are comma-separated in the Tag column
      const tags = entry.Tag 
        ? entry.Tag.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : [];

      // Convert to ParsedEntry format
      // Use Location as content if available
      entries.push({
        date: formatDate(entry.Date),
        title: entry.Title || 'Untitled',
        content: entry.Location || '', // Using Location as the content/body
        folder: entry.Folder || 'General',
        mood: normalizeMood(entry.Mood),
        tags,
      });
    } catch (error) {
      console.error(`Error parsing line ${i + 1}:`, error);
      // Skip malformed lines
    }
  }

  return entries;
}

/**
 * Format date to YYYY-MM-DD format
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Normalize mood values to match the app's mood system
 */
function normalizeMood(mood: string): string {
  if (!mood) return 'neutral';
  
  const moodLower = mood.toLowerCase().trim();
  
  // Map common mood variations to app moods
  const moodMap: { [key: string]: string } = {
    'happy': 'happy',
    'joy': 'happy',
    'joyful': 'happy',
    'excited': 'happy',
    'sad': 'sad',
    'unhappy': 'sad',
    'depressed': 'sad',
    'down': 'sad',
    'angry': 'angry',
    'mad': 'angry',
    'frustrated': 'angry',
    'anxious': 'anxious',
    'worried': 'anxious',
    'nervous': 'anxious',
    'calm': 'calm',
    'peaceful': 'calm',
    'relaxed': 'calm',
    'neutral': 'neutral',
    'ok': 'neutral',
    'okay': 'neutral',
    'fine': 'neutral',
  };

  return moodMap[moodLower] || 'neutral';
}

/**
 * Check for duplicate entries in the database
 */
export async function checkDuplicates(entries: ParsedEntry[]): Promise<{
  newEntries: ParsedEntry[];
  duplicates: DuplicateEntry[];
}> {
  const response = await getJournals();
  const existingEntries = response.data || [];

  const newEntries: ParsedEntry[] = [];
  const duplicates: DuplicateEntry[] = [];

  for (const entry of entries) {
    // Check if entry with same date and title exists
    const duplicate = existingEntries.find(
      existing => 
        existing.date === entry.date && 
        existing.title.toLowerCase() === entry.title.toLowerCase()
    );

    if (duplicate) {
      duplicates.push({
        ...entry,
        existingId: duplicate.id!,
        existingDate: duplicate.date,
      });
    } else {
      newEntries.push(entry);
    }
  }

  return { newEntries, duplicates };
}

/**
 * Import entries to the database
 */
export async function importEntries(
  entries: ParsedEntry[],
  overwriteDuplicates: boolean = false
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    duplicates: [],
    errors: [],
  };

  try {
    // Check for duplicates
    const { newEntries, duplicates } = await checkDuplicates(entries);

    // If there are duplicates and user hasn't decided, return them
    if (duplicates.length > 0 && !overwriteDuplicates) {
      result.duplicates = duplicates;
      return result;
    }

    // Import new entries
    for (const entry of newEntries) {
      try {
        const journalEntry = await createJournal({
          date: entry.date,
          title: entry.title,
          content: entry.content,
          folder: entry.folder,
          mood: entry.mood,
        });

        // Add tags
        if (entry.tags && entry.tags.length > 0 && journalEntry && journalEntry.id) {
          for (const tagName of entry.tags) {
            try {
              // Create or get tag
              const tag = await createTag(tagName);
              if (tag && tag.id) {
                await addTagToJournal(journalEntry.id, tag.id);
              }
            } catch (error) {
              console.error(`Error adding tag "${tagName}":`, error);
            }
          }
        }

        result.imported++;
      } catch (error) {
        console.error('Error importing entry:', error);
        result.errors.push(`Failed to import "${entry.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Overwrite duplicates if requested
    if (overwriteDuplicates && duplicates.length > 0) {
      const supabase = getSupabaseClient();
      
      for (const dup of duplicates) {
        try {
          // Update the existing entry
          const { error } = await supabase
            .from('journals')
            .update({
              title: dup.title,
              content: dup.content,
              folder: dup.folder,
              mood: dup.mood,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dup.existingId);

          if (error) throw error;

          // Update tags
          if (dup.tags && dup.tags.length > 0) {
            // Remove existing tags
            await supabase
              .from('journal_tags')
              .delete()
              .eq('journal_id', dup.existingId);

            // Add new tags
            for (const tagName of dup.tags) {
              try {
                const tag = await createTag(tagName);
                if (tag && tag.id) {
                  await addTagToJournal(dup.existingId, tag.id);
                }
              } catch (error) {
                console.error(`Error adding tag "${tagName}":`, error);
              }
            }
          }

          result.imported++;
        } catch (error) {
          console.error('Error overwriting entry:', error);
          result.errors.push(`Failed to overwrite "${dup.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
  }

  return result;
}
