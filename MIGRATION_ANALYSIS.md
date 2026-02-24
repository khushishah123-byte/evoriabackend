# MongoDB to Firebase Migration Analysis

## 📊 Current Architecture Overview

### Database: MongoDB
- **Connection**: MongoDB Atlas (mongoose ODM)
- **Collections**: 
  - `users` - User data with authentication
  - `events` - Event bookings
  - `cancelevents` - Event cancellation requests

### Key Technologies:
- **ORM**: Mongoose
- **Auth**: JWT (Access & Refresh tokens)
- **File Upload**: Cloudinary
- **API Framework**: Express.js
- **Email/PDF**: Custom utilities

---

## 🔄 Migration Strategy: MongoDB → Firebase

### **Phase 1: Architecture Changes**

#### Old Stack (MongoDB):
```
Express → Mongoose → MongoDB
         ↓
    Model-based ODM with schema validation
```

#### New Stack (Firebase):
```
Express → Firebase Admin SDK → Firestore
         ↓
    Document-based NoSQL with real-time capabilities
```

---

## 📋 Data Structure Migration

### **1. Users Collection**
#### MongoDB Schema:
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  phone: String,
  address: String,
  refreshToken: String,
  role: String (enum: 'admin', 'user'),
  createdAt: Date,
  updatedAt: Date
}
```

#### Firestore Collection:
```javascript
/users/{userId}
{
  username: String,
  email: String,
  phoneNumber: String,
  address: String,
  role: String,
  lastLogin: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // Note: Password handled by Firebase Authentication
}
```

---

### **2. Events Collection**
#### MongoDB Schema:
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref to User),
  eventType: String,
  eventDate: Date,
  eventTime: String,
  numOFMembers: String,
  numOfPeopleEating: Number,
  venue: String,
  totalPrice: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Firestore Collection:
```javascript
/events/{eventId}
{
  userId: String,
  eventType: String,
  eventDate: Timestamp,
  eventTime: String,
  numOfMembers: String,
  numOfPeopleEating: Number,
  venue: String,
  totalPrice: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### **3. Cancel Events Collection**
#### MongoDB Schema:
```javascript
{
  _id: ObjectId,
  eventId: ObjectId (ref to Event),
  reason: String,
  progress: String (enum: 'underprocess', 'approved', 'rejected'),
  createdAt: Date,
  updatedAt: Date
}
```

#### Firestore Collection:
```javascript
/cancelRequests/{cancelId}
{
  eventId: String,
  reason: String,
  status: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔑 Key Migration Points

### Authentication Changes:
- **MongoDB/JWT**: Manual token generation and management
- **Firebase**: Use Firebase Authentication (uid-based, secure by default)
- **Action Required**: Replace login/register logic with Firebase Auth SDK

### Database Queries:
| MongoDB | Firestore |
|---------|-----------|
| `Model.findById(id)` | `db.collection('users').doc(id).get()` |
| `Model.find({...})` | `db.collection('users').where(...).get()` |
| `Model.create({...})` | `db.collection('users').doc(id).set({...})` |
| `Model.updateOne()` | `db.collection('users').doc(id).update({...})` |
| `Model.deleteOne()` | `db.collection('users').doc(id).delete()` |

### File References:
- **Models**: Replace with Firestore collection structure (delete model files)
- **Controllers**: Update all database queries to Firestore SDK
- **Middleware**: Update auth middleware to use Firebase tokens
- **Routes**: No changes needed (same endpoints)

---

## 📁 Files to Modify

### 🗑️ **To Delete:**
1. `src/db/index.js` - MongoDB connection
2. `src/models/user.models.js` - Mongoose schema
3. `src/models/event.models.js` - Mongoose schema
4. `src/models/cancelEvent.models.js` - Mongoose schema

### ✏️ **To Create/Update:**
1. **NEW**: `src/db/firebase.js` - Firebase initialization & helper functions
2. **NEW**: `src/services/userService.js` - User database operations
3. **NEW**: `src/services/eventService.js` - Event database operations
4. **UPDATE**: `src/controllers/user.controllers.js` - Use Firebase auth & services
5. **UPDATE**: `src/controllers/event.controllers.js` - Use Firestore queries
6. **UPDATE**: `src/middlewares/auth.middleware.js` - Firebase token verification
7. **UPDATE**: `src/index.js` - Remove MongoDB connection, add Firebase init
8. **UPDATE**: `src/app.js` - Update configuration
9. **UPDATE**: `package.json` - Replace mongoose with Firebase SDK
10. **UPDATE**: `.env` - Firebase credentials

---

## 🎯 Implementation Order

1. ✅ Install Firebase Admin SDK
2. ✅ Setup Firebase initialization
3. ✅ Create database service layer (userService, eventService)
4. ✅ Update authentication middleware
5. ✅ Migrate user controller
6. ✅ Migrate event controller
7. ✅ Update routes
8. ✅ Update environment variables
9. ✅ Testing & validation

---

## ⚠️ Important Considerations

### Security:
- ✓ Firebase handles password hashing automatically
- ✓ JWT tokens replaced with Firebase tokens
- ✓ Use Firebase Security Rules for data access control

### Performance:
- Firestore has different indexing strategy (auto-indexed for simple queries)
- Complex queries might need composite indexes
- Real-time listeners available (if frontend needs them)

### Data Migration:
- Export MongoDB data
- Transform to Firestore format
- Import to Firebase Console or via admin SDK

### Backwards Compatibility:
- API endpoints remain the same
- Response structure can stay similar
- Client code doesn't need changes

---

## 💾 Firebase Project Setup

Your provided credentials:
```
Project ID: evoria-5f339
Service Account: firebase-adminsdk-fbsvc@evoria-5f339.iam.gserviceaccount.com
```

The `.json` file you provided should be:
1. Kept secure (never commit to git)
2. Added to `.env` or `.env.local`
3. Used only on the backend

---

## 📝 Next Steps

Ready to begin migration implementation? I'll:
1. Create Firebase service layer
2. Update all controllers to use Firestore
3. Setup Firebase authentication
4. Remove all MongoDB dependencies
5. Update package.json and configuration

Let me know if you want me to proceed! 🚀
