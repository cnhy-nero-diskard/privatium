import { getSupabaseClient } from './supabaseClient';
import { decrypt, encrypt, isEncryptedData, type EncryptedData } from './encryption';
import { getCredentialsFromMemory } from './credentialManager';

export interface Folder {
  id: number;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

interface EncryptedFolder extends Omit<Folder, 'name' | 'color'> {
  name: string; // JSON stringified EncryptedData
  color: string; // JSON stringified EncryptedData
}

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

async function encryptFolderData(folder: Omit<Folder, 'id'>): Promise<Omit<EncryptedFolder, 'id'>> {
  const key = getEncryptionKey();
  const [encryptedName, encryptedColor] = await Promise.all([
    encrypt(folder.name, key),
    encrypt(folder.color, key)
  ]);

  return {
    name: JSON.stringify(encryptedName),
    color: JSON.stringify(encryptedColor),
    created_at: folder.created_at,
    updated_at: folder.updated_at
  };
}

async function decryptFolderData(encryptedFolder: EncryptedFolder): Promise<Folder> {
  const key = getEncryptionKey();
  
  let decryptedName: string;
  let decryptedColor: string;

  try {
    // Parse name
    const nameData = JSON.parse(encryptedFolder.name);
    if (isEncryptedData(nameData)) {
      decryptedName = await decrypt(nameData, key);
    } else {
      decryptedName = encryptedFolder.name;
    }

    // Parse color
    const colorData = JSON.parse(encryptedFolder.color);
    if (isEncryptedData(colorData)) {
      decryptedColor = await decrypt(colorData, key);
    } else {
      decryptedColor = encryptedFolder.color;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt folder data');
  }

  return {
    id: encryptedFolder.id,
    name: decryptedName,
    color: decryptedColor,
    created_at: encryptedFolder.created_at,
    updated_at: encryptedFolder.updated_at
  };
}

export async function getFolders(): Promise<Folder[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  const decryptedFolders = await Promise.all(
    data.map((folder: EncryptedFolder) => decryptFolderData(folder))
  );

  return decryptedFolders;
}

export async function getFolder(id: number): Promise<Folder | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching folder:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return await decryptFolderData(data as EncryptedFolder);
}

export async function createFolder(name: string, color: string): Promise<Folder> {
  const supabase = getSupabaseClient();
  
  const encryptedData = await encryptFolderData({
    name,
    color
  });

  const { data, error } = await supabase
    .from('folders')
    .insert([encryptedData])
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    throw error;
  }

  return await decryptFolderData(data as EncryptedFolder);
}

export async function updateFolder(id: number, name: string, color: string): Promise<Folder> {
  const supabase = getSupabaseClient();
  
  const encryptedData = await encryptFolderData({
    name,
    color,
    updated_at: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('folders')
    .update(encryptedData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating folder:', error);
    throw error;
  }

  return await decryptFolderData(data as EncryptedFolder);
}

export async function deleteFolder(id: number): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}

export async function getFoldersWithCounts(): Promise<Array<{ folder: Folder; count: number }>> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  // Get all folders
  const { data: foldersData, error: foldersError } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });

  if (foldersError) throw foldersError;
  if (!foldersData) return [];

  // Get all journals with their folder names
  const { data: journalsData, error: journalsError } = await supabase
    .from('journals')
    .select('folder');

  if (journalsError) throw journalsError;

  // Decrypt all folder names from journals
  const decryptedJournalFolders = await Promise.all(
    (journalsData || []).map(async (journal: any) => {
      try {
        const parsed = JSON.parse(journal.folder);
        if (isEncryptedData(parsed)) {
          return await decrypt(parsed, key);
        }
        // If it's valid JSON but not encrypted, unwrap it
        if (typeof parsed === 'string') {
          return parsed;
        }
        return journal.folder;
      } catch {
        // Plain text (legacy)
        return journal.folder;
      }
    })
  );

  // Count occurrences of each folder name
  const folderCounts = decryptedJournalFolders.reduce((acc, folderName) => {
    acc[folderName] = (acc[folderName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Decrypt folder data and attach counts
  const foldersWithCounts = await Promise.all(
    foldersData.map(async (folder: EncryptedFolder) => {
      const decryptedFolder = await decryptFolderData(folder);
      const count = folderCounts[decryptedFolder.name] || 0;
      
      return {
        folder: decryptedFolder,
        count: count
      };
    })
  );

  // Sort by count descending
  return foldersWithCounts.sort((a, b) => b.count - a.count);
}
