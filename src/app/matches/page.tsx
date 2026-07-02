import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { MatchCard } from "@/components/MatchCard"
import { PrematchWrap } from "@/components/PrematchWrap"
import { requireUser } from "@/server/auth"
import { db } from "@/server/db"

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ prematch?: string; error?: string; updated?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])
  const editableMatchIds = new Set(matches.filter((match) => isLatestMatchForAllPlayers(match, matches, user.id)).map((match) => match.id))

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
      {params.updated === "result" ? <p className="pill green">Result updated and Elo recalculated successfully.</p> : null}

      {matches.length ? (
          <div className="grid">
            {matches.map((match) => (
              <MatchCard canEditResult={editableMatchIds.has(match.id)} currentUserId={user.id} key={match.id} match={match} ratings={ratings} users={users} />
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
  "missing-score": "Enter at least one complete set before saving.",
  "invalid-set-score": "Every ranked set must reach the target score and be won by two points.",
  "sets-after-winner": "Remove any sets entered after one side had already won the match.",
  "incomplete-match": "The score is incomplete: one side must win the required number of sets.",
  "no-winner": "These sets do not produce a match winner.",
  "invalid-format": "The match format is invalid or no longer matches these scores.",
  "invalid-state": "That action is no longer available for this match.",
  "not-authorized": "Only a participating player can do that.",
  "opposite-side-required": "The result must be confirmed by the opposite side.",
  "edit-window-expired": "This result can only be edited within one hour of confirmation.",
  "not-latest-match": "Only the latest match of every participant can be edited.",
  "rating-not-found": "A player rating is missing, so the result was not changed. Contact an administrator.",
  "session-expired": "Your session has expired. Sign in again and retry.",
  "command-failed": "Something unexpected prevented the update. No match or rating changes were saved.",
  "not-found": "The match could not be found."
}[error] ?? "The match could not be updated. Please try again.")

const isLatestMatchForAllPlayers = (match: import("@/server/db/types").MatchWithDetails, matches: import("@/server/db/types").MatchWithDetails[], userId: string) => {
  if (match.status !== "confirmed" || !match.players.some((player) => player.userId === userId)) return false
  const participantIds = new Set(match.players.map((player) => player.userId))
  const matchTime = new Date(match.playedAt ?? match.createdAt).getTime()
  return !matches.some((candidate) =>
    candidate.id !== match.id && ["submitted", "confirmed"].includes(candidate.status) &&
    new Date(candidate.playedAt ?? candidate.createdAt).getTime() > matchTime &&
    candidate.players.some((player) => participantIds.has(player.userId)))
}
