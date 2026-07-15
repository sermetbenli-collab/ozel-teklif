// netlify/functions/extract-status.js
//
// Tarayıcı, extract-teklif-background.js tarafından başlatılan işin durumunu
// bu fonksiyonu birkaç saniyede bir çağırarak öğrenir.
// Kullanım: GET /.netlify/functions/extract-status?jobId=XXXX

exports.handler = async (event) => {
  const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'jobId parametresi eksik.' }) };
  }

  let getStore;
  try {
    ({ getStore } = require('@netlify/blobs'));
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: '@netlify/blobs modülü yüklenemedi: ' + e.message }) };
  }

  let store, result;
  try {
    store = getStore('teklif-jobs');
    result = await store.get(jobId, { type: 'json' });
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Blob okuma hatası: ' + e.message }) };
  }

  if (!result) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
};
