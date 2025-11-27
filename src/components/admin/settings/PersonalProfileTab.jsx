// src/components/admin/settings/PersonalProfileTab.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from '../../../firebase/config';
import { Save, Loader2, Link as LinkIcon, Copy, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '../../feedback/ToastProvider';

export function PersonalProfileTab({ currentUser, currentCompanyProfile }) {
    const { showSuccess, showError } = useToast();
    const [personalData, setPersonalData] = useState({ name: '' });
    const [recruitingCode, setRecruitingCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [linkLoading, setLinkLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // --- CONFIGURATION ---
    const getDriverAppUrl = () => {
        let url = import.meta.env.VITE_DRIVER_APP_URL || window.location.origin;
        return url.replace(/\/$/, "");
    };

    useEffect(() => {
        const fetchUserAndCode = async () => {
            if (currentUser?.uid) {
                try {
                    // 1. Get User Profile
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setPersonalData({ name: data.name || '' });
                        
                        // 2. Check for existing Short Code
                        if (data.recruitingCode) {
                            setRecruitingCode(data.recruitingCode);
                            setLinkLoading(false);
                        } else {
                            // 3. If no code, generate one automatically
                            await generateShortCode(currentUser.uid);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching profile:", e);
                    setLinkLoading(false);
                }
            }
        };
        fetchUserAndCode();
    }, [currentUser]);

    const generateShortCode = async (uid) => {
        setLinkLoading(true);
        try {
            // Generate 6-char alphanumeric code (e.g., "9A2K5X")
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // 1. Create Mapping Doc (Publicly Readable)
            await setDoc(doc(db, "recruiter_links", code), {
                userId: uid,
                companyId: currentCompanyProfile.id,
                createdAt: new Date()
            });

            // 2. Save Code to User Profile (Private)
            await updateDoc(doc(db, "users", uid), {
                recruitingCode: code
            });

            setRecruitingCode(code);
        } catch (err) {
            console.error("Error generating link:", err);
            showError("Could not generate tracking link.");
        } finally {
            setLinkLoading(false);
        }
    };

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

    // Generate Short Unique Link
    const driverAppUrl = getDriverAppUrl();
    const companySlug = currentCompanyProfile?.appSlug || 'general';
    
    // Use the Short Code ('r') if available, otherwise fallback to Long ID ('recruiter')
    const uniqueLink = recruitingCode 
        ? `${driverAppUrl}/apply/${companySlug}?r=${recruitingCode}`
        : `${driverAppUrl}/apply/${companySlug}?recruiter=${currentUser?.uid}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(uniqueLink);
        setCopied(true);
        showSuccess("Short link copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Profile</h2>
                <p className="text-sm text-gray-500 mt-1">Update your personal details and access your recruiting tools.</p>
            </div>

            {/* --- RECRUITING LINK SECTION --- */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
                        <LinkIcon size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-blue-900 mb-1">Your Short Recruiting Link</h3>
                        <p className="text-sm text-blue-700 mb-4">
                            Share this link. Drivers who apply will be <strong>automatically assigned to you</strong>.
                        </p>
                        
                        {linkLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="animate-spin" size={16} /> Generating unique code...
                            </div>
                        ) : (
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
                        )}

                        {!import.meta.env.VITE_DRIVER_APP_URL && (
                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                <AlertTriangle size={10} /> Note: Localhost URL in use. Configure VITE_DRIVER_APP_URL for production.
                            </p>
                        )}
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