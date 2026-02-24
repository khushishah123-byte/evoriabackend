# User Controller Migration Guide: MongoDB/JWT → Firebase Auth

## Overview

The user controller handles authentication (register, login, logout). This needs significant changes to use Firebase Authentication instead of manual JWT tokens.

---

## Key Changes

### Before (MongoDB + JWT)
```javascript
// Manual password hashing & JWT token generation
const registerUser = async (email, password, name) => {
  const user = await User.create({ email, password, name });
  // App manages password hashing and JWT tokens
}

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  const isValid = await user.isPasswordCorrect(password);
  const token = generateAccessToken(user._id);
}
```

### After (Firebase Auth)
```javascript
// Firebase handles password security & token management
const registerUser = async (email, password, name) => {
  const firebaseUser = await auth.createUser({ email, password });
  // Firebase securely stores password
  // Store additional user data in Firestore
  await userService.createUser(firebaseUser.uid, { name });
}

const loginUser = async (email, password) => {
  // Client-side handles Firebase authentication
  // Backend receives Firebase token in request
  // Middleware verifies token with Firebase
}
```

---

## New User Controller Implementation

### 1. Register User

```javascript
import { auth } from "../db/firebase.js";
import * as userService from "../services/userService.js";

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, phone, address, username } = req.body;

  // Validate required fields
  if (!email || !password || !username) {
    throw new ApiError(409, "Email, password, and username are required");
  }

  try {
    // Create user in Firebase Authentication
    // Firebase handles password hashing automatically
    const firebaseUser = await auth.createUser({
      email,
      password,
      displayName: username,
    });

    // Create user profile in Firestore
    const userData = await userService.createUser(firebaseUser.uid, {
      username,
      email,
      phone: phone || "",
      address: address || "",
      role: "user",
    });

    // Get custom claims/token from Firebase
    // Frontend will use Firebase SDK to get ID token
    // This is handled client-side, not server-side

    return res.status(201).json(
      new ApiResponse(200, userData, "User registered successfully")
    );
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new ApiError(409, "Email already registered");
    }
    throw new ApiError(500, `Registration failed: ${error.message}`);
  }
});
```

### 2. Login User

**⚠️ Important Change**: Login is now handled client-side by Firebase SDK!

The backend no longer generates tokens. The client:
1. Uses Firebase SDK to authenticate
2. Receives ID token from Firebase
3. Sends ID token in requests to the backend
4. Backend verifies token using middleware

```javascript
// This endpoint is optional - mainly informational
const loginUser = asyncHandler(async (req, res) => {
  // ⚠️ NOTE: Actual authentication is done client-side with Firebase SDK
  // This endpoint can be used to verify login or get user profile

  // By the time this is called, the user is already authenticated
  // (verified by middleware using Firebase token)

  const userId = req.userId; // From middleware
  const user = await userService.getUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { user }, "Login verified successfully")
  );
});
```

### 3. Logout User

```javascript
const logoutUser = asyncHandler(async (req, res) => {
  // Firebase handles token revocation client-side

  // Optionally, you can:
  // - Update user's last seen status
  // - Clear any server-side sessions
  // - Invalidate refresh tokens

  const userId = req.userId;

  try {
    // Optional: Update last logout time
    await userService.updateUser(userId, {
      lastLogout: new Date(),
    });

    // Clear cookies if used
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, null, "Logged out successfully"));
  } catch (error) {
    throw new ApiError(500, `Logout failed: ${error.message}`);
  }
});
```

### 4. Get Current User

```javascript
const getCurrentUser = asyncHandler(async (req, res) => {
  // User is already authenticated by middleware
  const userId = req.userId;

  const user = await userService.getUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "User fetched successfully")
  );
});
```

### 5. Update User Profile

```javascript
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { username, phone, address } = req.body;

  try {
    const updateData = {};
    if (username) updateData.username = username;
    if (phone) updateData.phoneNumber = phone;
    if (address) updateData.address = address;

    const updatedUser = await userService.updateUser(userId, updateData);

    return res.status(200).json(
      new ApiResponse(200, updatedUser, "Profile updated successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Update failed: ${error.message}`);
  }
});
```

### 6. Change Password

```javascript
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new passwords are required");
  }

  try {
    // Firebase stores the password securely
    // To change password, use Firebase Admin SDK
    await auth.updateUser(userId, {
      password: newPassword,
    });

    return res.status(200).json(
      new ApiResponse(200, null, "Password changed successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Password change failed: ${error.message}`);
  }
});
```

---

## Complete New User Controller

```javascript
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { auth } from "../db/firebase.js";
import * as userService from "../services/userService.js";
import dotenv from "dotenv";

dotenv.config();

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, phone, address, username } = req.body;

  if (!email || !password || !username) {
    throw new ApiError(409, "Email, password, and username are required");
  }

  try {
    const firebaseUser = await auth.createUser({
      email,
      password,
      displayName: username,
    });

    const userData = await userService.createUser(firebaseUser.uid, {
      username,
      email,
      phone: phone || "",
      address: address || "",
      role: "user",
    });

    return res.status(201).json(
      new ApiResponse(200, userData, "User registered successfully")
    );
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new ApiError(409, "Email already registered");
    }
    throw new ApiError(500, `Registration failed: ${error.message}`);
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // Authentication handled client-side
  const userId = req.userId;
  const user = await userService.getUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { user }, "Login verified successfully")
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = await userService.getUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "User fetched successfully")
  );
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { username, phone, address } = req.body;

  try {
    const updateData = {};
    if (username) updateData.username = username;
    if (phone) updateData.phoneNumber = phone;
    if (address) updateData.address = address;

    const updatedUser = await userService.updateUser(userId, updateData);

    return res.status(200).json(
      new ApiResponse(200, updatedUser, "Profile updated successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Update failed: ${error.message}`);
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { newPassword } = req.body;

  if (!newPassword) {
    throw new ApiError(400, "New password is required");
  }

  try {
    await auth.updateUser(userId, {
      password: newPassword,
    });

    return res.status(200).json(
      new ApiResponse(200, null, "Password changed successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Password change failed: ${error.message}`);
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  changePassword,
};
```

---

## Client-Side Authentication Flow (Important!)

Your frontend needs to handle Firebase authentication:

### 1. Initialize Firebase (Client-Side)

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "evoria-5f339.firebaseapp.com",
  projectId: "evoria-5f339",
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 2. Register User (Client-Side)

```javascript
import { auth } from "./firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";

async function register(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    // User registered successfully
    return userCredential.user;
  } catch (error) {
    console.error("Registration failed:", error.message);
  }
}
```

### 3. Login User (Client-Side)

```javascript
import { signInWithEmailAndPassword } from "firebase/auth";

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Get ID token
    const idToken = await userCredential.user.getIdToken();

    // Send to backend with requests
    const headers = {
      Authorization: `Bearer ${idToken}`,
    };

    // Your API calls with this header
    return { user: userCredential.user, idToken };
  } catch (error) {
    console.error("Login failed:", error.message);
  }
}
```

### 4. Logout User (Client-Side)

```javascript
import { signOut } from "firebase/auth";

async function logout() {
  try {
    await signOut(auth);
    // User logged out
  } catch (error) {
    console.error("Logout failed:", error.message);
  }
}
```

---

## Migration Checklist

- [ ] Create new Firebase-based user controller
- [ ] Update user routes if needed
- [ ] Update frontend to use Firebase SDK for auth
- [ ] Test registration with new Firebase backend
- [ ] Test login and token handling
- [ ] Test protected routes require Firebase token
- [ ] Test logout functionality
- [ ] Test password change
- [ ] Test user profile updates

---

## Important Notes

1. **No JWT generation on backend** - Firebase handles tokens
2. **No password storage on backend** - Firebase secures passwords
3. **Client must get ID token** - Send in Authorization header
4. **Token expires in 1 hour** - Client refreshes automatically
5. **API endpoints remain the same** - Data structure may change slightly

