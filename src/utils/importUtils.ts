import { getSupabaseClient } from './supabaseClient';
import { createJournal, getJournals, updateJournal } from './supabaseClient';
import { createTag, addTagToJournal, getJournalTags, getTags } from './tagUtils';
import { getFolders, createFolder } from './folderUtils';
import type { Tag } from '../types/tags';

interface CSVEntry {
  Date: string;
  Title: string;
  Folder: string;
  Tag: string;
  Mood: string;
  Text?: string; // Optional content/body (primary)
  Content?: string; // Optional content/body (fallback)
  Weather?: string; // Optional, will be ignored
  Location?: string; // Optional, will be ignored
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
 * Robust CSV parser that handles newlines within quoted fields
 * Parses the entire CSV content at once, respecting quoted fields with newlines
 */
function parseCSVContent(csvContent: string): string[][] {
  const rows: string[][] = [];
  const chars = csvContent.split('');
  let currentValue = '';
  let currentRow: string[] = [];
  let insideQuotes = false;
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const nextChar = i + 1 < chars.length ? chars[i + 1] : null;
    
    if (char === '"') {
      // Check for escaped quote (double quote "")
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentRow.push(currentValue);
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // End of row (handle both \n and \r\n)
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
      // Only add row if it has content
      if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue);
        if (currentRow.some(val => val.trim())) { // Only add non-empty rows
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = '';
      }
    } else {
      // Regular character (including newlines inside quotes)
      currentValue += char;
    }
  }
  
  // Don't forget the last field and row
  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (currentRow.some(val => val.trim())) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

/**
 * Parse CSV content and convert to journal entries
 */
export function parseCSV(csvContent: string): ParsedEntry[] {
  if (!csvContent || !csvContent.trim()) {
    throw new Error('CSV file is empty');
  }

  // Parse all rows at once, handling newlines within quoted fields
  const rows = parseCSVContent(csvContent);
  
  if (rows.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse headers (first row)
  const headers = rows[0].map(h => h.trim());
  
  // Validate required headers
  const requiredHeaders = ['Date', 'Title', 'Folder', 'Tag', 'Mood'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const entries: ParsedEntry[] = [];

  // Parse data rows (skip header row)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      // Map values to headers
      const entry: any = {};
      headers.forEach((header, index) => {
        // Get value, trim it, and handle undefined
        entry[header] = (row[index] !== undefined ? row[index].trim() : '');
      });

      // Skip completely empty rows
      if (!entry.Date && !entry.Title && !entry.Folder) {
        continue;
      }

      // Parse tags - they are comma-separated in the Tag column
      const tags = entry.Tag 
        ? entry.Tag.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : [];

      // Convert to ParsedEntry format
      // Support both 'Text' and 'Content' column names, and ignore Location/Weather
      entries.push({
        date: formatDate(entry.Date),
        title: entry.Title || 'Untitled',
        content: entry.Text || entry.Content || '', // Use Text first, fallback to Content
        folder: entry.Folder || 'General',
        mood: normalizeMood(entry.Mood),
        tags,
      });
    } catch (error) {
      console.error(`Error parsing row ${i + 1}:`, error);
      // Skip malformed rows but continue processing
    }
  }

  return entries;
}

/**
 * Format date to YYYY-MM-DD format
 * Handles various date formats including "8 JUNE 2025, 09:00 PM"
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  try {
    // Clean up the date string
    let cleanedDate = dateStr.trim();
    
    // Handle formats like "8 JUNE 2025, 09:00 PM" or "19 NOVEMBER 2024, 08:03 AM"
    // Remove the comma and time portion if present
    if (cleanedDate.includes(',')) {
      const parts = cleanedDate.split(',');
      cleanedDate = parts[0].trim(); // Take only the date part before comma
    }
    
    // Try to parse the date
    const date = new Date(cleanedDate);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: "${dateStr}", using current date`);
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`Error parsing date: "${dateStr}", using current date`);
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
 * Get or create a folder by name (case-insensitive deduplication)
 * Returns the folder name that was found or created
 */
async function ensureFolderExists(folderName: string): Promise<string> {
  try {
    const folders = await getFolders();
    
    // Check if folder exists (case-insensitive)
    const existingFolder = folders.find(
      f => f.name.toLowerCase() === folderName.toLowerCase()
    );
    
    if (existingFolder) {
      // Return the existing folder's name (preserves casing)
      return existingFolder.name;
    }
    
    // Create the folder with a default color
    const newFolder = await createFolder(folderName, '#888888');
    return newFolder.name;
  } catch (error) {
    console.error(`Error ensuring folder "${folderName}" exists:`, error);
    // Return the original name even if creation fails
    return folderName;
  }
}

/**
 * Get or create a tag by name (case-insensitive deduplication)
 * Returns the tag object
 */
async function getOrCreateTag(tagName: string, existingTags: Tag[]): Promise<Tag | null> {
  try {
    // Check if tag exists (case-insensitive)
    const existingTag = existingTags.find(
      t => t.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (existingTag) {
      return existingTag;
    }
    
    // Create new tag
    const newTag = await createTag(tagName);
    // Add to cache for subsequent lookups in the same import batch
    existingTags.push(newTag);
    return newTag;
  } catch (error) {
    console.error(`Error creating tag "${tagName}":`, error);
    return null;
  }
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

    // Pre-load existing tags for deduplication
    const existingTags = await getTags();

    // Import new entries
    for (const entry of newEntries) {
      try {
        // Ensure folder exists in folders table
        const folderName = await ensureFolderExists(entry.folder);
        
        // Set created_at to match the journal date so imported entries have correct timestamps
        const journalEntry = await createJournal({
          date: entry.date,
          title: entry.title,
          content: entry.content,
          folder: folderName,
          mood: entry.mood,
          created_at: new Date(entry.date).toISOString(),
        });

        // Add tags with deduplication
        if (entry.tags && entry.tags.length > 0 && journalEntry && journalEntry.id) {
          for (const tagName of entry.tags) {
            try {
              // Get or create tag (with deduplication)
              const tag = await getOrCreateTag(tagName, existingTags);
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
          // Ensure folder exists in folders table
          const folderName = await ensureFolderExists(dup.folder);
          
          // Update the existing entry using updateJournal to ensure proper encryption
          // Set updated_at to match the journal date for consistency
          await updateJournal(dup.existingId, {
            title: dup.title,
            content: dup.content,
            folder: folderName,
            mood: dup.mood,
            updated_at: new Date(dup.date).toISOString(),
          });

          // Update tags with deduplication
          if (dup.tags && dup.tags.length > 0) {
            // Remove existing tags
            await supabase
              .from('journal_tags')
              .delete()
              .eq('journal_id', dup.existingId);

            // Add new tags (with deduplication)
            for (const tagName of dup.tags) {
              try {
                const tag = await getOrCreateTag(tagName, existingTags);
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
