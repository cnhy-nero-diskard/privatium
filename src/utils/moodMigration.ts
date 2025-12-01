/**
 * Migration utilities for mood data
 * This script helps migrate existing mood data to the new encrypted format
 */

import { getSupabaseClient } from './supabaseClient';
import { encodeMoodForDb, decodeMoodFromDb } from './moodUtils';
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

/**
 * Migrate all existing mood data to encrypted format
 * This function will:
 * 1. Fetch all entries with plain text moods
 * 2. Convert them to encrypted format
 * 3. Update the database
 */
export async function migrateMoodData(): Promise<{ success: number; errors: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  let success = 0;
  let errors = 0;
  const details: string[] = [];

  try {
    // Fetch all journal entries
    const { data: entries, error: fetchError } = await supabase
      .from('journals')
      .select('id, mood');
    
    if (fetchError) {
      throw new Error(`Failed to fetch entries: ${fetchError.message}`);
    }

    if (!entries || entries.length === 0) {
      return { success: 0, errors: 0, details: ['No entries found to migrate'] };
    }

    details.push(`Found ${entries.length} entries to check`);

    for (const entry of entries) {
      try {
        const { id, mood } = entry;
        
        // Skip if mood is empty or null
        if (!mood) {
          continue;
        }

        // Check if mood is already encrypted
        try {
          const parsed = JSON.parse(mood);
          if (parsed && typeof parsed === 'object' && parsed.encrypted && parsed.iv && parsed.salt) {
            // Already encrypted, skip
            continue;
          }
        } catch {
          // Not JSON, so it's likely plain text - proceed with migration
        }

        // Encrypt the mood using the new system
        const encryptedMood = await encodeMoodForDb(mood, key);
        
        // Update the database
        const { error: updateError } = await supabase
          .from('journals')
          .update({ mood: encryptedMood })
          .eq('id', id);

        if (updateError) {
          errors++;
          details.push(`Error updating entry ${id}: ${updateError.message}`);
        } else {
          success++;
          details.push(`Successfully migrated entry ${id}: "${mood}"`);
        }

      } catch (entryError) {
        errors++;
        details.push(`Error processing entry ${entry.id}: ${entryError}`);
      }
    }

    details.push(`Migration complete: ${success} successful, ${errors} errors`);
    return { success, errors, details };

  } catch (error) {
    details.push(`Migration failed: ${error}`);
    return { success: 0, errors: 1, details };
  }
}

/**
 * Verify that mood data can be properly decrypted
 */
export async function verifyMoodMigration(): Promise<{ success: number; errors: number; details: string[] }> {
  const supabase = getSupabaseClient();
  const key = getEncryptionKey();
  
  let success = 0;
  let errors = 0;
  const details: string[] = [];

  try {
    // Fetch all journal entries with moods
    const { data: entries, error: fetchError } = await supabase
      .from('journals')
      .select('id, mood')
      .not('mood', 'is', null)
      .neq('mood', '');
    
    if (fetchError) {
      throw new Error(`Failed to fetch entries: ${fetchError.message}`);
    }

    if (!entries || entries.length === 0) {
      return { success: 0, errors: 0, details: ['No entries with moods found'] };
    }

    details.push(`Verifying ${entries.length} entries`);

    for (const entry of entries) {
      try {
        const { id, mood } = entry;
        
        // Try to decrypt the mood
        const decryptedMood = await decodeMoodFromDb(mood, key);
        
        if (decryptedMood) {
          success++;
          details.push(`Entry ${id}: Successfully decrypted to "${decryptedMood}"`);
        } else {
          errors++;
          details.push(`Entry ${id}: Failed to decrypt mood data`);
        }

      } catch (entryError) {
        errors++;
        details.push(`Entry ${entry.id}: Error during verification - ${entryError}`);
      }
    }

    details.push(`Verification complete: ${success} successful, ${errors} errors`);
    return { success, errors, details };

  } catch (error) {
    details.push(`Verification failed: ${error}`);
    return { success: 0, errors: 1, details };
  }
}

/**
 * Check current mood data format in the database
 */
export async function analyzeMoodData(): Promise<{ analysis: any; details: string[] }> {
  const supabase = getSupabaseClient();
  const details: string[] = [];
  const analysis = {
    total: 0,
    withMood: 0,
    encrypted: 0,
    plainText: 0,
    empty: 0,
    moodTypes: {} as Record<string, number>
  };

  try {
    // Fetch all journal entries
    const { data: entries, error: fetchError } = await supabase
      .from('journals')
      .select('id, mood');
    
    if (fetchError) {
      throw new Error(`Failed to fetch entries: ${fetchError.message}`);
    }

    analysis.total = entries?.length || 0;
    details.push(`Analyzing ${analysis.total} entries`);

    for (const entry of entries || []) {
      const { mood } = entry;
      
      if (!mood || mood === '') {
        analysis.empty++;
        continue;
      }

      analysis.withMood++;

      // Check if encrypted
      try {
        const parsed = JSON.parse(mood);
        if (parsed && typeof parsed === 'object' && parsed.encrypted && parsed.iv && parsed.salt) {
          analysis.encrypted++;
          details.push(`Entry ${entry.id}: Encrypted mood data`);
        } else {
          analysis.plainText++;
          analysis.moodTypes[mood] = (analysis.moodTypes[mood] || 0) + 1;
          details.push(`Entry ${entry.id}: Plain text mood - "${mood}"`);
        }
      } catch {
        // Not JSON, so it's plain text
        analysis.plainText++;
        analysis.moodTypes[mood] = (analysis.moodTypes[mood] || 0) + 1;
        details.push(`Entry ${entry.id}: Plain text mood - "${mood}"`);
      }
    }

    return { analysis, details };

  } catch (error) {
    details.push(`Analysis failed: ${error}`);
    return { analysis, details };
  }
}
