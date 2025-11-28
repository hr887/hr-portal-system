// src/components/feedback/NotificationItem.jsx
import React from 'react';
import { Clock, Calendar, ExternalLink } from 'lucide-react';

export function NotificationItem({ notification, onClick }) {
    const { 
        title, 
        message, 
        isRead, 
        createdAt, 
        scheduledFor, 
        type, 
        link 
    } = notification;

    const isCallback = type === 'callback' && scheduledFor;

    // --- Callback Specific Logic ---
    let scheduledDate, isOverdue, isSoon;
    if (isCallback) {
        scheduledDate = new Date(scheduledFor);
        const now = new Date();
        isOverdue = now > scheduledDate;
        isSoon = now > new Date(scheduledDate.getTime() - 5 * 60000); // within 5 mins
    }

    // --- Styling Classes ---
    // Base hover and transition
    let containerClass = "p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3";
    
    // Background colors for unread states
    if (!isRead) {
        if (isCallback) containerClass += " bg-orange-50/40";
        else containerClass += " bg-blue-50/40";
    }

    // Icon / Avatar logic
    const renderIcon = () => {
        if (isCallback) {
            let iconBg = isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600';
            return (
                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Clock size={16} />
                </div>
            );
        } else {
            // General Notification Dot
            return (
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!isRead ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            );
        }
    };

    return (
        <li onClick={onClick} className={containerClass}>
            {renderIcon()}
            
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <h4 className={`text-sm ${!isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {title}
                    </h4>
                    
                    {/* Timestamp for Callbacks */}
                    {isCallback && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    )}
                </div>

                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{message}</p>

                {/* Footer Metadata */}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                    {isCallback ? (
                        <>
                            <Calendar size={10}/> {scheduledDate.toLocaleDateString()}
                            {isOverdue && !isRead && <span className="text-red-500 font-bold ml-auto">Overdue</span>}
                            {!isOverdue && isSoon && !isRead && <span className="text-orange-500 font-bold ml-auto">Due Soon</span>}
                        </>
                    ) : (
                        <span>
                            {createdAt?.seconds 
                                ? new Date(createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                : 'Just now'}
                        </span>
                    )}
                </div>
            </div>

            {link && <ExternalLink size={14} className="text-gray-400 shrink-0 mt-1" />}
        </li>
    );
}