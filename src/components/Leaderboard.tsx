"use client"

import { useState } from "react"
import Link from "next/link"
import type { PlayerRating, User } from "@/server/db/types"
import { displayName } from "@/lib/format"
import { PlayerAvatar } from "./PlayerAvatar"

const compactLimit = 3

export function Leaderboard({
  users,
  ratings,
  kind,
  compact = false,
  paginated = false,
  pageSize = 10
}: {
  users: User[]
  ratings: PlayerRating[]
  kind: "singles" | "doubles"
  compact?: boolean
  paginated?: boolean
  pageSize?: number
}) {
  const [page, setPage] = useState(1)
  const rows = ratings
    .map((rating) => ({ rating, user: users.find((candidate) => candidate.id === rating.userId) }))
    .filter((row): row is { rating: PlayerRating; user: User } => Boolean(row.user))
    .sort((a, b) => (kind === "singles" ? b.rating.singlesRating - a.rating.singlesRating : b.rating.doublesRating - a.rating.doublesRating))
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = paginated ? (safePage - 1) * pageSize : 0
  const visibleRows = compact ? rows.slice(0, compactLimit) : paginated ? rows.slice(pageStart, pageStart + pageSize) : rows
  const hasDedicatedView = compact && rows.length > compactLimit
  const canPaginate = paginated && rows.length > pageSize

  return (
    <div className="leaderboard">
      {visibleRows.map(({ rating, user }, index) => {
        const value = kind === "singles" ? rating.singlesRating : rating.doublesRating
        const matches = kind === "singles" ? rating.singlesRankedMatches : rating.doublesRankedMatches
        const provisional = matches < 5

        return (
          <Link className="leader-row" href={`/players/${user.id}`} key={user.id}>
            <span className="rank">#{pageStart + index + 1}</span>
            <PlayerAvatar user={user} detail={`${matches} ranked ${kind}${provisional ? " · provisional" : ""}`} />
            <span className="rating-number" aria-label={`${displayName(user)} rating`}>
              {value}
            </span>
          </Link>
        )
      })}
      {hasDedicatedView ? (
        <Link className="leaderboard-toggle" href={`/leaderboard#${kind}`}>
          View full leaderboard
        </Link>
      ) : null}
      {canPaginate ? (
        <div className="leaderboard-pager">
          <button className="leaderboard-toggle" type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button className="leaderboard-toggle" type="button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
