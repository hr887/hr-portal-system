// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
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

// Initialize and export all services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

console.log("Firebase v10.12.2 has been connected!");
