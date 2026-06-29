import { expectedScore, previewRating } from "./rating"
import type { MatchPlayer, MatchWithDetails, PlayerRating, User } from "@/server/db/types"
import { displayName, signed } from "@/lib/format"

export const recentForm = (userId: string, matches: MatchWithDetails[]) =>
  matches
    .filter((match) => match.status === "confirmed" && match.players.some((player) => player.userId === userId))
    .slice(0, 5)
    .map((match) => {
      const player = match.players.find((candidate) => candidate.userId === userId)!
      return player.side === match.winnerSide ? "W" : "L"
    })

export const buildPreviewInsights = (players: MatchPlayer[], users: User[], ratings: PlayerRating[], matches: MatchWithDetails[]) => {
  const kind = players.length === 2 ? "singles" : "doubles"
  const preview = previewRating(players, ratings, kind)
  const sideA = players.filter((player) => player.side === "A")
  const sideB = players.filter((player) => player.side === "B")
  const nameA = sideA.map((player) => displayName(users.find((user) => user.id === player.userId))).join(" + ")
  const nameB = sideB.map((player) => displayName(users.find((user) => user.id === player.userId))).join(" + ")
  const ratingA = sideA.reduce((sum, player) => sum + (ratings.find((rating) => rating.userId === player.userId)?.[kind === "singles" ? "singlesRating" : "doublesRating"] ?? 1000), 0) / sideA.length
  const ratingB = sideB.reduce((sum, player) => sum + (ratings.find((rating) => rating.userId === player.userId)?.[kind === "singles" ? "singlesRating" : "doublesRating"] ?? 1000), 0) / sideB.length
  const expectedA = expectedScore(ratingA, ratingB)

  return [
    `${nameA} has a ${Math.round(expectedA * 100)}% win probability against ${nameB}.`,
    `A win for ${expectedA < 0.5 ? nameA : nameB} would be an upset opportunity.`,
    `Projected winner delta is around ${signed(Math.max(preview.projectedDeltaA, preview.projectedDeltaB))}.`,
    `Recent form matters: the app uses the last 5 confirmed matches for context.`,
    matches.length ? `${matches.length} matches are already in the mock history.` : "No confirmed matches yet: this season is wide open."
  ]
}
