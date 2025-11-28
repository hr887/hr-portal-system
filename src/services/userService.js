// src/services/userService.js
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  documentId 
} from "firebase/firestore";
import { db } from '../firebase/config';

// --- USER MANAGEMENT ---

/**
* Fetches the portal user's data from the 'users' collection.
* @param {string} userId - The Firebase Auth User ID.
* @returns {Promise<object|null>} The user's data object or null if not found.
*/
export async function getPortalUser(userId) {
  if (!userId) return null;
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
      return userDocSnap.data();
  } else {
      console.error("No user document found for this user!");
      return null;
  }
}

/**
* Updates data for a specific user in the 'users' collection.
* @param {string} userId 
* @param {object} data 
*/
export async function updateUser(userId, data) {
  if (!userId) return;
  const userDocRef = doc(db, "users", userId);
  return await updateDoc(userDocRef, data);
}

/**
* Loads all users from the 'users' collection. (Super Admin only)
*/
export async function loadAllUsers() {
  return await getDocs(collection(db, "users"));
}

/**
* Fetches user documents based on a list of user IDs.
*/
export async function getUsersFromIds(userIds) {
  if (!userIds || userIds.length === 0) {
      return null;
  }
  const userRef = collection(db, "users");
  const q = query(userRef, where(documentId(), "in", userIds));
  return await getDocs(q);
}

// --- MEMBERSHIP MANAGEMENT ---

export async function loadAllMemberships() {
  return await getDocs(collection(db, "memberships"));
}

export async function getMembershipsForUser(userId) {
  if (!userId) return null;
  const membershipsRef = collection(db, "memberships");
  const q = query(membershipsRef, where("userId", "==", userId));
  return await getDocs(q);
}

export async function getMembershipsForCompany(companyId) {
  if (!companyId) return null;
  const membershipsRef = collection(db, "memberships");
  const q = query(membershipsRef, where("companyId", "==", companyId));
  return await getDocs(q);
}

export async function addMembership(membershipData) {
  const q = query(
      collection(db, "memberships"),
      where("userId", "==", membershipData.userId),
      where("companyId", "==", membershipData.companyId)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
      throw new Error("User is already a member of this company.");
  }
  return await addDoc(collection(db, "memberships"), membershipData);
}

export async function updateMembershipRole(membershipId, newRole) {
  if (!membershipId) return;
  const membershipRef = doc(db, "memberships", membershipId);
  return await updateDoc(membershipRef, { role: newRole });
}

export async function deleteMembership(membershipId) {
  if (!membershipId) return;
  const membershipRef = doc(db, "memberships", membershipId);
  return await deleteDoc(membershipRef);
}