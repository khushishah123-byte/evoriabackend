import { db, auth } from "../db/firebase.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * User Service - All database operations for users in Firestore
 */

// Create a new user in Firestore
export const createUser = async (userId, userData) => {
  try {
    const userRef = db.collection("users").doc(userId);
    const userPayload = {
      username: userData.username || "",
      email: userData.email,
      phoneNumber: userData.phone || "",
      address: userData.address || "",
      role: userData.role || "user",
      // Optional local password hash (for dev/local fallback)
      ...(userData.localPasswordHash ? { localPasswordHash: userData.localPasswordHash } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRef.set(userPayload);
    return { id: userId, ...userPayload };
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const userRef = await db.collection("users").doc(userId).get();

    if (!userRef.exists) {
      return null;
    }

    return {
      id: userRef.id,
      ...userRef.data(),
    };
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

// Get user by email
export const getUserByEmail = async (email) => {
  try {
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    throw new Error(`Failed to get user by email: ${error.message}`);
  }
};

// Update user
export const updateUser = async (userId, updateData) => {
  try {
    const userRef = db.collection("users").doc(userId);

    // Remove password and sensitive fields
    const { password, refreshToken, ...safeData } = updateData;

    const dataToUpdate = {
      ...safeData,
      updatedAt: new Date(),
    };

    await userRef.update(dataToUpdate);

    // Return updated user data
    const updatedUser = await getUserById(userId);
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    await db.collection("users").doc(userId).delete();

    // Also delete from Firebase Authentication
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      console.warn("Failed to delete user from auth:", authError.message);
      // Continue - Firestore delete was successful
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

// Get all users
export const getAllUsers = async (limit = 50) => {
  try {
    const snapshot = await db
      .collection("users")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
};

// Check if user exists
export const userExists = async (userId) => {
  try {
    const userRef = await db.collection("users").doc(userId).get();
    return userRef.exists;
  } catch (error) {
    throw new Error(`Failed to check user existence: ${error.message}`);
  }
};

// Get user for authentication (with minimal fields for response)
export const getUserSafeData = async (userId) => {
  try {
    const user = await getUserById(userId);
    if (!user) return null;

    // Remove sensitive fields
    const { ...safeUser } = user;
    return safeUser;
  } catch (error) {
    throw new Error(`Failed to get safe user data: ${error.message}`);
  }
};
