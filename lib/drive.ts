import { google } from "googleapis";
import { getServiceAccount } from "./service-account";
import type { DriveFile } from "./types";

function getDriveClient() {
  const serviceAccount = getServiceAccount();

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export async function listWavFiles(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size)",
    pageSize: 1000,
  });

  const files = response.data.files || [];
  return files
    .filter((f) => f.name?.toLowerCase().endsWith(".wav"))
    .map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType || "audio/wav",
      size: f.size || undefined,
    }));
}

export async function downloadFileAsBuffer(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}
