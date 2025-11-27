// src/components/admin/settings/PersonalProfileTab.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../../../firebase/config';
import { Save, Loader2, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '../../feedback/ToastProvider';

export function PersonalProfileTab({ currentUser, currentCompanyProfile }) {
    const { showSuccess, showError } = useToast();
    const [personalData, setPersonalData] = useState({ name: '' });
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // --- CONFIGURATION: Set this to your actual Driver App URL in production ---
    const DRIVER_APP_URL = "http://localhost:5173"; 
    // Example for production: "https://apply.safehaul.com"

    useEffect(() => {
        const fetchUser = async () => {
            if (currentUser?.uid) {
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        setPersonalData({ name: userDoc.data().name || '' });
                    }
                } catch (e) {
                    console.error("Error fetching user profile:", e);
                }
            }
        };
        fetchUser();
    }, [currentUser]);

    const handleSavePersonal = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { name: personalData.name });
            showSuccess('Personal profile updated successfully.');
        } catch (error) {
            console.error("User save failed", error);
            showError("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    // Generate Unique Link
    const companySlug = currentCompanyProfile?.appSlug || 'general';
    const recruiterId = currentUser?.uid || '';
    const uniqueLink = `${DRIVER_APP_URL}/apply/${companySlug}?recruiter=${recruiterId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(uniqueLink);
        setCopied(true);
        showSuccess("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Profile</h2>
                <p className="text-sm text-gray-500 mt-1">Update your personal details and access your recruiting tools.</p>
            </div>

            {/* --- RECRUITING LINK SECTION (NEW) --- */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
                        <LinkIcon size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-blue-900 mb-1">Your Unique Recruiting Link</h3>
                        <p className="text-sm text-blue-700 mb-4">
                            Share this link on social media or in emails. Drivers who apply through this link will be <strong>automatically assigned to you</strong>.
                        </p>
                        
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-blue-200">
                            <code className="flex-1 text-xs sm:text-sm font-mono text-gray-600 truncate px-2">
                                {uniqueLink}
                            </code>
                            <button 
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-md transition-all flex items-center gap-2"
                            >
                                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PERSONAL DETAILS SECTION --- */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6 shadow-sm">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input 
                        type="text" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={personalData.name} 
                        onChange={(e) => setPersonalData({...personalData, name: e.target.value})} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input 
                        type="text" 
                        className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        value={currentUser?.email || ''} 
                        readOnly 
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed directly.</p>
                </div>
                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSavePersonal} 
                        disabled={loading} 
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Update Profile
                    </button>
                </div>
            </div>
        </div>
    );
}