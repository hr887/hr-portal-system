// src/firestore.js
import { db, functions } from './firebase-config.js'; // UPDATED: Import 'functions' from config
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    documentId
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// NEW: Import just the 'httpsCallable' function
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";


/**
 * Fetches the portal user's data from the 'users' collection.
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
 * NEW: Updates data for a specific user in the 'users' collection.
 * @param {string} userId - The ID of the user to update.
 * @param {object} data - An object containing the fields to update (e.g., { name: "New Name" }).
 */
export async function updateUser(userId, data) {
    if (!userId) return;
    const userDocRef = doc(db, "users", userId);
    return await updateDoc(userDocRef, data);
}

/**
 * NEW: Loads all users from the 'users' collection. (Super Admin only)
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadAllUsers() {
    return await getDocs(collection(db, "users"));
}

/**
 * NEW: Loads all memberships from the 'memberships' collection. (Super Admin only)
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadAllMemberships() {
    return await getDocs(collection(db, "memberships"));
}

/**
 * NEW: Fetches all memberships for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function getMembershipsForUser(userId) {
    if (!userId) return null;
    const membershipsRef = collection(db, "memberships");
    const q = query(membershipsRef, where("userId", "==", userId));
    return await getDocs(q);
}

/**
 * NEW: Creates a new membership document.
 * @param {object} membershipData - { userId, companyId, role }
 * @returns {Promise<DocumentReference>}
 */
export async function addMembership(membershipData) {
    // Check if this membership already exists
    const q = query(
        collection(db, "memberships"),
        where("userId", "==", membershipData.userId),
        where("companyId", "==", membershipData.companyId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error("User is already a member of this company.");
    }
    // If not, add it
    return await addDoc(collection(db, "memberships"), membershipData);
}

/**
 * NEW: Updates the role on a specific membership document.
 * @param {string} membershipId - The ID of the membership document.
 *img
 * @param {string} newRole - The new role (e.g., "company_admin").
 */
export async function updateMembershipRole(membershipId, newRole) {
    if (!membershipId) return;
    const membershipRef = doc(db, "memberships", membershipId);
    return await updateDoc(membershipRef, { role: newRole });
}

/**
 * NEW: Deletes a specific membership document.
 * @param {string} membershipId - The ID of the membership document to delete.
 */
export async function deleteMembership(membershipId) {
    if (!membershipId) return;
    const membershipRef = doc(db, "memberships", membershipId);
    return await deleteDoc(membershipRef);
}


/**
 * Loads all companies from the 'companies' collection.
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadCompanies() {
    return await getDocs(collection(db, "companies"));
}

/**
 * Fetches specific company profiles based on a list of IDs.
 * @param {string[]} companyIds - An array of company document IDs.
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function getCompaniesFromIds(companyIds) {
    if (!companyIds || companyIds.length === 0) {
        return null; // Return null instead of throwing an error
    }
    const companyRef = collection(db, "companies");
    const q = query(companyRef, where(documentId(), "in", companyIds));
    return await getDocs(q);
}

/**
 * Creates a new company document in the 'companies' collection.
 * @param {object} companyData - The structured company data from the form.
 * @returns {Promise<DocumentReference>} The reference to the newly created document.
 */
export async function createNewCompany(companyData) {
    // Add a check for uniqueness of the appSlug
    const slugQuery = query(collection(db, "companies"), where("appSlug", "==", companyData.appSlug));
    const slugSnapshot = await getDocs(slugQuery);
    
    if (!slugSnapshot.empty) {
        throw new Error(`The URL Slug "${companyData.appSlug}" is already taken. Please choose a unique one.`);
    }

    return await addDoc(collection(db, "companies"), companyData);
}

/**
 * NEW: Updates an existing company document.
 * Checks for appSlug uniqueness if it's being changed.
 * @param {string} companyId - The ID of the company document to update.
 * @param {object} companyData - The updated company data object.
 * @param {string} originalSlug - The original slug to check against.
 */
export async function updateCompany(companyId, companyData, originalSlug) {
    // If the slug hasn't changed, just update the document
    if (companyData.appSlug === originalSlug) {
        const companyRef = doc(db, "companies", companyId);
        return await updateDoc(companyRef, companyData);
    }
    
    // If slug *has* changed, we must check for uniqueness first
    const slugQuery = query(collection(db, "companies"), where("appSlug", "==", companyData.appSlug));
    const slugSnapshot = await getDocs(slugQuery);
    
    if (!slugSnapshot.empty) {
        // Check if the doc found is the *same one* we are editing
        let isSameDoc = false;
        slugSnapshot.forEach(doc => {
            if (doc.id === companyId) {
                isSameDoc = true;
            }
        });

        // If it's not the same doc, then the slug is taken by *another* company
        if (!isSameDoc) {
             throw new Error(`The URL Slug "${companyData.appSlug}" is already taken. Please choose a unique one.`);
        }
    }

    // Slug is unique (or unchanged), proceed with update
    const companyRef = doc(db, "companies", companyId);
    return await updateDoc(companyRef, companyData);
}

/**
 * UPDATED: Fetches the company profile by calling a secure Cloud Function.
 * This function now returns the raw data object (JSON), not a DocumentSnapshot.
 * @param {string} companyId - The company's document ID.
 * @returns {Promise<object|null>} The company's data object or null.
 */
export async function getCompanyProfile(companyId) {
    if (!companyId) return null;
    
    try {
        const getProfile = httpsCallable(functions, 'getCompanyProfile');
        const result = await getProfile({ companyId: companyId });
        return result.data; // This is the company data object
    } catch (error) {
        console.error(`Error calling getCompanyProfile function for ${companyId}:`, error);
        return null;
    }
}


// --- Company Admin Functions ---

/**
 * Fetches applications for a *specific* companyId.
 * @param {string} companyId - The ID of the company.
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadApplications(companyId) {
    if (!companyId) {
        console.error("No Company ID provided to loadApplications");
        return null;
    }
    const applicationsRef = collection(db, "companies", companyId, "applications");
    return await getDocs(applicationsRef);
}

/**
 * Gets a specific application from a specific company.
 * @param {string} companyId - The ID of the company.
 * @param {string} applicationId - The ID of the application.
 * @returns {Promise<DocumentSnapshot>} The Firestore DocumentSnapshot.
 */
export async function getApplicationDoc(companyId, applicationId) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    return await getDoc(docRef);
}

/**
 * Updates the status of a specific application.
 * @param {string} companyId - The ID of the company.
 * @param {string} applicationId - The ID of the application.
 * @param {string} newStatus - The new status string.
 */
export async function updateApplicationStatus(companyId, applicationId, newStatus) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    await updateDoc(docRef, { status: newStatus });
}

