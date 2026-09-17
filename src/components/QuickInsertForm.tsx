"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { validateMatchSets } from "@/domain/scores"
import type { QuickInsertPlayer } from "@/server/quick-insert"
import type { quickInsertMatch } from "@/server/quick-insert-actions"
import { FormSubmitButton } from "./FormSubmitButton"

type ScoreRow = { a: string; b: string }

type Props = {
  action: typeof quickInsertMatch
  currentUserId: string | null
  players: QuickInsertPlayer[]
  token: string
}

export function QuickInsertForm({ action, currentUserId, players, token }: Props) {
  const [type, setType] = useState<"singles" | "doubles">("singles")
  const [pointsToWin, setPointsToWin] = useState<11 | 21>(11)
  const [bestOf, setBestOf] = useState<3 | 5>(3)
  const [sideA1, setSideA1] = useState(currentUserId ?? "")
  const [sideA2, setSideA2] = useState("")
  const [sideB1, setSideB1] = useState("")
  const [sideB2, setSideB2] = useState("")
  const [scores, setScores] = useState<ScoreRow[]>(emptyScores(3))
  const [error, setError] = useState("")

  const sideAIds = [sideA1, ...(type === "doubles" ? [sideA2] : [])].filter(Boolean)
  const sideBIds = [sideB1, ...(type === "doubles" ? [sideB2] : [])].filter(Boolean)
  const sideAName = sideName(sideAIds, players) || "Side A"
  const sideBName = sideName(sideBIds, players) || "Side B"
  const setsValue = useMemo(() => scores
    .filter((score) => score.a.trim() && score.b.trim())
    .map((score) => `${score.a.trim()}-${score.b.trim()}`)
    .join(", "), [scores])

  const changeBestOf = (value: 3 | 5) => {
    setBestOf(value)
    setScores((current) => Array.from({ length: value }, (_, index) => current[index] ?? { a: "", b: "" }))
    setError("")
  }

  const updateScore = (index: number, side: keyof ScoreRow, value: string) => {
    setScores((current) => current.map((score, scoreIndex) => scoreIndex === index ? { ...score, [side]: value } : score))
    setError("")
  }

  const validateBeforeSubmit = (event: FormEvent<HTMLFormElement>) => {
    const selectedIds = type === "singles" ? [sideA1, sideB1] : [sideA1, sideA2, sideB1, sideB2]
    if (selectedIds.some((id) => !id) || new Set(selectedIds).size !== selectedIds.length) {
      event.preventDefault()
      setError("Choose a different player for every position.")
      return
    }

    const sets = scores
      .filter((score) => score.a.trim() || score.b.trim())
      .map((score, index) => ({
        matchId: "pending",
        setNumber: index + 1,
        sideAPoints: Number(score.a),
        sideBPoints: Number(score.b)
      }))
    try {
      if (scores.some((score) => Boolean(score.a.trim()) !== Boolean(score.b.trim()))) throw new Error("incomplete_set")
      validateMatchSets({ mode: "ranked", pointsToWin, bestOf }, sets)
    } catch (validationError) {
      event.preventDefault()
      setError(scoreError(validationError, pointsToWin, bestOf))
    }
  }

  return (
    <form action={action} className="panel form quick-insert-form" onSubmit={validateBeforeSubmit}>
      <input name="token" type="hidden" value={token} />
      <input name="type" type="hidden" value={type} />
      <input name="pointsToWin" type="hidden" value={pointsToWin} />
      <input name="bestOf" type="hidden" value={bestOf} />
      <input name="sets" type="hidden" value={setsValue} />

      <div className="field">
        <span>Match type</span>
        <div className="segmented">
          <label className="choice">
            <input checked={type === "singles"} type="radio" onChange={() => setType("singles")} />
            1 vs 1
          </label>
          <label className="choice">
            <input checked={type === "doubles"} type="radio" onChange={() => setType("doubles")} />
            2 vs 2
          </label>
        </div>
      </div>

      <div className="grid two">
        <label className="field">
          <span>Points</span>
          <select className="select" value={pointsToWin} onChange={(event) => { setPointsToWin(Number(event.target.value) as 11 | 21); setError("") }}>
            <option value="11">11</option>
            <option value="21">21</option>
          </select>
        </label>
        <label className="field">
          <span>Best of</span>
          <select className="select" value={bestOf} onChange={(event) => changeBestOf(Number(event.target.value) as 3 | 5)}>
            <option value="3">3</option>
            <option value="5">5</option>
          </select>
        </label>
      </div>

      <div className="quick-teams grid two">
        <section className="quick-team">
          <p className="eyebrow">Side A</p>
          {currentUserId ? (
            <label className="field">
              <span>Player 1</span>
              <input name="sideA1" type="hidden" value={sideA1} />
              <div className="locked-player">{playerName(players.find((player) => player.id === sideA1))} · signed in</div>
            </label>
          ) : (
            <PlayerPicker label="Player 1" name="sideA1" players={players} value={sideA1} excludedIds={[sideA2, sideB1, sideB2]} onChange={setSideA1} />
          )}
          {type === "doubles" ? (
            <PlayerPicker label="Player 2" name="sideA2" players={players} value={sideA2} excludedIds={[sideA1, sideB1, sideB2]} onChange={setSideA2} />
          ) : null}
        </section>

        <section className="quick-team">
          <p className="eyebrow">Side B</p>
          <PlayerPicker label="Player 1" name="sideB1" players={players} value={sideB1} excludedIds={[sideA1, sideA2, sideB2]} onChange={setSideB1} />
          {type === "doubles" ? (
            <PlayerPicker label="Player 2" name="sideB2" players={players} value={sideB2} excludedIds={[sideA1, sideA2, sideB1]} onChange={setSideB2} />
          ) : null}
        </section>
      </div>

      <div className="score-sheet">
        <div className="score-sheet-head">
          <span>Set</span>
          <span>{sideAName}</span>
          <span>{sideBName}</span>
        </div>
        {scores.map((score, index) => (
          <div className="score-row" key={index}>
            <strong>{index + 1}</strong>
            <input aria-label={`Set ${index + 1} ${sideAName} points`} inputMode="numeric" min="0" type="number" value={score.a} onChange={(event) => updateScore(index, "a", event.target.value)} />
            <input aria-label={`Set ${index + 1} ${sideBName} points`} inputMode="numeric" min="0" type="number" value={score.b} onChange={(event) => updateScore(index, "b", event.target.value)} />
          </div>
        ))}
      </div>

      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <p className="subtle quick-confirmation-note">The opposite side can confirm or contest the result. Otherwise it is confirmed automatically after 24 hours.</p>
      <FormSubmitButton className="button full" pendingLabel="Saving result...">Submit ranked result</FormSubmitButton>
    </form>
  )
}

function PlayerPicker({ label, name, players, value, excludedIds, onChange }: {
  label: string
  name: string
  players: QuickInsertPlayer[]
  value: string
  excludedIds: string[]
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const selected = players.find((player) => player.id === value)
  const filtered = players
    .filter((player) => !excludedIds.includes(player.id) || player.id === value)
    .filter((player) => searchablePlayer(player).includes(query.trim().toLowerCase()))
    .slice(0, 5)

  return (
    <div className="field">
      <span>{label}</span>
      <input name={name} type="hidden" value={value} />
      <input className="input" placeholder="Search nickname or name" value={query} onChange={(event) => setQuery(event.target.value)} />
      {query.trim() || !selected ? (
        <div className="player-search-results">
          {filtered.map((player) => (
            <button className={player.id === value ? "player-option selected" : "player-option"} key={player.id} type="button" onClick={() => { onChange(player.id); setQuery("") }}>
              <strong>{playerName(player)}</strong>
              <small>{player.firstName} {player.lastName}</small>
            </button>
          ))}
        </div>
      ) : null}
      {selected ? <small className="subtle">Selected: {playerName(selected)}</small> : null}
    </div>
  )
}

const emptyScores = (count: number): ScoreRow[] => Array.from({ length: count }, () => ({ a: "", b: "" }))

const playerName = (player?: QuickInsertPlayer) => player?.nickname || [player?.firstName, player?.lastName].filter(Boolean).join(" ") || "Player"

const sideName = (ids: string[], players: QuickInsertPlayer[]) => ids.map((id) => playerName(players.find((player) => player.id === id))).join(" + ")

const searchablePlayer = (player: QuickInsertPlayer) => `${player.nickname} ${player.firstName} ${player.lastName}`.toLowerCase()

const scoreError = (error: unknown, pointsToWin: number, bestOf: number) => {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("incomplete_set")) return "Complete both scores for every set you started."
  if (message.includes("sets_after_match_winner")) return "Remove sets entered after one side had already won the match."
  if (message.includes("insufficient_winning_sets") || message.includes("sets_do_not_produce_winner")) return `One side must win ${Math.floor(bestOf / 2) + 1} sets.`
  if (message.includes("invalid_ranked_set")) return `Every set must reach ${pointsToWin} points and be won by two.`
  return "Check the set scores before saving."
}
