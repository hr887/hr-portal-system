// src/components/ManageTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { X, User, Users, Mail, Target, Loader2, Link as LinkIcon, Copy, Phone, CheckCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { useToast } from './feedback/ToastProvider'; // Assuming you added ToastProvider to HR portal

export function ManageTeamModal({ companyId, onClose }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  // Base Invite Link (Generic)
  const baseInviteUrl = `${window.location.origin}/apply/${companyId}`; // Assuming slug is used, or handle dynamic slug logic if needed. 
  // Ideally this uses the company appSlug, but we might not have it in props. 
  // If companyId is the doc ID, you might need to fetch the slug or just use ID if your routing supports it.
  // For now, let's assume we fetch the slug or construct a safe URL.
  
  const [companySlug, setCompanySlug] = useState('');
  const { showSuccess, showInfo } = useToast ? useToast() : { showSuccess: alert, showInfo: alert }; 

  useEffect(() => {
    if (!companyId) return;

    // 0. Fetch Company Slug for cleaner links
    const fetchSlug = async () => {
        try {
            const compDoc = await getDoc(doc(db, "companies", companyId));
            if(compDoc.exists()) setCompanySlug(compDoc.data().appSlug || companyId);
        } catch(e) {}
    };
    fetchSlug();
    
    // Listen to memberships for this company in real-time
    const q = query(collection(db, "memberships"), where("companyId", "==", companyId));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const members = [];
      
      // Process all members found
      for (const memDoc of snapshot.docs) {
        const memData = memDoc.data();
        const userId = memData.userId;
        
        // 1. Fetch User Profile (Name/Email)
        let userData = { name: 'Unknown', email: 'No Email' };
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                userData = userDoc.data();
            }
        } catch (e) { console.log("Error fetching user:", e) }

        // 2. Fetch Performance Goals
        let goals = { callGoal: 150, contactGoal: 50 }; // Default values
        try {
            const settingsSnap = await getDoc(doc(db, "companies", companyId, "team", userId));
            if (settingsSnap.exists()) {
                const data = settingsSnap.data();
                goals = { 
                    callGoal: data.callGoal || 150, 
                    contactGoal: data.contactGoal || 50 
                };
            }
        } catch (e) { console.log("Error fetching goals:", e) }

        members.push({ 
            id: userId, 
            ...userData, 
            role: memData.role, 
            ...goals 
        });
      }
      setTeam(members);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [companyId]);

  const handleCopyLink = (userId) => {
      // NOTE: This assumes your Driver App is hosted at the same domain or you hardcode the domain.
      // Since we are in the HR portal, window.location.origin might point to HR app.
      // You typically need the DRIVER APP URL here. 
      // For development, let's assume localhost:5173 (Driver) vs localhost:5174 (HR).
      // IN PRODUCTION: You should hardcode the real driver portal URL or store it in config.
      
      // Construct URL: https://driver-app.com/apply/SLUG?recruiter=USER_ID
      // Use a placeholder domain if running locally on different ports, otherwise relative
      const driverAppUrl = "http://localhost:5173"; // <--- CHANGE THIS TO YOUR DRIVER APP URL
      
      const link = `${driverAppUrl}/apply/${companySlug}?recruiter=${userId}`;
      
      navigator.clipboard.writeText(link);
      showSuccess("Custom recruiter link copied!");
  };

  const handleSaveGoal = async (userId, field, value) => {
      try {
          // Save to: companies/{companyId}/team/{userId}
          await setDoc(doc(db, "companies", companyId, "team", userId), {
              [field]: Number(value),
              updatedAt: new Date()
          }, { merge: true });
      } catch (err) { 
          console.error(err);
          alert("Error saving goal");
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" /> Manage Team & Links
            </h2>
            <p className="text-sm text-gray-500">Set goals and get tracking links for your recruiters.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">

            {/* Team List & Goals */}
            <div>
                {loading ? (
                    <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading team...</div>
                ) : team.length === 0 ? (
                    <p className="text-center text-gray-400 italic py-4">No members found.</p>
                ) : (
                    <div className="space-y-3">
                        {team.map(member => (
                            <div key={member.id} className="flex flex-col lg:flex-row items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm gap-4 hover:border-blue-300 transition-colors">
                                {/* User Info */}
                                <div className="flex items-center gap-3 w-full lg:w-1/3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold shrink-0">
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-gray-900 truncate">{member.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                    </div>
                                </div>

                                {/* Goals Inputs */}
                                <div className="flex gap-4 items-center w-full lg:w-auto">
                                    {/* Dial Goal Input */}
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <Phone size={14} className="text-blue-500"/>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Dials</span>
                                            <input 
                                                type="number" 
                                                className="w-12 p-0 text-sm bg-transparent border-none text-center font-bold focus:ring-0 outline-none"
                                                defaultValue={member.callGoal}
                                                onBlur={(e) => handleSaveGoal(member.id, 'callGoal', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                     {/* Contact Goal Input */}
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <Users size={14} className="text-green-600"/>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Contacts</span>
                                            <input 
                                                type="number" 
                                                className="w-12 p-0 text-sm bg-transparent border-none text-center font-bold focus:ring-0 outline-none"
                                                defaultValue={member.contactGoal}
                                                onBlur={(e) => handleSaveGoal(member.id, 'contactGoal', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Custom Link Button */}
                                    <button 
                                        onClick={() => handleCopyLink(member.id)}
                                        className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-sm font-semibold ml-2"
                                        title="Copy Custom Tracking Link"
                                    >
                                        <LinkIcon size={14} /> Link
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}