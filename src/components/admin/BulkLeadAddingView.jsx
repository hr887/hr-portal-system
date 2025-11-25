// src/components/admin/BulkLeadAddingView.jsx
import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { Upload, FileText, CheckCircle, Loader2, Save, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export function BulkLeadAddingView({ onDataUpdate }) {
  const [csvData, setCsvData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [step, setStep] = useState('upload'); 

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvData([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      parseData(data);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const parseData = (buffer) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (jsonData.length === 0) {
            alert("File appears empty.");
            return;
        }

        const headers = Object.keys(jsonData[0]).map(h => h.toLowerCase().trim());
        
        const findKey = (row, keywords) => {
            const rowKeys = Object.keys(row);
            return rowKeys.find(k => keywords.some(keyword => k.toLowerCase().includes(keyword)));
        };

        const parsedDrivers = jsonData.map((row, index) => {
            const firstKey = findKey(row, ['firstname', 'first name', 'fname', 'first', 'given']);
            const lastKey = findKey(row, ['lastname', 'last name', 'lname', 'last', 'surname']);
            const emailKey = findKey(row, ['email', 'e-mail', 'mail']);
            const phoneKey = findKey(row, ['phone', 'mobile', 'cell']);
            const typeKey = findKey(row, ['type', 'role', 'position']);
            const expKey = findKey(row, ['experience', 'exp', 'years']);
            const cityKey = findKey(row, ['city', 'location']);
            const stateKey = findKey(row, ['state', 'province']);

            // Helper to clean data safely
            const safeVal = (val) => (val === undefined || val === null) ? '' : String(val).trim();

            let typeVal = typeKey ? safeVal(row[typeKey]) : '';
            if (!typeVal || typeVal.toLowerCase() === 'undefined') typeVal = 'unidentified';

            const driver = {
                firstname: firstKey ? safeVal(row[firstKey]) : 'Unknown',
                lastname: lastKey ? safeVal(row[lastKey]) : 'Driver',
                email: emailKey ? safeVal(row[emailKey]) : '',
                phone: phoneKey ? safeVal(row[phoneKey]) : '',
                type: typeVal,
                experience: expKey ? safeVal(row[expKey]) : '',
                city: cityKey ? safeVal(row[cityKey]) : '',
                state: stateKey ? safeVal(row[stateKey]) : ''
            };

            if (!driver.email) {
                driver.email = `no_email_${Date.now()}_${index}@placeholder.com`;
                driver.isEmailPlaceholder = true;
            }

            return driver;
        });

        setCsvData(parsedDrivers);
        setStep('preview');

    } catch (error) {
        console.error("Parse Error:", error);
        alert("Error reading file: " + error.message);
    }
  };

  const handleConfirmUpload = async () => {
    setUploading(true);
    setProgress('Initializing batch upload...');

    try {
        const chunkSize = 450; 
        for (let i = 0; i < csvData.length; i += chunkSize) {
            const chunk = csvData.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(data => {
                const newDriverRef = doc(collection(db, "drivers"));
                
                const driverDoc = {
                    personalInfo: {
                        firstName: data.firstname,
                        lastName: data.lastname,
                        email: data.email,
                        phone: data.phone,
                        city: data.city,
                        state: data.state,
                        zip: ''
                    },
                    driverProfile: {
                        type: data.type,
                        availability: 'actively_looking', 
                        isBulkUpload: true,
                        isEmailPlaceholder: !!data.isEmailPlaceholder
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
            setProgress(`Uploaded ${Math.min(i + chunkSize, csvData.length)} / ${csvData.length}...`);
        }

        setStep('success');
        if (onDataUpdate) onDataUpdate();

    } catch (err) {
        console.error("Bulk Upload Error:", err);
        alert("Error uploading batch: " + err.message);
    } finally {
        setUploading(false);
    }
  };

  const reset = () => {
      setCsvData([]);
      setStep('upload');
      setProgress('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px]">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Upload className="text-blue-600" /> Bulk Lead Adding (Universal)
        </h2>
        <p className="text-gray-500 mt-1">Upload Excel (.xlsx) or CSV files directly.</p>
      </div>

      <div className="p-8">
        
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
            <div className="max-w-xl mx-auto">
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-gray-50 transition-colors relative group">
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Upload Excel or CSV</h3>
                    <p className="text-gray-500 mt-2">Drag and drop or click to browse</p>
                    <div className="mt-6 text-xs text-gray-400 bg-white p-2 rounded border border-gray-100">
                        Supports: .xlsx, .xls, .csv
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Preview Data</h3>
                        <p className="text-sm text-gray-500">Found {csvData.length} records ready to add.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={reset} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium flex items-center gap-2">
                            <X size={18} /> Cancel
                        </button>
                        <button 
                            onClick={handleConfirmUpload} 
                            disabled={uploading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
                        >
                            {uploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            {uploading ? 'Adding to DB...' : 'Confirm & Add'}
                        </button>
                    </div>
                </div>
                
                {uploading && <p className="text-blue-600 font-semibold text-center py-2 animate-pulse">{progress}</p>}

                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[500px]">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-semibold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-b bg-gray-50">First Name</th>
                                <th className="p-3 border-b bg-gray-50">Last Name</th>
                                <th className="p-3 border-b bg-gray-50">Email</th>
                                <th className="p-3 border-b bg-gray-50">Phone</th>
                                <th className="p-3 border-b bg-gray-50">Type</th>
                                <th className="p-3 border-b bg-gray-50">City/State</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {csvData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-900">{row.firstname}</td>
                                    <td className="p-3">{row.lastname}</td>
                                    <td className="p-3">
                                        {row.isEmailPlaceholder ? <span className="text-yellow-600 italic text-xs flex items-center gap-1"><AlertCircle size={10}/> Auto-ID</span> : row.email}
                                    </td>
                                    <td className="p-3">{row.phone || <span className="text-gray-300">--</span>}</td>
                                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${row.type === 'unidentified' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'}`}>{row.type}</span></td>
                                    <td className="p-3">{row.city} {row.state}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
            <div className="text-center py-20">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Import Successful!</h3>
                <p className="text-gray-500 mt-2">{csvData.length} leads have been added to the database.</p>
                <div className="flex gap-4 justify-center mt-8">
                    <button onClick={reset} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">
                        Upload More
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}