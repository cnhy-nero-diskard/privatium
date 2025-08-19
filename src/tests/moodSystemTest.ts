/**
 * Test script for mood encoding/decoding system
 * Run this to verify the mood pipeline is working correctly
 */

import { 
  encodeMoodForDb, 
  decodeMoodFromDb, 
  getAllMoods, 
  getMoodDefinition,
  MOOD_DEFINITIONS
} from '../utils/moodUtils';

// Mock encryption key for testing
const TEST_ENCRYPTION_KEY = 'test-encryption-key-123';

async function testMoodEncoding() {
  console.log('🧪 Testing Mood Encoding/Decoding System\n');
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Basic encoding and decoding
  console.log('📝 Test 1: Basic Encoding/Decoding');
  totalTests++;
  
  try {
    const originalMood = 'Happy';
    console.log(`  Original mood: "${originalMood}"`);
    
    const encoded = await encodeMoodForDb(originalMood, TEST_ENCRYPTION_KEY);
    console.log(`  Encoded mood:`, typeof encoded === 'string' ? encoded : JSON.stringify(encoded));
    
    const decoded = await decodeMoodFromDb(encoded, TEST_ENCRYPTION_KEY);
    console.log(`  Decoded mood: "${decoded}"`);
    
    if (decoded === originalMood) {
      console.log('  ✅ Test 1 PASSED\n');
      passedTests++;
    } else {
      console.log('  ❌ Test 1 FAILED: Decoded mood does not match original\n');
    }
  } catch (error) {
    console.log('  ❌ Test 1 FAILED with error:', error, '\n');
  }

  // Test 2: All mood definitions
  console.log('📝 Test 2: All Mood Definitions');
  totalTests++;
  
  try {
    let allPassed = true;
    
    for (const moodDef of MOOD_DEFINITIONS) {
      const encoded = await encodeMoodForDb(moodDef.label, TEST_ENCRYPTION_KEY);
      const decoded = await decodeMoodFromDb(encoded, TEST_ENCRYPTION_KEY);
      
      console.log(`  ${moodDef.emoji} "${moodDef.label}" -> "${decoded}"`);
      
      if (decoded !== moodDef.label) {
        allPassed = false;
        console.log(`    ❌ Failed: Expected "${moodDef.label}", got "${decoded}"`);
      }
    }
    
    if (allPassed) {
      console.log('  ✅ Test 2 PASSED\n');
      passedTests++;
    } else {
      console.log('  ❌ Test 2 FAILED\n');
    }
  } catch (error) {
    console.log('  ❌ Test 2 FAILED with error:', error, '\n');
  }

  // Test 3: Null and empty values
  console.log('📝 Test 3: Null and Empty Values');
  totalTests++;
  
  try {
    const testCases = [null, '', undefined];
    let allPassed = true;
    
    for (const testCase of testCases) {
      const encoded = await encodeMoodForDb(testCase as any, TEST_ENCRYPTION_KEY);
      const decoded = await decodeMoodFromDb(encoded, TEST_ENCRYPTION_KEY);
      
      console.log(`  Input: ${testCase} -> Encoded: ${encoded} -> Decoded: ${decoded}`);
      
      // For null/empty inputs, we expect empty string output
      if (testCase && decoded !== null) {
        allPassed = false;
      } else if (!testCase && encoded !== '') {
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log('  ✅ Test 3 PASSED\n');
      passedTests++;
    } else {
      console.log('  ❌ Test 3 FAILED\n');
    }
  } catch (error) {
    console.log('  ❌ Test 3 FAILED with error:', error, '\n');
  }

  // Test 4: Legacy mood values
  console.log('📝 Test 4: Legacy Mood Values');
  totalTests++;
  
  try {
    const legacyMoods = ['happy', 'sad', 'neutral', 'very happy', 'angry'];
    let allPassed = true;
    
    for (const legacyMood of legacyMoods) {
      // Simulate decoding legacy plain text mood
      const decoded = await decodeMoodFromDb(legacyMood, TEST_ENCRYPTION_KEY);
      console.log(`  Legacy "${legacyMood}" -> "${decoded}"`);
      
      if (!decoded) {
        allPassed = false;
        console.log(`    ❌ Failed to decode legacy mood: "${legacyMood}"`);
      }
    }
    
    if (allPassed) {
      console.log('  ✅ Test 4 PASSED\n');
      passedTests++;
    } else {
      console.log('  ❌ Test 4 FAILED\n');
    }
  } catch (error) {
    console.log('  ❌ Test 4 FAILED with error:', error, '\n');
  }

  // Test 5: Mood utilities
  console.log('📝 Test 5: Mood Utilities');
  totalTests++;
  
  try {
    const allMoods = getAllMoods();
    console.log(`  Available moods: ${allMoods.length}`);
    
    for (const mood of allMoods) {
      const definition = getMoodDefinition(mood.label);
      console.log(`  ${mood.emoji} ${mood.label} - ${mood.textValue} (${mood.color})`);
      
      if (!definition || definition.id !== mood.id) {
        throw new Error(`Mood definition mismatch for ${mood.label}`);
      }
    }
    
    console.log('  ✅ Test 5 PASSED\n');
    passedTests++;
  } catch (error) {
    console.log('  ❌ Test 5 FAILED with error:', error, '\n');
  }

  // Summary
  console.log('📊 Test Summary');
  console.log(`  Passed: ${passedTests}/${totalTests}`);
  console.log(`  Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('  🎉 All tests passed! Mood system is ready to use.');
  } else {
    console.log('  ⚠️  Some tests failed. Please review the implementation.');
  }
}

// Export the test function so it can be imported and run
export default testMoodEncoding;

// If this file is run directly, execute the tests
if (typeof require !== 'undefined' && require.main === module) {
  testMoodEncoding().catch(console.error);
}
