// src/firebase/auth.js
import { auth } from './config.js';
import { 
    signInWithEmailAndPassword, 
    signOut,
    getIdTokenResult
} from "firebase/auth";

/**
 * Gets the user's custom claims.
 * @param {User} user - The Firebase User object.
 * @param {boolean} [forceRefresh=false] - Whether to force a refresh from the server.
 * @returns {Promise<object|null>} The user's custom claims object.
 */
export async function getUserClaims(user, forceRefresh = false) {
    if (!user) return null;
    try {
        const idTokenResult = await getIdTokenResult(user, forceRefresh);
        return idTokenResult.claims;
    } catch (error) {
        console.error("Error getting user claims:", error);
        return null;
    }
}

/**
 * Handles the login form submission with async/await
 * and provides specific error messages.
 * * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<UserCredential>} The user credential on success.
 * @throws {Error} A user-friendly error message on failure.
 */
export async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", userCredential.user.uid);
        return userCredential;
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-email':
                throw new Error('No account found with that email address.');
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                throw new Error('Incorrect password. Please try again.');
            case 'auth/too-many-requests':
                throw new Error('Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.');
            default:
                throw new Error('An unknown error occurred. Please try again.');
        }
    }
}

/**
 * Logs the user out.
 */
export function handleLogout() {
    signOut(auth).catch((error) => {
        console.error("Error signing out:", error);
    });
}
