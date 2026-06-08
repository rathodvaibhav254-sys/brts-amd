import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { app, database, auth };
