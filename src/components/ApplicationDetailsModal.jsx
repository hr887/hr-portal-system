// src/components/ApplicationDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { getApplicationDoc, updateApplicationData, getCompanyProfile } from '../firebase/firestore.js'; 
import { getFileUrl } from '../firebase/storage.js'; 
import { storage } from '../firebase/config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; 
import { getFieldValue } from '../utils/helpers.js';
import { generateApplicationPDF } from '../utils/pdfGenerator.js';
import { useData } from '../App.jsx';
import { Download, X, ArrowRight, Edit2, Save, Trash2 } from 'lucide-react';

// --- Import ALL our refactored components ---
import { ApplicationInfo } from './admin/ApplicationInfo.jsx';
import { MoveApplicationModal, DeleteConfirmModal } from './admin/ApplicationModals.jsx';

// --- Agreement Templates ---
const agreementTemplates = [
  { id: 'agreement-release', title: 'RELEASE AND WAIVER', text: `[COMPANY_NAME] is released from all liability in responding to inquiries and releasing information in connection with my application.` },
  { id: 'agreement-certify', title: 'CERTIFICATION', text: `My signature below certifies that this application was completed by me, and that all entries on it and information in it is true and complete to the best of my knowledge.` },
  { id: 'agreement-auth-psp', title: 'AUTHORIZATION FOR PSP', text: `I authorize [COMPANY_NAME] ("Prospective Employer") to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history. I understand that I am authorizing the release of safety performance information including crash data from the previous five (5) years and inspection history from the previous three (3) years. I understand and acknowledge that this release of information may assist the Prospective Employer to make a determination regarding my suitability as an employee.` },
  { id: 'agreement-clearinghouse', title: 'CLEARINGHOUSE CONSENT', text: `I hereby provide consent to [COMPANY_NAME] to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse (Clearinghouse) to determine whether drug or alcohol violation information about me exists in the Clearinghouse. This limited query may be conducted by [COMPANY_NAME] on a periodic basis throughout my employment and no less than at least once a year.` },
];
// --- End Agreement Templates ---


export function ApplicationDetailsModal({ companyId, applicationId, onClose, onStatusUpdate }) {
  const { currentUserClaims } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  
  // Modal State for Management
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // State for fetched file URLs and current status
  const [fileUrls, setFileUrls] = useState({ cdl: null, ssc: null, medical: null, twic: null, mvrConsent: null, drugTestConsent: null });
  const [currentStatus, setCurrentStatus] = useState('');

  const isSuperAdmin = currentUserClaims?.roles?.globalRole === 'super_admin';

  // Function to fetch all necessary data
  const loadApplication = async () => {
    if (!companyId || !applicationId) return;
    setLoading(true);
    setError('');
    try {
      const [docSnap, companyProf] = await Promise.all([
        getApplicationDoc(companyId, applicationId),
        getCompanyProfile(companyId)
      ]);

      setCompanyProfile(companyProf);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppData(data);
        setCurrentStatus(data.status || 'New Application');
        
        // Fetch ALL file URLs
        const [cdl, cdlBack, ssc, medical, twic, mvrConsent, drugTestConsent] = await Promise.all([
          getFileUrl(data['cdl-front']?.storagePath),
          getFileUrl(data['cdl-back']?.storagePath),
          getFileUrl(data['ssc-upload']?.storagePath),
          getFileUrl(data['med-card-upload']?.storagePath),
          getFileUrl(data['twic-card-upload']?.storagePath),
          getFileUrl(data['mvr-consent-upload']?.storagePath),
          getFileUrl(data['drug-test-consent-upload']?.storagePath)
        ]);
        setFileUrls({ cdl, cdlBack, ssc, medical, twic, mvrConsent, drugTestConsent });
        
      } else {
        setError("Could not find application details.");
      }
    } catch (err) {
      console.error("Error fetching document or files:", err);
      setError("Error: Could not load application.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadApplication();
  }, [companyId, applicationId]);

  // Handler for live input changes
  const handleDataChange = (field, value) => {
    setAppData(prev => ({ ...prev, [field]: value }));
  };

  // --- Handler for Admin File Uploads ---
  const handleAdminFileUpload = async (fieldKey, file) => {
    if (!file) return;
    setIsUploading(true);
    
    const oldStoragePath = appData[fieldKey]?.storagePath;
    if (oldStoragePath) {
        try {
            await deleteObject(ref(storage, oldStoragePath));
        } catch (delError) {
            console.warn("Could not delete old file:", delError);
        }
    }

    const storagePath = `applications/${applicationId}/${fieldKey}-${file.name}`;
    const fileRef = ref(storage, storagePath);

    try {
        await uploadBytes(fileRef, file);
        const newUrl = await getDownloadURL(fileRef);
        
        const fileData = { name: file.name, storagePath: storagePath };
        setAppData(prev => ({ ...prev, [fieldKey]: fileData }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: newUrl }));
        
        await updateApplicationData(companyId, applicationId, { [fieldKey]: fileData });
        
    } catch (uploadError) {
        console.error("Upload failed:", uploadError);
        alert("File upload failed. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };
  
  // --- Handler for Admin File Deletes ---
  const handleAdminFileDelete = async (fieldKey, storagePath) => {
    if (!storagePath || !window.confirm("Are you sure you want to remove this file?")) return;
    
    setIsUploading(true);
    try {
        await deleteObject(ref(storage, storagePath));
        setAppData(prev => ({ ...prev, [fieldKey]: null }));
        setFileUrls(prev => ({ ...prev, [fieldKey]: null }));
        await updateApplicationData(companyId, applicationId, { [fieldKey]: null });
    } catch (error) {
        console.error("File deletion failed:", error);
        alert("File deletion failed. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };

  // --- UPDATED: Handler for saving edited data ---
  const handleSaveEdit = async () => {
    setIsSaving(true);
    
    // This list now includes all fields from ApplicationInfo.jsx
    const fieldsToUpdate = [
        'firstName', 'middleName', 'lastName', 'suffix', 'known-by-other-name', 'otherName', 'email', 
        'phone', 'sms-consent', 'dob', 'ssn', 'street', 'city', 'state', 'zip', 'residence-3-years', 'prevStreet', 
        'prevCity', 'prevState', 'prevZip', 'legal-work', 'english-fluency', 'experience-years',
        'drug-test-positive', 'drug-test-explanation', 'dot-return-to-duty', 'cdlState',
        'cdlClass', 'cdlNumber', 'cdlExpiration', 'endorsements', 'has-twic', 'twicExpiration',
        'consent-mvr', 'revoked-licenses', 'driving-convictions', 'drug-alcohol-convictions',
        'ein', 'driverInitials', 'businessName', 'businessStreet', 'businessCity', 'businessState', 'businessZip',
        'expStraightTruckExp', 'expStraightTruckMiles', 'expSemiTrailerExp', 'expSemiTrailerMiles',
        'expTwoTrailersExp', 'expTwoTrailersMiles', 'ec1Name', 'ec1Phone', 'ec1Relationship', 'ec1Address',
        'ec2Name', 'ec2Phone', 'ec2Relationship', 'ec2Address', 'has-felony', 'felonyExplanation',
        'hosDay1', 'hosDay2', 'hosDay3', 'hosDay4', 'hosDay5', 'hosDay6', 'hosDay7',
        'lastRelievedDate', 'lastRelievedTime', 'agree-electronic', 'agree-background-check',
        'agree-psp', 'agree-clearinghouse', 'final-certification', 'signature-date'
    ];
    
    // Create a new, clean object for the update
    const dataToUpdate = {};
    fieldsToUpdate.forEach(key => {
        const value = appData[key];
        // This explicitly converts undefined to null, fixing the Firestore error
        dataToUpdate[key] = value === undefined ? null : value;
    });

    try {
        await updateApplicationData(companyId, applicationId, dataToUpdate);
        setIsEditing(false);
        onStatusUpdate(); // Refresh parent lists
    } catch (error) {
        console.error("Error saving edited application data:", error);
        alert(`Error saving changes: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!appData || !companyProfile) {
      alert("Application data or company profile is not loaded yet.");
      return;
    }
    
    console.log("Data being sent to PDF:", appData);
    
    const companyName = companyProfile.companyName || "[COMPANY_NAME]";
    const agreements = agreementTemplates.map(agg => ({
      title: agg.title,
      text: agg.text.replace(/\[COMPANY_NAME\]/g, companyName)
    }));
    try {
      generateApplicationPDF({ applicant: appData, agreements: agreements, company: companyProfile });
    } catch (e) {
      console.error("PDF Generation failed:", e);
      alert("PDF Generation failed.");
    }
  };
  
  const handleStatusUpdate = (newStatus) => {
    setCurrentStatus(newStatus);
    onStatusUpdate();
  };
  
  const handleManagementComplete = () => {
    onStatusUpdate();
    onClose();
  };
  
  const currentAppName = getFieldValue(appData?.['firstName']) + ' ' + getFieldValue(appData?.['lastName']);

  return (
    <div id="details-modal" className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-50 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg flex justify-between items-center sticky top-0">
          <h3 id="modal-title" className="text-2xl font-bold text-gray-800">
            {loading ? "Loading Application..." : `Application: ${currentAppName}`}
          </h3>
          <div className="flex gap-2">
            {!loading && appData && (
              <button
                id="modal-download-btn"
                className="py-2 px-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm transition-colors flex items-center gap-2"
                onClick={handleDownloadPdf}
              >
                <Download size={16} />
                Download PDF
              </button>
            )}
            <button
              id="modal-close-btn"
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div id="modal-body" className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading && <p className="text-gray-700 text-center p-10">Loading details...</p>}
          {error && <p className="text-red-600 text-center p-10">{error}</p>}
          {appData && (
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
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </div>

        <footer className="p-4 bg-white border-t border-gray-200 flex justify-between items-center rounded-b-lg">
          <div className="flex gap-3">
            {isSuperAdmin && !isEditing && (
              <button 
                title="Move Application to another Company"
                className="px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-all flex items-center gap-2"
                onClick={() => setShowMoveModal(true)}
                disabled={isUploading}
              >
                <ArrowRight size={16} /> Move
              </button>
            )}
            
            {!isEditing ? (
                <button 
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                    onClick={() => setIsEditing(true)}
                    disabled={isUploading}
                >
                    <Edit2 size={16} /> Edit Data
                </button>
            ) : (
                <div className="flex gap-3">
                    <button 
                        className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
                        onClick={() => {setIsEditing(false); loadApplication();}} // Re-fetch to discard changes
                        disabled={isSaving || isUploading}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        onClick={handleSaveEdit}
                        disabled={isSaving || isUploading}
                    >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
            
          </div>
          
          {!isEditing && (
            <button 
                title="Delete Application"
                className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-all flex items-center gap-2"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isUploading}
            >
                <Trash2 size={16} /> Delete Application
            </button>
          )}
        </footer>

      </div>
      
      {showDeleteConfirm && (
        <DeleteConfirmModal
          appName={currentAppName}
          companyId={companyId}
          applicationId={applicationId}
          onClose={() => setShowDeleteConfirm(false)}
          onDeletionComplete={handleManagementComplete}
        />
      )}

      {showMoveModal && isSuperAdmin && (
        <MoveApplicationModal
          sourceCompanyId={companyId}
          applicationId={applicationId}
          onClose={() => setShowMoveModal(false)}
          onMoveComplete={handleManagementComplete}
        />
      )}
    </div>
  );
}