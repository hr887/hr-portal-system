// src/components/ApplicationDetailsModal.jsx
import React, { useState } from 'react';
import { useData } from '../App.jsx';
import { generateApplicationPDF } from '../utils/pdfGenerator.js';
import { getFieldValue } from '../utils/helpers.js';
import { Download, X, ArrowRight, Edit2, Save, Trash2, FileText, UserCheck, Folder } from 'lucide-react';

// --- Custom Hook ---
import { useApplicationDetails } from '../hooks/useApplicationDetails';

// --- Child Components ---
import { ApplicationInfo } from './admin/ApplicationInfo.jsx';
import { MoveApplicationModal, DeleteConfirmModal } from './admin/ApplicationModals.jsx';
import { DQFileTab } from './admin/DQFileTab.jsx';
import { GeneralDocumentsTab } from './admin/GeneralDocumentsTab.jsx';

// --- Agreement Templates (For PDF Generation) ---
const agreementTemplates = [
  { id: 'agreement-release', title: 'RELEASE AND WAIVER', text: `[COMPANY_NAME] is released from all liability in responding to inquiries and releasing information in connection with my application.` },
  { id: 'agreement-certify', title: 'CERTIFICATION', text: `My signature below certifies that this application was completed by me, and that all entries on it and information in it is true and complete to the best of my knowledge.` },
  { id: 'agreement-auth-psp', title: 'AUTHORIZATION FOR PSP', text: `I authorize [COMPANY_NAME] ("Prospective Employer") to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history.` },
  { id: 'agreement-clearinghouse', title: 'CLEARINGHOUSE CONSENT', text: `I hereby provide consent to [COMPANY_NAME] to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse.` },
];

// --- UI Components ---
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

export function ApplicationDetailsModal({ 
  companyId, 
  applicationId, 
  onClose, 
  onStatusUpdate
}) {
  const { currentUserClaims } = useData();
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState('application'); // 'application', 'dqFile', 'documents'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const isSuperAdmin = currentUserClaims?.roles?.globalRole === 'super_admin';

  // --- Logic Hook ---
  const {
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
    loadApplication,
    handleDataChange,
    handleAdminFileUpload,
    handleAdminFileDelete,
    handleSaveEdit,
    handleStatusUpdate
  } = useApplicationDetails(companyId, applicationId, onStatusUpdate);

  // --- Handlers ---
  const handleDownloadPdf = () => {
    if (!appData || !companyProfile) {
      alert("Application data or company profile is not loaded yet.");
      return;
    }
    
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
  
  const handleManagementComplete = () => {
    if(onStatusUpdate) onStatusUpdate();
    onClose();
  };
  
  const currentAppName = getFieldValue(appData?.['firstName']) + ' ' + getFieldValue(appData?.['lastName']);
  
  // --- Render Tabs ---
  const renderTabContent = () => {
    if (loading) return <p className="text-gray-700 text-center p-10">Loading details...</p>;
    if (error) return <p className="text-red-600 text-center p-10">{error}</p>;
    if (!appData) return <p className="text-gray-700 text-center p-10">No application data found.</p>;

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
          />
        );
      case 'dqFile':
        return (
          <DQFileTab
            companyId={companyId}
            applicationId={applicationId}
            collectionName={collectionName}
          />
        );
      case 'documents':
        return (
          <GeneralDocumentsTab
            companyId={companyId}
            applicationId={applicationId}
            appData={appData}
            fileUrls={fileUrls}
            collectionName={collectionName}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div id="details-modal" className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-50 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
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
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 flex items-center px-4 sm:px-6">
          <TabButton
            label="Application"
            icon={<FileText size={16} />}
            isActive={activeTab === 'application'}
            onClick={() => setActiveTab('application')}
          />
          <TabButton
            label="DQ File"
            icon={<UserCheck size={16} />}
            isActive={activeTab === 'dqFile'}
            onClick={() => setActiveTab('dqFile')}
          />
          <TabButton
            label="Documents"
            icon={<Folder size={16} />}
            isActive={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          />
        </div>
        
        {/* Body */}
        <div id="modal-body" className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <footer className="p-4 bg-white border-t border-gray-200 flex justify-between items-center rounded-b-lg">
          <div className="flex gap-3">
            {activeTab === 'application' && isSuperAdmin && !isEditing && (
              <button 
                title="Move Application to another Company"
                className="px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-all flex items-center gap-2"
                onClick={() => setShowMoveModal(true)}
                disabled={isUploading}
              >
                <ArrowRight size={16} /> Move
              </button>
            )}
            
            {activeTab === 'application' && !isEditing ? (
                <button 
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                    onClick={() => setIsEditing(true)}
                    disabled={isUploading}
                >
                    <Edit2 size={16} /> Edit Data
                </button>
            ) : activeTab === 'application' ? (
                <div className="flex gap-3">
                    <button 
                        className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
                        onClick={() => {setIsEditing(false); loadApplication();}} 
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
            ) : (
                <div></div> 
            )}
          </div>
          
          {activeTab === 'application' && !isEditing && (
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
      
      {/* Modals */}
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