// src/components/admin/PerformanceWidget.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collectionGroup, query, where, getDocs, doc, getDoc, Timestamp, collection } from 'firebase/firestore';
import { Trophy, Phone, Users, Loader2 } from 'lucide-react';

export function PerformanceWidget({ companyId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !auth.currentUser) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            const startTimestamp = Timestamp.fromDate(today);

            // 1. Get all Team Member IDs for this Company
            const memberRef = collection(db, "memberships");
            const memberSnap = await getDocs(query(memberRef, where("companyId", "==", companyId)));
            const userIds = memberSnap.docs.map(d => d.data().userId);

            if (userIds.length === 0) {
                setLeaderboard([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Real Names & Goals for ALL members (Parallel Fetch)
            const memberDataPromises = userIds.map(async (uid) => {
                let name = 'Unknown User';
                let callGoal = 150;
                let contactGoal = 50;

                // A. Fetch Profile Name from 'users' collection
                try {
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    if (userDoc.exists() && userDoc.data().name) {
                        name = userDoc.data().name;
                    }
                } catch (e) { console.warn(`Failed to fetch user ${uid}`, e); }

                // B. Fetch Goals from 'companies/../team' collection
                try {
                    const settingsSnap = await getDoc(doc(db, "companies", companyId, "team", uid));
                    if (settingsSnap.exists()) {
                        const data = settingsSnap.data();
                        if (data.callGoal) callGoal = data.callGoal;
                        if (data.contactGoal) contactGoal = data.contactGoal;
                    }
                } catch (e) { /* use defaults */ }

                // Return initialized stats object
                return {
                    uid,
                    name,
                    callGoal,
                    contactGoal,
                    dials: new Set(), // Set ensures we count unique Lead IDs only
                    contacts: 0
                };
            });

            // Wait for all profiles to load
            const membersArray = await Promise.all(memberDataPromises);
            
            // Convert array to Map for fast lookup by UID
            const statsMap = {};
            membersArray.forEach(m => {
                statsMap[m.uid] = m;
            });

            // 3. Fetch Activities for the Company Today
            const activitiesRef = collectionGroup(db, 'activities');
            const q = query(
                activitiesRef,
                where('companyId', '==', companyId),
                where('timestamp', '>=', startTimestamp)
            );
            const activitiesSnap = await getDocs(q);

            // 4. Aggregate Activities into Stats
            activitiesSnap.forEach(docSnap => {
                const data = docSnap.data();
                const uid = data.performedBy;

                // Only count if user is currently in the team map
                if (statsMap[uid]) {
                    // Count unique dials (based on leadId)
                    if (data.leadId) {
                        statsMap[uid].dials.add(data.leadId);
                    }
                    // Count contacts
                    if (data.isContact) {
                        statsMap[uid].contacts += 1;
                    }
                }
            });

            // 5. Format for Render & Sort by Contacts (Highest first)
            const lb = Object.values(statsMap).map(user => ({
                uid: user.uid,
                name: user.name,
                dials: user.dials.size,
                contacts: user.contacts,
                callGoal: user.callGoal,
                contactGoal: user.contactGoal
            })).sort((a, b) => b.contacts - a.contacts); 

            setLeaderboard(lb);

        } catch (e) {
            console.error("Performance Widget Error:", e);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [companyId]);

  if (loading) return <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Trophy size={20} className="text-yellow-500"/> Daily Leaderboard
            </h3>
            <span className="text-xs font-medium text-gray-400">Today's Activity</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                    No active team members found.
                </div>
            ) : (
                leaderboard.map((user, index) => {
                    const isMe = user.uid === auth.currentUser?.uid;
                    
                    // Calculate Percentages for Progress Bars
                    const callPct = Math.min(100, Math.round((user.dials / user.callGoal) * 100));
                    const contactPct = Math.min(100, Math.round((user.contacts / user.contactGoal) * 100));

                    return (
                        <div key={user.uid} className={`p-3 rounded-lg border ${isMe ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-white border-gray-100'}`}>
                            
                            {/* Rank & Name */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {index + 1}
                                </div>
                                <span className="font-bold text-sm text-gray-800 truncate w-full" title={user.name}>
                                    {user.name} {isMe && '(You)'}
                                </span>
                            </div>

                            {/* Progress Bars Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Dials */}
                                <div>
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                                        <span className="flex items-center gap-1"><Phone size={10}/> Dials</span>
                                        <span>{user.dials}/{user.callGoal}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{width: `${callPct}%`}}></div>
                                    </div>
                                </div>

                                {/* Contacts */}
                                <div>
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                                        <span className="flex items-center gap-1"><Users size={10}/> Contacts</span>
                                        <span className="text-green-700">{user.contacts}/{user.contactGoal}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{width: `${contactPct}%`}}></div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
}