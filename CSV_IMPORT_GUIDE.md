# CSV Import Feature

## Overview
The CSV import feature allows you to import journal entries from other apps or backup files. The system automatically detects duplicate entries and lets you choose whether to skip them or overwrite existing entries.

## CSV Format

### Required Headers
- **Date**: The date of the entry (various formats supported: YYYY-MM-DD, MM/DD/YYYY, etc.)
- **Title**: The title of the journal entry
- **Folder**: The folder/category for the entry (e.g., "Personal", "Work", "Travel")
- **Tag**: Tags for the entry (comma-separated, enclosed in quotes if needed: "tag1,tag2,tag3")
- **Mood**: The mood for the entry (e.g., "happy", "sad", "angry", "anxious", "calm", "neutral")
- **Location**: The content/body of the journal entry

### Optional Headers
- **weather**: This field is ignored during import (for compatibility with other apps)

### CSV Format Rules
- Tags are **comma-separated** within the Tag column
- If a field contains commas, it **must be enclosed in double quotes** ("like this, with commas")
- If a field contains double quotes, escape them by doubling ("He said ""hello""")
- The Tag column should use quotes when containing multiple tags: "tag1,tag2,tag3"

### Example CSV
```csv
Date,Title,Folder,Tag,Mood,Location,weather
2025-01-15,Morning Reflection,Personal,"gratitude,mindfulness",happy,Started my day with meditation,sunny
2025-01-14,Work Progress,Work,"project,productivity",neutral,"Made significant progress, and the team was happy.",cloudy
```

A sample template is available at `public/sample-import-template.csv`.

## How to Use

1. **Prepare Your CSV File**
   - Ensure your CSV file has the required headers
   - Use the correct date format
   - Tags should be comma-separated within the Tag column
   - Enclose fields in double quotes if they contain commas
   - Example: `"tag1,tag2,tag3"` for multiple tags

2. **Import Process**
   - Click the "Import CSV" button on the home page
   - Select your CSV file
   - Wait for the system to parse and check for duplicates

3. **Handle Duplicates**
   - If duplicates are found (same date and title), you'll see a modal with options:
     - **Skip Duplicates**: Import only new entries that don't exist
     - **Overwrite All**: Replace existing entries with imported data
     - **Cancel**: Cancel the import process

4. **Review Results**
   - After import, you'll see a summary of how many entries were imported
   - Any errors will be displayed for your review

## Mood Mapping

The system automatically maps common mood variations to the app's mood system:
- happy, joy, joyful, excited → happy
- sad, unhappy, depressed, down → sad
- angry, mad, frustrated → angry
- anxious, worried, nervous → anxious
- calm, peaceful, relaxed → calm
- neutral, ok, okay, fine → neutral

## Duplicate Detection

The system detects duplicates by comparing:
- Date (must match exactly)
- Title (case-insensitive comparison)

If both match, the entry is considered a duplicate.

## Error Handling

- Invalid dates are replaced with today's date
- Missing required fields will skip that entry
- Malformed CSV lines are skipped with a console warning
- Tag creation errors are logged but don't stop the import
- All errors are collected and displayed after import

## Technical Details

### Files Involved
- `src/utils/importUtils.ts`: Core import logic, CSV parsing, duplicate detection
- `src/components/ImportButton.tsx`: UI component with file upload and duplicate modal
- `src/app/home/page.tsx`: Integration on the home page

### Features
- ✅ CSV parsing with quoted value support
- ✅ Automatic duplicate detection
- ✅ User confirmation for overwrites
- ✅ Tag creation and linking
- ✅ Mood normalization
- ✅ Error collection and reporting
- ✅ Batch import for performance
- ✅ Encryption support (entries are encrypted before storage)

## Troubleshooting

**Problem**: Import button doesn't respond
- **Solution**: Check browser console for errors, ensure CSV file is valid

**Problem**: Entries not appearing after import
- **Solution**: Refresh the page, check if duplicates were skipped

**Problem**: Tags not showing up
- **Solution**: Verify tag format in CSV (use semicolons or commas)

**Problem**: Wrong mood displayed
- **Solution**: Check mood spelling in CSV, refer to mood mapping above

**Problem**: Date format issues
- **Solution**: Use ISO format (YYYY-MM-DD) for best compatibility
