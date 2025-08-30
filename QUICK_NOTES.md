# Quick Note Feature

## Overview
The Quick Note feature allows users to quickly capture thoughts or ideas without going through the full journal entry form. These notes are displayed with a more compact UI and are highlighted for 24 hours after creation.

## Features
- **Simple Modal Interface**: Add notes with just a title and mood, no content required
- **Visual Distinction**: Quick notes appear more compact than regular entries
- **Highlighting**: Recently added notes (within 24 hours) are highlighted with a gradient background and a "New" tag
- **Aging**: Notes older than 24 hours are automatically "greyed out" to indicate they're older

## Technical Implementation
1. **Database**: Uses the existing journal entry structure with empty content field
2. **UI Components**:
   - `QuickNoteModal.tsx`: Simple modal for entering a note title and mood
   - Updated `TopNavigation.tsx`: Added "Quick Note" button
   - Updated `HomePage.tsx`: Modified entry display to show quick notes differently

## Usage
1. Click the "Quick Note" purple button in the bottom navigation
2. Enter your note text (title only) and select a mood
3. Click "Add Note" to save
4. The note will appear highlighted in your journal list for 24 hours

## Future Enhancements
- Add support for tags in quick notes
- Allow converting quick notes to full entries
- Add quick note templates or suggestions
