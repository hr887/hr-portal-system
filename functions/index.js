// functions/index.js

// Import the necessary Firebase Admin modules
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

// Initialize the Firebase Admin App
admin.initializeApp();

/**
 * =================================================================
 * createPortalUser
 * =================================================================
 * A secure, callable function for creating new portal users
 * (Company Admins or HR Users).
 *
 * This function is intentionally designed so that ONLY a Super Admin
 * can create another Super Admin. A Company Admin CANNOT.
 *
 * This function WILL allow a Company Admin to create a new user
 * (like 'hr_user') for *their own company*.
 */
exports.createPortalUser = onCall(async (request) => {
  // 1. Get the data sent from the app
  const { fullName, email, password, companyId, role } = request.data;

  // 2. Check if the person *calling* this function is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to create a user."
    );
  }

  // 3. Get the claims (roles) of the person calling the function
  const callerClaims = request.auth.token.roles || {};
  const isSuperAdmin = callerClaims.globalRole === "super_admin";
  
  // 4. Get the role they are trying to assign to the new user
  // This is a security check to prevent a Company Admin
  // from creating a Super Admin.
  let newRoleClaims = {};
  
  if (role === "super_admin") {
    // ONLY a Super Admin can create another Super Admin
    if (!isSuperAdmin) {
      throw new HttpsError(
        "permission-denied",
        "You must be a Super Admin to create another Super Admin."
      );
    }
    newRoleClaims = { globalRole: "super_admin" };

  } else if (role === "company_admin" || role === "hr_user") {
    
    // To create a company user, the caller must be either:
    // 1. A Super Admin
    // 2. A Company Admin for that *specific company*
    const isAdminForThisCompany = callerClaims[companyId] === "company_admin";

    if (!isSuperAdmin && !isAdminForThisCompany) {
      throw new HttpsError(
        "permission-denied",
        "You must be a Super Admin or a Company Admin for this company to create new users."
      );
    }
    
    // The new user's role will be for this specific company
    newRoleClaims = { [companyId]: role };

  } else {
    // Unknown role
    throw new HttpsError("invalid-argument", "An invalid role was provided.");
  }

  // --- If all security checks pass, create the user ---

  let newUserRecord;
  try {
    // 5. Create the user in Firebase Authentication
    newUserRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
      emailVerified: true, // We trust the admin
    });
  } catch (error) {
    console.error("Error creating auth user:", error.message);
    throw new HttpsError("internal", `Could not create auth user: ${error.message}`);
  }

  const newUserId = newUserRecord.uid;

  try {
    // 6. Create the user's document in the /users collection
    await admin.firestore().collection("users").doc(newUserId).set({
      name: fullName,
      email: email,
    });

    // 7. Create the membership document
    await admin.firestore().collection("memberships").add({
      userId: newUserId,
      companyId: companyId,
      role: role,
    });

    // 8. Set the user's custom claims (this is what lets them log in!)
    await admin.auth().setCustomUserClaims(newUserId, {
      roles: newRoleClaims,
    });

    // 9. Send a success message back to the app
    return {
      status: "success",
      message: `Successfully created user ${fullName} (${email}) and assigned them as ${role}.`,
    };

  } catch (error) {
    // This is an "undo" step. If Firestore fails, delete the auth user
    // we just created so we don't have a half-broken user.
    await admin.auth().deleteUser(newUserId);
    console.error("Error setting claims or creating user docs:", error.message);
    throw new HttpsError("internal", `Could not create user in database: ${error.message}`);
  }
});

/**
 * =================================================================
 * (This is the other Cloud Function code from your project)
 * =================================================================
 */
exports.getCompanyProfile = onCall((request) => {
  // We can add security here later if needed
  const companyId = request.data.companyId;
  if (!companyId) {
    throw new HttpsError("invalid-argument", "No companyId provided.");
  }
  return admin.firestore().collection('companies').doc(companyId).get()
    .then(doc => {
      if (!doc.exists) {
        throw new HttpsError("not-found", "Company not found.");
      }
      return doc.data();
    });
});

exports.moveApplication = onCall(async (request) => {
  const { sourceCompanyId, destinationCompanyId, applicationId, isSourceNested } = request.data;
  
  // We should add security checks here later
  
  const db = admin.firestore();
  
  let sourcePath;
  if (isSourceNested) {
    sourcePath = `companies/${sourceCompanyId}/applications/${applicationId}`;
  } else {
    sourcePath = `applications/${applicationId}`;
  }
  
  const destPath = `companies/${destinationCompanyId}/applications/${applicationId}`;
  
  const sourceRef = db.doc(sourcePath);
  const destRef = db.doc(destPath);
  
  try {
    const docSnap = await sourceRef.get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Source application not found.");
    }
    
    const appData = docSnap.data();
    
    // Update companyId in the data
    appData.companyId = destinationCompanyId; 
    
    // Run the move in a batch
    const batch = db.batch();
    batch.set(destRef, appData); // Create the new document
    batch.delete(sourceRef);     // Delete the old document
    
    await batch.commit();
    
    return { status: "success", message: "Application moved successfully." };
    
  } catch (error) {
    console.error("Error moving application:", error);
    throw new HttpsError("internal", error.message);
  }
  /**
 * =================================================================
 * onApplicationSubmitted
 * =================================================================
 * This function triggers AFTER a new application is created in any
 * company's subcollection.
 *
 * It automatically creates a "master profile" for the driver
 * and pre-fills it with their application data.
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

exports.onApplicationSubmitted = onDocumentCreated("companies/{companyId}/applications/{applicationId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }
  const appData = snapshot.data();
  const appEmail = appData.email;
  const appPhone = appData.phone;

  if (!appEmail) {
    console.log(`Application ${snapshot.id} has no email. Skipping profile creation.`);
    return;
  }

  const db = admin.firestore();
  
  // 1. Check if a driver profile with this email *already* exists.
  const driversRef = db.collection("drivers");
  const existingDriverQuery = await driversRef.where("personalInfo.email", "==", appEmail).limit(1).get();

  if (!existingDriverQuery.empty) {
    console.log(`Driver profile for ${appEmail} already exists. Skipping creation.`);
    // TODO: In the future, we could *update* their profile with this new data.
    return;
  }

  // 2. If no profile exists, create a new one.
  console.log(`Creating new driver profile for ${appEmail}...`);
  let newDriverAuthUser;
  try {
    // 3. Create a new "passwordless" user in Firebase Authentication
    newDriverAuthUser = await admin.auth().createUser({
      email: appEmail,
      emailVerified: true, // We assume the app verifies the email
      displayName: `${appData.firstName} ${appData.lastName}`,
      phoneNumber: appPhone // Store their phone number in auth as well
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`Auth user for ${appEmail} already exists. Skipping auth creation.`);
      // This is a rare case where the auth user exists but the profile doc doesn't.
      // We can try to find them and use their ID.
      newDriverAuthUser = await admin.auth().getUserByEmail(appEmail);
    } else {
      console.error("Error creating new auth user:", error);
      return; // Exit function on failure
    }
  }

  const newDriverUid = newDriverAuthUser.uid;

  // 4. Create the new, secure driver profile document
  const driverDocRef = db.collection("drivers").doc(newDriverUid);
  
  // 5. Copy all relevant data from the application to the new master profile
  // This is the "pre-fill" logic
  await driverDocRef.set({
    personalInfo: {
      firstName: appData.firstName || "",
      middleName: appData.middleName || "",
      lastName: appData.lastName || "",
      email: appData.email || "",
      phone: appData.phone || "",
      dob: appData.dob || "",
      ssn: appData.ssn || "",
      street: appData.street || "",
      city: appData.city || "",
      state: appData.state || "",
      zip: appData.zip || "",
      // Add other personal fields
    },
    qualifications: {
      legalWork: appData['legal-work'] || "yes",
      englishFluency: appData['english-fluency'] || "yes",
      experienceYears: appData['experience-years'] || "",
      // Add other qualification fields
    },
    licenses: [
      {
        cdlState: appData.cdlState || "",
        cdlClass: appData.cdlClass || "",
        cdlNumber: appData.cdlNumber || "",
        cdlExpiration: appData.cdlExpiration || "",
        endorsements: appData.endorsements || "",
        hasTwic: appData['has-twic'] || "no",
        twicExpiration: appData.twicExpiration || "",
      }
    ],
    workHistory: appData.employers || [],
    accidentHistory: appData.accidents || [],
    violations: appData.violations || [],
    // etc... add all fields you want in the master profile
    
    // Metadata
    createdAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp()
  });

  console.log(`Successfully created new driver profile for ${appEmail} with UID ${newDriverUid}`);
  return;
});
});