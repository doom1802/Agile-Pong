import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { MatchCard } from "@/components/MatchCard"
import { PrematchWrap } from "@/components/PrematchWrap"
import { displayName } from "@/lib/format"
import { requireUser } from "@/server/auth"
import type { MatchWithDetails, User } from "@/server/db/types"
import { db } from "@/server/db"

type MatchOrderBy = "date" | "playerA" | "playerB"

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ prematch?: string; error?: string; updated?: string; filter?: string; orderBy?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const filter = (params.filter ?? "").trim()
  const normalizedFilter = filter.toLowerCase()
  const orderBy = parseOrderBy(params.orderBy)
  const [users, ratings, matches] = await Promise.all([db.getUsers(), db.getRatings(), db.getMatches()])
  const visibleMatches = sortMatches(
    filterMatches(matches, users, normalizedFilter),
    users,
    orderBy
  )
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

      <form className="panel" method="get" style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <div className="grid two" style={{ gap: 12 }}>
          <label className="field">
            <span>Filter</span>
            <input className="input" name="filter" placeholder="Search player name" defaultValue={filter} />
          </label>
          <label className="field">
            <span>Order By</span>
            <select className="select" name="orderBy" defaultValue={orderBy}>
              <option value="date">Date of match</option>
              <option value="playerA">Player A</option>
              <option value="playerB">Player B</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button" type="submit">Apply</button>
          <Link className="button secondary" href="/matches">Reset</Link>
        </div>
      </form>

      {params.error ? <p className="pill gold">{errorMessage(params.error)}</p> : null}
      {params.updated === "result" ? <p className="pill green">Result updated and Elo recalculated successfully.</p> : null}

      {visibleMatches.length ? (
          <div className="grid">
            {visibleMatches.map((match) => (
              <MatchCard canEditResult={editableMatchIds.has(match.id)} currentUserId={user.id} key={match.id} match={match} ratings={ratings} users={users} />
            ))}
          </div>
      ) : (
        <div className="empty">No matches found with the current filters.</div>
      )}
    </AppShell>
  )
}

const parseOrderBy = (value?: string): MatchOrderBy => {
  if (value === "playerA" || value === "playerB") return value
  return "date"
}

const filterMatches = (matches: MatchWithDetails[], users: User[], normalizedFilter: string) => {
  if (!normalizedFilter) return matches
  return matches.filter((match) => {
    return match.players.some((player) => {
      const user = users.find((candidate) => candidate.id === player.userId)
      return searchablePlayerName(user).includes(normalizedFilter)
    })
  })
}

const searchablePlayerName = (user: User | undefined) => {
  if (!user) return ""
  return [displayName(user), user.nickname, user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()
}

const sortMatches = (matches: MatchWithDetails[], users: User[], orderBy: MatchOrderBy) => {
  const sorted = [...matches]
  sorted.sort((left, right) => {
    if (orderBy === "playerA") {
      const leftName = sideName(left, users, "A")
      const rightName = sideName(right, users, "A")
      const byName = leftName.localeCompare(rightName)
      if (byName !== 0) return byName
    }
    if (orderBy === "playerB") {
      const leftName = sideName(left, users, "B")
      const rightName = sideName(right, users, "B")
      const byName = leftName.localeCompare(rightName)
      if (byName !== 0) return byName
    }

    return matchTime(right) - matchTime(left)
  })
  return sorted
}

const sideName = (match: MatchWithDetails, users: User[], side: "A" | "B") => match.players
  .filter((player) => player.side === side)
  .sort((a, b) => a.position - b.position)
  .map((player) => displayName(users.find((item) => item.id === player.userId)))
  .join(" + ")

const matchTime = (match: MatchWithDetails) => new Date(match.playedAt ?? match.createdAt).getTime()

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

const isLatestMatchForAllPlayers = (match: MatchWithDetails, matches: MatchWithDetails[], userId: string) => {
  if (match.status !== "confirmed" || !match.players.some((player) => player.userId === userId)) return false
  const participantIds = new Set(match.players.map((player) => player.userId))
  const selectedMatchTime = matchTime(match)
  return !matches.some((candidate) =>
    candidate.id !== match.id && ["submitted", "confirmed"].includes(candidate.status) &&
    matchTime(candidate) > selectedMatchTime &&
    candidate.players.some((player) => participantIds.has(player.userId)))
}
