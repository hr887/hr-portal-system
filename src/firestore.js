// src/firestore.js
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc,
    addDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * NEW: Fetches the portal user's data (role, companyId) from the 'users' collection.
 * @param {string} userId - The Firebase Auth User ID.
 * @returns {Promise<object|null>} The user's data object or null if not found.
 */
export async function getPortalUser(userId) {
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
 * NEW: Loads all companies from the 'companies' collection.
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadCompanies() {
    return await getDocs(collection(db, "companies"));
}

/**
 * NEW: Creates a new company document in the 'companies' collection.
 * @param {object} companyData - The structured company data from the form.
 * @returns {Promise<DocumentReference>} The reference to the newly created document.
 */
export async function createNewCompany(companyData) {
    // Add a check for uniqueness of the appSlug
    const slugQuery = query(collection(db, "companies"), where("appSlug", "==", companyData.appSlug));
    const slugSnapshot = await getDocs(slugQuery);
    
    if (!slugSnapshot.empty) {
        // This slug already exists, throw an error
        throw new Error(`The URL Slug "${companyData.appSlug}" is already taken. Please choose a unique one.`);
    }

    return await addDoc(collection(db, "companies"), companyData);
}

// --- Company Admin Functions ---

/**
 * UPDATED: Now fetches applications for a *specific* companyId.
 * @param {string} companyId - The ID of the company.
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadApplications(companyId) {
    if (!companyId) {
        console.error("No Company ID provided to loadApplications");
        return null; // Return null or empty state
    }
    const applicationsRef = collection(db, "companies", companyId, "applications");
    return await getDocs(applicationsRef);
}

/**
 * UPDATED: Now gets a specific application from a specific company.
 * @param {string} companyId - The ID of the company.
 * @param {string} applicationId - The ID of the application.
 * @returns {Promise<DocumentSnapshot>} The Firestore DocumentSnapshot.
 */
export async function getApplicationDoc(companyId, applicationId) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    return await getDoc(docRef);
}

/**
 * UPDATED: Now updates the status of a specific application.
 * @param {string} companyId - The ID of the company.
 * @param {string} applicationId - The ID of the application.
 * @param {string} newStatus - The new status string.
 */
export async function updateApplicationStatus(companyId, applicationId, newStatus) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    await updateDoc(docRef, { status: newStatus });
}

