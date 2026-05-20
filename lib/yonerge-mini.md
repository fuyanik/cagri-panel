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

## 3a) Odeme Yontemi (Uygun Davranislar — ihlal sayilmaz)
- Avrasya dosyalarinda kurum sitesinden odeme, IBAN ile haricen odeme veya icra dairesine odeme
  hepsi dogru yonlendirmedir. Site linki veya IBAN paylasilmasi uygundur.
- Otoyol AŞ / ÇOK AŞ dosyalarinda gecis sorgulama sayfasi uzerinden odeme yonlendirmesi uygundur.
- Mobil bankacilikla EFT, icra dairesi IBAN'i (Vakifbank) uygun yontemdir.
- Adliyeye gitmeye gerek olmadigini soylemek dogru bilgilendirmedir.

## 3b) Kritik Eksiklikler — Asistan Bunlari Yapmamissa Ihlal
- **Indirim talebinde ISrar varsa**: Borclu cok israr eder, yuksek borcunu ve odeme yapmayacagini
  belirtirse, asistan "indirim yok" deyip kapatmamali; "yetkililmle gorusup size donus yapacagim"
  diyebilir. Bu kalip kullanilmadan dogrudan ret → ihlal.
- **IBAN talep eden borcluja sadece link israri**: Borclu acan IBAN isteyince asistan yalnizca link
  gondermekte israr edip IBAN vermiyorsa (Avrasya dosyasi icin IBAN verilmesi uygundur) → ihlal.
- **"Ödemezsem ne olur?" sorusuna yetersiz yanit**: Asistan sadece "islem yapilir" veya "banka blokesi
  olur" deyip gecerse ihlal. Dogru: haciz (banka, araci, maas), kredi notu dususu, isveren sorumlulugu
  gibi sonuclari sade ve korkutucu olmayan uslupla aciklamak gerekir.
- **Sure talebine cevap eksikligi**: Borclu odeme suresi istediginde, asistan sureyin sonuclarini
  (indirimli sure, haciz, masraf artisi) en azindan kisaca aciklamali; sadece "islem yapilir" yetmez.
- **Taksit talebine direkt ret**: Borclu taksit istediginde asistan "yapamiyoruz" demeden once
  "yoneticime danisip donus yapacagim" secenegini sunabilir (onceli varsa kabul, yoksa ret).
- **Bakiye neden yuksek sorusuna yanit**: Asistan masraf, faiz, harci kisaca aciklamali; "bu kadar"
  deyip gecmemeli.

## 4) 38a.3 Ofis Ici Sorun (Dar Kapsam, Kritik Degil)
- Ihlal: Ofiste gercek aksama/ihmal/karisiklik oldugunu mazeret gibi aktarmak
  ("kimse ilgilenmiyor", "sistem cokuk", "icerde karisiklik var").
- Ihlal degil: rutin koordinasyon
  ("arkadasim size donecek", "ilgili birime yonlendirdim", "tekrar iletecegim").
- Bu madde violations'a yazilsa bile critical=false.

## 5) Iletisim Uslubu (Tartisma vs Bilgilendirme)

Bu kurali degerlendirirken su baglamı dusun:
Bu bir icra/tahsilat cagri merkezi. Asistan profesyonel bir hukuk burosu calisani,
borclu ise genellikle borcu olan, bazen sinirli, bazen hastalikli, bazen magdur bir vatandas.
Asistanin gorevi: bilgi vermek, sureci aciklamak, odeme almak, cozum sunmak.

### Tartisma → Ihlal:
Asistan borcluyla "kim hakli" mucadelesi yurutuyorsa bu ihlaldir.
Kendini degerlendir: Asistanin amaci cozum mu yoksa hakli cikmak mi?
- Amac hakli cikmak, borcluyu koseye sikistirmak, ispat etmek → IHLAL
- Savunmaci veya suclayici bir dongu olusmus, ayni noktayi tekrarla vurguluyorsa → IHLAL
- Borcluyu alaya almak, azarlamak, kisisel saldiri → IHLAL
- Borcluyu provoke eden, gerilimi artiran ifadeler → IHLAL

### Bilgilendirme → Ihlal DEGILDIR:
Asistan borcluya sureci, durumu veya hatalarini notr bir sekilde acikliyorsa bu ihlal degildir.
Kendini degerlendir: Asistan olgusal mi konusuyor yoksa duygusal mi?
- Notr olgusal aciklama (surec, eksik odeme, masraf bilgisi vb.) → UYGUN
- Onceki gorusmeye referans, baglam hatirlatma → tek basina ihlal degil
- Borclunun yanlis bilgisini kibar sekilde duzeltme → UYGUN
- Aksiyon yonlendirmesi (ne yapmasi gerektigini soylemek) → UYGUN

### Degerlendirme Ilkesi:
Belirli kelimelere degil AMAC ve PATTERN'e bak.
Ayni cumle farkli baglamda uygun veya ihlal olabilir.
Tek bir cumle degil gorusmenin genel akisi onemlidir:
- Asistan bir kez sert/kuru cevap verip sonra cozume geciyorsa → uyari yeterli
- Asistan ayni savunmaci/suclayici tonu gorusme boyunca surdurup tekrarliyorsa → ihlal

## 6) Hata ve Cozum Odaklilik
- Hata/aksama olduysa asistan mazeret uretmek yerine cozum sunmali.
- **Empati: Kisa kabul yeterlidir.** Uzun empati zorunlu DEGILDIR.
  Empati eksikligi tek basina ihlal DEGILDIR.
- Borclu zor durumunu belirtirse (hastalik, vefat vb.) kisa kabul + konuya gecis uygun.
- Onceki gorusmeye referans vermek empati eksikligi sayilmaz;
  ancak suclayici pattern icinde tekrarlaniyorsa Kural 5 devreye girer.

## 6a) Kimlik Dogrulama Alternatifi
- Borclu TC vermek istemiyorsa asistan alternatif sunmali:
  TC'nin ilk iki hanesini kendisi soyleyip borclunun devamini soyleme secenegi,
  anne/baba adi ile dogrulama, veya e-Devlet'ten dosyasina bakip geri arama.
  Hicbir alternatif sunulmadan gorusme sonlandirilirsa eksiklik sayilabilir.

## 6b) Sirket Dosyalari
- Yetkisiz ucuncu kisiye borcun varligi disinda dosya detayi (tutar, belge vb.) paylasimi → ihlal.
- Dogru: "Yetkili kisiyle gorusmemiz gerekiyor, iletisim bilgisini alabilir miyim?" — bu ihlal degildir.

## 6c) Haciz Genel Uyarilari (38 Genel Notlar)
- Asistan borclunun odeme yapmadigini gosteriyor ve devam edecekse su bilgileri vermesi beklenir:
  banka hesabi blokesi, kredi notu dususu, araca haciz, maas haczi, isveren sorumlulugu.
  Bunlardan hic bahsedilmemesi eksiklik sayilabilir (critical degil); ama "islem yapilir" gibi cok kisa
  gecmek warnings'e yazilabilir.

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
