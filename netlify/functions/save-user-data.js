const postgres = require('postgres');
const fetch = require('node-fetch');

// La función de los webhooks no cambia, la dejamos como estaba.
async function sendWebhooks(eventName, data) {
  console.log('[Webhook] Preparing to send webhooks.');
  const webhookUrls = [
    process.env.MAKE_WEBHOOK_URL,
    process.env.N8N_WEBHOOK_URL
  ].filter(Boolean);

  if (webhookUrls.length === 0) {
    console.log("[Webhook] No URLs configured. Skipping.");
    return;
  }
  console.log(`[Webhook] Found ${webhookUrls.length} URL(s).`);
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
      console.log(`[Webhook] URL #${index + 1} sent successfully.`);
    } else {
      console.error(`[Webhook] Error sending to URL #${index + 1}:`, result.reason);
    }
  });
}

exports.handler = async (event, context) => {
  console.log('--- save-user-data function invoked ---');

  if (!context.clientContext || !context.clientContext.user) {
    console.error('FATAL: No user context. Unauthorized.');
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }
  console.log('Step 1: User context found.');
  const user = context.clientContext.user;

  const { adsId } = JSON.parse(event.body);
  if (!adsId) {
    console.error('FATAL: Google Ads ID is missing from body.');
    return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
  }
  console.log(`Step 2: Ads ID received: ${adsId}`);

  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    console.error('FATAL: Database connection string is not set.');
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error.' }) };
  }
  console.log('Step 3: Database connection string found.');

  let sql;
  try {
    console.log('Step 4: Attempting to connect to database...');
    sql = postgres(connectionString, { ssl: 'require' });
    console.log('Step 5: DB connection object created. Executing UPDATE query...');

    await sql`
      UPDATE users
      SET google_ads_id = ${adsId}, connection_status = 'pending_approval', updated_at = NOW()
      WHERE netlify_id = ${user.sub};
    `;
    console.log('Step 6: UPDATE query executed successfully.');

    console.log('Step 7: Attempting to close DB connection...');
    await sql.end(); // <-- VOLVEMOS A PONER ESTA LÍNEA
    console.log('Step 8: DB connection closed.');

    console.log('Step 9: Calling sendWebhooks function...');
    await sendWebhooks('id_submitted', {
      email: user.email,
      full_name: user.user_metadata.full_name,
      google_ads_id: adsId,
      submission_date: new Date().toISOString()
    });
    console.log('Step 10: sendWebhooks function finished.');

    console.log('--- Function finished successfully! ---');
    return { statusCode: 200, body: JSON.stringify({ message: 'User updated successfully!' }) };

  } catch (error) {
    console.error('---!!! AN ERROR OCCURRED !!!---');
    console.error('Error details:', error);
    
    // Si la conexión se creó, intentamos cerrarla incluso si hay un error.
    if (sql) {
      console.log('Attempting to close connection after error...');
      await sql.end();
      console.log('Connection closed after error.');
    }
    
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};
