import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt, isEncryptedData, type EncryptedData } from './encryption';

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

interface EncryptedJournalEntry extends Omit<JournalEntry, 'title' | 'content'> {
  title: string | EncryptedData;
  content: string | EncryptedData;
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
  const [encryptedTitle, encryptedContent] = await Promise.all([
    encrypt(journal.title, key),
    encrypt(journal.content, key)
  ]);
  
  return {
    ...journal,
    title: encryptedTitle,
    content: encryptedContent
  };
}

async function decryptJournalData(journal: EncryptedJournalEntry): Promise<JournalEntry> {
  const key = getEncryptionKey();
  
  // Helper function to parse and decrypt data
  const decryptField = async (field: string | EncryptedData): Promise<string> => {
    if (typeof field === 'string') {
      try {
        // Try to parse the string as JSON in case it's a stringified EncryptedData
        const parsed = JSON.parse(field);
        if (isEncryptedData(parsed)) {
          return await decrypt(parsed, key);
        }
      } catch {
        // If parsing fails, return the original string
        return field;
      }
    }
    // If it's already an EncryptedData object, decrypt it
    if (isEncryptedData(field)) {
      return await decrypt(field, key);
    }
    // Default case: return the field as is
    return field as string;
  };

  const [title, content] = await Promise.all([
    decryptField(journal.title),
    decryptField(journal.content)
  ]);
  
  return {
    ...journal,
    title,
    content
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
  const supabase = getSupabaseClient();
  const encryptedJournal = await encryptJournalData(journal);
  
  const { data, error } = await supabase
    .from('journals')
    .insert([encryptedJournal])
    .select();
    
  if (error) throw error;
  return data[0] ? await decryptJournalData(data[0] as EncryptedJournalEntry) : null;
}

export async function updateJournal(id: number, journal: Partial<JournalEntry>) {
  const supabase = getSupabaseClient();
  
  // If updating title or content, encrypt them
  const updates: Partial<EncryptedJournalEntry> = { ...journal };
  const key = getEncryptionKey();
  
  const encryptionPromises: Promise<void>[] = [];
  
  if (journal.title) {
    encryptionPromises.push(
      encrypt(journal.title, key).then(encrypted => {
        updates.title = encrypted;
      })
    );
  }
  if (journal.content) {
    encryptionPromises.push(
      encrypt(journal.content, key).then(encrypted => {
        updates.content = encrypted;
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
    
  if (error) throw error;
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
