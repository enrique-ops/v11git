const fetch = require('node-fetch');

const WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL; // O N8N_WEBHOOK_URL

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST' ) {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!WEBHOOK_URL) {
    return { statusCode: 500, body: 'Webhook URL is not configured.' };
  }

  try {
    const { name, email, adsId } = JSON.parse(event.body);
    if (!name || !email || !adsId) {
      return { statusCode: 400, body: 'Missing required fields.' };
    }

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, adsId })
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error processing request.' }) };
  }
};
