# Özel Teklif PDF Sistemi — Sermet Benli Sigorta Acenteliği

Sigorta şirketlerinin (AXA, Zurich, Alfa, Capital) fiyat çalışması PDF'lerini,
Sermet Benli Sigorta Acenteliği kimliğiyle markalı, sigortalının kolayca anlayacağı
2 sayfalık bir teklif PDF'ine dönüştüren araç.

## Nasıl çalışır?

1. `index.html` açılır (Netlify üzerinden yayınlanan adres).
2. Sigorta şirketinin PDF'i yüklenir → "Yapay Zekayla Doldur" butonuna basılır.
3. `netlify/functions/extract-teklif.js` fonksiyonu, PDF'i Claude API'ye gönderip
   yapılandırılmış veri (JSON) olarak geri döndürür.
4. Çıkan veri gözden geçirilir / düzeltilir.
5. "PDF Oluştur ve İndir" ile markalı teklif PDF'i indirilir.

## Kurulum (Netlify)

1. Bu repo Netlify'da bir siteye bağlanır ("Import from Git").
2. Site ayarlarında **Environment variables** kısmına `ANTHROPIC_API_KEY` eklenir
   (console.anthropic.com üzerinden alınan API anahtarı).
3. Deploy edilir. `index.html` otomatik olarak ana sayfa olur,
   `netlify/functions/extract-teklif.js` otomatik olarak
   `/.netlify/functions/extract-teklif` adresinde çalışır.

## Dosya yapısı

```
index.html                          → Ana uygulama (PDF motoru + yükleme arayüzü)
netlify/functions/extract-teklif.js → Yapay zeka veri çıkarım fonksiyonu
netlify.toml                        → Netlify Functions yapılandırması
```

## Motoru genişletmek

- Yeni sigorta şirketi logosu eklemek için `index.html` içindeki
  `INSURER_LOGOS` nesnesine base64 logo eklenir.
- PDF şablonu tamamen veri odaklıdır (JSON şeması) — yeni ürün tipleri
  (Kasko, İşyeri, DASK vb.) için kod değişikliği gerekmez, sadece
  yapay zekanın çıkardığı veri farklı olur.
