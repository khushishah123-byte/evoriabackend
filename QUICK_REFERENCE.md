# Quick Reference: Firebase Migrated Backend

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup Firebase
# Copy your firebase-adminsdk-key.json file to project root
# OR set FIREBASE_CREDENTIALS in .env

# 3. Configure .env
export FIREBASE_KEY_PATH=./firebase-adminsdk-key.json
export PORT=3000

# 4. Start server
npm run dev
```

---

## 📁 Directory Structure (Changes)

```
src/
├── db/
│   ├── firebase.js          ✨ NEW - Firebase init
│   └── index.js             ❌ DELETED - MongoDB connector
├── services/                ✨ NEW - Firestore operations
│   ├── userService.js
│   ├── eventService.js
│   └── cancelEventService.js
├── models/
│   ├── user.models.js       ❌ DELETED
│   ├── event.models.js      ❌ DELETED
│   └── cancelEvent.models.js ❌ DELETED
├── controllers/
│   ├── event.controllers.js  ✅ UPDATED - Uses services
│   └── user.controllers.js   ⚠️ TODO - Needs Firebase auth update
├── middlewares/
│   └── auth.middleware.js    ✅ UPDATED - Firebase token verification
├── routes/
│   ├── event.routes.js
│   └── users.routes.js
├── utils/
│   ├── ApiResponse.js
│   ├── ApiError.js
│   └── asyncHandler.js
├── app.js                    ✅ No changes needed
└── index.js                  ✅ UPDATED - Firebase instead of MongoDB
```

---

## 🔄 Common Operations

### Getting Data

```javascript
// Import the service
import * as eventService from "../services/eventService.js";

// Get single event
const event = await eventService.getEventById(eventId);

// Get all events by user
const userEvents = await eventService.getEventsByUserId(userId);

// Get events by category
const categoryEvents = await eventService.getEventsByCategory("Wedding");

// Check event conflict
const hasConflict = await eventService.checkEventConflict(
  venue, 
  eventDate, 
  eventTime
);
```

### Creating Data

```javascript
import * as eventService from "../services/eventService.js";

// Create event
const newEvent = await eventService.createEvent({
  userId: "user-id-123",
  eventType: "Wedding",
  eventDate: new Date("2024-12-25"),
  eventTime: "18:00",
  numOfMembers: "50",
  numOfPeopleEating: 40,
  venue: "Grand Hotel",
  totalPrice: "5000"
});
```

### Updating Data

```javascript
import * as eventService from "../services/eventService.js";

// Update event
const updated = await eventService.updateEvent(eventId, {
  eventTime: "19:00",
  numOfPeopleEating: 45
});
```

### Deleting Data

```javascript
import * as eventService from "../services/eventService.js";

// Delete event (also deletes associated cancel requests)
await eventService.deleteEvent(eventId);
```

---

## 🔐 Authentication

### Middleware Usage

```javascript
import { verfiyJWT } from "../middlewares/auth.middleware.js";

// Protected route
router.get("/profile", verfiyJWT, getCurrentUser);
```

### Getting User ID from Protected Route

```javascript
export const someProtectedRoute = asyncHandler(async (req, res) => {
  const userId = req.userId;  // From verified Firebase token
  const user = req.user;       // Full user object from Firestore
  
  // Your logic here
});
```

---

## 📊 Database Queries

### Firestore vs MongoDB

| Operation | MongoDB | Firestore |
|-----------|---------|-----------|
| Get by ID | `Model.findById(id)` | `eventService.getEventById(id)` |
| Find one | `Model.findOne({email})` | `userService.getUserByEmail(email)` |
| Find many | `Model.find({type})` | `eventService.getEventsByCategory(type)` |
| Create | `Model.create({})` | `eventService.createEvent({})` |
| Update | `Model.updateOne()` | `eventService.updateEvent(id, {})` |
| Delete | `Model.deleteOne()` | `eventService.deleteEvent(id)` |

---

## ✅ Endpoint Examples

### Event Endpoints

```javascript
// Create event
POST /events/register
Body: {
  userId: "user-123",
  eventType: "Wedding",
  eventDate: "2024-12-25",
  eventTime: "18:00",
  numOFMembers: "50",
  numOfPeopleEating: 40,
  venue: "Grand Hotel",
  totalPrice: "5000"
}

// Get event
POST /events/get-event
Body: { id: "event-123" }

// Get all events by category
POST /events/get-events
Body: { eventType: "Wedding" }

// Update event
PUT /events/update-event
Body: {
  id: "event-123",
  userId: "user-123",
  eventType: "Birthday",
  numOfPeopleEating: 50
}

// Delete event
DELETE /events/delete-event
Body: { id: "event-123" }

// Get user events
POST /events/user-events
Body: { userId: "user-123" }
```

---

## 🐛 Common Issues & Solutions

### "Firebase credentials not found"
```javascript
// Solution: Set in .env
FIREBASE_CREDENTIALS='{"type":"service_account",...}'
// OR
FIREBASE_KEY_PATH=./firebase-adminsdk-key.json
```

### "Firestore query requires index"
```javascript
// Solution: Go to Firebase Console → Firestore → Indexes
// Create composite index as suggested in error message
```

### "User not found"
```javascript
// Make sure user exists in Firestore collection
// Check if userId matches between Firestore and auth records
```

### "Token verification failed"
```javascript
// Token may be expired - client should refresh
// Check token format: should start with "eyJ"
// Verify Authorization header format: "Bearer {token}"
```

---

## 📝 Environment Variables

```bash
# Firebase
FIREBASE_CREDENTIALS='...'  # OR FIREBASE_KEY_PATH=...
PORT=3000

# Google (Generative AI)
GAPI_KEY=your-key

# Cloudinary (file uploads)
api_key=your-key
api_secret=your-secret
cloud_name=your-cloud
```

---

## 🔗 Database Collections

### Firestore Structure

```
database/
├── users/
│   ├── {userId}/
│   │   ├── username
│   │   ├── email
│   │   ├── phoneNumber
│   │   ├── address
│   │   ├── role
│   │   ├── createdAt
│   │   └── updatedAt
│
├── events/
│   ├── {eventId}/
│   │   ├── userId
│   │   ├── eventType
│   │   ├── eventDate
│   │   ├── eventTime
│   │   ├── numOfMembers
│   │   ├── numOfPeopleEating
│   │   ├── venue
│   │   ├── totalPrice
│   │   ├── createdAt
│   │   └── updatedAt
│
└── cancelRequests/
    ├── {cancelId}/
    │   ├── eventId
    │   ├── reason
    │   ├── status
    │   ├── createdAt
    │   └── updatedAt
```

---

## 📚 Service Functions Reference

### userService

```javascript
// Create user
createUser(userId, userData)

// Get user
getUserById(userId)
getUserByEmail(email)

// Update user
updateUser(userId, updateData)

// Delete user
deleteUser(userId)

// Check existence
userExists(userId)

// Get all users
getAllUsers(limit)

// Get safe data (no sensitive fields)
getUserSafeData(userId)
```

### eventService

```javascript
// CRUD operations
createEvent(eventData)
getEventById(eventId)
updateEvent(eventId, updateData)
deleteEvent(eventId)

// Queries
getEventsByUserId(userId)
getEventsByCategory(eventType)
getAllEvents()

// Analysis
getEventCountsByCategory()
checkEventConflict(venue, eventDate, eventTime)

// With user details
getEventWithUser(eventId, getUserById)
```

### cancelEventService

```javascript
// CRUD operations
createCancelRequest(eventId, reason)
getCancelRequestById(cancelId)
deleteCancelRequest(cancelId)

// Queries
getCancelRequestByEventId(eventId)
getAllCancelRequests()

// Status updates
updateCancelRequestStatus(cancelId, status)
approveCancelRequest(cancelId)
rejectCancelRequest(cancelId)

// Formatted data
getAllCancelRequestsFormatted(getEventById, getUserById)
```

---

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Setup Firebase credentials
3. ✅ Update `.env` file
4. ⚠️ **Update user controller** (see USER_MIGRATION.md)
5. ⚠️ **Delete old MongoDB model files**
6. ✅ Test endpoints with Postman
7. ✅ Update client app with Firebase SDK
8. ✅ Deploy!

---

## 📞 Need Help?

- **Setup issues**: See `FIREBASE_SETUP.md`
- **User auth**: See `USER_MIGRATION.md`
- **Architecture**: See `MIGRATION_ANALYSIS.md`
- **Summary**: See `MIGRATION_SUMMARY.md`

