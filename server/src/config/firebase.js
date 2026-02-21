// Import the Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://<YOUR-FIREBASE-PROJECT-ID>.firebaseio.com'
});

module.exports = admin;