// Builds the colorfigures city for /empresas:
//   figures/ciudad/figure.html + src/data/agents.json  ->  public/empresas/ciudad.html
// The agents file is inlined so the figure and the page read the same data.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const agents = JSON.parse(readFileSync(join(root, 'src/data/agents.json'), 'utf8'))
const appsSrc = readFileSync(join(root, 'src/lib/apps.js'), 'utf8')
agents.apps = [...appsSrc.matchAll(/name: '([^']+)'/g)].map((m) => m[1])

const dir = mkdtempSync(join(tmpdir(), 'ciudad-'))
const src = join(root, 'figures/ciudad/figure.html')
const page = readFileSync(src, 'utf8').replace('/*AGENTS*/null', JSON.stringify(agents))
writeFileSync(join(dir, 'figure.html'), page)
execFileSync('python3', [join(root, 'figures/ciudad/build.py'), join(dir, 'figure.html'), join(root, 'public/empresas/ciudad.html')], { stdio: 'inherit' })
