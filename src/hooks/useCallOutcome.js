// hr portal/src/hooks/useCallOutcome.js

import { useState, useEffect } from 'react';
import { db, auth, functions } from '../firebase/config';
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { sendNotification } from '../lib/notificationService';
import { useToast } from '../components/feedback/ToastProvider';

const OUTCOMES = [
    { id: 'connected', isContact: true },
    { id: 'voicemail', isContact: false },
    { id: 'no_answer', isContact: false },
    { id: 'callback', isContact: true },
    { id: 'not_interested', isContact: true },
    { id: 'not_qualified', isContact: true },
    { id: 'wrong_number', isContact: false },
];

export function useCallOutcome(lead, companyId, onUpdate, onClose) {
    const { showSuccess, showError } = useToast();

    const [outcome, setOutcome] = useState('connected');
    const [notes, setNotes] = useState('');
    const [driverType, setDriverType] = useState(lead.driverType || '');
    const [callbackDate, setCallbackDate] = useState('');
    const [callbackTime, setCallbackTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [authorName, setAuthorName] = useState('Recruiter');

    // Fetch Recruiter Name on Load
    useEffect(() => {
        const fetchName = async () => {
            if (!auth.currentUser) return;
            let name = auth.currentUser.displayName;
            if (!name) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists() && userDoc.data().name) {
                    name = userDoc.data().name;
                }
            }
            if (name) setAuthorName(name);
        };
        fetchName();
    }, []);
    
    // Logic to determine if we show the driver type dropdown
    const showDriverTypeSelect = ['connected', 'not_interested', 'callback', 'not_qualified'].includes(outcome);
    // Logic to show callback inputs
    const showCallbackSelect = outcome === 'callback';

    const handleSave = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        if (showCallbackSelect && (!callbackDate || !callbackTime)) {
            showError("Please select a date and time for the callback.");
            return;
        }

        setSaving(true);

        const selectedOutcome = OUTCOMES.find(o => o.id === outcome);
        const outcomeLabel = selectedOutcome ? selectedOutcome.id.replace('_', ' ') : outcome;
        
        // Determine correct collection (Application vs Lead)
        const collectionName = (lead.submittedAt || lead.sourceType === 'Company App') ? 'applications' : 'leads';

        try {
            // 1. Log to Activities (For Leaderboard & Stats)
            await addDoc(collection(db, 'companies', companyId, collectionName, lead.id, 'activities'), {
                type: 'call',
                outcome: outcome,
                outcomeLabel: outcomeLabel,
                isContact: selectedOutcome.isContact,
                notes: notes,
                driverTypeUpdate: showDriverTypeSelect ? driverType : null,
                performedBy: auth.currentUser.uid,
                performedByName: authorName, 
                companyId: companyId, 
                leadId: lead.id,      
                timestamp: serverTimestamp()
            });

            // 2. Log to Internal Notes
            let noteText = `[Call Log: ${outcomeLabel}]`;
            if (showDriverTypeSelect && driverType) noteText += `\nIdentified as: ${driverType}`;
            if (showCallbackSelect) noteText += `\n📅 Callback scheduled for: ${callbackDate} at ${callbackTime}`;
            if (notes) noteText += `\n${notes}`;

            await addDoc(collection(db, 'companies', companyId, collectionName, lead.id, 'internal_notes'), {
                text: noteText,
                author: authorName,
                createdAt: serverTimestamp(),
                type: 'call_log' 
            });

            // 3. Update the Document Status & Driver Type
            const docRef = doc(db, 'companies', companyId, collectionName, lead.id);
            let newStatus = lead.status;
            if (outcome === 'connected') newStatus = 'Contacted';
            if (outcome === 'voicemail') newStatus = 'Attempted';
            if (outcome === 'not_interested') newStatus = 'Rejected';
            if (outcome === 'not_qualified') newStatus = 'Disqualified';
            if (outcome === 'wrong_number') newStatus = 'Disqualified';
            if (outcome === 'callback') newStatus = 'Contacted';

            const updateData = { 
                lastContactedAt: serverTimestamp(),
                lastContactedBy: auth.currentUser.uid
            };
            const forceUpdate = ['not_interested', 'not_qualified', 'wrong_number'].includes(outcome);
            
            if (forceUpdate || ['New Lead', 'New Application', 'Attempted', 'Contacted'].includes(lead.status)) {
                updateData.status = newStatus;
            }

            if (showDriverTypeSelect && driverType) {
                updateData.driverType = driverType;
            }

            await updateDoc(docRef, updateData);

            // --- 4. SCHEDULE NOTIFICATION (If Callback) ---
            if (showCallbackSelect) {
                const scheduledTime = new Date(`${callbackDate}T${callbackTime}`);
                await sendNotification({
                    recipientId: auth.currentUser.uid,
                    title: `📞 Callback: ${lead.firstName} ${lead.lastName}`,
                    message: notes || "Scheduled followup call.",
                    type: 'callback',
                    scheduledFor: scheduledTime,
                    metadata: { 
                        leadId: lead.id, 
                        companyId: companyId,
                        phone: lead.phone 
                    } 
                });
            }

            // --- 5. TRIGGER AUTOMATION (Email) ---
            if (['no_answer', 'voicemail'].includes(outcome) && lead.email && !lead.email.includes('placeholder.com')) {
                const sendEmail = httpsCallable(functions, 'sendAutomatedEmail');
                sendEmail({
                    companyId,
                    recipientEmail: lead.email,
                    triggerType: 'no_answer',
                    placeholders: {
                        driverfullname: `${lead.firstName} ${lead.lastName}`,
                        driverfirstname: lead.firstName,
                        recruitername: authorName
                    }
                }).catch(err => console.error("Automation failed silently:", err));
            }

            showSuccess(`Call log saved. Status updated to ${newStatus}.`);
            if (onUpdate) onUpdate();
            onClose();

        } catch (error) {
            console.error("Error logging call:", error);
            showError(`Failed to save call log. Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return {
        outcome, setOutcome,
        notes, setNotes,
        driverType, setDriverType,
        callbackDate, setCallbackDate,
        callbackTime, setCallbackTime,
        saving, 
        handleSave,
        showDriverTypeSelect,
        showCallbackSelect,
        showSuccess // Expose for the Telegram link success message
    };
}