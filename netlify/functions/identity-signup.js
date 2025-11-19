const postgres = require('postgres');
const fetch = require('node-fetch');

// La función de los webhooks con sus propios logs
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

// La función de creación de usuario, ahora con logs detallados
async function createUserInDb(user) {
  console.log('[DB] Attempting to create DB entry for user:', user.email);
  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    console.error("[DB] FATAL: NETLIFY_DATABASE_URL is not set.");
    throw new Error("Database URL not configured.");
  }
  console.log('[DB] Connection string found.');

  let sql;
  try {
    console.log('[DB] Step 1: Creating connection object...');
    sql = postgres(connectionString, { ssl: 'require' });
    console.log('[DB] Step 2: Connection object created. Executing INSERT query...');
    
    const result = await sql`
      INSERT INTO users (netlify_id, email, full_name)
      VALUES (${user.id}, ${user.email}, ${user.user_metadata.full_name})
      ON CONFLICT (netlify_id) DO NOTHING
      RETURNING *;
    `;
    console.log('[DB] Step 3: INSERT query executed.');

    console.log('[DB] Step 4: Closing DB connection...');
    await sql.end(); // <-- Restauramos el cierre de conexión aquí también
    console.log('[DB] Step 5: DB connection closed.');

    if (result.count > 0) {
      console.log(`[DB] New user was inserted. Proceeding to send webhook.`);
      await sendWebhooks('user_signup', {
        email: user.email,
        full_name: user.user_metadata.full_name,
        signup_date: new Date().toISOString()
      });
    } else {
      console.log(`[DB] User already existed. No webhook sent.`);
    }
  } catch (error) {
    console.error('[DB] ---!!! DB Operation Error !!!---');
    console.error('[DB] Error details:', error);
    if (sql) {
      await sql.end();
    }
    throw error;
  }
}

// El handler principal, con sus propios logs
exports.handler = async (event, context) => {
  console.log('--- identity-signup function invoked ---');
  
  if (!event.body) {
    console.log('Function invoked without a body. Exiting.');
    return { statusCode: 200, body: 'No body, ignoring.' };
  }
  console.log('Step 1: Event body found.');

  const { event: identityEvent, user } = JSON.parse(event.body);
  console.log(`Step 2: Parsed body. Event type is '${identityEvent}'.`);

  try {
    if (identityEvent === 'signup' || identityEvent === 'login') {
      console.log(`Step 3: Event is '${identityEvent}', proceeding to call createUserInDb.`);
      await createUserInDb(user);
      console.log('Step 4: createUserInDb finished.');
    } else {
      console.log(`Step 3: Ignoring event '${identityEvent}'. No action taken.`);
    }
    
    console.log('--- Function finished successfully! ---');
    return { statusCode: 200 };

  } catch (error) {
    console.error('---!!! Unhandled Error in Handler !!!---');
    console.error('Error details:', error);
    return { statusCode: 500 };
  }
};
