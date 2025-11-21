/**
 * Migration script to encrypt existing unencrypted tags and folder names in the database
 * Run this ONCE after deploying the encryption changes to encrypt existing data
 */

import { getSupabaseClient } from './supabaseClient';
import { encrypt, isEncryptedData } from './encryption';

function getEncryptionKey(): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing encryption key');
  }
  return key;
}

interface MigrationResult {
  tagsEncrypted: number;
  foldersEncrypted: number;
  errors: string[];
}

/**
 * Encrypt all unencrypted tag names in the database
 */
async function encryptTags(): Promise<{ encrypted: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  let encrypted = 0;
  const errors: string[] = [];

  try {
    // Fetch all tags
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*');

    if (error) {
      errors.push(`Failed to fetch tags: ${error.message}`);
      return { encrypted, errors };
    }

    if (!tags || tags.length === 0) {
      console.log('No tags to encrypt');
      return { encrypted, errors };
    }

    // Process each tag
    for (const tag of tags) {
      try {
        // Check if already encrypted
        let isAlreadyEncrypted = false;
        try {
          const parsed = JSON.parse(tag.name);
          if (isEncryptedData(parsed)) {
            isAlreadyEncrypted = true;
          }
        } catch {
          // Not JSON, so not encrypted
        }

        if (isAlreadyEncrypted) {
          console.log(`Tag ${tag.id} is already encrypted, skipping`);
          continue;
        }

        // Encrypt the tag name
        const encryptedName = await encrypt(tag.name, key);
        const encryptedNameStr = JSON.stringify(encryptedName);

        // Update the tag
        const { error: updateError } = await supabase
          .from('tags')
          .update({ name: encryptedNameStr })
          .eq('id', tag.id);

        if (updateError) {
          errors.push(`Failed to encrypt tag ${tag.id} (${tag.name}): ${updateError.message}`);
        } else {
          encrypted++;
          console.log(`Encrypted tag ${tag.id}: ${tag.name}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing tag ${tag.id}: ${errorMsg}`);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Fatal error encrypting tags: ${errorMsg}`);
  }

  return { encrypted, errors };
}

/**
 * Encrypt all unencrypted folder fields in journal entries
 */
async function encryptJournalFolders(): Promise<{ encrypted: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  let encrypted = 0;
  const errors: string[] = [];

  try {
    // Fetch all journals
    const { data: journals, error } = await supabase
      .from('journals')
      .select('id, folder');

    if (error) {
      errors.push(`Failed to fetch journals: ${error.message}`);
      return { encrypted, errors };
    }

    if (!journals || journals.length === 0) {
      console.log('No journal folders to encrypt');
      return { encrypted, errors };
    }

    // Process each journal
    for (const journal of journals) {
      try {
        // Check if already encrypted
        let isAlreadyEncrypted = false;
        try {
          const parsed = JSON.parse(journal.folder);
          if (isEncryptedData(parsed)) {
            isAlreadyEncrypted = true;
          }
        } catch {
          // Not JSON, so not encrypted
        }

        if (isAlreadyEncrypted) {
          console.log(`Journal ${journal.id} folder is already encrypted, skipping`);
          continue;
        }

        // Encrypt the folder name
        const encryptedFolder = await encrypt(journal.folder, key);
        const encryptedFolderStr = JSON.stringify(encryptedFolder);

        // Update the journal
        const { error: updateError } = await supabase
          .from('journals')
          .update({ folder: encryptedFolderStr })
          .eq('id', journal.id);

        if (updateError) {
          errors.push(`Failed to encrypt journal ${journal.id} folder: ${updateError.message}`);
        } else {
          encrypted++;
          console.log(`Encrypted journal ${journal.id} folder: ${journal.folder}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing journal ${journal.id}: ${errorMsg}`);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Fatal error encrypting journal folders: ${errorMsg}`);
  }

  return { encrypted, errors };
}

/**
 * Main migration function - encrypts all unencrypted data
 */
export async function migrateEncryption(): Promise<MigrationResult> {
  console.log('Starting encryption migration...');

  const tagResult = await encryptTags();
  const folderResult = await encryptJournalFolders();

  const result: MigrationResult = {
    tagsEncrypted: tagResult.encrypted,
    foldersEncrypted: folderResult.encrypted,
    errors: [...tagResult.errors, ...folderResult.errors]
  };

  console.log('\n=== Migration Complete ===');
  console.log(`Tags encrypted: ${result.tagsEncrypted}`);
  console.log(`Journal folders encrypted: ${result.foldersEncrypted}`);
  
  if (result.errors.length > 0) {
    console.log(`\nErrors encountered: ${result.errors.length}`);
    result.errors.forEach(err => console.error(`  - ${err}`));
  } else {
    console.log('\nNo errors encountered!');
  }

  return result;
}

// If running this script directly (not as import)
if (typeof window === 'undefined' && require.main === module) {
  migrateEncryption()
    .then((result) => {
      console.log('\nMigration finished successfully');
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
