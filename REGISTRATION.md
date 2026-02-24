Registration flow (recommended)
=================================

Purpose
-------
This project supports two registration flows:

- Preferred (recommended): create the Firebase Authentication user on the client (Android/Web), send the Firebase ID token to the backend for verification, and the backend creates the application profile in Firestore/DB.
- Alternative (server-side): backend calls `auth.createUser()` to create the Firebase user. This requires the Identity Toolkit API and proper IAM roles on the service account.

Why prefer client-side creation
--------------------------------
- Avoids server calls to the Identity Toolkit API and related GCP IAM permissions.
- Simpler: client SDK handles email verification, password strength UI, and flows.
- Backend only needs to verify ID tokens (requires initialized Admin SDK only).

Client-side flow (recommended)
------------------------------
1. Client calls Firebase Auth to create the user:
   - Android / Web: `createUserWithEmailAndPassword(auth, email, password)`
2. After successful signup, client retrieves the ID token:
   - `user.getIdToken()` or `getIdTokenResult()`
3. Client sends a POST to backend `/users/register` with JSON body containing `idToken` and profile fields (e.g. `fullName`, `phoneNo`). Example:

```bash
curl -X POST http://<API_HOST>:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{"idToken":"<ID_TOKEN>","fullName":"Tester One","phoneNo":"1234567890"}'
```

Android example (Kotlin, minimal)
--------------------------------
```kotlin
val auth = Firebase.auth
auth.createUserWithEmailAndPassword(email, password)
  .addOnCompleteListener { createTask ->
    if (!createTask.isSuccessful) return@addOnCompleteListener
    auth.currentUser?.getIdToken(true)
      ?.addOnCompleteListener { tokenTask ->
        if (!tokenTask.isSuccessful) return@addOnCompleteListener
        val idToken = tokenTask.result?.token ?: return@addOnCompleteListener
        val json = JSONObject().apply {
          put("idToken", idToken)
          put("fullName", fullName)
          put("phoneNo", phoneNo)
        }
        // send json to backend /users/register (OkHttp, Retrofit, etc.)
      }
  }
```

Backend behavior in this repo
-----------------------------
- `POST /users/register` accepts either:
  - `idToken` + profile fields (recommended): backend verifies `idToken` with `auth.verifyIdToken()` and creates the application profile, or
  - `email` + `password` + profile fields: backend will call `auth.createUser()` to create the Firebase user. NOTE: server-side creation may fail if the service account lacks permission to use Identity Toolkit.
- For development only: when `NODE_ENV=development` the server will fall back to a local mock UID if `auth.createUser()` fails; this is strictly for local testing.

Production setup (server-side creation)
-------------------------------------
If you must create users server-side, do this in GCP (project `evoria-5f339`):

1) Enable Identity Toolkit API in Cloud Console:
   - https://console.cloud.google.com/apis/library
   - Select project `evoria-5f339`, search `Identity Toolkit API`, click Enable.

2) Grant the service account the `Service Usage Consumer` role:
   - Console: https://console.cloud.google.com/iam-admin/iam?project=evoria-5f339
   - Find `firebase-adminsdk-fbsvc@evoria-5f339.iam.gserviceaccount.com` (from `firebase-adminsdk-key.json`), edit → Add role → `Service Usage > Service Usage Consumer` → Save.

Or via gcloud (requires Cloud SDK + auth):
```bash
gcloud services enable identitytoolkit.googleapis.com --project=evoria-5f339
gcloud projects add-iam-policy-binding evoria-5f339 \
  --member="serviceAccount:firebase-adminsdk-fbsvc@evoria-5f339.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

Testing locally
---------------
- To use the development fallback (mock UID) start the server with:
```powershell
$env:NODE_ENV='development'
node src/index.js
```
- To test the real-server flow, start without `NODE_ENV=development` and ensure the service account has the required IAM/API access.

Notes
-----
- The backend accepts many frontend field variants (`fullName`, `name`, `username`, `phoneNo`, `phoneNumber`, etc.). If you run into validation errors, confirm the request JSON contains `email`, `password`, and a name variant (or send `idToken`).
- The development mock is only a convenience and should not be used in production.

If you want, I can also add a short README section in your Android app repository showing exactly where to integrate this snippet.
