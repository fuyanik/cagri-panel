import { NextResponse } from "next/server";
import { listDailyFolders } from "@/lib/drive";
import { adminDb } from "@/lib/firebase-admin";

const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;

export async function GET() {
  try {
    if (!PARENT_FOLDER_ID) {
      return NextResponse.json({ error: "GOOGLE_DRIVE_PARENT_FOLDER_ID tanımlanmamış" }, { status: 500 });
    }

    const folders = await listDailyFolders(PARENT_FOLDER_ID);

    // Her klasör için Firestore'dan çağrı istatistiklerini çek
    const foldersWithStats = await Promise.all(
      folders.map(async (folder) => {
        const snapshot = await adminDb
          .collection("calls")
          .where("folderDate", "==", folder.name)
          .get();

        const calls = snapshot.docs.map((d) => d.data());
        const total = calls.length;
        const completed = calls.filter((c) => c.status === "completed").length;
        const errors = calls.filter((c) => c.status === "error").length;
        const pending = calls.filter((c) => c.status === "pending" || c.status === "processing").length;

        return { ...folder, stats: { total, completed, errors, pending } };
      })
    );

    return NextResponse.json({ folders: foldersWithStats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
