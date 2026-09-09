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

export function surfaceContains(surface, x, z, margin = 0) {
  if (surface.type === 'rect') {
    const [left,right,back,front] = surface.bounds
    return x >= left-margin && x <= right+margin && z >= back-margin && z <= front+margin
  }
  if (surface.type === 'ellipse') return ((x-surface.center[0])/(surface.radii[0]+margin))**2+((z-surface.center[1])/(surface.radii[1]+margin))**2 <= 1
  if (surface.type !== 'path') return false
  return surface.points.slice(1).some((b,i)=>{
    const a=surface.points[i],dx=b[0]-a[0],dz=b[1]-a[1]
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz || 1)))
    return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t) <= surface.width/2+margin
  })
}

export function groundHeight(world, x, z) {
  const detail = world?.detailHeightGrid ? sampleGrid(world.detailHeightGrid, x, z) : null
  const ground = detail ?? sampleGrid(world?.heightGrid, x, z) ?? 0
  // Exact deck surfaces avoid interpolating feet into gaps beside narrow planks.
  const deck = world?.walkSurfaces?.find(surface => surfaceContains(surface,x,z) && Math.abs(surface.height-ground)<.5)
  return deck?.height ?? ground
}

export function traversable(world, x, z, obstacles = []) {
  if (!world || sampleGrid(world.walkableGrid,x,z,false) !== 1) return false
  const blocks = o => Math.hypot(x-o.x,z-o.z) < o.r+.22
  return !(world.colliders || []).some(blocks) && !obstacles.some(blocks)
}
