const fetch = require('node-fetch');

// La misma función genérica para enviar los webhooks
async function sendWebhooks(eventName, data) {
  console.log(`[Event: ${eventName}] Preparing to send webhooks.`);
  const webhookUrls = [
    process.env.MAKE_WEBHOOK_URL,
    process.env.N8N_WEBHOOK_URL
  ].filter(Boolean);

  if (webhookUrls.length === 0) {
    console.log("[Webhook] No URLs configured. Skipping.");
    return;
  }

  await Promise.allSettled(
    webhookUrls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, ...data })
      })
    )
  );
  console.log(`[Event: ${eventName}] Webhooks sent.`);
}

// El handler principal
exports.handler = async (event, context) => {
  console.log('--- save-user-data function invoked ---');

  if (!context.clientContext || !context.clientContext.user) {
    console.error('No user context. Unauthorized.');
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }
  
  const user = context.clientContext.user;
  const { adsId } = JSON.parse(event.body);

  if (!adsId) {
    console.error('Google Ads ID is missing from body.');
    return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
  }

  // Llamamos a la función de webhooks con los datos del formulario
  await sendWebhooks('id_submitted', {
    netlify_id: user.sub, // El ID de Netlify del usuario que envía el formulario
    email: user.email,
    full_name: user.user_metadata.full_name,
    google_ads_id: adsId,
    submission_date: new Date().toISOString()
  });

  console.log('--- Function finished successfully! ---');
  return { statusCode: 200, body: JSON.stringify({ message: 'Data sent to automation!' }) };
};
