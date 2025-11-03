// src/storage.js
import { storage } from './firebase-config.js';
// UPDATED: Import v10 modular functions
import { 
    ref, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export async function getFileUrl(storagePath) {
    if (!storagePath) {
        console.warn("No storage path provided.");
        return null;
    }
    try {
        const fileRef = ref(storage, storagePath);
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (error) {
        console.error("Error getting file URL for path:", storagePath, error);
        if (error.code === 'storage/object-not-found') {
            console.warn("File not found at path:", storagePath);
        }
        return null; // Return null on any error
    }
}