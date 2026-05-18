require('dotenv').config();
const { Composio } = require('composio-core');

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

async function listIntegrations() {
  try {
    const integrations = await composio.integrations.list();
    console.log(integrations);
  } catch(e) {
    console.error(e);
  }
}
listIntegrations();
