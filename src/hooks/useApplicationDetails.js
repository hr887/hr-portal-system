// src/hooks/useApplicationDetails.js
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../firebase/config';
import { getCompanyProfile } from '../firebase/firestore';
import { getFileUrl } from '../firebase/storage'; // Reuse existing helper if available, or use logic below

export function useApplicationDetails(companyId, applicationId, onStatusUpdate) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data State
  const [appData, setAppData] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [collectionName, setCollectionName] = useState('applications'); // 'applications' or 'leads'
  
  // UI State for Edits/Uploads
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // URLs & Status
  const [fileUrls, setFileUrls] = useState({ cdl: null, ssc: null, medical: null, twic: null, mvrConsent: null, drugTestConsent: null });
  const [currentStatus, setCurrentStatus] = useState('');

  // --- LOAD DATA ---
  const loadApplication = useCallback(async () => {
    if (!companyId || !applicationId) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch Company Profile
      const companyProf = await getCompanyProfile(companyId);
      setCompanyProfile(companyProf);

      // 2. Determine Collection & Fetch Doc
      // Try 'applications' first
      let coll = 'applications';
      let docRef = doc(db, "companies", companyId, coll, applicationId);
      let docSnap = await getDoc(docRef);

      // If not found, try 'leads'
      if (!docSnap.exists()) {
          coll = 'leads';
          docRef = doc(db, "companies", companyId, coll, applicationId);
          docSnap = await getDoc(docRef);
      }

      if (docSnap.exists()) {
        setCollectionName(coll);
        const data = docSnap.data();
        setAppData(data);
        setCurrentStatus(data.status || 'New Application');
        
        // Helper to get URL
        const getUrl = async (fileData) => {
          if (!fileData) return null;
          if (fileData.storagePath) {
             try {
                 return await getDownloadURL(ref(storage, fileData.storagePath));
             } catch (e) { return null; }
          }
          return fileData.url || null; 
        };

        // Fetch file URLs
        const [cdl, cdlBack, ssc, medical, twic, mvrConsent, drugTestConsent] = await Promise.all([
          getUrl(data['cdl-front']),
          getUrl(data['cdl-back']),
          getUrl(data['ssc-upload']),
          getUrl(data['med-card-upload']),
          getUrl(data['twic-card-upload']),
          getUrl(data['mvr-consent-upload']),
          getUrl(data['drug-test-consent-upload'])
        ]);

        setFileUrls({ cdl, cdlBack, ssc, medical, twic, mvrConsent, drugTestConsent });
        
      } else {
        setError(`Could not find application details.`);
      }
    } catch (err) {
      console.error("Error fetching document:", err);
      setError("Error: Could not load application.");
    } finally {
      setLoading(false);
    }
  }, [companyId, applicationId]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  // --- HANDLERS ---

  const handleDataChange = (field, value) => {
    setAppData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdminFileUpload = async (fieldKey, file) => {
    if (!file) return;
    setIsUploading(true);
    
    // Delete old file if exists
    const oldStoragePath = appData[fieldKey]?.storagePath;
    if (oldStoragePath) {
        try { await deleteObject(ref(storage, oldStoragePath)); } catch (e) { console.warn(e); }
    }

    // Upload new file
    // Note: We store in 'applications' folder even for leads to keep storage rules simple
    const storagePath = `companies/${companyId}/applications/${applicationId}/${fieldKey}-${file.name}`;
    const fileRef = ref(storage, storagePath);

    try {
        await uploadBytes(fileRef, file);
        const newUrl = await getDownloadURL(fileRef);
        const fileData = { name: file.name, storagePath: storagePath, url: newUrl };
        
        setAppData(prev => ({ ...prev, [fieldKey]: fileData }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: newUrl }));
        
        // Update Firestore (Dynamic Path)
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, { [fieldKey]: fileData });
        
    } catch (error) {
        alert("File upload failed.");
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleAdminFileDelete = async (fieldKey, storagePath) => {
    if (!storagePath || !window.confirm("Are you sure you want to remove this file?")) return;
    setIsUploading(true);
    try {
        await deleteObject(ref(storage, storagePath));
        setAppData(prev => ({ ...prev, [fieldKey]: null }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: null }));
        
        // Update Firestore
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, { [fieldKey]: null });

    } catch (error) {
        alert("File deletion failed.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
        // Save using dynamic path
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, appData);
        setIsEditing(false);
        if (onStatusUpdate) onStatusUpdate(); 
    } catch (error) {
        alert(`Error saving: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const docRef = doc(db, "companies", companyId, collectionName, applicationId);
      await updateDoc(docRef, { status: newStatus });
      setCurrentStatus(newStatus);
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  return {
    loading,
    error,
    appData,
    companyProfile,
    collectionName,
    fileUrls,
    currentStatus,
    isEditing, setIsEditing,
    isSaving,
    isUploading,
    loadApplication, // Exposed in case we need to reload manually
    handleDataChange,
    handleAdminFileUpload,
    handleAdminFileDelete,
    handleSaveEdit,
    handleStatusUpdate
  };
}