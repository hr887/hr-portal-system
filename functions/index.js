// functions/index.js

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// Initialize the Firebase Admin App once
admin.initializeApp();

// --- SHARED HELPER: Create/Update Driver Profile ---
// This helper function ensures driver data is synced to their master profile
async function processDriverData(data) {
  const db = admin.firestore();
  const email = data.email;
  const phone = data.phone;

  if (!email) return;

  let driverUid;

  // 1. Find or Create Auth User
  try {
    // Try to create a new user
    const newDriverAuth = await admin.auth().createUser({
      email: email,
      emailVerified: true,
      displayName: `${data.firstName} ${data.lastName}`,
      phoneNumber: phone || undefined
    });
    driverUid = newDriverAuth.uid;
    console.log(`Created new Auth user for: ${email}`);
  } catch (error) {
    // If user already exists, find them
    if (error.code === 'auth/email-already-exists') {
      console.log(`User already exists for: ${email}`);
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

  // 2. Create/Update Master Profile in Firestore
  const driverDocRef = db.collection("drivers").doc(driverUid);
  
  // Map fields from either Lead or Application format
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
      // Handle 'experience' (Lead form) OR 'experience-years' (App form)
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
    // Common lists
    workHistory: data.employers || [],
    accidentHistory: data.accidents || [],
    violations: data.violations || [],

    // Metadata
    lastApplicationDate: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Use set with merge: true to update without overwriting existing data
  await driverDocRef.set(masterProfileData, { merge: true });
  console.log(`Successfully synced profile for ${email} with UID ${driverUid}`);
}


// --- EXPORT 1: Create Portal User (Admin Only) ---
exports.createPortalUser = onCall(async (request) => {
  const { fullName, email, password, companyId, role } = request.data;

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to create a user.");
  }

  const callerClaims = request.auth.token.roles || {};
  const isSuperAdmin = callerClaims.globalRole === "super_admin";
  let newRoleClaims = {};
  
  if (role === "super_admin") {
    if (!isSuperAdmin) throw new HttpsError("permission-denied", "Super Admin only.");
    newRoleClaims = { globalRole: "super_admin" };
  } else if (role === "company_admin" || role === "hr_user") {
    const isAdminForThisCompany = callerClaims[companyId] === "company_admin";
    if (!isSuperAdmin && !isAdminForThisCompany) {
        throw new HttpsError("permission-denied", "Permission denied.");
    }
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
  if (!companyId) throw new HttpsError("invalid-argument", "No companyId provided.");
  
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
  
  // Handle path logic (Nested vs Root) - defaulting to nested for company apps
  const sourcePath = isSourceNested 
    ? `companies/${sourceCompanyId}/applications/${applicationId}` 
    : `applications/${applicationId}`;
    
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

// --- EXPORT 4: Trigger on Company Application ---
// This runs when a full application is submitted to a company
exports.onApplicationSubmitted = onDocumentCreated("companies/{companyId}/applications/{applicationId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

// --- EXPORT 5: Trigger on General Lead ---
// This runs when a quick lead is submitted on the home page
exports.onLeadSubmitted = onDocumentCreated("leads/{leadId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});