// src/components/ApplicationDetailView.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Direct imports for dynamic paths
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; 
import { getFieldValue } from '../utils/helpers.js';
import { generateApplicationPDF } from '../utils/pdfGenerator.js';
import { getCompanyProfile } from '../firebase/firestore.js';
import { useData } from '../App.jsx';
import { 
  Download, X, ArrowRight, Edit2, Save, Trash2, 
  FileText, UserCheck, Folder, FileSignature, MessageSquare, Phone 
} from 'lucide-react';

// --- Child Components ---
import { ApplicationInfo } from './admin/ApplicationInfo.jsx';
import { MoveApplicationModal, DeleteConfirmModal } from './admin/ApplicationModals.jsx';
import { DQFileTab } from './admin/DQFileTab.jsx';
import { GeneralDocumentsTab } from './admin/GeneralDocumentsTab.jsx';
import { SendOfferModal } from './admin/SendOfferModal.jsx';
import { NotesTab } from './admin/NotesTab.jsx';

// --- Agreement Templates ---
const agreementTemplates = [
  { id: 'agreement-release', title: 'RELEASE AND WAIVER', text: `[COMPANY_NAME] is released from all liability in responding to inquiries and releasing information in connection with my application.` },
  { id: 'agreement-certify', title: 'CERTIFICATION', text: `My signature below certifies that this application was completed by me, and that all entries on it and information in it is true and complete to the best of my knowledge.` },
  { id: 'agreement-auth-psp', title: 'AUTHORIZATION FOR PSP', text: `I authorize [COMPANY_NAME] ("Prospective Employer") to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history.` },
  { id: 'agreement-clearinghouse', title: 'CLEARINGHOUSE CONSENT', text: `I hereby provide consent to [COMPANY_NAME] to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse.` },
];

function TabButton({ label, icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none flex sm:flex-col items-center justify-center gap-2 px-4 py-3 text-sm font-semibold border-b-4 transition-all
        ${isActive 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function ApplicationDetailView({ 
  companyId, 
  applicationId, 
  onClosePanel, 
  onStatusUpdate,
  isCompanyAdmin,
  onPhoneClick 
}) {
  const { currentUserClaims } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data State
  const [appData, setAppData] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [collectionName, setCollectionName] = useState('applications'); // 'applications' or 'leads'
  
  // Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  
  // Edit/Upload State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // URLs & Status
  const [fileUrls, setFileUrls] = useState({ cdl: null, ssc: null, medical: null, twic: null, mvrConsent: null, drugTestConsent: null });
  const [currentStatus, setCurrentStatus] = useState('');
  
  const [activeTab, setActiveTab] = useState('application'); 

  const isSuperAdmin = currentUserClaims?.roles?.globalRole === 'super_admin';

  // --- LOAD DATA ---
  const loadApplication = async () => {
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
             // Using getFileUrl from storage.js logic inline here for simplicity
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
  };
  
  useEffect(() => {
    setActiveTab('application');
    loadApplication();
  }, [companyId, applicationId]);

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
        try { await deleteObject(ref(storage, oldStoragePath)); } catch (e) {}
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
    if (!storagePath || !window.confirm("Remove file?")) return;
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
        onStatusUpdate(); 
    } catch (error) {
        alert(`Error saving: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!appData || !companyProfile) return;
    const companyName = companyProfile.companyName || "[COMPANY_NAME]";
    const agreements = agreementTemplates.map(agg => ({
      title: agg.title,
      text: agg.text.replace(/\[COMPANY_NAME\]/g, companyName)
    }));
    try {
      generateApplicationPDF({ applicant: appData, agreements: agreements, company: companyProfile });
    } catch (e) {
      alert("PDF Generation failed.");
    }
  };
  
  const handleStatusUpdate = async (newStatus) => {
    try {
      const docRef = doc(db, "companies", companyId, collectionName, applicationId);
      await updateDoc(docRef, { status: newStatus });
      setCurrentStatus(newStatus);
      onStatusUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };
  
  const handleManagementComplete = () => {
    onStatusUpdate();
    onClosePanel(); 
  };
  
  const currentAppName = getFieldValue(appData?.['firstName']) + ' ' + getFieldValue(appData?.['lastName']);
  const driverId = appData?.driverId || appData?.userId;

  // --- RENDER CONTENT ---
  const renderTabContent = () => {
    if (loading) return <p className="text-gray-700 text-center p-10">Loading details...</p>;
    if (error) return <p className="text-red-600 text-center p-10">{error}</p>;
    if (!appData) return <p className="text-gray-700 text-center p-10">No application data.</p>;

    switch (activeTab) {
      case 'application':
        return (
          <ApplicationInfo
            appData={appData}
            fileUrls={fileUrls}
            isEditing={isEditing}
            isUploading={isUploading}
            handleDataChange={handleDataChange}
            handleAdminFileUpload={handleAdminFileUpload}
            handleAdminFileDelete={handleAdminFileDelete}
            companyId={companyId}
            applicationId={applicationId}
            currentStatus={currentStatus}
            handleStatusUpdate={handleStatusUpdate}
            isCompanyAdmin={isCompanyAdmin} 
            isSuperAdmin={isSuperAdmin}
            onPhoneClick={onPhoneClick} 
          />
        );
      case 'dqFile': 
        // Pass collectionName to fetch from the right place
        return <DQFileTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />;
      case 'documents': 
        // Pass collectionName
        return <GeneralDocumentsTab companyId={companyId} applicationId={applicationId} appData={appData} fileUrls={fileUrls} collectionName={collectionName} />;
      case 'notes': 
        // Pass collectionName
        return <NotesTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />; 
      default: return null;
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow-xl w-full flex flex-col h-full border border-gray-200 min-h-0">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
            <h3 id="modal-title" className="text-2xl font-bold text-gray-800">
              {loading ? "Loading..." : currentAppName}
            </h3>
            
            {!loading && appData && appData.phone && (
                <button 
                    onClick={onPhoneClick}
                    className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    title="Call Driver"
                >
                    <Phone size={20} />
                </button>
            )}

            {['Approved', 'Background Check', 'Contacted'].includes(currentStatus) && (
                <button 
                    onClick={() => setShowOfferModal(true)}
                    className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-green-700 transition flex items-center gap-1"
                >
                    <FileSignature size={14} /> Send Offer
                </button>
            )}
        </div>
        <div className="flex gap-2">
          {!loading && appData && (
            <button className="py-2 px-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm transition-colors flex items-center gap-2" onClick={handleDownloadPdf}>
              <Download size={16} /> PDF
            </button>
          )}
          <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" onClick={onClosePanel}>
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 shrink-0">
        <TabButton label="Application" icon={<FileText size={16} />} isActive={activeTab === 'application'} onClick={() => setActiveTab('application')} />
        <TabButton label="DQ File" icon={<UserCheck size={16} />} isActive={activeTab === 'dqFile'} onClick={() => setActiveTab('dqFile')} />
        <TabButton label="Documents" icon={<Folder size={16} />} isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
        <TabButton label="Notes" icon={<MessageSquare size={16} />} isActive={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
      </div>
      
      {/* Body */}
      <div id="modal-body" className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
        {renderTabContent()}
      </div>

      {/* Footer */}
      <footer className="p-4 bg-white border-t border-gray-200 flex justify-between items-center rounded-b-lg shrink-0">
        <div className="flex gap-3">
          {activeTab === 'application' && isSuperAdmin && !isEditing && (
            <button className="px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-all flex items-center gap-2" onClick={() => setShowMoveModal(true)} disabled={isUploading}>
              <ArrowRight size={16} /> Move
            </button>
          )}
          
          {(isCompanyAdmin || isSuperAdmin) && activeTab === 'application' && !isEditing ? (
              <button className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2" onClick={() => setIsEditing(true)} disabled={isUploading}>
                  <Edit2 size={16} /> Edit Data
              </button>
          ) : (isCompanyAdmin || isSuperAdmin) && activeTab === 'application' ? (
              <div className="flex gap-3">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all" onClick={() => {setIsEditing(false); loadApplication();}} disabled={isSaving || isUploading}>Cancel</button>
                  <button className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50" onClick={handleSaveEdit} disabled={isSaving || isUploading}>
                      <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
              </div>
          ) : (<div></div>)}
        </div>
        
        {(isCompanyAdmin || isSuperAdmin) && activeTab === 'application' && !isEditing && (
          <button className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-all flex items-center gap-2" onClick={() => setShowDeleteConfirm(true)} disabled={isUploading}>
              <Trash2 size={16} /> Delete Application
          </button>
        )}
      </footer>

      {/* Modals */}
      {showDeleteConfirm && <DeleteConfirmModal appName={currentAppName} companyId={companyId} applicationId={applicationId} onClose={() => setShowDeleteConfirm(false)} onDeletionComplete={handleManagementComplete} />}
      {showMoveModal && isSuperAdmin && <MoveApplicationModal sourceCompanyId={companyId} applicationId={applicationId} onClose={() => setShowMoveModal(false)} onMoveComplete={handleManagementComplete} />}
      
      {showOfferModal && (
          <SendOfferModal
             companyId={companyId}
             applicationId={applicationId}
             driverId={driverId}
             driverName={currentAppName}
             onClose={() => setShowOfferModal(false)}
             onOfferSent={() => { handleStatusUpdate('Offer Sent'); loadApplication(); }}
          />
      )}
    </div>
  );
}