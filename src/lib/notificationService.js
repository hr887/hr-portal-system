// src/lib/notificationService.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from '../firebase/config';

/**
* Sends a notification to a specific user.
* @param {string} recipientId - UID of the user receiving the notification.
* @param {string} title - Short header.
* @param {string} message - Body text.
* @param {string} type - 'info', 'success', 'warning', 'error', 'callback'.
* @param {string} link - Optional URL.
* @param {Date} scheduledFor - Optional JS Date object for future events (callbacks).
* @param {object} metadata - Optional data (e.g. leadId, driverName) for UI logic.
*/
export async function sendNotification({ recipientId, title, message, type = 'info', link = null, scheduledFor = null, metadata = {} }) {
  if (!recipientId) return;
  try {
      await addDoc(collection(db, "notifications"), {
          recipientId,
          title,
          message,
          type,
          link,
          scheduledFor: scheduledFor ? scheduledFor.toISOString() : null, // Store as ISO string
          metadata,
          isRead: false,
          createdAt: serverTimestamp()
      });
  } catch (error) {
      console.error("Error sending notification:", error);
  }
}

/**
* Subscribes to the current user's notifications in real-time.
*/
export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};
  
  // We fetch all notifications for the user. 
  // Filtering "Scheduled" vs "Immediate" will happen in the UI component 
  // based on the 'scheduledFor' field.
  const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", userId),
      orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      }));
      callback(notifications);
  });
}

/**
* Marks a notification as read.
*/
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  const ref = doc(db, "notifications", notificationId);
  await updateDoc(ref, { isRead: true });
}

/**
* Marks ALL notifications as read for a user.
*/
export async function markAllAsRead(notifications) {
  // In a real app, use a WriteBatch. For now, we loop (simple MVP).
  // We typically only mark "current" notifications as read, not future ones,
  // but for this helper, we'll mark whatever is passed in.
  notifications.forEach(n => {
      if (!n.isRead) markNotificationAsRead(n.id);
  });
}