require('dotenv').config();
const { Composio } = require('composio-core');

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

async function listApps() {
  try {
    const apps = await composio.apps.list();
    console.log(apps.find(a => a.name.includes('google') || a.key.includes('google')));
  } catch(e) {
    console.error(e);
  }
}
listApps();
