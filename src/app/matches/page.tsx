import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { MatchCard } from "@/components/MatchCard"
import { PrematchWrap } from "@/components/PrematchWrap"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ prematch?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])

  return (
    <AppShell user={user}>
      <PrematchWrap key={params.prematch ?? "closed"} match={matches.find((match) => match.id === params.prematch) ?? null} ratings={ratings} users={users} />
      <div className="page-head">
        <div>
          <p className="eyebrow">History</p>
          <h1>Matches</h1>
          <p className="subtle">Ready matches, ranked receipts, and friendly chaos.</p>
        </div>
        <Link className="button" href="/matches/new">
          New match
        </Link>
      </div>

      {matches.length ? (
          <div className="grid">
            {matches.map((match) => (
              <MatchCard currentUserId={user.id} key={match.id} match={match} ratings={ratings} users={users} />
            ))}
          </div>
      ) : (
        <div className="empty">No matches yet. Create the first one.</div>
      )}
    </AppShell>
  )
}
