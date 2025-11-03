// src/auth.js
import { auth } from './firebase-config.js';
// UPDATED: Import v10 modular functions
import { 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginError = document.getElementById('login-error');

export function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (loginError) loginError.classList.add('hidden');

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User logged in:", userCredential.user.uid);
        })
        .catch((error) => {
            console.error("Login Error:", error.code, error.message);
            if (!loginError) return;
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                loginError.textContent = 'Invalid email or password.';
            } else {
                loginError.textContent = 'An error occurred. Please try again.';
            }
            loginError.classList.remove('hidden');
        });
}

export function handleLogout() {
    signOut(auth);
}