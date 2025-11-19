const postgres = require('postgres');
const fetch = require('node-fetch');

// --- ¡ACTUALIZADO! ---
// La misma función robusta para enviar a múltiples destinos.
async function sendWebhooks(eventName, data) {
  const webhookUrls = [
    process.env.MAKE_WEBHOOK_URL,
    process.env.N8N_WEBHOOK_URL
  ].filter(Boolean);

  if (webhookUrls.length === 0) {
    console.log("No webhook URLs configured. Skipping.");
    return;
  }

  console.log(`Sending webhooks for event: ${eventName} to ${webhookUrls.length} destination(s).`);

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
  if (!context.clientContext || !context.clientContext.user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }
  const user = context.clientContext.user;
  const { adsId } = JSON.parse(event.body);

  if (!adsId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
  }

  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error.' }) };
  }

  try {
    const sql = postgres(connectionString, { ssl: 'require' });
    await sql`
      UPDATE users
      SET google_ads_id = ${adsId}, connection_status = 'pending_approval', updated_at = NOW()
      WHERE netlify_id = ${user.sub};
    `;
    await sql.end();

    // --- ¡ACTUALIZADO! Llamamos a la nueva función 'sendWebhooks' ---
    await sendWebhooks('id_submitted', {
      email: user.email,
      full_name: user.user_metadata.full_name,
      google_ads_id: adsId,
      submission_date: new Date().toISOString()
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'User updated successfully!' }) };
  } catch (error) {
    console.error("Error updating user data:", error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};
