import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { auth } from "../db/firebase.js";
import * as userService from "../services/userService.js";
import dotenv from "dotenv"
dotenv.config()

export const verfiyJWT = asyncHandler
(
    async (req, res, next) =>
    {
        try {
            // Get token from Authorization header or cookies
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

            if (!token) {
                throw new ApiError(401, "Unauthorized request");
            }

            // If token is a local development token, accept it without verifying with Firebase
            let userId;
            if (token.startsWith("localtoken:")) {
                userId = token.replace("localtoken:", "");
            } else {
                // Verify Firebase token
                const decodedToken = await auth.verifyIdToken(token);
                userId = decodedToken.uid;
            }

            // Get user from Firestore
            const user = await userService.getUserById(userId);
            if (!user) {
                throw new ApiError(401, "Invalid or expired token");
            }

            // Attach user to request
            req.user = user;
            req.userId = userId;
            next();
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === 'auth/id-token-expired') {
                throw new ApiError(401, "Token has expired");
            }
            if (error.code === 'auth/id-token-revoked') {
                throw new ApiError(401, "Token has been revoked");
            }
            throw new ApiError(401, error?.message || "Invalid or expired token");
        }
    }
)