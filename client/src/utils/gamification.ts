export const roundToNearest5 = (value: number) => 5 * Math.round(value / 5)

export const getNextLevelXp = (previousLevelXp: number) => roundToNearest5(previousLevelXp * 1.05)

export const getLevelProgressFromPoints = (points: number) => {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0
  let level = 1
  let currentLevelMin = 0
  let nextLevelXp = 100

  while (safePoints >= currentLevelMin + nextLevelXp) {
    currentLevelMin += nextLevelXp
    level += 1
    nextLevelXp = getNextLevelXp(nextLevelXp)
  }

  return {
    level,
    currentLevelMin,
    nextLevelXp,
    progress: safePoints - currentLevelMin,
  }
}
