import type { MatchWithDetails, PlayerRating, User } from "@/server/db/types"

export type BadgeProgress = {
  id: string
  name: string
  description: string
  requirement: string
  color: string
  current: number
  target: number
  earned: boolean
}

const relevantMatches = (userId: string, matches: MatchWithDetails[]) =>
  matches.filter((match) => match.status !== "cancelled" && match.players.some((player) => player.userId === userId))

const cleanWins = (userId: string, matches: MatchWithDetails[]) =>
  matches.filter((match) => {
    if (match.status !== "confirmed" || !match.winnerSide || !match.sets.length) return false
    const userSide = match.players.find((player) => player.userId === userId)?.side
    if (userSide !== match.winnerSide) return false

    return match.sets.every((set) => (userSide === "A" ? set.sideAPoints > set.sideBPoints : set.sideBPoints > set.sideAPoints))
  }).length

const bestOfFiveMatches = (userId: string, matches: MatchWithDetails[]) =>
  relevantMatches(userId, matches).filter((match) => match.bestOf === 5).length

export function buildBadgeProgress(user: User, rating: PlayerRating | undefined, matches: MatchWithDetails[]): BadgeProgress[] {
  const singlesMatches = rating?.singlesRankedMatches ?? 0
  const doublesMatches = rating?.doublesRankedMatches ?? 0
  const totalRankedMatches = singlesMatches + doublesMatches
  const totalMatches = Math.max(totalRankedMatches, relevantMatches(user.id, matches).length)
  const topRating = Math.max(rating?.singlesRating ?? 1000, rating?.doublesRating ?? 1000)

  return [
    {
      id: "first-serve",
      name: "First Serve",
      description: "Your first match is in the system.",
      requirement: "Record 1 match",
      color: "#35ff8d",
      current: totalMatches,
      target: 1,
      earned: totalMatches >= 1
    },
    {
      id: "ranked-regular",
      name: "Ranked Regular",
      description: "You are no longer a casual visitor.",
      requirement: "Play 5 ranked matches",
      color: "#58d7ff",
      current: totalRankedMatches,
      target: 5,
      earned: totalRankedMatches >= 5
    },
    {
      id: "top-spin",
      name: "Top Spin",
      description: "Your rating has broken out of the baseline.",
      requirement: "Reach 1020 Elo in singles or doubles",
      color: "#ffbf3f",
      current: topRating,
      target: 1020,
      earned: topRating >= 1020
    },
    {
      id: "doubles-chemistry",
      name: "Doubles Chemistry",
      description: "You can share the table without chaos.",
      requirement: "Play 3 ranked doubles",
      color: "#ff4d6d",
      current: doublesMatches,
      target: 3,
      earned: doublesMatches >= 3
    },
    {
      id: "clean-sheet",
      name: "Clean Sheet",
      description: "No set dropped. No mercy logged.",
      requirement: "Win a confirmed match without losing a set",
      color: "#b36bff",
      current: cleanWins(user.id, matches),
      target: 1,
      earned: cleanWins(user.id, matches) >= 1
    },
    {
      id: "long-form",
      name: "Long Form",
      description: "You chose the longer format and survived it.",
      requirement: "Play a best-of-5 match",
      color: "#ff7a3d",
      current: bestOfFiveMatches(user.id, matches),
      target: 1,
      earned: bestOfFiveMatches(user.id, matches) >= 1
    }
  ]
}
