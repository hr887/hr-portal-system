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
  updateDoc,
  writeBatch // <--- Added for batching
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
* Marks ALL notifications as read for a user using Batched Writes.
* Optimized to reduce network requests.
*/
export async function markAllAsRead(notifications) {
  if (!notifications || notifications.length === 0) return;

  // 1. Filter to only find unread items (no need to write to already read ones)
  const unreadNotifications = notifications.filter(n => !n.isRead);

  if (unreadNotifications.length === 0) return;

  // 2. Firestore batch limit is 500 operations. 
  // We chunk the array just in case (though unlikely to have >500 unread)
  const BATCH_SIZE = 500;

  for (let i = 0; i < unreadNotifications.length; i += BATCH_SIZE) {
      const chunk = unreadNotifications.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach(note => {
          const ref = doc(db, "notifications", note.id);
          batch.update(ref, { isRead: true });
      });

      await batch.commit();
  }
}