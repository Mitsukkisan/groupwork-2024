const admin = require('firebase-admin');
require('dotenv').config();
// サービスアカウントの設定
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// Firebase Admin SDKの初期化
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'conveni-trend.firebasestorage.app',
});
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();
module.exports = { firebaseApp, db, bucket };
