const keys = new Set<string>()

window.addEventListener('keydown', e => keys.add(e.code))
window.addEventListener('keyup', e => keys.delete(e.code))

export const Keyboard = {
  isDown: (code: string) => keys.has(code),
}
