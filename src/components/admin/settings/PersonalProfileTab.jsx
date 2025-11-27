// src/components/admin/settings/PersonalProfileTab.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../../../firebase/config';
import { Save, Loader2 } from 'lucide-react';

export function PersonalProfileTab({ currentUser, onShowSuccess }) {
    const [personalData, setPersonalData] = useState({ name: '' });
    const [loading, setLoading] = useState(false);

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
            onShowSuccess('Personal profile updated.');
        } catch (error) {
            console.error("User save failed", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Profile</h2>
                <p className="text-sm text-gray-500 mt-1">Update your personal account details.</p>
            </div>

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