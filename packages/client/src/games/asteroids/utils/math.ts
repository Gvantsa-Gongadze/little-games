export function wrap(obj: { x: number; y: number }, w: number, h: number) {
  if (obj.x < 0)  obj.x = w
  if (obj.x > w)  obj.x = 0
  if (obj.y < 0)  obj.y = h
  if (obj.y > h)  obj.y = 0
}

export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy < (ar + br) * (ar + br)
}

export function randomEdgePosition(w: number, h: number, margin = 80) {
  const side = Math.floor(Math.random() * 4)
  switch (side) {
    case 0: return { x: Math.random() * w, y: -margin }
    case 1: return { x: Math.random() * w, y: h + margin }
    case 2: return { x: -margin, y: Math.random() * h }
    default: return { x: w + margin, y: Math.random() * h }
  }
}
