import { getSupabaseClient } from './supabaseClient';
import { Tag } from '../types/tags';
import { encrypt, decrypt, isEncryptedData, type EncryptedData } from './encryption';
import { getCredentialsFromMemory } from './credentialManager';

function getEncryptionKey(): string {
  // Try to get from memory first (for runtime credentials)
  const memoryCreds = getCredentialsFromMemory();
  if (memoryCreds?.encryptionKey) {
    return memoryCreds.encryptionKey;
  }
  
  // Fall back to environment variables
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing encryption key');
  }
  return key;
}

export async function createTag(name: string): Promise<Tag> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  // Encrypt the tag name
  const encryptedName = await encrypt(name, key);
  const encryptedNameStr = JSON.stringify(encryptedName);
  
  const { data, error } = await supabase
    .from('tags')
    .insert([{ name: encryptedNameStr }])
    .select()
    .single();

  if (error) throw error;
  
  // Decrypt before returning
  return {
    ...data,
    name: name // Return original unencrypted name
  };
}

export async function getTags(): Promise<Tag[]> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  const { data, error } = await supabase
    .from('tags')
    .select('*');

  if (error) throw error;
  if (!data) return [];
  
  // Decrypt all tag names
  const decryptedTags = await Promise.all(
    data.map(async (tag) => {
      try {
        const parsed = JSON.parse(tag.name);
        if (isEncryptedData(parsed)) {
          const decryptedName = await decrypt(parsed, key);
          return { ...tag, name: decryptedName };
        }
        return tag;
      } catch {
        // If parsing fails, it might be plain text (legacy)
        return tag;
      }
    })
  );
  
  // Sort by decrypted name
  return decryptedTags.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getJournalTags(journalId: number): Promise<Tag[]> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  const { data, error } = await supabase
    .from('journal_tags')
    .select('tags(*)')
    .eq('journal_id', journalId);

  if (error) throw error;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = (data?.map((row: any) => row.tags).filter((tag: any) => tag !== null) || []) as Tag[];
  
  // Decrypt tag names
  const decryptedTags = await Promise.all(
    tags.map(async (tag) => {
      try {
        const parsed = JSON.parse(tag.name);
        if (isEncryptedData(parsed)) {
          const decryptedName = await decrypt(parsed, key);
          return { ...tag, name: decryptedName };
        }
        return tag;
      } catch {
        return tag;
      }
    })
  );
  
  return decryptedTags;
}

export async function addTagToJournal(journalId: number, tagId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('journal_tags')
    .insert([{ journal_id: journalId, tag_id: tagId }]);

  if (error) throw error;
}

export async function removeTagFromJournal(journalId: number, tagId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('journal_tags')
    .delete()
    .match({ journal_id: journalId, tag_id: tagId });

  if (error) throw error;
}

export async function updateJournalTags(journalId: number, tagIds: number[]): Promise<void> {
  const supabase = getSupabaseClient();
  
  // First, delete all existing tags for this journal
  await supabase
    .from('journal_tags')
    .delete()
    .eq('journal_id', journalId);

  // Then insert new tags if any
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('journal_tags')
      .insert(tagIds.map(tagId => ({ journal_id: journalId, tag_id: tagId })));

    if (error) throw error;
  }
}

export async function searchTags(query: string): Promise<Tag[]> {
  // Since tags are encrypted, we need to fetch all and filter client-side
  const allTags = await getTags();
  
  if (!query) return allTags;
  
  const queryLower = query.toLowerCase();
  return allTags.filter(tag => 
    tag.name.toLowerCase().includes(queryLower)
  );
}

export async function getTagsWithCounts(): Promise<Array<{ tag: string; count: number }>> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  // Get all tags with their journal counts using a join
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, journal_tags(journal_id)');

  if (error) throw error;
  if (!data) return [];
  
  // Decrypt tag names and count journals
  const tagsWithCounts = await Promise.all(
    data.map(async (tag: any) => {
      try {
        const parsed = JSON.parse(tag.name);
        let decryptedName = tag.name;
        
        if (isEncryptedData(parsed)) {
          decryptedName = await decrypt(parsed, key);
        }
        
        // Count the number of journals associated with this tag
        const count = tag.journal_tags?.length || 0;
        
        return {
          tag: decryptedName,
          count: count
        };
      } catch {
        // If parsing fails, it might be plain text (legacy)
        return {
          tag: tag.name,
          count: tag.journal_tags?.length || 0
        };
      }
    })
  );
  
  // Filter out tags with zero count and sort by count descending
  return tagsWithCounts
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);
}
