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

// --- USER & AUTH HELPERS ---

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
 * @param {string} userId 
 * @param {object} data 
 */
export async function updateUser(userId, data) {
    if (!userId) return;
    const userDocRef = doc(db, "users", userId);
    return await updateDoc(userDocRef, data);
}

/**
 * Loads all users from the 'users' collection. (Super Admin only)
 */
export async function loadAllUsers() {
    return await getDocs(collection(db, "users"));
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

// --- MEMBERSHIP MANAGEMENT ---

export async function loadAllMemberships() {
    return await getDocs(collection(db, "memberships"));
}

export async function getMembershipsForUser(userId) {
    if (!userId) return null;
    const membershipsRef = collection(db, "memberships");
    const q = query(membershipsRef, where("userId", "==", userId));
    return await getDocs(q);
}

export async function getMembershipsForCompany(companyId) {
    if (!companyId) return null;
    const membershipsRef = collection(db, "memberships");
    const q = query(membershipsRef, where("companyId", "==", companyId));
    return await getDocs(q);
}

export async function addMembership(membershipData) {
    const q = query(
        collection(db, "memberships"),
        where("userId", "==", membershipData.userId),
        where("companyId", "==", membershipData.companyId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error("User is already a member of this company.");
    }
    return await addDoc(collection(db, "memberships"), membershipData);
}

export async function updateMembershipRole(membershipId, newRole) {
    if (!membershipId) return;
    const membershipRef = doc(db, "memberships", membershipId);
    return await updateDoc(membershipRef, { role: newRole });
}

export async function deleteMembership(membershipId) {
    if (!membershipId) return;
    const membershipRef = doc(db, "memberships", membershipId);
    return await deleteDoc(membershipRef);
}

// --- COMPANY MANAGEMENT ---

export async function loadCompanies() {
    return await getDocs(collection(db, "companies"));
}

export async function getCompaniesFromIds(companyIds) {
    if (!companyIds || companyIds.length === 0) return null;
    const companyRef = collection(db, "companies");
    const q = query(companyRef, where(documentId(), "in", companyIds));
    return await getDocs(q);
}

/**
 * Fetches the company profile via Cloud Function (secure).
 */
export async function getCompanyProfile(companyId) {
    if (!companyId) return null;
    try {
        const getProfile = httpsCallable(functions, 'getCompanyProfile');
        const result = await getProfile({ companyId: companyId });
        return result.data;
    } catch (error) {
        console.error(`Error calling getCompanyProfile function for ${companyId}:`, error);
        return null;
    }
}

/**
 * Creates a new company document. Checks for unique slug.
 */
export async function createNewCompany(companyData) {
    const slugQuery = query(collection(db, "companies"), where("appSlug", "==", companyData.appSlug));
    const slugSnapshot = await getDocs(slugQuery);
    
    if (!slugSnapshot.empty) {
        throw new Error(`The URL Slug "${companyData.appSlug}" is already taken. Please choose a unique one.`);
    }

    return await addDoc(collection(db, "companies"), companyData);
}

/**
 * Updates basic company info. Checks for unique slug if changed.
 */
export async function updateCompany(companyId, companyData, originalSlug) {
    // If slug is changing, verify uniqueness
    if (companyData.appSlug && originalSlug && companyData.appSlug !== originalSlug) {
        const slugQuery = query(collection(db, "companies"), where("appSlug", "==", companyData.appSlug));
        const slugSnapshot = await getDocs(slugQuery);
        
        let isSameDoc = false;
        slugSnapshot.forEach(doc => {
            if (doc.id === companyId) isSameDoc = true;
        });
        
        if (!slugSnapshot.empty && !isSameDoc) {
             throw new Error(`The URL Slug "${companyData.appSlug}" is already taken. Please choose a unique one.`);
        }
    }

    const companyRef = doc(db, "companies", companyId);
    return await updateDoc(companyRef, companyData);
}

/**
 * Specific function to save Company Settings (Profile Tab).
 * This handles custom questions and other preferences.
 */
export async function saveCompanySettings(companyId, settingsData) {
    if (!companyId) throw new Error("Missing Company ID");
    const companyRef = doc(db, "companies", companyId);
    
    // We strictly define what can be updated here for safety
    const payload = {};
    if (settingsData.companyName) payload.companyName = settingsData.companyName;
    if (settingsData.contact) payload.contact = settingsData.contact;
    if (settingsData.address) payload.address = settingsData.address;
    if (settingsData.legal) payload.legal = settingsData.legal;
    if (settingsData.hiringPreferences) payload.hiringPreferences = settingsData.hiringPreferences;
    if (settingsData.structuredOffers) payload.structuredOffers = settingsData.structuredOffers;
    if (settingsData.customQuestions) payload.customQuestions = settingsData.customQuestions;
    if (settingsData.companyLogoUrl) payload.companyLogoUrl = settingsData.companyLogoUrl;
    
    // NEW: Allow saving driverTypes (Freight Types)
    if (settingsData.driverTypes) payload.driverTypes = settingsData.driverTypes;

    return await updateDoc(companyRef, payload);
}

// --- APPLICATION & LEAD MANAGEMENT ---

/**
 * Fetches applications from the NESTED path: companies/{id}/applications
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
 * Fetch "Platform Leads" (and company imported leads)
 */
export async function loadCompanyLeads(companyId) {
    if (!companyId) return [];
    
    const leadsRef = collection(db, "companies", companyId, "leads");
    const q = query(leadsRef, orderBy("createdAt", "desc"));
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Default to true if missing (legacy data), else use the flag
                isPlatformLead: data.isPlatformLead !== false 
            };
        });
    } catch (error) {
        console.error("Error loading leads:", error);
        return [];
    }
}

/**
 * Gets a specific application doc.
 */
export async function getApplicationDoc(companyId, applicationId) {
    const docRef = doc(db, "companies", companyId, "applications", applicationId);
    return await getDoc(docRef);
}

/**
 * Updates fields in a specific application or lead document.
 * Handles checking both collections if the specific type isn't known, 
 * but prefers precise targeting.
 */
export async function updateApplicationData(companyId, applicationId, data, collectionName = 'applications') {
    const docRef = doc(db, "companies", companyId, collectionName, applicationId);
    return await updateDoc(docRef, data);
}

export async function updateApplicationStatus(companyId, applicationId, newStatus, collectionName = 'applications') {
    const docRef = doc(db, "companies", companyId, collectionName, applicationId);
    await updateDoc(docRef, { status: newStatus });
}

export async function deleteApplication(companyId, applicationId, collectionName = 'applications') {
    const docRef = doc(db, "companies", companyId, collectionName, applicationId);
    return await deleteDoc(docRef);
}

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

// --- INTERNAL NOTES ---

export async function getApplicationNotes(companyId, applicationId, collectionName = 'applications') {
    const notesRef = collection(db, "companies", companyId, collectionName, applicationId, "internal_notes");
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

export async function addApplicationNote(companyId, applicationId, noteText, authorName, collectionName = 'applications') {
    const notesRef = collection(db, "companies", companyId, collectionName, applicationId, "internal_notes");
    // Dynamically import serverTimestamp only when needed to avoid issues
    const { serverTimestamp } = await import("firebase/firestore"); 
    await addDoc(notesRef, {
        text: noteText,
        author: authorName,
        createdAt: serverTimestamp(),
        type: 'note'
    });
}