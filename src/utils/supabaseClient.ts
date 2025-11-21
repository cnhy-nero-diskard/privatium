import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt, isEncryptedData, type EncryptedData } from './encryption';
import { encodeMoodForDb, decodeMoodFromDb } from './moodUtils';

interface Tag {
  id?: number;
  name: string;
  created_at?: string;
}

interface JournalEntry {
  id?: number;
  date: string;
  title: string;
  content: string;
  folder: string;
  mood: string;
  created_at?: string;
  updated_at?: string;
  tags?: Tag[];
}

interface EncryptedJournalEntry extends Omit<JournalEntry, 'title' | 'content' | 'mood' | 'folder'> {
  title: string; // JSON stringified EncryptedData
  content: string; // JSON stringified EncryptedData  
  mood: string; // JSON stringified EncryptedData or plain string
  folder: string; // JSON stringified EncryptedData
}

function getEncryptionKey(): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing encryption key');
  }
  return key;
}

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials or URL');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function encryptJournalData(journal: JournalEntry): Promise<EncryptedJournalEntry> {
  const key = getEncryptionKey();
  const [encryptedTitle, encryptedContent, encryptedMood, encryptedFolder] = await Promise.all([
    encrypt(journal.title, key),
    encrypt(journal.content, key),
    encodeMoodForDb(journal.mood, key),
    encrypt(journal.folder, key)
  ]);
  
  // Ensure all data is properly serialized for database storage
  return {
    ...journal,
    title: JSON.stringify(encryptedTitle),
    content: JSON.stringify(encryptedContent),
    mood: typeof encryptedMood === 'object' ? JSON.stringify(encryptedMood) : encryptedMood,
    folder: JSON.stringify(encryptedFolder)
  };
}

async function decryptJournalData(journal: EncryptedJournalEntry): Promise<JournalEntry> {
  const key = getEncryptionKey();
  
  // Helper function to parse and decrypt data
  const decryptField = async (field: string): Promise<string> => {
    if (!field) return '';
    
    try {
      // Try to parse the string as JSON (new format)
      const parsed = JSON.parse(field);
      if (isEncryptedData(parsed)) {
        return await decrypt(parsed, key);
      }
      // If it's not encrypted data but valid JSON, return as is
      return field;
    } catch {
      // If parsing fails, it might be plain text (legacy)
      return field;
    }
  };

  const [title, content, mood, folder] = await Promise.all([
    decryptField(journal.title),
    decryptField(journal.content),
    decodeMoodFromDb(journal.mood, key),
    decryptField(journal.folder)
  ]);
  
  return {
    ...journal,
    title,
    content,
    mood: mood || '',
    folder
  };
}

// Cache for etags and data
let lastEtag: string | null = null;
let lastData: JournalEntry[] | null = null;

/**
 * Get journals with pagination support for lazy loading
 * @param options - Options for fetching journals
 * @param options.currentEtag - Current etag for cache validation
 * @param options.limit - Number of entries to fetch (for pagination)
 * @param options.offset - Offset for pagination
 * @returns Paginated journal entries with metadata
 */
export async function getJournals(options?: { currentEtag?: string; limit?: number; offset?: number }) {
  const { currentEtag, limit, offset } = options || {};
  
  try {
    const supabase = getSupabaseClient();
    
    // First, get the latest update timestamp from the journals table
    const { data: latestUpdate, error: timestampError } = await supabase
      .from('journals')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (timestampError) {
      console.error('Error getting latest update:', timestampError);
      throw new Error(`Failed to check for updates: ${timestampError.message}`);
    }
    
    // Generate new etag based on the latest update timestamp
    const newEtag = latestUpdate?.updated_at || 'initial';
    
    // If the current etag matches the new one, return 304 (no change)
    // Only use cache if no pagination parameters are provided
    if (currentEtag && currentEtag === newEtag && lastData && !limit && !offset) {
      return { status: 304, data: lastData };
    }
    
    // Get total count for pagination
    const { count } = await supabase
      .from('journals')
      .select('*', { count: 'exact', head: true });
    
    // If data has changed or we don't have cached data, fetch it
    let query = supabase
      .from('journals')
      .select('*')
      .order('date', { ascending: false });
    
    // Apply pagination if limit is provided
    if (limit !== undefined) {
      const startRange = offset || 0;
      const endRange = startRange + limit - 1;
      query = query.range(startRange, endRange);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Supabase query error:', JSON.stringify(error, null, 2));
      throw new Error(`Database query failed: ${error.message || 'Unknown error occurred'}`);
    }
    
    if (!data) {
      console.error('No data returned from Supabase');
      throw new Error('No data received from the database');
    }
    
    try {
      // Decrypt all journals in parallel
      const decryptedJournals = await Promise.all(
        data.map(async (journal) => {
          try {
            return await decryptJournalData(journal as EncryptedJournalEntry);
          } catch (decryptError) {
            console.error(`Failed to decrypt journal ${journal.id}:`, decryptError);
            // Return a sanitized version of the entry with error indicators
            return {
              ...journal,
              title: '[Encryption Error] Unable to decrypt title',
              content: '[Encryption Error] Unable to decrypt content',
              mood: '',
              _decryptError: true
            };
          }
        })
      );
      
      // If any journals had decryption errors, log it but don't fail completely
      const hasDecryptionErrors = decryptedJournals.some(j => j._decryptError);
      if (hasDecryptionErrors) {
        console.warn('Some journals could not be decrypted properly');
      }
      
      // Update the cache only if fetching all data
      if (!limit && !offset) {
        lastEtag = newEtag;
        lastData = decryptedJournals;
      }
      
      return { 
        status: 200, 
        data: decryptedJournals,
        etag: newEtag,
        totalCount: count || 0,
        hasMore: limit ? (offset || 0) + limit < (count || 0) : false
      };
    } catch (decryptError) {
      console.error('Failed to decrypt journals:', JSON.stringify(decryptError, null, 2));
      throw new Error('Failed to decrypt journal entries. Your encryption key might be invalid.');
    }
  } catch (error) {
    // Check if it's our custom error first
    if (error instanceof Error) {
      throw error; // Re-throw our custom errors
    }
    // For unexpected errors, provide a generic message
    console.error('Unexpected error in getJournals:', JSON.stringify(error, null, 2));
    throw new Error('An unexpected error occurred while fetching your journals. Please try again later.');
  }
}

/**
 * Search journals across all entries (bypasses pagination)
 * This ensures search works across the entire dataset
 * @param searchTerm - Text to search for in title and content
 * @param filters - Optional filters (folder, tags, moods, date)
 * @returns All matching journal entries
 */
export async function searchJournals(
  searchTerm: string,
  filters?: {
    folder?: string | null;
    tags?: string[];
    moods?: string[];
    date?: string | null;
  }
) {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch all journals (no pagination for search)
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.error('Supabase search error:', JSON.stringify(error, null, 2));
      throw new Error(`Search failed: ${error.message || 'Unknown error occurred'}`);
    }
    
    if (!data) {
      return { status: 200, data: [] };
    }
    
    // Decrypt all journals
    const decryptedJournals = await Promise.all(
      data.map(async (journal) => {
        try {
          return await decryptJournalData(journal as EncryptedJournalEntry);
        } catch (decryptError) {
          console.error(`Failed to decrypt journal ${journal.id}:`, decryptError);
          return null;
        }
      })
    );
    
    // Filter out failed decryptions and apply search/filters
    const validJournals = decryptedJournals.filter((j): j is JournalEntry => j !== null);
    
    // Apply search term filter (case-insensitive)
    let results = validJournals;
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(entry => 
        entry.title.toLowerCase().includes(lowerSearchTerm) ||
        (entry.content && entry.content.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Apply additional filters if provided
    if (filters?.folder) {
      results = results.filter(entry => entry.folder === filters.folder);
    }
    
    if (filters?.date) {
      results = results.filter(entry => entry.date === filters.date);
    }
    
    if (filters?.moods && filters.moods.length > 0) {
      results = results.filter(entry => filters.moods!.includes(entry.mood));
    }
    
    // Note: Tag filtering would need to be done after loading tags for each entry
    // This is handled in the component layer
    
    return {
      status: 200,
      data: results
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    console.error('Unexpected error in searchJournals:', JSON.stringify(error, null, 2));
    throw new Error('An unexpected error occurred while searching. Please try again.');
  }
}

export async function getJournalById(id: number) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data ? await decryptJournalData(data as EncryptedJournalEntry) : null;
}

export async function createJournal(journal: JournalEntry) {
  console.log('Creating journal with mood:', journal.mood);
  const supabase = getSupabaseClient();
  
  try {
    const encryptedJournal = await encryptJournalData(journal);
    console.log('Encrypted journal mood:', typeof encryptedJournal.mood, encryptedJournal.mood);
    
    // If created_at is provided (e.g., from CSV import), use it; otherwise let DB default to now()
    const insertData: any = { ...encryptedJournal };
    if (journal.created_at) {
      insertData.created_at = journal.created_at;
      insertData.updated_at = journal.created_at; // Set updated_at to same as created_at for imports
    }
    
    const { data, error } = await supabase
      .from('journals')
      .insert([insertData])
      .select();
      
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    return data[0] ? await decryptJournalData(data[0] as EncryptedJournalEntry) : null;
  } catch (encryptionError) {
    console.error('Encryption error:', encryptionError);
    throw encryptionError;
  }
}

export async function updateJournal(id: number, journal: Partial<JournalEntry>) {
  console.log('Updating journal with mood:', journal.mood);
  const supabase = getSupabaseClient();
  
  // If updating title, content, mood, or folder, encrypt them
  const updates: Partial<EncryptedJournalEntry> = { ...journal };
  const key = getEncryptionKey();
  
  const encryptionPromises: Promise<void>[] = [];
  
  if (journal.title) {
    encryptionPromises.push(
      encrypt(journal.title, key).then(encrypted => {
        updates.title = JSON.stringify(encrypted);
      })
    );
  }
  if (journal.content) {
    encryptionPromises.push(
      encrypt(journal.content, key).then(encrypted => {
        updates.content = JSON.stringify(encrypted);
      })
    );
  }
  if (journal.mood !== undefined) {
    encryptionPromises.push(
      encodeMoodForDb(journal.mood, key).then(encrypted => {
        updates.mood = typeof encrypted === 'object' ? JSON.stringify(encrypted) : encrypted;
      })
    );
  }
  if (journal.folder) {
    encryptionPromises.push(
      encrypt(journal.folder, key).then(encrypted => {
        updates.folder = JSON.stringify(encrypted);
      })
    );
  }
  
  // Wait for all encryption operations to complete
  await Promise.all(encryptionPromises);
  
  const { data, error } = await supabase
    .from('journals')
    .update(updates)
    .eq('id', id)
    .select();
    
  if (error) {
    console.error('Supabase update error:', error);
    throw error;
  }
  return data[0] ? await decryptJournalData(data[0] as EncryptedJournalEntry) : null;
}

export async function deleteJournal(id: number) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}

// ===========================
// Generic CRUD Operations for Database Admin
// ===========================

type TableName = 'journals' | 'folders' | 'tags' | 'journal_tags';

/**
 * Get all records from a table
 */
export async function getAllRecords(tableName: TableName): Promise<any[]> {
  const supabase = getSupabaseClient();
  
  // For journal_tags, order by composite key instead of 'id'
  let query = supabase.from(tableName).select('*');
  
  if (tableName === 'journal_tags') {
    query = query.order('journal_id', { ascending: false }).order('tag_id', { ascending: false });
  } else {
    query = query.order('id', { ascending: false });
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error(`Error fetching from ${tableName}:`, error);
    throw new Error(`Failed to fetch records from ${tableName}: ${error.message}`);
  }
  
  // For journals, decrypt the data
  if (tableName === 'journals' && data) {
    const decryptedData = await Promise.all(
      data.map(async (record) => {
        try {
          return await decryptJournalData(record as EncryptedJournalEntry);
        } catch (err) {
          console.error('Decryption error for record:', record.id, err);
          return {
            ...record,
            title: '[Decryption Error]',
            content: '[Decryption Error]',
            folder: '[Decryption Error]',
            mood: '',
            _decryptError: true
          };
        }
      })
    );
    return decryptedData;
  }
  
  return data || [];
}

/**
 * Create a new record in a table
 */
export async function createRecord(tableName: TableName, record: any): Promise<any> {
  const supabase = getSupabaseClient();
  
  // For journals, encrypt the data
  if (tableName === 'journals') {
    const encryptedRecord = await encryptJournalData(record as JournalEntry);
    const { data, error } = await supabase
      .from(tableName)
      .insert(encryptedRecord)
      .select();
      
    if (error) {
      console.error(`Error creating record in ${tableName}:`, error);
      throw new Error(`Failed to create record in ${tableName}: ${error.message}`);
    }
    
    return data?.[0] ? await decryptJournalData(data[0] as EncryptedJournalEntry) : null;
  }
  
  // For other tables, insert directly
  const { data, error } = await supabase
    .from(tableName)
    .insert(record)
    .select();
    
  if (error) {
    console.error(`Error creating record in ${tableName}:`, error);
    throw new Error(`Failed to create record in ${tableName}: ${error.message}`);
  }
  
  return data?.[0];
}

/**
 * Update a record in a table
 */
export async function updateRecord(tableName: TableName, id: number, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  
  // For journals, use the existing updateJournal function
  if (tableName === 'journals') {
    return await updateJournal(id, updates);
  }
  
  // For journal_tags, use composite key
  if (tableName === 'journal_tags') {
    throw new Error('journal_tags table does not support updates. Delete and create a new relation instead.');
  }
  
  // For other tables, update directly
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select();
    
  if (error) {
    console.error(`Error updating record in ${tableName}:`, error);
    throw new Error(`Failed to update record in ${tableName}: ${error.message}`);
  }
  
  return data?.[0];
}

/**
 * Delete a record from a table
 */
export async function deleteRecord(tableName: TableName, id: number | { journal_id: number; tag_id: number }): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  // For journal_tags, use composite key
  if (tableName === 'journal_tags' && typeof id === 'object') {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('journal_id', id.journal_id)
      .eq('tag_id', id.tag_id);
      
    if (error) {
      console.error(`Error deleting record from ${tableName}:`, error);
      throw new Error(`Failed to delete record from ${tableName}: ${error.message}`);
    }
    
    return true;
  }
  
  // For other tables, use id
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id as number);
    
  if (error) {
    console.error(`Error deleting record from ${tableName}:`, error);
    throw new Error(`Failed to delete record from ${tableName}: ${error.message}`);
  }
  
  return true;
}

/**
 * Get table schema information (for dynamic form generation)
 */
export async function getTableSchema(tableName: TableName): Promise<any> {
  // This is a simplified schema definition
  // In a real application, you might query Supabase's information_schema
  const schemas: Record<TableName, any> = {
    journals: {
      columns: [
        { name: 'id', type: 'number', readonly: true },
        { name: 'date', type: 'date', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'textarea', required: true },
        { name: 'folder', type: 'text', required: true },
        { name: 'mood', type: 'text', required: false },
        { name: 'created_at', type: 'timestamp', readonly: true },
        { name: 'updated_at', type: 'timestamp', readonly: true }
      ]
    },
    folders: {
      columns: [
        { name: 'id', type: 'number', readonly: true },
        { name: 'name', type: 'text', required: true },
        { name: 'color', type: 'color', required: true },
        { name: 'created_at', type: 'timestamp', readonly: true },
        { name: 'updated_at', type: 'timestamp', readonly: true }
      ]
    },
    tags: {
      columns: [
        { name: 'id', type: 'number', readonly: true },
        { name: 'name', type: 'text', required: true },
        { name: 'created_at', type: 'timestamp', readonly: true }
      ]
    },
    journal_tags: {
      columns: [
        { name: 'journal_id', type: 'number', required: true },
        { name: 'tag_id', type: 'number', required: true },
        { name: 'created_at', type: 'timestamp', readonly: true }
      ]
    }
  };
  
  return schemas[tableName];
}
