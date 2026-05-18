import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { readFileSync } from "fs";
import { join } from "path";
import type { ComplianceResult } from "./types";

// Tam yönergeyi dosyadan oku — proje dizini relative
function loadYonerge(): string {
  try {
    const yonergePath = join(process.cwd(), "lib", "yonerge.md");
    return readFileSync(yonergePath, "utf-8");
  } catch {
    // Fallback: yönerge dosyası bulunamazsa boş string
    console.error("[Compliance] yonerge.md okunamadı");
    return "";
  }
}

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

  const yonerge = loadYonerge();

  const prompt = `Aşağıdaki çağrı merkezi görüşme transkriptini verilen yönergeye göre değerlendir.

═══════════════════════════════════════
BAĞLAM — ÖNCE OKU
═══════════════════════════════════════
Bu yönerge Acar Hukuk ve Danışmanlık Ofisi'nin icra takip birimi çağrı merkezi içindir.
Çağrılar genellikle otoyol geçiş ihlali (Avrasya Tüneli, Otoyol AŞ, ÇOK AŞ) kaynaklı icra dosyaları hakkındadır.
Asistan borçluyu arar ya da borçlu arar. Amaç: bilgilendirme, ödeme yönlendirme ve evrak talebi.

TEMEL KURALLAR (hızlı referans):
1. Üslup: Kibarca, tehditkâr olmayan dil. Haciz/yakalama gibi sonuçlar sade anlatılır, korkutucu ifade yasak.
2. Kimlik doğrulama: TC veya anne/baba adıyla doğrulama yapılmalı. ANCAK daha önce iletişim kurulduysa istenmeyebilir (detay aşağıda).
3. Ödeme seçenekleri: İcra dairesine EFT/havale; kredi kartı (link); kurum IBAN yalnızca devirli/düşük bakiyeli dosyalarda.
4. İndirim: Tebligattan itibaren 7 gün içindeyse uygulanabilir; dışındaysa uygulanamaz.
5. Taksit: Yeni dosyalarda yapılmaz; yönetici onayıyla eski/yüksek bakiyeli dosyalarda yapılabilir.
6. UYAP bakiyesi: Güncel olmayabilir; sistem bakiyesi paylaşılmalı ve bu fark açıklanmalı.
7. Evrak gerektiren itirazlar: Dekont, noter satışı, plaka kaydı vb. WhatsApp üzerinden talep edilmeli.
8. Üçüncü taraf: Araç sahibi onayı olmadan bilgi paylaşılamaz.
9. Devir dosyalar: Ödeme kuruma yapılır; UYAP üzerinden değil.
10. Serbest meslek makbuzu/fatura: Düzenlenemez; bu bilgi doğru verilmeli.
11. Haciz süresi: Tebligattan 7 gün sonra başlar.
12. Konuşma sonu: Net sonuç alınmalı (ödeme vaadi, evrak talebi veya bilgilendirme tamamlandı).

KRİTİK İHLAL TANIMI:
Aşağıdakiler KRİTİK sayılır (critical: true):
- Müşteriye yanlış hukuki bilgi vermek (yanlış süre, yanlış tutar, yanlış prosedür)
- Açıkça tehdit edici veya küçümseyici dil kullanmak ("seni mahvederiz", "işini kaybedersin" gibi)
- Kimlik doğrulaması yapmadan borç detayı paylaşmak
- Araç sahibi onayı olmadan üçüncü tarafa bilgi vermek
- İndirimli süre dışında indirim vaadinde bulunmak
- Taksit mümkün değilken kesin taksit sözü vermek

KİMLİK DOĞRULAMA KURALI — DETAYLI:
Bu kural en önemli kuraldır ve şu şekilde değerlendirilir:

DURUM A — İLK GÖRÜŞME (TC istenmesi ZORUNLU):
Transkriptte şu belirtiler varsa ilk görüşmedir:
- Asistan borçluya kendini tanıtıyor ve dosya bilgisini ilk kez aktarıyor
- Borçlu "ben kimim, hangi dosya" tarzı sorular soruyor
- Hiçbir "geçen gün görüştük", "biliyorsunuz", "size daha önce söylemiştim" gibi ifade yok
- Durum: TC kimlik NO istenmemişse KRİTİK ihlal (critical: true, violations listesine ekle)

DURUM B — TEKRAR GÖRÜŞME (TC isteğe bağlı, sarı uyarı):
Transkriptte şu belirtilerden biri varsa daha önce iletişim kurulmuştur:
- "daha önceden görüşmüştük", "geçen gün / salı günü / geçen hafta konuşmuştuk"
- "Arzu Hanım'la / Gamze Hanım'la / Derya Hanım'la görüşmüştüm"
- "biliyorsunuz, daha öncelerde / bir önceki görüşmemizde söylemiştik"
- "beni aktarıyordu / ona aktarıyorum"
- Borçlu asistanı ismiyle tanıyor ya da ofis çalışanını ismiyle soruyor
- "ikinci/üçüncü aramamda / yeniden arıyorum" gibi ifadeler
- Asistan "sizi biliyoruz / daha önce iletişime geçmiştik" diyor
→ Bu durumda TC istenmemesi kabul edilebilir. Ancak warnings listesine şunu ekle:
  "Daha önceden iletişim kurulduğu anlaşıldığından kimlik doğrulama atlanmış olabilir. İlk görüşmeyse TC alınması gerekir."

DURUM C — BELİRSİZ:
İlk mi tekrar mı olduğu anlaşılamıyorsa warnings listesine ekle:
  "Kimlik doğrulamanın yapılıp yapılmadığı net değil. İlk görüşmeyse TC alınması gerekir."

KRİTİK İHLAL SAYILMAZ — DİKKAT:
Aşağıdakiler ihlal veya tehdit DEĞİLDİR:
1. Yönergede belirtilen olası sonuçları aktarmak: "Araç yakalama masrafı ortalama 30.000-40.000 TL civarındadır", "Haciz durumunda kredi notunuz düşer", "Maaş haczinde işvereniniz sorumlu olur" gibi ifadeler yönergenin 13, 15 ve 36. maddelerinde açıkça belirtilmiştir. Bunlar bilgilendirme amaçlı söylenmiş gerçek bilgilerdir; sert veya küçümseyici bir bağlamda kullanılmadıkça ihlal sayılmaz.
2. Dosya sorumlusuna yönlendirme: Asistanın "Bu dosyanın sorumlusu Derya hanım / Zeynep hanım, kendisine aktarıyorum" demesi veya ilgili avukata yönlendirmesi yönergenin 37. ve 39. maddelerinin gereğidir. Bu davranış olumlu (pozitif) sayılmalıdır, ihlal değil.

PUANLAMA REHBERİ:
- 90-100: Tüm kritik kurallar uygulandı, iletişim mükemmel, net sonuç alındı
- 75-89: Küçük ihmal veya eksik bilgi var ama genel uyumlu
- 55-74: Birden fazla kural ihlali veya önemli bir bilgi eksik
- 30-54: Ciddi ihlal var veya yanlış bilgi verildi
- 0-29: Kritik ihlal (tehdit, kimlik paylaşımı, yanlış hukuki bilgi vb.)

DEĞERLENDİRİLEMEZ ÇAĞRI:
Aşağıdaki durumlarda notEvaluable: true, score: 0, compliant: false döndür ve violations/positives listelerini boş bırak:
- Canlı bir asistan hiç devreye girmemiş; tüm konuşma otomatik IVR/anons sistemiyle geçmiş
- Borçlu hatta bekletilmiş, asistana bağlanamamış ve çağrıyı kapatmış
- Transkriptte "Asistan:" etiketli anlamlı bir konuşma satırı yok (sadece otomatik mesajlar var)
summary alanına bu durumu kısaca açıkla ("Canlı asistan devreye girmedi, değerlendirme yapılamadı" gibi).

KISA ÇAĞRI NOTU:
Çok kısa çağrılarda (30-60 saniye) ya da borçlunun konuşmadan kapattığı durumlarda,
asistan kendini tanıtıp bilgilendirme yapmaya çalışmışsa yüksek skor ver (85+).

═══════════════════════════════════════
TAM YÖNERGE (42 madde — tüm senaryolar)
═══════════════════════════════════════
${yonerge}

═══════════════════════════════════════
TRANSKRİPT
═══════════════════════════════════════
${transcript}

═══════════════════════════════════════
DEĞERLENDİRME TALİMATLARI
═══════════════════════════════════════
- score: 0-100 arası puan
- compliant: score >= 70 ise true
- summary: Türkçe, 2-4 cümle. Asistan ne yaptı, nerede uydu/uymadı.
- violations: Kural adı + detay + critical flag
- warnings: Sarı uyarılar — ihlal değil ama dikkat gerektiren durumlar (string listesi)
- positives: Asistanın doğru yaptıkları

ALINTI ZORUNLULUĞU — KESİN KURAL:
violations ve warnings listelerine bir madde eklemeden önce şu soruyu sor:
"Bu iddiayı destekleyen, 'Asistan:' ile başlayan bir satır var mı transkriptte?"
Eğer transkriptten birebir alıntı yapamıyorsan o ihlalin var olmadığını kabul et ve listeye ekleme.
Transkriptte geçmeyen isimler, sözler veya olaylar UYDURMAK yasaktır.

violations.detail YAZIM FORMATI:
Sadece alıntı yazmak yetmez. Şu formatı kullan:
1. Önce kısa yorumunu yaz (neden ihlal, ilk/tekrar görüşme tespiti, bağlam)
2. Sonra "Asistan:" satırından destekleyici alıntıyı tırnak içinde ver

Örnek doğru format:
"İlk görüşme olduğu anlaşılmaktadır; asistan kimlik doğrulama yapmadan dosya detaylarını paylaşmıştır. Asistanın ifadesi: 'Serpil Hanım, adınıza kayıtlı 06 BN 87 02 plakalı araçla Avrasya Tüneli ihlali nedeniyle hakkınızda icra takibi açıldı.'"

Örnek yanlış format (sadece alıntı, yorum yok):
"'Serpil Hanım, şimdi adınıza kayıtlı bir araç plakası var...'"

KESİN KURAL:
Transkriptte her satır "Asistan:" veya "Borçlu:" ile başlıyor.
- "Asistan:" = çağrı merkezi çalışanı → DEĞERLENDİR
- "Borçlu:" = müşteri → BAĞLAM OLARAK KULLAN, asistana yükleme

"Bu davranışı Asistan: satırında gördüm mü?" — Hayırsa değerlendirme.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const parsed = JSON.parse(responseText) as ComplianceResult;

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
