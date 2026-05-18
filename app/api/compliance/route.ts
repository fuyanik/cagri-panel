import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { analyzeCompliance } from "@/lib/gemini";

const DELAY_MS = 5000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isLongEnough(transcript: string): boolean {
  return transcript.trim().split(/\s+/).length >= 65;
}

interface LogEntry {
  index: number;
  total: number;
  callId: string;
  fileName: string;
  score?: number;
  error?: string;
}

// global'de sakla — hot reload veya modül yeniden yüklemesinde kaybolmasın
declare global {
  // eslint-disable-next-line no-var
  var _complianceRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var _complianceLog: LogEntry[] | undefined;
}

function getRunning(): boolean { return global._complianceRunning ?? false; }
function setRunning(v: boolean) { global._complianceRunning = v; }
function getLog(): LogEntry[] { return global._complianceLog ?? []; }
function resetLog() { global._complianceLog = []; }
function pushLog(entry: LogEntry) { (global._complianceLog = global._complianceLog ?? []).push(entry); }

async function runCompliance(count: number) {
  setRunning(true);
  resetLog();

  try {
    const snapshot = await adminDb
      .collection("calls")
      .where("status", "==", "completed")
      .get();

    const candidates = snapshot.docs
      .filter((doc) => {
        const d = doc.data();
        return !d.compliance && d.transcript && isLongEnough(d.transcript);
      })
      .slice(0, count === -1 ? 9999 : count);

    for (let i = 0; i < candidates.length; i++) {
      const doc = candidates[i];
      const data = doc.data();
      const entry: LogEntry = { index: i + 1, total: candidates.length, callId: doc.id, fileName: data.fileName as string };

      pushLog(entry);
      console.log(`[Compliance] ${entry.index}/${entry.total}: ${entry.fileName}`);

      try {
        const result = await analyzeCompliance(data.transcript);
        await doc.ref.update({ compliance: result });
        entry.score = result.score;
        console.log(`[Compliance] Skor: ${result.score} — ${entry.fileName}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        entry.error = msg;
        console.error(`[Compliance] Hata (${entry.fileName}):`, msg);
      }

      if (i < candidates.length - 1) await sleep(DELAY_MS);
    }

    console.log("[Compliance] Tamamlandı");
  } catch (err) {
    console.error("[Compliance] Kritik hata:", err);
  } finally {
    setRunning(false);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body.count === "number" ? body.count : 10;

    if (getRunning()) {
      return NextResponse.json({ message: "Zaten çalışıyor", running: true, log: getLog() });
    }

    runCompliance(count).catch(console.error);
    return NextResponse.json({ started: true, count: count === -1 ? "tümü" : count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ running: getRunning(), log: getLog() });
}
