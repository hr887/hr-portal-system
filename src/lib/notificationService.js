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
import { db } from '../firebase/config'; // HR Portal usually exports as 'db'

/**
* Sends a notification to a specific user.
*/
export async function sendNotification({ recipientId, title, message, type = 'info', link = null }) {
  if (!recipientId) return;

  try {
      await addDoc(collection(db, "notifications"), {
          recipientId,
          title,
          message,
          type,
          link,
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
  notifications.forEach(n => {
      if (!n.isRead) markNotificationAsRead(n.id);
  });
}