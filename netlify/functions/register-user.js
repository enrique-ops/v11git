// netlify/functions/register-user.js

const fetch = require('node-fetch');

async function sendWebhooks(eventName, data) {
  const webhookUrls = [process.env.MAKE_WEBHOOK_URL, process.env.N8N_WEBHOOK_URL].filter(Boolean);
  if (webhookUrls.length === 0) return;

  await Promise.allSettled(
    webhookUrls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, ...data })
      })
    )
  );
}

exports.handler = async (event, context) => {
  // El contexto del cliente SÍ es fiable. Si está aquí, el usuario está autenticado.
  if (!context.clientContext || !context.clientContext.user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }

  const user = context.clientContext.user;

  // Enviamos el webhook de 'user_signup' con los datos del usuario autenticado
  await sendWebhooks('user_signup', {
    netlify_id: user.sub,
    email: user.email,
    full_name: user.user_metadata.full_name,
    signup_date: new Date().toISOString()
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `User ${user.email} processed.` })
  };
};
