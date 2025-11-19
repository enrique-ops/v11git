const postgres = require('postgres');
const fetch = require('node-fetch');

async function sendWebhooks(eventName, data) {
  // ... (el código de sendWebhooks sigue igual, no hay que cambiarlo) ...
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
    // ¡HEMOS ELIMINADO LA LÍNEA `await sql.end()` DE AQUÍ!

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
