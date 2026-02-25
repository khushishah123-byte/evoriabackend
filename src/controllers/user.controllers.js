import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { auth } from "../db/firebase.js";
import * as userService from "../services/userService.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const registerUser = asyncHandler(async (req, res) => {
  const body = req.body || {};

  const email = body.email;
  const password = body.password;
  const confirmPassword = body.confirmPassword || body.confirm_password || body.confirm || null;

  // Accept multiple frontend variants for the full name / username
  const finalUsername =
    body.username || body.name || body.fullName || body.full_name || body.fullname || null;

  // Accept multiple frontend variants for phone
  const finalPhone =
    body.phone || body.phoneNumber || body.phone_no || body.phoneNo || body.phone_no || "";

  const address = body.address || "";

  if (!email || !password || !finalUsername) {
    throw new ApiError(409, "Email, password, and full name are required");
  }

  if (confirmPassword && confirmPassword !== password) {
    throw new ApiError(400, "Password and confirm password do not match");
  }

  // If the frontend has already created a Firebase Authentication user
  // (using client SDK createUserWithEmailAndPassword) it should send
  // the ID token here. In that case we verify the token and only create
  // the application profile without calling admin.createUser(), which
  // avoids using the Identity Toolkit API from the server.
  const idToken = body.idToken || body.id_token || null;

  if (idToken) {
    try {
      const decoded = await auth.verifyIdToken(idToken);
      const uid = decoded.uid;
      const verifiedEmail = decoded.email || email;
      const displayName = decoded.name || finalUsername;

      const userData = await userService.createUser(uid, {
        username: displayName,
        email: verifiedEmail,
        phone: finalPhone,
        address: address,
        role: "user",
      });

      return res.status(201).json(
        new ApiResponse(200, {
          _id: userData.id,
          email: userData.email,
          phone: userData.phoneNumber || "",
          name: userData.username || "",
          type: userData.role || "user",
          createdAt: userData.createdAt?.toString() || "",
          updatedAt: userData.updatedAt?.toString() || "",
          __v: 0
        }, "User registered successfully (via Firebase client auth)")
      );
    } catch (verifyErr) {
      throw new ApiError(401, `Invalid idToken: ${verifyErr.message}`);
    }
  }

  try {
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email,
        password,
        displayName: finalUsername,
      });
    } catch (innerErr) {
      // If Firebase admin createUser fails due to IAM/API permissions,
      // fall back to creating a local user record. This keeps registration
      // working for quick handover. We still prefer real Firebase in prod.
      console.warn("auth.createUser failed:", innerErr.message);

      // create a local UID and hash the password for local auth
      const localUid = `local-${Date.now()}`;
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;

      // Use the local uid as firebaseUser to continue
      firebaseUser = { uid: localUid };

      // Ensure the localPasswordHash is saved in Firestore via userService
      // (userService.createUser will pick up userData.localPasswordHash)
      try {
        const userDataLocal = await userService.createUser(localUid, {
          username: finalUsername,
          email,
          phone: finalPhone,
          address: address,
          role: "user",
          localPasswordHash: passwordHash,
        });

        return res.status(201).json(
          new ApiResponse(200, {
            _id: userDataLocal.id,
            email: userDataLocal.email,
            phone: userDataLocal.phoneNumber || "",
            name: userDataLocal.username || "",
            type: userDataLocal.role || "user",
            createdAt: userDataLocal.createdAt?.toString() || "",
            updatedAt: userDataLocal.updatedAt?.toString() || "",
            __v: 0,
            // local auth token for development/handover
            accessToken: `localtoken:${localUid}`,
          }, "User registered successfully (local fallback)")
        );
      } catch (createLocalErr) {
        throw createLocalErr;
      }
    }

    const userData = await userService.createUser(firebaseUser.uid, {
      username: finalUsername,
      email,
      phone: finalPhone,
      address: address,
      role: "user",
    });

    return res.status(201).json(
      new ApiResponse(200, {
        _id: userData.id,
        email: userData.email,
        phone: userData.phoneNumber || "",
        name: userData.username || "",
        type: userData.role || "user",
        createdAt: userData.createdAt?.toString() || "",
        updatedAt: userData.updatedAt?.toString() || "",
        __v: 0
      }, "User registered successfully")
    );
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new ApiError(409, "Email already registered");
    }
    throw new ApiError(500, `Registration failed: ${error.message}`);
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  try {
    // Try Firebase REST sign-in first
    const apiKey = process.env.FIREBASE_API_KEY || "";
    if (!apiKey) {
      throw new ApiError(500, "Firebase API key not configured");
    }

    let authData = null;
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      authData = await response.json();

      if (!response.ok) {
        console.warn("Firebase sign-in HTTP error", response.status, authData);
      }

      if (response.ok) {
        const uid = authData.localId;
        const user = await userService.getUserById(uid);
        if (!user) {
          throw new ApiError(404, "User profile not found");
        }

        return res.status(200).json(
          new ApiResponse(200, 
            {
              user: {
                _id: user.id,
                email: user.email,
                phone: user.phoneNumber || "",
                address: user.address || "",
                name: user.username || "",
                type: user.role || "user",
                createdAt: user.createdAt?.toString() || "",
                updatedAt: user.updatedAt?.toString() || "",
                __v: 0
              },
              accessToken: authData.idToken,
              refreshToken: authData.refreshToken
            },
            "Login successful"
          )
        );
      }
    } catch (firebaseErr) {
      // will attempt local fallback below
      console.warn("Firebase sign-in failed, attempting local fallback:", firebaseErr.message || firebaseErr);
    }

    // Local fallback: check user by email and compare stored password hash
    const localUser = await userService.getUserByEmail(email);
    if (!localUser || !localUser.localPasswordHash) {
      // If no local user or no stored password, return original firebase error if present
      throw new ApiError(401, authData?.error?.message || "Invalid email or password");
    }

    const bcrypt = (await import('bcrypt')).default;
    const match = await bcrypt.compare(password, localUser.localPasswordHash);
    if (!match) {
      throw new ApiError(401, "Invalid email or password");
    }

    // Return a local token that the server accepts for dev/handover
    const localToken = `localtoken:${localUser.id}`;

    return res.status(200).json(
      new ApiResponse(200,
        {
          user: {
            _id: localUser.id,
            email: localUser.email,
            phone: localUser.phoneNumber || "",
            address: localUser.address || "",
            name: localUser.username || "",
            type: localUser.role || "user",
            createdAt: localUser.createdAt?.toString() || "",
            updatedAt: localUser.updatedAt?.toString() || "",
            __v: 0
          },
          accessToken: localToken,
          refreshToken: null
        },
        "Login successful (local)"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, `Login failed: ${error.message}`);
  }
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

const authRedirect = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = await userService.getUserById(userId);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  return res.status(200).json(
    new ApiResponse(200, "user exist", { userId })
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

// Admin functions (kept from original)
const updateUserDetails = asyncHandler(async (req, res) => {
  const { userId, username, email, phone, address } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone) updateData.phoneNumber = phone;
    if (address) updateData.address = address;

    const user = await userService.updateUser(userId, updateData);

    return res.status(200).json(
      new ApiResponse(200, user, "User details updated successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Update failed: ${error.message}`);
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    if (!users || users.length === 0) {
      throw new ApiError(404, "No users found");
    }

    return res.status(200).json(
      new ApiResponse(200, { users }, "Users retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Fetch failed: ${error.message}`);
  }
});

const deleteUserById = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    const user = await userService.getUserById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    await userService.deleteUser(id);

    return res.status(200).json(
      new ApiResponse(200, null, "User deleted successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Delete failed: ${error.message}`);
  }
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.body;

  try {
    const user = await userService.getUserById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
      new ApiResponse(200, user, "User fetched successfully")
    );
  } catch (error) {
    throw new ApiError(500, `Fetch failed: ${error.message}`);
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  authRedirect,
  updateUserProfile,
  changePassword,
  updateUserDetails,
  getAllUsers,
  deleteUserById,
  getUserById,
};