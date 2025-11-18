const { Pool } = require('pg');

exports.handler = async (event, context) => {
  console.log("--- V12: Anti-Silent-Fail Function Invoked ---");

  let pool; // Definimos pool aquí para poder cerrarlo en el finally

  try {
    if (!context.clientContext || !context.clientContext.user) {
      console.error("FATAL: Unauthorized access. No user context.");
      return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
    }
    const user = context.clientContext.user;
    console.log(`User Authenticated: ${user.email}`);

    const connectionString = process.env.NETLIFY_DATABASE_URL;
    if (!connectionString) {
      console.error("FATAL: NETLIFY_DATABASE_URL is not set.");
      throw new Error("Database connection string is missing.");
    }
    console.log("NETLIFY_DATABASE_URL found.");

    // --- ¡¡¡EL CAMBIO CLAVE Y DEFINITIVO ESTÁ AQUÍ!!! ---
    // Añadimos la configuración SSL requerida por Neon y otros proveedores en la nube.
    // Esto soluciona los errores de conexión silenciosos.
    pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false // Necesario para muchos entornos serverless como Netlify
      }
    });
    console.log("Database pool created with SSL config.");

    const { adsId } = JSON.parse(event.body);
    if (!adsId) {
      console.error("FATAL: Google Ads ID missing.");
      return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
    }
    console.log(`Data received: adsId = ${adsId}`);

    const query = `
      INSERT INTO users (netlify_id, email, full_name, google_ads_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (netlify_id) 
      DO UPDATE SET 
        google_ads_id = EXCLUDED.google_ads_id,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    `;
    const values = [user.sub, user.email, user.user_metadata.full_name, adsId];
    
    console.log("Executing SQL query...");
    await pool.query(query, values);
    console.log("--- SQL query successful! ---");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success!' }),
    };

  } catch (error) {
    console.error("--- CATCH BLOCK TRIGGERED ---");
    console.error("Error details:", error.message); // Log más limpio del error
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) 
    };
  } finally {
    // --- ¡NUEVO! ---
    // Nos aseguramos de cerrar la conexión, lo que puede ayudar a evitar timeouts.
    if (pool) {
      await pool.end();
      console.log("Database pool closed.");
    }
  }
};
