# Security Vulnerability Fix: Tag and Folder Encryption

## Issue Description
**Critical Security Vulnerability**: Tag names (`tags.name`) and journal folder names (`journals.folder`) were being stored in the Supabase database without encryption, exposing sensitive user information.

## What Was Fixed

### 1. Tag Name Encryption (`src/utils/tagUtils.ts`)
- **`createTag()`**: Now encrypts tag names before storing in database
- **`getTags()`**: Decrypts tag names after retrieval and sorts by decrypted names
- **`getJournalTags()`**: Decrypts tag names when retrieving tags for a journal
- **`searchTags()`**: Now fetches all tags and filters client-side (since encrypted data can't be searched server-side)

### 2. Folder Name Encryption (`src/utils/supabaseClient.ts`)
- **`encryptJournalData()`**: Now encrypts the folder field alongside title, content, and mood
- **`decryptJournalData()`**: Decrypts the folder field when reading journal entries
- **`updateJournal()`**: Encrypts folder field when it's being updated

### 3. Database Schema
The following fields are now encrypted in the database:
- `tags.name` - Tag names
- `journals.folder` - Folder/category names
- `journals.title` - Journal entry titles (already encrypted)
- `journals.content` - Journal entry content (already encrypted)
- `journals.mood` - Mood data (already encrypted)

## Migration Required

⚠️ **IMPORTANT**: Existing data in your database needs to be migrated to encrypt unencrypted tags and folder names.

### Running the Migration

#### Option 1: From the Application (Recommended)
Add a migration button to your admin/settings page that calls:
```typescript
import { migrateEncryption } from '@/utils/encryptionMigration';

// In your component
const handleMigration = async () => {
  const result = await migrateEncryption();
  console.log('Migration result:', result);
};
```

#### Option 2: Command Line Script
Create a migration script file:

```javascript
// scripts/migrate-encryption.js
const { migrateEncryption } = require('../src/utils/encryptionMigration');

migrateEncryption()
  .then((result) => {
    console.log('Migration complete:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

Then run:
```bash
node scripts/migrate-encryption.js
```

### What the Migration Does
1. Fetches all tags from the database
2. Checks if each tag name is already encrypted
3. Encrypts unencrypted tag names and updates them
4. Fetches all journal entries
5. Checks if each journal's folder field is already encrypted
6. Encrypts unencrypted folder names and updates them

### Migration Safety
- The migration script checks if data is already encrypted before processing
- It can be run multiple times safely (idempotent)
- It processes records one at a time with error handling
- Failed encryptions are logged but don't stop the migration

## Backward Compatibility
All decryption functions check if data is already encrypted:
- If encrypted: Decrypts normally
- If plain text: Returns as-is (for legacy/migration period)

This ensures your app continues working during the migration process.

## Performance Considerations

### Tag Searching
Since tags are now encrypted, searching uses a different approach:
- **Before**: Server-side search using SQL `ILIKE`
- **After**: Client-side filtering after decrypting all tags

For small to medium tag counts (<1000), this has negligible performance impact. For very large tag collections, consider:
- Caching decrypted tags client-side
- Implementing a separate search index

### Database Queries
- Encrypted fields can no longer be used in WHERE clauses or ORDER BY statements
- Sorting and filtering must be done client-side after decryption
- Consider this when designing features that filter by tags or folders

## Testing Checklist

After deploying this fix:

- [ ] Run the migration script to encrypt existing data
- [ ] Create a new journal entry with a folder - verify it's encrypted in DB
- [ ] Create a new tag - verify it's encrypted in DB
- [ ] Import CSV data - verify tags and folders are encrypted
- [ ] Search for tags - verify search works correctly
- [ ] Filter journals by folder - verify filtering works
- [ ] Update a journal's folder - verify encryption works
- [ ] Verify all existing data displays correctly after migration

## Database Verification

To verify encryption in your Supabase database:

1. Open Supabase Dashboard > Table Editor
2. View the `tags` table - the `name` column should contain JSON strings with `encrypted`, `iv`, and `salt` fields
3. View the `journals` table - the `folder` column should contain similar JSON strings
4. Example encrypted value:
```json
{"encrypted":"base64string...","iv":"base64string...","salt":"base64string..."}
```

## Rollback Procedure

If you need to rollback (NOT RECOMMENDED - leaves data unencrypted):

1. Revert the changes to `tagUtils.ts` and `supabaseClient.ts`
2. Create a decryption migration that reverses the encryption
3. Update all encrypted fields back to plain text

⚠️ **Warning**: Rolling back exposes your data. Only do this if absolutely necessary.

## Security Best Practices

Now that all user data is encrypted:

1. **Encryption Key Security**
   - Keep `NEXT_PUBLIC_ENCRYPTION_KEY` secret
   - Use different keys for dev/staging/production
   - Never commit keys to version control
   - Rotate keys periodically

2. **Database Access**
   - Restrict Supabase database access to only necessary personnel
   - Use Row Level Security (RLS) policies if you add multi-user support
   - Audit database access logs regularly

3. **Client-Side Security**
   - Encryption/decryption happens in the browser
   - User data is never sent to server unencrypted
   - Use HTTPS to prevent man-in-the-middle attacks

## Future Enhancements

Consider implementing:
- Server-side encryption for additional security layer
- Key rotation mechanism
- Encrypted search index for better performance
- Audit logging for sensitive operations
- Data export with decryption option

## Questions or Issues?

If you encounter any problems with the encryption or migration:
1. Check browser console for error messages
2. Verify your encryption key is set correctly
3. Ensure Supabase credentials are valid
4. Check the migration logs for specific failures

---

**Last Updated**: November 21, 2025
**Security Level**: High
**Status**: Fixed ✅
