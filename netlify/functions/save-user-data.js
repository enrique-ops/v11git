const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

exports.handler = async (event, context) => {
  if (!context.clientContext || !context.clientContext.user) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }

  try {
    const user = context.clientContext.user;
    const netlifyUserId = user.sub;
    const userEmail = user.email;
    const userFullName = user.user_metadata.full_name; 

    const { adsId } = JSON.parse(event.body);

    if (!adsId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Google Ads ID is missing.' }) };
    }

    const query = `
      INSERT INTO users (netlify_id, email, full_name, google_ads_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (netlify_id) 
      DO UPDATE SET 
        google_ads_id = EXCLUDED.google_ads_id,
        full_name = EXCLUDED.full_name;
    `;
    
    const values = [netlifyUserId, userEmail, userFullName, adsId];

    await pool.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User data saved successfully!' }),
    };

  } catch (error) {
    console.error('Error in save-user-data function:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'An internal error occurred.' }) };
  }
};
