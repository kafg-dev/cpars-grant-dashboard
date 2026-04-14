// Redirects to Monday.com OAuth — client ID stays server-side
export default function handler(req, res) {
  const clientId    = process.env.MONDAY_CLIENT_ID
  const redirectUri = process.env.MONDAY_REDIRECT_URI || 'https://cpars-grant-dashboard.vercel.app/auth/callback'
  const scopes      = 'me:read boards:read boards:write updates:write'

  const url = `https://auth.monday.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`
  res.redirect(url)
}
