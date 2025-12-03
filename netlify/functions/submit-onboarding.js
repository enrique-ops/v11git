// Importamos 'node-fetch' que ya está en tu package.json
const fetch = require('node-fetch');

// La URL de tu webhook (la pondremos en las variables de entorno)
const WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL; // O N8N_WEBHOOK_URL

exports.handler = async (event) => {
  // 1. Solo aceptamos peticiones POST
  if (event.httpMethod !== 'POST' ) {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 2. Extraemos los datos que nos envía el frontend
    const { name, email, adsId } = JSON.parse(event.body);

    // 3. Verificamos que tenemos los datos necesarios
    if (!name || !email || !adsId) {
      return { statusCode: 400, body: 'Missing required fields: name, email, or adsId' };
    }

    // 4. Enviamos los datos a tu webhook
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'onboarding_submitted',
        userName: name,
        userEmail: email,
        googleAdsId: adsId
      })
    });

    // 5. Devolvemos una respuesta de éxito
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data sent to webhook successfully.' })
    };

  } catch (error) {
    console.error('Error in submit-onboarding function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred.' })
    };
  }
};
