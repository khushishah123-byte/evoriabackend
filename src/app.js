import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(cors());
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Development helper: allow DevTools / emulator to connect to host APIs
app.use((req, res, next) => {
	// Permissive for development only — do NOT use in production as-is
	res.setHeader(
		"Content-Security-Policy",
		"default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 http://10.0.2.2:3000 http://10.0.3.2:3000 ws:"
	);
	next();
});

// Simple root health endpoint to avoid 404s from browsers/devtools
app.get('/', (req, res) => {
	res.json({status: 'ok', message: 'API server running'});
});

// Serve a small placeholder for Chrome DevTools appspecific probe
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
	res.json({});
});



// import routes

import userRouter from "./routes/users.routes.js"
import eventRouter from "./routes/event.routes.js"
// routes declaration

app.use("/users",userRouter)
app.use("/events",eventRouter)

export {app} 

