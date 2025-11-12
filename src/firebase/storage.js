// src/firebase/storage.js
import { storage } from './config.js';
import { 
    ref, 
    getDownloadURL,
    uploadBytes // <-- Import uploadBytes
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

/**
 * NEW: Uploads a company logo and returns the download URL.
 * This will overwrite any existing file at the same path.
 * @param {string} companyId - The company's document ID.
 * @param {File} file - The image file to upload.
 * @returns {Promise<string>} The public download URL of the uploaded file.
 */
export async function uploadCompanyLogo(companyId, file) {
    if (!companyId || !file) {
        throw new Error("Company ID and file are required for upload.");
    }
    
    // Get the file extension (e.g., "png", "jpg")
    const fileExtension = file.name.split('.').pop();
    const storagePath = `company_assets/${companyId}/logo.${fileExtension}`;
    const fileRef = ref(storage, storagePath);

    try {
        // Upload the file
        const snapshot = await uploadBytes(fileRef, file);
        
        // Get the public download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
        
    } catch (error) {
        console.error("Error uploading company logo:", error);
        throw new Error("File upload failed. Please try again.");
    }
}