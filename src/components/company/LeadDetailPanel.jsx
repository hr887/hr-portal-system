// src/components/company/LeadDetailPanel.jsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ChevronDown, Zap, Database, Phone, FileText, MessageSquare, Clock, UserCheck, Briefcase } from 'lucide-react';
import { ApplicationDetailView } from '../ApplicationDetailView.jsx';
import { NotesTab } from '../admin/NotesTab.jsx';
import { ActivityHistoryTab } from '../admin/ActivityHistoryTab.jsx';
import { formatPhoneNumber } from '../../utils/helpers';
import { logActivity } from '../../utils/activityLogger'; // <-- Import Helper

export function LeadDetailPanel({ 
    selectedApp, 
    companyId, 
    activeTab, 
    onClose, 
    onPhoneClick, 
    onRefresh 
}) {
    const [panelTab, setPanelTab] = useState('info'); // 'info', 'notes', 'activity'
    const [teamMembers, setTeamMembers] = useState([]);
    const [assignedTo, setAssignedTo] = useState(selectedApp?.assignedTo || '');

    // Load Team for Assignment Dropdown
    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const q = query(collection(db, "memberships"), where("companyId", "==", companyId));
                const snap = await getDocs(q);
                const members = [];
                for(const m of snap.docs) {
                    const uSnap = await getDoc(doc(db, "users", m.data().userId));
                    if(uSnap.exists()) members.push({ id: uSnap.id, name: uSnap.data().name });
                }
                setTeamMembers(members);
            } catch(e) {}
        };
        fetchTeam();
    }, [companyId]);

    // Update local state when selection changes
    useEffect(() => {
        setAssignedTo(selectedApp?.assignedTo || '');
    }, [selectedApp]);

    if (!selectedApp) return null;

    // Handle Assignment Change
    const handleAssignChange = async (newUserId) => {
        setAssignedTo(newUserId);
        const collectionName = (selectedApp.isPlatformLead || selectedApp.source === 'Company Import') ? 'leads' : 'applications';
        const docRef = doc(db, "companies", companyId, collectionName, selectedApp.id);
        
        const newOwnerName = teamMembers.find(m => m.id === newUserId)?.name || 'Unassigned';

        try {
            await updateDoc(docRef, { 
                assignedTo: newUserId,
                assignedToName: newOwnerName
            });
            
            // Log Activity
            await logActivity(companyId, collectionName, selectedApp.id, "Lead Reassigned", `Assigned to ${newOwnerName}`);
            
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Error assigning:", error);
            alert("Failed to update assignment.");
        }
    };

    const isLeadView = (
        selectedApp.isPlatformLead === true || 
        selectedApp.source === 'Company Import' || 
        activeTab === 'my_leads' ||
        activeTab === 'company_leads' ||
        activeTab === 'find_driver'
    );
    
    const collectionName = isLeadView ? 'leads' : 'applications';

    // Content Renderers
    const renderLeadContent = () => {
        if (panelTab === 'notes') {
            return <div className="flex-1 overflow-y-auto p-6"><NotesTab companyId={companyId} applicationId={selectedApp.id} collectionName={collectionName} /></div>;
        }
        if (panelTab === 'activity') {
            return <div className="flex-1 overflow-y-auto p-6"><ActivityHistoryTab companyId={companyId} applicationId={selectedApp.id} collectionName={collectionName} /></div>;
        }

        // Info Tab
        return (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Assignment Dropdown */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <UserCheck size={12}/> Assigned Recruiter
                    </label>
                    <select 
                        className="w-full p-2 text-sm border border-blue-200 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={assignedTo}
                        onChange={(e) => handleAssignChange(e.target.value)}
                    >
                        <option value="">-- Unassigned --</option>
                        {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Contact</label>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{formatPhoneNumber(selectedApp.phone)}</span>
                        <button onClick={(e) => onPhoneClick(e, selectedApp)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors">
                            <Phone size={16} />
                        </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-1 truncate" title={selectedApp.email}>
                        {selectedApp.email}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Experience</label>
                        <span className="text-sm font-bold text-gray-900">{selectedApp.experience || 'N/A'}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Type</label>
                        <span className="text-sm font-bold text-gray-900">{selectedApp.driverType || 'N/A'}</span>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={(e) => onPhoneClick(e, selectedApp)}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Phone size={18} /> Call Driver
                        </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 h-full flex flex-col transition-all duration-300 ease-in-out bg-white border-l border-gray-200 shadow-xl z-20">
            {isLeadView ? (
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 bg-white shrink-0">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${selectedApp.isPlatformLead ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                    {selectedApp.isPlatformLead ? <Zap size={24} /> : <Briefcase size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                        {selectedApp.firstName} {selectedApp.lastName}
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        {selectedApp.isPlatformLead ? 'SafeHaul Lead' : 'Imported Lead'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                                <ChevronDown size={20} className="rotate-[-90deg]" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setPanelTab('info')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${panelTab === 'info' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <FileText size={14} /> Info
                            </button>
                            <button onClick={() => setPanelTab('notes')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${panelTab === 'notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <MessageSquare size={14} /> Notes
                            </button>
                            <button onClick={() => setPanelTab('activity')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${panelTab === 'activity' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <Clock size={14} /> Activity
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    {renderLeadContent()}
                </div>
            ) : (
                <ApplicationDetailView
                    key={selectedApp.id}
                    companyId={companyId}
                    applicationId={selectedApp.id}
                    onClosePanel={onClose}
                    onStatusUpdate={onRefresh}
                    isCompanyAdmin={true}
                    onPhoneClick={(e) => onPhoneClick(e, selectedApp)}
                />
            )}
        </div>
    );
}