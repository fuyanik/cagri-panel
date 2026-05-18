# ACAR HD - YONERGE MINI (AI UYUM OZETI)

Bu metin compliance modeli icin kisaltilmis karar setidir.
Yalnizca Asistan satirlari degerlendirilir; Borclu satirlari baglamdir.

## 1) Kimlik Dogrulama (Kritik)
- Ilk gorusmede TC/dogrulama alinmamissa kritik ihlal olabilir.
- Tekrar gorusme sinyali varsa ("daha once aradiniz", "donecektiniz", "gecen hafta konustuk") TC alinmamasi kritik degil; warning olabilir.
- Belirsizse warning yaz.

## 2) Gizlilik ve Yetki
- Yetkisiz 3. kisilere dosya detaylari verilmez.
- Sirket dosyalarinda sadece "yetkiliyle goruselim" bilgilendirmesi uygundur.

## 3) Odeme ve Surec Bilgilendirmesi (Uygun Davranis)
- Asistanin su bilgileri vermesi ihlal degildir:
  - odeme dosyaya yansimazsa islemlerin devam etmesi,
  - bloke/haciz surecinin genel aciklamasi,
  - fek masrafi, dosya kapama akisi, icra dairesi sureci,
  - ilgili birime yonlendirme / tekrar iletme / geri donus planlama.

## 4) 38a.3 Ofis Ici Sorun (Dar Kapsam, Kritik Degil)
- Ihlal: Ofiste gercek aksama/ihmal/karisiklik oldugunu mazeret gibi aktarmak
  ("kimse ilgilenmiyor", "sistem cokuk", "icerde karisiklik var").
- Ihlal degil: rutin koordinasyon
  ("arkadasim size donecek", "ilgili birime yonlendirdim", "tekrar iletecegim").
- Bu madde violations'a yazilsa bile critical=false.

## 5) Iletisim Uslubu (Tartisma vs Bilgilendirme)
- Bilgilendirme / duzeltme uygundur:
  - "Sistemde odeme gorunmuyor", "fek masrafi eksik olabilir" gibi notr ifadeler.
- Tartisma ihlalidir:
  - meydan okuma, azarlama, kisiyi suclama, alay,
  - "siz uzatiyorsunuz", "niye bize sitem ediyorsunuz", "sordunuz mu" gibi tekrarli suclayici dil,
  - gerilimi arttiran cevaplar ("gelince ne olacak?").
- Amaç hakli cikmak degil, cozume yonlendirmektir.

## 6) Empati ve Cozum
- Kisa empati + net adim:
  - "Anliyorum, su adimla cozebiliriz..."
- Uzun polemik, kisiyi hatali cikarma, sertlestirme ihlal puani dusurur.

## 7) Değerlendirilemez Durumlar (notEvaluable: true, score: 0)

Aşağıdaki durumlarda görüşme değerlendirilemez sayılır:
- Canlı asistan yoktur (yalnızca IVR / otomatik anons).
- **Yanlış numara:** Aranan kişi hatta değildir; hat sahibi aranan kişiyi tanımadığını belirtir
  ("Tanımıyorum", "Yanlış numara", "Bu numara onun değil", "Ben değilim" vb.).
  Sinyal: Asistan doğru kişiyi sorar, karşı taraf reddeder ve görüşme kısa biter, borç/dosya detayı konuşulmaz.
- Borçlu kimlik teyidi yapılamadan hat kesilir (erken sonlanma, konuşma hiç gerçekleşmez).

Bu durumlarda violations / warnings / positives boş bırakılır, summary kısaca sebebi açıklar.

## 8) Skorlama
- 90-100: Kritik kurallar korunmus, uslup uygun, net cozum var.
- 75-89: Genel uyumlu, kucuk eksikler var.
- 55-74: Birden fazla uslup/surec ihlali var.
- 30-54: Ciddi ihlaller var.
- 0-29: Kritik ihlal yogun.

## 9) Cikti Kurali
- violations.detail icinde Asistanin gercek ifadesinden alinti zorunlu.
- Alinti yoksa violations'a ekleme.
