import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { analyzeCompliance } from "@/lib/compliance";

const DELAY_MS = 5000; // Gemini rate limit için bekleme

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 30 saniye = ~65 kelime (130 kelime/dk ortalama)
function isLongEnough(transcript: string): boolean {
  const wordCount = transcript.trim().split(/\s+/).length;
  return wordCount >= 65;
}

let isRunning = false;

async function runCompliance(count: number) {
  isRunning = true;
  try {
    // Tamamlanan, 30sn+ olan ve henüz kontrol edilmemiş kayıtları al
    const snapshot = await adminDb
      .collection("calls")
      .where("status", "==", "completed")
      .get();

    const candidates = snapshot.docs
      .filter((doc) => {
        const d = doc.data();
        return (
          !d.compliance &&
          d.transcript &&
          isLongEnough(d.transcript)
        );
      })
      .slice(0, count === -1 ? 9999 : count);

    console.log(`[Compliance] ${candidates.length} kayıt analiz edilecek`);

    for (let i = 0; i < candidates.length; i++) {
      const doc = candidates[i];
      const data = doc.data();
      console.log(`[Compliance] ${i + 1}/${candidates.length}: ${data.fileName}`);

      try {
        const result = await analyzeCompliance(data.transcript);
        await doc.ref.update({ compliance: result });
        console.log(`[Compliance] Skor: ${result.score} — ${data.fileName}`);
      } catch (err) {
        console.error(`[Compliance] Hata (${data.fileName}):`, err);
      }

      if (i < candidates.length - 1) await sleep(DELAY_MS);
    }

    console.log("[Compliance] Tamamlandı");
  } catch (err) {
    console.error("[Compliance] Kritik hata:", err);
  } finally {
    isRunning = false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body.count === "number" ? body.count : 10;

    if (isRunning) {
      return NextResponse.json({ message: "Zaten çalışıyor", running: true });
    }

    runCompliance(count).catch(console.error);

    return NextResponse.json({ started: true, count: count === -1 ? "tümü" : count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const snapshot = await adminDb
    .collection("calls")
    .where("status", "==", "completed")
    .get();

  const total = snapshot.docs.length;
  const checked = snapshot.docs.filter((d) => d.data().compliance).length;
  const longEnough = snapshot.docs.filter((d) => {
    const data = d.data();
    return data.transcript && isLongEnough(data.transcript);
  }).length;

  return NextResponse.json({ total, checked, longEnough, unchecked: longEnough - checked, running: isRunning });
}
