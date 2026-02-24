#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config();

console.log('\n');
console.log('╔' + '='.repeat(58) + '╗');
console.log('║' + ' '.repeat(15) + 'Firebase Firestore Setup Script' + ' '.repeat(14) + '║');
console.log('║' + ' '.repeat(16) + 'Evoria Backend Migration' + ' '.repeat(18) + '║');
console.log('╚' + '='.repeat(58) + '╝\n');

// Step 1: Load Firebase credentials from .env
console.log('📂 Step 1: Loading Firebase credentials from .env...');

let credentialsJson;
try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Extract JSON from .env  
  const jsonMatch = envContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not find Firebase credentials JSON in .env');
  }
  
  credentialsJson = JSON.parse(jsonMatch[0]);
  console.log('✓ Firebase credentials loaded successfully');
  console.log(`   Project ID: ${credentialsJson.project_id}`);
} catch (error) {
  console.error('❌ Failed to load Firebase credentials:', error.message);
  process.exit(1);
}

// Step 2: Initialize Firebase
console.log('\n🔥 Step 2: Initializing Firebase Admin SDK...');

try {
  admin.initializeApp({
    credential: admin.credential.cert(credentialsJson),
  });
  console.log('✓ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Step 3: Create collections
console.log('\n📚 Step 3: Creating Firestore collections...\n');

async function createCollections() {
  try {
    // Collection 1: users
    console.log("📝 Creating 'users' collection...");
    const usersRef = db.collection('users').doc('_schema');
    await usersRef.set({
      username: 'sample_user',
      email: 'sample@example.com',
      phoneNumber: '+1234567890',
      address: 'Sample Address',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("   ✓ 'users' collection created with schema document\n");

    // Collection 2: events
    console.log("📝 Creating 'events' collection...");
    const eventsRef = db.collection('events').doc('_schema');
    await eventsRef.set({
      userId: 'sample-user-id',
      eventType: 'Wedding',
      eventDate: new Date(),
      eventTime: '18:00',
      numOfMembers: '50',
      numOfPeopleEating: 40,
      venue: 'Sample Venue',
      totalPrice: '5000',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("   ✓ 'events' collection created with schema document\n");

    // Collection 3: cancelRequests
    console.log("📝 Creating 'cancelRequests' collection...");
    const cancelRef = db.collection('cancelRequests').doc('_schema');
    await cancelRef.set({
      eventId: 'sample-event-id',
      reason: 'Sample reason for cancellation',
      status: 'underprocess',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("   ✓ 'cancelRequests' collection created with schema document\n");

    // Step 4: Verify collections
    console.log('✓ Step 4: Verifying collections...\n');
    console.log('='.repeat(60));
    console.log('Verifying Collections');
    console.log('='.repeat(60) + '\n');

    const collectionsSnapshot = await db.listCollections();
    const collectionNames = collectionsSnapshot.map(col => col.id).sort();

    if (collectionNames.length === 0) {
      console.error('❌ No collections found in Firestore');
      process.exit(1);
    }

    console.log(`✓ Found ${collectionNames.length} collection(s):\n`);
    collectionNames.forEach(name => {
      console.log(`   ✓ ${name}`);
    });

    // Check for required collections
    const required = new Set(['users', 'events', 'cancelRequests']);
    const found = new Set(collectionNames);
    const missing = [...required].filter(col => !found.has(col));

    if (missing.length > 0) {
      console.error(`\n❌ Missing collections: ${missing.join(', ')}`);
      process.exit(1);
    }

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✓ Firebase Setup Complete!');
    console.log('='.repeat(60));
    console.log('\n✓ All collections have been created successfully:');
    console.log('   • users');
    console.log('   • events');
    console.log('   • cancelRequests');
    console.log('\n✓ Your Firestore database is ready to use!');
    console.log('✓ You can now run: npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating collections:', error.message);
    process.exit(1);
  }
}

// Run the setup
createCollections().catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});
