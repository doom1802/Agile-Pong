"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { displayName } from "@/lib/format"
import type { User } from "@/server/db/types"
import { PlayerAvatar } from "./PlayerAvatar"

export type PlayerDirectoryRow = {
  user: User
  singlesRating: number
  doublesRating: number
  earnedBadges: number
  lastMatchLabel: string
}

const pageSize = 10

export function PlayerDirectory({ rows }: { rows: PlayerDirectoryRow[] }) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return rows

    return rows.filter(({ user }) => {
      const haystack = [displayName(user), user.email, user.firstName, user.lastName, user.nickname, user.officeLocation].join(" ").toLowerCase()
      return haystack.includes(normalized)
    })
  }, [query, rows])
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize)

  const updateQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  return (
    <div className="player-directory">
      <label className="field">
        <span>Search player</span>
        <input className="input" placeholder="Nickname, email, name, office..." value={query} onChange={(event) => updateQuery(event.target.value)} />
      </label>

      <p className="directory-result-count">
        <strong>{filteredRows.length}</strong> {filteredRows.length === 1 ? "player" : "players"}
      </p>

      <div className="player-grid">
        {visibleRows.map(({ user, singlesRating, doublesRating, earnedBadges, lastMatchLabel }) => (
          <Link className="player-card" href={`/players/${user.id}`} key={user.id}>
            <PlayerAvatar detail={user.officeLocation || user.email} user={user} />
            <div className="player-card-stats">
              <span>
                <strong>{singlesRating}</strong>
                Singles
              </span>
              <span>
                <strong>{doublesRating}</strong>
                Doubles
              </span>
              <span>
                <strong>{earnedBadges}</strong>
                Badges
              </span>
            </div>
            <small className="subtle">{lastMatchLabel}</small>
          </Link>
        ))}
      </div>

      {!filteredRows.length ? <div className="empty">No players found.</div> : null}

      {totalPages > 1 ? (
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
