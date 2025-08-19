import { encrypt, decrypt, type EncryptedData, isEncryptedData } from './encryption';

// Mood definition interface
export interface MoodDefinition {
  id: string;
  label: string;
  emoji: string;
  textValue: string; // What gets stored in DB after encryption
  color: string;
  icon: string; // For react-icons
}

// Standard mood definitions
export const MOOD_DEFINITIONS: MoodDefinition[] = [
  {
    id: 'very-happy',
    label: 'Very Happy',
    emoji: '😄',
    textValue: 'very_happy',
    color: 'text-yellow-500',
    icon: 'FaRegLaugh'
  },
  {
    id: 'happy',
    label: 'Happy',
    emoji: '😊',
    textValue: 'happy',
    color: 'text-yellow-400',
    icon: 'FaRegSmile'
  },
  {
    id: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    textValue: 'neutral',
    color: 'text-gray-400',
    icon: 'FaRegMeh'
  },
  {
    id: 'sad',
    label: 'Sad',
    emoji: '😢',
    textValue: 'sad',
    color: 'text-blue-400',
    icon: 'FaRegFrown'
  },
  {
    id: 'angry',
    label: 'Angry',
    emoji: '😠',
    textValue: 'angry',
    color: 'text-red-400',
    icon: 'FaRegAngry'
  }
];

// Mood encoding/decoding functions
export class MoodEncoder {
  private static getMoodByLabel(label: string): MoodDefinition | null {
    return MOOD_DEFINITIONS.find(mood => 
      mood.label.toLowerCase() === label.toLowerCase()
    ) || null;
  }

  private static getMoodByTextValue(textValue: string): MoodDefinition | null {
    return MOOD_DEFINITIONS.find(mood => 
      mood.textValue.toLowerCase() === textValue.toLowerCase()
    ) || null;
  }

  private static getMoodById(id: string): MoodDefinition | null {
    return MOOD_DEFINITIONS.find(mood => mood.id === id) || null;
  }

  /**
   * Encode mood for database storage
   * UI label/emoji -> text value -> encrypted -> database
   */
  static async encodeMoodForDb(moodLabel: string | null, encryptionKey: string): Promise<string | EncryptedData> {
    if (!moodLabel || moodLabel.trim() === '') return '';

    // Find mood definition by label
    const moodDef = MoodEncoder.getMoodByLabel(moodLabel);
    if (!moodDef) {
      console.warn(`Unknown mood label: "${moodLabel}". Available moods:`, MOOD_DEFINITIONS.map(m => m.label));
      // Instead of returning empty string, try to handle it gracefully
      // For backward compatibility, store the original label encrypted
      const encryptedMood = await encrypt(moodLabel.toLowerCase(), encryptionKey);
      return encryptedMood;
    }

    // Encrypt the text value
    const encryptedMood = await encrypt(moodDef.textValue, encryptionKey);
    return encryptedMood;
  }

  /**
   * Decode mood from database
   * Database (encrypted) -> decrypted text value -> UI label
   */
  static async decodeMoodFromDb(encryptedMood: string | EncryptedData, encryptionKey: string): Promise<string | null> {
    if (!encryptedMood) return null;

    try {
      let textValue: string;

      // Handle different input types
      if (typeof encryptedMood === 'string') {
        try {
          // Try to parse as JSON (encrypted data)
          const parsed = JSON.parse(encryptedMood);
          if (isEncryptedData(parsed)) {
            textValue = await decrypt(parsed, encryptionKey);
          } else {
            // It's a plain text value (legacy data)
            textValue = encryptedMood;
          }
        } catch {
          // It's a plain text value (legacy data)
          textValue = encryptedMood;
        }
      } else if (isEncryptedData(encryptedMood)) {
        // It's already an EncryptedData object
        textValue = await decrypt(encryptedMood, encryptionKey);
      } else {
        console.warn('Invalid mood data format:', encryptedMood);
        return null;
      }

      // Find mood definition by text value
      const moodDef = MoodEncoder.getMoodByTextValue(textValue);
      if (!moodDef) {
        // Handle legacy mood values
        return MoodEncoder.mapLegacyMoodValue(textValue);
      }

      return moodDef.label;
    } catch (error) {
      console.error('Error decoding mood:', error);
      return null;
    }
  }

  /**
   * Map legacy mood values to new labels
   */
  private static mapLegacyMoodValue(legacyValue: string): string | null {
    const legacyMap: Record<string, string> = {
      'very happy': 'Very Happy',
      'happy': 'Happy',
      'neutral': 'Neutral',
      'sad': 'Sad',
      'angry': 'Angry'
    };

    return legacyMap[legacyValue.toLowerCase()] || null;
  }

  /**
   * Get mood definition by label
   */
  static getMoodDefinition(label: string | null): MoodDefinition | null {
    if (!label) return null;
    return MoodEncoder.getMoodByLabel(label);
  }

  /**
   * Get all available moods for UI
   */
  static getAllMoods(): MoodDefinition[] {
    return [...MOOD_DEFINITIONS];
  }

  /**
   * Get mood emoji by label
   */
  static getMoodEmoji(label: string | null): string {
    const mood = MoodEncoder.getMoodDefinition(label);
    return mood ? mood.emoji : '😐';
  }

  /**
   * Get mood color class by label
   */
  static getMoodColor(label: string | null): string {
    const mood = MoodEncoder.getMoodDefinition(label);
    return mood ? mood.color : 'text-gray-400';
  }

  /**
   * Get mood icon name by label
   */
  static getMoodIcon(label: string | null): string {
    const mood = MoodEncoder.getMoodDefinition(label);
    return mood ? mood.icon : 'FaRegMeh';
  }
}

// Convenience functions
export const encodeMoodForDb = MoodEncoder.encodeMoodForDb;
export const decodeMoodFromDb = MoodEncoder.decodeMoodFromDb;
export const getMoodDefinition = MoodEncoder.getMoodDefinition;
export const getAllMoods = MoodEncoder.getAllMoods;
export const getMoodEmoji = MoodEncoder.getMoodEmoji;
export const getMoodColor = MoodEncoder.getMoodColor;
export const getMoodIcon = MoodEncoder.getMoodIcon;
