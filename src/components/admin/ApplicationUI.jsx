// src/components/admin/ApplicationUI.jsx
import React from 'react';
import { getFieldValue } from '../../utils/helpers.js';
import { Paperclip, Download } from 'lucide-react'; // <-- FIX: Import Paperclip and Download

// Reusable component for a "section" in the modal
export function Section({ title, children }) {
  return (
    <div className="bg-white shadow-md rounded-lg border border-gray-200 overflow-hidden">
      <h4 className="text-lg font-semibold text-gray-800 bg-gray-50 border-b border-gray-200 px-5 py-3">
        {title}
      </h4>
      <div className="p-5">
        <dl className="divide-y divide-gray-200">
          {children}
        </dl>
      </div>
    </div>
  );
}

// Reusable component for a label/value "field"
export function Field({ label, value }) {
  const displayValue = getFieldValue(value);
  const val = (displayValue === "Not Specified")
    ? <span className="text-gray-400 italic">{displayValue}</span>
    : <span className="text-gray-900">{displayValue}</span>;
  
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">{val}</dd>
    </div>
  );
}

// --- UPDATED FileLink component ---
// This now shows the file name and a separate "Download" button
export function FileLink({ url, label, fileName }) {
  const fName = getFieldValue(fileName);
  
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 overflow-hidden">
        <Paperclip size={18} className="text-gray-500 shrink-0" />
        <span className="text-sm text-gray-800 truncate" title={fName}>
          {label} ({fName})
        </span>
      </div>
      {url ? (
        <a 
          href={url} 
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
}