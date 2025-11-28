// functions/index.js

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");

// Initialize the Firebase Admin App
admin.initializeApp();

// --- SHARED HELPER: Create/Update Driver Profile ---
async function processDriverData(data) {
  const db = admin.firestore();
  const email = data.email;
  const phone = data.phone;

  if (!email) return;

  let driverUid;

  // 1. Find or Create Auth User
  try {
    try {
        const existingUser = await admin.auth().getUserByEmail(email);
        driverUid = existingUser.uid;
        console.log(`Driver exists: ${email}`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const newDriverAuth = await admin.auth().createUser({
                email: email,
                emailVerified: true,
                displayName: `${data.firstName} ${data.lastName}`,
                phoneNumber: phone || undefined
            });
            driverUid = newDriverAuth.uid;
            console.log(`Created new Driver Auth: ${email}`);
        } else {
            throw e;
        }
    }
  } catch (error) {
    console.error("Error managing driver auth:", error);
    return; 
  }

  // 2. Create/Update Master Profile
  const driverDocRef = db.collection("drivers").doc(driverUid);
  const masterProfileData = {
    personalInfo: {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: email,
      phone: phone || "",
      dob: data.dob || "",
      ssn: data.ssn || "",
      street: data.street || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || ""
    },
    qualifications: {
      experienceYears: data.experience || data['experience-years'] || "",
    },
    licenses: [
      {
        state: data.cdlState || "",
        number: data.cdlNumber || "",
        expiration: data.cdlExpiration || "",
        class: data.cdlClass || ""
      }
    ],
    lastApplicationDate: admin.firestore.FieldValue.serverTimestamp()
  };
  await driverDocRef.set(masterProfileData, { merge: true });
  console.log(`Successfully synced profile for ${email}`);
}


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

  const db = admin.firestore();
  let userId;
  let isNewUser = false;

  try {
    // 3. Check if user exists
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        userId = userRecord.uid;
        console.log(`User ${email} already exists. Adding membership.`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            // Create New User
            const newUserRecord = await admin.auth().createUser({
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
    // Note: The 'onMembershipWrite' trigger will automatically sync Claims
    await db.collection("memberships").add({ 
        userId, 
        companyId, 
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // If it was an existing user, we didn't set the password, so let the caller know
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
// This ensures "Regular users also can work with several companies"
// Whenever a membership is added/modified/deleted, this runs.
exports.onMembershipWrite = onDocumentWritten("memberships/{membershipId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    // Get the affected User ID
    const userId = after ? after.userId : before?.userId;
    if (!userId) return;

    const db = admin.firestore();
    
    // 1. Fetch all memberships for this user
    const memSnap = await db.collection("memberships").where("userId", "==", userId).get();
    
    // 2. Fetch User Profile to check for global roles (like super_admin)
    // We assume global roles might be stored on the user doc or previously set manually. 
    // Ideally, super_admin should be stored in a separate secure way, but for this app structure:
    // We rebuild the claims map entirely from the memberships.
    
    let newClaims = { roles: {} };
    
    // Preserve existing globalRole if it exists (e.g. set manually via script)
    try {
        const userRecord = await admin.auth().getUser(userId);
        const existingClaims = userRecord.customClaims || {};
        if (existingClaims.roles && existingClaims.roles.globalRole) {
            newClaims.roles.globalRole = existingClaims.roles.globalRole;
        }
    } catch (e) {
        console.error("Error fetching user for claims sync:", e);
    }

    // 3. Build Roles Map
    memSnap.forEach(doc => {
        const m = doc.data();
        if (m.companyId && m.role) {
            newClaims.roles[m.companyId] = m.role;
        }
    });

    // 4. Update Auth
    await admin.auth().setCustomUserClaims(userId, newClaims);
    console.log(`Synced claims for user ${userId}:`, newClaims);
});

// --- EXPORT 3: Delete Portal User ---
exports.deletePortalUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  
  const callerClaims = request.auth.token.roles || {};
  if (callerClaims.globalRole !== "super_admin") {
    throw new HttpsError("permission-denied", "Only Super Admins can delete users.");
  }

  const { userId } = request.data;
  if (!userId) throw new HttpsError("invalid-argument", "Missing User ID.");

  const db = admin.firestore();

  try {
    await admin.auth().deleteUser(userId);
    await db.collection("users").doc(userId).delete();

    // Delete memberships (Trigger will run, but user is gone, so it will just fail gracefully)
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

// --- EXPORT 4: Delete Company ---
exports.deleteCompany = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  
  const callerClaims = request.auth.token.roles || {};
  if (callerClaims.globalRole !== "super_admin") {
    throw new HttpsError("permission-denied", "Only Super Admins can delete companies.");
  }

  const { companyId } = request.data;
  const db = admin.firestore();

  try {
    await db.collection("companies").doc(companyId).delete();
    const membershipsSnap = await db.collection("memberships").where("companyId", "==", companyId).get();
    const batch = db.batch();
    membershipsSnap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return { message: "Company deleted." };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// --- EXPORT 5: Get Company Profile ---
exports.getCompanyProfile = onCall((request) => {
  const companyId = request.data.companyId;
  if (!companyId) return null;
  return admin.firestore().collection('companies').doc(companyId).get()
    .then(doc => (doc.exists ? doc.data() : null));
});

// --- EXPORT 6: Move Application ---
exports.moveApplication = onCall(async (request) => {
  const { sourceCompanyId, destinationCompanyId, applicationId } = request.data;
  const db = admin.firestore();
  
  // Check paths for both legacy leads and nested applications
  // Priority: Applications -> Leads
  let collection = 'applications';
  let sourceRef = db.doc(`companies/${sourceCompanyId}/applications/${applicationId}`);
  
  let docSnap = await sourceRef.get();
  if (!docSnap.exists) {
      collection = 'leads';
      sourceRef = db.doc(`companies/${sourceCompanyId}/leads/${applicationId}`);
      docSnap = await sourceRef.get();
  }
  
  if (!docSnap.exists) throw new HttpsError("not-found", "Record not found.");
  
  const destRef = db.doc(`companies/${destinationCompanyId}/${collection}/${applicationId}`);
  const appData = docSnap.data();
  appData.companyId = destinationCompanyId;
  
  const batch = db.batch();
  batch.set(destRef, appData); 
  batch.delete(sourceRef);     
  await batch.commit();
  
  return { status: "success", message: "Moved." };
});

// --- EXPORT 7: Triggers for Driver Profile Sync ---
exports.onApplicationSubmitted = onDocumentCreated("companies/{companyId}/applications/{applicationId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

exports.onLeadSubmitted = onDocumentCreated("leads/{leadId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

// --- EXPORT 8: Send Automated Email ---
exports.sendAutomatedEmail = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    
    const { companyId, recipientEmail, triggerType, placeholders } = request.data;
    if (!companyId || !recipientEmail || !triggerType) throw new HttpsError("invalid-argument", "Missing required fields.");

    const db = admin.firestore();
    const companyDoc = await db.collection("companies").doc(companyId).get();
    if (!companyDoc.exists) throw new HttpsError("not-found", "Company not found.");
    
    const companyData = companyDoc.data();
    const settings = companyData.emailSettings || {};
    const templates = settings.templates || {};

    const template = templates[triggerType];
    if (!template || !template.enabled || !template.subject || !template.body) {
        return { success: false, reason: "No active template found." };
    }

    if (!settings.email || !settings.appPassword) {
        throw new HttpsError("failed-precondition", "Company email settings missing.");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: settings.email,
            pass: settings.appPassword
        }
    });

    let subject = template.subject;
    let body = template.body;

    if (placeholders) {
        Object.keys(placeholders).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'gi');
            subject = subject.replace(regex, placeholders[key]);
            body = body.replace(regex, placeholders[key]);
        });
    }

    try {
        await transporter.sendMail({
            from: `"${companyData.companyName || 'Recruiting'}" <${settings.email}>`,
            to: recipientEmail,
            subject: subject,
            text: body, 
        });
        return { success: true, message: "Email sent successfully." };
    } catch (error) {
        console.error("Email Send Error:", error);
        throw new HttpsError("internal", "Failed to send email: " + error.message);
    }
});

// --- EXPORT 9: Distribute Daily Leads ---
exports.distributeDailyLeads = onCall(async (request) => {
    if (!request.auth || request.auth.token.roles?.globalRole !== 'super_admin') {
        throw new HttpsError("permission-denied", "Super Admin only.");
    }

    const db = admin.firestore();
    const companiesSnap = await db.collection("companies").get();
    if (companiesSnap.empty) return { message: "No companies found." };

    const leadsSnap = await db.collection("leads")
        .orderBy("createdAt", "desc")
        .limit(200) 
        .get();

    if (leadsSnap.empty) return { message: "No leads found in pool." };

    const BATCH_SIZE = 450;
    let batch = db.batch();
    let opCount = 0;
    const distributionDetails = [];

    for (const companyDoc of companiesSnap.docs) {
        const companyId = companyDoc.id;
        const plan = companyDoc.data().planType || 'free';
        const limit = plan === 'paid' ? 200 : 50;

        let sentCount = 0;
        
        for (const leadDoc of leadsSnap.docs) {
            if (sentCount >= limit) break;

            const leadData = leadDoc.data();
            const destRef = db.collection("companies").doc(companyId).collection("leads").doc(leadDoc.id);
            
            const distData = {
                ...leadData,
                isPlatformLead: true, 
                distributedAt: admin.firestore.FieldValue.serverTimestamp(),
                originalLeadId: leadDoc.id,
            };

            batch.set(destRef, distData, { merge: true });
            sentCount++;
            opCount++;

            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }
        distributionDetails.push(`${companyDoc.data().companyName}: ${sentCount} leads`);
    }

    if (opCount > 0) {
        await batch.commit();
    }

    return { 
        message: "Distribution Complete", 
        details: distributionDetails 
    };
});

// --- EXPORT 10: Join Team (Public Invite) ---
exports.joinCompanyTeam = onCall(async (request) => {
    const { companyId, fullName, email, password } = request.data;
    
    // 1. Create or Find User
    let userId;
    try {
        const user = await admin.auth().getUserByEmail(email);
        userId = user.uid;
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const newUser = await admin.auth().createUser({
                email, password, displayName: fullName, emailVerified: true
            });
            userId = newUser.uid;
            
            await admin.firestore().collection("users").doc(userId).set({ 
                name: fullName, email, createdAt: admin.firestore.FieldValue.serverTimestamp() 
            });
        } else {
            throw e;
        }
    }

    // 2. Add to Team (Claims trigger will handle permissions)
    const db = admin.firestore();
    await db.collection("memberships").add({
        userId,
        companyId,
        role: "hr_user", // Default role for invites
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});
```json