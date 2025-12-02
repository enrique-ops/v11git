// Importamos las librerías necesarias
const { ManagementClient } = require('auth0');
const { expressjwt: jwt } = require('express-jwt');
const jwks = require('jwks-rsa');

// Configuración de Auth0 (¡IMPORTANTE!)
// Debes añadir estas variables al entorno de Netlify
const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE; // Generalmente 'https://tu-dominio.auth0.com/api/v2/'
const auth0ClientId = process.env.AUTH0_CLIENT_ID;
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;
const auth0ManagementToken = process.env.AUTH0_MANAGEMENT_TOKEN; // Token de la API de Auth0

// Middleware para validar el token JWT de Auth0
const checkJwt = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${auth0Domain}/.well-known/jwks.json`
  } ),
  audience: auth0Audience,
  issuer: `https://${auth0Domain}/`,
  algorithms: ['RS256']
} );

// El handler principal de la función
exports.handler = async (event, context) => {
  // 1. Verificación del método HTTP
  if (event.httpMethod !== 'POST' ) {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. Verificación del Token (Simulada, ya que Netlify no soporta middleware directamente)
  // En un entorno Express real, usarías `checkJwt` como middleware.
  // Aquí, tenemos que simularlo o, para simplificar, confiar en el `context.clientContext` si está bien configurado.
  // PERO, la forma más robusta es validar el token que nos llega en el header.
  
  // La forma más simple y segura en Netlify Functions es usar el `context.clientContext`
  // que Netlify ya ha validado por nosotros si configuramos la integración con Auth0.
  const { user } = context.clientContext;
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized: No user context found.' })
    };
  }

  // 3. Procesar los datos
  const { adsId } = JSON.parse(event.body);
  if (!adsId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is required.' }) };
  }

  // El 'sub' es el ID único del usuario en Auth0 (ej: 'auth0|xxxxxxxx')
  const userId = user.sub;

  // 4. Inicializar el Cliente de Gestión de Auth0
  // Esto es para guardar el adsId en los metadatos del usuario en Auth0
  const auth0 = new ManagementClient({
    domain: auth0Domain,
    clientId: auth0ClientId,
    clientSecret: auth0ClientSecret,
  });

  // 5. Guardar el adsId en los 'user_metadata' del usuario
  try {
    await auth0.users.update({ id: userId }, {
      user_metadata: {
        google_ads_id: adsId
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Google Ads ID saved successfully.' })
    };

  } catch (error) {
    console.error('Error updating user metadata in Auth0:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to save Google Ads ID.' })
    };
  }
};
