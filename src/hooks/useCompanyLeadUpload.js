// src/hooks/useCompanyLeadUpload.js
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { writeBatch, collection, doc, serverTimestamp, query, where, getDocs, getDoc } from 'firebase/firestore';

export function useCompanyLeadUpload(companyId, onUploadComplete) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ created: 0, updated: 0 });
  const [step, setStep] = useState('upload'); // upload, preview, success
  
  // Assignment State
  const [assignmentMode, setAssignmentMode] = useState('unassigned'); // unassigned, round_robin, specific_user
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Load Team Members for Assignment
  useEffect(() => {
    if(!companyId) return;
    const fetchTeam = async () => {
        try {
            const q = query(collection(db, "memberships"), where("companyId", "==", companyId));
            const snap = await getDocs(q);
            const members = [];
            for(const m of snap.docs) {
                const userSnap = await getDoc(doc(db, "users", m.data().userId));
                if(userSnap.exists()) {
                    members.push({ id: userSnap.id, name: userSnap.data().name });
                }
            }
            setTeamMembers(members);
        } catch(e) { console.error("Error fetching team:", e); }
    };
    fetchTeam();
  }, [companyId]);

  const uploadLeads = async (csvData, importMethod) => {
    if (assignmentMode === 'specific_user' && !selectedUserId) {
        throw new Error("Please select a user for assignment.");
    }

    setUploading(true);
    setProgress('Syncing leads to database...');
    
    let createdCount = 0;
    let updatedCount = 0;

    try {
        const batchSize = 450; 
        let currentBatch = writeBatch(db);
        let opCount = 0;
        let rrIndex = 0;

        for (let i = 0; i < csvData.length; i++) {
            const data = csvData[i];
            setProgress(`Processing ${i + 1} / ${csvData.length}...`);

            // Assignment Logic
            let assignedTo = null;
            let assignedToName = null;

            if (assignmentMode === 'specific_user') {
                assignedTo = selectedUserId;
                assignedToName = teamMembers.find(m => m.id === selectedUserId)?.name || 'Unknown';
            } else if (assignmentMode === 'round_robin' && teamMembers.length > 0) {
                const member = teamMembers[rrIndex % teamMembers.length];
                assignedTo = member.id;
                assignedToName = member.name;
                rrIndex++;
            }

            // Check for existing lead
            const leadsRef = collection(db, "companies", companyId, "leads");
            let existingDoc = null;

            if (!data.isEmailPlaceholder) {
                const qEmail = query(leadsRef, where("email", "==", data.email));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) existingDoc = snapEmail.docs[0];
            }
            
            if (!existingDoc && data.phone) {
                const qPhone = query(leadsRef, where("phone", "==", data.phone));
                const snapPhone = await getDocs(qPhone);
                if (!snapPhone.empty) existingDoc = snapPhone.docs[0];
            }

            const leadPayload = {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone, 
                experience: data.experience,
                driverType: data.driverType,
                source: importMethod === 'gsheet' ? 'Company Import (Sheet)' : 'Company Import (File)',
                isPlatformLead: false,
                updatedAt: serverTimestamp()
            };

            if (!existingDoc) {
                // CREATE
                leadPayload.status = 'New Lead';
                leadPayload.createdAt = serverTimestamp();
                leadPayload.assignedTo = assignedTo;
                leadPayload.assignedToName = assignedToName;
                
                const newLeadRef = doc(collection(db, "companies", companyId, "leads"));
                currentBatch.set(newLeadRef, leadPayload);
                
                // Activity Log
                const logRef = collection(db, "companies", companyId, "leads", newLeadRef.id, "activity_logs");
                const logDoc = doc(logRef);
                currentBatch.set(logDoc, {
                    action: "Lead Imported",
                    details: `Imported via Bulk Upload. ${assignedToName ? `Assigned to ${assignedToName}` : 'Unassigned'}`,
                    type: 'system',
                    timestamp: serverTimestamp()
                });

                createdCount++;
            } else {
                // UPDATE
                const docRef = doc(db, "companies", companyId, "leads", existingDoc.id);
                currentBatch.update(docRef, leadPayload);
                
                const logRef = collection(db, "companies", companyId, "leads", existingDoc.id, "activity_logs");
                const logDoc = doc(logRef);
                currentBatch.set(logDoc, {
                    action: "Lead Data Updated",
                    details: "Updated via Bulk Upload match.",
                    type: 'system',
                    timestamp: serverTimestamp()
                });

                updatedCount++;
            }

            opCount++;
            if (opCount >= 200) { 
                await currentBatch.commit();
                currentBatch = writeBatch(db);
                opCount = 0;
            }
        }

        if (opCount > 0) {
            await currentBatch.commit();
        }

        setStats({ created: createdCount, updated: updatedCount });
        setStep('success');
        
        setTimeout(() => {
            if (onUploadComplete) onUploadComplete();
        }, 1500);

    } catch (err) {
        throw err;
    } finally {
        setUploading(false);
    }
  };

  return {
      uploading,
      progress,
      stats,
      step, setStep,
      assignmentMode, setAssignmentMode,
      teamMembers,
      selectedUserId, setSelectedUserId,
      uploadLeads
  };
}