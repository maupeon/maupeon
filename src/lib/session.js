import { withIronSessionApiRoute } from 'iron-session/next'

export const sessionOptions = {
  cookieName: 'maupeon_strava',
  password:
    process.env.SESSION_PASSWORD ||
    'fallback-insecure-password-for-dev-only-32ch',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
  },
}

export function withSessionRoute(handler) {
  return withIronSessionApiRoute(handler, sessionOptions)
}
