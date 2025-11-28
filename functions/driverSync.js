// hr portal/functions/driverSync.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
// UPDATED: Import from shared singleton
const { admin, db, auth } = require("./firebaseAdmin");

/**
 * SHARED HELPER: Finds or Creates the Auth User and syncs data to the Master Profile.
 * This is triggered by both Lead (unbranded) and Application (branded) submissions.
 * @param {object} data - The raw data from the submitted lead or application document.
 */
async function processDriverData(data) {
  const email = data.email;
  const phone = data.phone;
  if (!email || email.includes('@placeholder.com')) {
    console.log("Skipping profile sync: No valid email provided.");
    return;
  }

  let driverUid;
  // 1. Find or Create Auth User
  try {
    try {
        const existingUser = await auth.getUserByEmail(email);
        driverUid = existingUser.uid;
        console.log(`Driver exists: ${email}`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const newDriverAuth = await auth.createUser({
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
      phone: data.phone || "",
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

// --- EXPORT: Triggers for Driver Profile Sync ---

exports.onApplicationSubmitted = onDocumentCreated("companies/{companyId}/applications/{applicationId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});

exports.onLeadSubmitted = onDocumentCreated("leads/{leadId}", async (event) => {
  if (!event.data) return;
  await processDriverData(event.data.data());
});