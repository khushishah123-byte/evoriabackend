import dotenv from "dotenv";
import { app } from "./app.js";
import { db } from "./db/firebase.js";

dotenv.config({path: "./.env"});

// Initialize Firebase and start server
try {
    // Test Firebase connection
    const testDoc = await db.collection("_health").doc("check").get();
    console.log("Firebase initialized successfully");
    
    const PORT = process.env.PORT || 3000;
    // Bind to 0.0.0.0 so Android emulator/device can connect to host machine
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server is running on port: ${PORT}`);
    });
} catch (err) {
    console.error("Firebase initialization failed !!!", err);
    process.exit(1);
}