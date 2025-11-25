// src/components/CompanyBulkUpload.jsx
import React, { useState } from 'react';
import { db } from '../firebase/config';
import { writeBatch, collection, doc, serverTimestamp } from 'firebase/firestore';
import { Upload, FileText, CheckCircle, Loader2, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export function CompanyBulkUpload({ companyId, onClose, onUploadComplete }) {
  const [csvData, setCsvData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [step, setStep] = useState('upload'); 

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      parseData(event.target.result);
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

        const findKey = (row, keywords) => {
            const rowKeys = Object.keys(row);
            return rowKeys.find(k => keywords.some(keyword => k.toLowerCase().includes(keyword)));
        };

        const parsedLeads = jsonData.map((row) => {
            const firstKey = findKey(row, ['firstname', 'first name', 'fname', 'first', 'given']);
            const lastKey = findKey(row, ['lastname', 'last name', 'lname', 'last', 'surname']);
            const emailKey = findKey(row, ['email', 'e-mail']);
            const phoneKey = findKey(row, ['phone', 'mobile', 'cell']);
            const expKey = findKey(row, ['experience', 'exp', 'years']);
            const typeKey = findKey(row, ['type', 'driver type']);

            const lead = {
                firstName: firstKey ? String(row[firstKey]).trim() : 'Unknown',
                lastName: lastKey ? String(row[lastKey]).trim() : 'Driver',
                email: emailKey ? String(row[emailKey]).trim() : '',
                phone: phoneKey ? String(row[phoneKey]).trim() : '',
                experience: expKey ? String(row[expKey]).trim() : '',
                driverType: typeKey ? String(row[typeKey]).trim() : 'Company Driver',
                status: 'New Lead',
                // IMPORTANT: We set these here, and rely on them in the dashboard
                source: 'Company Import', 
                isPlatformLead: false 
            };

            if (lead.email || lead.phone) return lead;
            return null;
        }).filter(l => l !== null);

        setCsvData(parsedLeads);
        setStep('preview');

    } catch (error) {
        console.error("Parse Error:", error);
        alert("Error reading file: " + error.message);
    }
  };

  const handleConfirmUpload = async () => {
    setUploading(true);
    setProgress('Saving leads...');

    try {
        const chunkSize = 450; 
        for (let i = 0; i < csvData.length; i += chunkSize) {
            const chunk = csvData.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(data => {
                const newLeadRef = doc(collection(db, "companies", companyId, "leads"));
                
                // Explicitly write the source and flag
                batch.set(newLeadRef, {
                    ...data,
                    source: 'Company Import', // <--- FORCE SOURCE
                    isPlatformLead: false,    // <--- FORCE FLAG
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
            setProgress(`Uploaded ${Math.min(i + chunkSize, csvData.length)} / ${csvData.length}...`);
        }

        setStep('success');
        setTimeout(() => {
            onUploadComplete();
            onClose();
        }, 1500);

    } catch (err) {
        console.error("Upload Error:", err);
        alert("Error uploading batch: " + err.message);
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Upload className="text-blue-600" /> Import Private Leads
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
            </div>

            <div className="p-6">
                {step === 'upload' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors relative">
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <FileText size={40} className="mx-auto text-blue-500 mb-4" />
                        <p className="text-lg font-semibold text-gray-700">Click to Upload Excel or CSV</p>
                        <p className="text-sm text-gray-500 mt-2">Columns: First Name, Last Name, Email, Phone, Experience</p>
                    </div>
                )}

                {step === 'preview' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-bold text-gray-700">Found {csvData.length} leads</p>
                            <button 
                                onClick={handleConfirmUpload} 
                                disabled={uploading}
                                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                                {uploading ? 'Importing...' : 'Import Leads'}
                            </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Phone</th>
                                        <th className="p-2">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvData.map((row, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="p-2">{row.firstName} {row.lastName}</td>
                                            <td className="p-2">{row.phone}</td>
                                            <td className="p-2">{row.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-10">
                        <CheckCircle size={50} className="text-green-500 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-gray-800">Import Complete!</h3>
                        <p className="text-gray-500 mt-2">These leads will appear in your "My Leads" tab.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}