import type { MatchSet } from "@/server/db/types"
import type { Match } from "@/server/db/types"

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

export const validateMatchSets = (match: Pick<Match, "mode" | "pointsToWin" | "bestOf">, sets: MatchSet[]) => {
  let sideAWins = 0
  let sideBWins = 0
  const required = match.mode === "ranked" ? Math.floor((match.bestOf ?? 0) / 2) + 1 : null

  if (match.mode === "ranked" && (!match.pointsToWin || !match.bestOf || sets.length > match.bestOf)) throw new Error("invalid_ranked_format")
  for (const [index, set] of sets.entries()) {
    if (match.mode === "ranked") {
      const winner = Math.max(set.sideAPoints, set.sideBPoints)
      const loser = Math.min(set.sideAPoints, set.sideBPoints)
      if (winner < match.pointsToWin! || (loser < match.pointsToWin! - 1 ? winner !== match.pointsToWin : winner - loser !== 2)) throw new Error("invalid_ranked_set")
    }
    if (set.sideAPoints > set.sideBPoints) sideAWins += 1
    else sideBWins += 1
    if (required && Math.max(sideAWins, sideBWins) === required && index !== sets.length - 1) throw new Error("sets_after_match_winner")
  }
  if (sideAWins === sideBWins) throw new Error("sets_do_not_produce_winner")
  if (required && Math.max(sideAWins, sideBWins) !== required) throw new Error("insufficient_winning_sets")
}
