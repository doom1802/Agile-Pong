import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { Leaderboard } from "@/components/Leaderboard"
import { MatchCard } from "@/components/MatchCard"
import { RecentMatchList } from "@/components/RecentMatchList"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function HomePage() {
  const user = await requireUser()
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])
  const liveMatches = matches.filter((match) => match.status === "ready")
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
    </AppShell>
  )
}

function startOfCurrentWeek() {
  const start = new Date()
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  start.setHours(0, 0, 0, 0)
  return start
}
