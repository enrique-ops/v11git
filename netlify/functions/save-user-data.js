// --- ¡LIBRERÍA NUEVA! ---
// Importamos 'postgres' en lugar de 'pg'
const postgres = require('postgres');

exports.handler = async (event, context) => {
  console.log("--- V13: Final Attempt with 'postgres' library ---");

  // Comprobamos la autenticación del usuario
  if (!context.clientContext || !context.clientContext.user) {
    console.error("FATAL: Unauthorized access. No user context.");
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }
  const user = context.clientContext.user;
  console.log(`User Authenticated: ${user.email}`);

  // Comprobamos que tenemos la URL de la base de datos
  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    console.error("FATAL: NETLIFY_DATABASE_URL is not set.");
    return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error.' }) };
  }
  console.log("NETLIFY_DATABASE_URL found.");

  // Procesamos los datos que vienen del frontend
  const { adsId } = JSON.parse(event.body);
  if (!adsId) {
    console.error("FATAL: Google Ads ID missing.");
    return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
  }
  console.log(`Data received: adsId = ${adsId}`);

  try {
    // --- ¡CÓDIGO NUEVO! ---
    // Conectamos a la base de datos usando la nueva librería.
    // Le pasamos la URL y la configuración SSL directamente.
    console.log("Attempting to connect to the database...");
    const sql = postgres(connectionString, {
      ssl: 'require' // La forma moderna y correcta de pedir SSL
    });
    console.log("Database connection successful.");

    // Ejecutamos la consulta. La sintaxis es un poco diferente pero más limpia.
    console.log("Executing SQL query...");
    await sql`
      INSERT INTO users (netlify_id, email, full_name, google_ads_id)
      VALUES (${user.sub}, ${user.email}, ${user.user_metadata.full_name}, ${adsId})
      ON CONFLICT (netlify_id) 
      DO UPDATE SET 
        google_ads_id = EXCLUDED.google_ads_id,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    `;
    console.log("--- SQL query successful! ---");

    // Cerramos la conexión
    await sql.end();
    console.log("Database connection closed.");

    // Devolvemos una respuesta de éxito
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success!' }),
    };

  } catch (error) {
    // Si algo falla, lo registramos
    console.error("--- CATCH BLOCK TRIGGERED ---");
    console.error("Error details:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) 
    };
  }
};
