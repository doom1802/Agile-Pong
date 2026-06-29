import Link from "next/link"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { displayName, signed } from "@/lib/format"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"
import type { MatchWithDetails, User } from "@/server/db/types"

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireUser()
  const { id } = await params
  const [match, users] = await Promise.all([db.getMatch(id), db.getUsers()])

  if (!match) {
    notFound()
  }

  const sideA = playersForSide(match, users, "A")
  const sideB = playersForSide(match, users, "B")
  const sideAWins = match.sets.filter((set) => set.sideAPoints > set.sideBPoints).length
  const sideBWins = match.sets.filter((set) => set.sideBPoints > set.sideAPoints).length
  const winnerLabel = match.winnerSide ? namesForSide(match, users, match.winnerSide) : sideAWins || sideBWins ? (sideAWins > sideBWins ? namesForSide(match, users, "A") : namesForSide(match, users, "B")) : null

  return (
    <AppShell user={currentUser}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Match detail</p>
          <h1>{namesForSide(match, users, "A")} vs {namesForSide(match, users, "B")}</h1>
          <p className="subtle">{match.mode} · {match.type} · {match.status}</p>
        </div>
        <Link className="button secondary" href="/matches">
          Back to matches
        </Link>
      </div>

      <section className="panel match-detail-hero">
        <div className="match-detail-side">
          <p className="eyebrow">Side A</p>
          {sideA.map((user) => (
            <PlayerAvatar detail={user.email} key={user.id} user={user} />
          ))}
        </div>
        <div className="match-detail-score">
          <span>{sideAWins}</span>
          <strong>-</strong>
          <span>{sideBWins}</span>
          <small>{winnerLabel ? `Winner: ${winnerLabel}` : "Score pending"}</small>
        </div>
        <div className="match-detail-side">
          <p className="eyebrow">Side B</p>
          {sideB.map((user) => (
            <PlayerAvatar detail={user.email} key={user.id} user={user} />
          ))}
        </div>
      </section>

      <section className="grid two" style={{ marginTop: 16 }}>
        <div className="panel">
          <h2>Score</h2>
          {match.sets.length ? (
            <div className="set-table">
              <div className="set-row head">
                <span>Set</span>
                <span>{namesForSide(match, users, "A")}</span>
                <span>{namesForSide(match, users, "B")}</span>
              </div>
              {match.sets.map((set) => (
                <div className={set.sideAPoints > set.sideBPoints ? "set-row side-a-win" : "set-row side-b-win"} key={set.setNumber}>
                  <strong>{set.setNumber}</strong>
                  <span>{set.sideAPoints}</span>
                  <span>{set.sideBPoints}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Score has not been submitted yet.</div>
          )}
        </div>

        <div className="panel">
          <h2>Match facts</h2>
          <div className="grid">
            <div className="mini-stat">
              <span>Format</span>
              <strong>{match.pointsToWin ?? "-"} / BO{match.bestOf ?? "-"}</strong>
            </div>
            <div className="mini-stat">
              <span>Rating weight</span>
              <strong>{Math.round(match.antiFarmingFactor * 100)}%</strong>
            </div>
            <div className="mini-stat">
              <span>Played at</span>
              <strong>{match.playedAt ? new Date(match.playedAt).toLocaleDateString("en-GB") : "-"}</strong>
            </div>
          </div>
        </div>
      </section>

      {match.ratingApplied ? (
        <section className="panel" style={{ marginTop: 16 }}>
          <h2>Rating changes</h2>
          <div className="status-line">
            {match.players.map((player) => (
              <span className="pill" key={player.userId}>
                {displayName(users.find((user) => user.id === player.userId))} {signed(player.ratingDelta ?? 0)}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}

function playersForSide(match: MatchWithDetails, users: User[], side: "A" | "B") {
  return match.players
    .filter((player) => player.side === side)
    .sort((a, b) => a.position - b.position)
    .map((player) => users.find((user) => user.id === player.userId))
    .filter((user): user is User => Boolean(user))
}

function namesForSide(match: MatchWithDetails, users: User[], side: "A" | "B") {
  return playersForSide(match, users, side)
    .map((user) => displayName(user))
    .join(" + ")
}
