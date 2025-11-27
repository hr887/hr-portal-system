// src/components/modals/CallOutcomeModal.jsx
import React, { useState } from 'react';
import { db, auth } from '../../firebase/config';
// Added getDoc to imports
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Phone, X, Save, Loader2, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const OUTCOMES = [
    { id: 'connected', label: 'Connected / Spoke', icon: <CheckCircle size={18} className="text-green-600"/>, isContact: true },
    { id: 'voicemail', label: 'Left Voicemail', icon: <MessageSquare size={18} className="text-yellow-600"/>, isContact: false },
    { id: 'no_answer', label: 'No Answer', icon: <XCircle size={18} className="text-red-600"/>, isContact: false },
    { id: 'callback', label: 'Scheduled Callback', icon: <Clock size={18} className="text-blue-600"/>, isContact: true },
    { id: 'not_interested', label: 'Not Interested', icon: <XCircle size={18} className="text-gray-600"/>, isContact: true },
    { id: 'wrong_number', label: 'Wrong Number', icon: <AlertCircle size={18} className="text-orange-600"/>, isContact: false },
];

export function CallOutcomeModal({ lead, companyId, onClose, onUpdate }) {
    const [outcome, setOutcome] = useState('connected');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!auth.currentUser) return;
        setSaving(true);

        const selectedOutcome = OUTCOMES.find(o => o.id === outcome);
        const isContact = selectedOutcome ? selectedOutcome.isContact : false;
        const outcomeLabel = selectedOutcome ? selectedOutcome.label : outcome;

        // Determine correct collection (Application vs Lead)
        const collectionName = (lead.submittedAt || lead.sourceType === 'Company App') ? 'applications' : 'leads';

        try {
            // --- FIX: Get Real Name ---
            let authorName = auth.currentUser.displayName;
            if (!authorName) {
                // Fetch from Firestore profile if Auth profile is empty
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    authorName = userDoc.data().name;
                }
            }
            // Fallback if still missing
            authorName = authorName || 'Recruiter';

            // 1. Log to Activities (For Leaderboard & Stats)
            await addDoc(collection(db, 'companies', companyId, collectionName, lead.id, 'activities'), {
                type: 'call',
                outcome: outcome,
                isContact: isContact, 
                notes: notes,
                performedBy: auth.currentUser.uid,
                performedByName: authorName, // Saves real name
                companyId: companyId, 
                leadId: lead.id,      
                timestamp: serverTimestamp()
            });

            // 2. Log to Internal Notes (For Visibility in Notes Tab)
            await addDoc(collection(db, 'companies', companyId, collectionName, lead.id, 'internal_notes'), {
                text: `[Call Log: ${outcomeLabel}]\n${notes}`,
                author: authorName, // Saves real name
                createdAt: serverTimestamp(),
                type: 'call_log' 
            });

            // 3. Update the Document Status
            const docRef = doc(db, 'companies', companyId, collectionName, lead.id);
            
            let newStatus = lead.status;
            if (outcome === 'connected') newStatus = 'Contacted';
            if (outcome === 'voicemail') newStatus = 'Attempted';
            if (outcome === 'not_interested') newStatus = 'Rejected';
            if (outcome === 'wrong_number') newStatus = 'Disqualified';

            const updateData = { 
                lastContactedAt: serverTimestamp(),
                lastContactedBy: auth.currentUser.uid
            };

            if (['New Lead', 'New Application', 'Attempted', 'Contacted'].includes(lead.status)) {
                updateData.status = newStatus;
            }

            await updateDoc(docRef, updateData);

            if (onUpdate) onUpdate(); 
            onClose();
        } catch (error) {
            console.error("Error logging call:", error);
            alert(`Failed to save call log. (Error: ${error.message})`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Phone size={20}/> Log Call Result
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Result for <strong>{lead.firstName} {lead.lastName}</strong>:
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {OUTCOMES.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setOutcome(opt.id)}
                                className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${
                                    outcome === opt.id 
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600' 
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                {opt.icon}
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes (Optional)</label>
                        <textarea 
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            rows="3"
                            placeholder="Add any specific notes about this call..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                        Save Log
                    </button>
                </div>
            </div>
        </div>
    );
}