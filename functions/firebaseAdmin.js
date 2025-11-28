// hr portal/functions/firebaseAdmin.js

const admin = require("firebase-admin");

// Initialize the app only if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };