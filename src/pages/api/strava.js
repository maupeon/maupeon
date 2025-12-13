import fs from 'fs'
import path from 'path'

const CACHE_FILE = path.join(process.cwd(), 'strava-cache.json')
const CACHE_DURATION = 1000 * 60 * 60 // 1 hora en milliseconds

// Distancias que queremos trackear
const TARGET_DISTANCES = [
  { name: '1K', distance: 1000 },
  { name: '1 mile', distance: 1609 },
  { name: '5K', distance: 5000 },
  { name: '10K', distance: 10000 },
  { name: 'Half-Marathon', distance: 21097 },
  { name: 'Marathon', distance: 42195 },
]

function getCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
      const age = Date.now() - cache.timestamp

      if (age < CACHE_DURATION) {
        console.log(
          'Using cached data, age:',
          Math.round(age / 1000 / 60),
          'minutes'
        )
        return cache.data
      }
      console.log('Cache expired')
    }
  } catch (e) {
    console.log('Cache read error:', e.message)
  }
  return null
}

function setCache(data) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    )
    console.log('Cache updated')
  } catch (e) {
    console.log('Cache write error:', e.message)
  }
}

async function getAccessToken() {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  return data.access_token
}

async function getActivities(accessToken, page = 1, perPage = 100) {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  return response.json()
}

async function getActivityDetails(accessToken, activityId) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  return response.json()
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function calculatePace(seconds, meters) {
  const paceSeconds = (seconds / meters) * 1000
  const paceMinutes = Math.floor(paceSeconds / 60)
  const paceSecs = Math.round(paceSeconds % 60)
  return `${paceMinutes}:${paceSecs.toString().padStart(2, '0')} /km`
}

async function fetchStravaData() {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    throw new Error('Failed to get access token')
  }

  const activities = await getActivities(accessToken, 1, 200)

  if (!Array.isArray(activities)) {
    throw new Error(activities.message || 'Failed to fetch activities')
  }

  const runs = activities.filter((a) => a.type === 'Run')
  const recentRuns = runs.slice(0, 50)

  const bestEffortsMap = new Map()

  for (const run of recentRuns) {
    const details = await getActivityDetails(accessToken, run.id)

    if (details.best_efforts) {
      for (const effort of details.best_efforts) {
        const targetDistance = TARGET_DISTANCES.find(
          (t) => t.name.toLowerCase() === effort.name.toLowerCase()
        )

        if (targetDistance) {
          const existing = bestEffortsMap.get(effort.name)

          if (!existing || effort.moving_time < existing.time) {
            bestEffortsMap.set(effort.name, {
              name: effort.name,
              time: effort.moving_time,
              timeFormatted: formatTime(effort.moving_time),
              pace: calculatePace(effort.moving_time, targetDistance.distance),
              date: effort.start_date,
              activityId: run.id,
            })
          }
        }
      }
    }

    // Pausa para respetar rate limits
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const personalRecords = TARGET_DISTANCES.map((t) =>
    bestEffortsMap.get(t.name)
  ).filter(Boolean)

  const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0)
  const totalTime = runs.reduce((sum, r) => sum + r.moving_time, 0)

  return {
    personalRecords,
    stats: {
      totalRuns: runs.length,
      totalDistanceKm: Math.round(totalDistance / 1000),
      totalTimeHours: Math.round(totalTime / 3600),
      averagePace: calculatePace(totalTime, totalDistance),
    },
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Intentar usar caché primero
    const cached = getCache()
    if (cached) {
      return res.status(200).json(cached)
    }

    // Si no hay caché, fetch de Strava
    console.log('Fetching fresh data from Strava...')
    const data = await fetchStravaData()

    // Guardar en caché
    setCache(data)

    res.status(200).json(data)
  } catch (error) {
    console.error('Strava API error:', error)

    // Si falla pero hay caché viejo, usarlo
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const oldCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
        console.log('Using stale cache due to error')
        return res.status(200).json(oldCache.data)
      }
    } catch (e) {}

    res
      .status(500)
      .json({ error: 'Failed to fetch Strava data', details: error.message })
  }
}
