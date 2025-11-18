// netlify/functions/create-user.js
const postgres = require('postgres');

exports.handler = async (event, context) => {
  // Solo nos interesa el evento de cuando un usuario se ha registrado y verificado
  if (event.body) {
    const { event: identityEvent, user } = JSON.parse(event.body);

    // El evento 'signup' se dispara cuando un usuario se registra
    if (identityEvent === 'signup') {
      console.log(`New user signup: ${user.email}. Creating database entry.`);

      const connectionString = process.env.NETLIFY_DATABASE_URL;
      if (!connectionString) {
        console.error("FATAL: NETLIFY_DATABASE_URL is not set.");
        return { statusCode: 500 };
      }

      try {
        const sql = postgres(connectionString, { ssl: 'require' });
        
        // Insertamos el nuevo usuario con el estado por defecto 'pending_id'
        await sql`
          INSERT INTO users (netlify_id, email, full_name)
          VALUES (${user.id}, ${user.email}, ${user.user_metadata.full_name})
          ON CONFLICT (netlify_id) DO NOTHING; -- Si ya existe, no hacemos nada
        `;
        
        await sql.end();
        console.log(`Successfully created user entry for ${user.email}.`);

        return { statusCode: 200, body: "User created." };
      } catch (error) {
        console.error("Error creating user in database:", error);
        return { statusCode: 500 };
      }
    }
  }
  
  // Si no es un evento de signup, no hacemos nada
  return { statusCode: 200, body: "No action required." };
};
