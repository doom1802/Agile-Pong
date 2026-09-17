import Link from "next/link"
import { notFound } from "next/navigation"
import { QuickInsertForm } from "@/components/QuickInsertForm"
import { getCurrentUser } from "@/server/auth"
import { quickInsertMatch } from "@/server/quick-insert-actions"
import { checkQuickInsertAccess, loadQuickInsertPlayers } from "@/server/quick-insert"

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
}

export default async function QuickInsertPage({ params, searchParams }: Props) {
  const [{ token }, query] = await Promise.all([params, searchParams])
  const access = await checkQuickInsertAccess(token)
  if (access === "invalid-token") notFound()

  if (access === "network-denied") {
    return (
      <main className="auth-page">
        <section className="panel auth-panel">
          <p className="eyebrow">Quick insert</p>
          <h1>Office Wi-Fi required</h1>
          <p className="subtle">Connect to the office network and scan the QR code again.</p>
        </section>
      </main>
    )
  }

  const [players, currentUser] = await Promise.all([loadQuickInsertPlayers(), getCurrentUser()])

  return (
    <main className="quick-insert-page">
      <header className="quick-insert-head">
        <div className="brand">
          <span className="brand-mark">AP</span>
          <span>Agile Pong</span>
        </div>
        {currentUser ? <Link className="button secondary" href="/matches">Open matches</Link> : <span className="pill gold">No login required</span>}
      </header>

      <div className="quick-insert-content">
        <div className="page-head">
          <div>
            <p className="eyebrow">Quick insert</p>
            <h1>Log the result</h1>
            <p className="subtle">Ranked singles or doubles, straight from the table.</p>
          </div>
        </div>

        {query.submitted === "1" ? (
          <section className="panel quick-insert-success">
            <span className="pill green">Result submitted</span>
            <h2>That’s it.</h2>
            <p className="subtle">The opposite side can confirm or contest it. If nobody acts, it will be confirmed automatically after 24 hours.</p>
            <Link className="button" href={`/quick/${encodeURIComponent(token)}`}>Insert another result</Link>
          </section>
        ) : (
          <>
            {query.error ? <p className="pill gold" role="alert">{quickErrorMessage(query.error)}</p> : null}
            <QuickInsertForm action={quickInsertMatch} currentUserId={currentUser?.id ?? null} players={players} token={token} />
          </>
        )}
      </div>
    </main>
  )
}

const quickErrorMessage = (error: string) => ({
  invalid: "Complete all fields and choose a different player for every position.",
  "invalid-players": "One or more selected players are not available.",
  "current-player": "Your signed-in account must remain Player 1 on Side A.",
  "invalid-set-score": "Every set must reach the target score and be won by two points.",
  "sets-after-winner": "Remove sets entered after one side had already won the match.",
  "incomplete-match": "One side must win the required number of sets.",
  "no-winner": "These sets do not produce a winner.",
  "no-season": "There is no active ranked season.",
  "network-denied": "Connect to the office Wi-Fi and try again.",
  "command-failed": "The result could not be saved. Please try again."
}[error] ?? "The result could not be saved. Please try again.")
