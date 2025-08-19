/**
 * Debug utilities for troubleshooting mood system issues
 */

import { getAllMoods, getMoodDefinition, encodeMoodForDb, decodeMoodFromDb } from '@/utils/moodUtils';

export async function debugMoodSystem() {
  console.log('🐛 Debug: Mood System Analysis');
  
  // Check available moods
  const availableMoods = getAllMoods();
  console.log('Available moods:', availableMoods.map(m => m.label));
  
  // Test each mood
  const testKey = 'test-key-123';
  
  for (const mood of availableMoods) {
    try {
      console.log(`\n🔍 Testing mood: "${mood.label}"`);
      
      // Test encoding
      const encoded = await encodeMoodForDb(mood.label, testKey);
      console.log('  Encoded:', typeof encoded, encoded);
      
      // Test decoding
      const decoded = await decodeMoodFromDb(encoded, testKey);
      console.log('  Decoded:', decoded);
      
      // Check if round-trip works
      const isMatch = decoded === mood.label;
      console.log('  Round-trip success:', isMatch);
      
      if (!isMatch) {
        console.error(`  ❌ Round-trip failed for "${mood.label}"`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing "${mood.label}":`, error);
    }
  }
  
  // Test unknown mood
  console.log('\n🔍 Testing unknown mood: "Unknown"');
  try {
    const encoded = await encodeMoodForDb('Unknown', testKey);
    console.log('  Encoded unknown mood:', encoded);
    
    const decoded = await decodeMoodFromDb(encoded, testKey);
    console.log('  Decoded unknown mood:', decoded);
  } catch (error) {
    console.error('  ❌ Error testing unknown mood:', error);
  }
}

export function logMoodSelection(selectedMood: string | null) {
  console.log('🎯 Mood selected:', selectedMood);
  
  if (selectedMood) {
    const definition = getMoodDefinition(selectedMood);
    console.log('  Mood definition:', definition);
    
    if (!definition) {
      console.warn('  ⚠️ No definition found for mood:', selectedMood);
      console.log('  Available:', getAllMoods().map(m => m.label));
    }
  }
}

export function logSaveAttempt(journalData: any) {
  console.log('💾 Attempting to save journal:', {
    title: journalData.title?.substring(0, 50) + '...',
    mood: journalData.mood,
    date: journalData.date,
    folder: journalData.folder
  });
  
  if (journalData.mood) {
    const definition = getMoodDefinition(journalData.mood);
    if (!definition) {
      console.error('❌ Invalid mood for save:', journalData.mood);
    }
  }
}

// Add to window for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugMoodSystem = debugMoodSystem;
  (window as any).logMoodSelection = logMoodSelection;
  (window as any).logSaveAttempt = logSaveAttempt;
}
