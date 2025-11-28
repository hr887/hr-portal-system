// hr portal/src/components/modals/CallOutcomeModalUI.jsx

import React, { useState } from 'react';
import { Phone, X, Save, Loader2, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle, Ban, ThumbsDown, Truck, Calendar, ExternalLink } from 'lucide-react';
import { normalizePhone } from '../../utils/helpers'; // Import the helper for consistency

// --- CONSTANTS (Moved from original Modal) ---
const OUTCOMES_CONFIG = [
    { id: 'connected', label: 'Connected / Spoke', icon: <CheckCircle size={18} className="text-green-600"/> },
    { id: 'voicemail', label: 'Left Voicemail', icon: <MessageSquare size={18} className="text-yellow-600"/> },
    { id: 'no_answer', label: 'No Answer', icon: <XCircle size={18} className="text-red-600"/> },
    { id: 'callback', label: 'Scheduled Callback', icon: <Clock size={18} className="text-blue-600"/> },
    { id: 'not_interested', label: 'Not Interested', icon: <ThumbsDown size={18} className="text-gray-600"/> },
    { id: 'not_qualified', label: 'Not Qualified', icon: <Ban size={18} className="text-orange-600"/> },
    { id: 'wrong_number', label: 'Wrong Number', icon: <AlertCircle size={18} className="text-red-400"/> },
];

const DRIVER_TYPES = [
    "Dry Van", 
    "Reefer", 
    "Flatbed", 
    "Tanker", 
    "Box Truck", 
    "Car Hauler", 
    "Step Deck", 
    "Lowboy", 
    "Conestoga", 
    "Intermodal", 
    "Power Only", 
    "Hotshot"
];

// Helper to clean phone for Telegram link (logic relies on normalizePhone)
const getTelegramLink = (rawPhone) => {
    if (!rawPhone) return '';
    let cleaned = normalizePhone(rawPhone); 
    if (cleaned.length === 10) cleaned = '1' + cleaned;
    return `https://t.me/+${cleaned}`;
};

// --- UI Component ---
export function CallOutcomeModalUI({ 
    lead, 
    onClose, 
    // State from Hook
    outcome, setOutcome,
    notes, setNotes,
    driverType, setDriverType,
    callbackDate, setCallbackDate,
    callbackTime, setCallbackTime,
    saving, 
    handleSave,
    showDriverTypeSelect,
    showCallbackSelect,
}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70] backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold flex items-center gap-2">
                        <Phone size={20}/> Log Call Result
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                    <p className="text-sm text-gray-600">
                        Result for <strong>{lead.firstName} {lead.lastName}</strong>:
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {OUTCOMES_CONFIG.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setOutcome(opt.id)}
                                className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-all text-center ${
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

                    {/* --- Scheduled Callback Inputs --- */}
                    {showCallbackSelect && (
                        <div className="animate-in fade-in slide-in-from-top-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                                <Clock size={12}/> Schedule Callback
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={callbackDate}
                                        onChange={(e) => setCallbackDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]} // Min today
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Time</label>
                                    <input 
                                        type="time" 
                                        className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={callbackTime}
                                        onChange={(e) => setCallbackTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- Driver Type Dropdown --- */}
                    {showDriverTypeSelect && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Driver Type (Freight)
                            </label>
                            <div className="relative">
                                <Truck size={16} className="absolute left-3 top-3 text-gray-400" />
                                <select 
                                    className="w-full pl-9 p-2.5 border border-blue-300 bg-blue-50/30 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                    value={driverType}
                                    onChange={(e) => setDriverType(e.target.value)}
                                >
                                    <option value="">-- Select Type --</option>
                                    {DRIVER_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* --- Notes --- */}
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

                    {/* --- Telegram Link Display --- */}
                    {outcome === 'connected' && lead.phone && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-sm text-green-800 animate-in fade-in">
                            <p className="font-bold mb-1">Pro Tip:</p>
                            <a href={getTelegramLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-green-700 hover:text-green-900 hover:underline">
                                <ExternalLink size={14} /> Open Telegram Chat
                            </a>
                        </div>
                    )}
                
                </form>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                    <button 
                        type="submit"
                        onClick={handleSave} 
                        disabled={saving}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ?
                            <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                        {showCallbackSelect ? 'Schedule & Save' : 'Save Log'}
                    </button>
                </div>
            </div>
        </div>
    );
}