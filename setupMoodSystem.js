#!/usr/bin/env node

/**
 * Mood System Setup and Migration Script
 * 
 * This script helps you set up and migrate to the new mood system.
 * Run with: node setupMoodSystem.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🎭 Privatium Mood System Setup\n');
  
  console.log('This script will help you migrate to the new encrypted mood system.\n');
  
  const choice = await ask('What would you like to do?\n1) Analyze current mood data\n2) Migrate mood data\n3) Verify migration\n4) Run tests\n5) Exit\n\nEnter your choice (1-5): ');
  
  switch (choice.trim()) {
    case '1':
      console.log('\n📊 Analyzing current mood data...');
      console.log('To analyze your data, run this in your Next.js app:');
      console.log('\n```typescript');
      console.log('import { analyzeMoodData } from "@/utils/moodMigration";');
      console.log('const result = await analyzeMoodData();');
      console.log('console.log(result);');
      console.log('```\n');
      break;
      
    case '2':
      console.log('\n🔄 Migration instructions...');
      console.log('To migrate your mood data, run this in your Next.js app:');
      console.log('\n```typescript');
      console.log('import { migrateMoodData } from "@/utils/moodMigration";');
      console.log('const result = await migrateMoodData();');
      console.log('console.log(result);');
      console.log('```\n');
      console.log('⚠️  Make sure to backup your database before running migration!');
      break;
      
    case '3':
      console.log('\n✅ Verification instructions...');
      console.log('To verify your migration, run this in your Next.js app:');
      console.log('\n```typescript');
      console.log('import { verifyMoodMigration } from "@/utils/moodMigration";');
      console.log('const result = await verifyMoodMigration();');
      console.log('console.log(result);');
      console.log('```\n');
      break;
      
    case '4':
      console.log('\n🧪 Test instructions...');
      console.log('To run the mood system tests, run this in your Next.js app:');
      console.log('\n```typescript');
      console.log('import testMoodEncoding from "@/tests/moodSystemTest";');
      console.log('await testMoodEncoding();');
      console.log('```\n');
      break;
      
    case '5':
      console.log('\n👋 Goodbye!');
      rl.close();
      return;
      
    default:
      console.log('\n❌ Invalid choice. Please run the script again.');
      break;
  }
  
  console.log('\n📚 For detailed documentation, see MOOD_SYSTEM.md');
  console.log('\n🔧 Next steps:');
  console.log('1. Ensure your encryption key is set in environment variables');
  console.log('2. Test the new mood system on a development database first');
  console.log('3. Run migration on production when ready');
  console.log('4. Verify all mood data displays correctly in the UI\n');
  
  rl.close();
}

main().catch(console.error);
