// functions/create-profile/index.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const event = req.body && req.body.event;
    if (!event) {
      return res.status(400).json({ error: 'Missing event body' });
    }

    const user = event.data.new;
    if (!user || !user.id || !user.email) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    // derive a username from email, everything before @
    const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '_');

    // call Hasura GraphQL to insert profile
    const graphqlUrl = process.env.NHOST_GRAPHQL_URL || process.env.HASURA_GRAPHQL_URL;
    const adminSecret = process.env.NHOST_ADMIN_SECRET || process.env.HASURA_ADMIN_SECRET;

    if (!graphqlUrl || !adminSecret) {
      console.error('Missing NHOST_GRAPHQL_URL or NHOST_ADMIN_SECRET env vars');
      return res.status(500).json({ error: 'Server not configured' });
    }

    const mutation = `
      mutation CreateProfile($auth_id: uuid!, $username: String!, $display_name: String!) {
        insert_profiles_one(
          object: { auth_id: $auth_id, username: $username, display_name: $display_name },
          on_conflict: { constraint: profiles_auth_id_key, update_columns: [] }
        ) {
          id
          username
        }
      }
    `;

    const resp = await fetch(`${graphqlUrl}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          auth_id: user.id,
          username,
          display_name: user.display_name || username
        }
      })
    });

    const result = await resp.json();
    console.log('Hasura response:', result);

    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).json({ error: 'Function failed', details: err.message });
  }
};