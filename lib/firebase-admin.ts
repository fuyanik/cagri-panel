import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { getServiceAccount } from "./service-account";

function getAdminDb() {
  if (getApps().length > 0) {
    return admin.firestore(getApps()[0]);
  }

  const serviceAccount = getServiceAccount();
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  const db = admin.firestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

// Lazy getter - sadece ilk çağrıda başlatılır, build sırasında değil
let _adminDb: admin.firestore.Firestore | null = null;

export function getAdminFirestore() {
  if (!_adminDb) {
    _adminDb = getAdminDb();
  }
  return _adminDb;
}

// Geriye dönük uyumluluk için - mevcut importları bozmaz
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (getAdminFirestore() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
