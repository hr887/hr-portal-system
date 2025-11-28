// src/components/admin/ApplicationInfo.jsx
import React from 'react';
import { Section, InfoGrid, InfoItem } from './ApplicationUI.jsx';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers.js';
import { Phone, CheckCircle, XCircle, AlertTriangle, FileSignature, Truck, HelpCircle, AlertCircle } from 'lucide-react';

const DRIVER_POSITIONS = ["Company Driver", "Lease Operator", "Owner Operator", "Team Driver"];
const DRIVER_TYPES = ["Dry Van", "Reefer", "Flatbed", "Tanker", "Box Truck", "Car Hauler", "Step Deck", "Lowboy", "Conestoga", "Intermodal", "Power Only", "Hotshot"];

export function ApplicationInfo({ 
  appData, fileUrls, isEditing, isUploading, handleDataChange,
  companyId, applicationId, currentStatus, handleStatusUpdate,
  handleDriverTypeUpdate, isCompanyAdmin, isSuperAdmin, onPhoneClick 
}) {
  
  if (!appData) return null;

  const renderBooleanStatus = (val, labelTrue, labelFalse) => {
      if (val === null || val === undefined || val === '') {
          return (
            <div className="flex items-center gap-2">
                <AlertCircle className="text-gray-300" size={20}/>
                <span className="text-gray-400 italic">Not Specified</span>
            </div>
          );
      }
      const isTrue = String(val).toLowerCase() === 'yes' || val === true;
      return (
          <div className="flex items-center gap-2">
              {isTrue ? <CheckCircle className="text-green-500" size={20}/> : <XCircle className="text-red-500" size={20}/>}
              <span className={isTrue ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                  {isTrue ? labelTrue : labelFalse}
              </span>
          </div>
      );
  };

  // Helper for multi-select checkboxes in edit mode
  const handleTypeToggle = (type) => {
      let currentTypes = appData.driverType || [];
      // Ensure it's an array
      if (!Array.isArray(currentTypes)) currentTypes = [currentTypes];
      
      const newTypes = currentTypes.includes(type) 
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type];
      
      handleDataChange('driverType', newTypes);
  };

  return (
    <div className="space-y-6">
      
      {/* --- STATUS HEADER --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
           <span className="text-gray-500 text-sm font-semibold uppercase">Current Status</span>
           <div className="flex items-center gap-2 mt-1">
             <div className={`w-3 h-3 rounded-full ${currentStatus === 'Approved' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
             <span className="text-xl font-bold text-gray-800">{currentStatus}</span>
           </div>
        </div>
        
        {(isCompanyAdmin || isSuperAdmin) && !isEditing && (
           <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center w-full sm:w-auto">
             <select 
               className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
               value={currentStatus}
               onChange={(e) => handleStatusUpdate(e.target.value)}
             >
                <option value="New Application">New Application</option>
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Attempted">Attempted</option>
                <option value="In Review">In Review</option>
                <option value="Background Check">Background Check</option>
                <option value="Awaiting Documents">Awaiting Documents</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Disqualified">Disqualified</option>
             </select>
           </div>
        )}
      </div>

      {/* --- PERSONAL INFO --- */}
      <Section title="Personal Information">
        <InfoGrid>
          <InfoItem label="First Name" value={appData.firstName} isEditing={isEditing} onChange={v => handleDataChange('firstName', v)} />
          <InfoItem label="Middle Name" value={appData.middleName} isEditing={isEditing} onChange={v => handleDataChange('middleName', v)} />
          <InfoItem label="Last Name" value={appData.lastName} isEditing={isEditing} onChange={v => handleDataChange('lastName', v)} />
          
          <div className="col-span-1">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
             {isEditing ? (
                 <input className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={appData.phone || ''} onChange={(e) => handleDataChange('phone', e.target.value)} />
             ) : (
                 onPhoneClick && appData.phone ? (
                     <button onClick={onPhoneClick} className="text-lg font-medium text-blue-600 hover:underline flex items-center gap-2 transition-colors">
                        <Phone size={16} className="fill-blue-100"/> {formatPhoneNumber(getFieldValue(appData.phone))}
                     </button>
                 ) : (
                     <p className="text-lg font-medium text-gray-900">{formatPhoneNumber(getFieldValue(appData.phone))}</p>
                 )
             )}
          </div>

          <InfoItem label="Email" value={appData.email} isEditing={isEditing} onChange={v => handleDataChange('email', v)} />
          <InfoItem label="DOB" value={appData.dob} isEditing={isEditing} onChange={v => handleDataChange('dob', v)} />
          <InfoItem label="SSN" value={appData.ssn} isEditing={isEditing} onChange={v => handleDataChange('ssn', v)} />
        </InfoGrid>
        
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoItem label="Street" value={appData.street} isEditing={isEditing} onChange={v => handleDataChange('street', v)} />
            <InfoItem label="City" value={appData.city} isEditing={isEditing} onChange={v => handleDataChange('city', v)} />
            <InfoItem label="State" value={appData.state} isEditing={isEditing} onChange={v => handleDataChange('state', v)} />
            <InfoItem label="Zip" value={appData.zip} isEditing={isEditing} onChange={v => handleDataChange('zip', v)} />
        </div>
      </Section>

      {/* --- QUALIFICATIONS & TYPE --- */}
      <Section title="Position & Qualifications">
         <InfoGrid>
            {/* POSITION */}
            <InfoItem 
                label="Position Applied For" 
                value={appData.positionApplyingTo} 
                isEditing={isEditing} 
                onChange={v => handleDataChange('positionApplyingTo', v)} 
                options={DRIVER_POSITIONS} 
            />

            {/* DRIVER TYPES (Multi-Select Support) */}
            <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Types</label>
                {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                        {DRIVER_TYPES.map(type => {
                            const isSelected = (appData.driverType || []).includes(type);
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleTypeToggle(type)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                        isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-lg font-medium text-gray-900">
                        {Array.isArray(appData.driverType) ? appData.driverType.join(', ') : (appData.driverType || 'Not Specified')}
                    </p>
                )}
            </div>

            <InfoItem label="Experience" value={appData['experience-years'] || appData.experience} isEditing={isEditing} onChange={v => handleDataChange('experience-years', v)} />
            
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Legal to Work?</label>
                {isEditing ? (
                    <select className="w-full p-2 border border-gray-300 rounded" value={appData['legal-work'] || ''} onChange={(e) => handleDataChange('legal-work', e.target.value)}>
                        <option value="">Select...</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                ) : renderBooleanStatus(appData['legal-work'], 'Authorized', 'Not Authorized')}
            </div>
         </InfoGrid>

         <div className="mt-6 pt-4 border-t border-gray-100">
             <h4 className="text-sm font-bold text-gray-700 mb-3">Commercial Driver's License</h4>
             <InfoGrid>
                 <InfoItem label="License Number" value={appData.cdlNumber} isEditing={isEditing} onChange={v => handleDataChange('cdlNumber', v)} />
                 <InfoItem label="State" value={appData.cdlState} isEditing={isEditing} onChange={v => handleDataChange('cdlState', v)} />
                 <InfoItem label="Class" value={appData.cdlClass} isEditing={isEditing} onChange={v => handleDataChange('cdlClass', v)} />
                 <InfoItem label="Expiration" value={appData.cdlExpiration} isEditing={isEditing} onChange={v => handleDataChange('cdlExpiration', v)} />
                 <InfoItem label="Endorsements" value={appData.endorsements} isEditing={isEditing} onChange={v => handleDataChange('endorsements', v)} />
             </InfoGrid>
         </div>
      </Section>

      {/* --- CUSTOM QUESTIONS --- */}
      {appData.customAnswers && Object.keys(appData.customAnswers).length > 0 && (
          <Section title="Supplemental Questions">
              <div className="space-y-4">
                  {Object.entries(appData.customAnswers).map(([question, answer], i) => (
                      <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                             <HelpCircle size={12}/> {question}
                          </p>
                          <p className="text-sm text-gray-900 font-medium">{answer}</p>
                      </div>
                  ))}
              </div>
          </Section>
      )}

      {/* --- EMPLOYMENT HISTORY --- */}
      <Section title="Employment History">
          {appData.employers && appData.employers.length > 0 ? (
              <div className="space-y-6">
                  {appData.employers.map((emp, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900">{emp.name}</h4>
                              <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 border rounded">{emp.startDate} - {emp.endDate || 'Present'}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 text-sm text-gray-600">
                              <p><span className="font-medium">Address:</span> {emp.address}, {emp.city}, {emp.state}</p>
                              <p><span className="font-medium">Position:</span> {emp.position}</p>
                              <p><span className="font-medium">Reason:</span> {emp.reasonForLeaving}</p>
                          </div>
                      </div>
                  ))}
              </div>
          ) : <p className="text-gray-500 italic">No employment history provided.</p>}
      </Section>

      {/* --- SIGNATURE --- */}
      <Section title="Digital Signature & Consent">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">Signature</h4>
                  {appData.signature ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg inline-block">
                          <img src={appData.signature} alt="Applicant Signature" className="max-h-24 object-contain mix-blend-multiply" />
                      </div>
                  ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg flex items-center gap-2">
                          <AlertTriangle size={18}/> No digital signature on file.
                      </div>
                  )}
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                      <FileSignature size={16}/> Signed on: <span className="font-medium text-gray-800">{appData['signature-date'] || 'Unknown Date'}</span>
                  </div>
              </div>
          </div>
      </Section>

    </div>
  );
}