import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { decrypt, isEncryptedData, type EncryptedData } from '@/utils/encryption';
import { decodeMoodFromDb } from '@/utils/moodUtils';


function getEncryptionKey(): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing encryption key');
  }
  return key;
}

// Decryption helper function
async function decryptField(field: string, key: string): Promise<string> {
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, rangeType } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Allow credentials to be passed from client for testing (dev only)
    const headerUrl = req.headers['x-supabase-url'] as string | undefined;
    const headerKey = req.headers['x-supabase-key'] as string | undefined;
    const supabase = getSupabaseClient(headerUrl && headerKey ? { supabaseUrl: headerUrl, supabaseKey: headerKey } : undefined);

    // Fetch entries within the date range
    let query = supabase
      .from('journals')
      .select('id, title, content, date, folder, mood, created_at, updated_at')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching entries:', error);
      return res.status(500).json({ message: 'Failed to fetch entries', error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ entries: [] });
    }

    // Fetch tags for all entries
    const entryIds = data.map(entry => entry.id);
    const { data: tagsData, error: tagsError } = await supabase
      .from('journal_tags')
      .select(`
        journal_id,
        tags (id, name, color)
      `)
      .in('journal_id', entryIds);

    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
    }

    // Group tags by entry ID and decrypt tag names
    const tagsByEntryId = new Map();
    if (tagsData) {
      const key = getEncryptionKey();
      const decryptedRows = await Promise.all(
        tagsData.map(async (item: any) => {
          if (item && item.tags && item.tags.name) {
            try {
              const parsed = JSON.parse(item.tags.name);
              if (isEncryptedData(parsed)) {
                const decryptedName = await decrypt(parsed, key);
                item.tags.name = decryptedName;
              }
            } catch {
              // leave as-is if parsing/decrypt fails (legacy/plaintext)
            }
          }
          return item;
        })
      );

      decryptedRows.forEach((item: any) => {
        if (!tagsByEntryId.has(item.journal_id)) {
          tagsByEntryId.set(item.journal_id, []);
        }
        if (item.tags) {
          tagsByEntryId.get(item.journal_id).push(item.tags);
        }
      });
    }

    // Decrypt content and attach tags
    const key = getEncryptionKey();
    const decryptedEntries = await Promise.all(
      data.map(async (entry) => {
        let decryptError = false;
        let title = entry.title;
        let content = entry.content;
        let mood = entry.mood;
        let folder = entry.folder;

        try {
          // Decrypt all fields in parallel
          [title, content, mood, folder] = await Promise.all([
            decryptField(entry.title, key),
            decryptField(entry.content, key),
            decodeMoodFromDb(entry.mood, key),
            decryptField(entry.folder, key)
          ]);
        } catch (error) {
          console.error(`Decryption error for entry ${entry.id}:`, error);
          decryptError = true;
          title = '[Encryption Error] Unable to decrypt title';
          content = '[Encryption Error] Unable to decrypt content';
        }

        return {
          id: entry.id,
          title,
          content,
          date: entry.date,
          folder,
          mood: mood || '',
          tags: tagsByEntryId.get(entry.id) || [],
          _decryptError: decryptError,
          created_at: entry.created_at,
          updated_at: entry.updated_at
        };
      })
    );

    return res.status(200).json({ entries: decryptedEntries });

  } catch (error: any) {
    console.error('Error in entries-by-date API:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch entries by date', 
      error: error.message || 'Unknown error' 
    });
  }
}
