import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TranscriptLine } from "@/lib/types";

async function assignSpeakers(transcript: string): Promise<TranscriptLine[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Aşağıdaki çağrı merkezi konuşmasını satır satır analiz et.
Bu bir hukuk/icra bürosunun araması. İki konuşmacı var:
- "Asistan": Bürodan arayan kişi (profesyonel dil kullanır, dosyadan bahseder)
- "Borçlu": Karşı taraf, müşteri veya borçlu

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

export async function POST() {
  try {
    const snapshot = await adminDb.collection("calls").where("status", "==", "completed").get();

    const toFix = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.transcriptLines || data.transcriptLines.length === 0;
    });

    let fixed = 0;
    for (const doc of toFix) {
      const data = doc.data();
      if (!data.transcript || data.transcript.trim().length < 10) continue;
      try {
        const lines = await assignSpeakers(data.transcript);
        await doc.ref.update({ transcriptLines: lines });
        fixed++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`Fix hatası (${data.fileName}):`, err);
      }
    }

    return NextResponse.json({ total: toFix.length, fixed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const snapshot = await adminDb.collection("calls").where("status", "==", "completed").get();
  const remaining = snapshot.docs.filter((doc) => {
    const d = doc.data();
    return !d.transcriptLines || d.transcriptLines.length === 0;
  }).length;
  return NextResponse.json({ remaining });
}
