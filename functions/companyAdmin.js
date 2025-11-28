// hr portal/functions/companyAdmin.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");
// UPDATED: Import from shared singleton
const { admin, db } = require("./firebaseAdmin");

// --- EXPORT 1: Delete Company (Super Admin) ---
exports.deleteCompany = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  
  const callerClaims = request.auth.token.roles || {};
  if (callerClaims.globalRole !== "super_admin") {
    throw new HttpsError("permission-denied", "Only Super Admins can delete companies.");
  }

  const { companyId } = request.data;

  try {
    // 1. Delete Company Document
    await db.collection("companies").doc(companyId).delete();
    
    // 2. Delete Memberships (trigger onMembershipWrite runs here)
    const membershipsSnap = await db.collection("memberships").where("companyId", "==", companyId).get();
  
    const batch = db.batch();
    membershipsSnap.forEach((doc) => 
    {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return { message: "Company deleted." };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// --- EXPORT 2: Get Company Profile (Public/HR) ---
exports.getCompanyProfile = onCall((request) => {
  const companyId = request.data.companyId;
  if (!companyId) return null;
  return db.collection('companies').doc(companyId).get()
    .then(doc => (doc.exists ? doc.data() : null));
});

// --- EXPORT 3: Move Application (Super Admin) ---
exports.moveApplication = onCall(async (request) => {
  const { sourceCompanyId, destinationCompanyId, applicationId } = request.data;
  
  // Check paths for both nested applications and nested leads
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

// --- EXPORT 4: Send Automated Email ---
exports.sendAutomatedEmail = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    
    const { companyId, recipientEmail, triggerType, placeholders } = request.data;
    if (!companyId || !recipientEmail || !triggerType) throw new HttpsError("invalid-argument", "Missing required fields.");

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

// --- EXPORT 5: Distribute Daily Leads (Super Admin) ---
exports.distributeDailyLeads = onCall(async (request) => {
    if (!request.auth || request.auth.token.roles?.globalRole !== 'super_admin') {
        throw new HttpsError("permission-denied", "Super Admin only.");
    }

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