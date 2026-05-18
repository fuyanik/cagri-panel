import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { readFileSync } from "fs";
import { join } from "path";
import type { TranscriptLine, ComplianceResult } from "./types";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlanmamış");
  return new GoogleGenerativeAI(apiKey);
}

function loadYonerge(): string {
  try {
    return readFileSync(join(process.cwd(), "lib", "yonerge.md"), "utf-8");
  } catch {
    console.error("[Gemini] yonerge.md okunamadı");
    return "";
  }
}

const WORDS_PER_MINUTE = 130;
const SHORT_CALL_SECONDS = 30;
const SHORT_CALL_WORDS = Math.floor((SHORT_CALL_SECONDS / 60) * WORDS_PER_MINUTE);

export function estimateDurationSeconds(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((wordCount / WORDS_PER_MINUTE) * 60);
}

// ─────────────────────────────────────────────────────────────
// ADIM 1: Ses → Transkript + Bilgi Çıkarımı
// ─────────────────────────────────────────────────────────────
export interface TranscriptResult {
  transcriptLines: TranscriptLine[];
  transcript: string;
  agentName: string;
  estimatedDurationSeconds: number;
  subjectInfo: {
    name?: string;
    tcNo?: string;
    icraOffice?: string;
    fileNo?: string;
  };
}

export async function transcribeAndExtract(
  audioBuffer: Buffer,
  fileName: string
): Promise<TranscriptResult> {
  const genAI = getGeminiClient();

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
          agentName: { type: SchemaType.STRING },
          subjectInfo: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              tcNo: { type: SchemaType.STRING },
              icraOffice: { type: SchemaType.STRING },
              fileNo: { type: SchemaType.STRING },
            },
          },
        },
        required: ["transcriptLines", "agentName", "subjectInfo"],
      },
    },
  });

  const prompt = `Bu ses dosyası bir Türkçe çağrı merkezi görüşmesidir. Aşağıdaki görevleri yap:

GÖREV 1: TRANSKRİPSİYON
Konuşmayı sırayla transkript et. İki konuşmacı:
- "Asistan": Acar Hukuk Bürosu çalışanı (ofisi tanıtır, icra/ödeme bilgisi verir)
- "Borçlu": Karşı taraf (arayan veya aranan)
Kim konuştuğu belli değilse "Borçlu" kullan.

GÖREV 2: BİLGİ ÇIKARIMI
- agentName: Asistanın adı (bulunamazsa "")
- subjectInfo.name: Borçlunun adı soyadı (söylendiyse)
- subjectInfo.tcNo: TC kimlik numarası — 11 hane, 0 ile başlamaz. Parçalı söylenirse birleştir. Geçersizse "".
- subjectInfo.icraOffice: İcra müdürlüğü adı
- subjectInfo.fileNo: Dosya/esas numarası
Bulunamayanları "" olarak ver.

TÜM ÇIKTILAR TÜRKÇE OLMALIDIR.`;

  const result = await model.generateContent([
    { inlineData: { mimeType: "audio/wav", data: audioBuffer.toString("base64") } },
    { text: prompt },
  ]);

  const parsed = JSON.parse(result.response.text().trim()) as {
    transcriptLines: TranscriptLine[];
    agentName: string;
    subjectInfo: { name?: string; tcNo?: string; icraOffice?: string; fileNo?: string };
  };

  const transcriptLines = parsed.transcriptLines ?? [];
  const transcript = transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join("\n");

  const rawTc = (parsed.subjectInfo?.tcNo ?? "").replace(/\D/g, "");
  const validTc = rawTc.length === 11 && rawTc[0] !== "0" ? rawTc : undefined;

  return {
    transcriptLines,
    transcript,
    agentName: parsed.agentName ?? "",
    estimatedDurationSeconds: estimateDurationSeconds(transcript),
    subjectInfo: {
      name: parsed.subjectInfo?.name || undefined,
      tcNo: validTc,
      icraOffice: parsed.subjectInfo?.icraOffice || undefined,
      fileNo: parsed.subjectInfo?.fileNo || undefined,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// ADIM 2: Transkript → Yönerge Uygunluk Analizi (metin çağrısı)
// ─────────────────────────────────────────────────────────────
export async function analyzeCompliance(transcript: string): Promise<ComplianceResult> {
  const genAI = getGeminiClient();
  const yonerge = loadYonerge();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          score: { type: SchemaType.NUMBER },
          compliant: { type: SchemaType.BOOLEAN },
          notEvaluable: { type: SchemaType.BOOLEAN },
          summary: { type: SchemaType.STRING },
          violations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                rule: { type: SchemaType.STRING },
                detail: { type: SchemaType.STRING },
                critical: { type: SchemaType.BOOLEAN },
              },
              required: ["rule", "detail", "critical"],
            },
          },
          warnings: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          positives: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["score", "compliant", "notEvaluable", "summary", "violations", "warnings", "positives"],
      },
    },
  });

  const prompt = `Aşağıdaki çağrı merkezi görüşmesini yönergeye göre değerlendir.

ÖNEMLİ: Tüm çıktılar (summary, violations, warnings, positives) TÜRKÇE olmalıdır.

BAĞLAM: Acar Hukuk Ofisi icra/otoyol ihlali çağrı merkezi. Asistan borçluyu arar veya borçlu arar.

TAM YÖNERGE:
${yonerge}

TRANSKRİPT:
${transcript}

DEĞERLENDİRME KURALLARI:
- score: 0-100 (100 = tam uyumlu)
- 90-100: Tüm kritik kurallar uygulandı
- 75-89: Küçük eksikler, genel uyumlu
- 55-74: Birden fazla kural ihlali
- 30-54: Ciddi ihlal
- 0-29: Kritik ihlal

DEĞERLENDİRİLEMEZ: Canlı asistan yoksa (sadece IVR/anons) → notEvaluable: true, score: 0

KESİN KURAL — ASLA İHLAL ETME:
- Yalnızca "Asistan:" satırlarını değerlendir
- "Borçlu:" satırları BAĞLAM içindir, asistana yüklenemez
- "Bu davranışı Asistan: satırında gördüm mü?" — Hayırsa ekleme
- violations.detail'de Asistan'ın gerçek sözünü Türkçe alıntıla + kısa yorum ekle

KRİTİK İHLAL SAYILMAZ:
- Yönergedeki sonuçları aktarmak (haciz masrafı, araç yakalama vb.) → bilgilendirme
- Dosya sorumlularına yönlendirme → doğru prosedür
- Borçlunun zor durumunu (vefat, hastalık vb.) kısaca kabul edip konuya devam etmek → normal iş akışı

38a.3 — OFİS İÇİ **SORUN** (dar tanım; süreç serbest; ASLA KRİTİK DEĞİL):
- Yalnızca borçluya **ofiste gerçek aksama/arıza/ihmal/çözümsüzlük** şikâyeti gibi aktarılırsa değerlendir (ör. kimse bakmıyor, sistem sürekli çöküyor, içerde karışıklık yüzünden size yansıyamadık).
- İHLAL DEĞİL — rutin **süreç/koordinasyon**: link/mesaj tekrar gönderme, başka WhatsApp/kanaldan iletilecek, mesajı arkadaşa/ekibe yönlendirme ("gönderdim gelmedi, diğer hatta yönlendirdim şimdi gönderilecek" vb.). Bunlar iç sorun şikâyeti değildir; violations'a yazma veya en fazla hafif uyarı.
- İcra/tahsilat **sonuç** bilgisi (işlem ekibi ödeme görmezse devam eder vb.) → 38a.3 ile ilgisiz.
- **ZORUNLU:** 38a.3 ile ilgili hiçbir violations kaydında critical:true kullanma; şüphede violations yerine warnings kullan veya hiç ekleme.

KİMLİK DOĞRULAMA:
ADIM 1: "Bu iki taraf daha önce iletişim kurmuş mu?" sorusunu transkriptin tamamından cevapla.
Açık veya DOLAYLI sinyaller ara: şikayet, önceki aramaya atıf, beklenti ifadeleri, tanışma olmadan konuya girme vb.
- İLK GÖRÜŞME + TC istenmemiş → KRİTİK ihlal
- TEKRAR GÖRÜŞME + TC istenmemiş → warnings'e Türkçe uyarı
- BELİRSİZ → warnings'e Türkçe uyarı

ALINTI ZORUNLULUĞU: Her violations kaydında Asistan'ın gerçek sözünü alıntıla. Alıntılayamıyorsan ekleme.`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text().trim()) as ComplianceResult;

  return {
    score: parsed.notEvaluable ? 0 : Math.max(0, Math.min(100, Math.round(parsed.score))),
    compliant: parsed.compliant,
    notEvaluable: parsed.notEvaluable ?? false,
    summary: parsed.summary,
    violations: parsed.violations ?? [],
    warnings: parsed.warnings ?? [],
    positives: parsed.positives ?? [],
    checkedAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────
// Birleşik: tek buton, iki çağrı
// ─────────────────────────────────────────────────────────────
export interface AnalysisResult extends TranscriptResult {
  compliance: ComplianceResult;
}

export async function analyzeCall(
  audioBuffer: Buffer,
  fileName: string
): Promise<AnalysisResult> {
  // Adım 1: Ses → transkript + bilgi
  const transcriptResult = await transcribeAndExtract(audioBuffer, fileName);
  const { transcript, estimatedDurationSeconds } = transcriptResult;

  // Adım 2: Kısa çağrıysa compliance atla
  const isShort = estimatedDurationSeconds < SHORT_CALL_SECONDS ||
    transcript.trim().split(/\s+/).length < SHORT_CALL_WORDS;

  const compliance: ComplianceResult = isShort
    ? {
        score: 0,
        compliant: false,
        notEvaluable: true,
        summary: `Kısa görüşme (~${estimatedDurationSeconds}sn), yönerge uygunluğu analiz edilmedi.`,
        violations: [],
        warnings: [],
        positives: [],
        checkedAt: new Date(),
      }
    : await analyzeCompliance(transcript);

  return { ...transcriptResult, compliance };
}
