// A small breadth-first grid search runs only when the player requests guidance.
// Sampling clearance prevents corners from cutting through trunks or river edges.
export function findWalkingPath(start, target, isWalkable, prison = false, worldBounds) {
  const step = 0.5
  const bounds = prison ? [-2, 2, -2.5, 2.5] : worldBounds || [-19.5, 1, -41.5, 4.5]
  const [minX, maxX, minZ, maxZ] = bounds
  const width = Math.round((maxX - minX) / step) + 1
  const height = Math.round((maxZ - minZ) / step) + 1
  const world = (id) => [
    minX + (id % width) * step,
    minZ + Math.floor(id / width) * step,
  ]
  const free = new Uint8Array(width * height)
  for (let id = 0; id < free.length; id++) {
    const [x, z] = world(id)
    free[id] = [
      [0, 0],
      [0.18, 0],
      [-0.18, 0],
      [0, 0.18],
      [0, -0.18],
    ].every(([dx, dz]) => isWalkable(x + dx, z + dz))
      ? 1
      : 0
  }
  const nearest = (point) => {
    let best = -1,
      distance = Infinity
    for (let id = 0; id < free.length; id++) {
      if (!free[id]) continue
      const [x, z] = world(id),
        next = (x - point[0]) ** 2 + (z - point[1]) ** 2
      if (next < distance) {
        best = id
        distance = next
      }
    }
    return best
  }
  const first = nearest(start),
    last = nearest(target)
  if (first < 0 || last < 0) return []
  const previous = new Int32Array(free.length).fill(-1)
  const queue = [first]
  previous[first] = first
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]
    if (id === last) break
    const x = id % width,
      z = Math.floor(id / width)
    for (const [dx, dz] of [
      [0, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        next = nz * width + nx
      if (
        nx < 0 ||
        nx >= width ||
        nz < 0 ||
        nz >= height ||
        !free[next] ||
        previous[next] !== -1
      )
        continue
      previous[next] = id
      queue.push(next)
    }
  }
  if (previous[last] < 0) return []
  const path = []
  for (let id = last; ; id = previous[id]) {
    path.push(world(id))
    if (id === first) break
  }
  return path.reverse()
}
