import type { MatchSet } from "@/server/db/types"

export const parseSetScores = (matchId: string, raw: string): MatchSet[] => {
  const sets = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value, index) => {
      const [a, b] = value.split("-").map((part) => Number(part.trim()))

      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) {
        throw new Error(`Invalid set score: ${value}`)
      }

      return {
        matchId,
        setNumber: index + 1,
        sideAPoints: a,
        sideBPoints: b
      }
    })

  if (!sets.length) {
    throw new Error("Add at least one set")
  }

  return sets
}
