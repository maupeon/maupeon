// Rebuilds src/data/strava-snapshot.json from your whole Strava history.
//
//   npm run strava:snapshot
//
// Needs STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN in
// .env.local. It makes one detail request per run (~125 today), well inside
// Strava's 200 requests / 15 minutes. Run it after a race or a PR so the
// committed fallback stays current; the live page keeps itself fresh anyway.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { loadStravaData } from '../src/lib/strava-data.mjs'

process.loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url)))

const data = await loadStravaData({ snapshot: null, full: true, log: console.log })

const target = fileURLToPath(new URL('../src/data/strava-snapshot.json', import.meta.url))
writeFileSync(target, JSON.stringify(data, null, 2) + '\n')

console.log(`Wrote ${target}`)
console.log(`Records: ${Object.values(data.records).map((r) => `${r.key} ${r.time}s`).join(' · ')}`)
