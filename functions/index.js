// functions/index.js

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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
    const newDriverAuth = await admin.auth().createUser({
      email: email,
      emailVerified: true,
      displayName: `${data.firstName} ${data.lastName}`,
      phoneNumber: phone || undefined
    });
    driverUid = newDriverAuth.uid;
    console.log(`Created new Auth user for: ${email}`);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`User already exists for: ${email}`);
      const existingUser = await admin.auth().getUserByEmail(email);
      driverUid = existingUser.uid;
    } else {
      console.error("Error managing driver auth:", error);
      return; 
    }
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


// --- EXPORT 1: Create Portal User (Admin Only) ---
exports.createPortalUser = onCall(async (request) => {
  const { fullName, email, password, companyId, role } = request.data;

  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const callerClaims = request.auth.token.roles || {};
  const isSuperAdmin = callerClaims.globalRole === "super_admin";
  let newRoleClaims = {};
  
  if (role === "super_admin") {
    if (!isSuperAdmin) throw new HttpsError("permission-denied", "Super Admin only.");
    newRoleClaims = { globalRole: "super_admin" };
  } else if (role === "company_admin" || role === "hr_user") {
    const isAdminForThisCompany = callerClaims[companyId] === "company_admin";
    if (!isSuperAdmin && !isAdminForThisCompany) throw new HttpsError("permission-denied", "Permission denied.");
    newRoleClaims = { [companyId]: role };
  } else {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }

  try {
    const newUserRecord = await admin.auth().createUser({
      email, password, displayName: fullName, emailVerified: true,
    });
    const newUserId = newUserRecord.uid;

    await admin.firestore().collection("users").doc(newUserId).set({ name: fullName, email });
    await admin.firestore().collection("memberships").add({ userId: newUserId, companyId, role });
    await admin.auth().setCustomUserClaims(newUserId, { roles: newRoleClaims });

    return { status: "success", message: "User created." };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// --- EXPORT 2: Delete Portal User ---
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

// --- EXPORT 3: Delete Company ---
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

// --- EXPORT 4: Get Company Profile ---
exports.getCompanyProfile = onCall((request) => {
  const companyId = request.data.companyId;
  if (!companyId) return null;
  return admin.firestore().collection('companies').doc(companyId).get()
    .then(doc => (doc.exists ? doc.data() : null));
});

// --- EXPORT 5: Move Application ---
exports.moveApplication = onCall(async (request) => {
  const { sourceCompanyId, destinationCompanyId, applicationId } = request.data;
  const db = admin.firestore();
  const sourceRef = db.doc(`companies/${sourceCompanyId}/applications/${applicationId}`);
  const destRef = db.doc(`companies/${destinationCompanyId}/applications/${applicationId}`);
  
  const docSnap = await sourceRef.get();
  if (!docSnap.exists) throw new HttpsError("not-found", "App not found.");
  
  const appData = docSnap.data();
  appData.companyId = destinationCompanyId;
  
  const batch = db.batch();
  batch.set(destRef, appData); 
  batch.delete(sourceRef);     
  await batch.commit();
  
  return { status: "success", message: "Moved." };
});

// --- EXPORT 6: Trigger on Company Application ---
exports.onApplicationSubmitted = onDocumentCreated("companies/{companyId}/applications/{applicationId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

// --- EXPORT 7: Trigger on General Lead ---
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

// --- EXPORT 9: Distribute Daily Leads (FULL LOGIC) ---
exports.distributeDailyLeads = onCall(async (request) => {
    // 1. Auth Check (Super Admin only)
    if (!request.auth || request.auth.token.roles?.globalRole !== 'super_admin') {
        throw new HttpsError("permission-denied", "Super Admin only.");
    }

    const db = admin.firestore();
    
    // 2. Fetch Companies
    const companiesSnap = await db.collection("companies").get();
    if (companiesSnap.empty) return { message: "No companies found." };

    // 3. Fetch Recent Leads from Pool
    // Limit to 200 for now to be safe, ordered by newest.
    // In production, you might want more sophisticated "unread" logic.
    const leadsSnap = await db.collection("leads")
        .orderBy("createdAt", "desc")
        .limit(200) 
        .get();

    if (leadsSnap.empty) return { message: "No leads found in pool." };

    const BATCH_SIZE = 450; // Firestore limit is 500
    let batch = db.batch();
    let opCount = 0;
    const distributionDetails = [];

    // 4. Distribute
    for (const companyDoc of companiesSnap.docs) {
        const companyId = companyDoc.id;
        const plan = companyDoc.data().planType || 'free';
        const limit = plan === 'paid' ? 200 : 50;

        let sentCount = 0;
        
        for (const leadDoc of leadsSnap.docs) {
            if (sentCount >= limit) break;

            const leadData = leadDoc.data();
            
            // Destination: companies/{companyId}/leads/{originalLeadId}
            // Using same ID ensures deduplication (if run multiple times, it just overwrites)
            const destRef = db.collection("companies").doc(companyId).collection("leads").doc(leadDoc.id);
            
            const distData = {
                ...leadData,
                isPlatformLead: true, // Tag as SafeHaul lead
                distributedAt: admin.firestore.FieldValue.serverTimestamp(),
                originalLeadId: leadDoc.id,
                // We do NOT overwrite status here to preserve "Contacted" states if re-run
            };

            // Use set with merge to create or update without destroying existing local data
            batch.set(destRef, distData, { merge: true });
            
            sentCount++;
            opCount++;

            // Commit and reset batch if full
            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }
        distributionDetails.push(`${companyDoc.data().companyName}: ${sentCount} leads`);
    }

    // Commit remaining
    if (opCount > 0) {
        await batch.commit();
    }

    return { 
        message: "Distribution Complete", 
        details: distributionDetails 
    };
});