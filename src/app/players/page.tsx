import { AppShell } from "@/components/AppShell"
import { PlayerDirectory, type PlayerDirectoryRow } from "@/components/PlayerDirectory"
import { buildBadgeProgress } from "@/domain/badges"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function PlayersPage() {
  const currentUser = await requireUser()
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])
  const rows: PlayerDirectoryRow[] = users
    .map((user) => {
      const rating = ratings.find((candidate) => candidate.userId === user.id)
      const userMatches = matches.filter((match) => match.players.some((player) => player.userId === user.id))
      const badges = buildBadgeProgress(user, rating, matches)

      return {
        user,
        singlesRating: rating?.singlesRating ?? 1000,
        doublesRating: rating?.doublesRating ?? 1000,
        earnedBadges: badges.filter((badge) => badge.earned).length,
        lastMatchLabel: userMatches[0] ? `Last match: ${userMatches[0].status}` : "No matches yet"
      }
    })
    .sort((a, b) => b.singlesRating + b.doublesRating - (a.singlesRating + a.doublesRating))

  return (
    <AppShell user={currentUser}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Players</p>
          <h1>Player hub</h1>
          <p className="subtle">Search colleagues, inspect badges, ratings, and their latest matches.</p>
        </div>
      </div>
      <PlayerDirectory rows={rows} />
    </AppShell>
  )
}
