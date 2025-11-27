// src/firebase/firestore.js
import { db, functions } from './config.js';
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
    orderBy,
    documentId
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

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
 * Updates data for a specific user in the 'users' collection.
 * @param {string} userId - The ID of the user to update.
 * @param {object} data - An object containing the fields to update (e.g., { name: "New Name" }).
 */
export async function updateUser(userId, data) {
    if (!userId) return;
    const userDocRef = doc(db, "users", userId);
    return await updateDoc(userDocRef, data);
}

/**
 * Loads all users from the 'users' collection.
 * (Super Admin only)
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadAllUsers() {
    return await getDocs(collection(db, "users"));
}

/**
 * Loads all memberships from the 'memberships' collection. (Super Admin only)
 * @returns {Promise<QuerySnapshot>} The Firestore QuerySnapshot.
 */
export async function loadAllMemberships() {
    return await getDocs(collection(db, "memberships"));
}

/**
 * Fetches all memberships for a specific user.
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
 * Creates a new membership document.
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
 * Updates the role on a specific membership document.
 * @param {string} membershipId - The ID of the membership document.
 * @param {string} newRole - The new role (e.g., "company_admin").
 */
export async function updateMembershipRole(membershipId, newRole) {
    if (!membershipId) return;
    const membershipRef = doc(db, "memberships", membershipId);
    return await updateDoc(membershipRef, { role: newRole });
}

/**
 * Deletes a specific membership document.
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
        return null;
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
 * Updates an existing company document.
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
        let isSameDoc = false;
        slugSnapshot.forEach(doc => {
            if (doc.id === companyId) {
                isSameDoc = true;
            }
        });
        if (!isSameDoc) {
             throw new Error(`The URL Slug "${companyData.appSlug}" is already taken. Please choose a unique one.`);
        }
    }

    const companyRef = doc(db, "companies", companyId);
    return await updateDoc(companyRef, companyData);
}

/**
 * Fetches the company profile by calling a secure Cloud Function.
 * @param {string} companyId - The company's document ID.
 * @returns {Promise<object|null>} The company's data object or null.
 */
export async function getCompanyProfile(companyId) {
    if (!companyId) return null;
    try {
        const getProfile = httpsCallable(functions, 'getCompanyProfile');
        const result = await getProfile({ companyId: companyId });
        return result.data;
        // This is the company data object
    } catch (error) {
        console.error(`Error calling getCompanyProfile function for ${companyId}:`, error);
        return null;
    }
}


// --- Company Admin Functions ---

/**
 * Fetches applications *only* from the NESTED path.
 */
export async function loadApplications(companyId) {
    if (!companyId) {
        console.error("No Company ID provided to loadApplications");
        return [];
    }
    
    const nestedAppsRef = collection(db, "companies", companyId, "applications");
    const nestedQuery = query(nestedAppsRef);
    const nestedSnapshot = await getDocs(nestedQuery);

    const appList = [];
    nestedSnapshot.forEach(doc => {
        appList.push({
            id: doc.id,
            ...doc.data(),
            isNestedApp: true
        });
    });
    return appList;
}

/**
 * Gets a specific application.
 */
export async function getApplicationDoc(companyId, applicationId) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    return await getDoc(docRef);
}

/**
 * Updates the status of a specific application.
 */
export async function updateApplicationStatus(companyId, applicationId, newStatus) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    await updateDoc(docRef, { status: newStatus });
}

/**
 * Updates fields in a specific application document.
 */
export async function updateApplicationData(companyId, applicationId, data) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    return await updateDoc(docRef, data);
}

/**
 * Deletes a specific application document.
 */
export async function deleteApplication(companyId, applicationId) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    return await deleteDoc(docRef);
}

/**
 * Calls a Cloud Function to move an application.
 */
export async function moveApplication(sourceCompanyId, destinationCompanyId, applicationId) {
    if (!sourceCompanyId || !destinationCompanyId || !applicationId) {
        throw new Error("Missing parameters for moving application.");
    }
    
    const moveApp = httpsCallable(functions, 'moveApplication');
    return await moveApp({
        sourceCompanyId,
        destinationCompanyId,
        applicationId,
        isSourceNested: true 
    });
}


// --- Team Management Functions ---

/**
 * Fetches all memberships for a specific company.
 */
export async function getMembershipsForCompany(companyId) {
    if (!companyId) return null;
    const membershipsRef = collection(db, "memberships");
    const q = query(membershipsRef, where("companyId", "==", companyId));
    return await getDocs(q);
}

/**
 * Fetches user documents based on a list of user IDs.
 */
export async function getUsersFromIds(userIds) {
    if (!userIds || userIds.length === 0) {
        return null;
    }
    const userRef = collection(db, "users");
    const q = query(userRef, where(documentId(), "in", userIds));
    return await getDocs(q);
}


// --- Platform Leads Functions ---

/**
 * Fetch "Platform Leads" for a specific company.
 */
export async function loadCompanyLeads(companyId) {
    if (!companyId) return [];
    
    const leadsRef = collection(db, "companies", companyId, "leads");
    const q = query(leadsRef, orderBy("createdAt", "desc"));
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            // We use the boolean if it exists, otherwise assume true (legacy)
            // But for new uploads, the upload script sets isPlatformLead: false explicitly.
            return {
                id: doc.id,
                ...data,
                // If isPlatformLead is missing, assume true (legacy behavior)
                // If it exists, respect it (false for company uploads, true for super admin distribution)
                isPlatformLead: data.isPlatformLead !== false 
            };
        });
    } catch (error) {
        console.error("Error loading leads:", error);
        return [];
    }
}

// --- INTERNAL NOTES (HR ONLY) ---

/**
 * Fetch internal notes for a specific application.
 */
export async function getApplicationNotes(companyId, applicationId) {
    const notesRef = collection(db, "companies", companyId, "applications", applicationId, "internal_notes");
    // Order by newest first
    const q = query(notesRef, orderBy("createdAt", "desc"));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Add a new internal note.
 */
export async function addApplicationNote(companyId, applicationId, noteText, authorName) {
    const notesRef = collection(db, "companies", companyId, "applications", applicationId, "internal_notes");
    await addDoc(notesRef, {
        text: noteText,
        author: authorName,
        createdAt: serverTimestamp(),
        type: 'note'
    });
}