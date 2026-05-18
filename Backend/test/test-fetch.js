const url = "https://backend.composio.dev/api/v3/connected_accounts/link";
fetch(url, {
  method: "POST",
  headers: {
    "x-api-key": "ak_3Dj4xWOPs0aeh6_CQbbI",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    app_name: "googlecalendar",
    user_id: "agendaflow_user_1",
    redirect_uri: "http://localhost:5173"
  })
}).then(r => r.json()).then(console.log).catch(console.error);
