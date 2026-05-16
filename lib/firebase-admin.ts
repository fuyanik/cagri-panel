import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { getServiceAccount } from "./service-account";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = getServiceAccount();

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = getAdminApp();
export const adminDb = admin.firestore(adminApp);
