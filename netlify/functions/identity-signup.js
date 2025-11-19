const postgres = require('postgres');
const fetch = require('node-fetch');

// --- ¡ACTUALIZADO! ---
// Ahora se llama 'sendWebhooks' (en plural) y maneja múltiples URLs.
async function sendWebhooks(eventName, data) {
  const webhookUrls = [
    process.env.MAKE_WEBHOOK_URL,
    process.env.N8N_WEBHOOK_URL
  ].filter(Boolean); // Filtra para quitar las URLs que no estén definidas.

  if (webhookUrls.length === 0) {
    console.log("No webhook URLs configured. Skipping.");
    return;
  }

  console.log(`Sending webhooks for event: ${eventName} to ${webhookUrls.length} destination(s).`);

  // Usamos Promise.allSettled para intentar enviar a todas las URLs, incluso si alguna falla.
  const results = await Promise.allSettled(
    webhookUrls.map(url =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, ...data })
      })
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Webhook to URL #${index + 1} sent successfully.`);
    } else {
      console.error(`Error sending webhook to URL #${index + 1}:`, result.reason);
    }
  });
}

exports.handler = async (event, context) => {
  if (event.body) {
    const { event: identityEvent, user } = JSON.parse(event.body);

    if (identityEvent === 'signup') {
      console.log(`New user signup: ${user.email}.`);
      const connectionString = process.env.NETLIFY_DATABASE_URL;
      if (!connectionString) {
        console.error("FATAL: NETLIFY_DATABASE_URL is not set.");
        return { statusCode: 500 };
      }

      try {
        const sql = postgres(connectionString, { ssl: 'require' });
        await sql`
          INSERT INTO users (netlify_id, email, full_name)
          VALUES (${user.id}, ${user.email}, ${user.user_metadata.full_name})
          ON CONFLICT (netlify_id) DO NOTHING;
        `;
        await sql.end();
        console.log(`Successfully created user entry for ${user.email}.`);

        // --- ¡ACTUALIZADO! Llamamos a la nueva función 'sendWebhooks' ---
        await sendWebhooks('user_signup', {
          email: user.email,
          full_name: user.user_metadata.full_name,
          signup_date: new Date().toISOString()
        });

        return { statusCode: 200 };
      } catch (error) {
        console.error("Error in signup function:", error);
        return { statusCode: 500 };
      }
    }
  }
  return { statusCode: 200 };
};
