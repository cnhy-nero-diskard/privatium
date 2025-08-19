import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt, isEncryptedData, type EncryptedData } from './encryption';
import { encodeMoodForDb, decodeMoodFromDb } from './moodUtils';

interface JournalEntry {
  id?: number;
  date: string;
  title: string;
  content: string;
  folder: string;
  mood: string;
  created_at?: string;
  updated_at?: string;
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

export async function getJournals() {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .order('date', { ascending: false });
    
  if (error) throw error;
  if (!data) return [];
  
  // Decrypt all journals in parallel
  const decryptedJournals = await Promise.all(
    data.map(journal => decryptJournalData(journal as EncryptedJournalEntry))
  );
  return decryptedJournals;
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
