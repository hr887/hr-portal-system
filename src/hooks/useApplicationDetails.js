// src/hooks/useApplicationDetails.js
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../firebase/config';
import { getCompanyProfile } from '../firebase/firestore';
import { logActivity } from '../utils/activityLogger';

export function useApplicationDetails(companyId, applicationId, onStatusUpdate) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data State
  const [appData, setAppData] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [collectionName, setCollectionName] = useState('applications');
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // URLs & Status
  const [fileUrls, setFileUrls] = useState({});
  const [currentStatus, setCurrentStatus] = useState('');

  // Assignment State
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');

  // --- 1. Fetch Team for Assignment ---
  useEffect(() => {
      if(!companyId) return;
      const fetchTeam = async () => {
          try {
              const q = query(collection(db, "memberships"), where("companyId", "==", companyId));
              const snap = await getDocs(q);
              const members = [];
              for(const m of snap.docs) {
                  const uSnap = await getDoc(doc(db, "users", m.data().userId));
                  if(uSnap.exists()) members.push({ id: uSnap.id, name: uSnap.data().name });
              }
              setTeamMembers(members);
          } catch(e) { console.error("Team fetch error", e); }
      };
      fetchTeam();
  }, [companyId]);

  // --- 2. Load Application ---
  const loadApplication = useCallback(async () => {
    if (!companyId || !applicationId) return;
    setLoading(true);
    setError('');
    
    try {
      const companyProf = await getCompanyProfile(companyId);
      setCompanyProfile(companyProf);

      let coll = 'applications';
      let docRef = doc(db, "companies", companyId, coll, applicationId);
      let docSnap = await getDoc(docRef);

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
        setAssignedTo(data.assignedTo || '');
        
        const getUrl = async (fileData) => {
          if (!fileData) return null;
          if (fileData.storagePath) {
             try { return await getDownloadURL(ref(storage, fileData.storagePath)); } catch (e) { return null; }
          }
          return fileData.url || null; 
        };

        const [cdl, cdlBack, ssc, medical, twic, mvrConsent, drugTestConsent] = await Promise.all([
          getUrl(data['cdl-front']), getUrl(data['cdl-back']), getUrl(data['ssc-upload']),
          getUrl(data['med-card-upload']), getUrl(data['twic-card-upload']),
          getUrl(data['mvr-consent-upload']), getUrl(data['drug-test-consent-upload'])
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

  // --- Handlers ---

  const handleAssignChange = async (newUserId) => {
      setAssignedTo(newUserId);
      const docRef = doc(db, "companies", companyId, collectionName, applicationId);
      const newOwnerName = teamMembers.find(m => m.id === newUserId)?.name || 'Unassigned';

      try {
          await updateDoc(docRef, { 
              assignedTo: newUserId,
              assignedToName: newOwnerName
          });
          await logActivity(companyId, collectionName, applicationId, "Assigned Updated", `Assigned to ${newOwnerName}`);
          if (onStatusUpdate) onStatusUpdate();
      } catch (error) {
          console.error("Error assigning:", error);
          alert("Failed to update assignment.");
      }
  };

  const handleDataChange = (field, value) => {
    setAppData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdminFileUpload = async (fieldKey, file) => {
    if (!file) return;
    setIsUploading(true);
    
    const oldStoragePath = appData[fieldKey]?.storagePath;
    if (oldStoragePath) {
        try { await deleteObject(ref(storage, oldStoragePath)); } catch (e) {}
    }

    const storagePath = `companies/${companyId}/applications/${applicationId}/${fieldKey}-${file.name}`;
    const fileRef = ref(storage, storagePath);

    try {
        await uploadBytes(fileRef, file);
        const newUrl = await getDownloadURL(fileRef);
        const fileData = { name: file.name, storagePath: storagePath, url: newUrl };
        
        setAppData(prev => ({ ...prev, [fieldKey]: fileData }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: newUrl }));
        
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, { [fieldKey]: fileData });
        await logActivity(companyId, collectionName, applicationId, "File Uploaded", `Uploaded ${fieldKey}`);

    } catch (error) {
        alert("File upload failed.");
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleAdminFileDelete = async (fieldKey, storagePath) => {
    if (!storagePath || !window.confirm("Remove file?")) return;
    setIsUploading(true);
    try {
        await deleteObject(ref(storage, storagePath));
        setAppData(prev => ({ ...prev, [fieldKey]: null }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: null }));
        
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, { [fieldKey]: null });
        await logActivity(companyId, collectionName, applicationId, "File Deleted", `Deleted ${fieldKey}`);

    } catch (error) {
        alert("File deletion failed.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, appData);
        await logActivity(companyId, collectionName, applicationId, "Details Updated", "Edited application details");
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
      await logActivity(companyId, collectionName, applicationId, "Status Changed", `Status changed to ${newStatus}`);
      setCurrentStatus(newStatus);
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  return {
    loading, error, appData, companyProfile, collectionName, fileUrls, currentStatus,
    isEditing, setIsEditing, isSaving, isUploading,
    teamMembers, assignedTo, handleAssignChange,
    loadApplication, handleDataChange, handleAdminFileUpload, handleAdminFileDelete, handleSaveEdit, handleStatusUpdate
  };
}