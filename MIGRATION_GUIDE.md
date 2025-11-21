# Running the Encryption Migration

## Quick Start

After deploying the encryption fixes, you **MUST** run the migration to encrypt existing tags and folder names in your database.

## Step 1: Create Migration Script

Create `scripts/migrate-encryption.js`:

```javascript
// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import the migration function
const { migrateEncryption } = require('../src/utils/encryptionMigration.ts');

console.log('Starting encryption migration...');
console.log('Encryption key:', process.env.NEXT_PUBLIC_ENCRYPTION_KEY ? 'Found' : 'MISSING!');
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'MISSING!');
console.log('');

migrateEncryption()
  .then((result) => {
    console.log('\n✅ Migration completed successfully!');
    console.log(`   Tags encrypted: ${result.tagsEncrypted}`);
    console.log(`   Folders encrypted: ${result.foldersEncrypted}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  ${result.errors.length} errors occurred:`);
      result.errors.forEach(err => console.log(`   - ${err}`));
      process.exit(1);
    } else {
      console.log('\n   No errors!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
```

## Step 2: Install Required Dependencies

Make sure you have the necessary packages:

```bash
npm install dotenv
```

## Step 3: Check Your Environment Variables

Ensure your `.env.local` file has:

```env
NEXT_PUBLIC_ENCRYPTION_KEY=your-encryption-key-here
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
```

## Step 4: Run the Migration

```bash
node scripts/migrate-encryption.js
```

## Expected Output

```
Starting encryption migration...
Encryption key: Found
Supabase URL: Found

Encrypted tag 1: Work
Encrypted tag 2: Personal
Encrypted tag 3: Health
...
Encrypted journal 1 folder: Personal
Encrypted journal 2 folder: Work
...

=== Migration Complete ===
Tags encrypted: 15
Journal folders encrypted: 42

No errors encountered!

✅ Migration completed successfully!
   Tags encrypted: 15
   Folders encrypted: 42
   
   No errors!
```

## Verification

After running the migration:

1. **Check Supabase Database:**
   - Open Supabase Dashboard
   - Go to Table Editor → `tags` table
   - Click on any row and check the `name` field
   - Should see: `{"encrypted":"...","iv":"...","salt":"..."}`

2. **Check in Your App:**
   - Open your application
   - Create a new journal entry
   - Verify tags and folders display correctly
   - Verify you can search tags

3. **Re-run Migration (Safety Check):**
   ```bash
   node scripts/migrate-encryption.js
   ```
   - Should show: "Tag X is already encrypted, skipping"
   - This confirms the migration is idempotent

## Troubleshooting

### Error: "Missing encryption key"
- Check your `.env.local` file
- Ensure `NEXT_PUBLIC_ENCRYPTION_KEY` is set
- Try running: `echo $NEXT_PUBLIC_ENCRYPTION_KEY` to verify

### Error: "Failed to fetch tags/journals"
- Check your Supabase credentials
- Verify your Supabase project is running
- Check network connectivity

### Error: "Failed to encrypt tag X"
- Check the error message details
- Verify the tag data in Supabase
- May indicate corrupted data in database

### Tags/Folders Not Displaying After Migration
- Check browser console for decryption errors
- Verify the encryption key matches what was used to encrypt
- Clear browser cache and reload

## Alternative: UI-Based Migration

If you prefer not to use Node scripts, you can add a migration button to your app:

```typescript
// In your admin/settings component
import { migrateEncryption } from '@/utils/encryptionMigration';
import { useState } from 'react';

function MigrationButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigration = async () => {
    setRunning(true);
    try {
      const migrationResult = await migrateEncryption();
      setResult(migrationResult);
      alert(`Migration complete! Tags: ${migrationResult.tagsEncrypted}, Folders: ${migrationResult.foldersEncrypted}`);
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Check console for details.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <button onClick={handleMigration} disabled={running}>
        {running ? 'Migrating...' : 'Encrypt Existing Data'}
      </button>
      {result && (
        <div>
          <p>Tags encrypted: {result.tagsEncrypted}</p>
          <p>Folders encrypted: {result.foldersEncrypted}</p>
          {result.errors.length > 0 && (
            <div>
              <p>Errors:</p>
              <ul>
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Important Notes

- ⚠️ **Run the migration ONCE per database**
- ✅ Migration is safe to re-run (idempotent)
- 🔒 Backup your database before running (optional but recommended)
- ⏱️ Migration time depends on data volume (usually < 1 minute for typical usage)

## Support

If you encounter issues:
1. Check `SECURITY_FIX_ENCRYPTION.md` for detailed documentation
2. Review error messages carefully
3. Verify all environment variables are correct
4. Check Supabase service status

---

**Last Updated**: November 21, 2025
