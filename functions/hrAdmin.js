// hr portal/functions/hrAdmin.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
// UPDATED: Import from shared singleton
const { admin, db, auth } = require("./firebaseAdmin");

// --- EXPORT 1: Create Portal User (Handles Existing Users) ---
exports.createPortalUser = onCall(async (request) => {
  const { fullName, email, password, companyId, role } = request.data;

  // 1. Auth Check
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const callerClaims = request.auth.token.roles || {};
  const isSuperAdmin = callerClaims.globalRole === "super_admin";
  
  // 2. Permission Check
  if (role === "super_admin") {
    if (!isSuperAdmin) throw new HttpsError("permission-denied", "Super Admin only.");
  } else if (role === "company_admin" || role === "hr_user") {
    const isAdminForThisCompany = callerClaims[companyId] === "company_admin";
  
    if (!isSuperAdmin && !isAdminForThisCompany) throw new HttpsError("permission-denied", "Permission denied.");
  } else {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }

  let userId;
  let isNewUser = false;

  try {
    // 3. Check if user exists
    try {
        const userRecord = await auth.getUserByEmail(email);
        userId = userRecord.uid;
        console.log(`User ${email} already exists. Adding membership.`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            // Create New User
            const newUserRecord = await auth.createUser({
                email, 
                password, 
                displayName: fullName, 
                emailVerified: true,
            });
            userId = newUserRecord.uid;
            isNewUser = true;
            
            // Create basic user profile doc
            await db.collection("users").doc(userId).set({ 
                name: fullName, 
                email,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            throw e;
        }
    }

    // 4. Check for duplicate membership
    const memQuery = await db.collection("memberships")
        .where("userId", "==", userId)
        .where("companyId", "==", companyId)
        .get();

    if (!memQuery.empty) {
        return { status: "success", message: "User is already in this company." };
    }

    // 5. Add Membership
    // The 'onMembershipWrite' trigger handles setting the claims
    await db.collection("memberships").add({ 
        userId, 
        companyId, 
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const msg = isNewUser 
        ? "User created successfully."
        : "User already existed. Added to company (Password unchanged).";

    return { status: "success", message: msg, userId };

  } catch (error) {
    console.error("Create User Error:", error);
    throw new HttpsError("internal", error.message);
  }
});

// --- EXPORT 2: Sync Custom Claims (Trigger) ---
exports.onMembershipWrite = onDocumentWritten("memberships/{membershipId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    const userId = after ? after.userId : before?.userId;
    if (!userId) return;

    let newClaims = { roles: {} };
    
    // 1. Preserve existing globalRole if it exists
    try {
        const userRecord = await auth.getUser(userId);
        const existingClaims = userRecord.customClaims || {};
        if (existingClaims.roles && existingClaims.roles.globalRole) {
            newClaims.roles.globalRole = existingClaims.roles.globalRole;
        }
    } catch (e) {
        console.error("Error fetching user for claims sync:", e);
    }

    // 2. Build Roles Map from all memberships
    const memSnap = await db.collection("memberships").where("userId", "==", userId).get();
    memSnap.forEach(doc => {
        const m = doc.data();
        if (m.companyId && m.role) {
            newClaims.roles[m.companyId] = m.role;
        }
    });

    // 3. Update Auth
    await auth.setCustomUserClaims(userId, newClaims);
    console.log(`Synced claims for user ${userId}:`, newClaims);
});

// --- EXPORT 3: Delete Portal User (Super Admin) ---
exports.deletePortalUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  
  const callerClaims = request.auth.token.roles || {};
  if (callerClaims.globalRole !== "super_admin") {
    throw new HttpsError("permission-denied", "Only Super Admins can delete users.");
  }

  const { userId } = request.data;
  if (!userId) throw new HttpsError("invalid-argument", "Missing User ID.");

  try {
    await auth.deleteUser(userId);
    await db.collection("users").doc(userId).delete();

    // Delete memberships (Trigger onMembershipWrite will also run)
    const membershipsSnap = await db.collection("memberships").where("userId", "==", userId).get();
    const batch = db.batch();
    membershipsSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { message: "User successfully deleted." };
  } catch (error) {
    console.error("Error deleting user:", error);
    if (error.code === 'auth/user-not-found') {
       await db.collection("users").doc(userId).delete();
       return { message: "User cleaned up from database (Auth user was already gone)." };
    }
    throw new HttpsError("internal", error.message);
  }
});

// --- EXPORT 4: Join Team (Public Invite) ---
exports.joinCompanyTeam = onCall(async (request) => {
    const { companyId, fullName, email, password } = request.data;
    
    // 1. Create or Find User
    let userId;
    try {
        const user = await auth.getUserByEmail(email);
        userId = user.uid;
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const newUser = await auth.createUser({
                email, password, displayName: fullName, emailVerified: true
            });
            userId = newUser.uid;
            
            await db.collection("users").doc(userId).set({ 
                name: fullName, email, createdAt: admin.firestore.FieldValue.serverTimestamp() 
            });
        } else {
            throw e;
        }
    }

    // 2. Add to Team (Claims trigger will handle permissions)
    await db.collection("memberships").add({
        userId,
        companyId,
        role: "hr_user", // Default role for invites
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});