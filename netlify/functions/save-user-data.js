// Importa la librería 'pg'
const { Pool } = require('pg');

// La función principal que Netlify ejecutará
exports.handler = async (event, context) => {
  
  console.log("--- Function save-user-data invoked ---");

  try {
    if (!context.clientContext || !context.clientContext.user) {
      console.error("FATAL: Unauthorized access attempt. No user context found.");
      return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
    }
    const user = context.clientContext.user;
    console.log(`User authenticated: ${user.email}`);

    // --- ¡¡¡EL CAMBIO CLAVE ESTÁ AQUÍ!!! ---
    // Le decimos al código que use la "llave oficial" de Netlify en lugar de la nuestra.
    const connectionString = process.env.NETLIFY_DATABASE_URL;

    if (!connectionString) {
        console.error("FATAL: NETLIFY_DATABASE_URL environment variable is not set.");
        throw new Error("Database connection string is missing.");
    }
    console.log("NETLIFY_DATABASE_URL environment variable found.");

    // Usamos la "llave oficial" para crear la conexión
    const pool = new Pool({ connectionString: connectionString });
    console.log("Database pool created.");

    const { adsId } = JSON.parse(event.body);
    if (!adsId) {
      console.error("FATAL: Google Ads ID is missing in the request.");
      return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
    }
    console.log(`Data received from frontend: adsId = ${adsId}`);

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
    console.error("--- CATCH BLOCK TRIGGERED: An error occurred ---");
    console.error("Error details:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) 
    };
  }
};
