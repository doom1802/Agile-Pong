import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { MatchCard } from "@/components/MatchCard"
import { PrematchWrap } from "@/components/PrematchWrap"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ prematch?: string; error?: string }> }) {
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

      {params.error ? <p className="pill gold">{errorMessage(params.error)}</p> : null}

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

const errorMessage = (error: string) => ({
  "invalid-request": "The request was malformed.",
  "invalid-score": "The score does not complete a valid match.",
  "invalid-state": "That action is no longer available for this match.",
  "not-authorized": "Only a participating player can do that.",
  "opposite-side-required": "The result must be confirmed by the opposite side.",
  "not-found": "The match could not be found."
}[error] ?? "The match could not be updated. Please try again.")
