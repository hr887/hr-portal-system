// src/components/admin/PerformanceWidget.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collectionGroup, query, where, getDocs, doc, getDoc, Timestamp, collection } from 'firebase/firestore';
import { Trophy, Phone, Users, Loader2, Medal } from 'lucide-react';
import { useData } from '../../App.jsx';

export function PerformanceWidget({ companyId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUserClaims } = useData();

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
            
            const members = memberSnap.docs.map(d => ({ userId: d.data().userId, role: d.data().role }));

            if (members.length === 0) {
                setLeaderboard([]);
                setLoading(false);
                return;
            }

            const isViewerAdmin = currentUserClaims?.roles?.[companyId] === 'company_admin' || currentUserClaims?.roles?.globalRole === 'super_admin';

            // 2. Fetch Real Names & Goals
            const memberDataPromises = members.map(async (member) => {
                // If viewer is NOT admin, hide other Admins from the list (optional, keeping logic from before)
                if (!isViewerAdmin && member.role === 'company_admin') {
                   return null;
                }

                const uid = member.userId;
                let name = 'Unknown User';

                // Fetch Profile Name
                try {
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    if (userDoc.exists() && userDoc.data().name) {
                        name = userDoc.data().name;
                    }
                } catch (e) { console.warn(`Failed to fetch user ${uid}`, e); }

                return {
                    uid,
                    name,
                    dials: new Set(),
                    contacts: 0
                };
            });

            const results = await Promise.all(memberDataPromises);
            const validMembers = results.filter(m => m !== null);
            
            const statsMap = {};
            validMembers.forEach(m => {
                statsMap[m.uid] = m;
            });

            // 3. Fetch Activities
            const activitiesRef = collectionGroup(db, 'activities');
            const q = query(
                activitiesRef,
                where('companyId', '==', companyId),
                where('timestamp', '>=', startTimestamp)
            );
            const activitiesSnap = await getDocs(q);

            // 4. Aggregate
            activitiesSnap.forEach(docSnap => {
                const data = docSnap.data();
                const uid = data.performedBy;

                if (statsMap[uid]) {
                    if (data.leadId) {
                        statsMap[uid].dials.add(data.leadId);
                    }
                    if (data.isContact) {
                        statsMap[uid].contacts += 1;
                    }
                }
            });

            // 5. Format & Sort
            // Sort Priority: Contacts (Desc) -> Dials (Desc)
            const lb = Object.values(statsMap).map(user => ({
                uid: user.uid,
                name: user.name,
                dials: user.dials.size,
                contacts: user.contacts
            })).sort((a, b) => {
                if (b.contacts !== a.contacts) return b.contacts - a.contacts;
                return b.dials - a.dials;
            });

            setLeaderboard(lb);

        } catch (e) {
            console.error("Performance Widget Error:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [companyId, currentUserClaims]);

  if (loading) return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-40 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-40 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 shrink-0 z-10 bg-white border-b border-gray-50 pb-2">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Trophy size={16} className="text-yellow-500 fill-yellow-500"/> Daily Leaderboard
            </h3>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Top Performers</span>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {leaderboard.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs italic">
                    No activity recorded today.
                </div>
            ) : (
                leaderboard.map((user, index) => {
                    const isMe = user.uid === auth.currentUser?.uid;
                    
                    // Styling for Rank
                    let rankStyle = "bg-gray-100 text-gray-500";
                    let rankContent = index + 1;

                    if (index === 0) { 
                        rankStyle = "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200"; 
                        rankContent = <Medal size={12} className="fill-yellow-500 text-yellow-600"/>;
                    } else if (index === 1) { 
                        rankStyle = "bg-slate-100 text-slate-700 ring-1 ring-slate-200"; 
                        rankContent = <Medal size={12} className="fill-slate-300 text-slate-500"/>;
                    } else if (index === 2) { 
                        rankStyle = "bg-orange-50 text-orange-800 ring-1 ring-orange-200"; 
                        rankContent = <Medal size={12} className="fill-orange-300 text-orange-600"/>;
                    }

                    return (
                        <div 
                            key={user.uid} 
                            className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors ${isMe ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}`}
                        >
                            {/* Left: Rank & Name */}
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${rankStyle}`}>
                                    {rankContent}
                                </div>
                                <span className={`text-xs font-semibold truncate ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {user.name} {isMe && '(You)'}
                                </span>
                            </div>

                            {/* Right: Stats */}
                            <div className="flex items-center gap-3 shrink-0 pl-2">
                                <div className="flex flex-col items-center min-w-[24px]">
                                    <div className="text-[8px] text-gray-400 uppercase leading-none mb-0.5">Dial</div>
                                    <div className="text-xs font-bold text-gray-600 leading-none">{user.dials}</div>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex flex-col items-center min-w-[24px]">
                                    <div className="text-[8px] text-gray-400 uppercase leading-none mb-0.5">Cont</div>
                                    <div className="text-xs font-bold text-green-600 leading-none">{user.contacts}</div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
        
        {/* Subtle fade overlay at the bottom to indicate more scrollable content */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none"></div>
    </div>
  );
}