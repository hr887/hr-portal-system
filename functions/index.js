// functions/index.js

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const nodemailer = require('nodemailer'); // <--- NEW IMPORT

// Initialize the Firebase Admin App once
admin.initializeApp();

// --- CONFIGURATION: EMAIL SETTINGS ---
// TODO: Replace these with your actual email details or use Environment Variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hr@raystarllc.com', // <--- PUT YOUR GMAIL HERE
        pass: 'tdfm vtvb gieq craw'     // <--- PUT YOUR GMAIL APP PASSWORD HERE
    }
});

// --- SHARED HELPER: Create/Update Driver Profile ---
async function processDriverData(data) {
  const db = admin.firestore();
  const email = data.email;
  const phone = data.phone;

  if (!email) return;

  let driverUid;

  try {
    const newDriverAuth = await admin.auth().createUser({
      email: email,
      emailVerified: true,
      displayName: `${data.firstName} ${data.lastName}`,
      phoneNumber: phone || undefined
    });
    driverUid = newDriverAuth.uid;
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        driverUid = existingUser.uid;
      } catch (innerError) {
         console.error("Error finding existing user:", innerError);
         return;
      }
    } else {
      console.error("Error managing driver auth:", error);
      return; 
    }
  }

  const driverDocRef = db.collection("drivers").doc(driverUid);
  
  const masterProfileData = {
    personalInfo: {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      middleName: data.middleName || "",
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
      legalWork: data['legal-work'] || "yes",
      englishFluency: data['english-fluency'] || "yes",
    },
    licenses: [
      {
        state: data.cdlState || "",
        number: data.cdlNumber || "",
        expiration: data.cdlExpiration || "",
        class: data.cdlClass || "",
        endorsements: data.endorsements || "",
        hasTwic: data['has-twic'] || "no",
        twicExpiration: data.twicExpiration || "",
      }
    ],
    workHistory: data.employers || [],
    accidentHistory: data.accidents || [],
    violations: data.violations || [],
    lastApplicationDate: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await driverDocRef.set(masterProfileData, { merge: true });
}

async function runDistributionLogic() {
    const db = admin.firestore();
    let totalDistributed = 0;
    let log = [];

    try {
        const companiesSnap = await db.collection('companies').get();
        const driversSnap = await db.collection('drivers')
            .where('driverProfile.availability', '==', 'actively_looking')
            .where('driverProfile.isBulkUpload', '==', true)
            .get();

        const allAvailableDrivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        for (const companyDoc of companiesSnap.docs) {
            const companyId = companyDoc.id;
            const companyData = companyDoc.data();
            
            const planType = companyData.planType || 'free';
            const dailyQuota = planType === 'paid' ? 200 : 50;
            
            let assignedCount = 0;
            const batch = db.batch(); 

            for (const driver of allAvailableDrivers) {
                if (assignedCount >= dailyQuota) break; 

                const distributedList = driver.distributedTo || [];
                
                if (!distributedList.includes(companyId)) {
                    const leadRef = db.collection('companies').doc(companyId).collection('leads').doc();
                    const leadData = {
                        driverId: driver.id,
                        firstName: driver.personalInfo.firstName,
                        lastName: driver.personalInfo.lastName,
                        email: driver.personalInfo.email,
                        phone: driver.personalInfo.phone,
                        experience: driver.qualifications.experienceYears,
                        driverType: driver.driverProfile.type || 'unidentified',
                        status: 'New Lead',
                        isPlatformLead: true,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        distributedAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    batch.set(leadRef, leadData);

                    const driverRef = db.collection('drivers').doc(driver.id);
                    batch.update(driverRef, {
                        distributedTo: admin.firestore.FieldValue.arrayUnion(companyId)
                    });
                    
                    driver.distributedTo = [...distributedList, companyId];
                    assignedCount++;
                    totalDistributed++;
                }
            }

            if (assignedCount > 0) {
                await batch.commit();
                log.push(`Assigned ${assignedCount} leads to ${companyData.companyName}.`);
            }
        }
        return { totalDistributed, log };
    } catch (error) {
        console.error("Distribution Logic Error:", error);
        throw error;
    }
}

// --- EXPORT 1: Create Portal User ---
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
      email, 
      password, 
      displayName: fullName, 
      emailVerified: true,
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

// --- EXPORT 2: Get Company Profile ---
exports.getCompanyProfile = onCall((request) => {
  const companyId = request.data.companyId;
  return admin.firestore().collection('companies').doc(companyId).get()
    .then(doc => {
        if (!doc.exists) throw new HttpsError("not-found", "Company not found.");
        return doc.data();
    });
});

// --- EXPORT 3: Move Application ---
exports.moveApplication = onCall(async (request) => {
  const { sourceCompanyId, destinationCompanyId, applicationId, isSourceNested } = request.data;
  const db = admin.firestore();
  const sourcePath = isSourceNested ? `companies/${sourceCompanyId}/applications/${applicationId}` : `applications/${applicationId}`;
  const destRef = db.doc(`companies/${destinationCompanyId}/applications/${applicationId}`);
  const sourceRef = db.doc(sourcePath);
  
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

// --- EXPORT 4: Triggers ---
exports.onApplicationSubmitted = onDocumentCreated("companies/{companyId}/applications/{applicationId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

exports.onLeadSubmitted = onDocumentCreated("leads/{leadId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

// --- EXPORT 5: Manual Distribution ---
exports.distributeDailyLeads = onCall(async (request) => {
    if (!request.auth || request.auth.token.roles.globalRole !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only Super Admin can distribute leads.');
    }
    const result = await runDistributionLogic();
    return { 
        status: 'success', 
        message: `Distributed ${result.totalDistributed} leads total.`,
        details: result.log 
    };
});

// --- EXPORT 6: Scheduled Distribution ---
exports.distributeLeadsScheduled = onSchedule("every day 00:00", async (event) => {
    console.log("⏰ Starting scheduled lead distribution...");
    const result = await runDistributionLogic();
    console.log(`✅ Distribution complete. Assigned: ${result.totalDistributed}`);
});

// --- EXPORT 7: Send Driver Invite (NEW!) ---
exports.sendDriverInvite = onCall(async (request) => {
    const { driverEmail, driverName, companyName, message } = request.data;

    // 1. Validation
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in.');
    if (!driverEmail) throw new HttpsError('invalid-argument', 'Driver email missing.');

    // 2. Prepare Email
    const mailOptions = {
        from: `"${companyName}" <noreply@truckerapp.com>`,
        to: driverEmail,
        subject: `Job Opportunity at ${companyName}`,
        text: message || `Hi ${driverName},\n\n${companyName} has viewed your profile and would like to invite you to apply for a driving position.\n\nPlease contact us to proceed.\n\nBest,\n${companyName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Job Invite from ${companyName}</h2>
                <p>Hi <strong>${driverName}</strong>,</p>
                <p>We reviewed your profile on the SafeHaul network and are impressed with your experience.</p>
                <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
                    ${message || "We would like to invite you to apply for a driving position with our company."}
                </p>
                <p>Please reply to this email or contact us directly to move forward.</p>
                <br/>
                <p style="color: #6b7280; font-size: 12px;">Sent via SafeHaul Platform</p>
            </div>
        `
    };

    // 3. Send
    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "Email sent successfully!" };
    } catch (error) {
        console.error("Email send failed:", error);
        // Don't crash the frontend, but return error info
        return { success: false, error: error.message };
    }
});