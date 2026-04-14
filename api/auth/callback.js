// Vercel serverless function — exchanges OAuth code for access token
// Never exposes client secret to the browser

export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing code' })

  const clientId     = process.env.MONDAY_CLIENT_ID
  const clientSecret = process.env.MONDAY_CLIENT_SECRET

  try {
    const response = await fetch('https://auth.monday.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code }).toString(),
    })

    const text = await response.text()
    if (!response.ok) {
      return res.status(400).json({ error: 'Token exchange failed', status: response.status, details: text })
    }

    let data
    try { data = JSON.parse(text) } catch { return res.status(400).json({ error: 'Invalid JSON response', details: text }) }
    if (!data.access_token) return res.status(400).json({ error: 'No access_token in response', details: data })
    return res.status(200).json({ access_token: data.access_token })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
