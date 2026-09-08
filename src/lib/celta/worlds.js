export const worldIds = ['congo', 'amazonia', 'ireland']

export function sampleGrid(grid, x, z, interpolate = true) {
  if (!grid) return 0
  const gx = (x - grid.origin[0]) / grid.step, gz = (z - grid.origin[1]) / grid.step
  if (gx < 0 || gz < 0 || gx > grid.width-1 || gz > grid.height-1) return null
  const read = (ix, iz) => grid.values[Math.min(grid.height-1,iz)*grid.width+Math.min(grid.width-1,ix)]
  if (!interpolate) return read(Math.round(gx), Math.round(gz))
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx-ix, fz = gz-iz
  return (read(ix,iz)*(1-fx)+read(ix+1,iz)*fx)*(1-fz)+(read(ix,iz+1)*(1-fx)+read(ix+1,iz+1)*fx)*fz
}

export function groundHeight(world, x, z) {
  return sampleGrid(world?.heightGrid, x, z) ?? 0
}

export function traversable(world, x, z, obstacles = []) {
  if (!world || sampleGrid(world.walkableGrid,x,z,false) !== 1) return false
  return ![...(world.colliders || []),...obstacles].some(o => Math.hypot(x-o.x,z-o.z) < o.r+.22)
}
