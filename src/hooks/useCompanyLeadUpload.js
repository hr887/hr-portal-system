// src/hooks/useCompanyLeadUpload.js
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
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

    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("You must be logged in to upload leads.");
    }

    // Fetch current user's name for the log (fallback to email if name missing)
    const currentUserName = currentUser.displayName || currentUser.email || "Admin";

    setUploading(true);
    setProgress('Syncing leads to database...');
    
    let createdCount = 0;
    let updatedCount = 0;

    try {
        // Firestore batch limit is 500 operations. 
        // Each lead involves 2 operations: 1 write/update to 'leads' + 1 write to 'activity_logs'
        // Safe batch size = 200 leads (400 operations)
        const batchLimit = 200; 
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
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '', 
                experience: data.experience || '',
                driverType: data.driverType || '',
                source: importMethod === 'gsheet' ? 'Company Import (Sheet)' : 'Company Import (File)',
                isPlatformLead: false,
                updatedAt: serverTimestamp()
            };

            // Prepare Common Log Data
            // FIX: Adding performedBy is critical for security rules
            const logData = {
                type: 'system',
                performedBy: currentUser.uid,
                performedByName: currentUserName,
                timestamp: serverTimestamp()
            };

            if (!existingDoc) {
                // CREATE NEW LEAD
                leadPayload.status = 'New Lead';
                leadPayload.createdAt = serverTimestamp();
                leadPayload.assignedTo = assignedTo;
                leadPayload.assignedToName = assignedToName;
                
                const newLeadRef = doc(collection(db, "companies", companyId, "leads"));
                currentBatch.set(newLeadRef, leadPayload);
                
                // Activity Log: Created
                const logRef = collection(db, "companies", companyId, "leads", newLeadRef.id, "activity_logs");
                const logDoc = doc(logRef);
                
                currentBatch.set(logDoc, {
                    ...logData,
                    action: "Lead Imported",
                    details: `Imported via Bulk Upload. ${assignedToName ? `Assigned to ${assignedToName}` : 'Unassigned'}`
                });

                createdCount++;
            } else {
                // UPDATE EXISTING LEAD
                const docRef = doc(db, "companies", companyId, "leads", existingDoc.id);
                currentBatch.update(docRef, leadPayload);
                
                // Activity Log: Updated
                const logRef = collection(db, "companies", companyId, "leads", existingDoc.id, "activity_logs");
                const logDoc = doc(logRef);
                
                currentBatch.set(logDoc, {
                    ...logData,
                    action: "Lead Data Updated",
                    details: "Updated via Bulk Upload match."
                });

                updatedCount++;
            }

            opCount++;
            if (opCount >= batchLimit) { 
                await currentBatch.commit();
                currentBatch = writeBatch(db);
                opCount = 0;
            }
        }

        // Commit remaining operations
        if (opCount > 0) {
            await currentBatch.commit();
        }

        setStats({ created: createdCount, updated: updatedCount });
        setStep('success');
        
        setTimeout(() => {
            if (onUploadComplete) onUploadComplete();
        }, 1500);

    } catch (err) {
        console.error("Batch Upload Error:", err);
        throw new Error(err.message || "Upload failed. Check permissions.");
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