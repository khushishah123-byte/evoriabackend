#!/usr/bin/env python3
"""
Firebase Firestore Collections Setup Script
Automatically creates all required collections for Evoria Backend
"""

import json
import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Load Firebase credentials from .env
def load_firebase_credentials():
    """Load Firebase credentials from .env file"""
    env_path = '.env'
    
    if not os.path.exists(env_path):
        print("❌ Error: .env file not found")
        return None
    
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract JSON from .env (it's at the beginning of the file)
    try:
        # Find the JSON object in the file
        json_start = content.find('{')
        json_end = content.find('}', json_start) + 1
        
        if json_start == -1:
            print("❌ Error: Could not find Firebase credentials in .env")
            return None
        
        json_str = content[json_start:json_end]
        creds_dict = json.loads(json_str)
        return creds_dict
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing Firebase credentials: {e}")
        return None

def initialize_firebase(creds_dict):
    """Initialize Firebase Admin SDK"""
    try:
        # Check if Firebase app is already initialized
        try:
            firebase_admin.get_app()
            print("✓ Firebase app already initialized")
            return True
        except ValueError:
            # App not initialized, initialize it
            cred = credentials.Certificate(creds_dict)
            firebase_admin.initialize_app(cred)
            print("✓ Firebase initialized successfully")
            return True
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        return False

def create_collections():
    """Create all required Firestore collections"""
    db = firestore.client()
    
    print("\n" + "="*60)
    print("Creating Firestore Collections")
    print("="*60 + "\n")
    
    # Collection 1: users
    print("📝 Creating 'users' collection...")
    try:
        # Create a sample user document to initialize the collection
        users_ref = db.collection('users').document('SAMPLE_USER')
        users_ref.set({
            'username': 'sample_user',
            'email': 'sample@example.com',
            'phoneNumber': '+1234567890',
            'address': 'Sample Address',
            'role': 'user',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        })
        print("   ✓ 'users' collection created")
        print("   ✓ Sample document created")
        
        # Delete the sample document
        users_ref.delete()
        print("   ✓ Sample document removed\n")
    except Exception as e:
        print(f"   ❌ Error creating users collection: {e}\n")
        return False
    
    # Collection 2: events
    print("📝 Creating 'events' collection...")
    try:
        events_ref = db.collection('events').document('SAMPLE_EVENT')
        events_ref.set({
            'userId': 'sample-user-id',
            'eventType': 'Wedding',
            'eventDate': datetime.now(),
            'eventTime': '18:00',
            'numOfMembers': '50',
            'numOfPeopleEating': 40,
            'venue': 'Sample Venue',
            'totalPrice': '5000',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        })
        print("   ✓ 'events' collection created")
        print("   ✓ Sample document created")
        
        # Delete the sample document
        events_ref.delete()
        print("   ✓ Sample document removed\n")
    except Exception as e:
        print(f"   ❌ Error creating events collection: {e}\n")
        return False
    
    # Collection 3: cancelRequests
    print("📝 Creating 'cancelRequests' collection...")
    try:
        cancel_ref = db.collection('cancelRequests').document('SAMPLE_CANCEL')
        cancel_ref.set({
            'eventId': 'sample-event-id',
            'reason': 'Sample reason for cancellation',
            'status': 'underprocess',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        })
        print("   ✓ 'cancelRequests' collection created")
        print("   ✓ Sample document created")
        
        # Delete the sample document
        cancel_ref.delete()
        print("   ✓ Sample document removed\n")
    except Exception as e:
        print(f"   ❌ Error creating cancelRequests collection: {e}\n")
        return False
    
    return True

def verify_collections():
    """Verify that all collections were created"""
    db = firestore.client()
    
    print("="*60)
    print("Verifying Collections")
    print("="*60 + "\n")
    
    collections = db.collections()
    collection_names = [col.id for col in collections]
    
    if not collection_names:
        print("❌ No collections found in Firestore")
        return False
    
    print(f"✓ Found {len(collection_names)} collection(s):\n")
    for name in sorted(collection_names):
        print(f"   ✓ {name}")
    
    # Check for required collections
    required = {'users', 'events', 'cancelRequests'}
    found = set(collection_names)
    
    missing = required - found
    if missing:
        print(f"\n❌ Missing collections: {', '.join(missing)}")
        return False
    
    print(f"\n✓ All required collections are present!\n")
    return True

def main():
    """Main setup function"""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*15 + "Firebase Firestore Setup Script" + " "*14 + "║")
    print("║" + " "*16 + "Evoria Backend Migration" + " "*18 + "║")
    print("╚" + "="*58 + "╝")
    
    # Step 1: Load credentials
    print("\n📂 Step 1: Loading Firebase credentials from .env...")
    creds_dict = load_firebase_credentials()
    if not creds_dict:
        print("❌ Failed to load Firebase credentials")
        return False
    print("✓ Firebase credentials loaded successfully")
    print(f"   Project ID: {creds_dict.get('project_id', 'N/A')}")
    
    # Step 2: Initialize Firebase
    print("\n🔥 Step 2: Initializing Firebase Admin SDK...")
    if not initialize_firebase(creds_dict):
        print("❌ Failed to initialize Firebase")
        return False
    
    # Step 3: Create collections
    print("\n📚 Step 3: Creating Firestore collections...")
    if not create_collections():
        print("❌ Failed to create collections")
        return False
    
    # Step 4: Verify collections
    print("\n✓ Step 4: Verifying collections...")
    if not verify_collections():
        print("❌ Verification failed")
        return False
    
    # Success!
    print("\n" + "="*60)
    print("✓ Firebase Setup Complete!")
    print("="*60)
    print("\n✓ All collections have been created successfully:")
    print("   • users")
    print("   • events")
    print("   • cancelRequests")
    print("\n✓ Your Firestore database is ready to use!")
    print("✓ You can now run: npm run dev\n")
    
    return True

if __name__ == '__main__':
    try:
        success = main()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        exit(1)
