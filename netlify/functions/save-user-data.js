const { ManagementClient } = require('auth0');
const { promisify } = require('util');
const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

// --- Configuración ---
const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE;
const auth0ClientId = process.env.AUTH0_CLIENT_ID;
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

// Creamos un cliente para obtener las claves de firma de Auth0
const jwksClient = jwksRsa({
  jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
} );

// Convertimos la función de callback a una promesa para usar con async/await
const getSigningKey = promisify(jwksClient.getSigningKey);

// --- El Handler Principal ---
exports.handler = async (event, context) => {
  console.log('Función save-user-data iniciada.');

  // 1. Validar que es una petición POST
  if (event.httpMethod !== 'POST' ) {
    console.log('Error: Método no permitido.');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. Extraer el token del header de Authorization
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Error: Falta el header de Authorization o no es de tipo Bearer.');
    return { statusCode: 401, body: JSON.stringify({ message: 'Authorization header is missing or invalid.' }) };
  }
  const token = authHeader.substring(7); // Quitamos "Bearer "

  let decodedToken;
  try {
    // 3. Validar el token JWT
    console.log('Intentando validar el token...');
    const key = await getSigningKey(jwt.decode(token, { complete: true }).header.kid);
    decodedToken = jwt.verify(token, key.getPublicKey(), {
      audience: auth0Audience,
      issuer: `https://${auth0Domain}/`,
      algorithms: ['RS256']
    } );
    console.log('Token validado con éxito.');
  } catch (error) {
    console.error('Error de validación de token:', error.message);
    return { statusCode: 401, body: JSON.stringify({ message: 'Token validation failed.', error: error.message }) };
  }

  // 4. Procesar los datos del body
  const { adsId } = JSON.parse(event.body);
  if (!adsId) {
    console.log('Error: Falta el adsId en el body.');
    return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is required.' }) };
  }
  console.log(`Ads ID recibido: ${adsId}`);

  // El 'sub' es el ID único del usuario en Auth0
  const userId = decodedToken.sub;
  console.log(`ID de usuario (sub): ${userId}`);

  // 5. Guardar el adsId en los metadatos de Auth0
  try {
    console.log('Conectando con la Management API de Auth0...');
    const auth0 = new ManagementClient({
      domain: auth0Domain,
      clientId: auth0ClientId,
      clientSecret: auth0ClientSecret,
    });

    console.log(`Actualizando metadatos para el usuario ${userId}...`);
    await auth0.users.update({ id: userId }, {
      user_metadata: {
        google_ads_id: adsId
      }
    });
    console.log('Metadatos actualizados con éxito.');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Google Ads ID saved successfully.' })
    };
  } catch (error) {
    console.error('Error al actualizar los metadatos en Auth0:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to save Google Ads ID in Auth0.', error: error.message })
    };
  }
};
