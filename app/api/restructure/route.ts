import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TranscriptLine } from "@/lib/types";

const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function assignSpeakers(transcript: string): Promise<TranscriptLine[]> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Aşağıdaki çağrı merkezi konuşmasını satır satır analiz et.
Bu bir hukuk/icra bürosunun araması. İki konuşmacı var:
- "Asistan": Bürodan arayan kişi (profesyonel dil kullanır, dosyadan, tutardan bahseder)
- "Borçlu": Müşteri/borçlu (karşı taraf)

Konuşmanın başında genellikle Asistan "Merhaba, ... ofisinden arıyorum" gibi kendini tanıtır.

Metni konuşmacılara göre böl ve SADECE bu JSON formatında yanıt ver:
[
  {"speaker": "Asistan", "text": "..."},
  {"speaker": "Borçlu", "text": "..."}
]

Konuşma:
${transcript}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Geçersiz yanıt");

  return JSON.parse(jsonMatch[0]) as TranscriptLine[];
}

let isRunning = false;

export async function POST() {
  if (isRunning) {
    return NextResponse.json({ message: "Zaten çalışıyor" }, { status: 409 });
  }

  isRunning = true;

  // Arka planda çalıştır, hemen yanıt dön
  (async () => {
    try {
      const snapshot = await adminDb
        .collection("calls")
        .where("status", "==", "completed")
        .get();

      const toFix = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.transcriptLines || data.transcriptLines.length === 0;
      });

      console.log(`[Restructure] ${toFix.length} kayıt yeniden yapılandırılacak`);

      for (let i = 0; i < toFix.length; i++) {
        const doc = toFix[i];
        const data = doc.data();

        if (!data.transcript || data.transcript.trim().length < 20) continue;

        try {
          const lines = await assignSpeakers(data.transcript);
          await doc.ref.update({ transcriptLines: lines });
          console.log(`[Restructure] ${i + 1}/${toFix.length} tamamlandı: ${data.fileName}`);
        } catch (err) {
          console.error(`[Restructure] Hata (${data.fileName}):`, err);
        }

        if (i < toFix.length - 1) await sleep(DELAY_MS);
      }

      console.log("[Restructure] Tamamlandı");
    } catch (err) {
      console.error("[Restructure] Genel hata:", err);
    } finally {
      isRunning = false;
    }
  })();

  return NextResponse.json({ message: "Yeniden yapılandırma başladı, arka planda devam ediyor" });
}

export async function GET() {
  const snapshot = await adminDb
    .collection("calls")
    .where("status", "==", "completed")
    .get();

  const total = snapshot.docs.length;
  const fixed = snapshot.docs.filter((doc) => {
    const d = doc.data();
    return d.transcriptLines && d.transcriptLines.length > 0;
  }).length;

  return NextResponse.json({
    total,
    fixed,
    remaining: total - fixed,
    isRunning,
  });
}
