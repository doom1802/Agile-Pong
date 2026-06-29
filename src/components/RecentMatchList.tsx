import Link from "next/link"
import type { MatchWithDetails, User } from "@/server/db/types"
import { displayName } from "@/lib/format"

export function RecentMatchList({
  matches,
  users,
  title = "Latest matches",
  viewAllHref
}: {
  matches: MatchWithDetails[]
  users: User[]
  title?: string
  viewAllHref?: string
}) {
  return (
    <section className="panel recent-matches">
      <h2>{title}</h2>
      {matches.length ? (
        <div className="recent-match-list">
          {matches.map((match) => (
            <Link className="recent-match-row" href={`/matches/${match.id}`} key={match.id}>
              <div>
                <strong>{namesForSide(match, users, "A")}</strong>
                <span> vs </span>
                <strong>{namesForSide(match, users, "B")}</strong>
              </div>
              <div className="status-line">
                <span className="pill green">{match.mode}</span>
                <span className="pill">{match.type}</span>
                <span className="pill gold">{match.status}</span>
                {match.sets.length ? <span className="pill">{match.sets.map((set) => `${set.sideAPoints}-${set.sideBPoints}`).join(", ")}</span> : null}
              </div>
            </Link>
          ))}
          {viewAllHref ? (
            <Link className="leaderboard-toggle" href={viewAllHref}>
              View all matches
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="empty">No matches yet.</div>
      )}
    </section>
  )
}

function namesForSide(match: MatchWithDetails, users: User[], side: "A" | "B") {
  return match.players
    .filter((player) => player.side === side)
    .sort((a, b) => a.position - b.position)
    .map((player) => displayName(users.find((user) => user.id === player.userId)))
    .join(" + ")
}
