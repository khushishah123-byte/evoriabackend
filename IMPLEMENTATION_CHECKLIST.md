# Firebase Migration Implementation Checklist

## Pre-Migration Checklist

- [ ] Backup your MongoDB data (export to JSON)
- [ ] Backup your `.env` file
- [ ] Create a new branch: `git checkout -b firebase-migration`
- [ ] Read `MIGRATION_ANALYSIS.md` to understand changes
- [ ] Review this checklist completely before starting

---

## Step 1: Install Dependencies

- [ ] Run: `npm install`
- [ ] Verify firebase-admin is installed: `npm list firebase-admin`
- [ ] Verify mongoose is removed: `npm list mongoose` (should show `-- empty --`)

**Command:**
```bash
npm install
```

---

## Step 2: Setup Firebase Project (Console)

- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Create new project or select `evoria-5f339`
- [ ] Enable Firestore Database:
  - [ ] Click "Build" → "Firestore Database"
  - [ ] Choose "Start in production mode"
  - [ ] Select region (us-central1 recommended)
- [ ] Enable Authentication:
  - [ ] Click "Build" → "Authentication"
  - [ ] Click "Get Started"
  - [ ] Enable Email/Password method
- [ ] Download Service Account Key:
  - [ ] Go to Settings ⚙️ → Service Accounts
  - [ ] Click "Generate New Private Key"
  - [ ] Save to `firebase-adminsdk-key.json` (NEVER commit this!)

---

## Step 3: Configure Environment Variables

- [ ] Open `.env` file
- [ ] Add one of:

**Option A: File Path (Development)**
```bash
FIREBASE_KEY_PATH=./firebase-adminsdk-key.json
PORT=3000
GAPI_KEY=your-api-key
api_key=your-cloudinary-key
api_secret=your-cloudinary-secret
cloud_name=your-cloudinary-cloud
```

**Option B: JSON String (Production)**
```bash
# Copy entire JSON and paste as string
FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"evoria-5f339",...}'
PORT=3000
```

- [ ] Add to `.gitignore`:
```
firebase-adminsdk-key.json
.env
.env.local
node_modules/
```

---

## Step 4: Test Firebase Connection

```bash
# Start the server
npm run dev

# You should see:
# "Firebase initialized successfully"
# "Server is running on port: 3000"
```

- [ ] Server starts without MongoDB errors
- [ ] No "Firebase credentials not found" error
- [ ] No Firestore connection errors

---

## Step 5: Create Firestore Collections

Go to Firebase Console → Firestore Database and create these collections:

### Collection 1: users

```
Collection: users
Document: {userId}
Fields:
- username (string)
- email (string)
- phoneNumber (string)
- address (string)
- role (string) - "user" or "admin"
- createdAt (timestamp)
- updatedAt (timestamp)
```

- [ ] Create `users` collection

### Collection 2: events

```
Collection: events
Document: {eventId}
Fields:
- userId (string) - reference to user
- eventType (string)
- eventDate (timestamp)
- eventTime (string)
- numOfMembers (string)
- numOfPeopleEating (number)
- venue (string)
- totalPrice (string)
- createdAt (timestamp)
- updatedAt (timestamp)
```

- [ ] Create `events` collection
- [ ] Create index on: userId + eventDate (descending)

### Collection 3: cancelRequests

```
Collection: cancelRequests
Document: {cancelId}
Fields:
- eventId (string) - reference to event
- reason (string)
- status (string) - "underprocess", "approved", "rejected"
- createdAt (timestamp)
- updatedAt (timestamp)
```

- [ ] Create `cancelRequests` collection

---

## Step 6: Test Event Controller

### Test Create Event

```bash
curl -X POST http://localhost:3000/events/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "eventType": "Wedding",
    "eventDate": "2024-12-25",
    "eventTime": "18:00",
    "numOFMembers": "50",
    "numOfPeopleEating": 40,
    "venue": "Grand Hotel",
    "totalPrice": "5000"
  }'
```

- [ ] Event created successfully
- [ ] Event appears in Firestore console

### Test Get Event

```bash
curl -X POST http://localhost:3000/events/get-event \
  -H "Content-Type: application/json" \
  -d '{ "id": "EVENT_ID_FROM_CREATE" }'
```

- [ ] Event retrieval works
- [ ] Data matches what was created

### Test Get Events by Category

```bash
curl -X POST http://localhost:3000/events/get-events \
  -H "Content-Type: application/json" \
  -d '{ "eventType": "Wedding" }'
```

- [ ] Category filter works
- [ ] Returns correct events

### Test Event Counts

```bash
curl -X GET http://localhost:3000/events/event-counts
```

- [ ] Returns count by category
- [ ] "All Events" total is correct

---

## Step 7: Update User Controller (IMPORTANT!)

This is the critical step that requires code changes.

- [ ] Read `USER_MIGRATION.md` completely
- [ ] Update `src/controllers/user.controllers.js` with Firebase auth
  - [ ] Replace `registerUser` function
  - [ ] Replace `loginUser` function  
  - [ ] Replace `logoutUser` function
  - [ ] Add `getCurrentUser` function
  - [ ] Add `updateUserProfile` function
  - [ ] Update imports to use `auth` and `userService`
  - [ ] Remove JWT token generation

**Reference Implementation:** See USER_MIGRATION.md for complete code

---

## Step 8: Test User Authentication

### Test Register

```bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "username": "testuser",
    "phone": "1234567890",
    "address": "123 Main St"
  }'
```

- [ ] User created in Firebase Authentication
- [ ] User profile created in Firestore
- [ ] Response contains user data

### Test Login

- [ ] Use Firebase Console → Authentication to verify user exists
- [ ] Update frontend to use Firebase SDK for login
- [ ] Frontend gets Firebase ID token
- [ ] Send token in Authorization header

---

## Step 9: Delete Old MongoDB Files

IMPORTANT: Only delete after confirming everything works!

```bash
# Delete these files:
rm src/models/user.models.js
rm src/models/event.models.js
rm src/models/cancelEvent.models.js
rm src/db/index.js

# Remove mongoose dependency
npm uninstall mongoose mongoose-aggregate-paginate-v2
```

- [ ] Confirm files are deleted
- [ ] No imports reference deleted files
- [ ] Run `npm run dev` - server still starts

---

## Step 10: Test All Endpoints

Using Postman or similar tool, test:

### Events Routes
- [ ] POST `/events/register` - Create event
- [ ] POST `/events/get-event` - Get single event
- [ ] POST `/events/get-events` - Get events by category
- [ ] GET `/events/event-counts` - Get event statistics
- [ ] POST `/events/user-events` - Get user's events
- [ ] PUT `/events/update-event` - Update event
- [ ] DELETE `/events/delete-event` - Delete event
- [ ] POST `/events/cancel-event` - Request cancellation
- [ ] POST `/events/get-cancelled-events` - Get cancellations
- [ ] POST `/events/approve-cancel` - Approve cancellation

### User Routes
- [ ] POST `/users/register` - Register user
- [ ] POST `/users/login` - Login user (verify token returned)
- [ ] POST `/users/logout` - Logout user
- [ ] GET `/users/profile` (with auth header) - Get current user

---

## Step 11: Setup Firestore Security Rules

Go to Firestore → Rules and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // All authenticated users can read events
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    // Only admins can manage cancel requests
    match /cancelRequests/{cancelId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

- [ ] Security rules published
- [ ] Test with unauthorized access (should be blocked)

---

## Step 12: Update Client App (Frontend)

- [ ] Install Firebase SDK: `npm install firebase`
- [ ] Initialize Firebase in client app
- [ ] Update login form to use `signInWithEmailAndPassword()`
- [ ] Update register form to use `createUserWithEmailAndPassword()`
- [ ] Get ID token: `await user.getIdToken()`
- [ ] Send token in Authorization header: `Authorization: Bearer {idToken}`
- [ ] Handle token expiration and refresh

See USER_MIGRATION.md for detailed client-side code.

---

## Step 13: Data Migration from MongoDB (Optional)

If you need to migrate existing data:

```bash
# Export from MongoDB
mongoexport --uri="your-mongodb-uri" --collection users --out users.json
mongoexport --uri="your-mongodb-uri" --collection events --out events.json

# Then import to Firestore using a migration script
# (See FIREBASE_SETUP.md for example script)
```

- [ ] Export MongoDB data
- [ ] Transform data format if needed
- [ ] Import to Firestore using Admin SDK or Firebase CLI
- [ ] Verify data integrity

---

## Step 14: Final Testing

- [ ] All endpoints tested and working
- [ ] No console errors
- [ ] Database operations logged correctly
- [ ] Authentication flow complete
- [ ] Error handling works
- [ ] Security rules prevent unauthorized access
- [ ] Performance acceptable

---

## Step 15: Deploy

```bash
# Commit changes
git add .
git commit -m "Migrate from MongoDB to Firebase Firestore"

# Push to repository
git push origin firebase-migration

# Create pull request
# Get code review
# Merge to main
# Deploy to production
```

- [ ] All code reviewed
- [ ] Tests passing
- [ ] Environment variables set in production
- [ ] Firebase project configured in production
- [ ] Monitoring set up for Firestore
- [ ] Backup of MongoDB data maintained
- [ ] Deployed successfully

---

## Post-Migration Checklist

- [ ] Monitor Firestore for performance
- [ ] Check Firebase Console for errors
- [ ] Monitor billing (Firestore usage)
- [ ] Set up alerts for quota issues
- [ ] Archive MongoDB data (for reference)
- [ ] Document any custom logic changes
- [ ] Update team documentation

---

## Troubleshooting

If you encounter issues:

1. **Firebase not connecting:**
   - Check FIREBASE_CREDENTIALS or FIREBASE_KEY_PATH
   - Verify JSON is valid
   - Check Firebase project permissions

2. **Firestore queries failing:**
   - Create missing indexes (Firebase will suggest them)
   - Check security rules aren't blocking access
   - Verify collection names match

3. **Authentication failing:**
   - Ensure user exists in both Auth and Firestore
   - Check token format and expiration
   - Verify middleware is applied to route

4. **Data not showing:**
   - Check Firestore console directly
   - Verify write permissions in security rules
   - Check for timestamp conversion issues

See all documentation files for more help:
- `MIGRATION_ANALYSIS.md` - Architecture details
- `FIREBASE_SETUP.md` - Setup guide
- `USER_MIGRATION.md` - Authentication guide
- `QUICK_REFERENCE.md` - Developer reference

---

## Estimated Timeline

- Step 1-3: 15 minutes (setup)
- Step 4-6: 30 minutes (testing event controller)
- Step 7-8: 1-2 hours (user controller and frontend)
- Step 9-14: 2-3 hours (testing and deployment)
- **Total: 4-5 hours**

Good luck with your migration! 🚀

