// src/firebase/storage.js
import { storage } from './config.js';
import { 
    ref, 
    getDownloadURL 
} from "firebase/storage";

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
