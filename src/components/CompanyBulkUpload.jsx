// src/components/CompanyBulkUpload.jsx
import React, { useState } from 'react';
import { db } from '../firebase/config';
import { writeBatch, collection, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useBulkImport } from '../hooks/useBulkImport';
import { BulkUploadLayout } from './admin/BulkUploadLayout';

export function CompanyBulkUpload({ companyId, onClose, onUploadComplete }) {
  // 1. Use the shared logic hook (Handles parsing, Google Sheets, and initial cleaning)
  const {
    csvData,
    step, setStep,
    importMethod, setImportMethod,
    sheetUrl, setSheetUrl,
    processingSheet,
    handleSheetImport,
    handleFileChange,
    reset
  } = useBulkImport();

  // 2. Local state for the Database Operation
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ created: 0, updated: 0 });

  // 3. Company-Specific DB Logic (Private Leads)
  const handleConfirmUpload = async () => {
    setUploading(true);
    setProgress('Syncing leads to database...');
    
    let createdCount = 0;
    let updatedCount = 0;

    try {
        const batchSize = 450; 
        let currentBatch = writeBatch(db);
        let opCount = 0;

        for (let i = 0; i < csvData.length; i++) {
            const data = csvData[i];
            setProgress(`Processing ${i + 1} / ${csvData.length}...`);

            // Check if lead exists in THIS COMPANY'S list
            const leadsRef = collection(db, "companies", companyId, "leads");
            let existingDoc = null;

            // A. Check Email
            if (!data.isEmailPlaceholder) {
                const qEmail = query(leadsRef, where("email", "==", data.email));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) existingDoc = snapEmail.docs[0];
            }
            
            // B. If not found by email, Check Phone (Formatted)
            if (!existingDoc && data.phone) {
                const qPhone = query(leadsRef, where("phone", "==", data.phone));
                const snapPhone = await getDocs(qPhone);
                if (!snapPhone.empty) existingDoc = snapPhone.docs[0];
            }

            if (existingDoc) {
                // --- UPDATE EXISTING ---
                updatedCount++;
                const docRef = doc(db, "companies", companyId, "leads", existingDoc.id);
                
                const updatePayload = { updatedAt: serverTimestamp() };
                
                // Update fields (prefer new CSV data over old data if present)
                if(data.firstName) updatePayload.firstName = data.firstName;
                if(data.lastName) updatePayload.lastName = data.lastName;
                if(data.phone) updatePayload.phone = data.phone;
                if(data.experience) updatePayload.experience = data.experience;
                if(data.driverType) updatePayload.driverType = data.driverType;

                currentBatch.update(docRef, updatePayload);

            } else {
                // --- CREATE NEW ---
                createdCount++;
                const newLeadRef = doc(collection(db, "companies", companyId, "leads"));
                
                currentBatch.set(newLeadRef, {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    experience: data.experience,
                    driverType: data.driverType,
                    status: 'New Lead',
                    source: importMethod === 'gsheet' ? 'Company Import (Sheet)' : 'Company Import (File)',
                    isPlatformLead: false, // Flag: Belongs to company, not safehaul network
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            opCount++;

            // Commit batch if full
            if (opCount >= batchSize) {
                await currentBatch.commit();
                currentBatch = writeBatch(db);
                opCount = 0;
            }
        }

        // Commit remaining
        if (opCount > 0) {
            await currentBatch.commit();
        }

        setStats({ created: createdCount, updated: updatedCount });
        setStep('success');
        
        // Delay close slightly so user can see the "Success" screen
        setTimeout(() => {
            if (onUploadComplete) onUploadComplete();
        }, 1000);

    } catch (err) {
        console.error("Upload Error:", err);
        alert("Error uploading batch: " + err.message);
    } finally {
        setUploading(false);
    }
  };

  // 4. Render Layout
  return (
    <BulkUploadLayout
        title="Import Private Leads"
        // Hook State
        step={step}
        importMethod={importMethod}
        setImportMethod={setImportMethod}
        sheetUrl={sheetUrl}
        setSheetUrl={setSheetUrl}
        processingSheet={processingSheet}
        handleSheetImport={handleSheetImport}
        handleFileChange={handleFileChange}
        csvData={csvData}
        reset={reset}
        // Actions
        onConfirm={handleConfirmUpload}
        onClose={onClose}
        uploading={uploading}
        progress={progress}
        stats={stats}
    />
  );
}