// ═══════════════════════════════════════════════════════════════
// firebase-config.js — Firebase Setup & Exports
// Replace firebaseConfig values with your actual Firebase project
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase }    from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";

// ──────────────────────────────────────────────────────────────
// 🔧 REPLACE WITH YOUR FIREBASE PROJECT CONFIG
// Get this from: Firebase Console → Project Settings → Your apps
// ──────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyATEaB2oaJGnzSDGefCkG4tbYW0IPtQKwg",
  authDomain: "brts-amd.firebaseapp.com",
  databaseURL: "https://brts-amd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "brts-amd",
  storageBucket: "brts-amd.firebasestorage.app",
  messagingSenderId: "630746198225",
  appId: "1:630746198225:web:c496e433e6865ade79d5f0",
  measurementId: "G-D6SZ9T0Z6C"
};

const app      = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth     = getAuth(app);

// Only init analytics in browser (not Node)
let analytics = null;
try { analytics = getAnalytics(app); } catch(_) {}

export { app, database, auth, analytics };
