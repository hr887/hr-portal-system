// src/components/ApplicationDetailView.jsx
import React, { useState } from 'react';
import { generateApplicationPDF } from '../utils/pdfGenerator.js';
import { getFieldValue } from '../utils/helpers.js';
import { useData } from '../App.jsx';
import { useApplicationDetails } from '../hooks/useApplicationDetails';
import { 
  Download, X, ArrowRight, Edit2, Save, Trash2, 
  FileText, UserCheck, Folder, FileSignature, MessageSquare, Phone, Clock
} from 'lucide-react';

import { ApplicationInfo } from './admin/ApplicationInfo.jsx';
import { MoveApplicationModal, DeleteConfirmModal } from './admin/ApplicationModals.jsx';
import { DQFileTab } from './admin/DQFileTab.jsx';
import { GeneralDocumentsTab } from './admin/GeneralDocumentsTab.jsx';
import { SendOfferModal } from './admin/SendOfferModal.jsx';
import { NotesTab } from './admin/NotesTab.jsx';
import { ActivityHistoryTab } from './admin/ActivityHistoryTab.jsx';

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
  
  // Hook Usage
  const {
    loading, error, appData, companyProfile, collectionName, fileUrls, currentStatus,
    isEditing, setIsEditing, isSaving, isUploading,
    teamMembers, assignedTo, handleAssignChange,
    loadApplication, handleDataChange, handleAdminFileUpload, handleAdminFileDelete, handleSaveEdit, handleStatusUpdate
  } = useApplicationDetails(companyId, applicationId, onStatusUpdate);

  // Local UI State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [activeTab, setActiveTab] = useState('application'); 

  const isSuperAdmin = currentUserClaims?.roles?.globalRole === 'super_admin';
  const currentAppName = getFieldValue(appData?.['firstName']) + ' ' + getFieldValue(appData?.['lastName']);
  const driverId = appData?.driverId || appData?.userId;

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
  
  const handleManagementComplete = () => {
    if (onStatusUpdate) onStatusUpdate();
    onClosePanel(); 
  };

  const renderTabContent = () => {
    if (loading) return <p className="text-gray-700 text-center p-10">Loading details...</p>;
    if (error) return <p className="text-red-600 text-center p-10">{error}</p>;
    if (!appData) return <p className="text-gray-700 text-center p-10">No application data.</p>;

    switch (activeTab) {
      case 'application':
        return (
          <div className="space-y-6">
             {/* Assignment Dropdown (Added here for Full Apps too) */}
             {!isEditing && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <UserCheck size={12}/> Assigned Recruiter
                    </label>
                    <select 
                        className="w-full p-2 text-sm border border-blue-200 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={assignedTo}
                        onChange={(e) => handleAssignChange(e.target.value)}
                    >
                        <option value="">-- Unassigned --</option>
                        {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
             )}

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
          </div>
        );
      case 'dqFile': 
        return <DQFileTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />;
      case 'documents': 
        return <GeneralDocumentsTab companyId={companyId} applicationId={applicationId} appData={appData} fileUrls={fileUrls} collectionName={collectionName} />;
      case 'notes': 
        return <NotesTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />; 
      case 'activity':
        return <ActivityHistoryTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />;
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
                <button onClick={onPhoneClick} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors" title="Call Driver">
                    <Phone size={20} />
                </button>
            )}

            {['Approved', 'Background Check', 'Contacted'].includes(currentStatus) && (
                <button onClick={() => setShowOfferModal(true)} className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-green-700 transition flex items-center gap-1">
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
      <div className="bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 shrink-0 overflow-x-auto">
        <TabButton label="Application" icon={<FileText size={16} />} isActive={activeTab === 'application'} onClick={() => setActiveTab('application')} />
        <TabButton label="DQ File" icon={<UserCheck size={16} />} isActive={activeTab === 'dqFile'} onClick={() => setActiveTab('dqFile')} />
        <TabButton label="Documents" icon={<Folder size={16} />} isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
        <TabButton label="Notes" icon={<MessageSquare size={16} />} isActive={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
        <TabButton label="Activity" icon={<Clock size={16} />} isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
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