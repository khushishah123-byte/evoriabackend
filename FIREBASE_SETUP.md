# Firebase Migration Setup Guide

## 🎯 Complete Steps to Run the Migrated Backend

### Step 1: Install Dependencies

```bash
npm install
```

This will install firebase-admin and remove mongoose dependency.

### Step 2: Setup Firebase Credentials

You have two options:

#### Option A: Using Environment Variable (Recommended for Production)

1. Take your Firebase service account JSON file (already provided)
2. Convert it to a JSON string
3. Add to `.env`:

```bash
FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"evoria-5f339","private_key_id":"af576ecbb9...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk-fbsvc@evoria-5f339.iam.gserviceaccount.com",...}'
```

#### Option B: Using File Path (Simpler for Development)

1. Save the Firebase JSON file in your project root as: `firebase-adminsdk-key.json`
2. Add to `.env`:

```bash
FIREBASE_KEY_PATH=./firebase-adminsdk-key.json
```

⚠️ **Important**: Never commit the firebase key file to git! Add to `.gitignore`:

```
firebase-adminsdk-key.json
.env.local
.env
```

### Step 3: Configure Environment Variables

Update `.env` file with:

```bash
# Firebase (use one of the options above)
FIREBASE_CREDENTIALS=... # OR FIREBASE_KEY_PATH=...

# Server
PORT=3000

# Google API (for Generative AI)
GAPI_KEY=your-api-key

# Cloudinary (for uploads)
api_key=your-key
api_secret=your-secret
cloud_name=your-cloud-name
```

### Step 4: Start the Server

```bash
npm run dev
```

You should see:
```
Firebase initialized successfully
Server is running on port: 3000
```

---

## 🔄 Key Changes from MongoDB to Firebase

### Authentication
- **Before**: Custom JWT tokens with manual password hashing
- **After**: Firebase Authentication (uid-based, secure by default)
- **API Change**: Login/Register endpoints now use Firebase

### Database Queries
- **Before**: Mongoose models
- **After**: Firestore services in `src/services/`

### Collections Structure

#### Users
```
/users/{userId}
- username
- email
- phoneNumber
- address
- role
- createdAt
- updatedAt
```

#### Events
```
/events/{eventId}
- userId (instead of user reference)
- eventType
- eventDate
- eventTime
- numOfMembers
- numOfPeopleEating
- venue
- totalPrice
- createdAt
- updatedAt
```

#### Cancel Requests
```
/cancelRequests/{cancelId}
- eventId
- reason
- status (underprocess/approved/rejected)
- createdAt
- updatedAt
```

---

## 🔐 Security Notes

1. **Never expose** Firebase credentials in public code
2. **Use Environment Variables** for all sensitive data
3. **Set up Firestore Security Rules** in Firebase Console:
   - Restrict read/write to authenticated users
   - Use custom claims for admin access
4. **Enable Firebase Authentication** methods needed (email/password, etc.)

---

## 📝 Firestore Security Rules (Set in Firebase Console)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth != null; // admins can see all
    }
    
    // Events are readable by all authenticated users
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Cancel requests - admins only
    match /cancelRequests/{cancelId} {
      allow read: if hasAdminRole();
      allow write: if hasAdminRole();
    }
  }
  
  function hasAdminRole() {
    return request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  }
}
```

---

## 🚀 Next Steps

1. ✅ Install dependencies with `npm install`
2. ✅ Setup Firebase credentials
3. ✅ Configure .env file
4. ✅ Update user controller with Firebase Auth methods (see USER_MIGRATION.md)
5. ✅ Test endpoints with Postman/Insomnia
6. ✅ Deploy to production

---

## 📚 Useful Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)

---

## ❓ Troubleshooting

### "Firebase credentials not found"
- Check that FIREBASE_CREDENTIALS or FIREBASE_KEY_PATH is set in .env
- Verify the JSON is valid (use JSON validator)

### "Firestore query failed"
- Ensure Firestore Database is created in Firebase Console
- Check security rules are not blocking access
- Verify indexes are created for complex queries

### "Token verification failed"
- Token may be expired (Firebase auth tokens expire after 1 hour)
- Client should refresh token using Firebase SDK
- Check token format is correct (should start with "eyJ")

