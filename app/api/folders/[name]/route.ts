import { NextResponse } from "next/server";
import { getFolderIdByName, listWavFiles } from "@/lib/drive";
import { adminDb } from "@/lib/firebase-admin";

const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!PARENT_FOLDER_ID) {
      return NextResponse.json({ error: "GOOGLE_DRIVE_PARENT_FOLDER_ID tanımlanmamış" }, { status: 500 });
    }

    // Ana folder içinde "20260511" gibi isimli alt klasörü bul
    const folderId = await getFolderIdByName(PARENT_FOLDER_ID, name);

    if (!folderId) {
      return NextResponse.json({ error: `'${name}' klasörü bulunamadı`, wavCount: 0 }, { status: 404 });
    }

    // O klasördeki WAV dosyalarını say
    const wavFiles = await listWavFiles(folderId);
    const wavCount = wavFiles.length;

    // Firestore'dan işlenmiş kayıt sayısı
    const snapshot = await adminDb.collection("calls").where("folderDate", "==", name).get();
    const calls = snapshot.docs.map((d) => d.data());
    const completed = calls.filter((c) => c.status === "completed").length;
    const errors = calls.filter((c) => c.status === "error").length;
    const pending = calls.filter((c) => c.status === "pending" || c.status === "processing").length;

    return NextResponse.json({ wavCount, folderId, completed, errors, pending, total: calls.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[FolderStats] Hata:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
