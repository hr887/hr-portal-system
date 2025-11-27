// src/components/admin/ActivityHistoryTab.jsx
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Loader2, CircleDot, User, FileText, RefreshCcw, MessageSquare } from 'lucide-react';

export function ActivityHistoryTab({ companyId, applicationId, collectionName }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [companyId, applicationId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const logsRef = collection(db, "companies", companyId, collectionName, applicationId, "activity_logs");
            const q = query(logsRef, orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(data);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type, action) => {
        if (action.includes('Assigned')) return <RefreshCcw size={16} className="text-orange-600"/>;
        if (action.includes('Status')) return <CircleDot size={16} className="text-blue-600"/>;
        if (action.includes('Note')) return <MessageSquare size={16} className="text-gray-600"/>;
        if (type === 'upload') return <FileText size={16} className="text-purple-600"/>;
        return <User size={16} className="text-gray-500"/>;
    };

    if (loading) return <div className="p-6 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div>;

    if (logs.length === 0) {
        return (
            <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                No activity recorded yet.
            </div>
        );
    }

    return (
        <div className="space-y-6 p-2">
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                {logs.map((log) => (
                    <div key={log.id} className="mb-8 ml-6 relative">
                        {/* Dot on timeline */}
                        <div className="absolute -left-[31px] top-1 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                            {getIcon(log.type, log.action)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                            <div>
                                <span className="text-sm font-bold text-gray-900">{log.action}</span>
                                <p className="text-sm text-gray-600 mt-0.5">{log.details}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-xs font-medium text-gray-500">
                                    {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </div>
                                <div className="text-xs font-semibold text-blue-600 mt-1">
                                    by {log.performedByName || 'System'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}