// src/components/admin/BulkLeadAddingView.jsx
import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { writeBatch, doc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useBulkImport } from '../../hooks/useBulkImport';
import { BulkUploadLayout } from './BulkUploadLayout';

export function BulkLeadAddingView({ onDataUpdate, onClose }) {
  // 1. Use the shared logic hook
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

  // 3. The Super-Admin Specific DB Logic (Global Drivers)
  const handleConfirmUpload = async () => {
    setUploading(true);
    setProgress('Checking for duplicates...');
    
    let createdCount = 0;
    let updatedCount = 0;

    try {
        const batchSize = 450; 
        let currentBatch = writeBatch(db);
        let opCount = 0;

        for (let i = 0; i < csvData.length; i++) {
            const data = csvData[i];
            setProgress(`Processing ${i + 1} / ${csvData.length}...`);

            // Check for existing driver by Email OR Phone in GLOBAL collection
            let existingDoc = null;
            const driversRef = collection(db, "drivers");
            
            // A. Check Email
            if (!data.isEmailPlaceholder) {
                const qEmail = query(driversRef, where("personalInfo.email", "==", data.email));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) existingDoc = snapEmail.docs[0];
            }

            // B. If not found by email, Check Phone (Normalized)
            // Note: We check against the formatted phone stored in 'personalInfo.phone' 
            // If you index 'normalizedPhone' in DB, change this query to match that field.
            if (!existingDoc && data.phone) {
                const qPhone = query(driversRef, where("personalInfo.phone", "==", data.phone));
                const snapPhone = await getDocs(qPhone);
                if (!snapPhone.empty) existingDoc = snapPhone.docs[0];
            }

            if (existingDoc) {
                // --- UPDATE EXISTING ---
                updatedCount++;
                const docRef = doc(db, "drivers", existingDoc.id);
                
                // Merge Logic
                const updatePayload = {
                    "lastUpdatedAt": serverTimestamp(),
                    "driverProfile.isBulkUpload": true
                };
                
                if(data.firstName) updatePayload["personalInfo.firstName"] = data.firstName;
                if(data.lastName) updatePayload["personalInfo.lastName"] = data.lastName;
                if(data.phone) updatePayload["personalInfo.phone"] = data.phone;
                if(data.city) updatePayload["personalInfo.city"] = data.city;
                if(data.state) updatePayload["personalInfo.state"] = data.state;
                if(data.experience) updatePayload["qualifications.experienceYears"] = data.experience;
                if(data.driverType) updatePayload["driverProfile.type"] = data.driverType;

                currentBatch.update(docRef, updatePayload);
            } else {
                // --- CREATE NEW ---
                createdCount++;
                const newDriverRef = doc(collection(db, "drivers"));
                
                const driverDoc = {
                    personalInfo: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        phone: data.phone,
                        city: data.city,
                        state: data.state,
                        zip: ''
                    },
                    driverProfile: {
                        type: data.driverType,
                        availability: 'actively_looking', 
                        isBulkUpload: true,
                        isEmailPlaceholder: !!data.isEmailPlaceholder
                    },
                    qualifications: {
                        experienceYears: data.experience || 'New'
                    },
                    createdAt: serverTimestamp(),
                    lastUpdatedAt: serverTimestamp(),
                    source: importMethod === 'gsheet' ? 'admin_gsheet_import' : 'admin_file_import'
                };
                currentBatch.set(newDriverRef, driverDoc);
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
        if (onDataUpdate) onDataUpdate();

    } catch (err) {
        console.error("Bulk Upload Error:", err);
        alert("Error processing batch: " + err.message);
    } finally {
        setUploading(false);
    }
  };

  // 4. Render Layout
  return (
    <BulkUploadLayout
        title="Bulk Lead Adding (Universal)"
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