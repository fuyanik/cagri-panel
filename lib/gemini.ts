import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { TranscriptLine } from "./types";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ortam değişkeni tanımlanmamış");
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface GeminiResult {
  transcript: string;
  transcriptLines: TranscriptLine[];
  summary: string;
}

const PROMPT = `Bu ses dosyası bir çağrı merkezi görüşmesidir. İki konuşmacı var:
- "Asistan": Ofis veya hukuk bürosundan arayan çalışan
- "Borçlu": Karşı taraf, müşteri veya borçlu

Konuşmayı dinle ve JSON formatında yanıt ver:
- transcriptLines: her satır için { speaker: "Asistan" veya "Borçlu", text: "konuşulan metin" }
- summary: konuşmanın 2-3 cümlelik Türkçe özeti

Konuşmacı belli değilse "Borçlu" kullan. Özet Türkçe olmalı.`;

export async function transcribeAndSummarize(
  audioBuffer: Buffer,
  fileName: string
): Promise<GeminiResult> {
  const genAI = getGeminiClient();

  // JSON mode: Gemini her zaman geçerli JSON döndürür
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transcriptLines: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                speaker: { type: SchemaType.STRING },
                text: { type: SchemaType.STRING },
              },
              required: ["speaker", "text"],
            },
          },
          summary: { type: SchemaType.STRING },
        },
        required: ["transcriptLines", "summary"],
      },
    },
  });

  const audioBase64 = audioBuffer.toString("base64");

  const result = await model.generateContent([
    { inlineData: { mimeType: "audio/wav", data: audioBase64 } },
    { text: PROMPT },
  ]);

  const responseText = result.response.text().trim();
  console.log(`[Gemini] Ham yanıt (${fileName}): ${responseText.slice(0, 300)}`);

  const parsed = JSON.parse(responseText) as {
    transcriptLines: TranscriptLine[];
    summary: string;
  };

  if (!parsed.transcriptLines || !Array.isArray(parsed.transcriptLines)) {
    throw new Error(`transcriptLines eksik (${fileName})`);
  }

  const transcript = parsed.transcriptLines
    .map((l) => `${l.speaker}: ${l.text}`)
    .join("\n");

  return {
    transcript,
    transcriptLines: parsed.transcriptLines,
    summary: parsed.summary || "",
  };
}
