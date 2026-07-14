// netlify/functions/extract-teklif.js
//
// Bu fonksiyon, sigorta şirketinin fiyat çalışması PDF'ini alır, Claude API'ye gönderir
// ve teklif-pdf-motoru.html'in beklediği JSON şemasına göre yapılandırılmış veri döndürür.
//
// KURULUM:
// 1. Bu dosyayı GitHub reponuzda /netlify/functions/extract-teklif.js yoluna ekleyin.
// 2. Netlify Dashboard > Site configuration > Environment variables kısmına
//    ANTHROPIC_API_KEY adında bir değişken ekleyin (değeri: console.anthropic.com'dan
//    aldığınız API anahtarı).
// 3. Deploy edin. Fonksiyon otomatik olarak /.netlify/functions/extract-teklif
//    adresinde erişilebilir olacaktır.

const SYSTEM_PROMPT = `Sen bir sigorta operasyon asistanısın. Sana bir sigorta şirketinin (AXA, Zurich, Alfa, Capital vb.)
düzenlediği "fiyat çalışması" / teklif PDF'i verilecek. Bu PDF'teki bilgileri aşağıdaki KESİN JSON şemasına göre çıkar.

KURALLAR:
- SADECE JSON döndür. Başka hiçbir metin, açıklama, yorum veya markdown kod bloğu (\`\`\`) ekleme.
- PDF'te olmayan bir bilgi için o alanı mantıklı şekilde boş bırak ya da tüm bölümü çıkar (örn. teminat kalemi yoksa "coverages": []).
- Para tutarlarını PDF'teki gibi Türkçe biçimde yaz (örn. "6.900,00 TL", "1.200.000 TL").
- Tarihleri GG/AA/YYYY biçiminde yaz.
- "coverages" dizisine PDF'teki HER teminat kalemini ayrı ayrı ekle (sayısı 1 ile 8 arasında değişebilir).
- "exclusions" dizisine PDF'te veya ekli genel şartlarda geçen HER istisna/kapsam dışı hali ayrı ayrı ekle;
  hukuki/madde numaralı dili sigortalının kolayca anlayacağı sade Türkçe cümlelere çevirerek yaz.
- "primaryCard": motorlu araç poliçelerinde araç bilgilerini (marka/tip, model yılı, plaka), sağlık poliçelerinde
  sigortalı bilgilerini, diğer ürünlerde en uygun özet bilgiyi içermeli. İsim/kimlik gibi hassas bilgiler PDF'te
  zaten maskelenmişse (örn. "E***N T***N") maskeli haliyle bırak; ASLA tahmin ederek tamamlama veya maskeyi açma.
  "fields" dizisinde EN FAZLA 6 alan olsun; PDF'te daha fazla alan varsa sigortalı için en önemli olanları seç
  (örn. araç için marka/model, model yılı, plaka her zaman öncelikli; motor gücü, koltuk sayısı gibi ikincil
  bilgiler yalnızca yer varsa eklenir).
- "icon" alanı için sadece "car", "calendar" veya null kullan.
- "insurerKey" alanına şirketi şu listeden en uygun olanla eşleştir: "axa", "zurich", "alfa", "capital", "diger".
  Emin değilsen "diger" yaz.
- "disclaimer": PDF'in resmi poliçe/genel şartlar yerine geçmediğini belirten, çalışma numarasını içeren tek cümlelik Türkçe metin.

JSON ŞEMASI (alan adlarını birebir koru):
{
  "meta": {
    "calismaNo": string,
    "policyTitle": string,
    "greeting": [string, string, string]
  },
  "primaryCard": {
    "title": string,
    "icon": "car" | null,
    "fields": [{"label": string, "value": string}]
  },
  "secondaryCards": [
    {"type": "info", "title": "POLİÇE SÜRESİ", "icon": "calendar",
     "rows": [{"label": string, "value": string}]},
    {"type": "insurer", "title": "SİGORTA ŞİRKETİ", "logoKey": string,
     "insurerName": string, "lines": [string]}
  ],
  "coverageIntro": {"title": string, "desc": string},
  "coverages": [
    {"eyebrow": string, "title": string, "amount": string, "desc": string, "iconLabel": "TL" | null}
  ],
  "exclusionsIntro": {"title": string, "desc": string},
  "exclusions": [string],
  "premium": {
    "rows": [{"label": string, "value": string}],
    "total": string,
    "paymentPlan": string,
    "paymentDate": string
  },
  "disclaimer": string
}

NOT: "agency" alanını ekleme, o taraf zaten sabit olarak biliniyor.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Sadece POST istekleri kabul edilir.' }) };
  }

  let pdfBase64, fileName;
  try {
    const body = JSON.parse(event.body || '{}');
    pdfBase64 = body.pdfBase64;
    fileName = body.fileName || 'teklif.pdf';
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'İstek gövdesi geçersiz JSON.' }) };
  }

  if (!pdfBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'pdfBase64 alanı eksik.' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu yapılandırma hatası: ANTHROPIC_API_KEY tanımlı değil. Netlify > Environment variables kısmından ekleyin.' }) };
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
              { type: 'text', text: `Dosya adı: ${fileName}\n\nBu fiyat çalışması PDF'inden verileri sistem talimatındaki JSON şemasına göre çıkar. Sadece JSON döndür.` }
            ]
          }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Anthropic API hatası (' + anthropicRes.status + '): ' + errText }) };
    }

    const result = await anthropicRes.json();
    const textBlock = (result.content || []).find(b => b.type === 'text');
    if (!textBlock) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Yapay zeka yanıtında metin bulunamadı.', raw: result }) };
    }

    let cleaned = textBlock.text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Yapay zeka çıktısı JSON olarak ayrıştırılamadı: ' + e.message, raw: cleaned }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: extracted })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Beklenmeyen hata: ' + err.message }) };
  }
};
