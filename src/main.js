// src/main.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// UPDATED: Import new auth functions
import { handleLoginSubmit, handleLogout, getUserClaims } from './auth.js';
import { 
    getCompanyProfile 
} from './firestore.js'; // Import from firestore
import { 
    showLoginScreen, 
    showSuperAdminDashboard, 
    showCompanyAdminDashboard,
    setupLogoutButtons,
    showCompanyChooser, // NEW: Import the company chooser
    hideCompanyChooser // NEW
} from './ui.js';

/**
 * A global-like store for the logged-in user's company profile.
 */
let currentCompanyProfile = null;
let currentUser = null; // Store the user object
let currentUserClaims = null; // NEW (Bug 2 Fix): Store the user's claims

/**
 * An exported "getter" function so other modules can read the profile.
 */
export function getCurrentCompanyProfile() {
    return currentCompanyProfile;
}


/**
 * NEW: This is the main function to log a user into a specific company.
 * It's called after they log in OR after they choose from the modal.
 * @param {string} companyId - The ID of the company to log into.
 * @param {string} role - The user's role for that company.
 */
async function loginToCompany(companyId, role) {
    console.log(`Logging into company ${companyId} with role ${role}`);
    hideCompanyChooser(); // Hide the modal if it's open
    
    // Call the centralized function (which calls the Cloud Function)
    const companyData = await getCompanyProfile(companyId);
    
    if (!companyData) {
        console.error("Could not load company profile! Logging out.");
        handleLogout();
        return;
    }
    
    // Store the selected company profile globally
    currentCompanyProfile = companyData;
    
    // Show the company admin dashboard
    // We pass companyData directly now, not the doc
    // UPDATED: Pass companyId as well for application loading
    showCompanyAdminDashboard(currentUser, companyId, companyData);
}

/**
 * NEW (Bug 2 Fix): Hides the dashboard and re-shows the company chooser
 * without logging the user out.
 */
export function returnToCompanyChooser() {
    if (!currentUserClaims || !currentUser) {
        // If something is wrong, just log out
        handleLogout();
        return;
    }
    
    // Get the roles and IDs from the saved claims
    const companyRoles = { ...currentUserClaims.roles };
    delete companyRoles.globalRole;
    const companyIds = Object.keys(companyRoles);

    // Re-show the chooser modal
    showCompanyChooser(companyIds, companyRoles, loginToCompany);
}


// --- THIS IS THE FIX ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing app.");

    // === Auth State Listener (The "Director") ===
    onAuthStateChanged(auth, async (user) => {
        currentUser = user; // Store the user
        currentUserClaims = null; // NEW (Bug 2 Fix): Reset claims
        currentCompanyProfile = null; // Reset profile
        
        if (user) {
            // User is logged in, NOW WE GET THEIR CLAIMS
            console.log("User logged in, fetching claims...");
            
            // We pass 'true' to force a refresh, in case the claims
            // just changed (e.g., from the Cloud Function).
            const claims = await getUserClaims(user, true);
            currentUserClaims = claims; // NEW (Bug 2 Fix): Save the claims

            if (!claims || !claims.roles) {
                console.error("User has no claims or roles! Logging out.");
                handleLogout();
                return;
            }
            
            console.log("User claims:", claims.roles);

            // --- THIS IS THE NEW ROLE-BASED ROUTER ---
            
            // Check for Super Admin first
            if (claims.roles.globalRole === 'super_admin') {
                console.log("Redirecting to Super Admin Dashboard");
                showSuperAdminDashboard(user);
                return; // Stop here
            }

            // Not a super_admin, check for company roles
            // 'companyRoles' will be: { "companyA_id": "admin", "companyB_id": "user" }
            const companyRoles = { ...claims.roles };
            delete companyRoles.globalRole; // Remove this if it exists

            const companyIds = Object.keys(companyRoles);

            if (companyIds.length === 0) {
                // This user is an admin but has no companies assigned.
                console.error("Admin user has no company memberships! Logging out.");
                handleLogout();
                return;

            } else if (companyIds.length === 1) {
                // --- Case 1: Only one company. Log them in directly. ---
                const companyId = companyIds[0];
                const role = companyRoles[companyId];
                loginToCompany(companyId, role);

            } else {
                // --- Case 2: Multiple companies. Show the "Choose Company" modal. ---
                console.log("User has multiple companies. Showing chooser modal.");
                // Pass the 'loginToCompany' function as a "callback"
                showCompanyChooser(companyIds, companyRoles, loginToCompany);
            }
            
        } else {
            // User is logged out
            console.log("User is logged out, showing login screen.");
            showLoginScreen();
        }
    });

    // === Initialize Global Event Listeners ===
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
    
    // UPDATED (Bug 2 Fix): Pass the new function to the setup
    setupLogoutButtons(handleLogout, returnToCompanyChooser);

});

