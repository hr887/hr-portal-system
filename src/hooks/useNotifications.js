// src/hooks/useNotifications.js
import { useState, useEffect, useRef, useMemo } from 'react';
import { subscribeToNotifications, markNotificationAsRead, markAllAsRead } from '../lib/notificationService';

// Simple alert sound URL (beep)
const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useNotifications(userId) {
    const [notifications, setNotifications] = useState([]);
    const [upcomingCount, setUpcomingCount] = useState(0);
    
    // Use Ref to track alerted IDs without causing re-renders
    const alertedIdsRef = useRef(new Set());
    const audioRef = useRef(new Audio(ALERT_SOUND_URL));

    // 1. Subscribe to real-time updates
    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToNotifications(userId, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [userId]);

    // 2. Split & Sort Notifications
    const { general, callbacks } = useMemo(() => {
        const gen = [];
        const call = [];
        
        notifications.forEach(n => {
            // Check if it is a scheduled callback
            if (n.type === 'callback' && n.scheduledFor) {
                call.push(n);
            } else {
                gen.push(n);
            }
        });

        // Sort General: Newest First
        gen.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // Sort Callbacks: Soonest "Scheduled Time" First (Urgency)
        call.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

        return { general: gen, callbacks: call };
    }, [notifications]);

    // 3. Audio Alert Timer Logic
    useEffect(() => {
        const checkUpcoming = () => {
            const now = new Date();
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
            
            let urgentCount = 0;
            let shouldPlaySound = false;

            callbacks.forEach(n => {
                if (n.isRead) return; // Ignore read ones

                const scheduledTime = new Date(n.scheduledFor);
                
                // Check if due within 5 mins OR overdue
                if (scheduledTime <= fiveMinutesFromNow) {
                    urgentCount++;
                    
                    // If we haven't alerted for this ID yet this session, play sound
                    if (!alertedIdsRef.current.has(n.id)) {
                        shouldPlaySound = true;
                        alertedIdsRef.current.add(n.id);
                    }
                }
            });

            setUpcomingCount(urgentCount);

            if (shouldPlaySound) {
                // Play sound (catch error if user hasn't interacted with document yet)
                audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
            }
        };

        // Run immediately and then check every 30 seconds
        checkUpcoming();
        const interval = setInterval(checkUpcoming, 30000);
        
        return () => clearInterval(interval);
    }, [callbacks]);

    // Actions
    const markAsRead = (id) => markNotificationAsRead(id);
    
    const markListAsRead = (type) => {
        const list = type === 'callbacks' ? callbacks : general;
        markAllAsRead(list);
    };

    return {
        notifications,
        general,
        callbacks,
        upcomingCount,
        markAsRead,
        markListAsRead
    };
}