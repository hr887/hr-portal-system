// src/components/admin/ApplicationInfo.jsx
import React from 'react';
import { getFieldValue } from '../../utils/helpers.js';
import { Section, Field, FileLink } from './ApplicationUI.jsx';
import { ApplicationStatusManager } from './ApplicationStatusManager.jsx';
import { Loader2, Upload, Paperclip, Download } from 'lucide-react';

// --- UPDATED: Editable Field Component (now supports 'select') ---
function EditableField({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  isEditing, 
  type = 'text', 
  options = [] 
}) {
  const displayValue = getFieldValue(value);

  const renderDisplay = () => {
    const val = (displayValue === "Not Specified")
      ? <span className="text-gray-400 italic">{displayValue}</span>
      : <span className="text-gray-900">{displayValue}</span>;
    return val;
  };

  const renderInput = () => (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(fieldKey, e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
    />
  );

  const renderTextarea = () => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(fieldKey, e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
      rows={3}
    />
  );
  
  // --- NEW: Select/Dropdown Renderer ---
  const renderSelect = () => (
    <select
      value={value || ''}
      onChange={(e) => onChange(fieldKey, e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
    >
      <option value="">-- Select --</option>
      {options.map(opt => {
        // Handle options being simple strings or {value, label} objects
        const val = typeof opt === 'object' ? opt.value : opt;
        const lbl = typeof opt === 'object' ? opt.label : opt;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  );

  // --- NEW: Render Logic ---
  const renderEditControl = () => {
    switch(type) {
      case 'textarea':
        return renderTextarea();
      case 'select':
        return renderSelect();
      case 'date':
      case 'time':
      case 'text':
      default:
        return renderInput();
    }
  };

  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
        {isEditing ? renderEditControl() : renderDisplay()}
      </dd>
    </div>
  );
}
// --- End Editable Field Component ---

// --- Editable File Field ---
function EditableFileField({
  label,
  fileKey,
  fileData,
  fileUrl,
  isEditing,
  isUploading,
  onUpload,
  onDelete
}) {
  const fileName = fileData?.name ? getFieldValue(fileData.name) : 'Not Specified';

  const renderFileLink = () => {
    if (isUploading) {
      return (
        <div className="flex items-center gap-2 text-gray-500 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Loader2 size={18} className="animate-spin" />
          Uploading...
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 overflow-hidden">
          <Paperclip size={18} className="text-gray-500 shrink-0" />
          <span className="text-sm text-gray-800 truncate" title={fileName}>
            {label} ({fileName})
          </span>
        </div>
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium flex items-center gap-1.5 shrink-0"
          >
            <Download size={14} />
            View/Download
          </a>
        ) : (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md font-medium shrink-0">
            Not Available
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
        {isEditing ? (
          <div className="space-y-2">
            {renderFileLink()}
            <div className="flex gap-2">
              <label className="cursor-pointer px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-all">
                Replace
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => onUpload(fileKey, e.target.files[0])}
                />
              </label>
              {fileUrl && (
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-all"
                  onClick={() => onDelete(fileKey, fileData?.storagePath)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          renderFileLink()
        )}
      </dd>
    </div>
  );
}
// --- End Editable File Field ---

// --- Dynamic List Renderer ---
function renderDynamicList(data, listKey, itemKeys) {
  const list = data[listKey] || [];
  if (list.length === 0) return <Field label={listKey.charAt(0).toUpperCase() + listKey.slice(1)} value="None recorded" />;

  // NOTE: This section remains read-only as requested
  return (
    <div className="space-y-4">
      {list.map((item, index) => (
        <div key={index} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Item #{index + 1}</h5>
          {itemKeys.map(({ key, label }) => (
            <Field key={key} label={label} value={item[key]} />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Main Component ---
export function ApplicationInfo({
  appData,
  fileUrls,
  isEditing,
  isUploading,
  handleDataChange,
  handleAdminFileUpload,
  handleAdminFileDelete,
  // Status Manager Props
  companyId,
  applicationId,
  currentStatus,
  handleStatusUpdate
  // --- REMOVED: isNestedApp prop ---
}) {
  const data = appData;
  const yesNoOptions = [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}];

  return (
    <div className="space-y-6">
      <Section title="Personal Information">
        <EditableField label="First name" fieldKey="firstName" value={data.firstName} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Middle name" fieldKey="middleName" value={data.middleName} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Last name" fieldKey="lastName" value={data.lastName} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Suffix" fieldKey="suffix" value={data.suffix} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Known by other name(s)?" fieldKey="known-by-other-name" value={data['known-by-other-name']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Other Name(s)" fieldKey="otherName" value={data.otherName} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Email" fieldKey="email" value={data.email} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Phone" fieldKey="phone" value={data.phone} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="SMS Consent" fieldKey="sms-consent" value={data['sms-consent']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Date of Birth" fieldKey="dob" value={data.dob} onChange={handleDataChange} isEditing={isEditing} type="date" />
        <EditableField label="SSN (Last 4 for update)" fieldKey="ssn" value={data.ssn} onChange={handleDataChange} isEditing={isEditing} type="text" />
      </Section>

      <Section title="Address History (Step 1)">
        <EditableField label="Current Street" fieldKey="street" value={data.street} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Current City" fieldKey="city" value={data.city} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Current State" fieldKey="state" value={data.state} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Current ZIP" fieldKey="zip" value={data.zip} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Lived here 3+ yrs?" fieldKey="residence-3-years" value={data['residence-3-years']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        {data['residence-3-years'] === 'no' && (
          <>
            <EditableField label="Prev Street" fieldKey="prevStreet" value={data.prevStreet} onChange={handleDataChange} isEditing={isEditing} />
            <EditableField label="Prev City" fieldKey="prevCity" value={data.prevCity} onChange={handleDataChange} isEditing={isEditing} />
            <EditableField label="Prev State" fieldKey="prevState" value={data.prevState} onChange={handleDataChange} isEditing={isEditing} />
            <EditableField label="Prev ZIP" fieldKey="prevZip" value={data.prevZip} onChange={handleDataChange} isEditing={isEditing} />
          </>
        )}
      </Section>

      <Section title="General Qualifications">
        <EditableField label="Legal to Work in U.S." fieldKey="legal-work" value={data['legal-work']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="English Fluency" fieldKey="english-fluency" value={data['english-fluency']} onChange={handleDataChange} isEditing={isEditing} type="select" options={[{value: 'fluent', label: 'Fluent'}, {value: 'limited', label: 'Limited'}, {value: 'none', label: 'None'}]} />
        <EditableField label="Years of CDL Experience" fieldKey="experience-years" value={data['experience-years']} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Drug Test History" fieldKey="drug-test-positive" value={data['drug-test-positive']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Drug Test Explanation" fieldKey="drug-test-explanation" value={data['drug-test-explanation']} onChange={handleDataChange} isEditing={isEditing} type="textarea" />
        <EditableField label="DOT Return to Duty" fieldKey="dot-return-to-duty" value={data['dot-return-to-duty']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
      </Section>

      <Section title="License & Credentials">
        <EditableField label="License State" fieldKey="cdlState" value={data.cdlState} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="License Class" fieldKey="cdlClass" value={data.cdlClass} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="License Number" fieldKey="cdlNumber" value={data.cdlNumber} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="License Expiration" fieldKey="cdlExpiration" value={data.cdlExpiration} onChange={handleDataChange} isEditing={isEditing} type="date" />
        <EditableField label="Endorsements" fieldKey="endorsements" value={data.endorsements} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Has TWIC Card?" fieldKey="has-twic" value={data['has-twic']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="TWIC Expiration" fieldKey="twicExpiration" value={data.twicExpiration} onChange={handleDataChange} isEditing={isEditing} type="date" />
        <EditableFileField label="CDL (Front)" fileKey="cdl-front" fileData={data['cdl-front']} fileUrl={fileUrls.cdl} isEditing={isEditing} isUploading={isUploading} onUpload={handleAdminFileUpload} onDelete={handleAdminFileDelete} />
        <EditableFileField label="CDL (Back)" fileKey="cdl-back" fileData={data['cdl-back']} fileUrl={fileUrls.cdlBack} isEditing={isEditing} isUploading={isUploading} onUpload={handleAdminFileUpload} onDelete={handleAdminFileDelete} />
        <EditableFileField label="TWIC Card" fileKey="twic-card-upload" fileData={data['twic-card-upload']} fileUrl={fileUrls.twic} isEditing={isEditing} isUploading={isUploading} onUpload={handleAdminFileUpload} onDelete={handleAdminFileDelete} />
      </Section>

      <Section title="Driving & Accident History (3 Yrs)">
        <EditableField label="MVR Consent" fieldKey="consent-mvr" value={data['consent-mvr']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="License Revoked History" fieldKey="revoked-licenses" value={data['revoked-licenses']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Driving Convictions" fieldKey="driving-convictions" value={data['driving-convictions']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Drug/Alcohol Convictions" fieldKey="drug-alcohol-convictions" value={data['drug-alcohol-convictions']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableFileField label="MVR Consent Form" fileKey="mvr-consent-upload" fileData={data['mvr-consent-upload']} fileUrl={fileUrls.mvrConsent} isEditing={isEditing} isUploading={isUploading} onUpload={handleAdminFileUpload} onDelete={handleAdminFileDelete} />
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Moving Violations</h5>
          {renderDynamicList(data, 'violations', [{ key: 'date', label: 'Date' }, { key: 'charge', label: 'Charge' }, { key: 'location', label: 'Location' }, { key: 'penalty', label: 'Penalty' }])}
        </div>
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Accidents</h5>
          {renderDynamicList(data, 'accidents', [{ key: 'date', label: 'Date' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'commercial', label: 'Commercial?' }, { key: 'preventable', label: 'Preventable?' }, { key: 'details', label: 'Details' }])}
        </div>
      </Section>

      <Section title="Work History & Employment Gaps">
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Previous Employers</h5>
          {renderDynamicList(data, 'employers', [{ key: 'name', label: 'Company' }, { key: 'position', label: 'Position' }, { key: 'dates', label: 'Dates' }, { key: 'reason', label: 'Reason' }])}
        </div>
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Employment Gaps (30+ days)</h5>
          {renderDynamicList(data, 'unemployment', [{ key: 'startDate', label: 'Start' }, { key: 'endDate', label: 'End' }, { key: 'details', label: 'Details' }])}
        </div>
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Driving Schools</h5>
          {renderDynamicList(data, 'schools', [{ key: 'name', label: 'School' }, { key: 'dates', label: 'Dates' }, { key: 'location', label: 'Location' }])}
        </div>
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Military Service</h5>
          {renderDynamicList(data, 'military', [{ key: 'branch', label: 'Branch' }, { key: 'start', label: 'Start' }, { key: 'end', label: 'End' }, { key: 'rank', label: 'Rank' }, { key: 'heavyEq', label: 'Heavy Eq?' }, { key: 'honorable', label: 'Honorable?' }])}
        </div>
      </Section>

      <Section title="Custom Questions & HOS">
        <EditableField label="Owner-Operator EIN" fieldKey="ein" value={data.ein} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Driver Initials" fieldKey="driverInitials" value={data.driverInitials} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Business Name" fieldKey="businessName" value={data.businessName} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Business Street" fieldKey="businessStreet" value={data.businessStreet} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Business City" fieldKey="businessCity" value={data.businessCity} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Business State" fieldKey="businessState" value={data.businessState} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Business Zip" fieldKey="businessZip" value={data.businessZip} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Exp. Straight Truck" fieldKey="expStraightTruckExp" value={data.expStraightTruckExp} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Exp. Straight Truck Miles" fieldKey="expStraightTruckMiles" value={data.expStraightTruckMiles} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Exp. Semi Trailer" fieldKey="expSemiTrailerExp" value={data.expSemiTrailerExp} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Exp. Semi Trailer Miles" fieldKey="expSemiTrailerMiles" value={data.expSemiTrailerMiles} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Exp. Two Trailers" fieldKey="expTwoTrailersExp" value={data.expTwoTrailersExp} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Exp. Two Trailers Miles" fieldKey="expTwoTrailersMiles" value={data.expTwoTrailersMiles} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #1 Name" fieldKey="ec1Name" value={data.ec1Name} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #1 Phone" fieldKey="ec1Phone" value={data.ec1Phone} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #1 Relationship" fieldKey="ec1Relationship" value={data.ec1Relationship} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #1 Address" fieldKey="ec1Address" value={data.ec1Address} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #2 Name" fieldKey="ec2Name" value={data.ec2Name} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #2 Phone" fieldKey="ec2Phone" value={data.ec2Phone} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #2 Relationship" fieldKey="ec2Relationship" value={data.ec2Relationship} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Contact #2 Address" fieldKey="ec2Address" value={data.ec2Address} onChange={handleDataChange} isEditing={isEditing} />
        <EditableField label="Felony History" fieldKey="has-felony" value={data['has-felony']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Felony Explanation" fieldKey="felonyExplanation" value={data.felonyExplanation} onChange={handleDataChange} isEditing={isEditing} type="textarea" />
        <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">HOS Last 7 Days (Hrs)</dt><dd className="mt-1 text-sm sm:mt-0 sm:col-span-2 text-gray-900">{[data.hosDay1, data.hosDay2, data.hosDay3, data.hosDay4, data.hosDay5, data.hosDay6, data.hosDay7].map(h => h || 0).join(', ')}</dd></div>
        <EditableField label="Last Relieved Date" fieldKey="lastRelievedDate" value={data.lastRelievedDate} onChange={handleDataChange} isEditing={isEditing} type="date" />
        <EditableField label="Last Relieved Time" fieldKey="lastRelievedTime" value={data.lastRelievedTime} onChange={handleDataChange} isEditing={isEditing} type="time" />
      </Section>

      <Section title="Final Agreements & Signature">
        <EditableField label="Agreed to Electronic Transaction" fieldKey="agree-electronic" value={data['agree-electronic']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Agreed to Background Check" fieldKey="agree-background-check" value={data['agree-background-check']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Authorized PSP Check" fieldKey="agree-psp" value={data['agree-psp']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Provided Clearinghouse Consent" fieldKey="agree-clearinghouse" value={data['agree-clearinghouse']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableField label="Final Certification" fieldKey="final-certification" value={data['final-certification']} onChange={handleDataChange} isEditing={isEditing} type="select" options={yesNoOptions} />
        <EditableFileField label="Drug Test Consent" fileKey="drug-test-consent-upload" fileData={data['drug-test-consent-upload']} fileUrl={fileUrls.drugTestConsent} isEditing={isEditing} isUploading={isUploading} onUpload={handleAdminFileUpload} onDelete={handleAdminFileDelete} />
        <EditableField label="Signature Date" fieldKey="signature-date" value={data['signature-date']} onChange={handleDataChange} isEditing={isEditing} type="date" />
        <div className="pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Driver Signature</h5>
          <div className="mt-1 p-4 border rounded-lg bg-gray-50 flex justify-center items-center">
            {data.signature ? <img src={data.signature} alt="Driver Signature" className="max-w-full h-auto border" /> : <span className="text-gray-500">Signature not provided.</span>}
          </div>
        </div>
      </Section>

      {!isEditing && (
        <ApplicationStatusManager
          companyId={companyId}
          applicationId={applicationId}
          currentStatus={currentStatus}
          onStatusUpdate={handleStatusUpdate}
          // --- REMOVED: isNestedApp prop ---
        />
      )}
    </div>
  );
}