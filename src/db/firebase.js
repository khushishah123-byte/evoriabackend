import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({path: "./.env"});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase credentials
let serviceAccount;
if (process.env.FIREBASE_CREDENTIALS) {
  try {
    // If provided as JSON string in environment
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } catch (error) {
    console.error("Error parsing FIREBASE_CREDENTIALS from env:", error);
    process.exit(1);
  }
} else if (process.env.FIREBASE_KEY_PATH) {
  try {
    // If provided as file path
    const credentialsPath = process.env.FIREBASE_KEY_PATH;
    serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  } catch (error) {
    console.error("Error loading Firebase credentials from file:", error);
    process.exit(1);
  }
} else {
  console.error(
    "Firebase credentials not found. Set FIREBASE_CREDENTIALS or FIREBASE_KEY_PATH in .env"
  );
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

// Get Firestore database instance
const db = admin.firestore();
const auth = admin.auth();

// Enable Firestore offline persistence for better performance
if (typeof window === "undefined") {
  // Server-side only
  db.settings({ ignoreUndefinedProperties: true });
}

export { db, auth, admin };
