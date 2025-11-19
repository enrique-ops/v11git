const postgres = require('postgres');
const fetch = require('node-fetch');

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

// --- ¡NUEVO! ---
// Función para manejar la creación del usuario en la base de datos.
// La hemos separado para poder llamarla desde 'signup' o 'login'.
async function createUserInDb(user) {
  console.log(`Attempting to create DB entry for user: ${user.email}.`);
  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    console.error("FATAL: NETLIFY_DATABASE_URL is not set.");
    throw new Error("Database URL not configured.");
  }

  const sql = postgres(connectionString, { ssl: 'require' });
  try {
    // Usamos ON CONFLICT para evitar errores si el usuario ya existe por alguna razón.
    const result = await sql`
      INSERT INTO users (netlify_id, email, full_name)
      VALUES (${user.id}, ${user.email}, ${user.user_metadata.full_name})
      ON CONFLICT (netlify_id) DO NOTHING
      RETURNING *;
    `;
    
    await sql.end();

    // Si 'result.count' es mayor que 0, significa que se insertó una nueva fila.
    if (result.count > 0) {
      console.log(`Successfully created new user entry for ${user.email}.`);
      // Solo enviamos el webhook si es un usuario genuinamente nuevo.
      await sendWebhooks('user_signup', {
        email: user.email,
        full_name: user.user_metadata.full_name,
        signup_date: new Date().toISOString()
      });
    } else {
      console.log(`User ${user.email} already exists in DB. No action taken.`);
    }
  } catch (error) {
    await sql.end();
    console.error("Error during DB operation:", error);
    throw error; // Relanzamos el error para que la función principal lo capture.
  }
}


exports.handler = async (event, context) => {
  if (!event.body) {
    return { statusCode: 200, body: 'No body, ignoring.' };
  }

  const { event: identityEvent, user } = JSON.parse(event.body);

  try {
    // --- ¡LÓGICA MEJORADA! ---
    // Reaccionamos tanto a 'signup' como a 'login'.
    if (identityEvent === 'signup' || identityEvent === 'login') {
      console.log(`Received '${identityEvent}' event for user ${user.email}.`);
      await createUserInDb(user);
    } else {
      console.log(`Ignoring event '${identityEvent}'.`);
    }
    return { statusCode: 200 };

  } catch (error) {
    console.error("Error in identity-signup handler:", error);
    return { statusCode: 500 };
  }
};
