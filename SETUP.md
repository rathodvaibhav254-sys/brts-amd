# BRTS Command Center — Setup Guide

## Architecture Overview

```
Backend Simulator (Node.js)
         │
         │  writes every 2–5s via Admin SDK
         ▼
   Firebase Realtime DB  ←─── SOS alerts (frontend write)
         │
         │  onValue listeners (read-only)
         ▼
    Frontend (HTML/JS)
    - Map markers
    - Fleet table
    - Charts
    - Route planner
    - AI predictions
    - SOS UI
```

---

## Step 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create new project (e.g. `brts-ahmedabad`)
3. Enable **Realtime Database** (not Firestore)
   - Start in **test mode** initially, then apply rules
   - Choose `asia-southeast1` region (closest to India)
4. Enable **Authentication** → Sign-in methods:
   - Email/Password ✓
   - Google ✓

---

## Step 2 — Configure Frontend

Edit `firebase-config.js` with your project credentials:

```
Firebase Console → Project Settings (⚙️) → Your apps → Web app → Config
```

Replace all `YOUR_*` values in `firebase-config.js`.

---

## Step 3 — Setup Backend Simulator

```bash
cd backend
npm install
```

Download service account key:
```
Firebase Console → Project Settings → Service Accounts → Generate new private key
```

Save as `backend/serviceAccountKey.json`

Update `databaseURL` in `simulator.js`:
```js
databaseURL: 'https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app'
```

Run simulator:
```bash
npm start
# or for development with auto-restart:
npm run dev
```

---

## Step 4 — Apply Firebase Security Rules

1. Go to Firebase Console → Realtime Database → Rules
2. Copy contents of `firebase-rules.json`
3. Paste and **Publish**

---

## Step 5 — Create Admin User

1. Open the app and register with any email
2. In Firebase Console → Realtime Database, find:
   ```
   users/{your-uid}/role
   ```
3. Manually change `"user"` → `"admin"` in the console
4. Refresh the app — admin panel will appear

---

## Step 6 — Run the Frontend

Serve with any static file server:

```bash
# Python
python3 -m http.server 3000

# Node.js (npx)
npx serve .

# VS Code Live Server extension
```

Open: http://localhost:3000

---

## Project File Structure

```
brts-system/
├── index.html          ← Main dashboard HTML
├── style.css           ← Dark tactical theme CSS
├── firebase-config.js  ← Firebase init (configure this!)
├── app.js              ← Frontend logic (READ-ONLY Firebase)
├── firebase-rules.json ← Security rules
├── SCHEMA.md           ← Database schema docs
├── SETUP.md            ← This file
└── backend/
    ├── simulator.js    ← Backend bus simulator (Node.js)
    ├── package.json    ← npm config
    └── serviceAccountKey.json  ← (download from Firebase, gitignore!)
```

---

## Features Summary

### Real-Time Backend
- ✅ 10 buses across 5 routes
- ✅ Smooth movement via waypoint interpolation
- ✅ Speed varies ±5 km/h, 8% congestion chance
- ✅ Updates staggered 2–5s per bus

### SOS System
- ✅ Floating SOS button (visible to logged-in users)
- ✅ GPS location capture
- ✅ Alert written to Firebase `/alerts`
- ✅ Nearest bus marked as `emergency`
- ✅ Admin panel shows all active SOS
- ✅ Emergency contact stored per user
- ✅ One-tap call to 112

### AI Predictions (Rule-Based)
- ✅ Peak-hour crowd prediction
- ✅ Delay detection (speed < 50% of expected)
- ✅ Traffic congestion alerts (speed < 10 km/h)
- ✅ Capacity advisory (multiple high-crowd buses)
- ✅ ETA quality indicator

### Authentication
- ✅ Email/password login
- ✅ Google sign-in
- ✅ Roles: user / admin
- ✅ Admin sees SOS alerts + admin panel

### Security
- ✅ Buses: public read, no client write
- ✅ Alerts: auth write (own only), admin resolve
- ✅ Analytics: admin only
- ✅ Users: own profile only

---

## Deployment

### Frontend → Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

### Backend → Cloud Run or a VPS
```bash
# Dockerfile (simple)
FROM node:18-alpine
WORKDIR /app
COPY backend/ .
RUN npm install
CMD ["node", "simulator.js"]
```

Or just run it on any always-on VPS / Raspberry Pi.

---

## `.gitignore`
```
backend/serviceAccountKey.json
node_modules/
.env
```

**Never commit `serviceAccountKey.json` to Git!**
