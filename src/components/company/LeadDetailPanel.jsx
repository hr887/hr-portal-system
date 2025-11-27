// src/components/company/LeadDetailPanel.jsx
import React, { useState } from 'react';
import { ChevronDown, Zap, Database, Phone, FileText, MessageSquare } from 'lucide-react';
import { ApplicationDetailView } from '../ApplicationDetailView.jsx';
import { NotesTab } from '../admin/NotesTab.jsx';
import { formatPhoneNumber } from '../../utils/helpers'; // <-- Import helper

export function LeadDetailPanel({ 
    selectedApp, 
    companyId, 
    activeTab, 
    onClose, 
    onPhoneClick, 
    onRefresh 
}) {
    const [panelTab, setPanelTab] = useState('info'); // 'info' or 'notes'

    if (!selectedApp) return null;

    // Determine if this is a lightweight Lead or a full Application
    const isLeadView = (
        selectedApp.isPlatformLead === true || 
        selectedApp.source === 'Company Import' || 
        activeTab === 'my_leads' ||
        activeTab === 'find_driver'
    );

    // Logic to handle switching tabs within the panel
    const renderLeadContent = () => {
        if (panelTab === 'notes') {
            return (
                <div className="flex-1 overflow-y-auto p-6">
                    <NotesTab 
                        companyId={companyId} 
                        applicationId={selectedApp.id} 
                        collectionName="leads" 
                    />
                </div>
            );
        }

        // Default 'info' view
        return (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Contact</label>
                    <div className="flex items-center justify-between">
                        {/* Formatted Phone Number */}
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
                
                {selectedApp.status && (
                     <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Current Status</label>
                        <span className="text-sm font-bold text-blue-900">{selectedApp.status}</span>
                    </div>
                )}

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
                                    {selectedApp.isPlatformLead ? <Zap size={24} /> : <Database size={24} />}
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
                            <button
                                onClick={() => setPanelTab('info')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold rounded-md transition-all ${
                                    panelTab === 'info' 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <FileText size={14} /> Info
                            </button>
                            <button
                                onClick={() => setPanelTab('notes')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold rounded-md transition-all ${
                                    panelTab === 'notes' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <MessageSquare size={14} /> Notes
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