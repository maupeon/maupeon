import data from '@/data/agents.json'

// Version 1 reads the static file. Version 2 will ask the main VPS for each
// agent's live `estado` here and merge it over the same shape, so the page and
// the illustration don't change.
export async function getAgents() {
  return data
}
