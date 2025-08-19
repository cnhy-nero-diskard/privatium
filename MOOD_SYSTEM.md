# Mood System Documentation

## Overview

The Privatium journal application now features a robust mood encoding/decoding system that provides:

- **Encrypted mood storage**: All mood data is encrypted before being stored in the database
- **Emoji-based UI**: Users can select moods using intuitive emoji buttons
- **Consistent mapping**: Standardized mood definitions across the entire application
- **Backward compatibility**: Legacy mood data is automatically handled
- **Type safety**: Full TypeScript support with proper type definitions

## Architecture

### Pipeline Flow

```
User Selection → Mood Label → Text Value → Encryption → Database Storage
                    ↓
User Interface ← Mood Label ← Text Value ← Decryption ← Database Retrieval
```

### Key Components

1. **MoodUtils** (`src/utils/moodUtils.ts`): Core mood encoding/decoding logic
2. **MoodIcon** (`src/app/components/MoodIcon.tsx`): React component for mood display
3. **Database Integration**: Updated supabaseClient with mood encryption
4. **Migration Tools**: Utilities for migrating existing data

## Usage

### Basic Mood Operations

```typescript
import { encodeMoodForDb, decodeMoodFromDb, getAllMoods } from '@/utils/moodUtils';

// Encoding for database storage
const encryptedMood = await encodeMoodForDb('Happy', encryptionKey);

// Decoding from database
const moodLabel = await decodeMoodFromDb(encryptedMood, encryptionKey);

// Get all available moods
const availableMoods = getAllMoods();
```

### React Components

```tsx
import { MoodIcon, MoodWithLabel } from '@/app/components/MoodIcon';

// Display mood icon only
<MoodIcon mood="Happy" size="md" />

// Display mood with label
<MoodWithLabel mood="Happy" size="lg" />

// Mood selector (in forms)
{getAllMoods().map((moodDef) => (
  <button key={moodDef.id} onClick={() => setMood(moodDef.label)}>
    <span>{moodDef.emoji}</span>
    <span>{moodDef.label}</span>
  </button>
))}
```

## Mood Definitions

The system includes the following predefined moods:

| Emoji | Label      | Text Value  | Color         |
|-------|------------|-------------|---------------|
| 😄    | Very Happy | very_happy  | text-yellow-500 |
| 😊    | Happy      | happy       | text-yellow-400 |
| 😐    | Neutral    | neutral     | text-gray-400   |
| 😢    | Sad        | sad         | text-blue-400   |
| 😠    | Angry      | angry       | text-red-400    |

## Database Schema

The mood column in the journals table stores encrypted mood data as JSON:

```sql
CREATE TABLE journals (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,  -- encrypted
  content TEXT NOT NULL, -- encrypted
  mood TEXT,            -- encrypted (new format)
  folder TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Encrypted Mood Format

```json
{
  "encrypted": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-initialization-vector",
  "salt": "base64-encoded-salt"
}
```

## Migration

### Migrating Existing Data

```typescript
import { migrateMoodData, verifyMoodMigration, analyzeMoodData } from '@/utils/moodMigration';

// Analyze current mood data
const analysis = await analyzeMoodData();
console.log('Current state:', analysis);

// Migrate plain text moods to encrypted format
const migrationResult = await migrateMoodData();
console.log('Migration result:', migrationResult);

// Verify migration success
const verification = await verifyMoodMigration();
console.log('Verification result:', verification);
```

### Legacy Mood Mapping

The system automatically maps legacy mood values:

- `"happy"` → `"Happy"`
- `"very happy"` → `"Very Happy"`
- `"sad"` → `"Sad"`
- `"neutral"` → `"Neutral"`
- `"angry"` → `"Angry"`

## Testing

Run the mood system tests to verify everything is working:

```typescript
import testMoodEncoding from '@/tests/moodSystemTest';

// Run all mood system tests
await testMoodEncoding();
```

The test suite covers:

1. Basic encoding/decoding
2. All mood definitions
3. Null and empty values
4. Legacy mood values
5. Mood utilities

## Security

### Encryption Details

- **Algorithm**: AES-GCM with 256-bit keys
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: 16-byte random salt per entry
- **IV**: 12-byte random initialization vector per entry

### Environment Variables

Ensure the following environment variables are set:

```env
NEXT_PUBLIC_ENCRYPTION_KEY=your-encryption-key-here
# or
ENCRYPTION_KEY=your-encryption-key-here
```

## File Structure

```
src/
├── utils/
│   ├── moodUtils.ts          # Core mood encoding/decoding
│   ├── moodMigration.ts      # Migration utilities
│   └── supabaseClient.ts     # Updated with mood encryption
├── app/
│   ├── components/
│   │   └── MoodIcon.tsx      # Mood display components
│   ├── entryformui/
│   │   └── page.tsx          # Updated mood selector
│   └── page.tsx              # Updated mood display
└── tests/
    └── moodSystemTest.ts     # Comprehensive tests
```

## API Reference

### MoodEncoder Class

Static methods for mood operations:

- `encodeMoodForDb(label, key)`: Encode mood for database storage
- `decodeMoodFromDb(encrypted, key)`: Decode mood from database
- `getMoodDefinition(label)`: Get mood definition by label
- `getAllMoods()`: Get all available mood definitions
- `getMoodEmoji(label)`: Get emoji for mood label
- `getMoodColor(label)`: Get color class for mood label
- `getMoodIcon(label)`: Get icon name for mood label

### React Components

- `MoodIcon`: Display mood icon with optional label
- `MoodWithLabel`: Always display mood with label
- `moodIcon`: Legacy function for backward compatibility

## Troubleshooting

### Common Issues

1. **Encryption errors**: Verify encryption key is set correctly
2. **Migration failures**: Check database permissions and connectivity
3. **Display issues**: Ensure components are imported correctly
4. **Legacy data**: Run migration script for existing mood data

### Debug Mode

Enable debug logging by setting environment variable:

```env
DEBUG_MOOD_SYSTEM=true
```

## Future Enhancements

Potential improvements to consider:

1. **Custom moods**: Allow users to define custom mood categories
2. **Mood analytics**: Track mood patterns over time
3. **Bulk operations**: Batch mood updates for better performance
4. **Export/import**: Support for mood data export/import
5. **Mood suggestions**: AI-powered mood suggestions based on content

## Contributing

When adding new mood definitions:

1. Update `MOOD_DEFINITIONS` in `moodUtils.ts`
2. Add corresponding emoji and color mappings
3. Update tests to include new moods
4. Run migration if needed for existing data
5. Update documentation
