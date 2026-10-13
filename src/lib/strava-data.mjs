// Strava data for /ejercicio. Plain ESM with no path aliases so both Next.js
// (getStaticProps) and scripts/strava-snapshot.mjs can import it.
//
// Why this is not "just fetch the latest N runs": personal records and totals
// have to cover every run, not a sliding window. The old version only looked at
// the 50 newest runs, so a marathon from last December silently dropped out.
//
// Strategy:
//   * Totals come from Strava's own all-time stats endpoint (1 call).
//   * Monthly volume comes from the run list (a couple of calls).
//   * Records (best efforts) need one detail call per run, so a committed
//     snapshot holds the all-time records up to `processedThrough`, and each
//     refresh only inspects runs newer than that. Few calls, nothing to lose.
//   * If Strava is unreachable the page falls back to the snapshot.

const API = 'https://www.strava.com/api/v3'
const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun'])
const OVERLAP_MS = 7 * 24 * 60 * 60 * 1000 // re-inspect a week of runs to catch late uploads
const MEMO_MS = 10 * 60 * 1000

// `name` is how Strava labels the best effort.
export const TARGETS = [
  { key: '1K', name: '1K', meters: 1000 },
  { key: '1 mile', name: '1 mile', meters: 1609.344 },
  { key: '5K', name: '5K', meters: 5000 },
  { key: '10K', name: '10K', meters: 10000 },
  { key: 'Half-Marathon', name: 'Half-Marathon', meters: 21097.5 },
  { key: 'Marathon', name: 'Marathon', meters: 42195 },
]

class StravaError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'StravaError'
    this.status = status
  }
}

// Strava's limits reset on 15-minute clock boundaries.
function msUntilNextWindow(now = Date.now()) {
  const window = 15 * 60 * 1000
  return window - (now % window) + 5000
}

// `wait` is for the snapshot script: on a 429 it sleeps until the window resets
// and retries. The page itself never waits; it falls back to the snapshot.
async function stravaGet(path, token, { wait = false, log = () => {} } = {}) {
  let response

  for (let attempt = 0; ; attempt++) {
    response = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status !== 429 || !wait || attempt >= 4) break

    const delay = msUntilNextWindow()
    log(`Rate limited; waiting ${Math.ceil(delay / 60000)} min for the window to reset`)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  if (!response.ok) {
    throw new StravaError(
      `Strava ${response.status} for ${path.split('?')[0]}`,
      response.status
    )
  }

  return response.json()
}

async function getAccessToken() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } =
    process.env

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    throw new StravaError('Missing STRAVA_* environment variables', 0)
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new StravaError(
      `Strava token refresh failed (${response.status})`,
      response.status
    )
  }

  return data.access_token
}

// Every run, newest first. The list endpoint returns all sport types mixed,
// so this pages until a short page comes back.
async function listRuns(token, options) {
  const runs = []

  for (let page = 1; page <= 20; page++) {
    const batch = await stravaGet(
      `/athlete/activities?per_page=200&page=${page}`,
      token,
      options
    )
    if (!Array.isArray(batch)) throw new StravaError('Unexpected activities payload', 0)

    for (const activity of batch) {
      if (!RUN_TYPES.has(activity.sport_type ?? activity.type)) continue
      runs.push({
        id: activity.id,
        startDate: activity.start_date,
        localMonth: String(activity.start_date_local ?? activity.start_date).slice(0, 7),
        meters: activity.distance,
        isPublic: activity.visibility === 'everyone',
      })
    }

    if (batch.length < 200) break
  }

  return runs.sort((a, b) => Date.parse(b.startDate) - Date.parse(a.startDate))
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index], index)
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function lastTwelveMonths(runs, now) {
  const months = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push(date.toISOString().slice(0, 7))
  }

  const totals = new Map(months.map((month) => [month, { km: 0, runs: 0 }]))
  for (const run of runs) {
    const bucket = totals.get(run.localMonth)
    if (!bucket) continue
    bucket.km += run.meters / 1000
    bucket.runs += 1
  }

  return months.map((month) => ({
    month,
    km: Math.round(totals.get(month).km * 10) / 10,
    runs: totals.get(month).runs,
  }))
}

/**
 * @param {object} options
 * @param {object|null} options.snapshot committed snapshot (see scripts/strava-snapshot.mjs)
 * @param {boolean} [options.full] ignore the snapshot and inspect every run
 * @param {(message: string) => void} [options.log]
 */
export async function loadStravaData({ snapshot, full = false, log = () => {}, now = new Date() }) {
  const token = await getAccessToken()
  const options = { wait: full, log }
  const athlete = await stravaGet('/athlete', token, options)
  const [stats, runs] = await Promise.all([
    stravaGet(`/athletes/${athlete.id}/stats`, token, options),
    listRuns(token, options),
  ])

  const records = full ? {} : { ...(snapshot?.records ?? {}) }
  const since = full ? 0 : Date.parse(snapshot?.processedThrough ?? 0) - OVERLAP_MS
  const toInspect = runs.filter(
    (run) => run.meters >= 1000 && Date.parse(run.startDate) > since
  )
  log(`${runs.length} runs, inspecting ${toInspect.length}`)

  await mapLimit(toInspect, 4, async (run) => {
    const detail = await stravaGet(`/activities/${run.id}`, token, options)

    for (const effort of detail.best_efforts ?? []) {
      const target = TARGETS.find((t) => t.name === effort.name)
      if (!target) continue

      const current = records[target.key]
      if (!current || effort.moving_time < current.time) {
        records[target.key] = {
          key: target.key,
          time: effort.moving_time,
          date: String(effort.start_date_local ?? detail.start_date_local).slice(0, 10),
          activityId: run.id,
          isPublic: run.isPublic,
        }
      }
    }
  })

  const all = stats.all_run_totals
  const ytd = stats.ytd_run_totals
  const km = all.distance / 1000

  return {
    updatedAt: now.toISOString(),
    processedThrough: runs[0]?.startDate ?? snapshot?.processedThrough ?? null,
    records,
    totals: {
      runs: all.count,
      km: Math.round(km),
      hours: Math.round(all.moving_time / 3600),
      paceSecondsPerKm: Math.round(all.moving_time / km),
      ytdRuns: ytd.count,
      ytdKm: Math.round(ytd.distance / 1000),
    },
    monthly: lastTwelveMonths(runs, now),
  }
}

// What the page renders: records as an ordered array, plus where the data came from.
function toPageData(data, source) {
  return {
    source,
    updatedAt: data.updatedAt,
    totals: data.totals,
    monthly: data.monthly,
    records: TARGETS.map((target) => data.records[target.key])
      .filter(Boolean)
      .map((record) => ({
        ...record,
        meters: TARGETS.find((t) => t.key === record.key).meters,
      })),
  }
}

let memo = null

/**
 * Live data when Strava answers, the committed snapshot when it doesn't, and
 * `null` only if both fail. Memoised for a few minutes so the es/en versions of
 * the page (and repeated dev reloads) share one round of API calls.
 */
export function getStravaPageData({ snapshot }) {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.promise

  const promise = loadStravaData({ snapshot })
    .then((data) => toPageData(data, 'live'))
    .catch((error) => {
      console.error(`[strava] live data unavailable, using snapshot: ${error.message}`)
      memo = null
      return snapshot ? toPageData(snapshot, 'snapshot') : null
    })

  memo = { at: Date.now(), promise }
  return promise
}
