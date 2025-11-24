const fetch = require('node-fetch');

// Función genérica para enviar los webhooks
async function sendWebhooks(eventName, data) {
  console.log(`[Event: ${eventName}] Preparing to send webhooks.`);
  const webhookUrls = [
    process.env.MAKE_WEBHOOK_URL,
    process.env.N8N_WEBHOOK_URL
  ].filter(Boolean); // Filtra para quitar las URLs que no estén definidas

  if (webhookUrls.length === 0) {
    console.log("[Webhook] No URLs configured. Skipping.");
    return;
  }

  // Usamos Promise.allSettled para que un webhook fallido no bloquee al otro
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
  console.log('--- identity-signup function invoked ---');
  
  if (!event.body) {
    console.log('No body, ignoring.');
    return { statusCode: 200 };
  }

  const { event: identityEvent, user } = JSON.parse(event.body);
  console.log(`Received '${identityEvent}' event for user ${user.email}.`);

  // Reaccionamos a 'signup' o 'login' para capturar a todos los nuevos usuarios
  if (identityEvent === 'signup' || identityEvent === 'login') {
    await sendWebhooks('user_signup', {
      netlify_id: user.id, // Enviamos el ID de Netlify, será nuestra "clave única"
      email: user.email,
      full_name: user.user_metadata.full_name,
      signup_date: new Date().toISOString()
    });
  }
  
  console.log('--- Function finished successfully! ---');
  return { statusCode: 200 };
};
