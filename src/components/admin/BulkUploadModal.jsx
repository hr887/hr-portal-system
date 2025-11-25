// src/components/admin/BulkUploadModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { Upload, X, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export function BulkUploadModal({ onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Expected headers: firstname, lastname, email, phone, experience, type
    const drivers = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(',');
      if (currentLine.length < 2) continue; // Skip empty lines

      const driver = {};
      headers.forEach((header, index) => {
        driver[header] = currentLine[index]?.trim();
      });

      // Basic Validation & Cleanup
      if (driver.firstname && driver.lastname) {
        drivers.push(driver);
      }
    }
    return drivers;
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress('Reading file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const driverList = parseCSV(text);
        
        setProgress(`Processing ${driverList.length} drivers...`);

        // Chunking for Batch Writes (Firestore limit is 500 per batch)
        const chunkSize = 450; 
        for (let i = 0; i < driverList.length; i += chunkSize) {
            const chunk = driverList.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(data => {
                // 1. Handle IDs and Missing Data
                const newDriverRef = doc(collection(db, "drivers")); // Auto-ID
                
                // Generate placeholder email if missing (so they can be indexed)
                const email = data.email || `no_email_${newDriverRef.id}@placeholder.com`;
                
                // 2. Construct Driver Object
                const driverDoc = {
                    personalInfo: {
                        firstName: data.firstname || 'Unknown',
                        lastName: data.lastname || 'Driver',
                        email: email,
                        phone: data.phone || '',
                        city: data.city || '',
                        state: data.state || '',
                        zip: ''
                    },
                    driverProfile: {
                        type: data.type || 'companyDriverSolo', // Default type
                        availability: 'actively_looking', // REQUIREMENT: Auto-set status
                        isBulkUpload: true // Flag to identify these leads
                    },
                    qualifications: {
                        experienceYears: data.experience || 'New'
                    },
                    createdAt: serverTimestamp(),
                    lastUpdatedAt: serverTimestamp(),
                    source: 'admin_bulk_import'
                };

                batch.set(newDriverRef, driverDoc);
            });

            await batch.commit();
            setProgress(`Uploaded ${Math.min(i + chunkSize, driverList.length)} / ${driverList.length}...`);
        }

        onUploadComplete();
        onClose();
      } catch (err) {
        console.error("Upload Error:", err);
        setError("Failed to upload CSV. Check format.");
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Upload className="text-blue-600" /> Bulk Import Leads
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                <strong>CSV Format Required:</strong><br/>
                firstname, lastname, email, phone, experience, type, city, state
            </div>

            {!uploading ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                    <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <FileText className="mx-auto text-gray-400 mb-3" size={40} />
                    {file ? (
                        <p className="text-gray-800 font-semibold">{file.name}</p>
                    ) : (
                        <p className="text-gray-500">Click to select CSV file</p>
                    )}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={32} />
                    <p className="text-gray-700 font-medium">{progress}</p>
                </div>
            )}

            {error && <p className="text-red-600 text-sm flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
            <button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
                {uploading ? 'Uploading...' : 'Start Import'}
            </button>
        </div>
      </div>
    </div>
  );
}