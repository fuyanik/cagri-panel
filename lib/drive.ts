import { google } from "googleapis";
import { getServiceAccount } from "./service-account";
import type { DriveFile } from "./types";

// Son 60 günün YYYYMMDD listesini dinamik üret
function getRecentDates(days = 60): Set<string> {
  const dates = new Set<string>();
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.add(`${yyyy}${mm}${dd}`);
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

export interface DailyFolder {
  id: string;
  name: string; // YYYYMMDD
  date: string; // "11 Mayıs 2026"
  dayName: string; // "Pazartesi"
}

function formatFolderDate(yyyymmdd: string): { date: string; dayName: string } {
  const year = parseInt(yyyymmdd.slice(0, 4));
  const month = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const day = parseInt(yyyymmdd.slice(6, 8));
  const d = new Date(year, month, day);
  const date = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const dayName = d.toLocaleDateString("tr-TR", { weekday: "long" });
  // Capitalize first letter
  return { date, dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1) };
}

function getDriveClient() {
  const serviceAccount = getServiceAccount();

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export async function getFolderIdByName(parentFolderId: string, name: string): Promise<string | null> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });

  return response.data.files?.[0]?.id ?? null;
}

export async function listDailyFolders(parentFolderId: string): Promise<DailyFolder[]> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 100,
  });

  const recentDates = getRecentDates(60);
  const folders = response.data.files || [];
  return folders
    .filter((f) => f.name && /^\d{8}$/.test(f.name) && recentDates.has(f.name))
    .map((f) => {
      const { date, dayName } = formatFolderDate(f.name!);
      return { id: f.id!, name: f.name!, date, dayName };
    })
    .sort((a, b) => b.name.localeCompare(a.name)); // En yeni üstte
}

export async function listWavFiles(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, videoMediaMetadata)",
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
      durationMillis: f.videoMediaMetadata?.durationMillis || undefined,
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
