// Vercel serverless function — exchanges OAuth code for access token
// Never exposes client secret to the browser

export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing code' })

  const clientId     = process.env.MONDAY_CLIENT_ID
  const clientSecret = process.env.MONDAY_CLIENT_SECRET
  const redirectUri  = process.env.MONDAY_REDIRECT_URI || 'https://cpars-grant-dashboard.vercel.app/auth/callback'

  try {
    const response = await fetch('https://auth.monday.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(400).json({ error: 'Token exchange failed', details: text })
    }

    const data = await response.json()
    return res.status(200).json({ access_token: data.access_token })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
