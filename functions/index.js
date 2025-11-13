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
});