// src/components/company/ContactTab.jsx
import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { logActivity } from '../../utils/activityLogger';

export function ContactTab({ companyId, recordId, collectionName, email, phone }) {
    const [activeMethod, setActiveMethod] = useState('email'); // 'email' or 'sms'
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        setSending(true);
        
        // NOTE: To send real emails, we would trigger a Cloud Function here.
        // For now, we will simulate the send and Log the Activity.
        
        try {
            // 1. Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 2. Log the "Sent" activity
            const actionType = activeMethod === 'email' ? 'Email Sent' : 'SMS Sent';
            const detailText = activeMethod === 'email' 
                ? `Subject: ${subject}\nTo: ${email}` 
                : `To: ${phone}\nMessage: ${message}`;

            await logActivity(
                companyId, 
                collectionName, 
                recordId, 
                actionType, 
                detailText,
                'communication'
            );

            // 3. Reset form
            setMessage('');
            setSubject('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);

        } catch (error) {
            console.error("Send failed:", error);
            alert("Failed to record communication.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                <button 
                    onClick={() => setActiveMethod('email')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeMethod === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Mail size={16} /> Email
                </button>
                <button 
                    onClick={() => setActiveMethod('sms')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeMethod === 'sms' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <MessageSquare size={16} /> SMS
                </button>
            </div>

            {/* Main Form */}
            <div className="flex-1 flex flex-col">
                {success ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Sent Successfully</h3>
                        <p className="text-gray-500 mt-2">The communication has been logged to Activity History.</p>
                        <button onClick={() => setSuccess(false)} className="mt-6 text-blue-600 font-semibold hover:underline">Send another</button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="flex flex-col h-full gap-4">
                        {activeMethod === 'email' ? (
                            <>
                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800">
                                    <span className="font-bold">To:</span> {email || 'No email provided'}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                                    <input 
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Regarding your application..."
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        required
                                        disabled={!email}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg text-sm text-purple-800">
                                <span className="font-bold">To:</span> {phone || 'No phone provided'}
                                <div className="mt-1 text-xs opacity-75 flex items-center gap-1">
                                    <AlertCircle size={10} /> SMS functionality Coming Soon
                                </div>
                            </div>
                        )}

                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                            <textarea 
                                className="w-full h-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder={`Type your ${activeMethod} message here...`}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                                disabled={activeMethod === 'sms' || (!email && activeMethod === 'email')}
                            ></textarea>
                        </div>

                        <div className="flex justify-end">
                            <button 
                                type="submit"
                                disabled={sending || (activeMethod === 'sms') || (!email && activeMethod === 'email')}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                            >
                                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                Send {activeMethod === 'email' ? 'Email' : 'SMS'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}