// src/utils/activityLogger.js
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { getPortalUser } from "../firebase/firestore";

/**
 * Logs an activity to a subcollection 'activity_logs' within a lead or application.
 * 
 * @param {string} companyId - ID of the company
 * @param {string} collectionName - 'applications' or 'leads'
 * @param {string} docId - ID of the specific lead/app
 * @param {string} action - Short title (e.g., "Status Updated", "Lead Assigned")
 * @param {string} details - Description of the change
 * @param {string} type - 'system', 'user', 'upload', 'note'
 */
export async function logActivity(companyId, collectionName, docId, action, details, type = 'user') {
    try {
        let authorName = "System";
        let authorId = "system";

        if (auth.currentUser) {
            authorId = auth.currentUser.uid;
            // Try to get display name from Auth, fallback to DB fetch if needed, or just use email
            authorName = auth.currentUser.displayName || auth.currentUser.email;
            
            // Optional: Fetch precise name from 'users' collection if displayName is empty
            // For performance, we might skip this or cache it, but for now let's rely on Auth
        }

        const logsRef = collection(db, "companies", companyId, collectionName, docId, "activity_logs");
        
        await addDoc(logsRef, {
            action,
            details,
            type,
            performedBy: authorId,
            performedByName: authorName,
            timestamp: serverTimestamp()
        });

    } catch (error) {
        console.error("Failed to log activity:", error);
        // We don't throw here to prevent breaking the main flow if logging fails
    }
}