require('dotenv').config();
const { Composio } = require('composio-core');
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
async function test() {
  try {
    const entity = composio.getEntity('agendaflow_user_1');
    const connectionInfo = await entity.initiateConnection({
      appName: "googlecalendar",
      redirectUrl: "http://localhost:5173"
    });
    console.log("SUCCESS:", connectionInfo.redirectUrl);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();
