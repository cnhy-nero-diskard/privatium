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

interface EncryptedJournalEntry extends Omit<JournalEntry, 'title' | 'content' | 'mood'> {
  title: string; // JSON stringified EncryptedData
  content: string; // JSON stringified EncryptedData  
  mood: string; // JSON stringified EncryptedData or plain string
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
  const [encryptedTitle, encryptedContent, encryptedMood] = await Promise.all([
    encrypt(journal.title, key),
    encrypt(journal.content, key),
    encodeMoodForDb(journal.mood, key)
  ]);
  
  // Ensure all data is properly serialized for database storage
  return {
    ...journal,
    title: JSON.stringify(encryptedTitle),
    content: JSON.stringify(encryptedContent),
    mood: typeof encryptedMood === 'object' ? JSON.stringify(encryptedMood) : encryptedMood
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

  const [title, content, mood] = await Promise.all([
    decryptField(journal.title),
    decryptField(journal.content),
    decodeMoodFromDb(journal.mood, key)
  ]);
  
  return {
    ...journal,
    title,
    content,
    mood: mood || ''
  };
}

// Cache for etags and data
let lastEtag: string | null = null;
let lastData: JournalEntry[] | null = null;

export async function getJournals(currentEtag?: string) {
  try {
    const supabase = getSupabaseClient();
    
    // First, get the latest update timestamp from the journals table
    const { data: latestUpdate, error: timestampError } = await supabase
      .from('journals')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
      
    if (timestampError) {
      console.error('Error getting latest update:', timestampError);
      throw new Error(`Failed to check for updates: ${timestampError.message}`);
    }
    
    // Generate new etag based on the latest update timestamp
    const newEtag = latestUpdate?.updated_at || 'initial';
    
    // If the current etag matches the new one, return 304 (no change)
    if (currentEtag && currentEtag === newEtag && lastData) {
      return { status: 304, data: lastData };
    }
    
    // If data has changed or we don't have cached data, fetch it
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('date', { ascending: false });
      
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
      
      // Update the cache
      lastEtag = newEtag;
      lastData = decryptedJournals;
      
      return { 
        status: 200, 
        data: decryptedJournals,
        etag: newEtag 
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
    
    const { data, error } = await supabase
      .from('journals')
      .insert([encryptedJournal])
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
  
  // If updating title, content, or mood, encrypt them
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
