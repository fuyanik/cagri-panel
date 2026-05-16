import { readFileSync } from "fs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceAccount(): any {
  // Prod: JSON içeriği direkt env variable olarak
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  // Lokal: dosya yolu env variable olarak
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    return JSON.parse(readFileSync(credentialsPath, "utf-8"));
  }

  throw new Error(
    "Service account bulunamadı. GOOGLE_SERVICE_ACCOUNT_JSON veya GOOGLE_APPLICATION_CREDENTIALS tanımlanmalı."
  );
}
