// netlify/functions/extract-status.js
//
// Tarayıcı, extract-teklif-background.js tarafından başlatılan işin durumunu
// bu fonksiyonu birkaç saniyede bir çağırarak öğrenir.
// Kullanım: GET /.netlify/functions/extract-status?jobId=XXXX

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'jobId parametresi eksik.' }) };
  }

  const store = getStore('teklif-jobs');
  const result = await store.get(jobId, { type: 'json' });

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
