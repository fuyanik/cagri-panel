import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ComplianceResult } from "./types";

const YONERGE = `
ACAR HUKUK VE DANIŞMANLIK OFİSİ - ÇAĞRI MERKEZİ YÖNERGESİ v1.1 (Özet)

TEMEL KURALLAR:
1. Asistan kibarca, tehditkâr olmayan bir üslup kullanmalı.
2. Borçluya ödeme yapmaması halinde olası sonuçları (haciz, kredi notu düşüşü, araç yakalama) sade ve gerçekçi şekilde anlatmalı; korkutucu veya abartılı ifade kullanmamalı.
3. Ödeme seçenekleri sunulmalı: icra dairesine EFT/havale, kredi kartı (link gönderimi), kurum IBAN (yalnızca devirli/düşük bakiyeli dosyalar).
4. İndirim: Tebligat tarihinden itibaren 7 gün içindeyse indirimli ödeme seçeneği sunulabilir; dışındaysa indirim uygulanamaz.
5. Kimlik doğrulama: Borçlunun TC kimlik numarası veya anne/baba adıyla doğrulama yapılmalı.
6. Taksit: Yeni dosyalarda taksit yapılmaz. Birden fazla/yüksek bakiyeli dosyalarda yönetici onayıyla yapılabilir.
7. Evrak talepleri: Dekont, noter satış belgesi, plaka kaydı gibi belgeler WhatsApp üzerinden talep edilmeli.
8. Borçlu itiraz ederse: İlgili sorular için hazır yanıtlar kullanılmalı (HGS sorunu, araç satışı, plaka kopyalama vb.).
9. Üçüncü taraf aramaları: Araç kullanıcısı farklıysa araç sahibi onayı alınmadan bilgi verilmemeli.
10. Borçlu ödeme yapacaksa: UYAP değil güncel sistem bakiyesi paylaşılmalı; UYAP'ın güncel olmayabileceği belirtilmeli.
11. Korkutucu/tehditkâr dil kesinlikle yasak.
12. Konuşma sonunda net bir sonuç (ödeme vaadi, evrak talebi, bilgilendirme tamamlandı) elde edilmeli.
13. Devir dosyalarda ödeme kuruma yapılır, UYAP üzerinden değil; borçluya açıklanmalı.
14. Serbest meslek makbuzu veya fatura düzenlenemez; bu bilgi doğru verilmeli.
15. Haciz bilgisi doğru verilmeli: tebligattan 7 gün sonra haciz başlar.

UYGUN OLMAYAN DAVRANIŞ ÖRNEKLERİ:
- Yanlış bakiye veya tarih bilgisi vermek
- Borçluyu tehdit etmek ("seni mahvederiz", "iş yerini kapatırız" vb.)
- Kimlik doğrulaması yapmadan bilgi paylaşmak
- İndirimli süre dışındaki borçluya indirim vadinde bulunmak
- Araç sahibi onayı olmadan üçüncü tarafa bilgi vermek
- Evrak gerektiren durumda evrak talep etmemek
`;

export async function analyzeCompliance(transcript: string): Promise<ComplianceResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          score: { type: SchemaType.NUMBER },
          compliant: { type: SchemaType.BOOLEAN },
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
          positives: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["score", "compliant", "summary", "violations", "positives"],
      },
    },
  });

  const prompt = `Aşağıdaki çağrı merkezi görüşme transkriptini, verilen yönergeye göre değerlendir.

ÖNEMLİ UYARI: Değerlendirmeni YALNIZCA ASİSTAN'IN söylediklerine dayandır.
Borçlunun söyledikleri bağlam için okunur; ihlal veya pozitif olarak asistana yüklenmez.

YÖNERGEYİ DİKKATLİCE OKU:
${YONERGE}

TRANSKRİPT:
${transcript}

DEĞERLENDİRME KURALLARI:
- score: 0-100 arası puan (100 = yönergeye tam uyumlu)
- compliant: score >= 70 ise true
- summary: Türkçe, 2-4 cümle özet. Asistan ne yaptı, nerede uydu/uymadı.
- violations: Her ihlal için rule (kural adı), detail (ne yapıldı/yapılmadı), critical (ciddi ihlal mi)
- positives: Asistanın doğru yaptığı şeyler (liste)

KESİN KURAL — ASLA İHLAL ETME:
Transkriptte her satır "Asistan:" veya "Borçlu:" etiketi ile başlıyor.
- "Asistan:" ile başlayan satırlar = çağrı merkezi çalışanının söyledikleri → BUNLARI DEĞERLENDİR
- "Borçlu:" ile başlayan satırlar = müşterinin söyledikleri → BUNLARI ASLA DEĞERLENDİRME

Borçlunun söylediği hiçbir şey asistanın ihlaline sayılamaz. İhlal ve pozitif listelerinde SADECE asistanın yaptıklarına odaklan. Borçlunun söyledikleri yalnızca bağlam bilgisi olarak kullan.

Analiz yaparken şu soruyu sor: "Bu davranışı/sözü 'Asistan:' etiketli satırda mı gördüm?" — Cevap hayırsa, o davranışı değerlendirme.

Eğer konuşma çok kısa veya saf bilgilendirme ise yüksek skor ver.
Asistanın kimlik doğrulama yapıp yapmadığını, doğru bilgi verip vermediğini, uygun üslup kullanıp kullanmadığını değerlendir.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const parsed = JSON.parse(responseText) as ComplianceResult;

  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    compliant: parsed.compliant,
    summary: parsed.summary,
    violations: parsed.violations ?? [],
    positives: parsed.positives ?? [],
    checkedAt: new Date(),
  };
}
