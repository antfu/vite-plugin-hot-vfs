const random = Math.random().toString(36).substring(2, 15)

export function getRandom(): string {
  return random
}
