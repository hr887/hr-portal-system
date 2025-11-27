// src/components/admin/ApplicationInfo.jsx
import React from 'react';
import { Section, InfoGrid, InfoItem } from './ApplicationUI.jsx';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers.js';
import { Phone, CheckCircle, XCircle, AlertTriangle, FileSignature, Truck } from 'lucide-react';

const DRIVER_TYPES = [
    "Dry Van", "Reefer", "Flatbed", "Box Truck", "Tanker", "Team"
];

export function ApplicationInfo({ 
  appData, 
  fileUrls, 
  isEditing, 
  isUploading, 
  handleDataChange,
  companyId,
  applicationId,
  currentStatus,
  handleStatusUpdate,
  handleDriverTypeUpdate, // <-- New Prop for instant header updates
  isCompanyAdmin,
  isSuperAdmin,
  onPhoneClick 
}) {
  
  if (!appData) return null;

  // Helper for Yes/No Badges
  const YesNoBadge = ({ value }) => (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${value === 'yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {value === 'yes' ? 'YES' : 'NO'}
      </span>
  );

  return (
    <div className="space-y-6">
      
      {/* --- STATUS & TYPE BAR (Header) --- */}
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
             
             {/* DRIVER TYPE DROPDOWN (New) */}
             <div className="relative w-full sm:w-auto">
                <Truck size={16} className="absolute left-2.5 top-3 text-gray-400 pointer-events-none"/>
                <select
                   className="w-full sm:w-48 pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-300 transition-colors"
                   value={appData.driverType || ''}
                   onChange={(e) => handleDriverTypeUpdate(e.target.value)}
                >
                    <option value="">-- Set Type --</option>
                    {DRIVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>

             {/* STATUS DROPDOWN */}
             <select 
               className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-300 transition-colors"
               value={currentStatus}
               onChange={(e) => handleStatusUpdate(e.target.value)}
             >
                <option value="New Application">New Application</option>
                <option value="Contacted">Contacted</option>
                <option value="In Review">In Review</option>
                <option value="Background Check">Background Check</option>
                <option value="Awaiting Documents">Awaiting Documents</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
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
          
          {/* PHONE FIELD WITH FORMATTING */}
          <div className="col-span-1">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
             {isEditing ? (
                 <input 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={appData.phone || ''}
                    onChange={(e) => handleDataChange('phone', e.target.value)}
                 />
             ) : (
                 onPhoneClick && appData.phone ? (
                     <button 
                        onClick={onPhoneClick}
                        className="text-lg font-medium text-blue-600 hover:underline flex items-center gap-2 transition-colors"
                        title="Call this number"
                     >
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

        {/* Previous Address - 3 Years */}
        <div className="mt-6">
            <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Address History (3 Years)</h4>
            <InfoGrid>
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lived at current address for 3 years?</label>
                    <p className="font-medium">{getFieldValue(appData['residence-3-years'])}</p>
                </div>
                {appData['residence-3-years'] === 'no' && (
                    <div className="col-span-3 bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-sm font-bold text-gray-600">Previous Address:</p>
                        <p>{getFieldValue(appData.prevStreet)}, {getFieldValue(appData.prevCity)}, {getFieldValue(appData.prevState)} {getFieldValue(appData.prevZip)}</p>
                    </div>
                )}
            </InfoGrid>
        </div>
      </Section>

      {/* --- QUALIFICATIONS & LICENSE --- */}
      <Section title="Qualifications & License">
          <InfoGrid>
            {/* NEW DRIVER TYPE FIELD IN EDIT MODE */}
            <InfoItem 
                label="Driver Type / Position" 
                value={appData.driverType || appData.positionApplyingTo} 
                isEditing={isEditing} 
                onChange={v => handleDataChange('driverType', v)} 
                options={DRIVER_TYPES} 
            />

            <InfoItem label="Experience" value={appData['experience-years'] || appData.experience} isEditing={isEditing} onChange={v => handleDataChange('experience-years', v)} />
            
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Legal to Work?</label>
                <div className="flex items-center gap-2 h-10">
                     {appData['legal-work'] === 'yes' ? <CheckCircle className="text-green-500" size={20}/> : <XCircle className="text-red-500" size={20}/>}
                    <span className="text-gray-900">{appData['legal-work'] === 'yes' ? 'Authorized' : 'Not Authorized'}</span>
                </div>
            </div>
            
             <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">English Fluency</label>
                <div className="flex items-center gap-2 h-10">
                     {appData['english-fluency'] === 'yes' ? <CheckCircle className="text-green-500" size={20}/> : <XCircle className="text-red-500" size={20}/>}
                     <span className="text-gray-900">{appData['english-fluency'] === 'yes' ? 'Fluent' : 'Not Fluent'}</span>
                </div>
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

      {/* --- DRIVING HISTORY --- */}
      <Section title="Driving History & Safety">
          <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Have you had any accidents in the last 3 years?</span>
                  <YesNoBadge value={appData.accidents && appData.accidents.length > 0 ? 'yes' : 'no'} />
              </div>
              {appData.accidents && appData.accidents.length > 0 && (
                  <div className="pl-4 border-l-2 border-red-200 space-y-3">
                      {appData.accidents.map((acc, i) => (
                          <div key={i} className="text-sm text-gray-600">
                              <strong>{acc.date}</strong>: {acc.nature} ({acc.fatalities || 0} Fatalities, {acc.injuries || 0} Injuries)
                          </div>
                      ))}
                  </div>
              )}

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Traffic convictions/forfeitures in last 3 years?</span>
                  <YesNoBadge value={appData.violations && appData.violations.length > 0 ? 'yes' : 'no'} />
              </div>
              {appData.violations && appData.violations.length > 0 && (
                  <div className="pl-4 border-l-2 border-red-200 space-y-3">
                      {appData.violations.map((vio, i) => (
                          <div key={i} className="text-sm text-gray-600">
                              <strong>{vio.date}</strong>: {vio.offense} ({vio.location}) - {vio.vehicleType}
                          </div>
                      ))}
                  </div>
              )}

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">License denied, revoked, or suspended?</span>
                  <YesNoBadge value={appData['revoked-licenses']} />
              </div>
              {appData['revoked-licenses'] === 'yes' && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{appData['revoked-details'] || "See explanation in notes."}</p>
              )}
          </div>
      </Section>

      {/* --- EMPLOYMENT HISTORY --- */}
      <Section title="Employment History (10 Years)">
          {appData.employers && appData.employers.length > 0 ? (
              <div className="space-y-6">
                  {appData.employers.map((emp, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900">{emp.name}</h4>
                              <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 border rounded">
                                  {emp.startDate} - {emp.endDate || 'Present'}
                              </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 text-sm text-gray-600">
                              <p><span className="font-medium">Address:</span> {emp.address}, {emp.city}, {emp.state}</p>
                              <p><span className="font-medium">Position:</span> {emp.position}</p>
                              <p><span className="font-medium">Reason for Leaving:</span> {emp.reasonForLeaving}</p>
                              <p><span className="font-medium">Subject to FMCSRs?</span> {emp.subjectToFmcsa === 'yes' ? 'Yes' : 'No'}</p>
                              <p><span className="font-medium">Drug/Alcohol Tested?</span> {emp.safetySensitive === 'yes' ? 'Yes' : 'No'}</p>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <p className="text-gray-500 italic">No employment history provided.</p>
          )}
      </Section>

      {/* --- SIGNATURE & CONSENT --- */}
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

              <div className="space-y-2 text-sm text-gray-600">
                  <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Consents Agreed</h4>
                  <p className="flex items-center gap-2">
                      {appData['agree-background-check'] ? <CheckCircle size={16} className="text-green-600"/> : <XCircle size={16} className="text-gray-400"/>}
                      Background Check Authorization
                  </p>
                  <p className="flex items-center gap-2">
                      {appData['agree-psp'] ? <CheckCircle size={16} className="text-green-600"/> : <XCircle size={16} className="text-gray-400"/>}
                      PSP Report Authorization
                  </p>
                  <p className="flex items-center gap-2">
                      {appData['agree-clearinghouse'] ? <CheckCircle size={16} className="text-green-600"/> : <XCircle size={16} className="text-gray-400"/>}
                      Drug & Alcohol Clearinghouse
                  </p>
                  <p className="flex items-center gap-2">
                      {appData['agree-electronic'] ? <CheckCircle size={16} className="text-green-600"/> : <XCircle size={16} className="text-gray-400"/>}
                      Electronic Signature Consent
                  </p>
              </div>
          </div>
      </Section>

    </div>
  );
}