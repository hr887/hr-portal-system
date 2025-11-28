// src/components/admin/DriverProfileView.jsx
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
// UPDATED: Import from new context file
import { useData } from '../../context/DataContext';
import { getFieldValue, formatPhoneNumber } from '../../utils/helpers';
import { ArrowLeft, MapPin, Mail, Phone, Truck, Briefcase, Loader2, CheckCircle, Send, FileText, MessageSquare } from 'lucide-react';
import { NotesTab } from './NotesTab.jsx';

export function DriverProfileView({ driver, onBack }) {
    const { currentCompanyProfile } = useData();
    const [sending, setSending] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); 

    const pi = driver.personalInfo || {};
    const qual = driver.qualifications || {};
    const dp = driver.driverProfile || {};
    const lic = driver.licenses || [];

    const handleSendInvite = async () => {
        if (inviteSent) return;
        if (!pi.email || pi.email.includes('placeholder.com')) {
            alert("This driver does not have a valid email address.");
            return;
        }
        if (!window.confirm(`Send job invite to ${pi.firstName}?`)) return;

        setSending(true);
        try {
            const sendFn = httpsCallable(functions, 'sendDriverInvite');
            const result = await sendFn({
                driverEmail: pi.email,
                driverName: `${pi.firstName} ${pi.lastName}`,
                companyName: currentCompanyProfile?.companyName || "Our Company",
                message: "" 
            });

            if (result.data.success) {
                setInviteSent(true);
                alert("Invite sent successfully!");
            } else {
                alert("Failed to send: " + result.data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error sending invite: " + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={onBack} className="p-2 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition">
                        <ArrowLeft size={20} className="text-gray-600"/>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {getFieldValue(pi.firstName)} {getFieldValue(pi.lastName)}
                        </h2>
                        <p className="text-sm text-gray-500">Driver Profile</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-6 px-2">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'profile' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <div className="flex items-center gap-2"><FileText size={16}/> Profile Info</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'notes' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <div className="flex items-center gap-2"><MessageSquare size={16}/> Notes & Logs</div>
                    </button>
                </div>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                
                {activeTab === 'profile' ? (
                    <>
                        {/* 1. Header Card */}
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold shrink-0 border-4 border-white shadow-sm">
                                {getFieldValue(pi.firstName).charAt(0)}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap gap-2 mb-1">
                                    <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {dp.type || 'Unidentified'}
                                    </span>
                                    <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {dp.availability ? dp.availability.replace('_', ' ') : 'Available'}
                                    </span>
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900">{getFieldValue(pi.firstName)} {getFieldValue(pi.lastName)}</h1>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 text-sm mt-2">
                                    {pi.city && <span className="flex items-center gap-1"><MapPin size={16}/> {pi.city}, {pi.state}</span>}
                                    {pi.email && <span className="flex items-center gap-1"><Mail size={16}/> {pi.email}</span>}
                                    {/* Formatted Phone */}
                                    {pi.phone && <span className="flex items-center gap-1"><Phone size={16}/> {formatPhoneNumber(pi.phone)}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 2. Qualifications */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                    <Truck className="text-blue-600" size={20}/> Qualifications
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Experience</span>
                                        <span className="font-semibold text-gray-900">{qual.experienceYears || 'Not Listed'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Legal to Work?</span>
                                        <span className="font-semibold text-gray-900">{qual.legalWork || 'Yes'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Source</span>
                                        <span className="font-semibold text-gray-900">{dp.isBulkUpload ? 'Bulk Import' : 'App Signup'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. License Info */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                    <Briefcase className="text-blue-600" size={20}/> License / CDL
                                </h3>
                                {lic.length > 0 ? lic.map((l, i) => (
                                    <div key={i} className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Class</span>
                                            <span className="font-semibold text-gray-900">{l.class || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">State</span>
                                            <span className="font-semibold text-gray-900">{l.state || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Endorsements</span>
                                            <span className="font-semibold text-gray-900">{l.endorsements || 'None'}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-500 italic text-sm">No license details available.</p>
                                )}
                            </div>
                        </div>

                        {/* 4. Action Bar */}
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-blue-900">Interested in this driver?</h4>
                                <p className="text-sm text-blue-700">Send an invite to apply directly to your company.</p>
                            </div>
                            <button 
                                onClick={handleSendInvite} 
                                disabled={sending || inviteSent}
                                className={`px-6 py-2.5 font-bold rounded-lg shadow-sm transition flex items-center gap-2
                                    ${inviteSent 
                                        ? 'bg-green-600 text-white cursor-default' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    } disabled:opacity-50`}
                            >
                                {sending ? <Loader2 className="animate-spin" size={18}/> : (inviteSent ? <CheckCircle size={18}/> : <Send size={18}/>)}
                                {sending ? 'Sending...' : (inviteSent ? 'Invite Sent' : 'Send Invite')}
                            </button>
                        </div>
                    </>
                ) : (
                    // NOTES TAB
                    <div className="bg-white p-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Private Internal Notes</h3>
                        <p className="text-sm text-gray-500 mb-6">These notes are only visible to your company team. The driver does not see them.</p>
                        <NotesTab 
                            companyId={currentCompanyProfile.id} 
                            applicationId={driver.id} 
                            collectionName="leads" 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}