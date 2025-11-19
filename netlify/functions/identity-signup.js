const postgres = require('postgres');
const fetch = require('node-fetch');

async function sendWebhooks(eventName, data) {
  // ... (el código de sendWebhooks sigue igual) ...
}

async function createUserInDb(user) {
  console.log(`Attempting to create DB entry for user: ${user.email}.`);
  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    console.error("FATAL: NETLIFY_DATABASE_URL is not set.");
    throw new Error("Database URL not configured.");
  }

  const sql = postgres(connectionString, { ssl: 'require' });
  try {
    const result = await sql`
      INSERT INTO users (netlify_id, email, full_name)
      VALUES (${user.id}, ${user.email}, ${user.user_metadata.full_name})
      ON CONFLICT (netlify_id) DO NOTHING
      RETURNING *;
    `;
    // ¡HEMOS ELIMINADO LA LÍNEA `await sql.end()` DE AQUÍ!

    if (result.count > 0) {
      console.log(`Successfully created new user entry for ${user.email}.`);
      await sendWebhooks('user_signup', {
        email: user.email,
        full_name: user.user_metadata.full_name,
        signup_date: new Date().toISOString()
      });
    } else {
      console.log(`User ${user.email} already exists in DB. No action taken.`);
    }
  } catch (error) {
    // No necesitamos sql.end() aquí tampoco
    console.error("Error during DB operation:", error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  // ... (el resto del handler sigue igual) ...
};
