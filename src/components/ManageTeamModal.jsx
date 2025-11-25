// src/components/ManageTeamModal.jsx
import React, { useState, useEffect } from 'react';
// --- FIX: Added 'Users' to the import list below ---
import { X, Plus, Save, Trash2, User, Users, Mail, Target, Loader2, CheckCircle, Link as LinkIcon, Copy } from 'lucide-react';
import { db, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';

export function ManageTeamModal({ companyId, onClose }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Invite Link State
  const inviteUrl = `${window.location.origin}/join/${companyId}`;
  const [copied, setCopied] = useState(false);

  // --- 1. LOAD TEAM MEMBERS ---
  useEffect(() => {
    if (!companyId) return;
    
    // Query memberships for this company
    const q = query(collection(db, "memberships"), where("companyId", "==", companyId));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const members = [];
      for (const memDoc of snapshot.docs) {
        const memData = memDoc.data();
        const userId = memData.userId;
        
        // Fetch User Details
        let userData = { name: 'Unknown', email: 'No Email' };
        try {
            const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", userId)));
            if (!userSnap.empty) userData = userSnap.docs[0].data();
        } catch (e) { console.log(e) }

        // Fetch Quota
        let quota = 50;
        try {
            const settingsSnap = await getDocs(query(collection(db, "companies", companyId, "team"), where("__name__", "==", userId)));
            if (!settingsSnap.empty) quota = settingsSnap.docs[0].data().dailyQuota || 50;
        } catch (e) { console.log(e) }

        members.push({ id: userId, ...userData, role: memData.role, quota });
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

  const handleSaveQuota = async (userId, newQuota) => {
      try {
          await setDoc(doc(db, "companies", companyId, "team", userId), {
              dailyQuota: Number(newQuota),
              updatedAt: new Date()
          }, { merge: true });
      } catch (err) { alert("Error saving quota"); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" /> Manage Team
            </h2>
            <p className="text-sm text-gray-500">Invite members and set daily goals.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* --- INVITE LINK SECTION --- */}
            <div className="bg-blue-600 p-5 rounded-xl text-white shadow-md">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2"><LinkIcon size={20}/> Invite Link</h3>
                        <p className="text-blue-100 text-sm">Share this link with your recruiters to let them join automatically.</p>
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

            {/* --- TEAM LIST --- */}
            <div>
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Team Members ({team.length})</h3>
                {loading ? (
                    <div className="text-center py-8 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2"/> Loading team...</div>
                ) : team.length === 0 ? (
                    <p className="text-center text-gray-400 italic py-4">No members found. Send the invite link above!</p>
                ) : (
                    <div className="space-y-3">
                        {team.map(member => (
                            <div key={member.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm gap-4">
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{member.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Mail size={10}/> {member.email}
                                            <span className="mx-1">•</span>
                                            <span className="uppercase font-semibold text-blue-600">{member.role.replace('_', ' ')}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* QUOTA SETTING */}
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <Target size={16} className="text-gray-400"/>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Daily Call Goal</p>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="w-16 p-1 text-sm border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                defaultValue={member.quota}
                                                onBlur={(e) => handleSaveQuota(member.id, e.target.value)}
                                            />
                                            <span className="text-xs text-gray-500">calls</span>
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