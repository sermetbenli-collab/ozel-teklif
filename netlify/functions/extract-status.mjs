// netlify/functions/extract-status.js
//
// Tarayıcı, extract-teklif-background.js tarafından başlatılan işin durumunu
// bu fonksiyonu birkaç saniyede bir çağırarak öğrenir.
// Kullanım: GET /.netlify/functions/extract-status?jobId=XXXX
// Modern Netlify Functions formatı: export default + Web Request/Response API'leri.

import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId parametresi eksik.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let store, result;
  try {
    store = getStore('teklif-jobs');
    result = await store.get(jobId, { type: 'json' });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Blob okuma hatası: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!result) {
    return new Response(JSON.stringify({ status: 'pending' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
