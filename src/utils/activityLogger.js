// src/utils/activityLogger.js
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";

/**
 * Logs an activity to a subcollection 'activity_logs' within a lead or application.
 */
export async function logActivity(companyId, collectionName, docId, action, details, type = 'user') {
    try {
        if (!companyId || !docId) {
            console.error("Missing companyId or docId for activity log");
            return;
        }

        let authorName = "System";
        let authorId = "system";

        if (auth.currentUser) {
            authorId = auth.currentUser.uid;
            // Try to use the display name, or fetch from users collection if not available
            if (auth.currentUser.displayName) {
                authorName = auth.currentUser.displayName;
            } else {
                // Fallback: try to get name from local storage or just use email
                authorName = auth.currentUser.email; 
            }
        }

        // Ensure collection name is valid
        const validCollection = (collectionName === 'leads' || collectionName === 'companies') ? 'leads' : 'applications';

        const logsRef = collection(db, "companies", companyId, validCollection, docId, "activity_logs");
        
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
    }
}