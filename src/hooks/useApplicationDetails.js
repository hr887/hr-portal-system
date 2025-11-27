// src/hooks/useApplicationDetails.js
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from '../firebase/config';
import { getCompanyProfile } from '../firebase/firestore';
import { logActivity } from '../utils/activityLogger';
import { useData } from '../App';
import { useToast } from '../components/feedback/ToastProvider'; // <-- NEW IMPORT

export function useApplicationDetails(companyId, applicationId, onStatusUpdate) {
  const { currentUserClaims } = useData();
  const { showSuccess, showError } = useToast(); // <-- Use Toast Hook

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [appData, setAppData] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [collectionName, setCollectionName] = useState('applications');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileUrls, setFileUrls] = useState({});
  const [currentStatus, setCurrentStatus] = useState('');

  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');

  // Permission Check
  const canEdit = 
    currentUserClaims?.roles?.globalRole === 'super_admin' || 
    currentUserClaims?.roles?.[companyId] === 'company_admin';

  // 1. Fetch Team
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
          } catch(e) {}
      };
      fetchTeam();
  }, [companyId]);

  // 2. Load Application
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
             try { return await getDownloadURL(ref(storage, fileData.storagePath));
             } catch (e) { return null; }
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
          await logActivity(companyId, collectionName, applicationId, "Reassigned", `Assigned to ${newOwnerName}`);
          showSuccess(`Assigned to ${newOwnerName}`);
          if (onStatusUpdate) onStatusUpdate();
      } catch (error) {
          console.error("Error assigning:", error);
          showError("Failed to update assignment.");
      }
  };

  const handleDataChange = (field, value) => {
    if (!canEdit) return;
    setAppData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdminFileUpload = async (fieldKey, file) => {
    if (!file || !canEdit) return;
    setIsUploading(true);
    
    const oldStoragePath = appData[fieldKey]?.storagePath;
    if (oldStoragePath) {
        try { await deleteObject(ref(storage, oldStoragePath));
        } catch (e) {}
    }

    const storagePath = `companies/${companyId}/${collectionName}/${applicationId}/${fieldKey}-${file.name}`;
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
        showSuccess("File uploaded successfully");
    } catch (error) {
        showError("File upload failed.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleAdminFileDelete = async (fieldKey, storagePath) => {
    if (!storagePath || !window.confirm("Remove file?") || !canEdit) return;
    setIsUploading(true);
    try {
        await deleteObject(ref(storage, storagePath));
        setAppData(prev => ({ ...prev, [fieldKey]: null }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: null }));
        
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, { [fieldKey]: null });
        await logActivity(companyId, collectionName, applicationId, "File Deleted", `Deleted ${fieldKey}`);
        showSuccess("File removed");
    } catch (error) {
        showError("File deletion failed.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
        const docRef = doc(db, "companies", companyId, collectionName, applicationId);
        await updateDoc(docRef, appData);
        await logActivity(companyId, collectionName, applicationId, "Details Updated", "Admin edited application details");
        showSuccess("Changes saved successfully");
        setIsEditing(false);
        if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
        showError(`Error saving: ${error.message}`);
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
      showSuccess(`Status updated to ${newStatus}`);
      if (onStatusUpdate) onStatusUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Failed to update status.");
    }
  };

  const handleDriverTypeUpdate = async (newType) => {
    try {
      const docRef = doc(db, "companies", companyId, collectionName, applicationId);
      await updateDoc(docRef, { driverType: newType });
      setAppData(prev => ({ ...prev, driverType: newType }));
      await logActivity(companyId, collectionName, applicationId, "Type Updated", `Driver type changed to ${newType}`);
      showSuccess(`Driver type updated to ${newType}`);
    } catch (error) {
      console.error("Error updating driver type:", error);
      showError("Failed to update driver type.");
    }
  };

  return {
    loading, error, appData, companyProfile, collectionName, fileUrls, currentStatus,
    isEditing, setIsEditing, isSaving, isUploading, canEdit,
    teamMembers, assignedTo, handleAssignChange,
    loadApplication, handleDataChange, handleAdminFileUpload, handleAdminFileDelete, handleSaveEdit, handleStatusUpdate,
    handleDriverTypeUpdate 
  };
}