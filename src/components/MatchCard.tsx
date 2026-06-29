import { confirmResult, submitResult } from "@/server/actions"
import { expectedScore } from "@/domain/rating"
import type { MatchWithDetails, PlayerRating, User } from "@/server/db/types"
import { displayName, signed } from "@/lib/format"
import { ScoreEntryForm } from "./ScoreEntryForm"
import Link from "next/link"

export function MatchCard({ match, users, ratings, currentUserId }: { match: MatchWithDetails; users: User[]; ratings: PlayerRating[]; currentUserId: string }) {
  const sideA = namesForSide(match, users, "A")
  const sideB = namesForSide(match, users, "B")
  const canAct = match.players.some((player) => player.userId === currentUserId)
  const preview = buildPrematchPreview(match, ratings, users)

  return (
    <article className="panel match-card">
      <div className="status-line">
        <span className="pill green">{match.mode}</span>
        <span className="pill">{match.type}</span>
        <span className="pill gold">{match.status}</span>
        {match.pointsToWin ? <span className="pill">to {match.pointsToWin}</span> : null}
        {match.bestOf ? <span className="pill">best of {match.bestOf}</span> : null}
        {match.antiFarmingFactor < 1 ? <span className="pill gold">{Math.round(match.antiFarmingFactor * 100)}% rating weight</span> : null}
      </div>

      <div className="versus">
        <div>
          <h2>{sideA}</h2>
          <p className="subtle">{sideRole(match, currentUserId, "A")}</p>
        </div>
        <div className="versus-center">
          <span className="vs-badge">VS</span>
          {match.sets.length ? <small className="subtle">{match.sets.map((set) => `${set.sideAPoints}-${set.sideBPoints}`).join(", ")}</small> : null}
        </div>
        <div>
          <h2>{sideB}</h2>
          <p className="subtle">{sideRole(match, currentUserId, "B")}</p>
        </div>
      </div>

      {match.ratingApplied ? (
        <div className="status-line">
          {match.players.map((player) => (
            <span className="pill" key={player.userId}>
              {displayName(users.find((user) => user.id === player.userId))} {signed(player.ratingDelta ?? 0)}
            </span>
          ))}
        </div>
      ) : null}

      {canAct && match.status === "ready" ? (
        <>
          <Link className="button secondary" href={`/matches?prematch=${match.id}`}>
            Open match intro
          </Link>
          <section className="prematch-panel">
            <div>
              <p className="eyebrow">Pre-match unlocked</p>
              <h3>{preview.favoriteName} win chance: {Math.round(preview.favoriteProbability * 100)}%</h3>
              <div className="probability" aria-label="Pre-match win probability">
                <span style={{ width: `${Math.round(preview.expectedA * 100)}%` }} />
              </div>
            </div>
            <div className="grid three">
              <div className="mini-stat">
                <span>{preview.sideAName}</span>
                <strong>{preview.ratingA}</strong>
              </div>
              <div className="mini-stat">
                <span>Upset delta</span>
                <strong>{signed(preview.underdogDelta)}</strong>
              </div>
              <div className="mini-stat">
                <span>Format</span>
                <strong>{match.pointsToWin ?? "-"} / BO{match.bestOf ?? "-"}</strong>
              </div>
            </div>
            <div className="insights">
              <div className="insight">Match ready. Play it, then submit the set scores.</div>
              <div className="insight">{preview.underdogName} is the underdog. A win would move the leaderboard.</div>
            </div>
          </section>
          <ScoreEntryForm action={submitResult} bestOf={match.bestOf} matchId={match.id} sideAName={preview.sideAName} sideBName={preview.sideBName} />
        </>
      ) : null}

      {canAct && match.status === "submitted" ? (
        <form action={confirmResult}>
          <input name="matchId" type="hidden" value={match.id} />
          <button className="button warning" type="submit">
            Confirm result
          </button>
        </form>
      ) : null}
    </article>
  )
}

function buildPrematchPreview(match: MatchWithDetails, ratings: PlayerRating[], users: User[]) {
  const kind = match.type === "singles" ? "singlesRating" : "doublesRating"
  const ratingFor = (userId: string) => ratings.find((rating) => rating.userId === userId)?.[kind] ?? 1000
  const sideAverage = (side: "A" | "B") => {
    const sidePlayers = match.players.filter((player) => player.side === side)
    return Math.round(sidePlayers.reduce((sum, player) => sum + ratingFor(player.userId), 0) / Math.max(1, sidePlayers.length))
  }
  const ratingA = sideAverage("A")
  const ratingB = sideAverage("B")
  const expectedA = expectedScore(ratingA, ratingB)
  const sideAName = namesForSide(match, users, "A")
  const sideBName = namesForSide(match, users, "B")
  const underdogName = expectedA < 0.5 ? sideAName : sideBName
  const favoriteName = expectedA >= 0.5 ? sideAName : sideBName
  const favoriteProbability = Math.max(expectedA, 1 - expectedA)
  const underdogDelta = expectedA < 0.5 ? 40 * (1 - expectedA) : 40 * expectedA

  return {
    ratingA,
    ratingB,
    expectedA,
    sideAName,
    sideBName,
    underdogName,
    favoriteName,
    favoriteProbability,
    underdogDelta
  }
}

function namesForSide(match: MatchWithDetails, users: User[], side: "A" | "B") {
  return match.players
    .filter((player) => player.side === side)
    .sort((a, b) => a.position - b.position)
    .map((player) => displayName(users.find((user) => user.id === player.userId)))
    .join(" + ")
}

function sideRole(match: MatchWithDetails, currentUserId: string, side: "A" | "B") {
  const isCurrentUserSide = match.players.some((player) => player.side === side && player.userId === currentUserId)

  if (match.type === "doubles") {
    return isCurrentUserSide ? "Your team" : "Opponent team"
  }

  return isCurrentUserSide ? "You" : "Opponent"
}
