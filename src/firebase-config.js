// src/firebase-config.js
// UPDATED: All imports are now from version 10.12.2 modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your web app's Firebase configuration (from your original index.html)
const firebaseConfig = {
  apiKey: "AIzaSyBD2Zd4qjZCdqf3B2Gd13xjooTicvc-tXY",
  authDomain: "truckerapp-system.firebaseapp.com",
  projectId: "truckerapp-system",
  storageBucket: "truckerapp-system.firebasestorage.app",
  messagingSenderId: "725898258453",
  appId: "1:725898258453:web:5a5f0490e7baf3e518061c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export the services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase v10.12.2 has been connected!");