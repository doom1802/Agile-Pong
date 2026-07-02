import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { CreditsFooter } from "@/components/CreditsFooter"
import { Leaderboard } from "@/components/Leaderboard"
import { MatchCard } from "@/components/MatchCard"
import { FormSubmitButton } from "@/components/FormSubmitButton"
import { RecentMatchList } from "@/components/RecentMatchList"
import { displayName } from "@/lib/format"
import { confirmResult } from "@/server/actions"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"
import type { MatchWithDetails, User } from "@/server/db/types"

export default async function HomePage() {
  const user = await requireUser()
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])
  const liveMatches = matches.filter((match) => match.status === "ready")
  const confirmations = matches.filter((match) => canConfirm(match, user.id))
  const weekStart = startOfCurrentWeek()
  const matchesThisWeek = matches.filter((match) => new Date(match.createdAt) >= weekStart).length

  return (
    <AppShell user={user}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Season 01</p>
          <h1>Agile Pong</h1>
          <p className="subtle">Ranked matches stay serious. Friendlies stay flexible. The office table keeps receipts.</p>
        </div>
        <Link className="button" href="/matches/new">
          New match
        </Link>
      </div>

      {confirmations.length ? (
        <section className="confirmation-widget" aria-label="Matches awaiting your confirmation">
          <div className="confirmation-widget-head">
            <div>
              <p className="eyebrow">Action required</p>
              <h2>{confirmations.length === 1 ? "Confirm your match" : `${confirmations.length} matches to confirm`}</h2>
              <p>The other side submitted the score. Check it before applying the result.</p>
            </div>
            <span className="confirmation-count">{confirmations.length}</span>
          </div>
          <div className="confirmation-list">
            {confirmations.map((match) => (
              <div className="confirmation-row" key={match.id}>
                <div>
                  <strong>{sideNames(match, users, "A")} vs {sideNames(match, users, "B")}</strong>
                  <span>{match.sets.map((set) => `${set.sideAPoints}-${set.sideBPoints}`).join(" · ")} · {match.mode} {match.type}</span>
                </div>
                <div className="confirmation-actions">
                  <Link className="button secondary" href={`/matches/${match.id}`}>Review</Link>
                  <form action={confirmResult}>
                    <input name="matchId" type="hidden" value={match.id} />
                    <FormSubmitButton className="button warning" pendingLabel="Confirming...">Confirm result</FormSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ marginBottom: 16 }}>
        <div className="page-head compact-head">
          <div>
            <p className="eyebrow">Now playing</p>
            <h2>Live matches</h2>
            <p className="subtle">Only participating players can update these matches.</p>
          </div>
          <div className="panel metric weekly-match-count">
            <span className="subtle">Matches this week</span>
            <strong>{matchesThisWeek}</strong>
          </div>
        </div>
        {liveMatches.length ? (
          <div className="grid">
            {liveMatches.map((match) => (
              <MatchCard currentUserId={user.id} key={match.id} match={match} ratings={ratings} users={users} />
            ))}
          </div>
        ) : (
          <div className="empty">No live matches right now.</div>
        )}
      </section>

      <section className="grid two">
        <div className="panel">
          <h2>Singles leaderboard</h2>
          <Leaderboard compact kind="singles" ratings={ratings} users={users} />
        </div>
        <div className="panel">
          <h2>Doubles leaderboard</h2>
          <Leaderboard compact kind="doubles" ratings={ratings} users={users} />
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <RecentMatchList matches={matches.slice(0, 6)} title="Latest matches across Agile Lab" users={users} viewAllHref="/matches" />
      </div>
      <CreditsFooter />
    </AppShell>
  )
}

function canConfirm(match: MatchWithDetails, userId: string) {
  if (match.status !== "submitted" || !match.submittedByUserId) return false
  const currentSide = match.players.find((player) => player.userId === userId)?.side
  const submitterSide = match.players.find((player) => player.userId === match.submittedByUserId)?.side
  return Boolean(currentSide && submitterSide && currentSide !== submitterSide)
}

function sideNames(match: MatchWithDetails, users: User[], side: "A" | "B") {
  return match.players
    .filter((player) => player.side === side)
    .sort((a, b) => a.position - b.position)
    .map((player) => displayName(users.find((user) => user.id === player.userId)))
    .join(" + ")
}

function startOfCurrentWeek() {
  const start = new Date()
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  start.setHours(0, 0, 0, 0)
  return start
}
