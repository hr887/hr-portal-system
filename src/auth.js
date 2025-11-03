// src/auth.js
import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut,
    getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Get references at the module level
const loginError = document.getElementById('login-error');
const loginButton = document.getElementById('login-btn');

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
 * UPDATED: Handles the login form submission with async/await
 * and provides specific error messages.
 */
export async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (loginError) loginError.classList.add('hidden');
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", userCredential.user.uid);
        // 'onAuthStateChanged' listener in main.js will handle the rest.
        // We don't need to re-enable the button here, as the page will change.
        
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        
        if (loginError) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-email':
                    loginError.textContent = 'No account found with that email address.';
                    break;
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    loginError.textContent = 'Incorrect password. Please try again.';
                    break;
                case 'auth/too-many-requests':
                    loginError.textContent = 'Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.';
                    break;
                default:
                    loginError.textContent = 'An unknown error occurred. Please try again.';
            }
            loginError.classList.remove('hidden');
        }
        
        // Re-enable the button on failure
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    }
}

export function handleLogout() {
    signOut(auth).catch((error) => {
        console.error("Error signing out:", error);
    });
}
