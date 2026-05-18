import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AssemblyAI } from "assemblyai";
import { readFileSync } from "fs";
import { join } from "path";
import type { TranscriptLine, ComplianceResult } from "./types";

// ─────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────

function countTokens(usage: { totalTokenCount?: number; thoughtsTokenCount?: number } | undefined): number | undefined {
  if (!usage) return undefined;
  const base = usage.totalTokenCount ?? 0;
  const thinking = (usage as Record<string, number>).thoughtsTokenCount ?? 0;
  const total = base + thinking;
  return total > 0 ? total : undefined;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlanmamış");
  return new GoogleGenerativeAI(apiKey);
}

let _aaiClient: AssemblyAI | null = null;
function getAAIClient(): AssemblyAI {
  if (!_aaiClient) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY tanımlanmamış");
    _aaiClient = new AssemblyAI({ apiKey });
  }
  return _aaiClient;
}

function loadYonergeMini(): string {
  try {
    return readFileSync(join(process.cwd(), "lib", "yonerge-mini.md"), "utf-8");
  } catch {
    console.error("[Gemini] yonerge-mini.md okunamadı, yonerge.md fallback");
    try {
      return readFileSync(join(process.cwd(), "lib", "yonerge.md"), "utf-8");
    } catch {
      return "";
    }
  }
}

const WORDS_PER_MINUTE = 130;
const SHORT_CALL_SECONDS = 30;
const SHORT_CALL_WORDS = Math.floor((SHORT_CALL_SECONDS / 60) * WORDS_PER_MINUTE);

export function estimateDurationSeconds(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((wordCount / WORDS_PER_MINUTE) * 60);
}

// Step callback: (stepIndex 0-2, status, optional detail)
export type StepCallback = (
  stepIndex: number,
  status: "running" | "done" | "error",
  detail?: string
) => void;

// ─────────────────────────────────────────────────────────────
// ADIM 1: Ses → Konuşmacı Etiketli Transkript  (AssemblyAI Universal-2)
// ─────────────────────────────────────────────────────────────
export interface AAIUtterance {
  speaker: string; // "A", "B", "C"...
  text: string;
}

export async function assemblyaiDiarize(
  audioBuffer: Buffer
): Promise<AAIUtterance[]> {
  const client = getAAIClient();

  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    speech_models: ["universal-2"],
    language_code: "tr",
    speaker_labels: true,
    speakers_expected: 2,
    word_boost: [
      "Acar Hukuk",
      "Acar Hukuk Bürosu",
      "icra",
      "icra takip",
      "icra müdürlüğü",
      "ihlal",
      "otoyol",
      "Avrasya",
      "Avrasya Tüneli",
      "Karayolları",
      "vekalet ücreti",
      "tahsil harcı",
      "haciz",
      "banka blokesi",
      "tebligat",
    ],
    boost_param: "high",
  });

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI hata: ${transcript.error}`);
  }

  if (!transcript.utterances || transcript.utterances.length === 0) {
    return [{ speaker: "A", text: transcript.text ?? "" }];
  }

  return transcript.utterances.map((u) => ({
    speaker: u.speaker ?? "A",
    text: u.text ?? "",
  }));
}

// ─────────────────────────────────────────────────────────────
// ADIM 2: speaker_A/B → Asistan/Borçlu atama + Bilgi Çıkarımı (Gemini — metin)
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
  step2Tokens?: number;
}

export async function assignSpeakersAndExtract(
  utterances: AAIUtterance[]
): Promise<TranscriptResult> {
  const genAI = getGeminiClient();

  // AssemblyAI etiketli metni Gemini'ye ver — sadece ilk ~40 segmenti gönder,
  // konuşmacı tespiti için yeterli; tamamı gereksiz output yaratıyor
  const sampleText = utterances
    .slice(0, 40)
    .map((u) => `speaker_${u.speaker}: ${u.text}`)
    .join("\n");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error thinkingConfig henüz SDK tiplerinde yok ama API destekliyor
      thinkingConfig: { thinkingBudget: 0 },
      // transcriptLines burada YOK — kodla üretilecek
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          assistantSpeaker: { type: SchemaType.STRING },
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
        required: ["assistantSpeaker", "agentName", "subjectInfo"],
      },
    },
  });

  const prompt = `Aşağıda bir Türkçe çağrı merkezi görüşmesinden segment örnekleri var.
Konuşmacılar speaker_A, speaker_B gibi etiketlenmiş.
Bunlardan biri "Asistan" (Acar Hukuk Bürosu çalışanı), diğeri "Borçlu".

İKİ GÖREV:

GÖREV 1 — KONUŞMACI TESPİTİ:
- Hangi speaker'ın Asistan olduğunu belirle (Acar Hukuk'u tanıtan, icra/ödeme bilgisi veren, kendini tanıtan taraf).
- assistantSpeaker: o speaker'ın harfini yaz ("A", "B" vb.).
- Tespit edilemezse "A" yaz.

GÖREV 2 — BİLGİ ÇIKARIMI:
- agentName: Asistanın adı (bulunamazsa "")
- subjectInfo.name: Borçlunun adı soyadı (bulunamazsa "")
- subjectInfo.tcNo: TC kimlik no — 11 hane, 0 ile başlamaz, parçalıysa birleştir (bulunamazsa "")
- subjectInfo.icraOffice: İcra müdürlüğü adı (bulunamazsa "")
- subjectInfo.fileNo: Dosya/esas numarası (bulunamazsa "")

SEGMENTLER:
${sampleText}`;

  const result = await model.generateContent(prompt);
  const step2Tokens = countTokens(result.response.usageMetadata);
  const parsed = JSON.parse(result.response.text().trim()) as {
    assistantSpeaker: string;
    agentName: string;
    subjectInfo: { name?: string; tcNo?: string; icraOffice?: string; fileNo?: string };
  };

  const assistantSpeaker = parsed.assistantSpeaker ?? "A";

  // transcriptLines kodla üret — model artık bunları yazmıyor
  const transcriptLines: TranscriptLine[] = utterances.map((u) => ({
    speaker: u.speaker === assistantSpeaker ? "Asistan" : "Borçlu",
    text: u.text,
  }));
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
    step2Tokens,
  };
}

// ─────────────────────────────────────────────────────────────
// ADIM 3: Transkript → Yönerge Uygunluk Analizi (Gemini — metin)
// ─────────────────────────────────────────────────────────────
export async function analyzeCompliance(transcript: string): Promise<{ result: ComplianceResult; tokens?: number }> {
  const genAI = getGeminiClient();
  const yonerge = loadYonergeMini();

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

MİNİ YÖNERGE (AI ODAKLI):
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

DEĞERLENDİRİLEMEZ (notEvaluable: true, score: 0) — aşağıdaki durumlarda:
- Canlı asistan yoksa (sadece IVR/anons)
- Yanlış numara: Aranan kişi hatta değil; hat sahibi kişiyi tanımadığını söyler ("Tanımıyorum", "Yanlış numara", "Ben değilim" vb.) ve görüşme borç/dosya detayı olmadan kısa biter
- Borçlu teyit edilemeden hat kesilir / konuşma hiç gerçekleşmez
Bu durumlarda violations/warnings/positives BOŞ bırakılır, summary sebebi kısaca açıklar.

KESİN KURAL — ASLA İHLAL ETME:
- Yalnızca "Asistan:" satırlarını değerlendir
- "Borçlu:" satırları BAĞLAM içindir, asistana yüklenemez
- "Bu davranışı Asistan: satırında gördüm mü?" — Hayırsa ekleme
- violations.detail'de Asistan'ın gerçek sözünü Türkçe alıntıla + kısa yorum ekle

KRİTİK İHLAL SAYILMAZ:
- Yönergedeki sonuçları aktarmak (haciz masrafı, araç yakalama vb.) → bilgilendirme
- Dosya sorumlularına yönlendirme → doğru prosedür
- Borçlunun zor durumunu (vefat, hastalık vb.) kısaca kabul edip konuya devam etmek → normal iş akışı

38a.3 — OFİS İÇİ SORUN (dar tanım; süreç serbest; ASLA KRİTİK DEĞİL):
- Yalnızca borçluya ofiste gerçek aksama/arıza/ihmal/çözümsüzlük şikâyeti gibi aktarılırsa değerlendir.
- İHLAL DEĞİL — rutin süreç/koordinasyon: link/mesaj tekrar gönderme, başka WhatsApp/kanaldan iletilecek, mesajı arkadaşa/ekibe yönlendirme ("gönderdim gelmedi, diğer hatta yönlendirdim şimdi gönderilecek" vb.).
- İcra/tahsilat sonuç bilgisi (işlem ekibi ödeme görmezse devam eder vb.) → 38a.3 ile ilgisiz.
- ZORUNLU: 38a.3 ile ilgili hiçbir violations kaydında critical:true kullanma; şüphede violations yerine warnings kullan veya hiç ekleme.

KİMLİK DOĞRULAMA:
ADIM 1: "Bu iki taraf daha önce iletişim kurmuş mu?" sorusunu transkriptin tamamından cevapla.
Açık veya DOLAYLI sinyaller ara: şikayet, önceki aramaya atıf, beklenti ifadeleri, tanışma olmadan konuya girme vb.
- İLK GÖRÜŞME + TC istenmemiş → KRİTİK ihlal
- TEKRAR GÖRÜŞME + TC istenmemiş → warnings'e Türkçe uyarı
- BELİRSİZ → warnings'e Türkçe uyarı

ALINTI ZORUNLULUĞU: Her violations kaydında Asistan'ın gerçek sözünü alıntıla. Alıntılayamıyorsan ekleme.`;

  const result = await model.generateContent(prompt);
  const tokens = countTokens(result.response.usageMetadata);
  const parsed = JSON.parse(result.response.text().trim()) as ComplianceResult;

  return {
    result: {
      score: parsed.notEvaluable ? 0 : Math.max(0, Math.min(100, Math.round(parsed.score))),
      compliant: parsed.compliant,
      notEvaluable: parsed.notEvaluable ?? false,
      summary: parsed.summary,
      violations: parsed.violations ?? [],
      warnings: parsed.warnings ?? [],
      positives: parsed.positives ?? [],
      checkedAt: new Date(),
    },
    tokens,
  };
}

// ─────────────────────────────────────────────────────────────
// ADIM 1+2 BİRLEŞİK: Ses → Transkript + Konuşmacı Atama (Gemini Audio)
// ─────────────────────────────────────────────────────────────
export async function geminiTranscribeAndAssign(
  audioBuffer: Buffer
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

  const prompt = `Bu ses kaydı Türkçe bir çağrı merkezi görüşmesidir. Acar Hukuk Bürosu çalışanı (Asistan) bir borçluyu (Borçlu) aramakta ya da borçlu ofisi aramaktadır.

ÜÇ GÖREV:

GÖREV 1 — TAM TRANSKRİPSİYON:
Konuşmanın tamamını kelimesi kelimesine transkripte et. Her konuşmacı değişiminde yeni bir segment oluştur.

GÖREV 2 — KONUŞMACI AYIRIMI:
Her segment için speaker alanını belirle:
- "Asistan": Acar Hukuk Bürosu çalışanı (kendini tanıtan, icra/ödeme/dosya bilgisi veren taraf)
- "Borçlu": Karşı taraf

GÖREV 3 — BİLGİ ÇIKARIMI:
- agentName: Asistanın adı (bulunamazsa "")
- subjectInfo.name: Borçlunun adı soyadı (bulunamazsa "")
- subjectInfo.tcNo: TC kimlik no — 11 hane, 0 ile başlamaz (bulunamazsa "")
- subjectInfo.icraOffice: İcra müdürlüğü adı (bulunamazsa "")
- subjectInfo.fileNo: Dosya/esas numarası (bulunamazsa "")

KURAL: transcriptLines dizisi konuşma sırasına göre sıralı olmalı.`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/wav",
        data: audioBuffer.toString("base64"),
      },
    },
    { text: prompt },
  ]);

  const step2Tokens = countTokens(result.response.usageMetadata);

  const parsed = JSON.parse(result.response.text().trim()) as {
    transcriptLines: Array<{ speaker: string; text: string }>;
    agentName: string;
    subjectInfo: { name?: string; tcNo?: string; icraOffice?: string; fileNo?: string };
  };

  const transcriptLines: TranscriptLine[] = (parsed.transcriptLines ?? []).map((l) => ({
    speaker: l.speaker === "Asistan" ? "Asistan" : "Borçlu",
    text: l.text ?? "",
  }));

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
    step2Tokens,
  };
}

// ─────────────────────────────────────────────────────────────
// Birleşik: 2 adım (Gemini Audio), adım callback destekli
// ─────────────────────────────────────────────────────────────
export interface AnalysisResult extends TranscriptResult {
  compliance: ComplianceResult;
  step2Tokens?: number;
  step3Tokens?: number;
}

export async function analyzeCall(
  audioBuffer: Buffer,
  fileName: string,
  onStep?: StepCallback
): Promise<AnalysisResult> {
  // Adım 1: Gemini Audio → transkript + konuşmacı ataması + bilgi çıkarımı
  onStep?.(0, "running");
  const transcriptResult = await geminiTranscribeAndAssign(audioBuffer);
  onStep?.(0, "done", transcriptResult.agentName || `${transcriptResult.transcriptLines.length} segment`);

  const { transcript, estimatedDurationSeconds } = transcriptResult;

  // Adım 2: Kısa çağrı kontrolü + yönerge analizi
  const isShort =
    estimatedDurationSeconds < SHORT_CALL_SECONDS ||
    transcript.trim().split(/\s+/).length < SHORT_CALL_WORDS;

  let compliance: ComplianceResult;
  let step3Tokens: number | undefined;

  if (isShort) {
    onStep?.(1, "done", `Kısa (~${estimatedDurationSeconds}sn) — atlandı`);
    compliance = {
      score: 0,
      compliant: false,
      notEvaluable: true,
      summary: `Kısa görüşme (~${estimatedDurationSeconds}sn), yönerge uygunluğu analiz edilmedi.`,
      violations: [],
      warnings: [],
      positives: [],
      checkedAt: new Date(),
    };
  } else {
    onStep?.(1, "running");
    const complianceResult = await analyzeCompliance(transcript);
    compliance = complianceResult.result;
    step3Tokens = complianceResult.tokens;
    onStep?.(1, "done", `Skor: ${compliance.notEvaluable ? "—" : compliance.score}`);
  }

  return { ...transcriptResult, compliance, step3Tokens };
}
