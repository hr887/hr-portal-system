// src/components/ManageTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { X, User, Users, Mail, Target, Loader2, Link as LinkIcon, Copy, Phone, CheckCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

export function ManageTeamModal({ companyId, onClose }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Invite Link Logic
  const inviteUrl = `${window.location.origin}/join/${companyId}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    
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

  const handleCopyLink = () => {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <Users className="text-blue-600" /> Manage Team & Goals
            </h2>
            <p className="text-sm text-gray-500">Invite recruiters and set daily performance targets.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Invite Section */}
            <div className="bg-blue-600 p-5 rounded-xl text-white shadow-md">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2"><LinkIcon size={20}/> Invite Link</h3>
                        <p className="text-blue-100 text-sm">Share this link with new recruiters to add them to your dashboard.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-700 p-2 rounded-lg border border-blue-500">
                    <code className="flex-1 text-sm truncate text-blue-100 font-mono">{inviteUrl}</code>
                    <button 
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-white text-blue-700 text-xs font-bold rounded shadow-sm flex items-center gap-1 hover:bg-blue-50 transition"
                    >
                        {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>

            {/* Team List & Goals */}
            <div>
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Target size={18} /> Team Performance Goals
                </h3>
                {loading ? (
                    <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading team...</div>
                ) : team.length === 0 ? (
                    <p className="text-center text-gray-400 italic py-4">No members found. Use the invite link above!</p>
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
                                <div className="flex gap-4 w-full lg:w-auto">
                                    {/* Dial Goal Input */}
                                    <div className="flex flex-1 items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <Phone size={16} className="text-blue-500"/>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Daily Dials</p>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    className="w-20 p-1 text-sm border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                    defaultValue={member.callGoal}
                                                    onBlur={(e) => handleSaveGoal(member.id, 'callGoal', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Goal Input */}
                                    <div className="flex flex-1 items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <Users size={16} className="text-green-600"/>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Daily Contacts</p>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    className="w-20 p-1 text-sm border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-green-500 outline-none"
                                                    defaultValue={member.contactGoal}
                                                    onBlur={(e) => handleSaveGoal(member.id, 'contactGoal', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
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