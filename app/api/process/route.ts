import { NextResponse } from "next/server";
import { listWavFiles, downloadFileAsBuffer } from "@/lib/drive";
import { analyzeCall } from "@/lib/gemini";
import { adminDb } from "@/lib/firebase-admin";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const FOLDER_DATE = "20260508";
const DELAY_MS = 4500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isRunning = false;

async function runPipeline() {
  if (isRunning) return;
  isRunning = true;

  try {
    console.log(`Drive klasörü taranıyor: ${FOLDER_ID}`);
    const files = await listWavFiles(FOLDER_ID);
    console.log(`${files.length} wav dosyası bulundu`);

    // --- ADIM 1: Tüm dosyaları hemen Firestore'a kaydet (pending) ---
    const batch = adminDb.batch();
    let batchCount = 0;

    for (const file of files) {
      // Zaten completed olanları atla
      const existing = await adminDb
        .collection("calls")
        .where("driveFileId", "==", file.id)
        .where("status", "==", "completed")
        .limit(1)
        .get();

      if (!existing.empty) continue;

      // pending kaydı yoksa ekle
      const pendingExisting = await adminDb
        .collection("calls")
        .where("driveFileId", "==", file.id)
        .limit(1)
        .get();

      if (pendingExisting.empty) {
        const docRef = adminDb.collection("calls").doc();
        batch.set(docRef, {
          fileName: file.name,
          driveFileId: file.id,
          folderDate: FOLDER_DATE,
          fileSizeBytes: file.size ? parseInt(file.size) : null,
          transcript: "",
          summary: "",
          status: "pending",
          createdAt: new Date(),
        });
        batchCount++;

        // Firestore batch limiti 500
        if (batchCount === 499) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) await batch.commit();
    console.log(`Tüm dosyalar Firestore'a eklendi (pending)`);

    // --- ADIM 2: Sırayla işle ---
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Completed olanları atla
      const completed = await adminDb
        .collection("calls")
        .where("driveFileId", "==", file.id)
        .where("status", "==", "completed")
        .limit(1)
        .get();

      if (!completed.empty) {
        console.log(`Zaten tamamlanmış, atlanıyor: ${file.name}`);
        continue;
      }

      // Pending/error kaydını bul ve processing yap
      const docSnap = await adminDb
        .collection("calls")
        .where("driveFileId", "==", file.id)
        .limit(1)
        .get();

      if (docSnap.empty) continue;

      const docRef = docSnap.docs[0].ref;
      await docRef.update({ status: "processing" });

      console.log(`[${i + 1}/${files.length}] İşleniyor: ${file.name}`);

      try {
        const buffer = await downloadFileAsBuffer(file.id);
        const geminiResult = await analyzeCall(buffer, file.name);

        await docRef.update({
          transcript: geminiResult.transcript,
          transcriptLines: geminiResult.transcriptLines,
          compliance: geminiResult.compliance,
          status: "completed",
          processedAt: new Date(),
        });

        console.log(`Tamamlandı: ${file.name}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await docRef.update({
          status: "error",
          errorMessage: errorMsg,
          processedAt: new Date(),
        });
        console.error(`Hata (${file.name}):`, errorMsg);
      }

      if (i < files.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log("Pipeline tamamlandı.");
  } catch (err) {
    console.error("Pipeline kritik hata:", err);
  } finally {
    isRunning = false;
  }
}

export async function POST() {
  if (!FOLDER_ID) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_FOLDER_ID ortam değişkeni tanımlanmamış" },
      { status: 500 }
    );
  }

  if (isRunning) {
    return NextResponse.json({
      started: false,
      message: "Pipeline zaten çalışıyor.",
    });
  }

  runPipeline().catch(console.error);

  return NextResponse.json({
    started: true,
    folderId: FOLDER_ID,
    folderDate: FOLDER_DATE,
    message: "Pipeline başlatıldı.",
  });
}

export async function GET() {
  return NextResponse.json({
    running: isRunning,
    folderId: FOLDER_ID,
    folderDate: FOLDER_DATE,
  });
}
