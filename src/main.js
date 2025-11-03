// src/main.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { handleLoginSubmit, handleLogout } from './auth.js';
import { 
    showLoginScreen, 
    showSuperAdminDashboard, 
    showCompanyAdminDashboard,
    setupLogoutButtons
} from './ui.js';

/**
 * A global-like store for the logged-in user's company profile.
 */
let currentCompanyProfile = null;

/**
 * An exported "getter" function so other modules can read the profile.
 */
export function getCurrentCompanyProfile() {
    return currentCompanyProfile;
}

/**
 * Fetches the portal user's data (role, companyId) from the 'users' collection.
 * @param {string} userId - The Firebase Auth User ID.
 */
async function getPortalUser(userId) {
    if (!userId) return null;
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data();
    } else {
        console.error("No user document found for this user!");
        return null;
    }
}

/**
 * Fetches the full company profile from the 'companies' collection.
 * @param {string} companyId - The company's document ID.
 */
async function getCompanyProfile(companyId) {
    if (!companyId) return null;
    const companyDocRef = doc(db, "companies", companyId);
    const companyDocSnap = await getDoc(companyDocRef);
    if (companyDocSnap.exists()) {
        // Return the full DocumentSnapshot
        return companyDocSnap;
    } else {
        console.error(`No company document found for ID: ${companyId}`);
        return null;
    }
}


// --- THIS IS THE FIX ---
// We wrap all app logic in a DOMContentLoaded listener.
// This ensures the HTML is fully loaded before we try to access any elements.
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing app.");

    // === Auth State Listener (The "Director") ===
    onAuthStateChanged(auth, async (user) => {
        // Reset company profile on any auth change
        currentCompanyProfile = null; 
        
        if (user) {
            // User is logged in, NOW WE CHECK THEIR ROLE
            console.log("User logged in, fetching role...");
            const portalUser = await getPortalUser(user.uid);

            if (!portalUser || !portalUser.role) {
                console.error("User has no role or document! Logging out.");
                handleLogout();
                return;
            }

            // --- THIS IS THE ROLE-BASED ROUTER ---
            switch (portalUser.role) {
                case 'super_admin':
                    console.log("Redirecting to Super Admin Dashboard");
                    showSuperAdminDashboard(portalUser);
                    break;
                
                case 'company_admin':
                    if (!portalUser.companyId) {
                        console.error("Company Admin has no companyId! Logging out.");
                        handleLogout();
                        return;
                    }
                    
                    // --- NEW: Fetch and store the company profile ---
                    console.log("Fetching profile for companyId:", portalUser.companyId);
                    const companyDoc = await getCompanyProfile(portalUser.companyId);
                    
                    if (!companyDoc) {
                        console.error("Could not load company profile! Logging out.");
                        handleLogout();
                        return;
                    }

                    // Store it for other modules to use
                    currentCompanyProfile = companyDoc; 
                    
                    console.log("Redirecting to Company Admin Dashboard for:", companyDoc.data().companyName);
                    showCompanyAdminDashboard(portalUser, companyDoc); // Pass the full doc
                    break;
                
                default:
                    console.error(`Unknown role: ${portalUser.role}. Logging out.`);
                    handleLogout();
            }
            
        } else {
            // User is logged out
            console.log("User is logged out, showing login screen.");
            showLoginScreen();
        }
    });

    // === Initialize Global Event Listeners ===
    // These are now safely inside the DOMContentLoaded listener.
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
    setupLogoutButtons(handleLogout);

});