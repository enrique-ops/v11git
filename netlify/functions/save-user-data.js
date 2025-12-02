const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // ESTA PARTE ES LA CLAVE DE LA SEGURIDAD
  // El 'context.clientContext.user' solo existe si Netlify ha podido
  // verificar el token JWT que le hemos enviado en la cabecera.
  // Aunque el plugin no esté, Netlify sigue haciendo una validación básica.
  if (!context.clientContext || !context.clientContext.user) {
    console.error('Llamada no autorizada. No hay contexto de usuario.');
    return { 
      statusCode: 401, 
      body: JSON.stringify({ message: 'No autorizado. Debes estar logueado.' }) 
    };
  }

  // Si llegamos aquí, el usuario es válido.
  const user = context.clientContext.user;
  const { adsId } = JSON.parse(event.body);

  console.log(`ID de Ads recibido: ${adsId} para el usuario ${user.email}`);

  // Preparamos los datos para el webhook
  const webhookData = {
    event: 'id_submitted',
    auth0_id: user.sub, // El ID de Auth0
    email: user.email,
    google_ads_id: adsId,
    submission_date: new Date().toISOString()
  };

  // Enviamos los webhooks a Make/n8n
  const webhookUrls = [process.env.MAKE_WEBHOOK_URL, process.env.N8N_WEBHOOK_URL].filter(Boolean);
  await Promise.allSettled(
    webhookUrls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData)
      })
    )
  );

  console.log(`Webhooks de 'id_submitted' enviados para ${user.email}.`);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'ID recibido correctamente!' })
  };
};
