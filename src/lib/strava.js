import axios from 'axios'

const STRAVA_OAUTH_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3'

function assertStravaEnv() {
  if (!process.env.STRAVA_CLIENT_ID) {
    throw new Error('Missing STRAVA_CLIENT_ID')
  }
  if (!process.env.STRAVA_CLIENT_SECRET) {
    throw new Error('Missing STRAVA_CLIENT_SECRET')
  }
}

export function getBaseUrlFromRequest(req) {
  let proto = req.headers['x-forwarded-proto']
  if (Array.isArray(proto)) proto = proto[0]

  let host = req.headers['x-forwarded-host']
  if (Array.isArray(host)) host = host[0]

  host = host ?? req.headers.host
  const protocol = proto ?? 'http'

  return `${protocol}://${host}`
}

export function getRedirectUri(req) {
  if (process.env.STRAVA_REDIRECT_URI) {
    return process.env.STRAVA_REDIRECT_URI
  }

  return `${getBaseUrlFromRequest(req)}/api/strava/callback`
}

export async function exchangeCodeForToken(code) {
  assertStravaEnv()

  const response = await axios.post(STRAVA_OAUTH_TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  })

  return response.data
}

export async function refreshToken(refreshToken) {
  assertStravaEnv()

  const response = await axios.post(STRAVA_OAUTH_TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  return response.data
}

export function isTokenExpired(expiresAtSeconds, leewaySeconds = 60) {
  if (!expiresAtSeconds) return true
  const nowSeconds = Math.floor(Date.now() / 1000)
  return nowSeconds >= expiresAtSeconds - leewaySeconds
}

export async function getActivities(
  accessToken,
  { perPage = 10, page = 1 } = {}
) {
  const response = await axios.get(
    `${STRAVA_API_BASE_URL}/athlete/activities`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        per_page: perPage,
        page,
      },
    }
  )

  return response.data
}
