// src/components/admin/settings/EmailSettingsTab.jsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../../../firebase/config';
import { Save, Loader2, AlertTriangle } from 'lucide-react';

export function EmailSettingsTab({ currentCompanyProfile, onShowSuccess }) {
    const [emailSettings, setEmailSettings] = useState({
        provider: 'gmail',
        email: '',
        appPassword: '', 
        signature: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentCompanyProfile?.emailSettings) {
            setEmailSettings(currentCompanyProfile.emailSettings);
        }
    }, [currentCompanyProfile]);

    const handleSaveEmailSettings = async () => {
        setLoading(true);
        try {
            const companyRef = doc(db, "companies", currentCompanyProfile.id);
            await updateDoc(companyRef, { emailSettings });
            onShowSuccess('Email settings updated.');
        } catch (error) {
            console.error("Error saving email settings:", error);
            alert("Failed to save email settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl animate-in fade-in">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Email Integration</h2>
                <p className="text-sm text-gray-500 mt-1">Configure your email to send messages directly from the dashboard.</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 items-start">
                <AlertTriangle className="text-blue-600 shrink-0 mt-1" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold">For Gmail Users:</p>
                    <p>You must use an <strong>App Password</strong>. Go to Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords to generate one.</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={emailSettings.email || ''} 
                        onChange={e => setEmailSettings({...emailSettings, email: e.target.value})} 
                        placeholder="recruiting@company.com" 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Password (SMTP)</label>
                    <input 
                        type="password" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={emailSettings.appPassword || ''} 
                        onChange={e => setEmailSettings({...emailSettings, appPassword: e.target.value})} 
                        placeholder="xxxx xxxx xxxx xxxx" 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Signature</label>
                    <textarea 
                        className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={emailSettings.signature || ''} 
                        onChange={e => setEmailSettings({...emailSettings, signature: e.target.value})} 
                        placeholder="Best regards,&#10;Recruiting Team" 
                    />
                 </div>
                 <div className="pt-4 flex justify-end">
                     <button 
                        onClick={handleSaveEmailSettings} 
                        disabled={loading} 
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 shadow-md"
                    >
                         {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Save Settings
                     </button>
                 </div>
            </div>
        </div>
    );
}