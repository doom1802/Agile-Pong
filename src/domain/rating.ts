import type { MatchPlayer, MatchSet, MatchWithDetails, PlayerRating, Side } from "@/server/db/types"

export type RatingPreview = {
  expectedA: number
  expectedB: number
  projectedDeltaA: number
  projectedDeltaB: number
}

export type RatingApplication = {
  matchPlayers: MatchPlayer[]
  ratings: PlayerRating[]
  antiFarmingFactor: number
  winnerSide: Side
}

const ratingForKind = (rating: PlayerRating, kind: "singles" | "doubles") =>
  kind === "singles" ? rating.singlesRating : rating.doublesRating

const rankedMatchesForKind = (rating: PlayerRating, kind: "singles" | "doubles") =>
  kind === "singles" ? rating.singlesRankedMatches : rating.doublesRankedMatches

const withRatingUpdate = (rating: PlayerRating, kind: "singles" | "doubles", delta: number): PlayerRating => ({
  ...rating,
  singlesRating: kind === "singles" ? Math.round(rating.singlesRating + delta) : rating.singlesRating,
  doublesRating: kind === "doubles" ? Math.round(rating.doublesRating + delta) : rating.doublesRating,
  singlesRankedMatches: kind === "singles" ? rating.singlesRankedMatches + 1 : rating.singlesRankedMatches,
  doublesRankedMatches: kind === "doubles" ? rating.doublesRankedMatches + 1 : rating.doublesRankedMatches
})

export const expectedScore = (ratingA: number, ratingB: number) => 1 / (1 + 10 ** ((ratingB - ratingA) / 400))

export const kFactor = (rankedMatches: number) => {
  if (rankedMatches < 8) {
    return 56
  }

  if (rankedMatches >= 40) {
    return 32
  }

  return 40
}

export const deriveWinner = (sets: MatchSet[]): Side => {
  const sideAWins = sets.filter((set) => set.sideAPoints > set.sideBPoints).length
  const sideBWins = sets.filter((set) => set.sideBPoints > set.sideAPoints).length

  if (sideAWins === sideBWins) {
    throw new Error("Set scores do not produce a winner")
  }

  return sideAWins > sideBWins ? "A" : "B"
}

export const setMultiplier = (sets: MatchSet[]) => {
  const winner = deriveWinner(sets)
  const winnerSets = sets.filter((set) => (winner === "A" ? set.sideAPoints > set.sideBPoints : set.sideBPoints > set.sideAPoints)).length
  const loserSets = sets.length - winnerSets

  if (winnerSets === 2 && loserSets === 0) return 1.12
  if (winnerSets === 3 && loserSets === 0) return 1.18
  if (winnerSets === 3 && loserSets === 1) return 1.08

  return 1
}

export const pointMultiplier = (sets: MatchSet[]) => {
  const winner = deriveWinner(sets)
  const sideAPoints = sets.reduce((sum, set) => sum + set.sideAPoints, 0)
  const sideBPoints = sets.reduce((sum, set) => sum + set.sideBPoints, 0)
  const winnerPoints = winner === "A" ? sideAPoints : sideBPoints
  const loserPoints = winner === "A" ? sideBPoints : sideAPoints
  const dominance = (winnerPoints - loserPoints) / Math.max(1, winnerPoints + loserPoints)

  return 1 + Math.min(0.18, dominance * 0.7)
}

export const formatMultiplier = (pointsToWin: number | null) => (pointsToWin === 21 ? 1.08 : 1)

export const teamAverage = (players: MatchPlayer[], ratings: PlayerRating[], side: Side, kind: "singles" | "doubles") => {
  const sidePlayers = players.filter((player) => player.side === side)
  const values = sidePlayers.map((player) => ratingForKind(ratings.find((rating) => rating.userId === player.userId)!, kind))
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

export const previewRating = (players: MatchPlayer[], ratings: PlayerRating[], kind: "singles" | "doubles"): RatingPreview => {
  const ratingA = teamAverage(players, ratings, "A", kind)
  const ratingB = teamAverage(players, ratings, "B", kind)
  const expectedA = expectedScore(ratingA, ratingB)
  const averageK = players
    .map((player) => ratings.find((rating) => rating.userId === player.userId))
    .filter(Boolean)
    .map((rating) => kFactor(rankedMatchesForKind(rating!, kind)))
    .reduce((sum, value, _, list) => sum + value / list.length, 0)

  return {
    expectedA,
    expectedB: 1 - expectedA,
    projectedDeltaA: averageK * (1 - expectedA),
    projectedDeltaB: averageK * expectedA
  }
}

export const applyRating = (match: MatchWithDetails, ratings: PlayerRating[], recentSameMatchupCount: number): RatingApplication => {
  if (match.mode !== "ranked") {
    throw new Error("Cannot apply rating to unranked match")
  }

  const kind = match.type === "singles" ? "singles" : "doubles"
  const winnerSide = deriveWinner(match.sets)
  const expectedA = expectedScore(teamAverage(match.players, ratings, "A", kind), teamAverage(match.players, ratings, "B", kind))
  const antiFarmingFactor = recentSameMatchupCount <= 3 ? 1 : recentSameMatchupCount <= 6 ? 0.5 : 0
  const multiplier = Math.min(1.3, setMultiplier(match.sets) * pointMultiplier(match.sets) * formatMultiplier(match.pointsToWin) * antiFarmingFactor)
  const nextRatings = new Map(ratings.map((rating) => [rating.userId, { ...rating }]))
  const nextPlayers = match.players.map((player) => {
    const rating = nextRatings.get(player.userId)
    if (!rating) {
      throw new Error("Missing rating")
    }

    const expected = player.side === "A" ? expectedA : 1 - expectedA
    const actual = player.side === winnerSide ? 1 : 0
    const delta = kFactor(rankedMatchesForKind(rating, kind)) * (actual - expected) * multiplier
    const before = ratingForKind(rating, kind)
    const updated = withRatingUpdate(rating, kind, delta)
    nextRatings.set(player.userId, updated)

    return {
      ...player,
      ratingBefore: before,
      ratingAfter: ratingForKind(updated, kind),
      ratingDelta: ratingForKind(updated, kind) - before
    }
  })

  return {
    matchPlayers: nextPlayers,
    ratings: [...nextRatings.values()],
    antiFarmingFactor,
    winnerSide
  }
}
