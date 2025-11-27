// src/components/CompanyBulkUpload.jsx
import React from 'react';
import { Upload, FileText, CheckCircle, Loader2, Save, X, FileSpreadsheet, Link as LinkIcon, AlertCircle, Users } from 'lucide-react';
import { useBulkImport } from '../hooks/useBulkImport';
import { useCompanyLeadUpload } from '../hooks/useCompanyLeadUpload';
import { BulkUploadLayout } from './admin/BulkUploadLayout';

export function CompanyBulkUpload({ companyId, onClose, onUploadComplete }) {
  // 1. Parsing Hook
  const {
    csvData,
    step: importStep, setStep: setImportStep,
    importMethod, setImportMethod,
    sheetUrl, setSheetUrl,
    processingSheet,
    handleSheetImport,
    handleFileChange,
    reset: resetImport
  } = useBulkImport();

  // 2. Upload Logic Hook
  const {
      uploading,
      progress,
      stats,
      step: uploadStep, setStep: setUploadStep,
      assignmentMode, setAssignmentMode,
      teamMembers,
      selectedUserId, setSelectedUserId,
      uploadLeads
  } = useCompanyLeadUpload(companyId, onUploadComplete);

  // Sync steps between hooks (mostly just flowing forward)
  // If import is done, we move to preview. If upload is done, we move to success.
  const currentStep = uploadStep !== 'upload' ? uploadStep : importStep;

  const handleConfirm = async () => {
      try {
          await uploadLeads(csvData, importMethod);
      } catch (error) {
          alert(error.message);
      }
  };

  const handleReset = () => {
      resetImport();
      setUploadStep('upload');
  };

  // We wrap the Preview Content to include the Assignment UI
  const CustomPreviewContent = (
    <div className="space-y-6 mb-4">
        {/* Assignment Logic Section */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Users size={16}/> Lead Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                    onClick={() => setAssignmentMode('unassigned')}
                    className={`p-2 text-xs font-semibold rounded border ${assignmentMode === 'unassigned' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                    Unassigned (Pool)
                </button>
                <button 
                    onClick={() => setAssignmentMode('round_robin')}
                    className={`p-2 text-xs font-semibold rounded border ${assignmentMode === 'round_robin' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                    Round Robin (Team)
                </button>
                <button 
                    onClick={() => setAssignmentMode('specific_user')}
                    className={`p-2 text-xs font-semibold rounded border ${assignmentMode === 'specific_user' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                    Specific User
                </button>
            </div>

            {assignmentMode === 'specific_user' && (
                <div className="mt-3 animate-in fade-in">
                    <label className="block text-xs font-bold text-blue-800 mb-1">Select User</label>
                    <select 
                        className="w-full p-2 rounded border border-blue-200 text-sm"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                        <option value="">-- Choose Recruiter --</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            )}
             {assignmentMode === 'round_robin' && (
                <p className="text-xs text-blue-700 mt-2 italic">
                    Leads will be distributed equally among {teamMembers.length} team members.
                </p>
            )}
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <BulkUploadLayout
                title="Import Private Leads"
                step={currentStep}
                importMethod={importMethod}
                setImportMethod={setImportMethod}
                sheetUrl={sheetUrl}
                setSheetUrl={setSheetUrl}
                processingSheet={processingSheet}
                handleSheetImport={handleSheetImport}
                handleFileChange={handleFileChange}
                csvData={csvData}
                reset={handleReset}
                onConfirm={handleConfirm}
                onClose={onClose}
                uploading={uploading}
                progress={progress}
                stats={stats}
                // Inject custom content into the layout
                children={currentStep === 'preview' ? CustomPreviewContent : null}
            />
        </div>
    </div>
  );
}