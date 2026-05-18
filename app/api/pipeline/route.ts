import { NextResponse } from "next/server";
import { getFolderIdByName, listWavFiles, downloadFileAsBuffer } from "@/lib/drive";
import { analyzeCall } from "@/lib/gemini";
import { adminDb } from "@/lib/firebase-admin";

const DELAY_MS = 5500; // Gemini rate limit
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface PipelineLogEntry {
  index: number;
  total: number;
  callId: string;
  fileName: string;
  score?: number;
  notEvaluable?: boolean;
  error?: string;
}

// Global state — hot reload'da kaybolmasın
declare global {
  // eslint-disable-next-line no-var
  var _pipelineRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var _pipelineLog: PipelineLogEntry[] | undefined;
  // eslint-disable-next-line no-var
  var _pipelineFolder: string | undefined;
  // eslint-disable-next-line no-var
  var _pipelineShouldStop: boolean | undefined;
}
if (global._pipelineRunning === undefined) global._pipelineRunning = false;
if (global._pipelineLog === undefined) global._pipelineLog = [];
if (global._pipelineFolder === undefined) global._pipelineFolder = "";
if (global._pipelineShouldStop === undefined) global._pipelineShouldStop = false;

async function runPipeline(folderName: string, folderId: string, count: number) {
  global._pipelineRunning = true;
  global._pipelineLog = [];
  global._pipelineFolder = folderName;
  global._pipelineShouldStop = false;

  try {
    // Takılı kalan processing/pending kayıtları temizle
    const stuckSnap = await adminDb
      .collection("calls")
      .where("folderDate", "==", folderName)
      .where("status", "in", ["processing", "pending"])
      .get();
    if (!stuckSnap.empty) {
      const cleanBatch = adminDb.batch();
      stuckSnap.docs.forEach((d) => cleanBatch.delete(d.ref));
      await cleanBatch.commit();
      console.log(`[Pipeline] ${stuckSnap.size} takılı kayıt temizlendi`);
    }

    const allFiles = await listWavFiles(folderId);

    // Daha önce tamamlanmış olanları atla
    const completedSnap = await adminDb
      .collection("calls")
      .where("folderDate", "==", folderName)
      .where("status", "==", "completed")
      .get();
    const completedIds = new Set(completedSnap.docs.map((d) => d.data().driveFileId as string));

    const toProcess = allFiles
      .filter((f) => !completedIds.has(f.id))
      .slice(0, count === -1 ? 9999 : count);

    console.log(`[Pipeline] ${folderName}: ${toProcess.length} dosya işlenecek`);

    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i];
      const entry: PipelineLogEntry = {
        index: i + 1,
        total: toProcess.length,
        callId: "",
        fileName: file.name,
      };
      global._pipelineLog!.push(entry);

      // Firestore'a pending kayıt oluştur
      const docRef = adminDb.collection("calls").doc();
      entry.callId = docRef.id;
      await docRef.set({
        fileName: file.name,
        driveFileId: file.id,
        folderDate: folderName,
        fileSizeBytes: file.size ? parseInt(file.size) : null,
        transcript: "",
        transcriptLines: [],
        status: "processing",
        createdAt: new Date(),
      });

      try {
        const buffer = await downloadFileAsBuffer(file.id);
        const result = await analyzeCall(buffer, file.name);

        await docRef.update({
          transcript: result.transcript,
          transcriptLines: result.transcriptLines,
          agentName: result.agentName || null,
          subjectInfo: result.subjectInfo || null,
          estimatedDurationSeconds: result.estimatedDurationSeconds,
          compliance: result.compliance,
          status: "completed",
          processedAt: new Date(),
        });

        entry.score = result.compliance.score;
        entry.notEvaluable = result.compliance.notEvaluable;
        console.log(`[Pipeline] ${i + 1}/${toProcess.length} tamamlandı: ${file.name} → ${result.compliance.notEvaluable ? "—" : result.compliance.score}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        entry.error = msg;
        await docRef.update({ status: "error", errorMessage: msg, processedAt: new Date() });
        console.error(`[Pipeline] Hata (${file.name}):`, msg);
      }

      // Durdur isteği geldiyse çık
      if (global._pipelineShouldStop) {
        console.log(`[Pipeline] ${folderName} kullanıcı tarafından durduruldu`);
        break;
      }

      if (i < toProcess.length - 1) await sleep(DELAY_MS);
    }

    console.log(`[Pipeline] ${folderName} tamamlandı/durduruldu`);
  } catch (err) {
    console.error("[Pipeline] Kritik hata:", err);
  } finally {
    global._pipelineRunning = false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const folderName = body.folderName as string;
    const count = typeof body.count === "number" ? body.count : 10;

    if (!folderName) return NextResponse.json({ error: "folderName gerekli" }, { status: 400 });
    if (!PARENT_FOLDER_ID) return NextResponse.json({ error: "GOOGLE_DRIVE_PARENT_FOLDER_ID tanımlanmamış" }, { status: 500 });

    if (global._pipelineRunning) {
      return NextResponse.json({
        running: true,
        folder: global._pipelineFolder,
        message: `Başka bir süreç devam ediyor: ${global._pipelineFolder}`,
      }, { status: 409 });
    }

    // Folder ID'sini Drive'dan bul
    const folderId = await getFolderIdByName(PARENT_FOLDER_ID, folderName);
    if (!folderId) return NextResponse.json({ error: `'${folderName}' bulunamadı` }, { status: 404 });

    runPipeline(folderName, folderId, count).catch(console.error);

    return NextResponse.json({ started: true, folderName, count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    running: global._pipelineRunning ?? false,
    folder: global._pipelineFolder ?? "",
    log: global._pipelineLog ?? [],
  });
}

export async function DELETE() {
  global._pipelineShouldStop = true;
  return NextResponse.json({ stopping: true });
}
