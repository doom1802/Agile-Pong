import { AppShell } from "@/components/AppShell"
import { BadgeGrid } from "@/components/BadgeGrid"
import { buildBadgeProgress } from "@/domain/badges"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function BadgesPage() {
  const user = await requireUser()
  const [ratings, matches] = await Promise.all([db.getRatings(), db.getMatches()])
  const badges = buildBadgeProgress(
    user,
    ratings.find((rating) => rating.userId === user.id),
    matches
  )
  const earned = badges.filter((badge) => badge.earned)

  return (
    <AppShell user={user}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Achievements</p>
          <h1>Badges</h1>
          <p className="subtle">Track what you already unlocked and what to chase next.</p>
        </div>
        <div className="badge-score">
          <strong>{earned.length}</strong>
          <span>earned</span>
        </div>
      </div>

      <BadgeGrid badges={badges} />
    </AppShell>
  )
}
