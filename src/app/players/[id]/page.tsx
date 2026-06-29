import { notFound } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { BadgeGrid } from "@/components/BadgeGrid"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { RecentMatchList } from "@/components/RecentMatchList"
import { buildBadgeProgress } from "@/domain/badges"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function PublicPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireUser()
  const { id } = await params
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])
  const player = users.find((user) => user.id === id)

  if (!player) {
    notFound()
  }

  const rating = ratings.find((candidate) => candidate.userId === player.id)
  const badges = buildBadgeProgress(player, rating, matches)
  const playerMatches = matches.filter((match) => match.players.some((matchPlayer) => matchPlayer.userId === player.id)).slice(0, 8)
  const earned = badges.filter((badge) => badge.earned)
  const singlesRank = leaderboardRank(player.id, ratings, "singles")
  const doublesRank = leaderboardRank(player.id, ratings, "doubles")

  return (
    <AppShell user={currentUser}>
      <div className="player-profile-head">
        <div className="panel player-hero">
          <PlayerAvatar detail={player.email} user={player} />
          <div className="grid three">
            <div className="mini-stat">
              <span>Singles</span>
              <strong>{rating?.singlesRating ?? 1000}</strong>
              <small>#{singlesRank} leaderboard</small>
            </div>
            <div className="mini-stat">
              <span>Doubles</span>
              <strong>{rating?.doublesRating ?? 1000}</strong>
              <small>#{doublesRank} leaderboard</small>
            </div>
            <div className="mini-stat">
              <span>Badges</span>
              <strong>{earned.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <p className="eyebrow">Public profile</p>
          <h1>{player.nickname || player.firstName}</h1>
          <p className="subtle">{player.officeLocation || "Office not set"} · Latest form and badge chase.</p>
        </div>
      </div>

      <BadgeGrid badges={badges} />
      <div style={{ marginTop: 16 }}>
        <RecentMatchList matches={playerMatches} title="Latest player matches" users={users} />
      </div>
    </AppShell>
  )
}

function leaderboardRank(userId: string, ratings: Awaited<ReturnType<typeof db.getRatings>>, kind: "singles" | "doubles") {
  const key = kind === "singles" ? "singlesRating" : "doublesRating"
  const index = [...ratings].sort((a, b) => b[key] - a[key]).findIndex((rating) => rating.userId === userId)

  return index >= 0 ? index + 1 : "-"
}
