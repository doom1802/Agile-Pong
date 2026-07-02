"use client"

import { useMemo, useState } from "react"
import type { createMatch } from "@/server/actions"
import type { PlayerRating, User } from "@/server/db/types"
import { displayName, signed } from "@/lib/format"
import { FormSubmitButton } from "./FormSubmitButton"

type Props = {
  users: User[]
  ratings: PlayerRating[]
  currentUser: User
  initialPlayerIds: string[]
  action: typeof createMatch
  error?: string
}

export function MatchBuilder({ users, ratings, currentUser, initialPlayerIds = [], action, error }: Props) {
  const [type, setType] = useState<"singles" | "doubles">("singles")
  const [mode, setMode] = useState<"ranked" | "unranked">("ranked")
  const [sideA2, setSideA2] = useState(initialPlayerIds[0] ?? "")
  const [sideB1, setSideB1] = useState(initialPlayerIds[1] ?? initialPlayerIds[0] ?? "")
  const [sideB2, setSideB2] = useState(initialPlayerIds[2] ?? "")
  const sideA1 = currentUser.id

  const preview = useMemo(() => {
    const kind = type === "singles" ? "singlesRating" : "doublesRating"
    const sideA = [sideA1, ...(type === "doubles" ? [sideA2] : [])].filter(Boolean)
    const sideB = [sideB1, ...(type === "doubles" ? [sideB2] : [])].filter(Boolean)
    const ratingFor = (id: string) => ratings.find((rating) => rating.userId === id)?.[kind] ?? 1000
    const average = (ids: string[]) => ids.reduce((sum, id) => sum + ratingFor(id), 0) / Math.max(1, ids.length)
    const ratingA = average(sideA)
    const ratingB = average(sideB)
    const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
    const deltaA = 40 * (1 - expectedA)
    const deltaB = 40 * expectedA

    return {
      ratingA: Math.round(ratingA),
      ratingB: Math.round(ratingB),
      expectedA,
      deltaA,
      deltaB,
      nameA: sideA.map((id) => displayName(users.find((user) => user.id === id))).join(" + "),
      nameB: sideB.map((id) => displayName(users.find((user) => user.id === id))).join(" + ")
    }
  }, [ratings, sideA1, sideA2, sideB1, sideB2, type, users])

  return (
    <div className="grid two">
      <form action={action} className="panel form">
        <div>
          <p className="eyebrow">New match</p>
          <h1 style={{ fontSize: 36 }}>Set the table</h1>
          <p className="subtle">Ranked rules are locked before play. Friendly matches stay flexible.</p>
          {error === "duplicate" ? <p className="pill gold">Pick unique players for each side.</p> : null}
        </div>

        <div className="field">
          <span>Mode</span>
          <div className="segmented">
            <label className="choice">
              <input checked={mode === "ranked"} name="mode" type="radio" value="ranked" onChange={() => setMode("ranked")} />
              Ranked
            </label>
            <label className="choice">
              <input checked={mode === "unranked"} name="mode" type="radio" value="unranked" onChange={() => setMode("unranked")} />
              Friendly
            </label>
          </div>
        </div>

        <div className="field">
          <span>Type</span>
          <div className="segmented">
            <label className="choice">
              <input checked={type === "singles"} name="type" type="radio" value="singles" onChange={() => setType("singles")} />
              Singles
            </label>
            <label className="choice">
              <input checked={type === "doubles"} name="type" type="radio" value="doubles" onChange={() => setType("doubles")} />
              Doubles
            </label>
          </div>
        </div>

        <div className="grid two">
          <label className="field">
            <span>Points</span>
            <select className="select" name="pointsToWin" defaultValue="21">
              <option value="21">21</option>
              <option value="11">11</option>
            </select>
          </label>
          <label className="field">
            <span>Best of</span>
            <select className="select" name="bestOf" defaultValue="3">
              <option value="3">3</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>You</span>
          <input name="sideA1" type="hidden" value={currentUser.id} />
          <div className="locked-player">{displayName(currentUser)} · locked in Team A</div>
        </label>
        {type === "doubles" ? (
          <PlayerSearchSelect
            label="Your teammate"
            name="sideA2"
            users={users}
            value={sideA2}
            excludedIds={[currentUser.id, sideB1, sideB2]}
            onChange={setSideA2}
          />
        ) : null}
        <PlayerSearchSelect
          label="Opponent"
          name="sideB1"
          users={users}
          value={sideB1}
          excludedIds={type === "singles" ? [currentUser.id] : [currentUser.id, sideA2, sideB2]}
          onChange={setSideB1}
        />
        {type === "doubles" ? (
          <PlayerSearchSelect
            label="Opponent teammate"
            name="sideB2"
            users={users}
            value={sideB2}
            excludedIds={[currentUser.id, sideA2, sideB1]}
            onChange={setSideB2}
          />
        ) : null}

        <FormSubmitButton className="button full" pendingLabel="Creating match...">Create match</FormSubmitButton>
      </form>

      <section className="panel">
        <p className="eyebrow">Preview</p>
        <div className="versus">
          <div>
            <h2>{preview.nameA || "Side A"}</h2>
            <div className="metric">
              <span className="subtle">Rating</span>
              <strong>{preview.ratingA}</strong>
            </div>
          </div>
          <div className="versus-center">
            <span className="vs-badge">VS</span>
            <span className="pill green">{Math.round(preview.expectedA * 100)}%</span>
          </div>
          <div>
            <h2>{preview.nameB || "Side B"}</h2>
            <div className="metric">
              <span className="subtle">Rating</span>
              <strong>{preview.ratingB}</strong>
            </div>
          </div>
        </div>
        <div className="probability" aria-label="Win probability">
          <span style={{ width: `${Math.round(preview.expectedA * 100)}%` }} />
        </div>
        <div className="insights">
          <div className="insight">If {preview.nameA || "you"} wins, projected Elo is about {signed(preview.deltaA)} before match multipliers.</div>
          <div className="insight">If {preview.nameB || "the opponent"} wins, projected Elo is about {signed(preview.deltaB)} before match multipliers.</div>
          <div className="insight">{mode === "ranked" ? "Ranked format is locked before play." : "Friendly match scores can stay weird and flexible."}</div>
        </div>
      </section>
    </div>
  )
}

function PlayerSearchSelect({
  label,
  name,
  users,
  value,
  excludedIds,
  onChange
}: {
  label: string
  name: string
  users: User[]
  value: string
  excludedIds: string[]
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const selected = users.find((user) => user.id === value)
  const matchingUsers = (search: string) => users
    .filter((user) => !excludedIds.includes(user.id) || user.id === value)
    .filter((user) => searchableText(user).includes(search.trim().toLowerCase()))
  const filteredUsers = matchingUsers(query).slice(0, 3)

  const updateQuery = (search: string) => {
    setQuery(search)
    const matches = matchingUsers(search)
    if (search.trim() && matches.length === 1) onChange(matches[0].id)
  }

  return (
    <div className="field">
      <span>{label}</span>
      <input name={name} type="hidden" value={value} />
      <input className="input" placeholder="Search nickname, email, first or last name" value={query} onChange={(event) => updateQuery(event.target.value)} />
      <div className="player-search-results">
        {filteredUsers.map((user) => (
          <button className={user.id === value ? "player-option selected" : "player-option"} key={user.id} type="button" onClick={() => onChange(user.id)}>
            <strong>{displayName(user)}</strong>
            <small>{user.email}</small>
          </button>
        ))}
      </div>
      {selected ? <small className="subtle">Selected: {displayName(selected)}</small> : null}
    </div>
  )
}

function searchableText(user: User) {
  return `${user.nickname} ${user.email} ${user.firstName} ${user.lastName} ${displayName(user)}`.toLowerCase()
}
