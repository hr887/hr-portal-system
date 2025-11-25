// src/components/admin/PerformanceWidget.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collectionGroup, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { TrendingUp } from 'lucide-react';

export function PerformanceWidget({ companyId }) {
  const [stats, setStats] = useState({ callsToday: 0, goal: 50 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !auth.currentUser) return;

    const fetchPerformance = async () => {
        try {
            const userId = auth.currentUser.uid;
            
            // 1. Get User's Goal from the Team settings
            let goal = 50;
            const settingsRef = doc(db, "companies", companyId, "team", userId);
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                goal = settingsSnap.data().dailyQuota || 50;
            }

            // 2. Count Calls Made Today
            // We define "Today" as anything since midnight
            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);
            const startTimestamp = Timestamp.fromDate(startOfDay);

            // Query the 'activities' subcollection across the whole database
            // This requires a composite index usually, but might work for small data
            // Filter: type == 'call', performedBy == userId, timestamp >= today
            const activitiesRef = collectionGroup(db, 'activities');
            const q = query(
                activitiesRef,
                where('performedBy', '==', userId),
                where('timestamp', '>=', startTimestamp)
            );

            const querySnapshot = await getDocs(q);
            const callsToday = querySnapshot.size;

            setStats({ callsToday, goal });
            setLoading(false);

        } catch (e) {
            console.error("Performance Fetch Error:", e);
            // Often fails due to missing index initially
            setLoading(false); 
        }
    };

    fetchPerformance();
  }, [companyId]);

  const percentage = Math.min(100, Math.round((stats.callsToday / stats.goal) * 100));

  if (loading) return <div className="h-full bg-gray-100 rounded-lg animate-pulse min-h-[140px]"></div>;

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600"/> Daily Performance
            </h3>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Goal: {stats.goal}
            </span>
        </div>

        <div>
            <div className="flex items-end gap-2 mb-2">
                <span className={`text-4xl font-bold ${stats.callsToday >= stats.goal ? 'text-green-600' : 'text-gray-900'}`}>
                    {stats.callsToday}
                </span>
                <span className="text-sm text-gray-500 mb-1">calls made today</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">{percentage}% Complete</p>
        </div>
    </div>
  );
}