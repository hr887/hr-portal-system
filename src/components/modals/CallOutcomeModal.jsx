// src/components/modals/CallOutcomeModal.jsx
import React, { useState } from 'react';
import { db, auth } from '../../firebase/config';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Phone, X, Save, Loader2, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

const OUTCOMES = [
    { id: 'connected', label: 'Connected / Spoke', icon: <CheckCircle size={18} className="text-green-600"/> },
    { id: 'voicemail', label: 'Left Voicemail', icon: <MessageSquare size={18} className="text-yellow-600"/> },
    { id: 'no_answer', label: 'No Answer', icon: <XCircle size={18} className="text-red-600"/> },
    { id: 'callback', label: 'Scheduled Callback', icon: <Clock size={18} className="text-blue-600"/> },
    { id: 'not_interested', label: 'Not Interested', icon: <XCircle size={18} className="text-gray-600"/> },
    { id: 'wrong_number', label: 'Wrong Number', icon: <AlertCircle size={18} className="text-orange-600"/> },
];

import { AlertCircle } from 'lucide-react';

export function CallOutcomeModal({ lead, companyId, onClose, onUpdate }) {
    const [outcome, setOutcome] = useState('connected');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!auth.currentUser) return;
        setSaving(true);

        try {
            // 1. Log the Call Activity
            // We save this to a subcollection so we can count them later for performance
            await addDoc(collection(db, 'companies', companyId, 'leads', lead.id, 'activities'), {
                type: 'call',
                outcome: outcome,
                notes: notes,
                performedBy: auth.currentUser.uid, // Track WHO made the call
                performedByName: auth.currentUser.displayName || 'Recruiter',
                timestamp: serverTimestamp()
            });

            // 2. Update the Lead Status (Optional - simple logic)
            const leadRef = doc(db, 'companies', companyId, 'leads', lead.id);
            let newStatus = lead.status;
            
            if (outcome === 'connected') newStatus = 'Contacted';
            if (outcome === 'voicemail') newStatus = 'Attempted';
            if (outcome === 'not_interested') newStatus = 'Rejected';
            if (outcome === 'wrong_number') newStatus = 'Disqualified';

            if (newStatus !== lead.status) {
                await updateDoc(leadRef, { 
                    status: newStatus,
                    lastContactedAt: serverTimestamp(),
                    lastContactedBy: auth.currentUser.uid
                });
            } else {
                 await updateDoc(leadRef, { 
                    lastContactedAt: serverTimestamp(),
                    lastContactedBy: auth.currentUser.uid
                });
            }

            if (onUpdate) onUpdate(); // Refresh dashboard
            onClose();
        } catch (error) {
            console.error("Error logging call:", error);
            alert("Failed to save call log.");
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
                        You called <strong>{lead.firstName} {lead.lastName}</strong>. What was the outcome?
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
                            placeholder="Left a message about the regional route..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Skip</button>
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