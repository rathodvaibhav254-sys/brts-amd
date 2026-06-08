# 🚌 ByteBack — Smart BRTS Command Center

🚀 **Real-Time Intelligence | AI-Driven Mobility | Tactical Emergency Response**

---

## 🌟 Overview

**ByteBack** is a next-generation **AI-based BRTS (Bus Rapid Transit System) Tracking and Command Center** designed for Ahmedabad's public transit network. Built on top of a real-time event-driven architecture, it translates raw transit signals into **actionable operational intelligence** for commuters and transit administrators alike.

### Key Capabilities
* 📍 **Live Vector Map:** Dynamic bus tracking with custom SVG status markers and real-time heading indicators using Leaflet.
* 👥 **AI Crowd Estimation:** Real-time analysis categorizing passenger occupancy as *Low*, *Medium*, or *High*.
* 🚨 **Tactical Emergency SOS:** One-click instant rescue trigger capturing passenger GPS coordinates and flagging the nearest bus.
* 📊 **Smart Analytics Command Panel:** Live telemetry dashboards, average speed graphs, delay monitors, and active emergency resolution grids.

---

## 🏗️ System Architecture

```
 ┌─────────────────────────────┐
 │  Node.js Backend Simulator  │ ──(Admin SDK Write every 2-5s)──┐
 └─────────────────────────────┘                                 │
                                                                 ▼
 ┌─────────────────────────────┐                       ┌───────────────────┐
 │   React 19 Frontend App     │ ──(User SOS Write)──► │ Firebase Database │
 └─────────────────────────────┘                       └───────────────────┘
                │                                                │
                └───────────(Real-time onValue Listener)─────────┘
```

1. **State Engine:** The standalone Node.js simulator periodically calculates bus physics (waypoint interpolation, congestion factor, average speed, crowd levels) and publishes them directly to Firebase.
2. **Database:** Firebase Realtime Database handles synchronization across all clients with millisecond latency.
3. **Command UI:** A React 19 single-page application built with a responsive Cyberpunk/Neon Tactical theme, featuring role-based dashboards (Commuters and Admin Operators).

---

## ⚙️ Tech Stack

* **Frontend Framework:** React 19, Vite (for high-speed HMR)
* **Visualizations:** Leaflet.js (Map layer), Chart.js (Operational Telemetry)
* **Styling System:** CSS Grid / Flexbox (Tactical Neon theme with smooth glassmorphism and spring physics micro-animations)
* **Backend Runtime:** Node.js, Firebase Admin SDK
* **Database & Security:** Firebase Realtime Database, Security Rules (Role-based read/write gating)
* **Identity Management:** Firebase Authentication (Email/Password & Google OAuth)

---

## 📂 Project Structure

```
brts-amd/
├── frontend/                # React 19 Frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI Dashboard Panels (Fleet, Map, SOS, Admin, AI)
│   │   ├── assets/          # Static assets & brand elements
│   │   ├── firebase.js      # Client-side Firebase Initializer
│   │   ├── App.jsx          # Dashboard Orchestrator
│   │   ├── index.css        # Base Styles & Custom Variable System
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── simulator.js             # standalone Node.js Bus Simulator (Backend)
├── package.json             # Backend Simulator package configuration
├── firebase-rules.json      # Gated Security Rules for Firebase Realtime DB
├── SCHEMA.md                # Data Models & Schema definition
└── SETUP.md                 # Detailed deployment instructions
```

---

## 🚀 Quick Start Guide

### 1️⃣ Prerequisites
Make sure you have [Node.js (v18+)](https://nodejs.org/) installed.

### 2️⃣ Firebase Setup
1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com).
2. Enable **Realtime Database** (choose a close region like `asia-southeast1`).
3. Enable **Authentication** and turn on **Email/Password** and **Google** sign-in methods.
4. Set up database rules using the config in [firebase-rules.json](file:///c:/Users/User/OneDrive/Desktop/files(final)/files(final)/firebase-rules.json).

### 3️⃣ Configure the Frontend
Add your Firebase Web Configuration to `frontend/src/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
```

### 4️⃣ Start the Backend Simulator
1. Go to the Firebase Console -> Project Settings -> Service Accounts.
2. Click **Generate new private key** and download the JSON file.
3. Save it as `serviceAccountKey.json` in the root folder.
4. Install dependencies and start the simulator:
   ```bash
   npm install
   npm start
   ```

### 5️⃣ Run the React Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open the browser to the local server port printed in your console (usually `http://localhost:5173`).

---

## 🧠 Smart AI Predictions (Rules Engine)
* **Delay Detection:** Triggers warning statuses if a bus's speed drops below 50% of its normal average.
* **Traffic Alert:** Identifies heavy traffic if a bus's speed drops below 10 km/h.
* **Crowd Forecasting:** Adapts passenger densities based on current morning/evening peak commuter hours.
* **Capacity Advisory:** Alerts operators if multiple buses on a single route reach high crowd status concurrently.

---

## 👤 Admin Role Assignment
By default, new sign-ups are assigned the `"user"` role. To upgrade an operator account to admin status:
1. Log in to the application at least once to create your user node.
2. Open the **Firebase Console -> Realtime Database**.
3. Locate `users/{your-uid}/role` and change its value from `"user"` to `"admin"`.
4. Refresh the application dashboard. The command panels and administrative tools will instantly load.

---

## 👨‍💻 Team ByteBack
Built with passion by:
* **Hatim**
* **Vaibhav**
* **Krish**
* **Parthiv**
* **Rushin**
* **Dhanvi**

---
> **"ByteBack – Bringing Intelligence Back to Public Transport."**
