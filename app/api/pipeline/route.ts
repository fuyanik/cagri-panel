import { NextResponse } from "next/server";
import { getFolderIdByName, listWavFiles, downloadFileAsBuffer } from "@/lib/drive";
import { analyzeCall } from "@/lib/gemini";
import { adminDb } from "@/lib/firebase-admin";

const DELAY_MS = 4000; // Gemini rate limit (metin çağrısı x2 per dosya)
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface StepInfo {
  label: string;
  status: "waiting" | "running" | "done" | "error";
  detail?: string;
}

export interface PipelineLogEntry {
  index: number;
  total: number;
  callId: string;
  fileName: string;
  steps: StepInfo[];
  score?: number;
  notEvaluable?: boolean;
  error?: string;
  step2Tokens?: number;
  step3Tokens?: number;
}

const STEP_LABELS: StepInfo["label"][] = [
  "Gemini 2.5 Flash — ses→transkript+atama",
  "Gemini 2.5 Flash — yönerge analizi",
];

function makeSteps(): StepInfo[] {
  return STEP_LABELS.map((label) => ({ label, status: "waiting" as const }));
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
        steps: makeSteps(),
      };
      global._pipelineLog!.push(entry);

      // Firestore'a processing kaydı oluştur
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

        const result = await analyzeCall(buffer, file.name, (stepIndex, status, detail) => {
          if (stepIndex >= 0 && stepIndex < entry.steps.length) {
            entry.steps[stepIndex].status = status;
            if (detail) entry.steps[stepIndex].detail = detail;
          }
          console.log(`[Pipeline] ${file.name} — Adım ${stepIndex + 1} ${status}${detail ? ` (${detail})` : ""}`);
        });

        await docRef.update({
          transcript: result.transcript,
          transcriptLines: result.transcriptLines,
          agentName: result.agentName || null,
          subjectInfo: result.subjectInfo || null,
          estimatedDurationSeconds: result.estimatedDurationSeconds,
          compliance: result.compliance,
          status: "completed",
          processedAt: new Date(),
          ...(result.step2Tokens !== undefined && { step2Tokens: result.step2Tokens }),
          ...(result.step3Tokens !== undefined && { step3Tokens: result.step3Tokens }),
        });

        entry.score = result.compliance.score;
        entry.notEvaluable = result.compliance.notEvaluable;
        entry.step2Tokens = result.step2Tokens;
        entry.step3Tokens = result.step3Tokens;
        console.log(
          `[Pipeline] ${i + 1}/${toProcess.length} tamamlandı: ${file.name} → ${
            result.compliance.notEvaluable ? "—" : result.compliance.score
          }`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        entry.error = msg;
        // Hata olan adımı "error" olarak işaretle
        const runningStep = entry.steps.findIndex((s) => s.status === "running");
        if (runningStep >= 0) {
          entry.steps[runningStep].status = "error";
          entry.steps[runningStep].detail = msg.slice(0, 80);
        }
        await docRef.update({ status: "error", errorMessage: msg, processedAt: new Date() });
        console.error(`[Pipeline] Hata (${file.name}):`, msg);
      }

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
      return NextResponse.json(
        { running: true, folder: global._pipelineFolder, message: `Başka bir süreç devam ediyor: ${global._pipelineFolder}` },
        { status: 409 }
      );
    }

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
